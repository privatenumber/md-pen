import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import {
	blockNode, inlineNode, join, md, raw, render, renderInline, type BlockNode, type Inline,
} from '../../src/node.ts';
import { render as renderHtml } from '../utils/render.ts';
import { bold } from '../../src/emphasis.ts';
import { link } from '../../src/link.ts';
import { footnoteRef } from '../../src/footnote.ts';

expectTypeOf<BlockNode>().not.toExtend<Inline>();

describe('typed Markdown core', () => {
	test('escapes interpolated strings and preserves trusted Markdown', () => {
		assert.equal(render(md`${bold('a*b')} ${raw('<br>')}`), String.raw`**a\*b** <br>`);
		assert.equal(render(md`${'www'}${'.example.com'}`), String.raw`www\.example.com`);
		assert.equal(render([raw('@user'), ' ', raw(':smile:')]), '@user :smile:');
	});
	test('treats template statics and interpolations as one literal sequence', () => {
		assert.equal(render(md`1${'. item'}`), render(['1', '. item']));
		assert.equal(render(md`www${'.example.com'}`), render(['www', '.example.com']));
		assert.equal(render(md`see ${link('/p', 'x')} now`), render(['see ', link('/p', 'x'), ' now']));
		const html = renderHtml(render(md`<span title="${'" onmouseover="x'}">`));
		assert.doesNotMatch(html, /<span/);
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
			indent: 0,
			htmlElement: false,
			literalGuards: true,
		});
		assert.equal(renderInline(['a', inlineNode(current => (current.indent === 0 ? 'x' : 'y'))], context), 'ay');
	});
	test('separates delimiter collisions and flanking failures', () => {
		const strongNode = (text: string) => inlineNode(() => `**${text}**`, '**');
		const italic = (text: string) => inlineNode(() => `*${text}*`, '*');
		assert.equal(render(['a', strongNode('.b'), 'c']), 'a<!-- -->**.b**c');
		assert.equal(render([italic('a.'), 'b']), '*a.*<!-- -->b');
		assert.equal(render([strongNode('a'), strongNode('b'), 'c']), '**a**<!-- -->**b**c');
		assert.equal(renderHtml(render(['a', strongNode('.b'), 'c'])), '<p>a<!-- --><strong>.b</strong>c</p>');
	});
	test('escapes block markers and indentation after a newline in a later part', () => {
		for (const text of ['\n# injected', '\n---', '\n    code', '\n\tcode']) {
			const html = renderHtml(render([bold('x'), text]));
			assert.doesNotMatch(html, /<(?:h[1-6]|hr|pre)/);
		}
	});
	test('does not turn literal pipes into a table', () => {
		assert.doesNotMatch(renderHtml(render('a | b\n--- | ---\nx | y')), /<table/);
	});
	test('tracks indentation across raw and literal parts', () => {
		for (const value of [md`   ${'# injected'}`, md`   ${' x'}`, md`  ${'\tx'}`]) {
			assert.doesNotMatch(renderHtml(render(value)), /<(?:h[1-6]|pre)/);
		}
	});
	test('separates image and footnote delimiters across parts', () => {
		assert.equal(render(['!', link('/p', 'x')]), '!<!-- -->[x](/p)');
		for (const suffix of [':x', '(more)']) {
			assert.equal(render([footnoteRef('1'), suffix]), `[^1]<!-- -->${suffix}`);
		}
		assert.equal(render([footnoteRef('1'), inlineNode(() => '[more]')]), '[^1]<!-- -->[more]');
		assert.equal(render([raw(String.raw`\!`), link('/p', 'x')]), String.raw`\![x](/p)`);
	});
	test('normalizes boundary whitespace from non-raw nodes', () => {
		const value = render(['a ', bold(' \nb')]);
		assert.equal(value, 'a \n**b**');
		assert.doesNotMatch(renderHtml(value), /<br/);
		assert.doesNotMatch(renderHtml(render([bold('  '), bold('  '), 'text'])), /<pre/);
	});
	test('keeps raw boundaries verbatim', () => {
		assert.equal(render([raw('[x]'), raw('(/u)')]), '[x](/u)');
		assert.equal(renderHtml(render([raw('[x]'), raw('(/u)')])), '<p><a href="/u">x</a></p>');
		assert.equal(render([raw('!'), link('/u', 'x')]), '![x](/u)');
		assert.equal(render([footnoteRef('1'), raw('(x)')]), '[^1](x)');
	});
});
