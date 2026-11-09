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
