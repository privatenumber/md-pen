import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { escapeText } from '../../src/text.ts';
import { render } from '../utils/render.ts';

describe('literal text escaping', () => {
	test('leaves ordinary punctuation and intraword underscores unchanged', () => {
		assert.equal(escapeText('a.b x_y'), 'a.b x_y');
		assert.equal(escapeText('a*b'), String.raw`a\*b`);
	});
	test('protects Markdown block starts and autolinks', () => {
		assert.equal(render(escapeText('# title\n- item\n1. item')), '<p># title\n- item\n1. item</p>');
		assert.equal(render(escapeText('https://example.com www.example.com')), '<p>https://example.com www.example.com</p>');
	});
	test('protects indentation and character references', () => {
		assert.equal(render(escapeText('    a &amp;')), '<p>    a &amp;amp;</p>');
	});
});
