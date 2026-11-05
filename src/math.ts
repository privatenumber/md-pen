const escapeMath = (expression: string) => expression.replaceAll('$', (_match, offset: number) => {
	let backslashes = 0;
	while (offset > backslashes && expression[offset - backslashes - 1] === '\\') {
		backslashes += 1;
	}
	return backslashes % 2 === 0 ? String.raw`\$` : '$';
});

const backtickDelimiter = (expression: string, minimum: number) => {
	let length = minimum;
	for (const run of expression.matchAll(/`+/g)) {
		length = Math.max(length, run[0].length + 1);
	}
	return '`'.repeat(length);
};

export const math = (expression: string) => {
	const singleLine = expression.replaceAll(/[\r\n]+/g, ' ').trim();
	if (singleLine === '') {
		return '';
	}
	const escaped = escapeMath(singleLine);
	if (singleLine.includes('$')) {
		const delimiter = backtickDelimiter(escaped, 1);
		const padding = escaped.includes('`') ? ' ' : '';
		return `$${delimiter}${padding}${escaped}${padding}${delimiter}$`;
	}
	return `$${escaped}$`;
};

export const mathBlock = (expression: string) => {
	const normalized = expression.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	const noBlankLines = normalized.split('\n').filter(line => line.trim()).join('\n');
	if (noBlankLines === '') {
		return '';
	}
	const escaped = escapeMath(noBlankLines);
	if (noBlankLines.includes('$') || noBlankLines.endsWith('\\')) {
		const delimiter = backtickDelimiter(escaped, 3);
		return `${delimiter}math\n${escaped}\n${delimiter}`;
	}
	return `$$\n${escaped}\n$$`;
};
