import { normalizeLineEndings } from './utils/normalize-line-endings.ts';

// See the ASCII normalization table in tests/specs/footnote.ts.
const allowedAscii = /^[\w!"#'()*+,./;=?@~-]$/;

const normalizeId = (id: string) => {
	if (!id.isWellFormed()) {
		return '';
	}
	const collapsed = id.trim().replaceAll(/\s+/g, '-');
	// Encoding only lengthens the ID, so skip it for IDs already over the limit
	if (collapsed.length > 999) {
		return '';
	}
	let result = '';
	for (const character of collapsed) {
		const code = character.codePointAt(0)!;
		if (code > 0x9F || allowedAscii.test(character)) {
			result += character;
		} else {
			// Encoding every percent sign keeps encoded sequences distinct from literal input.
			result += encodeURIComponent(character).toLowerCase();
		}
	}
	return result;
};

const isValidId = (id: string) => id.length > 0
	&& id.length <= 999
	&& new TextEncoder().encode(id).length <= 1000;

export const footnoteRef = (id: string) => {
	const normalized = normalizeId(id);
	if (!isValidId(normalized)) {
		return '';
	}
	return `[^${normalized}]`;
};

export const footnote = (id: string, text: string) => {
	const normalized = normalizeId(id);
	if (!isValidId(normalized)) {
		return '';
	}
	const content = normalizeLineEndings(text);
	if (!content.includes('\n')) {
		return `[^${normalized}]: ${content}`;
	}
	const indented = content.replaceAll('\n', '\n    ');
	return `[^${normalized}]: ${indented}`;
};
