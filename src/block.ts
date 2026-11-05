import { escapeHtml, htmlAttributes } from './escape.ts';

export const hr = () => '___';

export const details = (
	summary: string,
	content: string,
	options?: Record<string, string | number>,
) => {
	const safeContent = content.replaceAll(/<\/details\s*>/gi, '&lt;/details&gt;');
	return `<details${htmlAttributes(options)}>\n<summary>${escapeHtml(summary)}</summary>\n\n${safeContent}\n\n</details>`;
};
