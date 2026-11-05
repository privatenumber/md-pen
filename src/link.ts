import {
	encodeUrlWhitespace, escapeHtml, escapeUrl, hasCharacterReference, htmlAttributes,
} from './escape.ts';
import { createInlineScanner } from './inline-constructs.ts';

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

const imageDestination = /\((?:\\.|[^\s()\\])*(?:[ \t]+"(?:\\.|[^"\\])*")?\)/y;

const bracketPairs = (text: string, scanner: ReturnType<typeof createInlineScanner>) => {
	const stack: number[] = [];
	const pairs = new Map<number, number>();
	for (let index = 0; index < text.length;) {
		const end = scanner.protectedEnd(index);
		if (end !== -1) {
			index = end;
			continue;
		}
		if (text[index] === '[') {
			stack.push(index);
		} else if (text[index] === ']') {
			const open = stack.pop();
			if (open !== undefined) {
				pairs.set(open, index);
			}
		}
		index += 1;
	}
	return pairs;
};

const imageEnd = (text: string, index: number, pairs: Map<number, number>) => {
	if (text[index] !== '!' || text[index + 1] !== '[') {
		return -1;
	}
	const close = pairs.get(index + 1);
	if (close === undefined) {
		return -1;
	}
	imageDestination.lastIndex = close + 1;
	return imageDestination.test(text) ? imageDestination.lastIndex : -1;
};

const escapeLinkText = (input: string) => {
	const text = input.replaceAll(/[\r\n]+/g, ' ');
	const scanner = createInlineScanner(text, { angle: true });
	const pairs = bracketPairs(text, scanner);
	const imageClosings = new Map<number, number>();
	let result = '';
	for (let index = 0; index < text.length;) {
		const end = scanner.protectedEnd(index);
		if (end !== -1) {
			result += text.slice(index, end);
			index = end;
			continue;
		}
		const endOfImage = imageEnd(text, index, pairs);
		if (endOfImage !== -1) {
			imageClosings.set(pairs.get(index + 1)!, endOfImage);
			result += '![';
			index += 2;
			continue;
		}
		const endOfDestination = imageClosings.get(index);
		if (endOfDestination !== undefined) {
			result += text.slice(index, endOfDestination);
			index = endOfDestination;
			continue;
		}
		const character = text[index];
		if (character === '[' || character === ']') {
			result += '\\';
		}
		result += character;
		index += 1;
	}
	let trailingBackslashes = 0;
	while (text[text.length - trailingBackslashes - 1] === '\\') {
		trailingBackslashes += 1;
	}
	return trailingBackslashes % 2 ? `${result}\\` : result;
};

const literalLinkText = (text: string) => text
	.replaceAll(/[\r\n]+/g, ' ')
	.replaceAll(/[\\`*_~[\]<>&]/g, character => `\\${character}`)
	.replaceAll('$', '\u200B\\$');

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
			href: encodeUrlWhitespace(href),
		};
		// Break email autolinks and mentions in display text.
		const displayText = text ?? escapeHtml(url.replaceAll(/[\r\n]+/g, ' '))
			.replaceAll(/[\\`*_~[\]]/g, character => `&#${character.codePointAt(0)};`)
			.replaceAll(/(https?|ftp):/gi, '$1&#58;')
			.replaceAll(/www\./gi, 'www&#46;')
			.replaceAll('$', '\u200B&#36;')
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
			src: encodeUrlWhitespace(url),
			...(alt === undefined ? {} : { alt }),
		};
		return `<img${htmlAttributes(attributes)} />`;
	}

	return `![${escapeLinkText(alt ?? '')}](${escapeUrl(url)})`;
};
