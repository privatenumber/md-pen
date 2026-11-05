// https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-scope
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable
const unsafeTag = /<\/?(?:applet|caption|html|table|td|th|marquee|object|template|mi|mo|mn|ms|mtext|annotation-xml|foreignobject|desc|title|tbody|thead|tfoot|tr|colgroup|col|select|script|style|textarea|xmp|iframe|noembed|noframes|noscript|plaintext|svg|math)(?=[\s/>])/i;
const opening = /^ {0,3}<details(?=[ \t>])[^>]*>[ \t]*$/i;
const closing = /^ {0,3}<\/details>[ \t]*$/i;
const summaryStart = /^ {0,3}<summary(?=[ \t>])[^>]*>/i;
const summaryEnd = /<\/summary>[ \t]*$/i;
const closer = /<\/details(?=[\s/>])/gi;
const containerPrefix = / {0,3}(?:>[ \t]?|(?:[-+*]|\d{1,9}[.)])[ \t])/y;

// Remove container markers while retaining indentation after the last marker.
const containerBody = (line: string) => {
	let offset = 0;
	while (offset < line.length) {
		containerPrefix.lastIndex = offset;
		const prefix = containerPrefix.exec(line);
		if (!prefix) {
			break;
		}
		offset += prefix[0].length;
	}
	return line.slice(offset);
};

const isComplexLine = (line: string, inSummary: boolean) => {
	const body = containerBody(line);
	if (/^(?: {4}|\t)/.test(body) || /^ {0,3}(?:```|~~~)/.test(body)) {
		return true;
	}
	if (inSummary) {
		return false;
	}
	return /^ {0,3}<[a-z/!?]/i.test(body)
		&& !opening.test(body) && !closing.test(body) && !summaryStart.test(body);
};

type PairState = {
	preserved: Set<number>;
	depth: number;
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
		state.depth += 1;
		state.htmlBlock = true;
	} else if (!state.htmlBlock && closing.test(line)) {
		if (state.depth > 0) {
			state.depth -= 1;
			state.preserved.add(index + line.indexOf('<'));
		}
		state.htmlBlock = true;
	}
	return true;
};

const balancedClosers = (text: string): Set<number> | null => {
	if (text.includes('`') || unsafeTag.test(text) || text.includes('<!--')) {
		return null;
	}
	const state: PairState = {
		preserved: new Set(),
		depth: 0,
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
	if (!/<\/details/i.test(text)) {
		return text;
	}
	const preserved = balancedClosers(text);
	const chunks: string[] = [];
	let start = 0;
	closer.lastIndex = 0;
	for (let match = closer.exec(text); match; match = closer.exec(text)) {
		if (preserved?.has(match.index)) {
			continue;
		}
		const end = text.indexOf('>', match.index + match[0].length);
		if (end === -1) {
			break;
		}
		chunks.push(text.slice(start, match.index + 2), '\u200B');
		start = match.index + 2;
		closer.lastIndex = end + 1;
	}
	return chunks.join('') + text.slice(start);
};
