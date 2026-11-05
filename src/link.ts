import {
	escapeHtml, escapeUrl, hasCharacterReference, htmlAttributes,
} from './escape.ts';

const hasOnlyTitle = (
	options: Record<string, string | number>,
) => {
	const keys = Object.keys(options);
	return keys.length === 1 && keys[0] === 'title';
};

const escapeTitle = (title: string) => title
	.replaceAll(/[\r\n]+/g, ' ')
	.replaceAll('\\', String.raw`\\`)
	.replaceAll('"', String.raw`\"`);

const indexClosingBackticks = (text: string) => {
	const nextBacktick = new Map<number, number>();
	const closingBackticks = new Map<number, number>();
	for (let index = text.length - 1; index >= 0; index -= 1) {
		if (text[index] === '`') {
			const end = index + 1;
			while (index > 0 && text[index - 1] === '`') {
				index -= 1;
			}
			const length = end - index;
			const next = nextBacktick.get(length);
			if (next !== undefined) {
				closingBackticks.set(index, next + length);
			}
			const nextShorter = nextBacktick.get(length - 1);
			if (length > 1 && nextShorter !== undefined) {
				closingBackticks.set(index + 1, nextShorter + length - 1);
			}
			nextBacktick.set(length, index);
		}
	}
	return closingBackticks;
};

const codeSpanRanges = (text: string) => {
	const closingBackticks = indexClosingBackticks(text);
	const ranges = new Map<number, number>();
	for (let index = 0; index < text.length; index += 1) {
		if (text[index] === '\\' && index + 1 < text.length) {
			index += 1;
		} else if (text[index] === '`') {
			const end = closingBackticks.get(index);
			if (end === undefined) {
				while (text[index + 1] === '`') {
					index += 1;
				}
			} else {
				ranges.set(index, end);
				index = end - 1;
			}
		}
	}
	return ranges;
};

const unmatchedBrackets = (text: string, codeSpans: Map<number, number>) => {
	const open: number[] = [];
	const unmatched = new Set<number>();
	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];
		if (character === '\\' && index + 1 < text.length) {
			index += 1;
		} else if (codeSpans.has(index)) {
			index = codeSpans.get(index)! - 1;
		} else if (character === '[') {
			open.push(index);
		} else if (character === ']') {
			if (open.length) {
				open.pop();
			} else {
				unmatched.add(index);
			}
		}
	}
	for (const index of open) {
		unmatched.add(index);
	}
	return unmatched;
};

const escapeLinkText = (input: string) => {
	const text = input.replaceAll(/[\r\n]+/g, ' ');
	const unmatched = unmatchedBrackets(text, codeSpanRanges(text));
	let result = '';
	for (let index = 0; index < text.length; index += 1) {
		if (unmatched.has(index)) {
			result += '\\';
		}
		result += text[index];
	}
	let trailingBackslashes = 0;
	while (text[text.length - trailingBackslashes - 1] === '\\') {
		trailingBackslashes += 1;
	}
	return trailingBackslashes % 2 ? `${result}\\` : result;
};

const literalLinkText = (text: string) => text
	.replaceAll(/[\r\n]+/g, ' ')
	.replaceAll(/[\\`*_~[\]<>&]/g, character => `\\${character}`);

const isGfmEmail = (url: string) => /^[\w.+-]+@\w[\w.-]*\.\w+$/.test(url)
	&& !/\.\.|[_-]$/.test(url);

const isGfmWww = (url: string) => {
	const match = url.match(/^www\.([\w.-]+)/i);
	if (!match || !/\.\w+/.test(match[1])) {
		return false;
	}
	const parts = match[0].split('.');
	return parts.slice(-2).every(segment => !segment.includes('_'));
};

const normalizeHref = (url: string) => {
	if (url.startsWith('www.')) {
		return isGfmWww(url) ? `http://${url}` : url;
	}
	if (url.includes('@') && isGfmEmail(url)) {
		return `mailto:${url}`;
	}
	return url;
};

export const link = (
	url: string,
	text?: string,
	options?: Record<string, string>,
) => {
	if (options && Object.keys(options).length > 0) {
		const href = normalizeHref(url);
		if (hasOnlyTitle(options)) {
			return `[${text === undefined ? literalLinkText(url) : escapeLinkText(text)}](${escapeUrl(href)} "${escapeTitle(String(options.title))}")`;
		}

		const attributes: Record<string, string> = {
			...options,
			href,
		};
		// Break email autolinks and mentions in display text.
		const displayText = text ?? escapeHtml(url)
			.replaceAll(/([\\`*_~[\]])/g, String.raw`\$1`)
			.replaceAll(/(https?|ftp):/gi, String.raw`$1\:`)
			.replaceAll(/www\./gi, String.raw`www\.`)
			.replaceAll('@', '@\u200B');
		return `<a${htmlAttributes(attributes)}>${displayText}</a>`;
	}

	if (text !== undefined) {
		return `[${escapeLinkText(text)}](${escapeUrl(normalizeHref(url))})`;
	}

	// eslint-disable-next-line no-control-regex
	if (/^https?:\/\//.test(url) && !/[ \u0000-\u001F<>]/.test(url) && !hasCharacterReference(url)) {
		return `<${url}>`;
	}

	return `[${literalLinkText(url)}](${escapeUrl(normalizeHref(url))})`;
};

export const image = (
	url: string,
	alt?: string,
	options?: Record<string, string | number>,
) => {
	if (options && Object.keys(options).length > 0) {
		if (hasOnlyTitle(options)) {
			return `![${escapeLinkText(alt ?? '')}](${escapeUrl(url)} "${escapeTitle(String(options.title))}")`;
		}

		const attributes: Record<string, string | number> = {
			...options,
			src: url,
			...(alt === undefined ? {} : { alt }),
		};
		return `<img${htmlAttributes(attributes)} />`;
	}

	return `![${escapeLinkText(alt ?? '')}](${escapeUrl(url)})`;
};
