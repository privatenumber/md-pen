import { readFile, writeFile } from 'node:fs/promises';
import { commentMark } from 'comment-mark';
import type { run } from 'mitata';
import { bold, code, table } from '../src/index.ts';

type BenchmarkRun = Awaited<ReturnType<typeof run>>;

const formatTime = (nanoseconds: number) => {
	if (nanoseconds < 1000) {
		return `${nanoseconds.toFixed(2)} ns`;
	}
	if (nanoseconds < 1_000_000) {
		return `${(nanoseconds / 1000).toFixed(2)} µs`;
	}
	return `${(nanoseconds / 1_000_000).toFixed(2)} ms`;
};

export const writeResults = async ({ context, benchmarks }: BenchmarkRun) => {
	const rows: string[][] = [['Benchmark', 'avg', 'p75', 'p99']];
	for (const benchmark of benchmarks) {
		for (const result of benchmark.runs) {
			const { stats } = result;
			if (!stats) {
				throw new Error(`Benchmark "${result.name}" produced no statistics`);
			}
			rows.push([
				code(result.name),
				formatTime(stats.avg),
				formatTime(stats.p75),
				formatTime(stats.p99),
			]);
		}
	}

	const { version } = context as { version?: string };
	const date = new Date().toISOString().slice(0, 10);
	const recorded = [
		`Measured with ${code(`${context.runtime} ${version}`)} on ${bold(context.cpu.name ?? 'unknown CPU')} (${code(context.arch ?? 'unknown arch')}), ${date}.`,
		'',
		table(rows, { align: ['left', 'right', 'right', 'right'] }),
	].join('\n');

	const readmeUrl = new URL('README.md', import.meta.url);
	const readme = await readFile(readmeUrl, 'utf8');
	const updated = commentMark(readme, { results: recorded });
	if (updated === readme) {
		console.error('bench/README.md results are already up to date.');
		return;
	}

	await writeFile(readmeUrl, updated);
	console.error('Updated the results table in bench/README.md.');
};
