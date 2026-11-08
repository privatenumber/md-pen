import assert from 'node:assert/strict';
import { describe, test } from 'manten';
import { parseFragment } from 'parse5';
import * as m from '../../../src/index.ts';
import { render } from '../../utils/render.ts';
import { element, type Block } from './tree.ts';
import { generator } from './generate.ts';
import { markdown } from './markdown.ts';
import { expectedDocument } from './expected.ts';
import { normalize } from './normalize.ts';
import { compact } from './whitespace.ts';

const seeds = [560_344_811, 800_992_447, 123_456_789, 3_908_954_110];
const documentCount = Number(process.env.MD_PEN_FUZZ_CASES?.trim() || 1000);
if (!Number.isSafeInteger(documentCount) || documentCount < 0) {
	throw new Error('MD_PEN_FUZZ_CASES must be a non-negative safe integer');
}
describe('seeded composition', () => {
	test('collapses whitespace across inline element boundaries', () => {
		const structure = (html: string) => compact(normalize(parseFragment(html)));
		const original = structure('<p>a <em><strong>b</strong></em></p>');
		const extraWhitespace = structure('<p>a <em> <strong>b</strong></em></p>');
		const missingWhitespace = structure('<p>a<em><strong>b</strong></em></p>');
		assert.deepStrictEqual(extraWhitespace, original);
		assert.notDeepStrictEqual(missingWhitespace, original);
		assert.deepStrictEqual(
			structure('<p>a<em> </em><strong> b</strong></p>'),
			structure('<p>a<em> </em><strong>b</strong></p>'),
		);
		assert.notDeepStrictEqual(structure('<p>a&nbsp;b</p>'), structure('<p>a b</p>'));
		assert.notDeepStrictEqual(structure('<pre><code>a  b</code></pre>'), structure('<pre><code>a b</code></pre>'));
		assert.deepStrictEqual(structure('<p>a<em>b </em></p>'), structure('<p>a<em>b</em></p>'));
		assert.deepStrictEqual(structure('<p>a<em> </em></p>'), structure('<p>a<em></em></p>'));
		assert.deepStrictEqual(structure('<p>a<br>b</p>'), structure('<p>a<br> b</p>'));
		assert.deepStrictEqual(structure('<p>a<br>b</p>'), structure('<p>a <br>b</p>'));
	});
	test('retains list item paragraph boundaries', () => {
		const structure = (html: string) => compact(normalize(parseFragment(html)));
		assert.notDeepStrictEqual(structure('<ul><li><p>a b</p></li></ul>'), structure('<ul><li><p>a</p><p>b</p></li></ul>'));
	});
	test('requires visible footnote references to resolve', () => {
		const reference = '<sup class="footnote-ref"><a href="#fn-f0">1</a></sup>';
		const section = '<section class="footnotes"><ol><li id="fn-f0">footnote</li></ol></section>';
		const structure = (html: string) => compact(normalize(parseFragment(html)));
		const expected = [element('ref', ['1'], { href: '#fn-f0' }), element('footnotes', [element('li', [], { id: 'fn-f0' })])];
		assert.deepStrictEqual(structure(reference + section), expected);
		assert.notDeepStrictEqual(structure(reference), expected);
		assert.notDeepStrictEqual(structure(reference.replace('>1</a>', '></a>') + section), expected);
	});
	for (const [seedIndex, seed] of seeds.entries()) {
		test(`seed ${seed}`, () => {
			const nextDocument = generator(seed);
			const count = Math.floor(documentCount / seeds.length)
				+ Number(seedIndex < documentCount % seeds.length);
			for (let index = 0; index < count; index += 1) {
				let tree: Block[] | undefined;
				let source: string | undefined;
				const context = () => `seed: ${seed}\ndocument: ${index}\ntree: ${JSON.stringify(tree)}\nmarkdown:\n${source ?? '(unavailable)'}`;
				try {
					tree = nextDocument();
					const references = new Set<string>();
					const body = tree.map(block => markdown(block, references)).join('\n\n');
					source = `${body}${[...references].map(id => `\n\n${m.footnote(id, 'footnote')}`).join('')}`;
					const wanted = compact(expectedDocument(tree));
					const fragment = parseFragment(render(source));
					const actual = compact(normalize(fragment));
					assert.deepStrictEqual(actual, wanted, `expected: ${JSON.stringify(wanted)}\nactual: ${JSON.stringify(actual)}`);
				} catch (error) {
					throw new Error(context(), { cause: error });
				}
			}
		});
	}
});
