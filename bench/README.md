# Benchmarks

Micro-benchmarks for md-pen's helpers.

```sh
pnpm bench
```

The suite has three parts:

- **Typical calls:** selected helpers with short, realistic inputs, plus a document that composes many helpers. These show per-call cost.
- **Scaling sweeps:** inputs built from patterns that make a naive scanner rescan text, such as unterminated HTML attributes, unclosed image brackets, stray `details` tags, and backslash runs. Each size is 4 times the previous one, so linear code takes about 4 times longer per step. A much larger jump means superlinear behavior.
- **Structural sweeps:** distinct backtick runs, nested `details()` output, and table row counts.

Before timing, the script sanity-checks that representative fixtures render as expected. These checks do not prove which internal paths run. Fixtures are built outside the timed loops. The script runs Node with `--expose-gc`, allowing mitata to collect garbage once after warmup by default.

Sweep sizes stop at 128,000 characters on purpose. Beyond about 1 MB of string, V8's allocation cost grows superlinearly even for built-in string methods such as `replaceAll()`, which hides the complexity of the code under test.

Absolute numbers only compare on the same machine with the same Node version. Shared CI runners vary too much for that, which is why CI checks only scaling.

## Tracking regressions

- **Scaling threshold (CI):** a run fails when a sweep step's measured exponent exceeds 1.5: time grows by more than the input ratio raised to 1.5. The gate catches growth clearly above n^1.5, such as quadratic growth and worse, but can miss n^1.5 or n log n. Linear code has an exponent near 1, and quadratic code near 2. All sizes of a sweep come from the same run. CI runs `pnpm bench:check`, which runs only the sweeps.
- **Constant-factor changes (by hand):** run `pnpm bench` on both revisions, on the same idle machine, and compare the printed results. Background load can change rows by several times, and sub-microsecond rows can move by more than 10% between identical runs, so repeat a run before treating a change as real.
