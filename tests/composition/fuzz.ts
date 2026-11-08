import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import * as m from '../../src/index.ts';
import { render } from '../utils/render.ts';

type Inline =
	| {
		kind: 'sequence';
		children: Inline[];
	}
	| {
		kind: 'word' | 'literal' | 'code' | 'kbd' | 'math';
		text: string;
	}
	| {
		kind: 'image';
		text: string;
		url: string;
	}
	| {
		kind: 'ref';
		id: string;
	}
	| {
		kind: 'bold' | 'italic' | 'strike' | 'link';
		child: Inline;
	};
type ListKind = 'ul' | 'ol' | 'task';
type List = {
	kind: ListKind;
	items: {
		checked: boolean;
		child: Inline | Block;
		nested?: List;
	}[];
};
type Block =
	| List
	| {
		kind: 'heading';
		level: 1 | 2 | 3 | 4 | 5 | 6;
		child: Inline;
	}
	| {
		kind: 'paragraph';
		child: Inline;
	}
	| {
		kind: 'table';
		cells: Inline[];
	}
	| {
		kind: 'codeBlock' | 'mathBlock';
		text: string;
	}
	| { kind: 'hr' }
	| {
		kind: 'footnote';
		id: string;
		text: string;
	}
	| {
		kind: 'quote' | 'alert' | 'details';
		child: Block | Inline;
	};
type Tree = Inline | Block;
type Element = {
	tag: string;
	attributes?: Record<string, string>;
	children: Structure[];
};
type Structure = string | Element;
type HtmlNode = DefaultTreeAdapterMap['node'];

const seeds = [560_344_811, 800_992_447, 123_456_789, 3_908_954_110];
const documentCount = Number(process.env.MD_PEN_FUZZ_CASES ?? 1000);
if (!Number.isSafeInteger(documentCount) || documentCount < 0) {
	throw new Error('MD_PEN_FUZZ_CASES must be a non-negative safe integer');
}
const words = [
	'alpha',
	'beta',
	'a*b',
	'x_y',
	'a~b',
	'[test]',
	'<tag>',
	'a&b',
	'a|b',
	'`tick`',
	'x:y',
	'a#12',
	'$x$',
	'@someone',
	':smile:',
	'www.example.com',
	'https://example.com/x',
	'a@example.com',
	'a\nb',
	'a\r\nb',
	'a  b',
	'one\ntwo',
];

