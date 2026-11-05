type ListItem = string | ListItem[];

const indentContinuation = (text: string, continuationIndent: string) => {
	if (!text.includes('\n') && !text.includes('\r')) {
		return text;
	}
	const normalized = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	return normalized.replaceAll('\n', `\n${continuationIndent}`);
};

const formatList = (
	items: ListItem[],
	indent: number,
	ordered: boolean,
): string => {
	const lines: string[] = [];
	let itemIndex = 0;
	let emptyItem = false;

	const firstLeaf = (currentItems: ListItem[]): string | undefined => {
		for (const item of currentItems) {
			const leaf = Array.isArray(item) ? firstLeaf(item) : item;
			if (leaf !== undefined) {
				return leaf;
			}
		}
		return undefined;
	};

	const appendItems = (currentItems: ListItem[]) => {
		for (const item of currentItems) {
			if (Array.isArray(item)) {
				if (itemIndex === 0) {
					appendItems(item);
				} else {
					const markerWidth = ordered ? String(itemIndex).length + 2 : 2;
					const nested = formatList(item, indent + markerWidth, ordered);
					if (nested) {
						// An empty list item cannot interrupt a paragraph in Markdown.
						const firstLine = firstLeaf(item)!.split(/\r\n|\r|\n/, 1)[0];
						if (!emptyItem && !firstLine.trim()) {
							lines.push('');
						}
						lines.push(nested);
					}
				}
			} else {
				const prefix = ordered ? `${itemIndex + 1}. ` : '- ';
				const spaces = ' '.repeat(indent);
				const continuationIndent = ' '.repeat(indent + prefix.length);
				lines.push(`${spaces}${prefix}${indentContinuation(item, continuationIndent)}`);
				itemIndex += 1;
				emptyItem = !item.trim();
			}
		}
	};
	appendItems(items);

	return lines.join('\n');
};

export const ul = (items: ListItem[]) => formatList(items, 0, false);

export const ol = (items: ListItem[]) => formatList(items, 0, true);

// Task list continuation uses 2-space indent (matching "- " marker width)
// rather than the full 6-char "- [ ] " prefix, because 6 spaces after a
// blank line triggers an indented code block in some parsers.
const taskListIndent = '  ';

export const taskList = (items: [checked: boolean, label: string][]) => items
	.map(([checked, label]) => `- [${checked ? 'x' : ' '}] ${indentContinuation(label, taskListIndent)}`)
	.join('\n');
