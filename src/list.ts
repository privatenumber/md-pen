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
	let count = 0;
	let childIndent = indent;

	const append = (current: ListItem[]) => {
		for (const item of current) {
			if (Array.isArray(item)) {
				if (count === 0) {
					append(item);
				} else {
					const nested = formatList(item, childIndent, ordered);
					if (nested) {
						// An empty child item cannot interrupt a paragraph.
						if (/^ *(?:-|\d+\.) *(?:\n|$)/.test(nested)) {
							const marker = ordered ? `${count}. ` : '- ';
							const parentPrefix = `${' '.repeat(indent)}${marker}`;
							const previous = lines.at(-1)!;
							if (previous.startsWith(parentPrefix) && /[^ \t\r\n]/.test(previous.slice(parentPrefix.length))) {
								lines.push('');
							}
						}
						lines.push(nested);
					}
				}
			} else {
				const marker = ordered ? `${count + 1}. ` : '- ';
				childIndent = indent + marker.length;
				const text = item.replace(/^[ \t]+/, '');
				lines.push(`${' '.repeat(indent)}${marker}${indentContinuation(text, ' '.repeat(childIndent))}`);
				count += 1;
			}
		}
	};
	append(items);

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
