import * as m from '../../../src/index.ts';

export const emphasis = {
	bold: {
		format: m.bold,
		tag: 'strong',
	},
	italic: {
		format: m.italic,
		tag: 'em',
	},
	strike: {
		format: m.strikethrough,
		tag: 'del',
	},
};

export type Inline =
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
export type ListKind = 'ul' | 'ol' | 'task';
export type List = {
	kind: ListKind;
	items: {
		checked: boolean;
		child: Inline | Block;
		nested?: List;
	}[];
};
export type Block =
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
		rows: Inline[][];
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
export type Tree = Inline | Block;
export type Element = {
	tag: string;
	attributes?: Record<string, string>;
	children: Structure[];
};
export type Structure = string | Element;

export const element = (
	tag: string,
	children: Structure[],
	attributes?: Record<string, string>,
): Element => ({
	tag,
	...(attributes && { attributes }),
	children,
});
