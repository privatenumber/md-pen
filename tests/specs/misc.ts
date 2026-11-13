import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { link } from '../../src/link.ts';
import { code } from '../../src/code.ts';
import { table } from '../../src/table.ts';
import {
	kbd, sub, sup,
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
			expect(render(helper(String.raw`\\<x>`))).toContain(String.raw`\&lt;x&gt;`);
		}
	});

	test('preserves backslash runs around HTML punctuation', () => {
		expect(render(kbd(String.raw`\< \\< \\\<`))).toContain(String.raw`\&lt; \\&lt; \\\&lt;`);
	});

	test('escaped HTML cannot become a tag', () => {
		const html = render(kbd('<img src=x onerror=alert(1) >'));
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img src');
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
