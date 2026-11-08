import * as m from '../../../src/index.ts';
import { emphasis, type List, type Tree } from './tree.ts';

const listItems = (tree: List, references: Set<string>): m.ListItem[] => (
	tree.items.flatMap(item => [
		markdown(item.child, references),
		...(item.nested ? [listItems(item.nested, references)] : []),
	])
);

export const markdown = (tree: Tree, references: Set<string>): string => {
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
		case 'bold': case 'italic': case 'strike': {
			return emphasis[tree.kind].format(markdown(tree.child, references));
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
			return m.table(tree.rows.map(row => row.map(cell => markdown(cell, references))));
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
