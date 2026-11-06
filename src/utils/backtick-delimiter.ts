export const backtickDelimiter = (expression: string, minimum: number) => {
	let length = minimum;
	for (const run of expression.matchAll(/`+/g)) {
		length = Math.max(length, run[0].length + 1);
	}
	return '`'.repeat(length);
};
