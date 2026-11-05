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

	test('preserves three nested details sections', () => {
		const html = render(details('a', details('b', details('c', 'inside <kbd>x</kbd> and <strong>y</strong>'))));
		expect(html.match(/<details>/g)?.length).toBe(3);
		expect(html.match(/<\/details>/g)?.length).toBe(3);
		expect(html).not.toContain('&lt;/details&gt;');
	});

	test('preserves closing tags in inline and indented code', () => {
		const html = render(details('S', '`</details>`\n\n    </details>'));
		expect(html).toContain('<code>&lt;/details&gt;</code>');
		expect(html).toContain('<pre><code>&lt;/details&gt;\n</code></pre>');
	});

	test('protects an extra closer after a nested section', () => {
		const html = render(details('S', `${details('inner', 'x')}\n\n</details>`));
		expect(html.match(/<\/details>/g)?.length).toBe(2);
		expect(html.match(/&lt;\/details&gt;/g)?.length).toBe(1);
	});

	test('protects malformed closing tags in fallback mode', () => {
		expect(details('S', '</details foo>')).toContain('&lt;/details&gt;');
	});

	test('does not treat backticks across paragraphs as code spans', () => {
		expect(details('S', '`\n\n</details>\n\n`')).toContain('&lt;/details&gt;');
		expect(details('S', '`\n- </details>\n`')).toContain('&lt;/details&gt;');
		expect(details('S', '`\n</details>\n`')).toContain('&lt;/details&gt;');
		expect(details('S', '`\nx </details>\n---\n`\n\nOUT')).toContain('&lt;/details&gt;');
	});

	test('does not treat backticks in HTML attributes as code spans', () => {
		expect(details('S', 'a <span title="`">x</span> </details> `')).toContain('&lt;/details&gt;');
		expect(details('S', '<summary>`</details>`</summary>\n\nOUT')).toContain('&lt;/details&gt;');
		expect(details('S', '<summary>x</summary>\n```\n</details>\n```\n\nOUT')).toContain('&lt;/details&gt;');
	});

	test('treats fences inside HTML blocks as HTML, not code', () => {
		const content = '<div>\n```\n</details>\n```\n</div>';
		expect(details('S', content)).toContain('&lt;/details&gt;');
		const code = '<div>\n\n```\n</details>\n```\n</div>';
		expect(details('S', code)).toContain('&lt;/details&gt;');
	});

	test('preserves fenced code inside a list', () => {
		const html = render(details('S', '- ```html\n  </details>\n  ```'));
		expect(html).toContain('<code class="language-html">&lt;/details&gt;\n</code>');
	});

	test('uses fallback for an HTML tag alone on a line', () => {
		expect(details('S', '<kbd>\n\n```\n</details>\n```')).toContain('&lt;/details&gt;');
	});

	test('protects a closer inside an HTML block in a blockquote', () => {
		const content = '> <div>\n> ```\n> </details>\n> ```\n> </div>\n\nOUT';
		expect(details('S', content)).toContain('&lt;/details&gt;');
	});

	test('protects a closer inside an HTML block in a list', () => {
		const content = '- <div>\n  ```\n  </details>\n  ```\n  </div>\n\nOUT';
		expect(details('S', content)).toContain('&lt;/details&gt;');
	});

	test('does not count details openers inside a table HTML block', () => {
		for (const content of ['<table><details></table></details>OUT', '<table>\n<details>\n</table></details>OUT']) {
			expect(details('S', content)).toContain('&lt;/details&gt;OUT');
		}
		const content = '<table>\n\n<details>\n\n</table>\n\n</details>\n\nOUT';
		expect(details('S', content)).toContain('&lt;/details&gt;\n\nOUT');
	});

	test('renders escaped closing tags as text inside details', () => {
		const html = render(details('S', escape('</details> x')));
		expect(html).toBe('<details>\n<summary>S</summary>\n<p>&lt;/details&gt; x</p>\n</details>');
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
