import { createInlineScanner } from './inline-constructs.ts';

// https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-scope
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable
const unsafeTag = /<\/?(?:applet|caption|html|table|td|th|marquee|object|template|mi|mo|mn|ms|mtext|annotation-xml|foreignobject|desc|title|tbody|thead|tfoot|tr|colgroup|col|select|script|style|textarea|xmp|iframe|noembed|noframes|noscript|plaintext|svg|math)(?=[\s/>])/i;
const detailsOpen = /^<details(?=[ \t>])[^>]*>[ \t]*$/i;
const detailsClose = /^<\/details>[ \t]*$/i;
const summary = /^<summary(?=[ \t>])[^>]*>.*<\/summary>[ \t]*$/i;
const closer = /^<\/details(?=[\s/>])/i;

type Line = { text: string;
	start: number;
	end: number; };
type Range = { start: number;
	end: number;
	code: boolean;
	balanced: boolean;
	blockStart?: boolean;
	raw?: boolean; };

const linesOf = (text: string): Line[] => {
	const lines: Line[] = [];
	for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
		if (match[0]) {
			lines.push({
				text: match[0],
				start: match.index,
				end: match.index + match[0].length,
			});
		}
	}
	return lines;
};

const stripPrefixes = (line: string) => {
	let index = 0;
	while (index < line.length) {
		if (line[index] === ' ' || line[index] === '\t' || line[index] === '>') {
			index += 1;
			continue;
		}
		const marker = /^(?:[-+*]|\d{1,9}[.)])[ \t]/.exec(line.slice(index, index + 12));
		if (!marker) {
			break;
		}
		index += marker[0].length;
	}
	return line.slice(index);
};

const needsFallback = (text: string, lines: Line[]) => {
	if (unsafeTag.test(text)) {
		return true;
	}
	for (const line of lines) {
		const body = stripPrefixes(line.text.replace(/(?:\r\n|\r|\n)$/, ''));
		if (/^<[a-z/!?]/i.test(body) && !detailsOpen.test(body) && !detailsClose.test(body) && !summary.test(body)) {
			return true;
		}
	}
	return false;
};

type Fence = { character: string;
	length: number;
	prefix: string;
	indent: number; };

const startFence = (line: string, seenList: boolean): Fence | null => {
	const match = /^( {0,3}(?:> ?)*)( {0,3})(?:([-+*]|\d{1,9}[.)]) ( {0,3}))?(`{3,}|~{3,})/.exec(line);
	if (!match) {
		return null;
	}
	const [, prefix, spaces, marker, afterMarker, run] = match;
	if (seenList && !marker && spaces.length > 0) {
		return null;
	}
	if (run[0] === '`' && line.slice(match[0].length).includes('`')) {
		return null;
	}
	return {
		character: run[0],
		length: run.length,
		prefix,
		indent: spaces.length + (marker ? marker.length + 1 + afterMarker.length : 0),
	};
};

const fenceLine = (line: string, fence: Fence): string | null => {
	if (!line.startsWith(fence.prefix)) {
		return null;
	}
	const body = line.slice(fence.prefix.length);
	if (fence.indent > 0 && !body.startsWith(' '.repeat(fence.indent))) {
		return null;
	}
	return body.slice(fence.indent);
};

const isFenceClose = (line: string, fence: Fence) => {
	const body = fenceLine(line, fence);
	if (body === null) {
		return false;
	}
	const match = /^ {0,3}(`+|~+)[ \t]*$/.exec(body);
	return Boolean(match && match[1][0] === fence.character && match[1].length >= fence.length);
};

type PreciseState = {
	fence: Fence | null;
	depth: number;
	paragraph: boolean;
	seenList: boolean;
	htmlBlock: boolean;
};

const classifyCode = (line: string, state: PreciseState) => {
	if (state.fence && fenceLine(line, state.fence) === null) {
		state.fence = null;
	}
	const insideFence = Boolean(state.fence);
	if (state.fence && isFenceClose(line, state.fence)) {
		state.fence = null;
	}
	if (insideFence) {
		return true;
	}
	state.fence = startFence(line, state.seenList);
	return Boolean(state.fence) || (!state.paragraph && !state.seenList && /^(?: {4}|\t)/.test(line)) || /^[ \t]*$/.test(line);
};

const balancedDetails = (line: string, state: PreciseState, code: boolean) => {
	const anchored = /^ {0,3}([^ \t].*)$/.exec(line)?.[1];
	if (code || !anchored) {
		return false;
	}
	if (detailsClose.test(anchored) && state.depth > 0) {
		state.depth -= 1;
		return true;
	}
	if (detailsOpen.test(anchored)) {
		state.depth += 1;
	}
	return false;
};

const structuralHtml = (body: string) => (
	detailsOpen.test(body) || detailsClose.test(body) || summary.test(body)
);