const generator = (seed: number) => {
	let state = seed;
	let footnoteId = 0;
	const random = (maximum: number) => {
		/* eslint-disable no-bitwise -- Xorshift is defined by bitwise operations. */
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) % maximum;
		/* eslint-enable no-bitwise */
	};
	const nextFootnoteId = () => {
		const id = `f${footnoteId}`;
		footnoteId += 1;
		return id;
	};
	const choose = <T>(values: readonly T[]): T => values[random(values.length)];
	const inline = (depth: number, inLink = false, ancestors: Inline['kind'][] = []): Inline => {
		// Footnote references contain links, which cannot nest inside link text.
		const options: Exclude<Inline['kind'], 'sequence'>[] = ['word', 'literal', 'code', 'kbd', 'math', 'image', ...(inLink ? [] : ['ref' as const])];
		if (depth) {
			options.push(...(['bold', 'italic', 'strike'] as const).filter(kind => !ancestors.includes(kind)));
			if (!inLink) {
				options.push('link');
			}
		}
		const kind = choose(options);
		switch (kind) {
			case 'word': {
				return {
					kind,
					text: choose(['alpha', 'beta', 'gamma']),
				};
			}
			case 'literal': case 'code': {
				return {
					kind,
					text: choose(words),
				};
			}
			case 'kbd': {
				return {
					kind,
					text: choose(['alpha', 'a&b', '<tag>', 'x_y']),
				};
			}
			// Comrak and GitHub disagree on backtick-delimited math.
			case 'math': {
				return {
					kind,
					text: choose(['x+1', 'E=2', 'a-b']),
				};
			}
			case 'image': {
				return {
					kind,
					text: choose(['cat', 'dog']),
					url: '/cat.png',
				};
			}
			case 'ref': {
				return {
					kind,
					id: nextFootnoteId(),
				};
			}
			default: {
				return {
					kind,
					child: kind === 'link' && random(2) === 0
						? sequence(depth - 1, true, [...ancestors, kind])
						: inline(depth - 1, inLink || kind === 'link', [...ancestors, kind]),
				};
			}
		}
	};
	const sequence = (depth: number, inLink = false, ancestors: Inline['kind'][] = []): Inline => {
		if (depth > 0 && !ancestors.includes('bold') && !ancestors.includes('italic') && random(4) === 0) {
			const text = (value: string): Inline => ({
				kind: 'literal',
				text: value,
			});
			return {
				kind: 'sequence',
				children: random(2) === 0
					? [{
						kind: 'bold',
						child: text('x_'),
					}, {
						kind: 'italic',
						child: text('a'),
					}]
					: [{
						kind: 'italic',
						child: {
							kind: 'word',
							text: 'a*b',
						},
					}, {
						kind: 'bold',
						child: {
							kind: 'word',
							text: 'a*b',
						},
					}],
			};
		}
		const children: Inline[] = [];
		const count = 2 + random(3);
		for (let index = 0; index < count; index += 1) {
			// A separator prevents delimiter collisions and intraword bold at sibling boundaries.
			if (index > 0) {
				children.push({
					kind: 'word',
					text: ' ',
				});
			}
			children.push(inline(depth, inLink, ancestors));
		}
		return {
			kind: 'sequence',
			children,
		};
	};
	const list = (depth: number, kind: ListKind): List => ({
		kind,
		items: Array.from({ length: 1 + random(3) }, () => {
			const checked = Boolean(random(2));
			if (kind !== 'task' && random(4) === 0) {
				const blockKind = choose(['quote', 'codeBlock'] as const);
				const child: Block = blockKind === 'codeBlock'
					? {
						kind: blockKind,
						text: 'x\ny',
					}
					: {
						kind: blockKind,
						child: {
							kind: 'word',
							text: 'alpha',
						},
					};
				return {
					checked,
					child,
				};
			}
			return {
				checked,
				child: sequence(Math.max(0, depth - 1)),
				...(kind !== 'task' && depth > 1 && random(4) === 0 ? { nested: list(depth - 1, kind) } : {}),
			};
		}),
	});
	const block = (depth: number, inContainer = false, insideQuote = false): Block => {
		const types: Block['kind'][] = ['paragraph', 'heading', 'table', 'ul', 'ol', 'task', 'codeBlock', 'mathBlock', 'hr', 'footnote'];
		if (depth) {
			types.push('quote');
			// README's details() limit excludes details nested through quotes, alerts, or list items.
			if (!insideQuote) {
				types.push('details');
			}
			if (!inContainer) {
				types.push('alert');
			}
		}
		const kind = choose(types);
		switch (kind) {
			case 'ul': case 'ol': case 'task': {
				return list(depth, kind);
			}
			case 'heading': {
				return {
					kind,
					level: choose([1, 2, 3, 4, 5, 6] as const),
					child: sequence(depth),
				};
			}
			case 'paragraph': {
				return {
					kind,
					child: sequence(depth),
				};
			}
			case 'table': {
				return {
					kind,
					cells: Array.from({ length: 2 + random(2) }, () => sequence(depth)),
				};
			}
			case 'codeBlock': {
				return {
					kind,
					text: choose(['alpha', 'a*b', 'x\ny', '<tag>']),
				};
			}
			case 'mathBlock': {
				return {
					kind,
					text: 'x+1',
				};
			}
			case 'hr': {
				return { kind };
			}
			case 'footnote': {
				return {
					kind,
					id: nextFootnoteId(),
					text: 'footnote',
				};
			}
			default: {
				return {
					kind,
					child: random(2)
						? block(depth - 1, true, insideQuote || kind === 'quote' || kind === 'alert')
						: inline(depth - 1),
				};
			}
		}
	};
	return () => {
		footnoteId = 0;
		return Array.from({ length: 1 + random(3) }, () => block(1 + random(4)));
	};
};

