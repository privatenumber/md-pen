import { describe, test, expect } from 'manten';
import { markdownToHTML } from 'comrak';
import { render } from '../utils/render.ts';
import {
	escapeHtml, escapeTableCell, escapeUrl, htmlAttributes,
} from '../../src/escape.ts';
import { escapeText as escape } from '../../src/text.ts';

describe('escape', () => {
	test('escapes backslashes', () => {
		expect(escape(String.raw`a\b`)).toBe(String.raw`a\\b`);
	});

	test('escapes backticks', () => {
		expect(escape('a`b')).toBe('a\\`b');
	});

	test('escapes asterisks', () => {
		expect(escape('a*b')).toBe(String.raw`a\*b`);
	});

	test('escapes underscores', () => {
		expect(escape('a_b')).toBe(String.raw`a\_b`);
	});

	test('escapes tildes', () => {
		expect(escape('a~b')).toBe(String.raw`a\~b`);
	});

	test('escapes square brackets', () => {
		expect(escape('[link]')).toBe(String.raw`\[link\]`);
	});

	test('escapes angle brackets', () => {
		expect(escape('<tag>')).toBe(String.raw`\<tag\>`);
	});

	test('escapes ampersands', () => {
		expect(escape('a&b')).toBe(String.raw`a\&b`);
	});

	test('escapes multiple special characters', () => {
		expect(escape('**bold** and `code`')).toBe('\\*\\*bold\\*\\* and \\`code\\`');
	});

	test('returns empty string unchanged', () => {
		expect(escape('')).toBe('');
	});

	test('returns plain text unchanged', () => {
		expect(escape('hello world')).toBe('hello world');
	});

	test('unicode passes through', () => {
		expect(escape('hello 世界 🚀')).toBe('hello 世界 🚀');
	});

	test('renders every ASCII punctuation character literally', () => {
		const punctuation = String.raw`!"#$%&'()*+,-./:;<=>?@[\]^_\`{|}~`;
		for (const character of punctuation) {
			for (const input of [character, `a${character}b`]) {
				const htmlText = input.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
				expect(render(escape(input)).replaceAll('\u200B', '')).toBe(`<p>${htmlText}</p>`);
			}
		}
	});

	test('emits guards for references and math', () => {
		const input = '@octocat a@example.com #1 GH-1 $x$ $$x$$ $`x`$';
		const html = render(escape(input));
		expect(html).toBe('<p>@​octocat a@​example.com #​1 GH-​1 ​$x​$ ​$​$x​$​$ ​$`x`​$</p>');
	});

	test('prevents GitHub emoji shortcodes from being substituted', () => {
		const options = { extension: { shortcodes: true } };
		expect(markdownToHTML(':smile:', options)).toBe('<p>😄</p>\n');
		expect(markdownToHTML(escape(':smile: :+1: :100: :1234:'), options)).toBe('<p>:​smile: :​+1: :​100: :​1234:</p>\n');
		expect(markdownToHTML(escape('\t:smile:'), options)).toBe('<p>:​smile:</p>\n');
		for (const input of ['hello\t:smile:', '(:smile:)']) {
			expect(markdownToHTML(input, options)).toContain('😄');
			expect(markdownToHTML(escape(input), options)).not.toContain('😄');
			// GitHub ignores backslashes here, so the zero-width guard itself must be present
			expect(escape(input)).toContain(':\u200Bsmile');
		}
		expect(markdownToHTML(escape(':invalid:smile: :smile::smile:'), options)).toBe('<p>:​invalid:​smile: :​smile::​smile:</p>\n');
	});

	test('guards references in URL paths and emails', () => {
		for (const input of ['#1', 'a/b#1', '@octocat', 'foo@bar.com', 'https://example.com/#1', 'a/#1', 'foo/@octocat', 'a@example.com', 'privatenumber/md-pen#1']) {
			expect(escape(input)).toContain('\u200B');
		}
		for (const input of ['x#1', 'foo_#1', 'xGH-1', 'x@octocat', 'foo_@octocat']) {
			expect(escape(input)).not.toContain('\u200B');
		}
	});

	test('does not insert invisible characters into timestamps or URLs', () => {
		for (const input of ['12:34:56', '12:100:56', ':8080:443', 'https://example.com/12:34:56', 'a:smile:b', 'x:+1:']) {
			expect(escape(input)).not.toContain('\u200B');
		}
	});

	test('normalizes trailing whitespace before appended newlines', () => {
		for (const input of ['a  ', 'a \t', 'a\t']) {
			expect(render(`${escape(input)}\nb`)).toBe('<p>a\nb</p>');
		}
	});

	test('preserves a space after a setext underline when text is appended', () => {
		expect(render(`${escape('=== ')}next`)).toBe('<p>=== next</p>');
		expect(render(`${escape('  === \t')}next`)).toBe('<p>=== next</p>');
	});

	test('renders indented block markers and trailing whitespace literally', () => {
		for (const input of ['  1. x', '   1) x', '6.\nx', 'x\n  ===', '  # heading', '  - item', '  > quote', '  ```', ' \tcode', 'a  \nb', 'a \t\r\nb']) {
			const html = render(escape(input));
			expect(html.startsWith('<p>')).toBe(true);
			expect(html.endsWith('</p>')).toBe(true);
			expect(html).not.toContain('<br');
		}
	});

	test('disables URL autolinks without invisible characters', () => {
		const input = 'https://example.com www.example.com HTTP://example.com';
		const escaped = escape(input);
		expect(escaped).not.toContain('\u200B');
		expect(render(escaped)).toBe(`<p>${input}</p>`);
	});
});

