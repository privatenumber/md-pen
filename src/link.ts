import {
	encodeUrlWhitespace, escapeUrl, hasCharacterReference, htmlAttributes,
} from './escape.ts';
import { inlineNode, renderInline, type Inline } from './node.ts';
import { escapeHtmlText } from './text.ts';

const hasOnlyTitle = (options: Record<string, string | number>) => {
	const keys = Object.keys(options);
	return keys.length === 1 && keys[0] === 'title';
};
// Titles are literal: escape backslashes, quotes, and `&` before character-reference-shaped text.
const escapeTitle = (title: string) => title
	.replaceAll(/[\r\n]+/g, ' ')
	.replaceAll('\\', String.raw`\\`)
	.replaceAll('"', String.raw`\"`)
	.replaceAll(/&(?=(?:#\d+|#x[\da-f]+|[a-z][a-z\d]{1,31});)/gi, '&amp;');
const isGfmEmail = (url: string) => /^[\w.+-]+@\w[\w.-]*\.\w+$/.test(url) && !/\.\.|[_-]$/.test(url);
const isGfmWww = (url: string) => {
	const match = url.match(/^www\.([\w.-]+)/i);
	return Boolean(match && /\.\w+/.test(match[1]) && match[0].split('.').slice(-2).every(segment => !segment.includes('_')));
};
const normalizeHref = (url: string) => {
	if (url.startsWith('www.')) { return isGfmWww(url) ? `http://${url}` : url; }
	if (url.includes('@') && isGfmEmail(url)) { return `mailto:${url}`; }
	return url;
};
const htmlDestination = (url: string) => encodeUrlWhitespace(url.replaceAll('\\', '%5C'));

export const link = (url: string, label?: Inline, options?: Record<string, string>) => (
	inlineNode((context) => {
		if (context.inLink) { throw new TypeError('Links cannot appear inside link labels'); }
		const href = normalizeHref(url);
		const labelContext = {
			...context,
			inLink: true,
			singleLine: true,
			indent: undefined,
		};
		if (options && Object.keys(options).length) {
			if (hasOnlyTitle(options)) { return `[${renderInline(label ?? url, labelContext)}](${escapeUrl(href)} "${escapeTitle(options.title)}")`; }
			return `<a${htmlAttributes({
				...options,
				href: htmlDestination(href),
			})}>${label === undefined ? escapeHtmlText(url.replaceAll(/\r\n|\r|\n/g, ' ')) : renderInline(label, labelContext)}</a>`;
		}
		// eslint-disable-next-line no-control-regex
		if (label === undefined && /^https?:\/\//.test(url) && !/[ \u0000-\u001F\u007F<>]/.test(url) && !hasCharacterReference(url)) { return `<${url}>`; }
		const text = renderInline(label ?? url, labelContext);
		return `[${text}](${escapeUrl(href)})`;
	})
);

export const image = (url: string, alt?: string, options?: Record<string, string | number>) => (
	inlineNode((context) => {
		const text = renderInline(alt ?? '', {
			...context,
			singleLine: true,
			indent: undefined,
			literalGuards: false,
		});
		if (options && Object.keys(options).length) {
			if (hasOnlyTitle(options)) { return `![${text}](${escapeUrl(url)} "${escapeTitle(String(options.title))}")`; }
			return `<img${htmlAttributes({
				...options,
				src: htmlDestination(url),
				...(alt === undefined ? {} : { alt }),
			})} />`;
		}
		return `![${text}](${escapeUrl(url)})`;
	})
);
