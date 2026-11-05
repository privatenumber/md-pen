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

const characterReference = /&(?=(?:#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});)/gi;

export const hasCharacterReference = (text: string) => text.search(characterReference) !== -1;

export const encodeUrlWhitespace = (url: string) => url
	// eslint-disable-next-line no-control-regex
	.replaceAll(/[\u0000-\u0020]/g, percentEncode);

export const escapeUrl = (url: string) => encodeUrlWhitespace(url
	.replaceAll('\\', '%5C')
	.replaceAll('(', String.raw`\(`)
	.replaceAll(')', String.raw`\)`)
	.replaceAll('<', String.raw`\<`)
	.replaceAll('>', String.raw`\>`)
	.replaceAll(characterReference, '&amp;'));
