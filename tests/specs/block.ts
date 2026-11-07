import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { hr, details } from '../../src/block.ts';
import { escape } from '../../src/escape.ts';
import { codeBlock } from '../../src/code.ts';
import { alert, blockquote } from '../../src/blockquote.ts';
import { taskList, ul } from '../../src/list.ts';

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

	test('blank lines in summary cannot inject Markdown', () => {
		const html = render(details('a\n\n![x](https://attacker.test/i.png)', 'content'));
		expect(html).not.toContain('<img');
		expect(html).toContain('<summary>a&#10;&#10;![x](https://attacker.test/i.png)</summary>');
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

	test('preserves nested details containing a list or blockquote', () => {
		for (const content of ['- first', '> first']) {
			const html = render(details('outer', details('inner', content)));
			expect(html.match(/<details>/g)?.length).toBe(2);
			expect(html.match(/<\/details>/g)?.length).toBe(2);
			expect(html).toContain(content.startsWith('-') ? '<li>first</li>' : '<blockquote>');
		}
	});

	test('neutralizes nested sections in containers', () => {
		const inner = details('inner', 'content');
		const cases = [
			blockquote(inner),
			alert('note', inner),
			ul([inner]),
			taskList([[false, inner]]),
			ul([blockquote(inner)]),
			`paragraph\n2. - ${inner.replaceAll('\n', '\n     ')}`,
			`1234567890. ${inner.replaceAll('\n', '\n            ')}`,
			'> <details>\n> <summary>inner</summary>\n> \n> content\rbreak\n> \n> </details>',
			'> <details>\n> <summary>inner</summary>\n> \n> content\nlazy continuation\n> \n> </details>',
			taskList([[false, blockquote(inner)]]),
		];
		for (const content of cases) {
			const markdown = details('outer', `${content}\n\nINSIDE`);
			expect(markdown).toContain('<\u200Bdetails>');
			expect(markdown).toContain('<\u200B/details>');
			expect(render(`${markdown}\n\nAFTER`)).toContain('<p>INSIDE</p>\n</details>\n<p>AFTER</p>');
		}
	});

	test('neutralizes heads with raw line endings', () => {
		for (const head of ['<details>\n<summary>x\ry</summary>', '<details a="x\ry">\n<summary>x</summary>', '<details a="x\ny">\n<summary>x</summary>', '<details>\n<summary>x\ny</summary>']) {
			const markdown = details('outer', `${head}\n\n</details>\n\nINSIDE`);
			expect(markdown).toContain('<\u200Bdetails');
			expect(markdown).toContain('<\u200B/details>');
			expect(render(`${markdown}\n\nAFTER`)).toContain('<p>INSIDE</p>\n</details>\n<p>AFTER</p>');
		}
	});

	test('keeps an unfinished closer visible without swallowing the wrapper', () => {
		const html = render(`${details('S', '<br>\n</details')}\n\nAFTER`);
		expect(html).toContain('<br>\n<\u200B/details\n</details>\n<p>AFTER</p>');
		const raw = render(details('S', '<div>\n</details>\nOUT\n</div>'));
		expect(raw).toContain('<\u200B/details>\nOUT');
	});

	test('neutralizes unmatched details tags near multiline quoted attributes', () => {
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

	test('preserves nested details containing a code block', () => {
		const content = details('inner', codeBlock('const x=1', 'js'));
		const html = render(`${details('outer', content)}\n\nAFTER`);
		expect(html).toBe('<details>\n<summary>outer</summary>\n<details>\n<summary>inner</summary>\n<pre><code class="language-js">const x=1\n</code></pre>\n</details>\n</details>\n<p>AFTER</p>');
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

	test('preserves nested details and outer content around closing tags in code', () => {
		const inner = details('inner', codeBlock('</details>', 'html'));
		const html = render(`${details('outer', `${inner}\n\nOUT`)}\n\nAFTER`);
		expect(html).toBe('<details>\n<summary>outer</summary>\n<details>\n<summary>inner</summary>\n<pre><code class="language-html">&lt;\u200B/details&gt;\n</code></pre>\n</details>\n<p>OUT</p>\n</details>\n<p>AFTER</p>');
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

	test('protects malformed closing tags', () => {
		expect(details('S', '</details foo>')).toContain('<\u200B/details foo>');
		expect(details('S', '</DeTaIlS / >')).toContain('<\u200B/DeTaIlS / >');
	});

	test('neutralizes stray closers near backticks across paragraphs', () => {
		expect(details('S', '`\n\n</details>\n\n`')).toContain('<\u200B/details>');
		expect(details('S', '`\n- </details>\n`')).toContain('<\u200B/details>');
		expect(details('S', '`\n</details>\n`')).toContain('<\u200B/details>');
		expect(details('S', '`\nx </details>\n---\n`\n\nOUT')).toContain('<\u200B/details>');
	});

	test('neutralizes stray closers near backticks in raw HTML', () => {
		expect(details('S', 'a <span title="`">x</span> </details> `')).toContain('<\u200B/details>');
		expect(details('S', '<summary>`</details>`</summary>\n\nOUT')).toContain('<\u200B/details>');
		expect(details('S', '<summary>x</summary>\n```\n</details>\n```\n\nOUT')).toContain('<\u200B/details>');
	});

	test('neutralizes unmatched closers near fences and HTML blocks', () => {
		const content = '<div>\n```\n</details>\n```\n</div>';
		expect(details('S', content)).toContain('<\u200B/details>');
		const code = '<div>\n\n```\n</details>\n```\n</div>';
		expect(details('S', code)).toContain('<\u200B/details>');
	});

	test('preserves fenced code inside a list', () => {
		const html = render(details('S', '- ```html\n  </details>\n  ```'));
		expect(html).toContain('<code class="language-html">&lt;\u200B/details&gt;\n</code>');
	});

	test('neutralizes an unmatched closer after standalone HTML', () => {
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

	test('neutralizes unmatched details tags inside an HTML table', () => {
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