describe('escapeHtml', () => {
	test('escapes less-than', () => {
		expect(escapeHtml('<')).toBe('&lt;');
	});

	test('escapes greater-than', () => {
		expect(escapeHtml('>')).toBe('&gt;');
	});

	test('escapes ampersand', () => {
		expect(escapeHtml('&')).toBe('&amp;');
	});

	test('escapes double quote', () => {
		expect(escapeHtml('"')).toBe('&quot;');
	});

	test('escapes all HTML chars in context', () => {
		expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
	});

	test('encodes line endings without normalizing them', () => {
		expect(escapeHtml('a\nb\rc\r\nd')).toBe('a&#10;b&#13;c&#13;&#10;d');
	});

	test('leaves plain text unchanged', () => {
		expect(escapeHtml('hello world')).toBe('hello world');
	});
});

describe('htmlAttributes', () => {
	test('encodes line endings in attribute values', () => {
		expect(htmlAttributes({ title: 'a\nb\rc\r\nd' })).toBe(' title="a&#10;b&#13;c&#13;&#10;d"');
	});

	test('accepts CommonMark attribute names and drops invalid names', () => {
		expect(htmlAttributes({
			':foo': 'x',
			'_x.y-z': 'y',
			'@foo': 'z',
			'1name': 'z',
			'on"error': 'z',
		})).toBe(' :foo="x" _x.y-z="y"');
	});
});

describe('escapeTableCell', () => {
	test('escapes pipe', () => {
		expect(escapeTableCell('a | b')).toBe(String.raw`a \| b`);
	});

	test('replaces newline with <br>', () => {
		expect(escapeTableCell('a\nb')).toBe('a<br>b');
	});

	test('escapes pipe and newline together', () => {
		expect(escapeTableCell('a | b\nc')).toBe(String.raw`a \| b<br>c`);
	});

	test('leaves plain text unchanged', () => {
		expect(escapeTableCell('hello')).toBe('hello');
	});
});

