// Inline grammar from commonmark.js 0.31.2:
// https://github.com/commonmark/commonmark.js/blob/0.31.2/lib/common.js#L10-L32
// https://github.com/commonmark/commonmark.js/blob/0.31.2/lib/inlines.js#L71-L73
const tagName = /[a-z][a-z0-9-]*/iy;
const attributeName = /[a-z_:][\w:.-]*/iy;
// eslint-disable-next-line no-control-regex
const unquotedValue = /[^"'=<>`\u0000-\u0020]+/y;
const space = /[ \t\f]*(?:(?:\r\n|\r|\n)[ \t\f]*)?/y;
const declarationStart = /<![A-Z]+(?=[ \t\n\f\r])/y;
// eslint-disable-next-line no-control-regex
const uriAutolink = /<[a-z][a-z0-9.+-]{1,31}:[^<>\u0000-\u0020]*>/iy;
const emailAutolink = /<[\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*>/iy;

const matchEnd = (expression: RegExp, text: string, index: number) => {
	expression.lastIndex = index;
	return expression.exec(text)?.[0].length || 0;
};

const nextBackticks = (text: string) => {
	const next = new Map<number, number>();
	const latest = new Map<number, number>();
	for (let index = text.length - 1; index >= 0;) {
		if (text[index] !== '`') {
			index -= 1;
			continue;
		}
		const end = index + 1;
		while (index >= 0 && text[index] === '`') {
			index -= 1;
		}
		const start = index + 1;
		const length = end - start;
		const match = latest.get(length);
		if (match !== undefined) {
			next.set(start, match);
		}
		// A backslash can escape the first backtick without escaping the rest of the run.
		const shorterMatch = latest.get(length - 1);
		if (length > 1 && shorterMatch !== undefined) {
			next.set(start + 1, shorterMatch);
		}
		latest.set(length, start);
	}
	return next;
};

const htmlAttributeEnd = (text: string, start: number) => {
	const name = matchEnd(attributeName, text, start);
	if (!name) {
		return -1;
	}
	const afterName = start + name;
	let cursor = afterName + matchEnd(space, text, afterName);
	if (text[cursor] !== '=') {
		return afterName;
	}
	cursor += 1;
	cursor += matchEnd(space, text, cursor);
	const quote = text[cursor];
	if (quote === '"' || quote === "'") {
		const end = text.indexOf(quote, cursor + 1);
		return end === -1 ? -1 : end + 1;
	}
	const length = matchEnd(unquotedValue, text, cursor);
	return length ? cursor + length : -1;
};

const htmlAttributesEnd = (text: string, start: number, cache: Map<number, number>) => {
	const visited: number[] = [];
	let index = start;
	let result = -1;
	while (!cache.has(index)) {
		visited.push(index);
		const whitespace = matchEnd(space, text, index);
		const cursor = index + whitespace;
		if (text[cursor] === '/' && text[cursor + 1] === '>') {
			result = cursor + 2;
			break;
		}
		if (text[cursor] === '>') {
			result = cursor + 1;
			break;
		}
		if (!whitespace) {
			break;
		}
		const end = htmlAttributeEnd(text, cursor);
		if (end === -1) {
			break;
		}
		index = end;
	}
	if (cache.has(index)) {
		result = cache.get(index)!;
	}
	for (const position of visited) {
		cache.set(position, result);
	}
	return result;
};

const htmlSpecialEnd = (text: string, index: number, last: Map<string, number>) => {
	if (text.startsWith('<!--->', index)) {
		return index + 6;
	}
	let start = 0;
	let terminator = '';
	if (text.startsWith('<!--', index)) {
		start = index + 4;
		terminator = '-->';
	} else if (text.startsWith('<?', index)) {
		start = index + 2;
		terminator = '?>';
	} else if (text.startsWith('<![CDATA[', index)) {
		start = index + 9;
		terminator = ']]>';
	} else if (matchEnd(declarationStart, text, index)) {
		start = index + 2;
		terminator = '>';
	} else {
		return -1;
	}
	if (!last.has(terminator)) {
		last.set(terminator, text.lastIndexOf(terminator));
	}
	if (start > last.get(terminator)!) {
		return -1;
	}
	const end = text.indexOf(terminator, start);
	return end + terminator.length;
};

const angleEnd = (
	text: string,
	index: number,
	cache: Map<number, number>,
	last: Map<string, number>,
) => {
	const autolink = matchEnd(emailAutolink, text, index) || matchEnd(uriAutolink, text, index);
	if (autolink) {
		return index + autolink;
	}
	if (text[index + 1] === '!' || text[index + 1] === '?') {
		if (text.startsWith('<!-->', index)) {
			return index + 5;
		}
		return htmlSpecialEnd(text, index, last);
	}
	const closing = text[index + 1] === '/';
	const start = index + (closing ? 2 : 1);
	const name = matchEnd(tagName, text, start);
	if (!name) {
		return -1;
	}
	const end = start + name;
	if (!closing) {
		return htmlAttributesEnd(text, end, cache);
	}
	const afterSpace = end + matchEnd(space, text, end);
	return text[afterSpace] === '>' ? afterSpace + 1 : -1;
};

// Call at each unconsumed position; the result is an exclusive end or -1.
export const createInlineScanner = (text: string, options: { angle?: boolean } = {}) => {
	const backticks = nextBackticks(text);
	const htmlCache = new Map<number, number>();
	const last = new Map<string, number>();
	const protectedEnd = (index: number) => {
		if (text[index] === '\\' && index + 1 < text.length) {
			return index + 2;
		}
		if (text[index] === '<' && options.angle !== false) {
			return angleEnd(text, index, htmlCache, last);
		}
		if (text[index] !== '`') {
			return -1;
		}
		let end = index + 1;
		while (text[end] === '`') {
			end += 1;
		}
		const match = backticks.get(index);
		return match === undefined ? end : match + end - index;
	};
	return { protectedEnd };
};
