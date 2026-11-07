// Compares benchmark runs of a base and a head revision, made on the same
// machine, and prints a Markdown report. Exits with failure when a benchmark
// slowed down by the regression threshold or more. Usage:
//   node bench/compare.ts --base a.json --base b.json --head c.json --head d.json
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { code, table } from '../src/index.ts';
import { formatTime, type Recorded } from './results.ts';

// A change below this share is treated as noise in the report.
const noticeableChange = 0.1;

// Comparisons of identical code on GitHub-hosted runners moved by up to 14%, so
// the threshold leaves about twice that margin.
const regressionThreshold = 0.3;

const { values } = parseArgs({
	options: {
		base: {
			type: 'string',
			multiple: true,
		},
		head: {
			type: 'string',
			multiple: true,
		},
	},
});

// The lowest median across repeated runs, because noise only ever adds time.
const fastestMedians = async (files: string[] = []) => {
	const fastest = new Map<string, number>();
	for (const file of files) {
		const { results } = JSON.parse(await readFile(file, 'utf8')) as Recorded;
		for (const [name, { p50 }] of Object.entries(results)) {
			fastest.set(name, Math.min(fastest.get(name) ?? Infinity, p50));
		}
	}
	return fastest;
};

const base = await fastestMedians(values.base);
const head = await fastestMedians(values.head);

const rows = [...head]
	.filter(([name]) => base.has(name))
	.map(([name, time]) => ({
		name,
		base: base.get(name)!,
		head: time,
		change: time / base.get(name)! - 1,
	}))
	.sort((a, b) => b.change - a.change);

const noticeable = rows.filter(({ change }) => Math.abs(change) >= noticeableChange);
const formatChange = (change: number) => `${change > 0 ? '+' : ''}${(change * 100).toFixed(0)}%`;

console.log([
	'## Benchmarks',
	'',
	noticeable.length === 0
		? `No benchmark changed by ${noticeableChange * 100}% or more.`
		: `${noticeable.length} of ${rows.length} benchmarks changed by ${noticeableChange * 100}% or more. Rows under 1 µs are noisy.`,
	'',
	'Medians on one runner, base and head alternating; the lower of the repeated runs is kept.',
	'',
	table(
		[
			['Benchmark', 'Base', 'Head', 'Change'],
			...rows.map(row => [
				code(row.name),
				formatTime(row.base),
				formatTime(row.head),
				formatChange(row.change),
			]),
		],
		{ align: ['left', 'right', 'right', 'right'] },
	),
].join('\n'));

const regressions = rows.filter(({ change }) => change >= regressionThreshold);
if (regressions.length > 0) {
	console.error(`Slowed down by ${regressionThreshold * 100}% or more:`);
	for (const { name, change } of regressions) {
		console.error(`  ${formatChange(change)}  ${name}`);
	}
	process.exitCode = 1;
}
