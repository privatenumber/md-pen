import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
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
	test('self-closes HTML void elements and foreign roots without content', () => {
		for (const tag of ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']) {
			expect(el(tag)).toBe(`<${tag} />`);
			expect(el(tag.toUpperCase())).toBe(`<${tag.toUpperCase()} />`);
		}
		for (const tag of ['svg', 'math', 'SVG', 'MATH']) {
			expect(el(tag)).toBe(`<${tag} />`);
			expect(el(tag, undefined, 'content')).toBe(`<${tag}>content</${tag}>`);
		}
		expect(render(`${el('svg')}\n\nafter`)).toBe('<svg />\n<p>after</p>');
		expect(render(`${el('math')}\n\nafter`)).toBe('<math />\n<p>after</p>');
		expect(el('div')).toBe('<div></div>');
		expect(el('DIV', { id: 'a' })).toBe('<DIV id="a"></DIV>');
		expect(el('custom-element')).toBe('<custom-element></custom-element>');
		expect(el('linK')).toBe('<linK></linK>');
		expect(render(`${el('div')}\n\nafter`)).toBe('<div></div>\n<p>after</p>');
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
