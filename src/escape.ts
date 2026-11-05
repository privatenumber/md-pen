export const escape = (text: string) => text
	.replaceAll(/\r\n?/g, '\n')
	.replaceAll(/^[ \t]+/gm, indentation => (indentation.includes('\t') || indentation.length >= 4 ? '   ' : indentation))
	.replaceAll(/(^|[ \n]):[\w:+-]+/g, match => match.replaceAll(/:(?=[\w+-]+:)/g, ':\u200B'))
	.replaceAll(/\B#(?=\d)|(?<=[\w.-]\/[\w.-]{1,100})#(?=\d)/g, '#\u200B')
	.replaceAll(/\bGH-(?=\d)/gi, '$&\u200B')
	.replaceAll(/@(?:[\w-]+(?:\.[\w-]+)+)?/g, (match, offset: number, input: string) => (
		!/\w/.test(input[offset - 1] ?? '') || match.length > 1 ? `@\u200B${match.slice(1)}` : match
	))
	.replaceAll(/[\\`*_~[\]<>&#\-+$]/g, character => (character === '$' ? '\u200B\\$' : `\\${character}`))
	.replaceAll(/^( {0,3}\d{1,9})([.)])(?=[ \t]|$)/gm, String.raw`$1\$2`)
	.replaceAll(/^( {0,3})(=+)[ \t]*$/gm, String.raw`$1\$2`)
	.replaceAll(/[ \t]+/g, (whitespace, offset: number, input: string) => (offset + whitespace.length === input.length || input[offset + whitespace.length] === '\n' ? ' ' : whitespace))
	.replaceAll(/(?:https?|ftp):/gi, match => String.raw`${match.slice(0, -1)}\:`)
	.replaceAll(/www\./gi, match => String.raw`${match.slice(0, -1)}\.`);

const htmlEntityMap: Record<string, string> = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;',
	'"': '&quot;',
};

export const escapeHtml = (text: string) => text.replaceAll(
	/[<>&"]/g,
	character => htmlEntityMap[character],
);

const sanitizeAttributeName = (name: string) => name.replaceAll(/[\s"'>/=<]/g, '');

export const htmlAttributes = (
	attributes?: Record<string, string | number>,
) => {
	if (!attributes) {
		return '';
	}
	let result = '';
	for (const [key, value] of Object.entries(attributes)) {
		const name = sanitizeAttributeName(key);
		if (name.length > 0) {
			result += ` ${name}="${escapeHtml(String(value))}"`;
		}
	}
	return result;
};

export const escapeTableCell = (text: string) => {
	// Escape | for table structure, handling \| (backslash before pipe) in one pass
	let result = text.replaceAll(
		/\\?\|/g,
		match => (match.length === 1 ? String.raw`\|` : String.raw`\\\|`),
	);

	// Replace newlines with <br>
	result = result
		.replaceAll('\r\n', '<br>')
		.replaceAll('\r', '<br>')
		.replaceAll('\n', '<br>');

	// Preserve leading/trailing whitespace with &nbsp; since GFM trims it
	if (result.startsWith(' ') || result.startsWith('\t')) {
		result = `&nbsp;${result.slice(1)}`;
	}
	if (result.endsWith(' ') || result.endsWith('\t')) {
		result = `${result.slice(0, -1)}&nbsp;`;
	}

	return result;
};

const percentEncode = (character: string) => `%${character.codePointAt(0)!.toString(16).toUpperCase().padStart(2, '0')}`;

export const escapeUrl = (url: string) => url
	.replaceAll('\\', '%5C')
	.replaceAll('(', '%28')
	.replaceAll(')', '%29')
	.replaceAll(' ', '%20')
	// eslint-disable-next-line no-control-regex
	.replaceAll(/[\u0000-\u001F]/g, percentEncode);
