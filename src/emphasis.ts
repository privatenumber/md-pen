const normalizeBoundary = (text: string) => {
	const lastLineEnding = Math.max(text.lastIndexOf('\r'), text.lastIndexOf('\n')) + 1;
	return text.slice(0, lastLineEnding) + text.slice(lastLineEnding).replaceAll(/[\t\n\f\r ]+/g, ' ');
};

const hasTrailingHardBreak = (text: string, end: number) => {
	if (text[end] !== '\n' && text[end] !== '\r') {
		return false;
	}
	let backslashes = 0;
	while (text[end - backslashes - 1] === '\\') {
		backslashes += 1;
	}
	return backslashes % 2 === 1;
};

const canWrapDirectly = (text: string, delimiter: string) => {
	const boundaryWhitespace = /[\t\n\v\f\r\u0085\u2028\u2029\p{Zs}]/u;
	return !text.includes(delimiter[0]) && !text.endsWith('\\') && !boundaryWhitespace.test(text[0]) && !boundaryWhitespace.test(text.at(-1)!);
};

const wrapContent = (content: string, delimiter: string) => {
	let backslashes = 0;
	while (content[content.length - backslashes - 1] === '\\') {
		backslashes += 1;
	}
	const escaped = backslashes % 2 ? `${content}\\` : content;
	if (!content.includes(delimiter[0])) {
		return `${delimiter}${escaped}${delimiter}`;
	}
	if (delimiter === '__' && !content.includes('*')) {
		return `**${escaped}**`;
	}
	const tag = delimiter === '__' ? 'strong' : (delimiter === '*' ? 'em' : 'del');
	return `<${tag}>${escaped}</${tag}>`;
};

const emphasize = (text: string, delimiter: string) => {
	if (!text) {
		return '';
	}
	if (canWrapDirectly(text, delimiter)) {
		return `${delimiter}${text}${delimiter}`;
	}
	const leading = text.match(/^[\t\n\v\f\r\u0085\u2028\u2029\p{Zs}]*/u)![0];
	if (leading.length === text.length) {
		return text;
	}
	let end = text.length;
	while (end > leading.length && /[\t\n\v\f\r\u0085\u2028\u2029\p{Zs}]/u.test(text[end - 1])) {
		end -= 1;
	}
	let suffix = text.slice(end);
	if (hasTrailingHardBreak(text, end)) {
		end -= 1;
		suffix = `\\${suffix}`;
	}
	const content = text.slice(leading.length, end);
	const prefix = normalizeBoundary(leading);
	if (!content) {
		return `${prefix}${normalizeBoundary(suffix)}`;
	}
	return `${prefix}${wrapContent(content, delimiter)}${normalizeBoundary(suffix)}`;
};

export const bold = (text: string) => emphasize(text, '__');
export const italic = (text: string) => emphasize(text, '*');
export const strikethrough = (text: string) => emphasize(text, '~~');