const listItems = (tree: List, references: Set<string>): m.ListItem[] => (
	tree.items.flatMap(item => [
		markdown(item.child, references),
		...(item.nested ? [listItems(item.nested, references)] : []),
	])
);

const markdown = (tree: Tree, references: Set<string>): string => {
	switch (tree.kind) {
		case 'sequence': {
			return tree.children.map(child => markdown(child, references)).join('');
		}
		case 'word': {
			return tree.text;
		}
		case 'literal': {
			return m.escape(tree.text);
		}
		case 'code': {
			return m.code(tree.text);
		}
		case 'kbd': {
			return m.kbd(m.escape(tree.text));
		}
		case 'math': {
			return m.math(tree.text);
		}
		case 'image': {
			return m.image(tree.url, tree.text);
		}
		case 'ref': {
			references.add(tree.id);
			return m.footnoteRef(tree.id);
		}
		case 'footnote': {
			return m.footnote(tree.id, tree.text);
		}
		case 'bold': {
			return m.bold(markdown(tree.child, references));
		}
		case 'italic': {
			return m.italic(markdown(tree.child, references));
		}
		case 'strike': {
			return m.strikethrough(markdown(tree.child, references));
		}
		case 'link': {
			return m.link('/target', markdown(tree.child, references));
		}
		case 'heading': {
			return m.heading(markdown(tree.child, references), tree.level);
		}
		case 'paragraph': {
			return markdown(tree.child, references);
		}
		case 'quote': {
			return m.blockquote(markdown(tree.child, references));
		}
		case 'alert': {
			return m.alert('note', markdown(tree.child, references));
		}
		case 'details': {
			return m.details('Summary', markdown(tree.child, references));
		}
		case 'codeBlock': {
			return m.codeBlock(tree.text, 'txt');
		}
		case 'mathBlock': {
			return m.mathBlock(tree.text);
		}
		case 'hr': {
			return m.hr();
		}
		case 'table': {
			return m.table(tree.cells.map(cell => [markdown(cell, references)]));
		}
		case 'task': {
			return m.taskList(tree.items.map(item => [item.checked, markdown(item.child, references)]));
		}
		case 'ul': case 'ol': {
			return m[tree.kind](listItems(tree, references));
		}
		default: {
			throw new Error('Unknown composition node');
		}
	}
};

// Whitespace layout and invisible GitHub guards do not change the visible text.
const cleanText = (value: string) => value.replaceAll('\u200B', '').replaceAll(/\s+/gu, ' ').trim();
const element = (
	tag: string,
	children: Structure[],
	attributes?: Record<string, string>,
): Element => (
	attributes
		? {
			tag,
			attributes,
			children,
		}
		: {
			tag,
			children,
		}
);