describe('escapeUrl', () => {
	test('escapes closing parenthesis', () => {
		expect(escapeUrl('https://en.wikipedia.org/wiki/Foo_(bar)')).toBe(
			String.raw`https://en.wikipedia.org/wiki/Foo_\(bar\)`,
		);
	});

	test('escapes spaces', () => {
		expect(escapeUrl('path/to/my file')).toBe('path/to/my%20file');
	});

	test('escapes newlines', () => {
		expect(escapeUrl('https://x.com/\npath')).toBe('https://x.com/%0Apath');
	});

	test('escapes carriage returns', () => {
		expect(escapeUrl('https://x.com/\rpath')).toBe('https://x.com/%0Dpath');
	});

	test('leaves clean URL unchanged', () => {
		expect(escapeUrl('https://example.com/path?q=1&r=2#hash')).toBe(
			'https://example.com/path?q=1&r=2#hash',
		);
	});

	test('escapes entity-shaped ampersands without changing query separators', () => {
		expect(escapeUrl('https://x.test/?a=1&b=2&#35;&copy;&amp;')).toBe('https://x.test/?a=1&b=2&amp;#35;&amp;copy;&amp;amp;');
	});
});

describe('escape block markers', () => {
	test('escape("# hello") should not render as heading', () => {
		const html = render(escape('# hello'));
		expect(html).not.toContain('<h1>');
		expect(html).toContain('#');
	});

	test('escape("- hello") should not render as list', () => {
		const html = render(escape('- hello'));
		expect(html).not.toContain('<ul>');
		expect(html).not.toContain('<li>');
	});

	test('escape("1. hello") should not render as ordered list', () => {
		const html = render(escape('1. hello'));
		expect(html).not.toContain('<ol>');
		expect(html).not.toContain('<li>');
	});

	test('escape("> quote") should not render as blockquote', () => {
		const html = render(escape('> quote'));
		expect(html).not.toContain('<blockquote>');
	});

	test('escape("---") should not render as hr', () => {
		const html = render(`text\n\n${escape('---')}`);
		expect(html).not.toContain('<hr>');
	});
});

describe('escape block gaps', () => {
	test('escape("+ item") should not render as list', () => {
		const html = render(escape('+ item'));
		expect(html).not.toContain('<ul>');
		expect(html).not.toContain('<li>');
	});

	test('escape setext heading (===) should not render as h1', () => {
		const html = render(escape('title\n==='));
		expect(html).not.toContain('<h1>');
	});

	test('escape setext heading (===) with trailing spaces', () => {
		const html = render(escape('title\n===   '));
		expect(html).not.toContain('<h1>');
	});
});

describe('indented code blocks in escape', () => {
	test('escape("    code") should not render as code block', () => {
		const html = render(escape('    code'));
		expect(html).not.toContain('<pre>');
		expect(html).not.toContain('<code>');
	});

	test('escape with tab should not render as code block', () => {
		const html = render(escape('\tcode'));
		expect(html).not.toContain('<pre>');
		expect(html).not.toContain('<code>');
	});

	test('escape preserves indented text on non-first lines', () => {
		const html = render(escape('normal\n    indented'));
		expect(html).not.toContain('<pre>');
		expect(html).not.toContain('<code>');
	});
});

describe('escape tab-separated block syntax', () => {
	test(String.raw`escape("1.\thello") should not render as ordered list`, () => {
		const html = render(escape('1.\thello'));
		expect(html).not.toContain('<ol>');
		expect(html).not.toContain('<li>');
	});

	test('escape setext with trailing tab should not render as h1', () => {
		const html = render(escape('title\n===\t'));
		expect(html).not.toContain('<h1>');
	});
});

describe('escape autolinks', () => {
	test('escape URL does not render as link', () => {
		const html = render(escape('https://example.com'));
		expect(html).not.toContain('<a');
	});

	test('escape www does not render as link', () => {
		const html = render(escape('www.example.com'));
		expect(html).not.toContain('<a');
	});

	test('escape email does not render as link', () => {
		const html = render(escape('a@example.com'));
		expect(html).not.toContain('<a');
		expect(html).not.toContain('mailto');
	});

	test('escape ftp:// URL does not render as link', () => {
		const html = render(escape('ftp://example.com'));
		expect(html).not.toContain('<a');
	});

	test('escape uppercase HTTP:// does not render as link on GitHub', () => {
		// GitHub autolinks HTTP:// and Https:// (case-insensitive)
		expect(escape('HTTP://example.com')).toBe(String.raw`HTTP\:\/\/example\.com`);
		expect(escape('Https://example.com')).toBe(String.raw`Https\:\/\/example\.com`);
	});
});
