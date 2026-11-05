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

const voidElements = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

export const el = (
	tag: string,
	attributes?: HtmlOptions,
	content?: string,
) => {
	if (content === undefined && voidElements.has(tag.toLowerCase())) {
		return `<${tag}${htmlAttributes(attributes)} />`;
	}
	return `<${tag}${htmlAttributes(attributes)}>${content ?? ''}</${tag}>`;
};

export const mention = (username: string) => `@${username}`;

export const emoji = (name: string) => `:${name}:`;
