import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { footnoteRef, footnote } from '../../src/footnote.ts';

describe('footnote', () => {
	test('ASCII normalization table', () => {
		const outcomes = [
			'eeeeeeeeewwwwwee',
			'eeeeeeeeeeeeeeee',
			'wvvveeevvvvvvvvv',
			'vvvvvvvvvvevevev',
			'vvvvvvvvvvvvvvvv',
			'vvvvvvvvvvveeeev',
			'evvvvvvvvvvvvvvv',
			'vvvvvvvvvvveeeve',
		].join('');
		for (let code = 0; code < 128; code += 1) {
			const character = String.fromCodePoint(code);
			const expected = outcomes[code] === 'w'
				? '-'
				: (outcomes[code] === 'v' ? character : `%${code.toString(16).padStart(2, '0')}`);
			expect(footnoteRef(`p${character}q`)).toBe(`[^p${expected}q]`);
		}
		for (const [input, expected] of [['é', 'é'], ['文', '文'], ['😀', '😀'], ['\u0085', '%c2%85']]) {
			expect(footnoteRef(`p${input}q`)).toBe(`[^p${expected}q]`);
		}
	});

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
		for (const id of ['\\', String.raw`a\b`, String.raw`a\-b`, '^', 'a:b', 'a|b', 'a>b', 'a{b', 'a}b', 'a\u0085b', '日本語', 'a&b', 'a&copy;b', 'a&foo;b', 'a&#65;b', 'a&#x41;b', 'a&amp;b', '`code`', '<https://x>', '$x$', '[', ']', '_a_', 'é', '😀', '文'.repeat(112), '\0'.repeat(333), 'x'.repeat(999), '😀'.repeat(250)]) {
			const html = render(`text${footnoteRef(id)}\n\n${footnote(id, 'note')}`);
			const reference = html.match(/<sup[^>]*><a href="#([^"]+)" id="([^"]+)"/);
			const definition = html.match(/<li id="([^"]+)">/);
			const backLink = html.match(/<a href="#([^"]+)" class="footnote-backref"/);
			expect(reference?.[1]).toBe(definition?.[1]);
			expect(backLink?.[1]).toBe(reference?.[2]);
			expect(reference).not.toBeNull();
		}
	});

	test('normalizes entity-shaped IDs and escaped punctuation consistently', () => {
		expect(footnoteRef('a&copy;b')).toBe('[^a%26copy;b]');
		expect(footnoteRef('a&foo;b')).toBe('[^a%26foo;b]');
		expect(footnoteRef(String.raw`a\-b`)).toBe('[^a%5c-b]');
		expect(footnote('a&foo;b', 'note')).toBe('[^a%26foo;b]: note');
		expect(footnoteRef('a&AMP;b')).toBe('[^a%26AMP;b]');
		expect(footnoteRef('a&ſfoo;b')).toBe('[^a%26ſfoo;b]');
		expect(footnoteRef('a&Kfoo;b')).toBe('[^a%26Kfoo;b]');
		expect(footnoteRef('a\u0085b')).toBe('[^a%c2%85b]');
	});

	test('encodes percent signs and backslashes distinctly', () => {
		expect(footnoteRef('25%')).toBe('[^25%25]');
		expect(footnoteRef('%5c')).toBe('[^%255c]');
		expect(footnoteRef('\\')).toBe('[^%5c]');
		expect(render(`text${footnoteRef('25%')}\n\n${footnote('25%', 'note')}`)).toContain('<sup');
	});

	test('rejects IDs exceeding the UTF-16 or UTF-8 limits after normalization', () => {
		for (const id of ['x'.repeat(1000), `${'😀'.repeat(250)}a`, '%ab'.repeat(200), '\0'.repeat(334), '\uD800', '\uDC00']) {
			expect(footnoteRef(id)).toBe('');
			expect(footnote(id, 'note')).toBe('');
		}
	});

	test('emits non-ASCII case variants verbatim (renderers decide case folding)', () => {
		expect(footnoteRef('Ა')).toBe('[^Ა]');
		expect(footnoteRef('ა')).toBe('[^ა]');
		expect(footnote('Ა', 'note')).toBe('[^Ა]: note');
		expect(footnote('ა', 'note')).toBe('[^ა]: note');
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
	test('encodes ID containing ]', () => {
		expect(footnoteRef('a]b')).toBe('[^a%5db]');
	});

	test('encodes ID containing [', () => {
		expect(footnoteRef('a[b')).toBe('[^a%5bb]');
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
	test('matches Unicode case and hand-written underscore labels', () => {
		expect(render(`text${footnoteRef('É')}\n\n${footnote('é', 'note')}`)).toContain('<sup');
		expect(render(`text${footnoteRef('hello_world')}\n\n[^hello_world]: note`)).toContain('<sup');
	});

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
