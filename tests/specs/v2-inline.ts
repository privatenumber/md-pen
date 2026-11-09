import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { bold, italic, strikethrough } from '../../src/emphasis.ts';
import { code } from '../../src/code.ts';
import { footnoteRef } from '../../src/footnote.ts';
import { image, link } from '../../src/link.ts';
import { render } from '../../src/node.ts';

describe('typed inline helpers', () => {
	test('renders text as literal and preserves nested nodes', () => {
		assert.equal(String(bold('a*b')), String.raw`**a\*b**`);
		assert.equal(String(bold(italic('x'))), '**<!-- -->*x*<!-- -->**');
		assert.equal(String(bold(bold('x'))), '**x**');
		assert.equal(String(italic(' x ')), ' *x* ');
	});
	test('separates matching delimiters', () => {
		assert.equal(render([code('a'), code('b')]), '`a`<!-- -->`b`');
		assert.equal(render([strikethrough('a'), strikethrough('b')]), '~~a~~<!-- -->~~b~~');
	});
	test('renders links and images and rejects footnotes in links', () => {
		assert.equal(String(link('/a', bold('x'))), '[**x**](/a)');
		assert.equal(String(image('/a', '[x]')), String.raw`![\[x\]](/a)`);
		assert.throws(() => String(link('/a', footnoteRef('a'))), TypeError);
	});
});
