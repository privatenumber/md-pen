import { markdownToHTML } from 'comrak';

const comrakOptions = {
	extension: {
		strikethrough: true,
		table: true,
		autolink: true,
		tasklist: true,
		footnotes: true,
		alerts: true,
		mathDollars: true,
	},
	render: {
		unsafe: true,
	},
};

// comrak hangs after repeated non-string input, so nodes are stringified first.
export const render = (markdown: string | { toString: () => string }) => markdownToHTML(String(markdown), comrakOptions).trim();
