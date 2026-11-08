import type { DefaultTreeAdapterMap } from 'parse5';
import { element, type Structure } from './tree.ts';

type HtmlNode = DefaultTreeAdapterMap['node'];
const isTag = (node: HtmlNode, tag: string): node is DefaultTreeAdapterMap['element'] => (
	'tagName' in node && node.tagName === tag
);

const hasClass = (node: HtmlNode, name: string) => (
	'attrs' in node && node.attrs.some(attribute => attribute.name === 'class' && attribute.value.includes(name))
);

// parse5 decodes HTML entities before the tree reaches this normalizer.
export const normalize = (entry: HtmlNode, inPre = false): Structure[] => {
	if ('value' in entry) {
		if (inPre) {
			return [entry.value];
		}
		return [entry.value.replaceAll(/[\t\n\f\r ]+/gu, ' ')];
	}
	if (!('childNodes' in entry)) {
		return [];
	}
	const children = () => entry.childNodes.flatMap(child => normalize(child, inPre || isTag(entry, 'pre')));
	if (!('tagName' in entry)) {
		return children();
	}
	const attributes = Object.fromEntries(
		entry.attrs.map(attribute => [attribute.name, attribute.value]),
	);
	if (entry.tagName === 'section' && hasClass(entry, 'footnotes')) {
		const list = entry.childNodes.find(child => isTag(child, 'ol'));
		const definitions = list && isTag(list, 'ol')
			? list.childNodes.filter(child => isTag(child, 'li')).map(child => element('li', [], {
				id: child.attrs.find(attribute => attribute.name === 'id')?.value ?? '',
			}))
			: [];
		return [element('footnotes', definitions)];
	}
	if (entry.tagName === 'sup' && hasClass(entry, 'footnote-ref')) {
		const link = entry.childNodes.find(child => isTag(child, 'a'));
		const href = link && 'attrs' in link ? link.attrs.find(attribute => attribute.name === 'href')?.value : undefined;
		const marker = link && 'childNodes' in link ? link.childNodes.flatMap(child => normalize(child)) : [];
		return [element('ref', marker, { href: href ?? '' })];
	}
	// Compare checkbox presence, not its checked state.
	if (entry.tagName === 'input' && attributes.type === 'checkbox') {
		return [element('checkbox', [])];
	}
	if (entry.tagName === 'li') {
		const content = children();
		// Comrak inserts a separator after a task checkbox, outside the item label.
		if (typeof content[0] === 'object' && content[0].tag === 'checkbox' && typeof content[1] === 'string') {
			content[1] = content[1].replace(/^ /u, '');
		}
		return [element('li', content)];
	}
	// Hard line breaks are structural, including those introduced in table cells.
	if (entry.tagName === 'br') {
		return [element('br', [])];
	}
	if (entry.tagName === 'div' && hasClass(entry, 'markdown-alert')) {
		// The renderer adds an alert title that is not part of the supplied content.
		return [element('alert', entry.childNodes.filter(child => !hasClass(child, 'markdown-alert-title')).flatMap(child => normalize(child)), { type: attributes.class.match(/markdown-alert-(\w+)/u)?.[1] ?? '' })];
	}
	if (entry.tagName === 'span' && attributes['data-math-style']) {
		return [element('math', children(), { style: attributes['data-math-style'] })];
	}
	if (entry.tagName === 'ol') {
		// HTML ordered lists start at 1 when the start attribute is absent.
		return [element('ol', children(), { start: attributes.start ?? '1' })];
	}
	if (entry.tagName === 'code' && attributes.class) {
		return [element('code', children(), { class: attributes.class })];
	}
	if (entry.tagName === 'a') {
		// Compare link destinations, not renderer-added attributes.
		return [element('a', children(), { href: attributes.href })];
	}
	if (entry.tagName === 'img') {
		// Compare the image destination and alt text, not renderer-added attributes.
		return [element('img', [], {
			src: attributes.src,
			alt: attributes.alt,
		})];
	}
	// Retain list starts, code language, math style, alert type, and link and image attributes above.
	return [element(entry.tagName, children())];
};
