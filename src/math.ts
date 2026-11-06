import { hasCharacterReference } from './escape.ts';

const backtickDelimiter = (expression: string, minimum: number) => {
	let length = minimum;
	for (const run of expression.matchAll(/`+/g)) {
		length = Math.max(length, run[0].length + 1);
	}
	return '`'.repeat(length);
};

// These characters can create Markdown syntax or alter math in surrounding Markdown.
const markdownActive = new Set('*`[]<>~$|@');
const asciiPunctuation = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');

const hasMarkdownEscape = (expression: string) => {
	for (let index = 0; index < expression.length; index += 1) {
		if (expression[index] === '\\' && (index + 1 === expression.length || expression[index + 1] === '\n' || asciiPunctuation.has(expression[index + 1]))) {
			return true;
		}
	}
	return false;
};

const hasUnsafeUnderscore = (expression: string) => /(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/u.test(expression);
const hasAutolink = (expression: string) => /https?:\/\/|ftp:\/\/|www\./i.test(expression);

const hasMarkdownSyntax = (expression: string) => {
	for (const character of expression) {
		if (markdownActive.has(character)) {
			return true;
		}
	}
	return hasCharacterReference(expression)
		|| hasUnsafeUnderscore(expression)
		|| hasMarkdownEscape(expression)
		|| hasAutolink(expression);
};

// These lines can interrupt dollar-delimited display math as Markdown blocks.
const blankLine = /^[ \t]*$/m;
const indentedCode = /^(?: {0,3}\t| {4})/m;
const blockMarker = /^ {0,3}(?:#{1,6}(?:[ \t]|$)|>|[-+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$))/m;
const headingOrTableDelimiter = /^ {0,3}(?:=+|:?-+:?)[ \t]*$/m;
const blockStartPatterns = [
	blankLine,
	indentedCode,
	blockMarker,
	headingOrTableDelimiter,
];

export const math = (expression: string) => {
	const singleLine = expression.replaceAll(/[\r\n]+/g, ' ').trim();
	if (singleLine === '') {
		return '';
	}
	if (hasMarkdownSyntax(singleLine)) {
		const delimiter = backtickDelimiter(singleLine, 1);
		const padding = singleLine.includes('`') ? ' ' : '';
		return `$${delimiter}${padding}${singleLine}${padding}${delimiter}$`;
	}
	return `$${singleLine}$`;
};

export const mathBlock = (expression: string) => {
	const normalized = expression.replaceAll(/\r\n?/g, '\n');
	if (normalized === '') {
		return '';
	}
	const separator = normalized.endsWith('\n') ? '' : '\n';
	// Exclude the final line terminator so it does not create a synthetic blank line.
	const lines = separator ? normalized : normalized.slice(0, -1);
	if (!hasMarkdownSyntax(normalized) && !blockStartPatterns.some(pattern => pattern.test(lines))) {
		return `$$\n${normalized}${separator}$$`;
	}
	const delimiter = backtickDelimiter(normalized, 3);
	return `${delimiter}math\n${normalized}${separator}${delimiter}`;
};
