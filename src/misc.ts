import { htmlAttributes } from './escape.ts';
import { inlineNode, renderInline, type Inline } from './node.ts';

type HtmlOptions = Record<string, string | number>;

const htmlTag = (
	tag: string,
	content: Inline,
	options?: HtmlOptions,
) => inlineNode(context => `<${tag}${htmlAttributes(options)}>${renderInline(content, {
	...context,
	singleLine: true,
	indent: undefined,
	htmlElement: true,
})}</${tag}>`);

export const kbd = (key: Inline, options?: HtmlOptions) => htmlTag('kbd', key, options);

export const sub = (text: Inline, options?: HtmlOptions) => htmlTag('sub', text, options);

export const sup = (text: Inline, options?: HtmlOptions) => htmlTag('sup', text, options);

const selfClosingElements = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'svg', 'math',
]);

export const el = (
	tag: string,
	attributes?: HtmlOptions,
	content?: string,
) => {
	if (!/^[a-z][a-z0-9-]*$/i.test(tag)) {
		throw new TypeError(`Invalid HTML tag name: ${tag}`);
	}
	// The tag name is ASCII here, so toLowerCase() is HTML's ASCII case folding.
	if (content === undefined && selfClosingElements.has(tag.toLowerCase())) {
		return inlineNode(() => `<${tag}${htmlAttributes(attributes)} />`);
	}
	return inlineNode(() => `<${tag}${htmlAttributes(attributes)}>${content ?? ''}</${tag}>`);
};
