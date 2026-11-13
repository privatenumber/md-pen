import assert from 'node:assert/strict';
import { describe, onFinish, test } from 'manten';
import { parseFragment } from 'parse5';
import * as m from '../../../src/index.ts';
import { render } from '../../utils/render.ts';
import { element, type Block, type Structure } from './tree.ts';
import { generator } from './generate.ts';
import { markdown } from './markdown.ts';
import { expectedDocument, literalText } from './expected.ts';
import { normalize } from './normalize.ts';
import { compact } from './whitespace.ts';

const seeds = [560_344_811, 800_992_447, 123_456_789, 3_908_954_110];
const documentCount = Number(process.env.MD_PEN_FUZZ_CASES?.trim() || 1000);
if (!Number.isSafeInteger(documentCount) || documentCount < 0) {
	throw new Error('MD_PEN_FUZZ_CASES must be a non-negative safe integer');
}
const firstDifference = (wanted: Structure[], actual: Structure[]): string => {
	for (let index = 0; index < Math.max(wanted.length, actual.length); index += 1) {
		const left = wanted[index];
		const right = actual[index];
		if (left === undefined || right === undefined) { return 'different number of elements'; }
		if (typeof left === 'string' && typeof right === 'string') {
			if (left !== right) { return 'text'; }
			continue;
		}
		if (typeof left === 'string' || typeof right === 'string') { return 'text versus element'; }
		if (left.tag !== right.tag) { return `${left.tag} versus ${right.tag}`; }
		if (JSON.stringify(left.attributes) !== JSON.stringify(right.attributes)) { return `${left.tag} attributes`; }
		const nested = firstDifference(left.children, right.children);
		if (nested) { return nested; }
	}
	return '';
};
describe('seeded composition', () => {
	const metrics = {
		separators: 0,
		bytes: 0,
		documents: 0,
	};
	const differences = new Map<string, { count: number;
		example: string; }>();
	onFinish(() => {
		const { documents, separators, bytes } = metrics;
		const percentage = bytes ? ((separators * 8 * 100) / bytes).toFixed(2) : '0.00';
		console.log(`Fuzz output: ${documents} documents, ${separators} separators, ${bytes} bytes, ${percentage}% separator bytes`);
		for (const [difference, details] of differences) {
			console.log(`Mismatch ${difference}: ${details.count}\n${details.example}`);
		}
	});
	test('detects literal text corruption in the serializer', () => {
		assert.throws(() => literalText('alpha', text => m.render(text).replace('a', 'z')), /Literal text changed/);
		assert.doesNotThrow(() => literalText('a\r\n  b @someone'));
	});
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
		assert.deepStrictEqual(structure('<p>a<!-- -->b</p>'), structure('<p>ab</p>'));
	});
	test('retains list item paragraph boundaries', () => {
		const structure = (html: string) => compact(normalize(parseFragment(html)));
		assert.notDeepStrictEqual(structure('<ul><li><p>a b</p></li></ul>'), structure('<ul><li><p>a</p><p>b</p></li></ul>'));
	});
	test('flattens same-type nesting and keeps siblings distinct', () => {
		const tree: Block[] = [{
			kind: 'paragraph',
			child: {
				kind: 'sequence',
				children: [
					{
						kind: 'bold',
						child: {
							kind: 'bold',
							child: {
								kind: 'word',
								text: 'a',
							},
						},
					},
					{
						kind: 'bold',
						child: {
							kind: 'word',
							text: 'b',
						},
					},
				],
			},
		}];
		const wanted = [element('p', [element('strong', ['a']), element('strong', ['b'])])];
		assert.deepStrictEqual(compact(expectedDocument(tree)), wanted);
		const actual = compact(normalize(parseFragment(render(markdown(tree[0], new Set())))));
		assert.deepStrictEqual(actual, wanted);
	});
	test('preserves full-span emphasis order', () => {
		const structure = (html: string) => compact(normalize(parseFragment(html)));
		assert.notDeepStrictEqual(structure('<strong><em>x</em></strong>'), structure('<em><strong>x</strong></em>'));
		assert.notDeepStrictEqual(structure('<del><strong><em>x</em></strong></del>'), structure('<em><del><strong>x</strong></del></em>'));
		assert.notDeepStrictEqual(structure('<strong>a<em>x</em></strong>'), structure('<em><strong>ax</strong></em>'));
	});
	test('escapes adjacent literal leaves as one run across nested sequences', () => {
		const tree: Block[] = [{
			kind: 'paragraph',
			child: {
				kind: 'sequence',
				children: [
					{
						kind: 'literal',
						text: ':smile:',
					},
					{
						kind: 'sequence',
						children: [{
							kind: 'literal',
							text: 'https://example.com/x',
						}],
					},
				],
			},
		}];
		const actual = compact(normalize(parseFragment(render(markdown(tree[0], new Set())))));
		assert.deepStrictEqual(actual, compact(expectedDocument(tree)));
	});
	test('merges word and literal leaves across flattened emphasis in a link', () => {
		const tree: Block[] = [{
			kind: 'paragraph',
			child: {
				kind: 'strike',
				child: {
					kind: 'link',
					child: {
						kind: 'sequence',
						children: [{
							kind: 'word',
							text: 'gamma',
						}, {
							kind: 'strike',
							child: {
								kind: 'literal',
								text: '@someone',
							},
						}],
					},
				},
			},
		}];
		const wanted = [element('p', [element('del', [element('a', ['gamma@someone'], { href: '/target' })])])];
		assert.deepStrictEqual(compact(expectedDocument(tree)), wanted);
		const actual = compact(normalize(parseFragment(render(markdown(tree[0], new Set())))));
		assert.deepStrictEqual(actual, wanted);
	});
	test('preserves table columns and inline code spaces', () => {
		const tree: Block[] = [{
			kind: 'table',
			rows: [
				[{
					kind: 'word',
					text: 'command',
				}, {
					kind: 'word',
					text: 'description',
				}],
				[{
					kind: 'code',
					text: 'a  b',
				}, {
					kind: 'code',
					text: ' a\r\nb ',
				}],
			],
		}];
		const source = markdown(tree[0], new Set());
		const structure = (html: string) => compact(normalize(parseFragment(html)));
		const html = render(source);
		assert.deepStrictEqual(structure(html), compact(expectedDocument(tree)));
		assert.notDeepStrictEqual(structure(html.replace('<code>a  b</code>', '<code>a b</code>')), structure(html));
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
			let failed = 0;
			let firstError: unknown;
			for (let index = 0; index < count; index += 1) {
				let tree: Block[] | undefined;
				let source: string | undefined;
				let classified = false;
				const context = () => `seed: ${seed}\ndocument: ${index}\ntree: ${JSON.stringify(tree)}\nmarkdown:\n${source ?? '(unavailable)'}`;
				try {
					tree = nextDocument();
					const references = new Set<string>();
					const body = tree.map(block => markdown(block, references)).join('\n\n');
					source = `${body}${[...references].map(id => `\n\n${m.footnote(id, 'footnote')}`).join('')}`;
					metrics.documents += 1;
					metrics.separators += source.split('<!-- -->').length - 1;
					metrics.bytes += Buffer.byteLength(source);
					const wanted = compact(expectedDocument(tree));
					const fragment = parseFragment(render(source));
					const actual = compact(normalize(fragment));
					const difference = firstDifference(wanted, actual);
					if (difference) {
						const entry = differences.get(difference) ?? {
							count: 0,
							example: `${context()}\nexpected: ${JSON.stringify(wanted)}\nactual: ${JSON.stringify(actual)}`,
						};
						entry.count += 1;
						differences.set(difference, entry);
						classified = true;
					}
					assert.deepStrictEqual(actual, wanted, `expected: ${JSON.stringify(wanted)}\nactual: ${JSON.stringify(actual)}`);
				} catch (error) {
					if (!classified) {
						const entry = differences.get('exception') ?? {
							count: 0,
							example: `${context()}\n${String(error)}`,
						};
						entry.count += 1;
						differences.set('exception', entry);
					}
					failed += 1;
					firstError ??= new Error(context(), { cause: error });
				}
			}
			if (failed) { throw new Error(`${failed}/${count} documents failed`, { cause: firstError }); }
		});
	}
});
