import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import {
	blockNode, inlineNode, join, md, raw, render, renderInline, type BlockNode, type Inline,
} from '../../src/node.ts';
import { render as renderHtml } from '../utils/render.ts';

expectTypeOf<BlockNode>().not.toExtend<Inline>();

describe('typed Markdown core', () => {
	test('escapes interpolated strings and preserves trusted Markdown', () => {
		assert.equal(render(md`**${'a*b'}** ${raw('<br>')}`), String.raw`**a\*b** <br>`);
		assert.equal(render(md`${'www'}${'.example.com'}`), String.raw`www\.example.com`);
	});
	test('joins inline parts and blocks at their own boundaries', () => {
		assert.equal(render(join(['a*b', 'c'], ', ')), String.raw`a\*b, c`);
		assert.equal(render([blockNode(() => 'a'), blockNode(() => 'b')]), 'a\n\nb');
		assert.equal(render(['1', '. item']), String.raw`1\. item`);
		assert.equal(render(['www', '.example.com']), String.raw`www\.example.com`);
		assert.equal(render(['www', inlineNode(() => ''), '.example.com']), String.raw`www\.example.com`);
		assert.equal(render(['www', raw(''), '.example.com']), String.raw`www\.example.com`);
	});
	test('does not mutate the caller context', () => {
		const context = Object.freeze({
			emphasis: 0,
			inLink: false,
			singleLine: false,
			lineStart: true,
		});
		assert.equal(renderInline(['a', inlineNode(current => (current.lineStart ? 'x' : 'y'))], context), 'ay');
	});
	test('separates delimiter collisions and flanking failures', () => {
		const bold = (text: string) => inlineNode(() => `**${text}**`, '**');
		const italic = (text: string) => inlineNode(() => `*${text}*`, '*');
		assert.equal(render(['a', bold('.b'), 'c']), 'a<!-- -->**.b**c');
		assert.equal(render([italic('a.'), 'b']), '*a.*<!-- -->b');
		assert.equal(render([bold('a'), bold('b'), 'c']), '**a**<!-- -->**b**c');
		assert.equal(renderHtml(render(['a', bold('.b'), 'c'])), '<p>a<!-- --><strong>.b</strong>c</p>');
	});
});
