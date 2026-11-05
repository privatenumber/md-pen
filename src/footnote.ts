const normalizeId = (id: string) => {
	if (!id.isWellFormed()) {
		return '';
	}
	return id.trim()
		.replaceAll(/\s+/g, '-')
		.replaceAll(/[%\\`<>$[\]:^|{}\p{Cc}]|&(?=#(?:[xX][\da-fA-F]{1,8}|\d{1,8});|[a-zA-Z][a-zA-Z\d]{1,31};)/gu, character => (
			[...new TextEncoder().encode(character)].map(byte => `%${byte.toString(16).padStart(2, '0')}`).join('')
		));
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
