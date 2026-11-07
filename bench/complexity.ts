import type { run } from 'mitata';

type Benchmarks = Awaited<ReturnType<typeof run>>['benchmarks'];

// Linear code has an exponent near 1 and quadratic code near 2. Linear sweeps
// measure up to about 1.1, so the margin absorbs noise and allocation effects.
const maximumExponent = 1.5;

// Clamp the denominator to limit noise from sub-microsecond measurements while
// still checking growth from a fast previous step.
const minimumNanoseconds = 1000;

// Each sweep has one argument, proportional to the input length.
const inputSize = (args: Record<string, unknown>) => Number(Object.values(args)[0]);

/**
 * Fails when a sweep exceeds the exponent threshold. All sizes of a sweep come
 * from the same run, so the check holds on any machine without stored baselines.
 */
export const assertLinear = (benchmarks: Benchmarks) => {
	const failures: string[] = [];
	for (const { runs } of benchmarks) {
		for (let index = 1; index < runs.length; index += 1) {
			const previous = runs[index - 1];
			const current = runs[index];
			const sizeRatio = inputSize(current.args) / inputSize(previous.args);
			const timeRatio = current.stats!.p50 / Math.max(previous.stats!.p50, minimumNanoseconds);
			const exponent = Math.log(timeRatio) / Math.log(sizeRatio);
			if (exponent > maximumExponent) {
				failures.push(`${previous.name} -> ${current.name}: ${timeRatio.toFixed(0)}x time for ${sizeRatio}x input (exponent ${exponent.toFixed(2)})`);
			}
		}
	}
	if (failures.length > 0) {
		throw new Error(`Superlinear scaling:\n${failures.join('\n')}`);
	}
};
