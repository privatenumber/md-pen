import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import {
	escape,
	code,
	codeBlock,
	bold,
	italic,
	link,
	ul,
	table,
	details,
	kbd,
} from '../../src/index.ts';

describe('rendering: non-trivial output', () => {
	test('bold(italic()) renders as bold+italic', () => {
		expect(render(bold(italic('text')))).toBe('<p><strong><em>text</em></strong></p>');
	});

	test('code with backticks renders correctly', () => {
		const html = render(code('a `b` c'));
		expect(html).toContain('<code>');
		expect(html).toContain('a `b` c');
	});

	test('codeBlock with backtick content renders correctly', () => {
		const html = render(codeBlock('```\ninner\n```'));
		expect(html).toContain('<pre>');
		expect(html).toContain('```');
		expect(html).toContain('inner');
	});

	test('table from objects renders as <table>', () => {
		const html = render(table([
			{
				name: 'Alice',
				age: 30,
			},
			{
				name: 'Bob',
				age: 25,
			},
		]));
		expect(html).toContain('<table>');
		expect(html).toContain('<th>name</th>');
		expect(html).toContain('<td>Alice</td>');
		expect(html).toContain('<td>30</td>');
	});

	test('table with columns tuples renders renamed headers', () => {
		const html = render(table([
			{ firstName: 'Alice' },
		], { columns: [['firstName', 'Name']] }));
		expect(html).toContain('<th>Name</th>');
		expect(html).toContain('<td>Alice</td>');
	});

	test('table with escaped pipe renders correctly', () => {
		const html = render(table([
			['Expression', 'Result'],
			['a | b', 'true'],
		]));
		expect(html).toContain('<td>a | b</td>');
	});

	test('nested ul renders nested lists', () => {
		const html = render(ul(['a', 'b', ['nested'], 'c']));
		expect(html).toContain('<ul>');
		expect(html).toContain('nested');
	});

	test('details content parses as block markdown', () => {
		const html = render(details('Click', ul(['one', 'two'])));
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>one</li>');
		expect(html).toContain('<li>two</li>');
	});

	test('details content parses fenced code block', () => {
		const html = render(details('Click', codeBlock('const x = 1', 'js')));
		expect(html).toContain('<pre>');
		expect(html).toContain('language-js');
	});

	test('html table cell parses as block markdown', () => {
		const html = render(table([
			['Code'],
			[codeBlock('const x = 1', 'js')],
		], { html: true }));
		expect(html).toContain('<pre>');
		expect(html).toContain('language-js');
	});
});

describe('rendering: escaping', () => {
	test('escape() prevents markdown interpretation', () => {
		const html = render(escape('**not bold**'));
		expect(html).not.toContain('<strong>');
		expect(html).toContain('*');
	});

	test('escape() prevents link interpretation', () => {
		const html = render(escape('[text](url)'));
		expect(html).not.toContain('<a');
	});

	test('table cell pipe escaping preserves content', () => {
		const html = render(table([
			['Col'],
			['a | b'],
		]));
		expect(html).toContain('<td>a | b</td>');
	});

	test('XSS in kbd is escaped', () => {
		const html = render(kbd('<script>alert(1)</script>'));
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	test('XSS in details summary is escaped', () => {
		const html = render(details('<img onerror=alert(1)>', 'content'));
		expect(html).not.toContain('<img onerror');
		expect(html).toContain('&lt;img');
	});

	test('link HTML fallback preserves composed HTML in text', () => {
		const html = render(link('https://x.com', kbd('Enter'), { target: '_blank' }));
		expect(html).toContain('<kbd>Enter</kbd>');
	});
});
