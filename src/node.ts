import { escapeText } from './text.ts';
import { escapeHtml } from './escape.ts';

export type Context = {
	emphasis: number;
	inLink: boolean;
	singleLine: boolean;
	indent: number | undefined;
	// Inside an inline HTML element, literal `<>&"` must also be HTML-escaped.
	htmlElement: boolean;
	literalGuards: boolean;
};

const inlineBrand: unique symbol = Symbol('inline');
const blockBrand: unique symbol = Symbol('block');

export type InlineNode = {
	readonly [inlineBrand]: true;
	readonly marker: string;
	readonly raw?: boolean;
	readonly parts?: readonly Inline[];
	// Emphasis inside the same kind of emphasis is spliced into the enclosing sequence,
	// so boundary checks see its real children instead of the delimiter it no longer emits.
	readonly emphasis?: {
		readonly flag: number;
		readonly content: Inline;
	};
	render: (context: Context) => string;
	toString: () => string;
};
export type BlockNode = {
	readonly [blockBrand]: true;
	render: (context: Context) => string;
	toString: () => string;
};
export type Inline = InlineNode | string | readonly Inline[];
export type Block = BlockNode | Inline | readonly Block[];

const context = (): Context => ({
	emphasis: 0,
	inLink: false,
	singleLine: false,
	indent: 0,
	htmlElement: false,
	literalGuards: true,
});

export const inlineNode = (format: (context: Context) => string, marker = '', parts?: readonly Inline[]): InlineNode => ({
	[inlineBrand]: true,
	marker,
	parts,
	render: format,
	toString: () => format(context()),
});
export const blockNode = (format: (context: Context) => string): BlockNode => ({
	[blockBrand]: true,
	render: format,
	toString: () => format(context()),
});

const asciiPunctuation = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
const whitespace = (character: string) => {
	if (!character) {
		return true;
	}
	const code = character.codePointAt(0)!;
	return code < 128 ? code === 32 || (code >= 9 && code <= 13 && code !== 11) : /\p{Zs}/u.test(character);
};
const punctuation = (character: string) => {
	if (!character) {
		return false;
	}
	return character.codePointAt(0)! < 128 ? asciiPunctuation.has(character) : /[\p{P}\p{S}]/u.test(character);
};
const firstCharacter = (text: string) => (text ? String.fromCodePoint(text.codePointAt(0)!) : '');
const lastCharacter = (text: string) => {
	if (!text) {
		return '';
	}
	const preceding = text.codePointAt(text.length - 2);
	const value = preceding && preceding > 0xFF_FF ? preceding : text.codePointAt(text.length - 1)!;
	return String.fromCodePoint(value);
};

const separatorNeeded = (
	previous: string,
	previousMarker: string,
	next: string,
	nextMarker: string,
) => {
	const left = lastCharacter(previous);
	const right = firstCharacter(next);
	const closing = previousMarker && previous.endsWith(previousMarker) ? previousMarker[0] : '';
	const opening = nextMarker && next.startsWith(nextMarker) ? nextMarker[0] : '';
	if (closing && closing === opening) { return true; }
	// GitHub may not close a `*` run after punctuation when another emphasis run follows.
	// Separate all touching emphasis nodes conservatively.
	if ((closing === '*' || closing === '~') && (opening === '*' || opening === '~')) { return true; }
	if (left === ']' && ':(['.includes(right) && right) { return true; }
	if (left === '!' && right === '[' && !/(?<!\\)(?:\\\\)*\\!$/.test(previous)) { return true; }
	if (opening === '*' || opening === '~') {
		const after = firstCharacter(next.slice(nextMarker.length));
		if (whitespace(after) || (punctuation(after) && !whitespace(left) && !punctuation(left))) {
			return true;
		}
	}
	if (closing === '*' || closing === '~') {
		const before = lastCharacter(previous.slice(0, -previousMarker.length));
		if (whitespace(before) || (punctuation(before) && !whitespace(right) && !punctuation(right))) {
			return true;
		}
	}
	return false;
};

const advanceIndent = (indent: number | undefined, text: string) => {
	for (const character of text) {
		if (character === '\n' || character === '\r') {
			indent = 0;
		} else if (indent !== undefined && character === ' ') {
			indent += 1;
		} else if (indent !== undefined && character === '\t') {
			indent += 4 - (indent % 4);
		} else {
			indent = undefined;
		}
	}
	return indent;
};

const escapeInlineHtml = (input: string) => input.replaceAll(/\\+[<>&"]?|[<>&"]/g, (match) => {
	const character = match.at(-1)!;
	if (character === '\\') { return match; }
	const backslashes = match.length - 1;
	return `${'\\'.repeat(backslashes - (backslashes % 2))}${escapeHtml(character)}`;
});

