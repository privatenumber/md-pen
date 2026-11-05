import { escapeHtml, htmlAttributes } from './escape.ts';

type HtmlOptions = Record<string, string | number>;

const lineEndingEnd = (text: string, index: number) => {
	if (text[index] === '\r') {
		return index + (text[index + 1] === '\n' ? 2 : 1);
	}
	return text[index] === '\n' ? index + 1 : index;
};

const normalizeInlineBlankLines = (text: string) => {
	let result = '';
	for (let index = 0; index < text.length;) {
		const character = text[index];
		const firstEnd = lineEndingEnd(text, index);
		if (firstEnd !== index) {
			let end = firstEnd;
			while (end < text.length) {
				let next = end;
				while (text[next] === ' ' || text[next] === '\t') {
					next += 1;
				}
				const nextEnd = lineEndingEnd(text, next);
				if (nextEnd === next) {
					break;
				}
				end = nextEnd;
			}
			result += end === firstEnd ? text.slice(index, firstEnd) : '\n';
			index = end;
			continue;
		}
		result += character;
		index += 1;
	}
	return result;
};

const escapeInlineHtml = (input: string) => {
	const text = normalizeInlineBlankLines(input);
	let result = '';
	let backslashes = 0;
	for (const character of text) {
		if (character === '\\') {
			backslashes += 1;
			result += character;
		} else {
			result += backslashes % 2 || !'<>&"'.includes(character) ? character : escapeHtml(character);
			backslashes = 0;
		}
	}
	return result;
};

const htmlTag = (
	tag: string,
	content: string,
	options?: HtmlOptions,
) => `<${tag}${htmlAttributes(options)}>${escapeInlineHtml(content)}</${tag}>`;

export const kbd = (key: string, options?: HtmlOptions) => htmlTag('kbd', key, options);

export const sub = (text: string, options?: HtmlOptions) => htmlTag('sub', text, options);

export const sup = (text: string, options?: HtmlOptions) => htmlTag('sup', text, options);

export const el = (
	tag: string,
	attributes?: HtmlOptions,
	content?: string,
) => {
	if (content === undefined) {
		return `<${tag}${htmlAttributes(attributes)} />`;
	}
	return `<${tag}${htmlAttributes(attributes)}>${content}</${tag}>`;
};

export const mention = (username: string) => `@${username}`;

export const emoji = (name: string) => `:${name}:`;
