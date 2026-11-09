import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import {
	bold,
	italic,
	strikethrough,
	code,
	link,
	blockquote,
	ul,
	ol,
	table,
	heading,
	alert,
	details,
	kbd,
} from '../../src/index.ts';

describe('inline in inline', () => {
	test('bold(italic()) composes naturally', () => {
		const md = bold(italic('text'));
		expect(String(md)).toBe('***text***');
		const html = render(md);
		expect(html).toContain('<strong>');
		expect(html).toContain('<em>');
	});

	test('italic(bold()) composes naturally', () => {
		const md = italic(bold('text'));
		expect(String(md)).toBe('***text***');
		const html = render(md);
		expect(html).toContain('<em>');
		expect(html).toContain('<strong>');
	});

	test('bold(code())', () => {
		const md = bold(code('x'));
		expect(String(md)).toBe('**`x`**');
		const html = render(md);
		expect(html).toContain('<strong>');
		expect(html).toContain('<code>');
	});

	test('bold(link())', () => {
		const md = bold(link('https://x.com', 'click'));
		expect(String(md)).toBe('**[click](https://x.com)**');
		const html = render(md);
		expect(html).toContain('<strong>');
		expect(html).toContain('<a href="https://x.com">');
	});

	test('link with bold text', () => {
		const md = link('https://x.com', bold('click'));
		expect(String(md)).toBe('[**click**](https://x.com)');
		const html = render(md);
		expect(html).toContain('<a href="https://x.com">');
		expect(html).toContain('<strong>click</strong>');
	});

	test('strikethrough(link())', () => {
		const md = strikethrough(link('https://x.com', 'old'));
		expect(String(md)).toBe('~~[old](https://x.com)~~');
		const html = render(md);
		expect(html).toContain('<del>');
		expect(html).toContain('<a');
	});

	test('bold(strikethrough())', () => {
		const md = bold(strikethrough('removed'));
		expect(String(md)).toBe('**~~removed~~**');
		const html = render(md);
		expect(html).toContain('<strong>');
		expect(html).toContain('<del>');
	});

	test('italic(code())', () => {
		const md = italic(code('fn'));
		expect(String(md)).toBe('*`fn`*');
		const html = render(md);
		expect(html).toContain('<em>');
		expect(html).toContain('<code>');
	});

	test('link with kbd text', () => {
		const md = link('https://x.com', kbd('Enter'));
		expect(String(md)).toBe('[<kbd>Enter</kbd>](https://x.com)');
	});

	test('strikethrough(bold(italic()))', () => {
		const md = strikethrough(bold(italic('all')));
		expect(String(md)).toBe('~~***all***~~');
		const html = render(md);
		expect(html).toContain('<del>');
		expect(html).toContain('<strong>');
		expect(html).toContain('<em>');
	});
});

describe('inline in block', () => {
	test('bold in blockquote', () => {
		const md = blockquote(String(bold('important')));
		expect(String(md)).toBe('> **important**');
		const html = render(md);
		expect(html).toContain('<blockquote>');
		expect(html).toContain('<strong>important</strong>');
	});

	test('link in blockquote', () => {
		const md = blockquote(String(link('https://x.com', 'click')));
		const html = render(md);
		expect(html).toContain('<blockquote>');
		expect(html).toContain('<a href="https://x.com">');
	});

	test('bold in list item', () => {
		const md = ul([String(bold('item 1')), 'item 2']);
		const html = render(md);
		expect(html).toContain('<strong>item 1</strong>');
		expect(html).toContain('<li>');
	});

	test('link in list item', () => {
		const md = ul([
			String(link('https://a.com', 'A')),
			String(link('https://b.com', 'B')),
		]);
		const html = render(md);
		expect(html).toContain('<a href="https://a.com">A</a>');
		expect(html).toContain('<a href="https://b.com">B</a>');
	});

	test('code in list item', () => {
		const md = ul([String(code('npm install')), 'then run']);
		const html = render(md);
		expect(html).toContain('<code>npm install</code>');
	});

	test('bold in ordered list', () => {
		const md = ol([String(bold('first')), 'second']);
		const html = render(md);
		expect(html).toContain('<strong>first</strong>');
		expect(html).toContain('<ol>');
	});

	test('link in table cell', () => {
		const md = table([
			['Name', 'URL'],
			['Site', String(link('https://x.com', 'link'))],
		]);
		const html = render(md);
		expect(html).toContain('<table>');
		expect(html).toContain('<a href="https://x.com">link</a>');
	});

	test('bold in table cell', () => {
		const md = table([
			['Key', 'Value'],
			[String(bold('name')), 'Alice'],
		]);
		const html = render(md);
		expect(html).toContain('<strong>name</strong>');
	});

	test('code in table cell', () => {
		const md = table([
			['Command', 'Description'],
			[String(code('ls')), 'list files'],
		]);
		const html = render(md);
		expect(html).toContain('<code>ls</code>');
	});

	test('inline in heading', () => {
		const md = heading(String(bold('Title')), 2);
		const html = render(md);
		expect(html).toContain('<h2>');
		expect(html).toContain('<strong>Title</strong>');
	});

	test('link in heading', () => {
		const md = heading(String(link('https://x.com', 'Title')), 1);
		const html = render(md);
		expect(html).toContain('<h1>');
		expect(html).toContain('<a href="https://x.com">');
	});

	test('bold in alert', () => {
		const md = alert('note', String(bold('important')));
		const html = render(md);
		expect(html).toContain('alert');
		expect(html).toContain('<strong>important</strong>');
	});

	test('markdown in details content', () => {
		const md = details('Expand', String(bold('hidden')));
		const html = render(md);
		expect(html).toContain('<details>');
		expect(html).toContain('<strong>hidden</strong>');
	});
});

describe('block in block', () => {
	test('nested blockquotes', () => {
		const md = blockquote(blockquote('nested'));
		expect(String(md)).toBe('> > nested');
		const html = render(md);
		expect(html).toContain('<blockquote>');
		expect(html).toContain('nested');
	});

	test('list in blockquote', () => {
		const md = blockquote(ul(['a', 'b']));
		const html = render(md);
		expect(html).toContain('<blockquote>');
	});
});
