import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { escape } from '../../src/escape.ts';
import { image, link } from '../../src/link.ts';
import { table } from '../../src/table.ts';
import {
	kbd, sub, sup, mention, emoji, el,
} from '../../src/misc.ts';

describe('kbd', () => {
	test('basic key', () => {
		expect(kbd('Enter')).toBe('<kbd>Enter</kbd>');
	});

	test('escapes HTML in key', () => {
		expect(kbd('<script>')).toBe('<kbd>&lt;script&gt;</kbd>');
	});

	test('line endings cannot create Markdown blocks', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(helper('a\n\n# heading'));
			expect(html.match(/<p>/g)?.length).toBe(1);
			expect(html).not.toContain('<h1');
			expect(html).toContain('a  # heading');
			expect(helper('\n a \r\n')).toContain('>  a  </');
		}
	});

	test('normalizes line endings in Markdown and table cells', () => {
		expect(kbd('a\r\nb')).toBe('<kbd>a b</kbd>');
		expect(kbd('a\r\n \t\r\nb')).toBe('<kbd>a  \t b</kbd>');
		expect(kbd(' a  b ')).toBe('<kbd> a  b </kbd>');
		expect(render(kbd('`a\nb`'))).toBe('<p><kbd><code>a b</code></kbd></p>');
		expect(render(kbd('`a  \n  b`'))).toBe('<p><kbd><code>a     b</code></kbd></p>');
		expect(render(table([['K'], [kbd('a\nb')]]))).toContain('<kbd>a b</kbd>');
	});

	test('composes escaped HTML punctuation without double escaping', () => {
		for (const helper of [kbd, sub, sup]) {
			expect(render(helper(escape('A & B <x>')))).toContain('A &amp; B &lt;x&gt;');
			expect(render(el('div', undefined, helper(escape('A & B <x>'))))).toContain('A &amp; B &lt;x&gt;');
			expect(render(helper('A & B <x>'))).toContain('A &amp; B &lt;x&gt;');
			expect(render(helper(String.raw`\\<x>`))).toContain(String.raw`\&lt;x&gt;`);
		}
	});

	test('preserves backslash runs around HTML punctuation', () => {
		expect(kbd(String.raw`\< \\< \\\<`)).toBe(String.raw`<kbd>&lt; \\&lt; \\&lt;</kbd>`);
	});

	test('escaped HTML cannot become a tag inside an HTML block', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(el('div', undefined, helper(escape('<img src=x onerror=alert(1) >'))));
			expect(html).not.toContain('<img');
			expect(html).toContain('&lt;img src=x onerror=alert(1) &gt;');
		}
	});

	test('escape protects literal multiline content from Markdown', () => {
		const html = render(kbd(escape('a\n\n![x](https://example.test/i.png)')));
		expect(html).not.toContain('<img');
		expect(html).not.toContain('<a ');
		expect(html).toContain('![x](https:\u200B//example.test/i.png)');
	});

	test('leading newline cannot turn escaped HTML into a raw tag', () => {
		for (const helper of [kbd, sub, sup]) {
			const html = render(helper(escape('\n<img src=x onerror=alert(1) >')));
			expect(html).not.toContain('<img');
			expect(html).toContain('&lt;img src=x onerror=alert(1) &gt;');
		}
	});
});

describe('sub', () => {
	test('basic subscript', () => {
		expect(sub('2')).toBe('<sub>2</sub>');
	});

	test('escapes HTML in text', () => {
		expect(sub('a&b')).toBe('<sub>a&amp;b</sub>');
	});
});

describe('sup', () => {
	test('basic superscript', () => {
		expect(sup('2')).toBe('<sup>2</sup>');
	});

	test('escapes HTML in text', () => {
		expect(sup('a<b')).toBe('<sup>a&lt;b</sup>');
	});
});

describe('kbd with attributes', () => {
	test('adds HTML attributes', () => {
		expect(kbd('Enter', { title: 'Press Enter' })).toBe('<kbd title="Press Enter">Enter</kbd>');
	});

	test('adds multiple attributes', () => {
		expect(kbd('Ctrl', {
			id: 'key-ctrl',
			class: 'shortcut',
		})).toBe(
			'<kbd id="key-ctrl" class="shortcut">Ctrl</kbd>',
		);
	});

	test('empty options treated as no options', () => {
		expect(kbd('Enter', {})).toBe('<kbd>Enter</kbd>');
	});

	test('escapes HTML in attribute values', () => {
		expect(kbd('Enter', { title: 'a"b' })).toBe('<kbd title="a&quot;b">Enter</kbd>');
	});
});

describe('sub with attributes', () => {
	test('adds HTML attributes', () => {
		expect(sub('2', { title: 'subscript' })).toBe('<sub title="subscript">2</sub>');
	});

	test('adds multiple attributes', () => {
		expect(sub('2', {
			id: 'sub-2',
			class: 'math',
		})).toBe(
			'<sub id="sub-2" class="math">2</sub>',
		);
	});

	test('empty options treated as no options', () => {
		expect(sub('2', {})).toBe('<sub>2</sub>');
	});
});

describe('sup with attributes', () => {
	test('adds HTML attributes', () => {
		expect(sup('n', { title: 'exponent' })).toBe('<sup title="exponent">n</sup>');
	});

	test('adds multiple attributes', () => {
		expect(sup('n', {
			id: 'sup-n',
			class: 'math',
		})).toBe(
			'<sup id="sup-n" class="math">n</sup>',
		);
	});

	test('empty options treated as no options', () => {
		expect(sup('n', {})).toBe('<sup>n</sup>');
	});
});

describe('el', () => {
	test('void element without attributes', () => {
		expect(el('br')).toBe('<br />');
	});

	test('void element with attributes', () => {
		expect(el('img', {
			src: 'cat.png',
			alt: 'Cat',
		})).toBe('<img src="cat.png" alt="Cat" />');
	});

	test('element with content', () => {
		expect(el('div', undefined, '# Title')).toBe('<div># Title</div>');
	});

	test('element with attributes and content', () => {
		expect(el('div', { align: 'center' }, '# Title')).toBe('<div align="center"># Title</div>');
	});

	test('content is raw (not escaped)', () => {
		expect(el('div', undefined, '**bold** & <em>italic</em>')).toBe('<div>**bold** & <em>italic</em></div>');
	});

	test('escapes HTML in attribute values', () => {
		expect(el('div', { title: 'a"b' }, 'text')).toBe('<div title="a&quot;b">text</div>');
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
		expect(el('div', {}, 'text')).toBe('<div>text</div>');
	});

	test('empty string content produces closing tag', () => {
		expect(el('div', undefined, '')).toBe('<div></div>');
	});
});

describe('mention', () => {
	test('basic username', () => {
		expect(mention('octocat')).toBe('@octocat');
	});

	test('org/team format', () => {
		expect(mention('org/team')).toBe('@org/team');
	});
});

describe('emoji', () => {
	test('basic emoji', () => {
		expect(emoji('rocket')).toBe(':rocket:');
	});
});