const preciseRanges = (lines: Line[]) => {
	const ranges: Range[] = [];
	const state: PreciseState = {
		fence: null,
		depth: 0,
		paragraph: false,
		seenList: false,
		htmlBlock: false,
	};
	for (const entry of lines) {
		const line = entry.text.replace(/(?:\r\n|\r|\n)$/, '');
		const body = stripPrefixes(line);
		if (!body) {
			state.htmlBlock = false;
		}
		const raw = state.htmlBlock;
		const code = !raw && classifyCode(line, state);
		const balanced = balancedDetails(line, state, code || raw);
		if (!code && structuralHtml(body)) {
			state.htmlBlock = true;
		}
		if (/^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]/.test(line)) {
			state.seenList = true;
		}
		state.paragraph = !code && !/^[ \t]*$/.test(line);
		ranges.push({
			start: entry.start,
			end: entry.end,
			code,
			balanced,
			blockStart: /^ {0,3}(?:<\/details(?=[\s/>])|>|#{1,6}(?:[ \t]|$)|(?:[-+*]|\d{1,9}[.)])[ \t])/.test(line),
			raw: raw || summary.test(body),
		});
	}
	return ranges;
};

type RewriteState = {
	chunks: string[];
	last: number;
	index: number;
};

type InlineState = {
	rawEnd: number;
	lf: number;
	cr: number;
};

const updateLineEnds = (part: string, position: number, state: InlineState) => {
	if (state.lf !== -1 && position >= state.lf) {
		state.lf = part.indexOf('\n', position + 1);
	}
	if (state.cr !== -1 && position >= state.cr) {
		state.cr = part.indexOf('\r', position + 1);
	}
};

const advanceInline = (
	part: string,
	position: number,
	scanner: ReturnType<typeof createInlineScanner>,
	state: InlineState,
) => {
	updateLineEnds(part, position, state);
	const end = scanner.protectedEnd(position);
	if (end <= position) {
		return position;
	}
	if (part[position] === '<') {
		state.rawEnd = end;
		return position;
	}
	const lineEnd = Math.min(
		state.lf === -1 ? part.length : state.lf,
		state.cr === -1 ? part.length : state.cr,
	);
	if (part[position] !== '`' || end <= lineEnd) {
		return end;
	}
	let cursor = position;
	while (part[cursor] === '`') {
		cursor += 1;
	}
	return cursor;
};

const scanPart = (
	text: string,
	part: string,
	start: number,
	scanner: ReturnType<typeof createInlineScanner> | null,
	state: RewriteState,
) => {
	const inline: InlineState = {
		rawEnd: 0,
		lf: part.indexOf('\n'),
		cr: part.indexOf('\r'),
	};
	state.index = Math.max(state.index, start);
	while (state.index < start + part.length) {
		const position = state.index - start;
		if (position >= inline.rawEnd && scanner) {
			const end = advanceInline(part, position, scanner, inline);
			if (end > position) {
				state.index = start + end;
				continue;
			}
		}
		if (text[state.index] !== '<' || !closer.test(text.slice(state.index, state.index + 11))) {
			state.index += 1;
			continue;
		}
		const close = text.indexOf('>', state.index + 9);
		if (close === -1) {
			return false;
		}
		state.chunks.push(text.slice(state.last, state.index), '&lt;/details&gt;');
		state.index = close + 1;
		state.last = state.index;
	}
	return true;
};

const joinsRange = (previous: Range, next: Range, precise: boolean) => !precise || (
	!previous.raw && !next.raw && !next.code && !next.balanced && !next.blockStart
);

const rewrite = (text: string, ranges: Range[], precise: boolean) => {
	const state: RewriteState = {
		chunks: [],
		last: 0,
		index: 0,
	};
	for (let rangeIndex = 0; rangeIndex < ranges.length;) {
		const range = ranges[rangeIndex];
		if (precise && (range.code || range.balanced)) {
			rangeIndex += 1;
			continue;
		}
		let endIndex = rangeIndex + 1;
		while (endIndex < ranges.length && joinsRange(range, ranges[endIndex], precise)) {
			endIndex += 1;
		}
		const { end } = ranges[endIndex - 1];
		const part = text.slice(range.start, end);
		const scanner = precise && !range.raw ? createInlineScanner(part, { angle: true }) : null;
		if (!scanPart(text, part, range.start, scanner, state)) {
			break;
		}
		rangeIndex = endIndex;
	}
	return state.chunks.join('') + text.slice(state.last);
};

export const protectDetailsContent = (text: string) => {
	const lines = linesOf(text);
	const fallback = needsFallback(text, lines);
	const ranges = fallback
		? [{
			start: 0,
			end: text.length,
			code: false,
			balanced: false,
		}]
		: preciseRanges(lines);
	return rewrite(text, ranges, !fallback);
};
