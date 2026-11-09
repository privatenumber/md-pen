import type { Structure } from './tree.ts';

const blockTags = new Set(['p', 'blockquote', 'alert', 'details', 'summary', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'th', 'td', 'ul', 'ol', 'pre', 'table', 'thead', 'tbody', 'tr', 'hr']);
const atomicTags = new Set(['img', 'br', 'ref', 'checkbox', 'code']);
const emphasisTags = new Set(['strong', 'em', 'del']);
const trimTrailingInlineSpace = (entries: Structure[]): boolean => {
	for (let index = entries.length - 1; index >= 0; index -= 1) {
		const entry = entries[index];
		if (typeof entry === 'string') {
			entries[index] = entry.replace(/ +$/u, '');
			if (entries[index]) {
				return true;
			}
			entries.splice(index, 1);
		} else if (
			blockTags.has(entry.tag)
			|| atomicTags.has(entry.tag)
			|| trimTrailingInlineSpace(entry.children)
		) {
			return true;
		}
	}
	return false;
};
export const compact = (
	entries: Structure[],
	inPre = false,
	boundary = true,
	whitespace?: { pending: boolean },
): Structure[] => {
	// Inline descendants share pending space; each block starts a new sequence.
	const state = whitespace ?? { pending: boundary };
	const result: Structure[] = [];
	for (const entry of entries) {
		const previous = result.at(-1);
		if (typeof entry === 'string') {
			let text = !inPre && typeof previous === 'object' && blockTags.has(previous.tag)
				? entry.replace(/^ +/u, '')
				: entry;
			if (!inPre) {
				text = text.replaceAll(/[\t\n\f\r ]+/gu, ' ');
				if (state.pending && text.startsWith(' ')) {
					text = text.slice(1);
				}
				if (text) {
					state.pending = text.endsWith(' ');
				}
			}
			if (typeof previous === 'string') {
				result[result.length - 1] = previous + text;
			} else {
				result.push(text);
			}
			continue;
		}
		// A hard break ends a line like a block does, so the space before it is not rendered either.
		// A nested leading <br> can cause a false mismatch; generated table breaks are mid-text.
		if (!inPre && (blockTags.has(entry.tag) || entry.tag === 'br')) {
			trimTrailingInlineSpace(result);
		}
		const isBlock = blockTags.has(entry.tag) || (entry.tag === 'math' && entry.attributes?.style === 'display');
		if (isBlock) {
			state.pending = true;
		} else if (atomicTags.has(entry.tag)) {
			// Atomic nodes interrupt a run; code spans count because their spaces render.
			// A hard break starts a new line, so its leading space is not rendered.
			state.pending = entry.tag === 'br';
		}
		const next = {
			...entry,
			children: compact(entry.children, inPre || entry.tag === 'pre' || entry.tag === 'code', isBlock, isBlock ? undefined : state),
		};
		if (isBlock) {
			state.pending = true;
		}
		result.push(next);
	}
	if (boundary && !inPre) {
		if (typeof result[0] === 'string') {
			result[0] = result[0].replace(/^ +/u, '');
		}
		trimTrailingInlineSpace(result);
	}
	return result.filter(item => item !== '').map((item) => {
		if (typeof item === 'string' || !emphasisTags.has(item.tag)) { return item; }
		const chain = [item];
		let inner = item;
		while (inner.children.length === 1 && typeof inner.children[0] !== 'string'
			&& emphasisTags.has(inner.children[0].tag)) {
			inner = inner.children[0];
			chain.push(inner);
		}
		if (chain.length === 1) { return item; }
		const content = inner.children;
		chain.sort((a, b) => a.tag.localeCompare(b.tag));
		let children = content;
		for (const entry of chain.toReversed()) {
			children = [{
				...entry,
				children,
			}];
		}
		return children[0];
	});
};
