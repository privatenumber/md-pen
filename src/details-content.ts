const tag = /<(\/?)details(?=[\s/>]|$)/gi;

// blockquote(), alert(), and the list helpers prefix each line of nested
// details() output with the same quote markers and indentation, and its first
// line with a list or task marker.
const firstLine = /^(?: |> |- (?:\[[ x]\] )?|\d+\. )*$/;

// The exact head details() emits, capturing the container prefix of its later
// lines. Summaries are HTML-escaped, so they contain no `<` or line ending.
const opener = /<details(?:[ \t]+[^\s"'<>/=]+="[^"\r\n>]*")*>\n((?:[ \t]*>)*[ \t]*)<summary>[^<\r\n]*<\/summary>\n\1\n/iy;
const closer = /<\/details>(?:\n|$)/iy;

// Nested details() calls already neutralized their own content.
// Keep tags shaped like that output when they pair up; neutralize the rest.
export const protectDetailsContent = (text: string) => {
	const preserved = new Set<number>();
	const openers: {
		index: number;
		prefix: string;
	}[] = [];
	// Scan line boundaries forward once for all tags.
	let previousLineStart = -1;
	let lineStart = 0;
	let lineEnd = text.indexOf('\n');
	let lastTagLine = -1;
	for (const { 1: slash, index } of text.matchAll(tag)) {
		while (lineEnd !== -1 && lineEnd < index) {
			previousLineStart = lineStart;
			lineStart = lineEnd + 1;
			lineEnd = text.indexOf('\n', lineStart);
			// A line without an open head's prefix ends that head's container.
			while (openers.length > 0 && !text.startsWith(openers.at(-1)!.prefix, lineStart)) {
				openers.pop();
			}
		}
		// Only a line's first tag can follow a pure prefix; skipping the rest keeps this linear.
		if (lastTagLine === lineStart) {
			continue;
		}
		lastTagLine = lineStart;

		if (!slash) {
			opener.lastIndex = index;
			const head = opener.exec(text);
			const prefix = text.slice(lineStart, index);
			if (head && firstLine.test(prefix) && prefix.replaceAll(/- (?:\[[ x]\] )?|\d+\. /g, marker => ' '.repeat(marker.startsWith('- ') ? 2 : marker.length)) === head[1]) {
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
