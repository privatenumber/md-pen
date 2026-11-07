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
	// Every opener goes on the stack, so a closer pairs only with the nearest one,
	// as in HTML. A closer whose nearest opener was rejected stays neutralized
	// instead of reaching past it to an earlier head, such as one in a code example.
	const openers: {
		index: number;
		live: boolean;
	}[] = [];
	let fence = '';
	for (const { 0: line, index: start } of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
		const marker = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)/.exec(line);
		if (fence) {
			if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && /^[ \t]*$/.test(marker[2])) {
				fence = '';
			}
			continue;
		}
		if (marker && (marker[1][0] === '~' || !marker[2].includes('`'))) {
			fence = marker[1];
			continue;
		}
		for (const { 1: slash, index: offset } of line.matchAll(tag)) {
			const index = start + offset;
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
	}
	const result = text.replaceAll(tag, (match, _slash, offset: number) => (preserved.has(offset) ? match : `<\u200B${match.slice(1)}`));
	// An unclosed fence would run past the content and swallow the closing tag.
	return fence ? `${result}\n${fence}` : result;
};
