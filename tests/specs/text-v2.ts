import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { render as escape } from '../../src/node.ts';
import { render } from '../utils/render.ts';

describe('literal text escaping', () => {
	test('guards email-like text with a dot immediately after @', () => {
		assert.equal(escape('a@.com'), 'a@\u200B.com');
	});
	test('leaves ordinary punctuation and intraword underscores unchanged', () => {
		assert.equal(escape('a.b x_y'), 'a.b x_y');
		assert.equal(escape('a*b'), String.raw`a\*b`);
	});
	test('protects Markdown block starts and autolinks', () => {
		assert.equal(render(escape('# title\n- item\n1. item')), '<p># title\n- item\n1. item</p>');
		assert.equal(render(escape('https://example.com www.example.com')), '<p>https://example.com www.example.com</p>');
	});
	test('protects indentation and character references', () => {
		assert.equal(render(escape('    a &amp;')), '<p>    a &amp;amp;</p>');
	});
});
