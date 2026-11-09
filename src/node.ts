import { escapeHtmlText, escapeText } from './text.ts';

export type Context = {
	emphasis: number;
	inLink: boolean;
	singleLine: boolean;
	lineStart: boolean;
	// Inside raw HTML, Markdown backslash escapes may stay visible, so text uses character references.
	html: boolean;
};

const inlineBrand: unique symbol = Symbol('inline');
const blockBrand: unique symbol = Symbol('block');

export type InlineNode = {
	readonly [inlineBrand]: true;
	readonly marker: string;
	readonly parts?: readonly Inline[];
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
	lineStart: true,
	html: false,
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

export const renderInline = (input: Inline, current: Context): string => {
	let output = '';
	let previous = '';
	let previousMarker = '';
	let literals = '';
	let { lineStart } = current;
	const appendPart = (part: string, marker: string) => {
		if (!part) { return; }
		if (previous && separatorNeeded(previous, previousMarker, part, marker)) { output += '<!-- -->'; }
		output += part;
		previous = part;
		previousMarker = marker;
		lineStart = part.endsWith('\n');
	};
	const flush = () => {
		if (!literals) { return; }
		const text = current.singleLine ? literals.replaceAll(/\r\n|\r|\n/g, ' ') : literals;
		appendPart(current.html ? escapeHtmlText(text) : escapeText(text, lineStart), '');
		literals = '';
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
		if (typeof item === 'string') {
			literals += item;
			return;
		}
		const node = item as InlineNode;
		const childLineStart = literals ? !current.singleLine && /[\r\n]$/u.test(literals) : lineStart;
		const childContext = childLineStart === current.lineStart
			? current
			: {
				...current,
				lineStart: childLineStart,
			};
		const part = node.render(childContext);
		if (!part) {
			return;
		}
		flush();
		appendPart(part, node.marker);
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
export const raw = (markdown: string): InlineNode => inlineNode(() => markdown);
export const md = (strings: TemplateStringsArray, ...values: Inline[]): InlineNode => {
	const parts: Inline[] = [];
	for (const [index, value] of values.entries()) {
		if (strings[index]) { parts.push(raw(strings[index])); }
		parts.push(value);
	}
	const final = strings.at(-1)!;
	if (final) { parts.push(raw(final)); }
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