// Whitespace that emphasis moves outside its delimiters.
const nonAsciiBoundaryWhitespace = /[\u0085\u2028\u2029\p{Zs}]/u;
const isBoundaryWhitespace = (code: number) => (
	code < 128
		? (code >= 9 && code <= 13) || code === 32
		: nonAsciiBoundaryWhitespace.test(String.fromCodePoint(code))
);

// The `[start, end)` span of `text` without leading and trailing boundary whitespace.
export const trimBoundary = (text: string) => {
	let start = 0;
	while (start < text.length && isBoundaryWhitespace(text.codePointAt(start)!)) { start += 1; }
	let end = text.length;
	while (end > start && isBoundaryWhitespace(text.codePointAt(end - 1)!)) { end -= 1; }
	return [start, end] as const;
};

export const renderInline = (input: Inline, current: Context): string => {
	let output = '';
	let previous = '';
	let previousMarker = '';
	let previousRaw = false;
	let literals = '';
	let { indent } = current;
	let bufferedIndent = indent;
	const appendPart = (part: string, marker: string, isRaw = false) => {
		if (!part) { return; }
		if (previous && !previousRaw && !isRaw
			&& separatorNeeded(previous, previousMarker, part, marker)) {
			output += '<!-- -->';
			indent = undefined;
		}
		output += part;
		previous = part;
		previousMarker = marker;
		previousRaw = isRaw;
		indent = advanceIndent(indent, part);
	};
	const flush = () => {
		if (!literals) { return; }
		const text = current.singleLine ? literals.replaceAll(/\r\n|\r|\n/g, ' ') : literals;
		const escaped = escapeText(text, indent, current.literalGuards);
		appendPart(current.htmlElement ? escapeInlineHtml(escaped) : escaped, '');
		literals = '';
		bufferedIndent = indent;
	};
	const append = (item: Inline) => {
		if (Array.isArray(item)) {
			for (const child of item) { append(child); }
			return;
		}
		if (typeof item !== 'string' && (item as InlineNode).parts) {
			for (const child of (item as InlineNode).parts!) { append(child); }
			return;
		}
		const emphasis = typeof item === 'string' ? undefined : (item as InlineNode).emphasis;
		// eslint-disable-next-line no-bitwise -- Each emphasis kind uses one bit.
		if (emphasis && (current.emphasis & emphasis.flag)) {
			append(emphasis.content);
			return;
		}
		if (typeof item === 'string') {
			literals += item;
			bufferedIndent = advanceIndent(bufferedIndent, current.singleLine ? item.replaceAll(/\r\n|\r|\n/g, ' ') : item);
			return;
		}
		const node = item as InlineNode;
		const childIndent = literals ? bufferedIndent : indent;
		const childContext = childIndent === current.indent
			? current
			: {
				...current,
				indent: childIndent,
			};
		const part = node.render(childContext);
		if (!part) {
			return;
		}
		if (node.raw) {
			flush();
			appendPart(part, node.marker, true);
			bufferedIndent = indent;
			return;
		}
		const [start, end] = trimBoundary(part);
		append(part.slice(0, start));
		const core = part.slice(start, end);
		const trailing = part.slice(end);
		if (core) {
			flush();
			appendPart(core, node.marker);
			bufferedIndent = indent;
		}
		append(trailing);
	};
	append(input);
	flush();
	return output;
};

const containsBlock = (content: Block): boolean => {
	if (Array.isArray(content)) { return content.some(containsBlock); }
	return typeof content !== 'string' && blockBrand in (content as InlineNode | BlockNode);
};

export const render = (content: Block | Inline): string => {
	if (Array.isArray(content) && containsBlock(content)) { return content.map(render).join('\n\n'); }
	if (typeof content !== 'string' && !Array.isArray(content) && blockBrand in content) { return content.render(context()); }
	return renderInline(content as Inline, context());
};

/**
 * Emits trusted Markdown verbatim without escaping it relative to neighboring content.
 * Markdown is not parsed inside raw HTML blocks, so md-pen output placed between raw HTML
 * fragments is not escaped for HTML. Never put untrusted text inside raw HTML.
 */
export const raw = (markdown: string): InlineNode => ({
	...inlineNode(() => markdown),
	raw: true,
});
export const md = (strings: TemplateStringsArray, ...values: Inline[]): InlineNode => {
	const parts: Inline[] = [];
	for (const [index, value] of values.entries()) {
		if (strings[index]) { parts.push(strings[index]); }
		parts.push(value);
	}
	const final = strings.at(-1)!;
	if (final) { parts.push(final); }
	return inlineNode(current => renderInline(parts, current), '', parts);
};
export const join = (items: readonly Inline[], separator: Inline): Inline => {
	const parts: Inline[] = [];
	for (const [index, item] of items.entries()) {
		if (index) { parts.push(separator); }
		parts.push(item);
	}
	return parts;
};
