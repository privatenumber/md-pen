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

- **Superlinear scaling (CI):** every run fails when a sweep step grows faster than linearly: when time grows by more than the input ratio raised to 1.5. Linear sweeps measure 0.97 to 1.11, and quadratic code measures about 2. All sizes of a sweep come from the same run, so the check works on any machine. Steps measured under 1 µs are skipped, because fixed overhead and timer noise dominate them. CI runs `pnpm bench:check`, which runs only the sweeps.
- **Constant-factor changes (by hand):** run `pnpm bench` on both revisions, on the same idle machine, and compare the printed results. Background load can change rows by several times, and sub-microsecond rows can move by more than 10% between identical runs, so repeat a run before treating a change as real.
