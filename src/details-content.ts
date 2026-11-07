const tag = /<(\/?)details(?=[\s/>]|$)/gi;
// The exact head and tail details() emits; summaries and attributes escape line endings.
const opener = /<details(?:[ \t]+[^\s"'<>/=]+="[^"\r\n>]*")*>\n<summary>[^<\r\n]*<\/summary>\n\n/iy;
const closer = /<\/details>(?:\n|$)/iy;

const matchesAt = (pattern: RegExp, text: string, offset: number) => {
	pattern.lastIndex = offset;
	return pattern.test(text);
};

// Nested details() calls already neutralized their own content.
// Keep tags shaped like that output when they pair up; neutralize the rest.
export const protectDetailsContent = (text: string) => {
	const preserved = new Set<number>();
	const openers: number[] = [];
	for (const { 1: slash, index } of text.matchAll(tag)) {
		if (!slash) {
			if ((index === 0 || text[index - 1] === '\n') && matchesAt(opener, text, index)) {
				openers.push(index);
			}
		} else if (text.slice(index - 2, index) === '\n\n' && openers.length > 0 && matchesAt(closer, text, index)) {
			preserved.add(openers.pop()!).add(index);
		}
	}
	return text.replaceAll(tag, (match, _slash, offset: number) => (preserved.has(offset) ? match : `<\u200B${match.slice(1)}`));
};
