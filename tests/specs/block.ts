import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { hr, details } from '../../src/block.ts';
import { escape } from '../../src/escape.ts';
import { codeBlock } from '../../src/code.ts';

describe('hr', () => {
	test('returns horizontal rule', () => {
		expect(hr()).toBe('---');
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

	test('preserves closing tags inside code blocks', () => {
		const html = render(details('S', codeBlock('</details>', 'html')));
		expect(html).toContain('<code class="language-html">&lt;/details&gt;\n</code>');
	});

	test('preserves nested details', () => {
		const html = render(details('outer', details('inner', 'content')));
		expect(html).toBe('<details>\n<summary>outer</summary>\n<details>\n<summary>inner</summary>\n<p>content</p>\n</details>\n</details>');
	});

	test('renders escaped closing tags as text inside details', () => {
		const html = render(details('S', escape('</details> x')));
		expect(html).toBe('<details>\n<summary>S</summary>\n<p>&lt;/details&gt; x</p>\n</details>');
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
