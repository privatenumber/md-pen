import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { hr, details } from '../../src/block.ts';
import { escape } from '../../src/escape.ts';
import { codeBlock } from '../../src/code.ts';

describe('hr', () => {
	test('returns horizontal rule', () => {
		expect(hr()).toBe('___');
	});

	test('does not turn a preceding paragraph into a setext heading', () => {
		expect(render(`text\n${hr()}`)).toBe('<p>text</p>\n<hr />');
		expect(render(`> text\n> ${hr()}`)).toBe('<blockquote>\n<p>text</p>\n<hr />\n</blockquote>');
		expect(render(`- text\n  ${hr()}`)).toBe('<ul>\n<li>text\n<hr />\n</li>\n</ul>');
	});

	test('stays inside an asterisk list item', () => {
		expect(render(`* ${hr()}\n  text`)).toBe('<ul>\n<li>\n<hr />\ntext</li>\n</ul>');
		expect(render(`- ${hr()}\n  text`)).toBe('<ul>\n<li>\n<hr />\ntext</li>\n</ul>');
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
		expect(html).toContain('<code class="language-html">&lt;\u200B/details&gt;\n</code>');
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

	test('preserves nested details with multiline summaries', () => {
		const html = render(details('outer', details('first\nsecond', 'inside')));
		expect(html.match(/<details>/g)?.length).toBe(2);
		expect(html.match(/<\/details>/g)?.length).toBe(2);
	});

	test('preserves nested details containing a Markdown table', () => {
		const html = render(details('outer', details('inner', '| h |\n| - |\n| x |')));
		expect(html).toContain('<table>');
		expect(html.match(/<details>/g)?.length).toBe(2);
		expect(html.match(/<\/details>/g)?.length).toBe(2);
	});

	test('falls back for each HTML scope and parsing boundary', () => {
		const tags = [
			'applet',
			'caption',
			'html',
			'table',
			'td',
			'th',
			'marquee',
			'object',
			'template',
			'mi',
			'mo',
			'mn',
			'ms',
			'mtext',
			'annotation-xml',
			'foreignobject',
			'desc',
			'title',
			'tbody',
			'thead',
			'tfoot',
			'tr',
			'colgroup',
			'col',
			'select',
			'script',
			'style',
			'textarea',
			'xmp',
			'iframe',
			'noembed',
			'noframes',
			'noscript',
			'plaintext',
			'svg',
			'math',
		];
		const inner = details('inner', 'content');
		for (const tag of tags) {
			for (const prefix of ['', '/']) {
				for (const name of [tag, tag.toUpperCase()]) {
					const result = details('outer', `${inner}\n\nx <${prefix}${name}>`);
					expect(result).toContain('<\u200Bdetails>');
					expect(result).toContain('<\u200B/details>');
				}
			}
		}
	});

	test('distinguishes HTML boundary tags from look-alikes', () => {
		const inner = details('inner', 'content');
		for (const input of ['<tablex>', '<tab>', '<table=bad>', '<table']) {
			expect(details('outer', `${inner}\n\nx ${input}`)).toContain(inner);
		}
		expect(details('outer', `${inner}\n\nx \\<table>`)).toContain('<\u200Bdetails>');
	});

	test('preserves nested details containing a list or blockquote', () => {
		for (const content of ['- first', '> first']) {
			const html = render(details('outer', details('inner', content)));
			expect(html.match(/<details>/g)?.length).toBe(2);
			expect(html.match(/<\/details>/g)?.length).toBe(2);
			expect(html).toContain(content.startsWith('-') ? '<li>first</li>' : '<blockquote>');
		}
	});

	test('keeps an unfinished closer visible without swallowing the wrapper', () => {
		const html = render(`${details('S', '<br>\n</details')}\n\nAFTER`);
		expect(html).toContain('<br>\n<\u200B/details\n</details>\n<p>AFTER</p>');
		const raw = render(details('S', '<div>\n</details>\nOUT\n</div>'));
		expect(raw).toContain('<\u200B/details>\nOUT');
	});

	test('falls back for multiline quoted attributes inside a summary', () => {
		for (const quote of ['"', "'"]) {
			const content = `<summary>\n<a title=${quote}\n</summary>\n\n<details>\n${quote}>\n\n</details>\n\nOUT`;
			const result = details('S', content);
			expect(result).toContain('<\u200Bdetails>');
			expect(result).toContain('<\u200B/details>');
			const html = render(`${result}\n\nAFTER`);
			expect(html).toContain('<p>OUT</p>\n</details>\n<p>AFTER</p>');
		}
	});

	test('neutralizes overlapping and unfinished closing tokens', () => {
		const overlapping = details('S', 'text </details </details> OUT');
		expect(overlapping).toContain('text <\u200B/details <\u200B/details> OUT');
		expect(render(`${overlapping}\n\nAFTER`)).toBe('<details>\n<summary>S</summary>\n<p>text &lt;\u200B/details &lt;\u200B/details&gt; OUT</p>\n</details>\n<p>AFTER</p>');
		const unfinished = details('S', '<div>\n</details\n\nOUT');
		expect(render(`${unfinished}\n\nAFTER`)).toBe('<details>\n<summary>S</summary>\n<div>\n<\u200B/details\n<p>OUT</p>\n</details>\n<p>AFTER</p>');
		expect(details('S', '</details')).toContain('<\u200B/details');
	});

	test('neutralizes a nested opener and closer in a list', () => {
		const content = '- x\n  <details>\n\n</details>\n\nOUT';
		const result = details('S', content);
		expect(result).toContain('<\u200Bdetails>');
		expect(result).toContain('<\u200B/details>');
		expect(render(`${result}\n\nAFTER`)).toBe('<details>\n<summary>S</summary>\n<ul>\n<li>x\n&lt;\u200Bdetails&gt;</li>\n</ul>\n<p>&lt;\u200B/details&gt;</p>\n<p>OUT</p>\n</details>\n<p>AFTER</p>');
	});

	test('neutralizes both ends of nested details in fallback mode', () => {
		const inner = details('inner', codeBlock('const x=1', 'js'));
		const result = details('outer', inner);
		expect(result).toContain('<\u200Bdetails>');
		expect(result).toContain('<\u200B/details>');
		expect(render(`${result}\n\nOUT`)).toBe('<details>\n<summary>outer</summary>\n<p>&lt;\u200Bdetails&gt;</p>\n<summary>inner</summary>\n<pre><code class="language-js">const x=1\n</code></pre>\n<p>&lt;\u200B/details&gt;</p>\n</details>\n<p>OUT</p>');
	});

	test('neutralizes unpaired opening tokens', () => {
		expect(details('S', '<details')).toContain('<\u200Bdetails');
		expect(details('S', '<DETAILS>')).toContain('<\u200BDETAILS>');
		const inner = details('inner', 'content');
		const result = details('outer', `${inner}\n\n<details>`);
		expect(result).toContain(`${inner}\n\n<\u200Bdetails>`);
	});

	test('neutralizes tokens in URLs, attributes, and escaped text', () => {
		expect(details('S', '[x](https://example.test/?tag=</details>)')).toContain('<\u200B/details>');
		expect(details('S', '<a title="</details>">x</a>')).toContain('<\u200B/details>');
		expect(details('S', String.raw`\</details>`)).toContain('\\<\u200B/details>');
	});

	test('neutralizes nested closers when content contains code', () => {
		const inner = details('inner', codeBlock('</details>', 'html'));
		const result = details('outer', `${inner}\n\nOUT`);
		expect(result).toContain('<\u200B/details>\n\nOUT');
		const html = render(result);
		expect(html).toContain('&lt;\u200B/details&gt;');
		expect(html).toContain('<p>OUT</p>\n</details>');
	});

	test('neutralizes closers when code markers can obscure an opener', () => {
		const cases = [
			'    ```\n    <details>\n    ```\n\n</details>\n\nOUT',
			'     ```\n     <details>\n     ```\n\n</details>\n\nOUT',
			'      ```\n      <details>\n      ```\n\n</details>\n\nOUT',
			'  ```\n<details>\n  ```\n\n</details>\n\nOUT',
			'[x](url "a `") and `code`\n\n</details>\n\nOUT',
		];
		for (const content of cases) {
			const html = render(details('S', content));
			expect(html.match(/<\/details>/g)?.length).toBe(1);
			expect(html.indexOf('OUT')).toBeLessThan(html.lastIndexOf('</details>'));
		}
	});

	test('preserves closing tags in inline and indented code', () => {
		const html = render(details('S', '`</details>`\n\n    </details>'));
		expect(html).toContain('<code>&lt;\u200B/details&gt;</code>');
		expect(html).toContain('<pre><code>&lt;\u200B/details&gt;\n</code></pre>');
	});

	test('protects an extra closer after a nested section', () => {
		const html = render(details('S', `${details('inner', 'x')}\n\n</details>`));
		expect(html.match(/<\/details>/g)?.length).toBe(2);
		expect(html).toContain('&lt;\u200B/details&gt;');
	});

	test('protects malformed closing tags in fallback mode', () => {
		expect(details('S', '</details foo>')).toContain('<\u200B/details foo>');
		expect(details('S', '</DeTaIlS / >')).toContain('<\u200B/DeTaIlS / >');
	});

	test('does not treat backticks across paragraphs as code spans', () => {
		expect(details('S', '`\n\n</details>\n\n`')).toContain('<\u200B/details>');
		expect(details('S', '`\n- </details>\n`')).toContain('<\u200B/details>');
		expect(details('S', '`\n</details>\n`')).toContain('<\u200B/details>');
		expect(details('S', '`\nx </details>\n---\n`\n\nOUT')).toContain('<\u200B/details>');
	});

	test('does not treat backticks in HTML attributes as code spans', () => {
		expect(details('S', 'a <span title="`">x</span> </details> `')).toContain('<\u200B/details>');
		expect(details('S', '<summary>`</details>`</summary>\n\nOUT')).toContain('<\u200B/details>');
		expect(details('S', '<summary>x</summary>\n```\n</details>\n```\n\nOUT')).toContain('<\u200B/details>');
	});

	test('treats fences inside HTML blocks as HTML, not code', () => {
		const content = '<div>\n```\n</details>\n```\n</div>';
		expect(details('S', content)).toContain('<\u200B/details>');
		const code = '<div>\n\n```\n</details>\n```\n</div>';
		expect(details('S', code)).toContain('<\u200B/details>');
	});

	test('preserves fenced code inside a list', () => {
		const html = render(details('S', '- ```html\n  </details>\n  ```'));
		expect(html).toContain('<code class="language-html">&lt;\u200B/details&gt;\n</code>');
	});

	test('uses fallback for an HTML tag alone on a line', () => {
		expect(details('S', '<kbd>\n\n```\n</details>\n```')).toContain('<\u200B/details>');
	});

	test('protects a closer inside an HTML block in a blockquote', () => {
		const content = '> <div>\n> ```\n> </details>\n> ```\n> </div>\n\nOUT';
		expect(details('S', content)).toContain('<\u200B/details>');
	});

	test('protects a closer inside an HTML block in a list', () => {
		const content = '- <div>\n  ```\n  </details>\n  ```\n  </div>\n\nOUT';
		expect(details('S', content)).toContain('<\u200B/details>');
	});

	test('does not count details openers inside a table HTML block', () => {
		for (const content of ['<table><details></table></details>OUT', '<table>\n<details>\n</table></details>OUT']) {
			expect(details('S', content)).toContain('<\u200B/details>OUT');
		}
		const content = '<table>\n\n<details>\n\n</table>\n\n</details>\n\nOUT';
		expect(details('S', content)).toContain('<\u200B/details>\n\nOUT');
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
		expect(html).toContain('out</p>\n</details>');
	});

	test('</DETAILS> case-insensitive does not close block early', () => {
		const html = render(details('sum', '</DETAILS>\nout'));
		expect(html.match(/<\/details>/gi)?.length).toBe(1);
		expect(html).toContain('out</p>\n</details>');
	});

	test('</DeTaIlS> mixed case does not close block early', () => {
		const html = render(details('sum', '</DeTaIlS>\nout'));
		expect(html.match(/<\/details>/gi)?.length).toBe(1);
		expect(html).toContain('out</p>\n</details>');
	});

	test('</details > with space does not close block early', () => {
		const html = render(details('sum', '</details >\nout'));
		expect(html.match(/<\/details>/gi)?.length).toBe(1);
		expect(html).toContain('out</p>\n</details>');
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
