import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { code } from '../../src/code.ts';
import { escape } from '../../src/escape.ts';
import { link } from '../../src/link.ts';
import { createInlineScanner } from '../../src/inline-constructs.ts';
import { footnote, footnoteRef } from '../../src/footnote.ts';
import {
	bold, italic, strikethrough,
} from '../../src/emphasis.ts';

describe('emphasis', () => {
	test('bold wraps text with double underscores', () => {
		expect(bold('text')).toBe('__text__');
	});

	test('italic wraps text with single asterisks', () => {
		expect(italic('text')).toBe('*text*');
	});

	test('strikethrough wraps text with double tildes', () => {
		expect(strikethrough('text')).toBe('~~text~~');
	});

	test('handles empty string', () => {
		expect(bold('')).toBe('');
		expect(italic('')).toBe('');
		expect(strikethrough('')).toBe('');
	});

	test('moves boundary whitespace outside delimiters', () => {
		for (const [format, tag] of [[bold, 'strong'], [italic, 'em'], [strikethrough, 'del']] as const) {
			expect(format(' \u00A0x\t ')).toBe(` \u00A0${format('x')} `);
			expect(render(format('    x    '))).toBe(`<p><${tag}>x</${tag}></p>`);
			expect(render(`a${format(' \t x ')}b`)).toBe(`<p>a <${tag}>x</${tag}> b</p>`);
			expect(render(format(' x '))).toBe(`<p><${tag}>x</${tag}></p>`);
			expect(format(' \t\n')).toBe(' \t\n');
		}
	});

	test('preserves non-breaking spaces at boundaries', () => {
		expect(render(`x${italic('\u00A0a')}`)).toBe('<p>x\u00A0<em>a</em></p>');
		expect(render(`${bold('a \u00A0 ')}y`)).toBe('<p><strong>a</strong> \u00A0 y</p>');
	});

	test('preserves hard breaks in boundary whitespace', () => {
		expect(render(`hello${italic('  \nworld')}`)).toBe('<p>hello<br />\n<em>world</em></p>');
		expect(render(`hello\\${italic('\nworld')}`)).toBe('<p>hello<br />\n<em>world</em></p>');
		for (const [format, tag] of [[bold, 'strong'], [italic, 'em'], [strikethrough, 'del']] as const) {
			expect(render(`${format('a\\\n')}b`)).toBe(`<p><${tag}>a</${tag}><br />\nb</p>`);
			expect(render(`${format('a\\\\\\\r\n')}b`)).toBe(`<p><${tag}>a\\</${tag}><br />\nb</p>`);
			expect(render(`${format('a\\\\\n')}b`)).toBe(`<p><${tag}>a\\</${tag}>\nb</p>`);
			expect(format('\\\n')).toBe('\\\n');
		}
	});

	test('preserves nested markdown and identifiers', () => {
		expect(render(bold('a _b_ c'))).toBe('<p><strong>a <em>b</em> c</strong></p>');
		expect(render(bold('Email a__b@example.com'))).toBe('<p><strong>Email <a href="mailto:a__b@example.com">a__b@example.com</a></strong></p>');
		expect(render(`${bold(footnoteRef('a__b'))}\n\n${footnote('a__b', 'note')}`)).toContain('<a href="#fn-a__b"');
		expect(render(bold('$x_{1}$'))).toBe('<p><strong><span data-math-style="inline">x_{1}</span></strong></p>');
		expect(render(strikethrough('$a ~ b$'))).toBe(String.raw`<p><del><span data-math-style="inline">a \~ b</span></del></p>`);
		expect(render(italic(link('u', '^a*b*c')))).toBe('<p><em><a href="u">^a*b*c</a></em></p>');
		expect(italic(footnoteRef('a*b') + footnoteRef('c'))).toBe('*[^a*b][^c]*');
		expect(italic(footnoteRef('a*b') + link('u', 'site'))).toBe('*[^a*b][site](u)*');
		expect(bold('snake_case')).toBe('__snake_case__');
	});

	test('preserves footnote references containing delimiters', () => {
		const document = `${italic(footnoteRef('a*b'))}\n\n${footnote('a*b', 'note')}`;
		expect(render(document)).toContain('<em><sup class="footnote-ref"><a href="#fn-a*b"');
		const struck = `${strikethrough(footnoteRef('a~b'))}\n\n${footnote('a~b', 'note')}`;
		expect(render(struck)).toContain('<del><sup class="footnote-ref"><a href="#fn-a~b"');
		expect(render(italic('[^a*b'))).toBe('<p><em>[^a*b</em></p>');
		expect(render(italic(escape('[^a*b]')))).toBe('<p><em>[^a*b]</em></p>');
	});

	test('keeps literal and escaped dollar text out of math', () => {
		expect(render(italic('$5 and $6 *x*'))).toBe('<p><em>$5 and $6 *x*</em></p>');
		expect(render(italic(escape('$a*b$')))).toBe('<p><em>\u200B$a*b\u200B$</em></p>');
	});

	test('handles renderer whitespace around delimiters', () => {
		for (const character of ['\v', '\u0085', '\u2028', '\u2029']) {
			expect(italic(`${character}x${character}`)).toBe(`${character}*x*${character}`);
			expect(italic(`${character}x`)).toBe(`${character}*x*`);
			expect(italic(`x${character}`)).toBe(`*x*${character}`);
		}
		expect(render(italic('<a\ftitle="*">x</a>'))).toBe('<p><em><a\ftitle="*">x</a></em></p>');
		expect(render(italic('<a\vtitle="*">x</a>'))).toBe('<p><em><a\vtitle="*">x</a></em></p>');
	});

	test('preserves strikethrough with interior tildes', () => {
		expect(render(strikethrough('version ~1.0'))).toBe('<p><del>version ~1.0</del></p>');
		expect(render(strikethrough(italic('a~')))).toBe('<p><del><em>a~</em></del></p>');
		expect(render(strikethrough(code('~x~')))).toBe('<p><del><code>~x~</code></del></p>');
	});

	test('escapes delimiters in malformed declarations', () => {
		expect(render(italic('<!FOO*hi*>'))).toBe('<p><em>&lt;!FOO*hi*&gt;</em></p>');
	});

	test('scanner can skip code and escapes without skipping angle constructs', () => {
		const text = `${String.raw`\]`}\`]\`<a x=">">`;
		const scan = createInlineScanner(text, { angle: false });
		expect(scan.protectedEnd(0)).toBe(2);
		expect(scan.protectedEnd(2)).toBe(5);
		expect(scan.protectedEnd(5)).toBe(-1);
		expect(createInlineScanner(text).protectedEnd(5)).toBe(text.length);
	});

	test('preserves trailing backslashes', () => {
		for (const [format, tag] of [[bold, 'strong'], [italic, 'em'], [strikethrough, 'del']] as const) {
			for (const count of [1, 2, 3, 4]) {
				const input = `x${'\\'.repeat(count)}`;
				const expected = `x${'\\'.repeat(Math.ceil(count / 2))}`;
				expect(render(format(input))).toBe(`<p><${tag}>${expected}</${tag}></p>`);
			}
		}
	});

	test('preserves composed code, escaped text and links', () => {
		expect(render(italic(code('a*b')))).toBe('<p><em><code>a*b</code></em></p>');
		expect(render(italic(code('a`*b')))).toBe('<p><em><code>a`*b</code></em></p>');
		expect(render(italic('\\``a*b`'))).toBe('<p><em>`<code>a*b</code></em></p>');
		expect(render(italic(escape('a*b')))).toBe('<p><em>a*b</em></p>');
		expect(render(italic(escape(String.raw`a\*b`)))).toBe(String.raw`<p><em>a\*b</em></p>`);
		expect(render(bold(escape('_a_')))).toBe('<p><strong>_a_</strong></p>');
		expect(render(italic(link('https://example.com', 'a*b')))).toBe('<p><em><a href="https://example.com">a*b</a></em></p>');
		expect(render(italic(link('https://example.com/a*b')))).toBe('<p><em><a href="https://example.com/a*b">https://example.com/a*b</a></em></p>');
		expect(render(bold(`see ${link('www.example.com/a_b')}`))).toBe('<p><strong>see <a href="http://www.example.com/a_b">www.example.com/a_b</a></strong></p>');
		expect(render(italic(link('https://example.com/a*b', 'x', { target: '_blank' })))).toBe('<p><em><a target="_blank" href="https://example.com/a*b">x</a></em></p>');
		expect(render(strikethrough(bold('x')))).toBe('<p><del><strong>x</strong></del></p>');
	});

	test('preserves delimiters in raw HTML and autolinks', () => {
		const html = '<a title="> *" data-x=\'*\' data-y=*>x</a>';
		expect(render(italic(html))).toBe(`<p><em>${html}</em></p>`);
		for (const token of ['<!-- * -->', '<?x * ?>', '<!X *>', '<![CDATA[*]]>']) {
			expect(render(italic(token))).toBe(`<p><em>${token}</em></p>`);
		}
		expect(render(italic('<a*b@example.com>'))).toBe('<p><em><a href="mailto:a*b@example.com">a*b@example.com</a></em></p>');
		expect(render(italic('<abc:foo*bar>'))).toBe('<p><em><a href="abc:foo*bar">abc:foo*bar</a></em></p>');
		expect(render(italic('<a x="*"x>ok'))).toBe('<p><em>&lt;a x=&quot;*&quot;x&gt;ok</em></p>');
	});

	test('escapes delimiter chars at text edges', () => {
		expect(bold('x_')).toBe(String.raw`__x\___`);
		expect(italic('*x')).toBe(String.raw`*\*x*`);
		expect(strikethrough('~x')).toBe(String.raw`~~\~x~~`);
	});

	test('bold and italic compose naturally', () => {
		expect(bold(italic('text'))).toBe('__*text*__');
		expect(italic(bold('text'))).toBe('*__text__*');
	});
});

