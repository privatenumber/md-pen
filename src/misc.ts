import { escapeHtml, htmlAttributes } from './escape.ts';

type HtmlOptions = Record<string, string | number>;

const escapeInlineHtml = (input: string) => {
	const text = input.replaceAll(/[ \t\r\n]+/g, whitespace => (
		/[\r\n]/.test(whitespace) ? ' ' : whitespace
	));
	let result = '';
	let backslashes = 0;
	for (const character of text) {
		if (character === '\\') {
			backslashes += 1;
			result += character;
		} else {
			if ('<>&"'.includes(character)) {
				if (backslashes % 2) {
					result = result.slice(0, -1);
				}
				result += escapeHtml(character);
			} else {
				result += character;
			}
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
