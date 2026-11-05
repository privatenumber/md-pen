import { escapeHtml, htmlAttributes } from './escape.ts';

export const hr = () => '---';

export const details = (
	summary: string,
	content: string,
	options?: Record<string, string | number>,
) => `<details${htmlAttributes(options)}>\n<summary>${escapeHtml(summary)}</summary>\n\n${content}\n\n</details>`;
