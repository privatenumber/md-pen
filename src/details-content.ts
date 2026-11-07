const tag = /<(\/?)details(?=[\s/>]|$)/gi;

// blockquote(), alert(), and the list helpers prefix each line of nested
// details() output with the same quote markers and indentation, and its first
// line with a list or task marker.
const firstLine = /^(?:[ \t]*>)*[ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[[ x]\][ \t]+)?)?$/i;

// The exact head details() emits, capturing the container prefix of its later
// lines. Summaries are HTML-escaped, so they contain no `<` or line ending.
const opener = /<details(?:[ \t]+[^\s"'<>/=]+="[^">]*")*>\n((?:[ \t]*>)*[ \t]*)<summary>[^<\n]*<\/summary>\n\1\n/iy;
const closer = /<\/details>(?:\n|$)/iy;

// Nested details() calls already neutralized their own content.
// Keep tags shaped like that output when they pair up; neutralize the rest.
export const protectDetailsContent = (text: string) => {
	const preserved = new Set<number>();
	const openers: {
		index: number;
		prefix: string;
	}[] = [];
	// Track line boundaries forward, so each tag finds its line in constant time.
	let previousLineStart = -1;
	let lineStart = 0;
	let lineEnd = text.indexOf('\n');
	let lastTagLine = -1;
	for (const { 1: slash, index } of text.matchAll(tag)) {
		while (lineEnd !== -1 && lineEnd < index) {
			previousLineStart = lineStart;
			lineStart = lineEnd + 1;
			lineEnd = text.indexOf('\n', lineStart);
		}
		// Only a line's first tag can follow a pure prefix; skipping the rest keeps this linear.
		if (lastTagLine === lineStart) {
			continue;
		}
		lastTagLine = lineStart;

		if (!slash) {
			opener.lastIndex = index;
			const head = opener.exec(text);
			if (head && firstLine.test(text.slice(lineStart, index))) {
				openers.push({
					index,
					prefix: head[1],
				});
			}
			continue;
		}

		// A closer pairs only inside its head's container, after the blank line details() emits.
		const prefix = openers.at(-1)?.prefix;
		closer.lastIndex = index;
		if (
			prefix !== undefined
			&& text.slice(lineStart, index) === prefix
			&& previousLineStart !== -1
			&& text.slice(previousLineStart, lineStart - 1) === prefix
			&& closer.test(text)
		) {
			preserved.add(openers.pop()!.index).add(index);
		}
	}
	return text.replaceAll(tag, (match, _slash, offset: number) => (preserved.has(offset) ? match : `<\u200B${match.slice(1)}`));
};
