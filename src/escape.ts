import { normalizeLineEndings } from './utils/normalize-line-endings.ts';

export const escape = (text: string) => normalizeLineEndings(text)
	// Backslash escapes cannot prevent indented code blocks.
	.replaceAll(/^[ \t]+/gm, indentation => (indentation.includes('\t') || indentation.length >= 4 ? '   ' : indentation))
	// GitHub substitutes shortcodes after processing backslash escapes.
	.replaceAll(/(^|[ \t\n(]):[\w:+-]+/g, match => match.replaceAll(/:([\w+-]+)(?=:)/g, (shortcode, name: string) => (
		/^\d+$/.test(name) && name !== '100' && name !== '1234' ? shortcode : `:\u200B${name}`
	)))
	// GitHub resolves mentions and issue references after processing escapes.
	.replaceAll(/\B#(?=\d)|(?<=[\w.-]\/[\w.-]{1,100})#(?=\d)/g, '#\u200B')
	.replaceAll(/\bGH-(?=\d)/gi, '$&\u200B')
	.replaceAll(/@(?:[\w-]+(?:\.[\w-]+)+)?/g, (match, offset: number, input: string) => (
		!/\w/.test(input[offset - 1] ?? '') || match.length > 1 ? `@\u200B${match.slice(1)}` : match
	))
	// GitHub and comrak can interpret escaped dollar signs as math.
	.replaceAll('$', '\u200B$')
	// Trailing whitespace can create a hard line break, including after composition.
	.replaceAll(/(?<![ \t])[ \t]+(?=\n|$)/g, ' ')
	.replaceAll(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g, String.raw`\$&`);

const htmlEntityMap: Record<string, string> = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;',
	'"': '&quot;',
	'\r': '&#13;',
	'\n': '&#10;',
};

export const escapeHtml = (text: string) => text.replaceAll(
	/[<>&"\r\n]/g,
	character => htmlEntityMap[character],
);

export const htmlAttributes = (
	attributes?: Record<string, string | number>,
) => {
	if (!attributes) {
		return '';
	}
	let result = '';
	for (const [key, value] of Object.entries(attributes)) {
		if (/^[a-z_:][\w:.-]*$/i.test(key)) {
			result += ` ${key}="${escapeHtml(String(value))}"`;
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
	// An odd backslash run already escapes the table delimiter.
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

const characterReference = /&(?=(?:#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});)/gi;

export const hasCharacterReference = (text: string) => text.search(characterReference) !== -1;

export const encodeUrlWhitespace = (url: string) => url
	// eslint-disable-next-line no-control-regex
	.replaceAll(/[\u0000-\u0020\u007F]/g, percentEncode);

export const escapeUrl = (url: string) => encodeUrlWhitespace(url
	.replaceAll('\\', '%5C')
	.replaceAll(/[()<>]/g, character => `\\${character}`)
	.replaceAll(characterReference, '&amp;'));
