export type ListItem = string | ListItem[];

export type ReadonlyListItem = string | readonly ReadonlyListItem[];

const isNested = (item: ReadonlyListItem): item is readonly ReadonlyListItem[] => (
	Array.isArray(item)
);

const indentContinuation = (text: string, continuationIndent: string) => {
	if (!text.includes('\n') && !text.includes('\r')) {
		return text;
	}
	const normalized = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	return normalized.replaceAll('\n', `\n${continuationIndent}`);
};

const formatList = (
	items: readonly ReadonlyListItem[],
	indent: number,
	ordered: boolean,
): string => {
	const lines: string[] = [];
	let itemIndex = 0;

	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		if (isNested(item)) {
			if (itemIndex === 0) {
				lines.push(formatList(item, indent, ordered));
			} else {
				const markerWidth = ordered ? String(itemIndex).length + 2 : 2;
				lines.push(formatList(item, indent + markerWidth, ordered));
			}
		} else {
			const prefix = ordered ? `${itemIndex + 1}. ` : '- ';
			const spaces = ' '.repeat(indent);
			const continuationIndent = ' '.repeat(indent + prefix.length);
			lines.push(`${spaces}${prefix}${indentContinuation(item, continuationIndent)}`);
			itemIndex += 1;
		}
	}

	return lines.join('\n');
};

export const ul = (items: readonly ReadonlyListItem[]) => formatList(items, 0, false);

export const ol = (items: readonly ReadonlyListItem[]) => formatList(items, 0, true);

// Task list continuation uses 2-space indent (matching "- " marker width)
// rather than the full 6-char "- [ ] " prefix, because 6 spaces after a
// blank line triggers an indented code block in some parsers.
const taskListIndent = '  ';

export const taskList = (items: readonly (readonly [checked: boolean, label: string])[]) => items
	.map(([checked, label]) => `- [${checked ? 'x' : ' '}] ${indentContinuation(label, taskListIndent)}`)
	.join('\n');
