import { escapeHtml, htmlAttributes } from './escape.ts';

type HtmlOptions = Record<string, string | number>;

const htmlTag = (
	tag: string,
	content: string,
	options?: HtmlOptions,
) => `<${tag}${htmlAttributes(options)}>${escapeHtml(content)}</${tag}>`;

export const kbd = (key: string, options?: HtmlOptions) => htmlTag('kbd', key, options);

export const sub = (text: string, options?: HtmlOptions) => htmlTag('sub', text, options);

export const sup = (text: string, options?: HtmlOptions) => htmlTag('sup', text, options);

const selfClosingElements = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'svg', 'math',
]);

export const el = (
	tag: string,
	attributes?: HtmlOptions,
	content?: string,
) => {
	// HTML tag names use ASCII case folding, not Unicode lowercasing.
	if (content === undefined && selfClosingElements.has(tag.replaceAll(/[A-Z]/g, character => character.toLowerCase()))) {
		return `<${tag}${htmlAttributes(attributes)} />`;
	}
	return `<${tag}${htmlAttributes(attributes)}>${content ?? ''}</${tag}>`;
};

export const mention = (username: string) => `@${username}`;

export const emoji = (name: string) => `:${name}:`;
