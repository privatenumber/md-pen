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

export const escapeTableCell = (text: string) => {
	// Preserve backslashes in ordinary text while escaping pipes for table structure.
	let result = text.replaceAll(
		'|',
		(_match, offset: number) => {
			let backslashes = 0;
			while (offset > backslashes && text[offset - backslashes - 1] === '\\') {
				backslashes += 1;
			}
			return backslashes % 2 === 0 ? String.raw`\|` : String.raw`\\|`;
		},
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
