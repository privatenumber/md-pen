import { normalizeLineEndings } from './utils/normalize-line-endings.ts';

// Every character or prefix that a rule below can rewrite; update it with any new rule.
// Most literal runs are plain words, so testing once avoids running each rule.
// A single trailing space cannot form a hard break, and leading spaces matter only before
// a block marker or at code-block indentation; tabs are always escapable.
// `indent` is the whitespace columns already on the current line, or undefined mid-line.
const escapable = /[\r\n\t:#@$\\*`[\]<>~&_|]|gh-|(?:https?|ftp):|www\.| {2}$|^ *[\d+=-]/i;

// Escape literal text, not Markdown that has already been serialized.
export const escapeText = (input: string, indent: number | undefined): string => {
	if (!escapable.test(input) && (indent === undefined || !input.startsWith(' '))) { return input; }
	let text = normalizeLineEndings(input)
		.replaceAll(/(^|[ \t\n(]):[\w:+-]+/g, match => match.replaceAll(/:([\w+-]+)(?=:)/g, (shortcode, name: string) => (
			/^\d+$/.test(name) && name !== '100' && name !== '1234' ? shortcode : `:\u200B${name}`
		)))
		.replaceAll(/\B#(?=\d)|(?<=[\w.-]\/[\w.-]{1,100})#(?=\d)/g, '#\u200B')
		.replaceAll(/\bGH-(?=\d)/gi, '$&\u200B')
		.replaceAll(/@(?:[\w-]+(?:\.[\w-]+)+)?/g, (match, offset: number, source: string) => (
			!/\w/.test(source[offset - 1] ?? '') || match.length > 1 ? `@\u200B${match.slice(1)}` : match
		))
		.replaceAll('$', '\u200B$')
		.replaceAll(/(?<![ \t])[ \t]+(?=\n|$)/g, ' ');
	text = text.replaceAll(/[\\*`[\]<>~$|]|&(?=(?:#\d+|#x[\da-f]+|[a-z][a-z\d]{1,31});)|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/giu, String.raw`\$&`);
	text = text.replaceAll(/(?:https?|ftp):\/\/|www\./gi, match => match.replace(/[:.]/, String.raw`\$&`));
	text = text.replaceAll(/(^|\n)( {0,3})(?=(?:-{3,}|=+)[ \t]*(?:\n|$))([-=])/g, (match, prefix: string, spaces: string, marker: string, offset: number) => (
		indentationUnavailable(prefix, offset, indent) ? match : `${prefix}${spaces}\\${marker}`
	));
	// Escape block markers at line starts. Indentation that could start an indented code block
	// (four columns; tabs expand to the next multiple of four) starts with a space reference.
	return text.replaceAll(/(^|\n)([ \t]*)(?:(#{1,6})(?=[ \t\n]|$)|(>)(?=.)|([-+=])(?=[ \t\n]|$)|(\d{1,9})([.)])(?=[ \t\n]|$))/g, (match, prefix: string, spaces: string, heading: string, quote: string, marker: string, digits: string, punctuation: string, offset: number) => {
		if (indentationUnavailable(prefix, offset, indent)) { return match; }
		return `${prefix}${spaces}${digits ?? ''}\\${heading ?? quote ?? marker ?? punctuation}`;
	}).replaceAll(/(^|\n)([ \t]+)/g, (match, prefix: string, whitespace: string, offset: number) => {
		if (indentationUnavailable(prefix, offset, indent)) { return match; }
		let columns = prefix || offset > 0 ? 0 : indent!;
		for (const character of whitespace) { columns += character === '\t' ? 4 - (columns % 4) : 1; }
		return columns < 4 ? match : `${prefix}&#32;${whitespace.slice(1)}`;
	});
};

const indentationUnavailable = (prefix: string, offset: number, indent: number | undefined) => (
	!prefix && offset === 0 && indent === undefined
);

// Literal text at the start of a line, for Markdown built outside md-pen.
export const escape = (text: string) => escapeText(text, 0);

// Literal text inside raw HTML: character references render in both Markdown flow and HTML blocks.
export const escapeHtmlText = (text: string): string => text
	.replaceAll(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g, character => `&#${character.codePointAt(0)};`)
	// GitHub still resolves math and mentions after decoding references.
	.replaceAll('&#36;', '\u200B&#36;')
	.replaceAll('&#64;', '&#64;\u200B');
