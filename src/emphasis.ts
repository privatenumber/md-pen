import {
	inlineNode, renderInline, trimBoundary, type Context, type Inline, type InlineNode,
} from './node.ts';

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
const emphasize = (content: Inline, marker: string, flag: number): InlineNode => {
	const format = (context: Context) => {
		const text = renderInline(content, {
			...context,
			emphasis: context.emphasis | flag,
			indent: undefined,
		});
		if (!text) { return ''; }
		const [start, trimmedEnd] = trimBoundary(text);
		if (start === trimmedEnd) { return text; }
		const leading = text.slice(0, start);
		let end = trimmedEnd;
		let suffix = text.slice(end);
		if (hasTrailingHardBreak(text, end)) {
			end -= 1;
			suffix = `\\${suffix}`;
		}
		const prefix = normalizeBoundary(leading);
		const body = text.slice(leading.length, end);
		if (!body) { return `${prefix}${normalizeBoundary(suffix)}`; }
		let backslashes = 0;
		while (body[body.length - backslashes - 2] === '\\') { backslashes += 1; }
		const opening = body.startsWith(marker[0]) ? '<!-- -->' : '';
		const closing = body.endsWith(marker[0]) && backslashes % 2 === 0 ? '<!-- -->' : '';
		return `${prefix}${marker}${opening}${body}${closing}${marker}${normalizeBoundary(suffix)}`;
	};
	return {
		...inlineNode(format, marker),
		emphasis: {
			flag,
			content,
		},
	};
};
/* eslint-enable no-bitwise */

export const bold = (content: Inline) => emphasize(content, '**', 1);
export const italic = (content: Inline) => emphasize(content, '*', 2);
export const strikethrough = (content: Inline) => emphasize(content, '~~', 4);
