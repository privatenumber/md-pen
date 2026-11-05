import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { footnoteRef, footnote } from '../../src/footnote.ts';

describe('footnote', () => {
	test('footnoteRef', () => {
		expect(footnoteRef('1')).toBe('[^1]');
	});

	test('footnoteRef with named id', () => {
		expect(footnoteRef('note')).toBe('[^note]');
	});

	test('footnote definition', () => {
		expect(footnote('1', 'This is the footnote text.')).toBe('[^1]: This is the footnote text.');
	});

	test('footnoteRef used inline', () => {
		const text = `See this${footnoteRef('1')} for details.`;
		expect(text).toBe('See this[^1] for details.');
	});

	test('footnote with formatted text', () => {
		const bold = (t: string) => `**${t}**`;
		expect(footnote('src', bold('important'))).toBe('[^src]: **important**');
	});

	test('footnote pair renders as footnote', () => {
		const md = `text${footnoteRef('1')}\n\n${footnote('1', 'note')}`;
		const html = render(md);
		expect(html).toContain('footnote');
	});

	test('retains supported punctuation, Unicode, and long IDs', () => {
		for (const id of ['\\', String.raw`a\b`, String.raw`a\-b`, '^', '日本語', 'a&b', 'a&copy;b', 'a&foo;b', 'a&#65;b', 'a&#x41;b', 'a&amp;b', 'x'.repeat(999), '😀'.repeat(250)]) {
			const html = render(`text${footnoteRef(id)}\n\n${footnote(id, 'note')}`);
			expect(html).toContain('<sup');
		}
	});

	test('normalizes entity-shaped IDs and escaped punctuation consistently', () => {
		expect(footnoteRef('a&copy;b')).toBe('[^a%26copy;b]');
		expect(footnoteRef('a&foo;b')).toBe('[^a%26foo;b]');
		expect(footnoteRef(String.raw`a\-b`)).toBe('[^a%5c-b]');
		expect(footnote('a&foo;b', 'note')).toBe('[^a%26foo;b]: note');
	});

	test('rejects IDs exceeding the UTF-16 or UTF-8 limits after normalization', () => {
		for (const id of ['x'.repeat(1000), `${'😀'.repeat(250)}a`, '😀'.repeat(500), '%'.repeat(334)]) {
			expect(footnoteRef(id)).toBe('');
			expect(footnote(id, 'note')).toBe('');
		}
	});

	test('distinct IDs with backslashes and percent escapes remain distinct', () => {
		const ids = [String.raw`a\b`, 'ab', 'a%5Cb'];
		const markdown = `${ids.map(id => `text${footnoteRef(id)}`).join(' ')}\n\n${ids.map((id, index) => footnote(id, `note${index}`)).join('\n')}`;
		const html = render(markdown);
		expect(html.match(/<sup/g)?.length).toBe(3);
		for (const index of [0, 1, 2]) {
			expect(html).toContain(`note${index}`);
		}
	});
});

describe('footnote multiline', () => {
	test('multiline footnote keeps continuation inside footnote', () => {
		const md = footnote('1', 'line1\n\nline2');
		expect(md).toContain('    line2');
	});

	test('footnote with list keeps list inside footnote', () => {
		const md = footnote('1', 'line1\n- item');
		expect(md).toContain('    - item');
	});
});

describe('footnote ID sanitization', () => {
	test('rejects ID containing ]', () => {
		expect(footnoteRef('a]b')).toBe('');
	});

	test('rejects ID containing [', () => {
		expect(footnoteRef('a[b')).toBe('');
	});

	test('strips spaces from ID', () => {
		expect(footnoteRef('a b')).toBe('[^a-b]');
	});

	test('strips tabs from ID', () => {
		expect(footnoteRef('a\tb')).toBe('[^a-b]');
	});

	test('encodes trailing backslash in ID', () => {
		expect(footnoteRef('a\\')).toBe('[^a%5c]');
	});

	test('preserves dashes and underscores', () => {
		expect(footnoteRef('a-b_c')).toBe('[^a-b_c]');
	});

	test('encodes backslash mid-ID', () => {
		expect(footnoteRef(String.raw`a\b`)).toBe('[^a%5cb]');
	});

	test('valid IDs render as footnotes', () => {
		const ref = footnoteRef('a-b');
		const def = footnote('a-b', 'note');
		const html = render(`text${ref}\n\n${def}`);
		expect(html).toContain('footnote');
	});
});

describe('empty footnote ID', () => {
	test('footnoteRef with empty ID returns empty string', () => {
		expect(footnoteRef('')).toBe('');
	});

	test('footnote with empty ID returns empty string', () => {
		expect(footnote('', 'note')).toBe('');
	});

	test('whitespace-only ID returns empty string', () => {
		expect(footnoteRef('   ')).toBe('');
	});
});

describe('footnote with CR', () => {
	test(String.raw`footnote with \r does not leak content`, () => {
		const md = footnote('1', 'line1\r\rline2');
		const html = render(md);
		expect(html).not.toMatch(/<p>line2<\/p>/);
	});
});

describe('footnote case-insensitive matching', () => {
	test('ref and def with different case resolve as footnote', () => {
		const md = `text${footnoteRef('A b')}\n\n${footnote('a b', 'note')}`;
		const html = render(md);
		expect(html).toContain('footnote');
	});

	test('ref and def with different whitespace resolve as footnote', () => {
		const md = `text${footnoteRef('a  b')}\n\n${footnote('a b', 'note')}`;
		const html = render(md);
		expect(html).toContain('footnote');
	});

	test('ref with leading/trailing whitespace matches trimmed def', () => {
		const md = `text${footnoteRef(' a b ')}\n\n${footnote('a b', 'note')}`;
		const html = render(md);
		expect(html).toContain('footnote');
	});
});
