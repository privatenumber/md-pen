import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import * as m from '../../../src/index.ts';
import { render } from '../../utils/render.ts';
import {
	element, emphasis, type Tree, type Block, type Element, type Structure,
} from './tree.ts';

type HtmlNode = DefaultTreeAdapterMap['node'];

const cleanText = (value: string) => value.replaceAll(/[\t\n\f\r ]+/gu, ' ').replaceAll(/^ | $/gu, '');
const literalText = (text: string): string => {
	const collect = (node: HtmlNode): string => {
		if ('value' in node) {
			return node.value;
		}
		return 'childNodes' in node ? node.childNodes.map(collect).join('') : '';
	};
	return cleanText(collect(parseFragment(render(m.escape(text)))));
};
const inlineKinds = new Set(['sequence', 'word', 'literal', 'code', 'kbd', 'math', 'image', 'ref', 'bold', 'italic', 'strike', 'link']);
const blockContent = (child: Tree): Structure[] => {
	const content = expected(child);
	return inlineKinds.has(child.kind) ? [element('p', content)] : content;
};
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
					index === 0 ? [literalText(part)] : [element('br', []), literalText(part)]
				));
			}
			return [literalText(tree.text)];
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
		case 'bold': case 'italic': case 'strike': {
			return [element(emphasis[tree.kind].tag, expected(tree.child, inTable))];
		}
		case 'link': {
			// Link labels normalize line endings before the table sees them.
			return [element('a', expected(tree.child), { href: '/target' })];
		}
		case 'heading': {
			return [element(`h${tree.level}`, expected(tree.child))];
		}
		case 'paragraph': {
			return [element('p', expected(tree.child))];
		}
		case 'quote': {
			return [element('blockquote', blockContent(tree.child))];
		}
		case 'alert': {
			return [element('alert', blockContent(tree.child), { type: 'note' })];
		}
		case 'details': {
			return [element('details', [element('summary', ['Summary']), ...blockContent(tree.child)])];
		}
		case 'codeBlock': {
			return [element('pre', [element('code', [`${tree.text}\n`], { class: 'language-txt' })])];
		}
		case 'mathBlock': {
			return [element('p', [element('math', [cleanText(tree.text)], { style: 'display' })])];
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
			return [element(tree.kind === 'task' ? 'ul' : tree.kind, tree.items.map((item) => {
				const content = expected(item.child);
				return element('li', [
					...(tree.kind === 'task' ? [element('checkbox', [])] : []),
					...(loose && item.child.kind === 'sequence' ? [element('p', content)] : content),
					...(item.nested ? expected(item.nested) : []),
				]);
			}), tree.kind === 'ol' ? { start: '1' } : undefined)];
		}
		default: {
			throw new Error('Unknown composition node');
		}
	}
};

export const expectedDocument = (tree: Block[]): Structure[] => {
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
	const numbers = new Map<string, string>();
	const numberReferences = (entries: Structure[]) => {
		for (const entry of entries) {
			if (typeof entry === 'string') {
				continue;
			}
			if (entry.tag === 'ref') {
				const { href } = (entry.attributes!);
				if (!numbers.has(href)) {
					numbers.set(href, String(numbers.size + 1));
				}
				entry.children = [numbers.get(href)!];
			} else {
				numberReferences(entry.children);
			}
		}
	};
	numberReferences(result);
	if (numbers.size) {
		result.push(element('footnotes', [...numbers.keys()].map(href => element('li', [], { id: href.slice(1) }))));
	}
	return result;
};
