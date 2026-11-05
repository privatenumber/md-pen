export const heading = (
	text: string,
	level: 1 | 2 | 3 | 4 | 5 | 6 = 1,
) => {
	const singleLine = text.replaceAll(/[\r\n]+/g, ' ');
	const end = singleLine.trimEnd().length;
	let hashStart = end;
	while (hashStart > 0 && singleLine[hashStart - 1] === '#') {
		hashStart -= 1;
	}
	let slashStart = hashStart;
	while (slashStart > 0 && singleLine[slashStart - 1] === '\\') {
		slashStart -= 1;
	}
	const safeText = hashStart < end && (hashStart - slashStart) % 2 === 0
		? `${singleLine.slice(0, hashStart)}\\${singleLine.slice(hashStart, end)}`
		: singleLine;
	return `${'#'.repeat(level)} ${safeText}`;
};

export const h1 = (text: string) => heading(text, 1);
export const h2 = (text: string) => heading(text, 2);
export const h3 = (text: string) => heading(text, 3);
export const h4 = (text: string) => heading(text, 4);
export const h5 = (text: string) => heading(text, 5);
export const h6 = (text: string) => heading(text, 6);