describe('emphasis delimiter collision', () => {
	test('bold("x*") renders entire content in bold', () => {
		const html = render(bold('x*'));
		expect(html).toContain('<strong>');
		expect(html).not.toMatch(/<\/strong>\*/);
	});

	test('bold("*x") renders entire content in bold', () => {
		const html = render(bold('*x'));
		expect(html).toContain('<strong>');
		expect(html).not.toMatch(/\*<strong>/);
	});

	test('italic("x*") renders entire content in italic', () => {
		const html = render(italic('x*'));
		expect(html).toContain('<em>');
		expect(html).not.toMatch(/<\/em>\*/);
	});

	test('strikethrough("~x") renders as strikethrough, not code block', () => {
		const html = render(strikethrough('~x'));
		expect(html).not.toContain('<pre>');
		expect(html).not.toContain('<code');
		expect(html).toContain('<del>');
	});

	test('strikethrough("x~") renders entire content', () => {
		const html = render(strikethrough('x~'));
		expect(html).toContain('<del>');
	});

	test('bold(italic("x*")) renders entire content', () => {
		const html = render(bold(italic('x*')));
		expect(html).toContain('<strong>');
		expect(html).toContain('<em>');
	});
});

describe('emphasis already-delimited input', () => {
	test('italic("*x*") does not render as bold', () => {
		const html = render(italic('*x*'));
		expect(html).toContain('<em>');
		expect(html).not.toMatch(/<strong>[^<]*<\/strong>/);
	});

	test('strikethrough("~x~") does not render as code block', () => {
		const html = render(strikethrough('~x~'));
		expect(html).not.toContain('<pre>');
		expect(html).not.toContain('<code');
		expect(html).toContain('<del>');
	});
});

