type ListItem = string | ListItem[];

const htmlBlockTags = /^(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[ \t>]|\/>|$)/i;
const completeHtmlTag = /^<(?:\/[a-z][a-z\d-]*[ \t]*>|[a-z][a-z\d-]*(?:[ \t]+[a-z_:][\w.:-]*(?:[ \t]*=[ \t]*(?:[^ \t"'=<>`]+|'[^']*'|"[^"]*"))?)*[ \t]*\/?>)[ \t]*$/i;

const htmlBlockStart = (content: string, paragraph: boolean): RegExp | 'blank' | undefined => {
	if (/^<(?:pre|script|style|textarea)(?=[ \t>]|$)/i.test(content)) {
		return /<\/(?:pre|script|style|textarea)>/i;
	}
	if (content.startsWith('<!--')) {
		return /-->/;
	}
	if (content.startsWith('<?')) {
		return /\?>/;
	}
	if (/^<![a-z]/i.test(content)) {
		return />/;
	}
	if (content.startsWith('<![CDATA[')) {
		return /\]\]>/;
	}
	if (content.startsWith('<') && htmlBlockTags.test(content.replace(/^<\/?/, ''))) {
		return 'blank';
	}
	if (!paragraph && completeHtmlTag.test(content)) {
		return 'blank';
	}
	return undefined;
};

const endsInHtmlBlock = (text: string) => {
	let end: RegExp | undefined;
	let blankEndsBlock = false;
	let paragraph = false;
	let fence = '';

	for (const line of text.split(/\r\n|\r|\n/)) {
		if (blankEndsBlock) {
			if (/^[ \t]*$/.test(line)) {
				blankEndsBlock = false;
				paragraph = false;
			}
			continue;
		}
		if (end) {
			if (end.test(line)) {
				end = undefined;
			}
			continue;
		}
		const content = line.replace(/^ {0,3}/, '');
		if (fence) {
			const closing = content.match(/^(`+|~+)[ \t]*$/)?.[1];
			if (closing && closing[0] === fence[0] && closing.length >= fence.length) {
				fence = '';
			}
			continue;
		}
		const opening = content.match(/^(`+|~+)/)?.[1];
		if (opening && opening.length >= 3 && (opening[0] !== '`' || !content.slice(opening.length).includes('`'))) {
			fence = opening;
			paragraph = false;
			continue;
		}
		if (/^[ \t]*$/.test(line)) {
			paragraph = false;
			continue;
		}
		if (!paragraph && /^(?: {4}|\t)/.test(line)) {
			continue;
		}
		const block = htmlBlockStart(content, paragraph);
		if (!block) {
			paragraph = !/^ {0,3}(?:#{1,6}(?:[ \t]|$)|>|(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)|(?:=+|-+)[ \t]*$)/.test(line);
			continue;
		}
		if (block === 'blank') {
			blankEndsBlock = true;
		} else {
			end = block;
		}
		paragraph = false;
		if (end?.test(line)) {
			end = undefined;
		}
	}
	return blankEndsBlock;
};

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
						// HTML blocks need a blank line to end; empty items cannot interrupt paragraphs.
						if (!hasChildren && (endsInHtmlBlock(parentItem) || (!emptyItem && /^[ \t]*$/.test(firstLine)))) {
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
