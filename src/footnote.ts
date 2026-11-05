const normalizeId = (id: string) => id.trim()
	.replaceAll(/\s+/g, '-')
	.replaceAll('\\', '')
	.replaceAll(/&(?=#(?:x[\da-f]{1,8}|\d{1,8});|[a-z][a-z\d]{1,31};)/gi, '-');

const isValidId = (id: string) => id.length > 0
	&& !id.includes(']')
	&& !id.includes('[')
	&& [...id].length <= 998;

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