const expected = (tree: Tree, inTable = false, joinedList = false): Structure[] => {
	switch (tree.kind) {
		case 'sequence': {
			return tree.children.flatMap(child => expected(child, inTable));
		}
		case 'word': {
			return [tree.text === ' ' ? ' ' : cleanText(tree.text)];
		}
		case 'literal': {
			if (inTable && /[\r\n]/u.test(tree.text)) {
				return tree.text.split(/\r\n|\r|\n/u).flatMap((part, index) => (
					index === 0 ? [cleanText(part)] : [element('br', []), cleanText(part)]
				));
			}
			return [cleanText(tree.text)];
		}
		case 'code': case 'kbd': {
			return [element(tree.kind, [cleanText(tree.text)])];
		}
		case 'math': {
			return [element('math', [cleanText(tree.text)], { style: 'inline' })];
		}
		case 'image': {
			return [element('img', [], {
				src: tree.url,
				alt: tree.text,
			})];
		}
		case 'ref': {
			return [element('ref', [], { href: `#fn-${tree.id}` })];
		}
		// Unreferenced definitions are not rendered; the footnote section is excluded below.
		case 'footnote': {
			return [];
		}
		case 'bold': {
			return [element('strong', expected(tree.child, inTable))];
		}
		case 'italic': {
			return [element('em', expected(tree.child, inTable))];
		}
		case 'strike': {
			return [element('del', expected(tree.child, inTable))];
		}
		case 'link': {
			// Link labels normalize line endings before the table sees them.
			return [element('a', expected(tree.child), { href: '/target' })];
		}
		case 'heading': {
			return [element(`h${tree.level}`, expected(tree.child))];
		}
		case 'paragraph': {
			return expected(tree.child);
		}
		case 'quote': {
			return [element('blockquote', expected(tree.child))];
		}
		case 'alert': {
			return [element('alert', expected(tree.child), { type: 'note' })];
		}
		case 'details': {
			return [element('details', [element('summary', ['Summary']), ...expected(tree.child)])];
		}
		case 'codeBlock': {
			return [element('pre', [element('code', [`${tree.text}\n`], { class: 'language-txt' })])];
		}
		case 'mathBlock': {
			return [element('math', [cleanText(tree.text)], { style: 'display' })];
		}
		case 'hr': {
			return [element('hr', [])];
		}
		case 'table': {
			return [element('table', [
				element('thead', [element('tr', [element('th', expected(tree.cells[0], true))])]),
				element('tbody', tree.cells.slice(1).map(cell => element('tr', [element('td', expected(cell, true))]))),
			])];
		}
		case 'task': case 'ul': case 'ol': {
			const loose = joinedList || tree.items.some(item => item.child.kind === 'details');
			return [element(tree.kind === 'task' ? 'ul' : tree.kind, tree.items.map(item => (
				element('li', [
					...(tree.kind === 'task' ? [element('checkbox', [])] : []),
					...expected(item.child),
					...(item.nested ? expected(item.nested) : []),
				], loose && item.child.kind === 'sequence' ? { paragraph: 'true' } : undefined)
			)), tree.kind === 'ol' ? { start: '1' } : undefined)];
		}
		default: {
			throw new Error('Unknown composition node');
		}
	}
};

// parse5 decodes HTML entities before the tree reaches this normalizer.
const normalize = (entry: HtmlNode, inPre = false): Structure[] => {
	if ('value' in entry) {
		if (inPre) {
			return [entry.value];
		}
		return cleanText(entry.value) ? [cleanText(entry.value)] : [];
	}
	if (!('childNodes' in entry)) {
		return [];
	}
	const children = () => entry.childNodes.flatMap(child => normalize(child, inPre || ('tagName' in entry && entry.tagName === 'pre')));
	// Paragraph wrappers vary by context, but their inline content remains meaningful.
	if (!('tagName' in entry) || entry.tagName === 'p') {
		return children();
	}
	const attributes = Object.fromEntries(
		entry.attrs.map(attribute => [attribute.name, attribute.value]),
	);
	// The reference marker is checked, but the generated definition section is not.
	if (entry.tagName === 'section' && attributes.class?.includes('footnotes')) {
		return [];
	}
	if (entry.tagName === 'sup' && attributes.class?.includes('footnote-ref')) {
		const link = entry.childNodes.find(child => 'tagName' in child && child.tagName === 'a');
		const href = link && 'attrs' in link ? link.attrs.find(attribute => attribute.name === 'href')?.value : undefined;
		return [element('ref', [], { href: href ?? '' })];
	}
	// Compare checkbox presence, not its checked state.
	if (entry.tagName === 'input' && attributes.type === 'checkbox') {
		return [element('checkbox', [])];
	}
	if (entry.tagName === 'li') {
		const hasParagraph = entry.childNodes.some(child => 'tagName' in child && child.tagName === 'p');
		return [element('li', children(), hasParagraph ? { paragraph: 'true' } : undefined)];
	}
	// Hard line breaks are structural, including those introduced in table cells.
	if (entry.tagName === 'br') {
		return [element('br', [])];
	}
	if (entry.tagName === 'div' && attributes.class?.includes('markdown-alert')) {
		// The renderer adds an alert title that is not part of the supplied content.
		return [element('alert', entry.childNodes.filter(child => !('attrs' in child) || !child.attrs.some(attribute => attribute.name === 'class' && attribute.value.includes('markdown-alert-title'))).flatMap(child => normalize(child)), { type: attributes.class.match(/markdown-alert-(\w+)/u)?.[1] ?? '' })];
	}
	if (entry.tagName === 'span' && attributes['data-math-style']) {
		return [element('math', children(), { style: attributes['data-math-style'] })];
	}
	if (entry.tagName === 'ol') {
		return [element('ol', children(), { start: attributes.start ?? '1' })];
	}
	if (entry.tagName === 'code' && attributes.class) {
		return [element('code', children(), { class: attributes.class })];
	}
	if (entry.tagName === 'a') {
		return [element('a', children(), { href: attributes.href })];
	}
	if (entry.tagName === 'img') {
		return [element('img', [], {
			src: attributes.src,
			alt: attributes.alt,
		})];
	}
	// Ignore renderer-generated attributes other than link and image destinations.
	return [element(entry.tagName, children())];
};

