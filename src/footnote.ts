const normalizeId = (id: string) => id.trim()
	.replaceAll(/\s+/g, '-')
	.toLowerCase()
	.replaceAll(/[^a-z\d_.\-\u0080-\uFFFF]/g, character => `%${character.codePointAt(0)!.toString(16).padStart(2, '0')}`);

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
