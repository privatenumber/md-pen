const backtickDelimiter = (expression: string, minimum: number) => {
	let length = minimum;
	for (const run of expression.matchAll(/`+/g)) {
		length = Math.max(length, run[0].length + 1);
	}
	return '`'.repeat(length);
};

const hasMarkdownSyntax = (expression: string) => /[*`[\]<>~$|@]/.test(expression)
	|| /&(?:[a-z][a-z\d]*|#\d+|#x[\da-f]+);/i.test(expression)
	|| /(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/u.test(expression)
	|| /\\(?:[!"#$%&'()*+,./:;<=>?@[\]\\^_`{|}~\n-]|$)/.test(expression)
	|| /https?:\/\/|ftp:\/\/|www\./i.test(expression);

export const math = (expression: string) => {
	const singleLine = expression.replaceAll(/[\r\n]+/g, ' ').trim();
	if (singleLine === '') {
		return '';
	}
	if (hasMarkdownSyntax(singleLine)) {
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
	const separator = normalized.endsWith('\n') ? '' : '\n';
	const lines = separator ? normalized : normalized.slice(0, -1);
	if (!hasMarkdownSyntax(normalized) && !/^(?:[ \t]*$| {0,3}\t| {4}| {0,3}(?:#{1,6}(?:[ \t]|$)|>|[-+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|(?:=+|:?-+:?)[ \t]*$))/m.test(lines)) {
		return `$$\n${normalized}${separator}$$`;
	}
	const delimiter = backtickDelimiter(normalized, 3);
	return `${delimiter}math\n${normalized}${separator}${delimiter}`;
};
