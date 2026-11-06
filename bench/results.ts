import { readFile, writeFile } from 'node:fs/promises';
import { commentMark } from 'comment-mark';
import type { run } from 'mitata';
import { bold, code, table } from '../src/index.ts';

type BenchmarkRun = Awaited<ReturnType<typeof run>>;

type Recorded = {
	environment: string;
	date: string;
	results: Record<string, {
		avg: number;
		p75: number;
		p99: number;
	}>;
};

// A change below this share is within run-to-run noise on one machine.
const noticeableChange = 0.1;

const formatTime = (nanoseconds: number) => {
	if (nanoseconds < 1000) {
		return `${nanoseconds.toFixed(2)} ns`;
	}
	if (nanoseconds < 1_000_000) {
		return `${(nanoseconds / 1000).toFixed(2)} µs`;
	}
	return `${(nanoseconds / 1_000_000).toFixed(2)} ms`;
};

// Two decimals of a nanosecond keep results.json diffs readable.
const round = (nanoseconds: number) => Math.round(nanoseconds * 100) / 100;

const resultsUrl = new URL('results.json', import.meta.url);
const readmeUrl = new URL('README.md', import.meta.url);

const readPrevious = async (): Promise<Recorded | undefined> => {
	try {
		return JSON.parse(await readFile(resultsUrl, 'utf8')) as Recorded;
	} catch (error) {
		// The first run has no stored results to compare with.
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return undefined;
		}
		throw error;
	}
};

// Prints how each benchmark moved since the stored results, largest change first.
const reportChanges = (previous: Recorded, current: Recorded) => {
	if (previous.environment !== current.environment) {
		console.error(`Stored results come from ${previous.environment}; this run uses ${current.environment}. Changes below compare different environments.`);
	}
	const changes = Object.entries(current.results)
		.filter(([name]) => previous.results[name])
		.map(([name, { avg }]) => [name, avg / previous.results[name].avg - 1] as const)
		.filter(([, change]) => Math.abs(change) >= noticeableChange)
		.sort((a, b) => b[1] - a[1]);
	if (changes.length === 0) {
		console.error(`No benchmark changed by ${noticeableChange * 100}% or more since ${previous.date}.`);
		return;
	}
	console.error(`Changes since ${previous.date} (avg):`);
	for (const [name, change] of changes) {
		console.error(`  ${change > 0 ? '+' : ''}${(change * 100).toFixed(0)}%  ${name}`);
	}
};

export const writeResults = async ({ context, benchmarks }: BenchmarkRun) => {
	const { version } = context as { version?: string };
	const current: Recorded = {
		environment: `${context.runtime} ${version} on ${context.cpu.name ?? 'unknown CPU'} (${context.arch ?? 'unknown arch'})`,
		date: new Date().toISOString().slice(0, 10),
		results: {},
	};
	const rows: string[][] = [['Benchmark', 'avg', 'p75', 'p99']];
	for (const benchmark of benchmarks) {
		for (const result of benchmark.runs) {
			const { stats } = result;
			if (!stats) {
				throw new Error(`Benchmark "${result.name}" produced no statistics`);
			}
			current.results[result.name] = {
				avg: round(stats.avg),
				p75: round(stats.p75),
				p99: round(stats.p99),
			};
			rows.push([
				code(result.name),
				formatTime(stats.avg),
				formatTime(stats.p75),
				formatTime(stats.p99),
			]);
		}
	}

	const previous = await readPrevious();
	if (previous) {
		reportChanges(previous, current);
	}

	const recorded = [
		`Measured with ${code(`${context.runtime} ${version}`)} on ${bold(context.cpu.name ?? 'unknown CPU')} (${code(context.arch ?? 'unknown arch')}), ${current.date}.`,
		'',
		table(rows, { align: ['left', 'right', 'right', 'right'] }),
	].join('\n');
	const readme = await readFile(readmeUrl, 'utf8');
	await writeFile(readmeUrl, commentMark(readme, { results: recorded }));
	await writeFile(resultsUrl, `${JSON.stringify(current, null, '\t')}\n`);
	console.error('Updated bench/README.md and bench/results.json.');
};
