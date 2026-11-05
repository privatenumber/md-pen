export const blockquote = (text: string) => {
	const normalized = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	return `> ${normalized.replaceAll('\n', '\n> ')}`;
};

export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export const alert = (type: AlertType, content: string) => blockquote(`[!${type.toUpperCase()}]\n${content}`);
