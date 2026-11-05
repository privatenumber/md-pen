import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { hr, details } from '../../src/block.ts';

describe('hr', () => {
	test('returns horizontal rule', () => {
		expect(hr()).toBe('***');
	});

	test('does not turn a preceding paragraph into a setext heading', () => {
		expect(render(`text\n${hr()}`)).toBe('<p>text</p>\n<hr />');
		expect(render(`> text\n> ${hr()}`)).toBe('<blockquote>\n<p>text</p>\n<hr />\n</blockquote>');
		expect(render(`- text\n  ${hr()}`)).toBe('<ul>\n<li>text\n<hr />\n</li>\n</ul>');
	});
});

describe('details', () => {
	test('basic collapsible section', () => {
		expect(details('Expand', 'Content')).toBe(
			'<details>\n<summary>Expand</summary>\n\nContent\n\n</details>',
		);
	});

	test('escapes HTML in summary', () => {
		expect(details('<script>alert("xss")</script>', 'Content')).toBe(
			'<details>\n<summary>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</summary>\n\nContent\n\n</details>',
		);
	});

	test('passes through markdown in content', () => {
		expect(details('Summary', '**bold** and `code`')).toBe(
			'<details>\n<summary>Summary</summary>\n\n**bold** and `code`\n\n</details>',
		);
	});

	test('empty content', () => {
		expect(details('Summary', '')).toBe(
			'<details>\n<summary>Summary</summary>\n\n\n\n</details>',
		);
	});

	test('empty summary', () => {
		expect(details('', 'Content')).toBe(
			'<details>\n<summary></summary>\n\nContent\n\n</details>',
		);
	});

	test('multiline content', () => {
		expect(details('Summary', 'line 1\n\nline 2')).toBe(
			'<details>\n<summary>Summary</summary>\n\nline 1\n\nline 2\n\n</details>',
		);
	});
});

describe('details with attributes', () => {
	test('adds open attribute', () => {
		expect(details('Summary', 'Content', { open: '' })).toBe(
			'<details open="">\n<summary>Summary</summary>\n\nContent\n\n</details>',
		);
	});

	test('adds multiple attributes', () => {
		expect(details('Summary', 'Content', {
			id: 'faq',
			class: 'collapsible',
		})).toBe(
			'<details id="faq" class="collapsible">\n<summary>Summary</summary>\n\nContent\n\n</details>',
		);
	});

	test('empty options treated as no options', () => {
		expect(details('Summary', 'Content', {})).toBe(
			'<details>\n<summary>Summary</summary>\n\nContent\n\n</details>',
		);
	});

	test('escapes HTML in attribute values', () => {
		expect(details('Summary', 'Content', { id: 'a"b' })).toBe(
			'<details id="a&quot;b">\n<summary>Summary</summary>\n\nContent\n\n</details>',
		);
	});
});

describe('details content injection', () => {
	test('</details> in content does not close block early', () => {
		const html = render(details('sum', '</details>\nout'));
		expect(html.match(/<details>/g)?.length).toBe(1);
		expect(html.match(/<\/details>/g)?.length).toBe(1);
	});

	test('</DETAILS> case-insensitive does not close block early', () => {
		const html = render(details('sum', '</DETAILS>\nout'));
		expect(html.match(/<\/details>/gi)?.length).toBe(1);
	});

	test('</DeTaIlS> mixed case does not close block early', () => {
		const html = render(details('sum', '</DeTaIlS>\nout'));
		expect(html.match(/<\/details>/gi)?.length).toBe(1);
	});

	test('</details > with space does not close block early', () => {
		const html = render(details('sum', '</details >\nout'));
		expect(html.match(/<\/details>/gi)?.length).toBe(1);
	});
});
