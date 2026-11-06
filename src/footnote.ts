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
	const encoder = new TextEncoder();
	let result = '';
	for (const character of collapsed) {
		const code = character.codePointAt(0)!;
		if (code > 0x9F || (code < 0x80 && allowedAscii.test(character))) {
			result += character;
		} else {
			// Encoding every percent sign keeps encoded sequences distinct from literal input.
			result += [...encoder.encode(character)].map(byte => `%${byte.toString(16).padStart(2, '0')}`).join('');
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
	const content = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	if (!content.includes('\n')) {
		return `[^${normalized}]: ${content}`;
	}
	const indented = content.replaceAll('\n', '\n    ');
	return `[^${normalized}]: ${indented}`;
};
