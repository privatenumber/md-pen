export const escape = (text: string) => text
	.replaceAll(/[\\`*_~[\]<>&#\-+]/g, character => `\\${character}`)
	.replaceAll(/^(\d{1,9})([.)])[ \t]/gm, String.raw`$1\$2 `)
	.replaceAll(/^(=+)[ \t]*$/gm, match => `\\${match}`)
	.replaceAll(/^(?:\t[\t ]*|[\t ]{4,})/gm, '   ')
	.replaceAll(/(?:https?|ftp):/gi, '$&\u200B')
	.replaceAll('www.', 'www\u200B.')
	.replaceAll('@', '\u200B@');

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

const precedingBackslashes = (text: string, offset: number) => {
	let count = 0;
	while (offset > count && text[offset - count - 1] === '\\') {
		count += 1;
	}
	return count;
};

export const escapeTableCell = (text: string) => {
	// An odd backslash run already escapes the pipe in Markdown.
	let result = text.replaceAll(
		'|',
		(_match, offset: number) => (precedingBackslashes(text, offset) % 2 === 0 ? String.raw`\|` : '|'),
	);

	// A backslash that makes a hard line break must not escape the inserted tag.
	result = result.replaceAll(/\\?(?:\r\n|\r|\n)/g, (match, offset: number, source: string) => {
		const hasBackslash = match.startsWith('\\');
		const count = precedingBackslashes(source, offset) + Number(hasBackslash);
		return `${hasBackslash && count % 2 === 0 ? '\\' : ''}<br>`;
	});

	// Preserve leading/trailing whitespace with &nbsp; since GFM trims it
	if (result.startsWith(' ') || result.startsWith('\t')) {
		result = `&nbsp;${result.slice(1)}`;
	}
	if (result.endsWith(' ') || result.endsWith('\t')) {
		const backslashes = precedingBackslashes(result, result.length - 1);
		result = `${result.slice(0, -1)}${backslashes % 2 === 1 ? '\\' : ''}&nbsp;`;
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
