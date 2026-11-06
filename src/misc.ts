import { escapeHtml, htmlAttributes } from './escape.ts';

type HtmlOptions = Record<string, string | number>;

const escapeInlineHtml = (input: string) => input
	.replaceAll(/\r\n?|\n/g, ' ')
	.replaceAll(/\\+[<>&"]?|[<>&"]/g, (match) => {
		const character = match.at(-1)!;
		if (character === '\\') {
			return match;
		}
		const backslashes = match.length - 1;
		// Keep paired backslashes; an unpaired backslash escapes the character.
		return `${'\\'.repeat(backslashes - (backslashes % 2))}${escapeHtml(character)}`;
	});

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
	if (!/^[a-z][a-z0-9-]*$/i.test(tag)) {
		throw new TypeError(`Invalid HTML tag name: ${tag}`);
	}
	if (content === undefined) {
		return `<${tag}${htmlAttributes(attributes)} />`;
	}
	return `<${tag}${htmlAttributes(attributes)}>${content}</${tag}>`;
};

export const mention = (username: string) => `@${username}`;

export const emoji = (name: string) => `:${name}:`;