const compact = (entries: Structure[], inPre = false): Structure[] => {
	const result: Structure[] = [];
	for (const entry of entries) {
		const previous = result.at(-1);
		if (typeof entry === 'string') {
			if (typeof previous === 'string') {
				result[result.length - 1] = previous + entry;
			} else {
				result.push(entry);
			}
			continue;
		}
		const next = {
			...entry,
			children: compact(entry.children, inPre || entry.tag === 'pre'),
		};
		result.push(next);
	}
	return result.map(item => (typeof item === 'string' && !inPre ? cleanText(item) : item)).filter(item => item !== '');
};

const expectedDocument = (tree: Block[]): Structure[] => {
	const result: Structure[] = [];
	let previousList: Element | undefined;
	const listTag = (block?: Block) => (block?.kind === 'ol'
		? 'ol'
		: (block?.kind === 'ul' || block?.kind === 'task' ? 'ul' : undefined));
	for (const [index, block] of tree.entries()) {
		const tag = listTag(block);
		const joinedList = Boolean(tag && (
			listTag(tree[index - 1]) === tag || listTag(tree[index + 1]) === tag
		));
		const nodes = expected(block, false, joinedList);
		const list = (block.kind === 'ul' || block.kind === 'ol' || block.kind === 'task')
			? nodes[0] as Element
			: undefined;
		// Markdown joins consecutive source lists, but not lists separated by an invisible definition.
		if (list && previousList?.tag === list.tag) {
			previousList.children.push(...list.children);
		} else {
			result.push(...nodes);
			previousList = list;
		}
	}
	return result;
};

const hasNestedAlert = (node: unknown, inContainer = false): boolean => {
	if (Array.isArray(node)) {
		return node.some(child => hasNestedAlert(child, inContainer));
	}
	if (!node || typeof node !== 'object') {
		return false;
	}
	const record = node as Record<string, unknown>;
	if (inContainer && record.kind === 'alert') {
		return true;
	}
	const nested = inContainer || ['quote', 'details', 'alert', 'ul', 'ol', 'task'].includes(String(record.kind));
	return Object.values(record).some(child => hasNestedAlert(child, nested));
};

describe('seeded composition', () => {
	for (const [seedIndex, seed] of seeds.entries()) {
		test(`seed ${seed}`, () => {
			const nextDocument = generator(seed);
			const count = Math.floor(documentCount / seeds.length)
				+ Number(seedIndex < documentCount % seeds.length);
			for (let index = 0; index < count; index += 1) {
				const tree = nextDocument();
				assert.equal(hasNestedAlert(tree), false, `seed: ${seed}\ndocument: ${index}\nnested alert in tree: ${JSON.stringify(tree)}`);
				const references = new Set<string>();
				const body = tree.map(block => markdown(block, references)).join('\n\n');
				const source = `${body}${[...references].map(id => `\n\n${m.footnote(id, 'footnote')}`).join('')}`;
				const wanted = compact(expectedDocument(tree));
				const actual = compact(normalize(parseFragment(render(source))));
				assert.deepStrictEqual(actual, wanted, `seed: ${seed}\ndocument: ${index}\ntree: ${JSON.stringify(tree)}\nmarkdown:\n${source}\nexpected: ${JSON.stringify(wanted)}\nactual: ${JSON.stringify(actual)}`);
			}
		}, 30_000);
	}
});
