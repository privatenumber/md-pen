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
	if (singleLine.includes('$') || /\\[!"#$%&'()*+,./:;<=>?@[\]\\^_`{|}~-]/.test(singleLine) || singleLine.endsWith('\\')) {
		const delimiter = backtickDelimiter(singleLine, 1);
		const padding = singleLine.includes('`') ? ' ' : '';
		return `$${delimiter}${padding}${singleLine}${padding}${delimiter}$`;
	}
	return `$${singleLine}$`;
};

export const mathBlock = (expression: string) => {
	const normalized = expression.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	if (normalized === '') {
		return '';
	}
	const delimiter = backtickDelimiter(normalized, 3);
	return `${delimiter}math\n${normalized}\n${delimiter}`;
};
