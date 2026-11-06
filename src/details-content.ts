// https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-scope
const scopeBoundaries = new Set([
	'applet',
	'caption',
	'html',
	'table',
	'td',
	'th',
	'marquee',
	'object',
	'template',
	'mi',
	'mo',
	'mn',
	'ms',
	'mtext',
	'annotation-xml',
	'foreignobject',
	'desc',
	'title',
]);
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable
const tableStructure = new Set(['tbody', 'thead', 'tfoot', 'tr', 'colgroup', 'col']);
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
const textElements = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
const foreignRoots = new Set(['svg', 'math']);
const unsafeTags = new Set([
	...scopeBoundaries,
	...tableStructure,
	...textElements,
	...foreignRoots,
	// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
	'select',
]);
const detailsTag = new Set(['details']);
const opening = /^<details(?:[ \t]+[^\s"'<>/=]+="[^">]*")*[ \t]*>[ \t]*$/i;
const closing = /^<\/details>[ \t]*$/i;
const summaryStart = /^ {0,3}<summary>/i;
const summaryEnd = /<\/summary>[ \t]*$/i;
const summaryCloseLine = /^<\/summary>[ \t]*$/i;

const isTagNameCharacter = (code: number) => (
	(code >= 65 && code <= 90) || (code >= 97 && code <= 122)
	|| (code >= 48 && code <= 57) || code === 45
);

const tagNameEnd = (text: string, start: number) => {
	let end = start;
	while (isTagNameCharacter(text.codePointAt(end) ?? -1)) {
		end += 1;
	}
	return end;
};

const isTagBoundary = (text: string, index: number, allowEnd: boolean) => (
	text[index] === '/' || text[index] === '>' || /\s/.test(text[index] ?? '') || (allowEnd && index === text.length)
);

// This is a conservative text scan, not an HTML tokenizer: escaped tags count too.
const findTag = (text: string, from: number, names: Set<string>, allowEnd: boolean) => {
	let index = from;
	while (index < text.length) {
		const start = text.indexOf('<', index);
		if (start === -1) {
			break;
		}
		const nameStart = start + (text[start + 1] === '/' ? 2 : 1);
		const end = tagNameEnd(text, nameStart);
		if (end > nameStart && isTagBoundary(text, end, allowEnd)) {
			const name = text.slice(nameStart, end).toLowerCase();
			if (names.has(name)) {
				return {
					start,
					end,
				};
			}
		}
		index = end;
	}
	return null;
};

const listMarkerEnd = (line: string, start: number) => {
	if (line[start] === '-' || line[start] === '+' || line[start] === '*') {
		return start + 1;
	}
	let index = start;
	while (index - start < 9 && line[index] >= '0' && line[index] <= '9') {
		index += 1;
	}
	if (index === start || (line[index] !== '.' && line[index] !== ')')) {
		return start;
	}
	return index + 1;
};

const containerPrefixEnd = (line: string, start: number) => {
	let index = start;
	while (index - start < 3 && line[index] === ' ') {
		index += 1;
	}
	if (line[index] === '>') {
		index += 1;
		return index + Number(line[index] === ' ' || line[index] === '\t');
	}
	const markerEnd = listMarkerEnd(line, index);
	if (markerEnd === index) {
		return start;
	}
	return line[markerEnd] === ' ' || line[markerEnd] === '\t' ? markerEnd + 1 : start;
};

// Remove container markers while retaining indentation after the last marker.
const containerBody = (line: string) => {
	let offset = 0;
	while (offset < line.length) {
		const end = containerPrefixEnd(line, offset);
		if (end === offset) {
			break;
		}
		offset = end;
	}
	return line.slice(offset);
};

const structuralSummary = (body: string) => {
	const start = summaryStart.exec(body);
	if (!start) {
		return false;
	}
	const rest = body.slice(start[0].length);
	const nextTag = rest.indexOf('<');
	return nextTag === -1 || summaryCloseLine.test(rest.slice(nextTag));
};

const isComplexLine = (line: string, inSummary: boolean) => {
	const body = containerBody(line);
	if (/^(?: {4}|\t)/.test(body) || /^ {0,3}(?:```|~~~)/.test(body)) {
		return true;
	}
	return /^ {0,3}<[a-z/!?]/i.test(body)
		&& !opening.test(body) && !closing.test(body)
		&& !(inSummary && summaryCloseLine.test(body)) && !structuralSummary(body);
};

type PairState = {
	preserved: Set<number>;
	openers: number[];
	htmlBlock: boolean;
	inSummary: boolean;
};

const trackLine = (line: string, index: number, state: PairState) => {
	if (isComplexLine(line, state.inSummary)) {
		return false;
	}
	if (/^[ \t]*$/.test(line)) {
		state.htmlBlock = false;
	}
	if (state.inSummary || summaryStart.test(line)) {
		state.inSummary = !summaryEnd.test(line);
		state.htmlBlock = true;
	} else if (!state.htmlBlock && opening.test(line)) {
		state.openers.push(index);
		state.htmlBlock = true;
	} else if (!state.htmlBlock && closing.test(line)) {
		const opener = state.openers.pop();
		if (opener !== undefined) {
			state.preserved.add(opener);
			state.preserved.add(index);
		}
		state.htmlBlock = true;
	}
	return true;
};

const preservedTagOffsets = (text: string): Set<number> | null => {
	if (text.includes('`') || findTag(text, 0, unsafeTags, false) || text.includes('<!--')) {
		return null;
	}
	const state: PairState = {
		preserved: new Set(),
		openers: [],
		htmlBlock: false,
		inSummary: false,
	};
	for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
		if (!match[0]) {
			continue;
		}
		const line = match[0].replace(/(?:\r\n|\r|\n)$/, '');
		if (!trackLine(line, match.index, state)) {
			return null;
		}
	}
	return state.inSummary ? null : state.preserved;
};

export const protectDetailsContent = (text: string) => {
	let match = findTag(text, 0, detailsTag, true);
	if (!match) {
		return text;
	}
	const preserved = preservedTagOffsets(text);
	const chunks: string[] = [];
	let start = 0;
	while (match) {
		if (!preserved?.has(match.start)) {
			const insertion = match.start + 1;
			chunks.push(text.slice(start, insertion), '\u200B');
			start = insertion;
		}
		match = findTag(text, match.end, detailsTag, true);
	}
	return chunks.join('') + text.slice(start);
};
