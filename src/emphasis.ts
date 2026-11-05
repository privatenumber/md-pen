import { createInlineScanner } from './inline-constructs.ts';

const isIntrawordUnderscore = (text: string, index: number) => {
	const previous = text.codePointAt(index - 1) ?? 0;
	const before = previous >= 0xDC_00 && previous <= 0xDF_FF ? index - 2 : index - 1;
	const preceding = text.codePointAt(before);
	const following = text.codePointAt(index + 1);
	return preceding !== undefined && following !== undefined
		&& /[\p{L}\p{N}]/u.test(String.fromCodePoint(preceding))
		&& /[\p{L}\p{N}]/u.test(String.fromCodePoint(following));
};

const escapeContent = (text: string, delimiter: string) => {
	const { protectedEnd } = createInlineScanner(text);
	let result = '';
	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];
		const end = protectedEnd(index);
		if (end !== -1) {
			result += text.slice(index, end);
			index = end - 1;
			continue;
		}
		if (character === delimiter[0] && (delimiter !== '__' || !isIntrawordUnderscore(text, index))) {
			result += '\\';
		}
		result += character;
	}
	let trailingBackslashes = 0;
	while (result[result.length - trailingBackslashes - 1] === '\\') {
		trailingBackslashes += 1;
	}
	return trailingBackslashes % 2 ? `${result}\\` : result;
};

const normalizeBoundary = (text: string) => {
	const lastLineEnding = Math.max(text.lastIndexOf('\r'), text.lastIndexOf('\n')) + 1;
	return text.slice(0, lastLineEnding) + text.slice(lastLineEnding).replaceAll(/[\t\n\f\r ]+/g, ' ');
};

const emphasize = (text: string, delimiter: string) => {
	if (!text) {
		return '';
	}
	const leading = text.match(/^[\t\n\v\f\r\u2028\u2029\p{Zs}]*/u)![0];
	if (leading.length === text.length) {
		return text;
	}
	let end = text.length;
	while (end > leading.length && /[\t\n\v\f\r\u2028\u2029\p{Zs}]/u.test(text[end - 1])) {
		end -= 1;
	}
	const content = text.slice(leading.length, end);
	const prefix = normalizeBoundary(leading);
	const suffix = normalizeBoundary(text.slice(end));
	return `${prefix}${delimiter}${escapeContent(content, delimiter)}${delimiter}${suffix}`;
};

export const bold = (text: string) => emphasize(text, '__');
export const italic = (text: string) => emphasize(text, '*');
export const strikethrough = (text: string) => emphasize(text, '~~');
