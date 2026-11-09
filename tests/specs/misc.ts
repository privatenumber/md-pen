import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { image, link } from '../../src/link.ts';
import { code } from '../../src/code.ts';
import { raw } from '../../src/node.ts';
import { table } from '../../src/table.ts';
import {
	kbd, sub, sup, el,
} from '../../src/misc.ts';

describe('kbd', () => {
	test('basic key', () => {
		expect(String(kbd('Enter'))).toBe('<kbd>Enter</kbd>');
	});

	test('escapes HTML in key', () => {
		expect(String(kbd('<script>'))).toBe('<kbd>&lt;script&gt;</kbd>');
	});

	test('line endings cannot create Markdown blocks', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(helper('a\n\n# heading'));
			expect(html.match(/<p>/g)?.length).toBe(1);
			expect(html).not.toContain('<h1');
			expect(html).toContain('a  # heading');
			expect(String(helper('\n a \r\n'))).toContain('>  a </');
		}
	});

	test('normalizes line endings in Markdown and table cells', () => {
		expect(String(kbd('a\r\nb'))).toBe('<kbd>a b</kbd>');
		expect(String(kbd('a\r\n \t\r\nb'))).toBe('<kbd>a  \t b</kbd>');
		expect(String(kbd(' a  b '))).toBe('<kbd> a  b </kbd>');
		expect(render(kbd(code('a\nb')))).toBe('<p><kbd><code>a b</code></kbd></p>');
		expect(render(kbd(code('a  \n  b')))).toBe('<p><kbd><code>a     b</code></kbd></p>');
		expect(render(table([['K'], [String(kbd('a\nb'))]]))).toContain('<kbd>a b</kbd>');
	});

	test('composes escaped HTML punctuation without double escaping', () => {
		for (const helper of [kbd, sub, sup]) {
			expect(render(helper('A & B <x>'))).toContain('A &amp; B &lt;x&gt;');
			expect(render(el('div', undefined, helper('A & B <x>')))).toContain('A &#38; B &#60;x&#62;');
			expect(render(helper('A & B <x>'))).toContain('A &amp; B &lt;x&gt;');
			expect(render(helper(String.raw`\\<x>`))).toContain(String.raw`\&lt;x&gt;`);
		}
	});

	test('preserves backslash runs around HTML punctuation', () => {
		expect(render(kbd(String.raw`\< \\< \\\<`))).toContain(String.raw`\&lt; \\&lt; \\\&lt;`);
	});

	test('escaped HTML cannot become a tag inside an HTML block', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(el('div', undefined, helper('<img src=x onerror=alert(1) >')));
			expect(html).not.toContain('<img');
			expect(html).toContain('&#60;img src');
		}
	});

	test('escape protects literal multiline content from Markdown', () => {
		const html = render(kbd('a\n\n![x](https://example.test/i.png)'));
		expect(html).not.toContain('<img');
		expect(html).not.toContain('<a ');
		expect(html).toContain('![x](https://example.test/i.png)');
	});

	test('leading newline cannot turn escaped HTML into a raw tag', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(helper('\n<img src=x onerror=alert(1) >'));
			expect(html).not.toContain('<img');
			expect(html).toContain('&lt;img src=x onerror=alert(1) &gt;');
		}
	});
	test('literal text and typed nodes in HTML helpers preserve link safety', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(link('/safe', helper('[click](https://other.example)')));
			expect(html.match(/<a /g)?.length).toBe(1);
			expect(html).toContain('[click](https://other.example)');
			expect(render(helper([code('x'), ' & <y>']))).toContain('<code>x</code> &amp; &lt;y&gt;');
			const htmlForm = render(link('/safe', helper('[click]'), { target: '_blank' }));
			expect(htmlForm).toContain('[click]');
		}
	});
});

describe('sub', () => {
	test('basic subscript', () => {
		expect(String(sub('2'))).toBe('<sub>2</sub>');
	});

	test('escapes HTML in text', () => {
		expect(String(sub('a&b'))).toBe('<sub>a&amp;b</sub>');
	});
});

describe('sup', () => {
	test('basic superscript', () => {
		expect(String(sup('2'))).toBe('<sup>2</sup>');
	});

	test('escapes HTML in text', () => {
		expect(String(sup('a<b'))).toBe('<sup>a&lt;b</sup>');
	});
});

describe('kbd with attributes', () => {
	test('adds HTML attributes', () => {
		expect(String(kbd('Enter', { title: 'Press Enter' }))).toBe('<kbd title="Press Enter">Enter</kbd>');
	});

	test('adds multiple attributes', () => {
		expect(String(kbd('Ctrl', {
			id: 'key-ctrl',
			class: 'shortcut',
		}))).toBe(
			'<kbd id="key-ctrl" class="shortcut">Ctrl</kbd>',
		);
	});

	test('empty options treated as no options', () => {
		expect(String(kbd('Enter', {}))).toBe('<kbd>Enter</kbd>');
	});

	test('escapes HTML in attribute values', () => {
		expect(String(kbd('Enter', { title: 'a"b' }))).toBe('<kbd title="a&quot;b">Enter</kbd>');
	});
});

