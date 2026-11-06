import {
	encodeUrlWhitespace, escape, escapeUrl, hasCharacterReference, htmlAttributes,
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

const imageDestination = /\((?:\\.|[^ \t\r\n()\\])*(?:[ \t]+"(?:\\.|[^"\\])*")?\)/y;

const imageSpans = (text: string, scanner: ReturnType<typeof createInlineScanner>) => {
	const stack: {
		index: number;
		image: boolean;
	}[] = [];
	const openings = new Set<number>();
	const closings = new Map<number, number>();
	let previousBang = false;
	for (let index = 0; index < text.length;) {
		const end = scanner.protectedEnd(index);
		if (end !== -1) {
			index = end;
			previousBang = false;
			continue;
		}
		if (text[index] === '[') {
			stack.push({
				index,
				image: previousBang,
			});
		} else if (text[index] === ']') {
			const open = stack.pop();
			if (open?.image) {
				imageDestination.lastIndex = index + 1;
				if (imageDestination.test(text)) {
					openings.add(open.index);
					closings.set(index, imageDestination.lastIndex);
					index = imageDestination.lastIndex;
					previousBang = false;
					continue;
				}
			}
		}
		previousBang = text[index] === '!';
		index += 1;
	}
	return {
		openings,
		closings,
	};
};

const escapeLinkText = (input: string) => {
	const text = input.replaceAll(/[\r\n]+/g, ' ');
	const scanner = createInlineScanner(text, { angle: true });
	const images = imageSpans(text, scanner);
	let result = '';
	for (let index = 0; index < text.length;) {
		const end = scanner.protectedEnd(index);
		if (end !== -1) {
			result += text.slice(index, end);
			index = end;
			continue;
		}
		if (text[index] === '!' && images.openings.has(index + 1)) {
			result += '![';
			index += 2;
			continue;
		}
		const endOfDestination = images.closings.get(index);
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

// Boundary whitespace may change shape, but HTML collapses it to the same rendered space.
const literalLinkText = (text: string) => escape(text.replaceAll(/[\r\n]+/g, ' '));

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

const htmlDestination = (url: string) => encodeUrlWhitespace(url.replaceAll('\\', '%5C'));

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
			href: htmlDestination(href),
		};
		// Entities keep URL text literal in Markdown and raw HTML.
		// GitHub still needs ZWSP guards for math (`$`) and mentions (`@`).
		const displayText = text ?? url.replaceAll(/[\r\n]+/g, ' ')
			.replaceAll(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g, character => `&#${character.codePointAt(0)};`)
			.replaceAll('&#36;', '\u200B&#36;')
			.replaceAll('&#64;', '&#64;\u200B');
		return `<a${htmlAttributes(attributes)}>${displayText}</a>`;
	}

	if (text !== undefined) {
		return `[${escapeLinkText(text)}](${escapeUrl(normalizeHref(url))})`;
	}

	// eslint-disable-next-line no-control-regex
	if (/^https?:\/\//.test(url) && !/[ \u0000-\u001F\u007F<>]/.test(url) && !hasCharacterReference(url)) {
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
			src: htmlDestination(url),
			...(alt === undefined ? {} : { alt }),
		};
		return `<img${htmlAttributes(attributes)} />`;
	}

	return `![${escapeLinkText(alt ?? '')}](${escapeUrl(url)})`;
};
