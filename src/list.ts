type ListItem = string | ListItem[];

const hasPossibleHtmlBlock = (text: string) => text.split(/\r\n|\r|\n/).some((line) => {
	const content = line.replace(/^[ \t]*/, '');
	return /^<[a-z/!?]/i.test(content)
		&& !/^<[a-z][a-z\d+.-]{1,31}:[^\s<>]*>/i.test(content)
		&& !/^<[\w.!#$%&'*+/=?^`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*>/i.test(content);
});

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
	let parentItem = '';
	let childIndent = indent;
	let hasChildren = false;

	const firstLeaf = (currentItems: ListItem[]): string | undefined => {
		for (const item of currentItems) {
			const leaf = Array.isArray(item) ? firstLeaf(item) : item;
			if (leaf !== undefined) {
				return leaf;
			}
		}
		return undefined;
	};

	const contentIndent = (item: string, markerEnd: number) => {
		let column = markerEnd + 1;
		let index = 0;
		while (item[index] === ' ' || item[index] === '\t') {
			column += item[index] === '\t' ? 4 - (column % 4) : 1;
			index += 1;
		}
		if (column - markerEnd > 4 || !item[index] || item[index] === '\r' || item[index] === '\n') {
			return markerEnd + 1;
		}
		return column;
	};

	const appendItems = (currentItems: ListItem[]) => {
		for (const item of currentItems) {
			if (Array.isArray(item)) {
				if (itemIndex === 0) {
					appendItems(item);
				} else {
					const nested = formatList(item, childIndent, ordered);
					if (nested) {
						const firstLine = firstLeaf(item)!.split(/\r\n|\r|\n/, 1)[0];
						// Blank-line-terminated HTML blocks and empty child items need a separator.
						if (!hasChildren && (hasPossibleHtmlBlock(parentItem) || (!emptyItem && /^[ \t]*$/.test(firstLine)))) {
							lines.push('');
						}
						lines.push(nested);
						hasChildren = true;
					}
				}
			} else {
				const prefix = ordered ? `${itemIndex + 1}. ` : '- ';
				const spaces = ' '.repeat(indent);
				childIndent = contentIndent(item, indent + prefix.length - 1);
				const continuationIndent = ' '.repeat(childIndent);
				lines.push(`${spaces}${prefix}${indentContinuation(item, continuationIndent)}`);
				itemIndex += 1;
				emptyItem = /^[ \t\r\n]*$/.test(item);
				parentItem = item;
				hasChildren = false;
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
