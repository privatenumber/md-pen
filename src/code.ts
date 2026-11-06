import { backtickDelimiter } from './utils/backtick-delimiter.ts';

export const code = (text: string) => {
	if (text.length === 0) {
		return '` `';
	}

	// Replace newlines with spaces — CommonMark collapses them in code spans
	// anyway, and newlines can cause backtick delimiters to be misinterpreted
	// as fenced code block openings.
	const normalized = text.replaceAll('\r\n', ' ').replaceAll('\r', ' ').replaceAll('\n', ' ');

	// Fast path: no backticks in content (common case)
	if (!normalized.includes('`')) {
		// CommonMark strips one leading + trailing space when both are present
		// and content isn't all spaces. Add padding to preserve content spaces.
		if (normalized.startsWith(' ') && normalized.endsWith(' ') && !/^ +$/.test(normalized)) {
			return `\` ${normalized} \``;
		}
		return `\`${normalized}\``;
	}

	// Slow path: find longest backtick run, use longer delimiter
	const delimiter = backtickDelimiter(normalized, 1);

	// Backtick disambiguation padding (1 space each side) doubles as the
	// expendable space for CommonMark's leading/trailing space stripping.
	// No extra padding needed — content's own spaces survive after stripping.
	return `${delimiter} ${normalized} ${delimiter}`;
};

export const codeBlock = (content: string, language?: string) => {
	// Sanitize: info string cannot contain backticks or newlines per CommonMark
	const sanitizedLanguage = language?.replaceAll(/[`\n\r]/g, '') ?? '';
	const separator = content.endsWith('\n') || content.endsWith('\r') ? '' : '\n';

	// Fast path: no backtick fences in content (common case)
	if (!content.includes('```')) {
		return `\`\`\`${sanitizedLanguage}\n${content}${separator}\`\`\``;
	}

	// Slow path: find longest fence (0-3 spaces indent allowed per CommonMark)
	let longestFenceRun = 0;
	for (const run of content.match(/^ {0,3}(`{3,})/gm) ?? []) {
		const backtickLength = run.trimStart().length;
		if (backtickLength > longestFenceRun) {
			longestFenceRun = backtickLength;
		}
	}

	const fence = '`'.repeat(Math.max(3, longestFenceRun + 1));
	return `${fence}${sanitizedLanguage}\n${content}${separator}${fence}`;
};

export const mermaid = (content: string) => codeBlock(content, 'mermaid');