describe('emphasis with intraword delimiter', () => {
	test('italic("a*b") renders entire content in italic', () => {
		const html = render(italic('a*b'));
		expect(html).toContain('<em>');
		// The * should be part of the italic content, not a stray delimiter
		expect(html).not.toMatch(/<\/em>b/);
	});

	test('bold("a_b") renders entire content in bold', () => {
		const html = render(bold('a_b'));
		expect(html).toContain('<strong>');
		expect(html).not.toMatch(/<\/strong>b/);
	});
});

describe('emphasis side by side', () => {
	test('bold and italic stay separate when adjacent', () => {
		expect(render(bold(escape('x_')) + italic('a'))).toBe('<p><strong>x_</strong><em>a</em></p>');
		expect(render(italic('a*b') + bold('a*b'))).toBe('<p><em>a*b</em><strong>a*b</strong></p>');
	});

	test('bare URLs stay autolinked inside escaped emphasis', () => {
		expect(render(italic('www.example.com a*b'))).toBe('<p><em><a href="http://www.example.com">www.example.com</a> a*b</em></p>');
	});

	test('a space keeps adjacent emphasis separate', () => {
		expect(render(`${bold('a')} ${bold('b')}`)).toBe('<p><strong>a</strong> <strong>b</strong></p>');
		expect(render(`${italic('a')} ${italic('b')}`)).toBe('<p><em>a</em> <em>b</em></p>');
		expect(render(`${bold('a')} ${strikethrough('b')}`)).toBe('<p><strong>a</strong> <del>b</del></p>');
	});
});
