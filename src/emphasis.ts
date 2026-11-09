import { inlineNode, renderInline, type Inline } from './node.ts';

const normalizeBoundary = (text: string) => {
	const lastLineEnding = Math.max(text.lastIndexOf('\r'), text.lastIndexOf('\n')) + 1;
	return text.slice(0, lastLineEnding) + text.slice(lastLineEnding).replaceAll(/[\t\n\f\r ]+/g, ' ');
};

const hasTrailingHardBreak = (text: string, end: number) => {
	if (text[end] !== '\n' && text[end] !== '\r') { return false; }
	let backslashes = 0;
	while (text[end - backslashes - 1] === '\\') { backslashes += 1; }
	return backslashes % 2 === 1;
};

/* eslint-disable no-bitwise -- Each emphasis kind uses one bit. */
const emphasize = (content: Inline, marker: string, flag: number) => inlineNode((context) => {
	if (context.emphasis & flag) { return renderInline(content, context); }
	const text = renderInline(content, {
		...context,
		emphasis: context.emphasis | flag,
		lineStart: false,
	});
	if (!text) { return ''; }
	const leading = text.match(/^[\t\n\v\f\r\u0085\u2028\u2029\p{Zs}]*/u)![0];
	if (leading.length === text.length) { return text; }
	let end = text.length;
	while (end > leading.length && /[\t\n\v\f\r\u0085\u2028\u2029\p{Zs}]/u.test(text[end - 1])) { end -= 1; }
	let suffix = text.slice(end);
	if (hasTrailingHardBreak(text, end)) {
		end -= 1;
		suffix = `\\${suffix}`;
	}
	const prefix = normalizeBoundary(leading);
	const body = text.slice(leading.length, end);
	if (!body) { return `${prefix}${normalizeBoundary(suffix)}`; }
	return `${prefix}${marker}${body}${marker}${normalizeBoundary(suffix)}`;
}, marker);
/* eslint-enable no-bitwise */

export const bold = (content: Inline) => emphasize(content, '**', 1);
export const italic = (content: Inline) => emphasize(content, '*', 2);
export const strikethrough = (content: Inline) => emphasize(content, '~~', 4);
