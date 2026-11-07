const tag = /<(\/?)details(?=[\s/>]|$)/gi;
// The head and tail shapes details() emits, matched by shape rather than origin;
// summaries and attributes escape line endings.
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
	// Every opener token goes on the stack, so a closer pairs only with the nearest
	// one, approximating HTML nesting without parsing Markdown context. A closer whose
	// nearest opener was rejected stays neutralized instead of reaching past it to an
	// earlier head.
	const openers: {
		index: number;
		live: boolean;
	}[] = [];
	for (const { 1: slash, index } of text.matchAll(tag)) {
		if (!slash) {
			openers.push({
				index,
				live: (index === 0 || text[index - 1] === '\n') && matchesAt(opener, text, index),
			});
		} else if (text.slice(index - 2, index) === '\n\n' && openers.length > 0 && matchesAt(closer, text, index)) {
			const head = openers.pop()!;
			if (head.live) {
				preserved.add(head.index).add(index);
			}
		}
	}
	return text.replaceAll(tag, (match, _slash, offset: number) => (preserved.has(offset) ? match : `<\u200B${match.slice(1)}`));
};