describe('sub with attributes', () => {
	test('adds HTML attributes', () => {
		expect(String(sub('2', { title: 'subscript' }))).toBe('<sub title="subscript">2</sub>');
	});

	test('adds multiple attributes', () => {
		expect(String(sub('2', {
			id: 'sub-2',
			class: 'math',
		}))).toBe(
			'<sub id="sub-2" class="math">2</sub>',
		);
	});

	test('empty options treated as no options', () => {
		expect(String(sub('2', {}))).toBe('<sub>2</sub>');
	});
});

describe('sup with attributes', () => {
	test('adds HTML attributes', () => {
		expect(String(sup('n', { title: 'exponent' }))).toBe('<sup title="exponent">n</sup>');
	});

	test('adds multiple attributes', () => {
		expect(String(sup('n', {
			id: 'sup-n',
			class: 'math',
		}))).toBe(
			'<sup id="sup-n" class="math">n</sup>',
		);
	});

	test('empty options treated as no options', () => {
		expect(String(sup('n', {}))).toBe('<sup>n</sup>');
	});
});

describe('el', () => {
	test('rejects invalid CommonMark tag names', () => {
		for (const tag of ['svg:path', '', '1div', 'div x', 'div>', 'linK']) {
			expect(() => el(tag, { title: 'a\n\n![x](https://attacker.test/i.png)' }, 'text')).toThrow(TypeError);
		}
	});

	test('accepts CommonMark tag names', () => {
		expect(String(el('X-custom-1', undefined, 'text'))).toBe('<X-custom-1>text</X-custom-1>');
	});

	test('self-closes HTML void elements and foreign roots without content', () => {
		for (const tag of ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']) {
			expect(String(el(tag))).toBe(`<${tag} />`);
			expect(String(el(tag.toUpperCase()))).toBe(`<${tag.toUpperCase()} />`);
		}
		for (const tag of ['svg', 'math', 'SVG', 'MATH']) {
			expect(String(el(tag))).toBe(`<${tag} />`);
			expect(String(el(tag, undefined, 'content'))).toBe(`<${tag}>content</${tag}>`);
		}
		expect(render(`${el('svg')}\n\nafter`)).toBe('<svg />\n<p>after</p>');
		expect(render(`${el('math')}\n\nafter`)).toBe('<math />\n<p>after</p>');
		expect(String(el('div'))).toBe('<div></div>');
		expect(String(el('DIV', { id: 'a' }))).toBe('<DIV id="a"></DIV>');
		expect(String(el('custom-element'))).toBe('<custom-element></custom-element>');
		expect(render(`${el('div')}\n\nafter`)).toBe('<div></div>\n<p>after</p>');
	});

	test('void element with attributes', () => {
		expect(String(el('img', {
			src: 'cat.png',
			alt: 'Cat',
		}))).toBe('<img src="cat.png" alt="Cat" />');
	});

	test('element with content', () => {
		expect(String(el('div', undefined, '# Title'))).toBe('<div>&#35; Title</div>');
	});

	test('element with attributes and content', () => {
		expect(String(el('div', { align: 'center' }, '# Title'))).toBe('<div align="center">&#35; Title</div>');
	});

	test('content is literal unless explicitly raw', () => {
		expect(String(el('div', undefined, '<img>'))).toBe('<div>&#60;img&#62;</div>');
		expect(String(el('div', undefined, raw('<em>italic</em>')))).toBe('<div><em>italic</em></div>');
		expect(String(el('div', undefined, code('<img>')))).toBe('<div><code>&lt;img&gt;</code></div>');
	});

	test('escapes HTML in attribute values', () => {
		expect(String(el('div', { title: 'a"b' }, 'text'))).toBe('<div title="a&quot;b">text</div>');
	});

	test('blank lines in HTML attributes cannot inject Markdown', () => {
		const input = 'a\n\n![x](https://attacker.test/i.png)';
		const samples = [
			el('span', { title: input }, 'text'),
			link('x', 'text', {
				title: input,
				target: '_blank',
			}),
			image('x', input, { width: 1 }),
		];
		for (const markdown of samples) {
			const html = render(markdown);
			expect(html).not.toContain('src="https://attacker.test/i.png"');
			expect(html).toContain('a&#10;&#10;![x](https://attacker.test/i.png)');
		}
	});

	test('drops invalid attribute names before Markdown parsing', () => {
		const html = render(image('safe.png', 'alt', {
			'@foo': 'a\n\n![x](https://attacker.test/i.png)',
		}));
		expect(html).not.toContain('attacker.test');
		expect(html).toContain('src="safe.png"');
	});

	test('empty attributes treated as no attributes', () => {
		expect(String(el('div', {}, 'text'))).toBe('<div>text</div>');
	});

	test('empty string content produces closing tag', () => {
		expect(String(el('div', undefined, ''))).toBe('<div></div>');
	});
});
