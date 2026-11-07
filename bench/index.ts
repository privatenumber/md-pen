import assert from 'node:assert/strict';
import { bench, run, summary } from 'mitata';
import * as md from '../src/index.ts';
import {
	adversarial, buildDocument, distinctBacktickRuns, nestedDetails,
	plainText, repeatTo, tableRows, userText,
	type Pattern,
} from './fixtures.ts';
import { assertLinear } from './complexity.ts';

type BenchState = {
	get: (name: string) => number;
};

// Verify each fixture still exercises the intended path before timing, so a
// fixture that stops reaching it fails loudly instead of skewing the numbers.
assert.strictEqual(md.details('s', nestedDetails(100)).split('<details>').length - 1, 101, 'nested pairs stay live');
assert.ok(md.details('s', adversarial['stray details tags']).includes('<\u200B/details>'), 'stray tags are neutralized');
assert.strictEqual(md.kbd(repeatTo(adversarial.backslashes, 1000)), `<kbd>${'\\'.repeat(1000)}</kbd>`, 'backslashes pass through');
assert.ok(md.table([['h'], [repeatTo(adversarial['escaped pipes'], 4)]]).endsWith(String.raw`| \|\| |`), 'escaped pipes stay escaped once');
assert.ok(md.link('u', adversarial['unclosed images']).includes(String.raw`!\[`), 'unclosed image brackets are escaped');
assert.ok(buildDocument(1).length > 1000, 'document fixture renders');

// `--check` runs only the scaling sweeps. CI uses it to
// catch superlinear regressions without depending on runner speed.
const check = process.argv.includes('--check');

// Typical calls with short inputs. Rows use different inputs, so compare each
// row with its own earlier runs, not with other rows.
if (!check) {
	bench('escape - plain text', () => md.escape(plainText));
	bench('escape - punctuated text', () => md.escape(userText));
	// The text has no `_`, so bold() wraps it directly; it contains `*`, so italic() uses HTML.
	bench('bold - punctuated text', () => md.bold(userText));
	bench('italic - punctuated text', () => md.italic(userText));
	bench('code', () => md.code('const x = `a`;'));
	bench('codeBlock', () => md.codeBlock('const x = 1;\n```\n', 'ts'));
	bench('link - with text', () => md.link('https://example.com/a?b=1&c=2', 'Example'));
	bench('link - autolink', () => md.link('https://example.com/a?b=1&c=2'));
	bench('link - URL label', () => md.link('/docs/guide a b'));
	bench('image', () => md.image('https://example.com/badge.svg', 'badge'));
	bench('heading', () => md.h2(userText));
	bench('ul - 10 items', () => md.ul(Array.from({ length: 10 }, (_, index) => `item ${index}`)));
	bench('table - 100 object rows', () => md.table(tableRows));
	bench('details', () => md.details('Summary', userText));
	bench('math', () => md.math('x^2 + y_1'));
	bench('footnote', () => md.footnote('note-1', userText));
	bench('el', () => md.el('div', { id: 'a' }, 'content'));

	// A realistic document that composes every helper.
	bench('document - $sections sections', function* document(state: BenchState) {
		const sections = state.get('sections');
		yield () => buildDocument(sections);
	}).args('sections', [10, 100]);
}

// Scaling sweeps. Each size is 16x the previous one, so linear code takes about
// 16x longer per step; a much larger jump means superlinear behavior. Sizes stay
// at or below 256k characters: beyond about 1 MB of string, V8 allocation costs
// grow superlinearly even for built-in string methods, which hides the code's own
// complexity.
const sizes = [1000, 16_000, 256_000];

const sweeps: [string, Pattern, (input: string) => string][] = [
	['link label', 'unclosed images', input => md.link('u', input)],
	['link label', 'unterminated attributes', input => md.link('u', input)],
	['details', 'stray details tags', input => md.details('s', input)],
	['kbd', 'backslashes', md.kbd],
	['escape', 'backslashes', md.escape],
	['escape', 'whitespace', md.escape],
	['table cell', 'escaped pipes', input => md.table([['h'], [input]])],
];

for (const [name, pattern, format] of sweeps) {
	summary(() => {
		bench(`${name} - ${pattern} $size`, function* sweep(state: BenchState) {
			const input = repeatTo(adversarial[pattern], state.get('size'));
			yield () => format(input);
		}).args('size', sizes);
	});
}

summary(() => {
	bench('code - distinct backtick runs $size', function* backticks(state: BenchState) {
		const input = distinctBacktickRuns(state.get('size'));
		yield () => md.code(input);
	}).args('size', sizes);
});

summary(() => {
	bench('math - distinct backtick runs $size', function* backticks(state: BenchState) {
		const input = distinctBacktickRuns(state.get('size'));
		yield () => md.math(input);
	}).args('size', sizes);
});

// One details() call over content that already holds nested details() output.
summary(() => {
	bench('details - nested pairs $depth', function* nested(state: BenchState) {
		const input = nestedDetails(state.get('depth'));
		yield () => md.details('s', input);
	}).args('depth', [10, 100, 1000]);
});

summary(() => {
	bench('table - object rows $rows', function* rows(state: BenchState) {
		const input = Array.from({ length: state.get('rows') }, (_, index) => ({
			...tableRows[index % tableRows.length],
			id: index,
		}));
		yield () => md.table(input);
	}).args('rows', [100, 1000, 10_000]);
});

// `throw` rejects the run when a benchmark fails, so a broken benchmark
// cannot pass silently.
const benchmarkRun = await run({ throw: true });

assertLinear(benchmarkRun.benchmarks);
