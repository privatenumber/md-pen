import { createInlineScanner } from './inline-constructs.ts';

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
		if (character === delimiter[0] && (delimiter === '*' || index === 0 || index === text.length - 1)) {
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

const emphasize = (text: string, delimiter: string) => {
	if (!text) {
		return '';
	}
	const leading = text.match(/^[\t\n\f\r\p{Zs}]*/u)![0];
	if (leading.length === text.length) {
		return text;
	}
	let end = text.length;
	while (end > leading.length && /[\t\n\f\r\p{Zs}]/u.test(text[end - 1])) {
		end -= 1;
	}
	const content = text.slice(leading.length, end);
	const prefix = leading.replaceAll(/[\t\n\f\r ]+/g, ' ');
	const suffix = text.slice(end).replaceAll(/[\t\n\f\r ]+/g, ' ');
	return `${prefix}${delimiter}${escapeContent(content, delimiter)}${delimiter}${suffix}`;
};

export const bold = (text: string) => emphasize(text, '__');
export const italic = (text: string) => emphasize(text, '*');
export const strikethrough = (text: string) => emphasize(text, '~~');
