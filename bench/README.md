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

Compare runs made on the same machine with the same Node version. Only compare rows within one sweep, which share an input pattern.

## Recorded results

`pnpm bench` runs the suite and writes the table between the markers. Treat the numbers as a same-machine reference: micro-benchmark results vary between runs, so compare repeated runs in the same environment instead of a single pair.

<!-- results:start -->
Measured with `node 26.13.0` on __Apple M2 Max__ (`arm64-darwin`), 2026-11-06.

| Benchmark | avg | p75 | p99 |
| :- | -: | -: | -: |
| `escape - plain text` | 1.23 µs | 1.24 µs | 1.27 µs |
| `escape - punctuated text` | 2.80 µs | 2.83 µs | 2.85 µs |
| `bold - punctuated text` | 42.44 ns | 42.76 ns | 62.14 ns |
| `italic - punctuated text` | 2.59 µs | 2.61 µs | 2.65 µs |
| `code` | 186.00 ns | 187.84 ns | 210.16 ns |
| `codeBlock` | 131.85 ns | 132.03 ns | 160.01 ns |
| `link - with text` | 521.23 ns | 531.06 ns | 556.28 ns |
| `link - autolink` | 81.85 ns | 82.52 ns | 103.22 ns |
| `link - URL label` | 1.33 µs | 1.34 µs | 1.37 µs |
| `image` | 459.92 ns | 466.87 ns | 502.61 ns |
| `heading` | 118.94 ns | 119.64 ns | 137.38 ns |
| `ul - 10 items` | 1.17 µs | 1.18 µs | 1.21 µs |
| `table - 100 object rows` | 63.39 µs | 61.63 µs | 157.21 µs |
| `details` | 252.70 ns | 255.83 ns | 281.19 ns |
| `math` | 185.97 ns | 208.00 ns | 292.00 ns |
| `footnote` | 456.38 ns | 453.90 ns | 639.59 ns |
| `el` | 199.60 ns | 201.89 ns | 227.61 ns |
| `document - 10 sections` | 385.13 µs | 385.58 µs | 532.00 µs |
| `document - 100 sections` | 3.84 ms | 3.91 ms | 4.16 ms |
| `bold - unterminated attributes 1000` | 66.82 µs | 66.92 µs | 85.71 µs |
| `bold - unterminated attributes 16000` | 1.19 ms | 1.20 ms | 1.48 ms |
| `bold - unterminated attributes 256000` | 25.55 ms | 26.10 ms | 28.02 ms |
| `italic - unterminated comments 1000` | 33.67 µs | 33.67 µs | 43.96 µs |
| `italic - unterminated comments 16000` | 529.63 µs | 533.63 µs | 690.75 µs |
| `italic - unterminated comments 256000` | 8.27 ms | 8.45 ms | 8.61 ms |
| `link label - unclosed images 1000` | 25.00 µs | 24.83 µs | 34.42 µs |
| `link label - unclosed images 16000` | 393.46 µs | 393.75 µs | 581.71 µs |
| `link label - unclosed images 256000` | 12.14 ms | 14.51 ms | 14.93 ms |
| `link label - unterminated attributes 1000` | 118.16 µs | 118.58 µs | 152.25 µs |
| `link label - unterminated attributes 16000` | 1.93 ms | 1.94 ms | 2.15 ms |
| `link label - unterminated attributes 256000` | 34.23 ms | 34.74 ms | 35.53 ms |
| `details - stray details tags 1000` | 15.26 µs | 15.31 µs | 15.38 µs |
| `details - stray details tags 16000` | 237.06 µs | 237.96 µs | 364.21 µs |
| `details - stray details tags 256000` | 3.93 ms | 4.10 ms | 4.72 ms |
| `kbd - backslashes 1000` | 562.78 ns | 569.36 ns | 595.17 ns |
| `kbd - backslashes 16000` | 5.80 µs | 5.83 µs | 5.91 µs |
| `kbd - backslashes 256000` | 88.80 µs | 89.29 µs | 101.42 µs |
| `escape - backslashes 1000` | 22.51 µs | 22.56 µs | 22.63 µs |
| `escape - backslashes 16000` | 349.26 µs | 348.13 µs | 605.17 µs |
| `escape - backslashes 256000` | 6.14 ms | 6.64 ms | 7.14 ms |
| `escape - whitespace 1000` | 1.88 µs | 1.90 µs | 1.92 µs |
| `escape - whitespace 16000` | 18.69 µs | 18.30 µs | 19.99 µs |
| `escape - whitespace 256000` | 277.84 µs | 280.42 µs | 305.96 µs |
| `table cell - escaped pipes 1000` | 19.19 µs | 19.12 µs | 19.35 µs |
| `table cell - escaped pipes 16000` | 300.79 µs | 301.58 µs | 484.42 µs |
| `table cell - escaped pipes 256000` | 4.87 ms | 4.98 ms | 5.32 ms |
| `code - distinct backtick runs 16` | 638.31 ns | 646.70 ns | 674.00 ns |
| `code - distinct backtick runs 64` | 2.93 µs | 2.94 µs | 2.99 µs |
| `code - distinct backtick runs 256` | 23.03 µs | 23.06 µs | 23.36 µs |
| `math - distinct backtick runs 16` | 657.10 ns | 664.19 ns | 783.25 ns |
| `math - distinct backtick runs 64` | 2.86 µs | 2.88 µs | 2.92 µs |
| `math - distinct backtick runs 256` | 21.36 µs | 21.44 µs | 21.61 µs |
| `details - nested pairs 10` | 3.93 µs | 3.95 µs | 3.99 µs |
| `details - nested pairs 100` | 39.67 µs | 39.61 µs | 40.77 µs |
| `details - nested pairs 1000` | 390.48 µs | 393.75 µs | 562.13 µs |
| `table - object rows 100` | 77.63 µs | 78.00 µs | 100.13 µs |
| `table - object rows 1000` | 793.50 µs | 800.50 µs | 1.03 ms |
| `table - object rows 10000` | 8.78 ms | 8.97 ms | 9.45 ms |
<!-- results:end -->
