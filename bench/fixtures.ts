import * as md from '../src/index.ts';

// Short user-provided text with most characters the escapers handle.
export const userText = 'Fix #12: handle *edge* cases in `parse()` when input has <html> & [links](x) — thanks @user! :tada: Costs $5.';

export const plainText = 'The quick brown fox jumps over the lazy dog and keeps running far away';

export const tableRows = Array.from({ length: 100 }, (_, index) => ({
	package: `pkg-${index}`,
	version: `1.${index}.0`,
	notes: userText,
}));

// A changelog-style document that composes every helper, as a typical caller would.
export const buildDocument = (sections: number) => {
	const parts = [md.h1('Release report')];
	for (let index = 0; index < sections; index += 1) {
		parts.push(
			md.h2(`Section ${index}`),
			md.escape(userText),
			`${md.bold('Status:')} ${md.code('ok')} ${md.link(`https://example.com/issues/${index}`, md.escape(`Issue #${index}`))}`,
			md.ul([md.escape(userText), [md.italic(md.escape(plainText)), md.strikethrough('old')], md.link(`https://example.com/${index}`)]),
			md.taskList([[true, 'done'], [false, md.escape(userText)]]),
			md.table(tableRows.slice(0, 20), { align: ['left', 'right', 'none'] }),
			md.details(`Details ${index}`, md.codeBlock(`const x = ${index};\n// </details> in code`, 'ts')),
			md.alert('note', md.escape(userText)),
			`${md.math('x^2 + y_1')} ${md.kbd('Ctrl')} ${md.image(`https://example.com/badge/${index}.svg`, 'badge')} ${md.footnoteRef(`n${index}`)}`,
			md.footnote(`n${index}`, md.escape(userText)),
			md.hr(),
		);
	}
	return parts.join('\n\n');
};

// Adversarial inputs for the scanners. Each repeats a pattern that a naive
// implementation would rescan, so it shows up as superlinear growth.
export const adversarial = {
	// Opening image brackets without destinations exercise the label bracket stack.
	'unclosed images': '![',
	// Stray details tags that the outer details() call must neutralize.
	'stray details tags': '</details><details>',
	// Backslashes without HTML punctuation; a backtracking regex goes quadratic here.
	backslashes: '\\',
	// Escaped pipes exercise the table cell backslash parity scan.
	'escaped pipes': String.raw`\|`,
} as const;

export type Pattern = keyof typeof adversarial;

export const repeatTo = (pattern: string, size: number) => (
	pattern.repeat(Math.ceil(size / pattern.length)).slice(0, size)
);

export const unterminatedAttribute = (size: number) => `<a b="${'x'.repeat(size - 7)}[`;

export const whitespace = (size: number, trailing: boolean) => `x${' '.repeat(size - 2)}${trailing ? ' ' : 'x'}`;

// After one matched pair, backtick runs increase in length without matching.
export const distinctBacktickRuns = (size: number) => {
	// The matching single-backtick pair protects the bracket; later runs are distinct.
	let result = '`[` ';
	for (let length = 2; result.length + length + 2 <= size; length += 1) {
		result += `${'`'.repeat(length)}a `;
	}
	return result;
};

export const nestedDetails = (depth: number) => {
	let content = 'content';
	for (let index = 0; index < depth; index += 1) {
		content = md.details(`level ${index}`, content);
	}
	return content;
};
