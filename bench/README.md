# Benchmarks

Micro-benchmarks for md-pen's helpers.

```sh
pnpm bench
```

The suite has three parts:

- **Typical calls:** each helper with a short, realistic input, plus a document that composes every helper. These show per-call cost.
- **Scaling sweeps:** inputs built from patterns that make a naive scanner rescan text, such as unterminated HTML attributes, unclosed image brackets, stray `details` tags, and backslash runs. Each size is 16 times the previous one, so linear code takes about 16 times longer per step. A much larger jump means superlinear behavior.
- **Structural sweeps:** distinct backtick runs, nested `details()` output, and table row counts.

Before timing, the script asserts that each fixture still reaches the code path it targets, so a fixture that stops exercising it fails instead of producing misleading numbers. Fixtures are built outside the timed loops, and the script runs Node with `--expose-gc` so garbage is collected between iterations.

Sweep sizes stop at 256,000 characters on purpose. Beyond about 1 MB of string, V8's allocation cost grows superlinearly even for built-in string methods such as `replaceAll()`, which hides the complexity of the code under test.

Absolute numbers only compare on the same machine with the same Node version. Shared CI runners vary too much for that, which is why CI checks only scaling.

## Tracking regressions

Three mechanisms catch different kinds of regressions.

- **Pull request comparison (CI):** the Benchmark workflow runs the PR's benchmark files against the base revision's source and the head revision's source on the same runner, alternating twice, and writes a table to the job summary. Comparing two revisions in one job cancels most runner-to-runner noise. It only reports; it never fails the PR. Pushes to `develop` upload `results.json` as an artifact, which keeps a history of runner results.
- **Superlinear scaling (CI):** every run fails when a sweep step grows faster than linearly: when time grows by more than the input ratio raised to 1.5. Linear sweeps measure 0.97 to 1.11, and quadratic code measures about 2. All sizes of a sweep come from the same run, so the check works on any machine without stored baselines. CI runs `pnpm bench:check`, which runs only the sweeps and writes no files.
- **Constant-factor changes (same machine):** `pnpm bench` stores the results in `results.json`, prints every benchmark that changed by 10% or more since the stored run, and warns when the stored run used a different runtime or CPU. Commit `results.json` with the change, so its history records the numbers over time. Record results on an idle machine: background load can change rows by several times. Even then, sub-microsecond rows can move by more than 10% between identical runs, so rerun before treating a reported change as real.

## Recorded results

`pnpm bench` runs the suite, writes the table between the markers, and stores the same numbers in `results.json`. Treat the numbers as a same-machine reference: micro-benchmark results vary between runs, so compare repeated runs in the same environment instead of a single pair.

<!-- results:start -->
<!-- results:end -->
