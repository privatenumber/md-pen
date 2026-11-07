import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import * as m from '../../src/index.ts';
import { render } from '../utils/render.ts';

type Inline =
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
		child: Inline;
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
	const inline = (depth: number, inLink = false): Inline => {
		// Footnote references contain links, which cannot nest inside link text.
		const options: Inline['kind'][] = ['word', 'literal', 'code', 'kbd', 'math', 'image', ...(inLink ? [] : ['ref' as const])];
		if (depth) {
			options.push('bold', 'italic', 'strike', ...(inLink ? [] : ['link' as const]));
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
					child: inline(depth - 1, inLink || kind === 'link'),
				};
			}
		}
	};
	const list = (depth: number, kind: ListKind): List => ({
		kind,
		items: Array.from({ length: 1 + random(3) }, () => ({
			checked: Boolean(random(2)),
			child: inline(Math.max(0, depth - 1)),
			...(kind !== 'task' && depth > 1 && random(4) === 0 ? { nested: list(depth - 1, kind) } : {}),
		})),
	});
	const block = (depth: number): Block => {
		const types: Block['kind'][] = ['heading', 'table', 'ul', 'ol', 'task', 'codeBlock', 'mathBlock', 'hr', 'footnote'];
		if (depth) {
			types.push('quote', 'alert', 'details');
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
					child: inline(depth),
				};
			}
			case 'table': {
				return {
					kind,
					cells: Array.from({ length: 2 + random(2) }, () => inline(depth)),
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
					child: random(2) ? block(depth - 1) : inline(depth - 1),
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

const expected = (tree: Tree): Structure[] => {
	switch (tree.kind) {
		case 'word': case 'literal': {
			return [cleanText(tree.text)];
		}
		case 'code': case 'kbd': case 'math': {
			return [element(tree.kind, [cleanText(tree.text)])];
		}
		case 'image': {
			return [element('img', [], {
				src: tree.url,
				alt: tree.text,
			})];
		}
		case 'ref': {
			return [element('ref', [])];
		}
		// Unreferenced definitions are not rendered; the footnote section is excluded below.
		case 'footnote': {
			return [];
		}
		case 'bold': {
			return [element('strong', expected(tree.child))];
		}
		case 'italic': {
			return [element('em', expected(tree.child))];
		}
		case 'strike': {
			return [element('del', expected(tree.child))];
		}
		case 'link': {
			return [element('a', expected(tree.child), { href: '/target' })];
		}
		case 'heading': {
			return [element(`h${tree.level}`, expected(tree.child))];
		}
		case 'quote': {
			return [element('blockquote', expected(tree.child))];
		}
		case 'alert': {
			return [element('alert', expected(tree.child))];
		}
		case 'details': {
			return [element('details', [element('summary', ['Summary']), ...expected(tree.child)])];
		}
		case 'codeBlock': {
			return [element('pre', [element('code', [cleanText(tree.text)])])];
		}
		case 'mathBlock': {
			return [element('math', [cleanText(tree.text)])];
		}
		case 'hr': {
			return [element('hr', [])];
		}
		case 'table': {
			return [element('table', [
				element('thead', [element('tr', [element('th', expected(tree.cells[0]))])]),
				element('tbody', tree.cells.slice(1).map(cell => element('tr', [element('td', expected(cell))]))),
			])];
		}
		case 'task': case 'ul': case 'ol': {
			return [element(tree.kind === 'task' ? 'ul' : tree.kind, tree.items.map(item => (
				element('li', [...expected(item.child), ...(item.nested ? expected(item.nested) : [])])
			)))];
		}
		default: {
			throw new Error('Unknown composition node');
		}
	}
};

// parse5 decodes HTML entities before the tree reaches this normalizer.
const normalize = (entry: HtmlNode): Structure[] => {
	if ('value' in entry) {
		return cleanText(entry.value) ? [cleanText(entry.value)] : [];
	}
	if (!('childNodes' in entry)) {
		return [];
	}
	const children = () => entry.childNodes.flatMap(normalize);
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
		return [element('ref', [])];
	}
	// Checkbox state is outside this structural oracle.
	if (entry.tagName === 'input') {
		return [];
	}
	// Treat table line breaks as normalized whitespace, like literal line endings.
	if (entry.tagName === 'br') {
		return [' '];
	}
	if (entry.tagName === 'div' && attributes.class?.includes('markdown-alert')) {
		// The renderer adds an alert title that is not part of the supplied content.
		return [element('alert', entry.childNodes.filter(child => !('attrs' in child) || !child.attrs.some(attribute => attribute.name === 'class' && attribute.value.includes('markdown-alert-title'))).flatMap(normalize))];
	}
	if (entry.tagName === 'span' && attributes['data-math-style']) {
		return [element('math', children())];
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

const compact = (entries: Structure[]): Structure[] => {
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
			children: compact(entry.children),
		};
		// Adjacent lists of the same kind merge in Markdown, even across a blank line.
		if (typeof previous === 'object' && ['ul', 'ol'].includes(next.tag) && previous.tag === next.tag) {
			previous.children.push(...next.children);
		} else {
			result.push(next);
		}
	}
	return result.map(item => (typeof item === 'string' ? cleanText(item) : item)).filter(item => item !== '');
};

describe('seeded composition', () => {
	for (const [seedIndex, seed] of seeds.entries()) {
		test(`seed ${seed}`, () => {
			const nextDocument = generator(seed);
			const count = Math.floor(documentCount / seeds.length)
				+ Number(seedIndex < documentCount % seeds.length);
			for (let index = 0; index < count; index += 1) {
				const tree = nextDocument();
				const references = new Set<string>();
				const body = tree.map(block => markdown(block, references)).join('\n\n');
				const source = `${body}${[...references].map(id => `\n\n${m.footnote(id, 'footnote')}`).join('')}`;
				const wanted = compact(tree.flatMap(expected));
				const actual = compact(normalize(parseFragment(render(source))));
				assert.deepStrictEqual(actual, wanted, `seed: ${seed}\ndocument: ${index}\ntree: ${JSON.stringify(tree)}\nmarkdown:\n${source}\nexpected: ${JSON.stringify(wanted)}\nactual: ${JSON.stringify(actual)}`);
			}
		}, 30_000);
	}
});
