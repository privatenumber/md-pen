import { normalizeLineEndings } from './utils/normalize-line-endings.ts';

export const blockquote = (text: string) => {
	const normalized = normalizeLineEndings(text);
	return `> ${normalized.replaceAll('\n', '\n> ')}`;
};

export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export const alert = (type: AlertType, content: string) => blockquote(`[!${type.toUpperCase()}]\n${content}`);
