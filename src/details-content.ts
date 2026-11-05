// https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-scope
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable
const unsafeTag = /<\/?(?:applet|caption|html|table|td|th|marquee|object|template|mi|mo|mn|ms|mtext|annotation-xml|foreignobject|desc|title|tbody|thead|tfoot|tr|colgroup|col|select|script|style|textarea|xmp|iframe|noembed|noframes|noscript|plaintext|svg|math)(?=[\s/>])/i;
const opening = /^<details(?=[ \t>])[^>]*>[ \t]*$/i;
const closing = /^<\/details>[ \t]*$/i;
const summaryStart = /^ {0,3}<summary(?=[ \t>])[^>]*>/i;
const summaryEnd = /<\/summary>[ \t]*$/i;
const token = /<\/?details(?=[\s/>]|$)/gi;
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
	if (/^ {0,3}(?:(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)|>)/.test(line)) {
		return true;
	}
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

const balancedClosers = (text: string): Set<number> | null => {
	if (text.includes('`') || unsafeTag.test(text) || text.includes('<!--')) {
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
	if (!/<\/?details(?=[\s/>]|$)/i.test(text)) {
		return text;
	}
	const preserved = balancedClosers(text);
	const chunks: string[] = [];
	let start = 0;
	token.lastIndex = 0;
	for (let match = token.exec(text); match; match = token.exec(text)) {
		if (preserved?.has(match.index)) {
			continue;
		}
		const insertion = match.index + (match[0][1] === '/' ? 2 : 1);
		chunks.push(text.slice(start, insertion), '\u200B');
		start = insertion;
	}
	return chunks.join('') + text.slice(start);
};
