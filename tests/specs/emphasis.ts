import { describe, test, expect } from 'manten';
import { render as renderHtml } from '../utils/render.ts';
import { code } from '../../src/code.ts';
import { bold, italic, strikethrough } from '../../src/emphasis.ts';
import { md, raw, render } from '../../src/node.ts';

describe('emphasis', () => {
	test('serializes each marker and empty content', () => {
		expect(String(bold('text'))).toBe('**text**');
		expect(String(italic('text'))).toBe('*text*');
		expect(String(strikethrough('text'))).toBe('~~text~~');
		for (const format of [bold, italic, strikethrough]) {
			expect(String(format(''))).toBe('');
		}
	});

	test('moves boundary whitespace outside delimiters', () => {
		for (const [format, tag] of [[bold, 'strong'], [italic, 'em'], [strikethrough, 'del']] as const) {
			expect(String(format(' \u00A0x\t '))).toBe(` \u00A0${format('x')} `);
			expect(renderHtml(format('    x    '))).toBe(`<p><${tag}>x</${tag}></p>`);
			expect(renderHtml(render(['a', format(' \t x '), 'b']))).toBe(`<p>a <${tag}>x</${tag}> b</p>`);
			expect(String(format(' \t\n'))).toBe(' \n');
		}
	});

	test('preserves non-breaking spaces and renderer whitespace at boundaries', () => {
		expect(renderHtml(render(['x', italic('\u00A0a')]))).toBe('<p>x\u00A0<em>a</em></p>');
		expect(renderHtml(render([bold('a \u00A0 '), 'y']))).toBe('<p><strong>a</strong> \u00A0 y</p>');
		for (const character of ['\v', '\u0085', '\u2028', '\u2029']) {
			expect(String(italic(`${character}x${character}`))).toBe(`${character}*x*${character}`);
		}
	});

	test('preserves explicit hard breaks in boundary whitespace', () => {
		for (const [format, tag] of [[bold, 'strong'], [italic, 'em'], [strikethrough, 'del']] as const) {
			expect(renderHtml(render([format(raw('a\\\n')), 'b']))).toBe(`<p><${tag}>a</${tag}><br />\nb</p>`);
		}
	});

	test('treats strings as literal text', () => {
		expect(String(bold('a _b_ c'))).toBe(String.raw`**a \_b\_ c**`);
		expect(renderHtml(bold('a _b_ c'))).toBe('<p><strong>a _b_ c</strong></p>');
		expect(renderHtml(italic('a*b'))).toBe('<p><em>a*b</em></p>');
		expect(renderHtml(strikethrough('version ~1.0'))).toBe('<p><del>version ~1.0</del></p>');
		for (const format of [bold, italic, strikethrough]) {
			for (const count of [1, 2, 3, 4]) {
				const input = `x${'\\'.repeat(count)}`;
				expect(renderHtml(format(input))).toContain(input);
			}
		}
	});

	test('composes structured nodes and trusted Markdown', () => {
		expect(String(bold([code('a'), ' b']))).toBe('**`a` b**');
		expect(renderHtml(bold([code('a'), ' b']))).toBe('<p><strong><code>a</code> b</strong></p>');
		expect(renderHtml(strikethrough(bold('x')))).toBe('<p><del><strong>x</strong></del></p>');
		expect(renderHtml(italic(md`a ${code('b')} c`))).toBe('<p><em>a <code>b</code> c</em></p>');
		expect(String(italic(bold('a')))).toBe('*<!-- -->**a**<!-- -->*');
		expect(String(italic(['a', bold('b')]))).toBe('*a**b**<!-- -->*');
		expect(renderHtml(italic(['a', bold('b')]))).toBe('<p><em>a<strong>b</strong><!-- --></em></p>');
		expect(String(italic('*x*'))).toBe(String.raw`*\*x\**`);
	});

	test('guards delimiter boundaries without changing escaped trailing markers', () => {
		const nested = italic([bold('a'), 'x', bold('b')]);
		expect(String(nested)).toBe('*<!-- -->**a**x**b**<!-- -->*');
		expect(renderHtml(nested)).toBe('<p><em><!-- --><strong>a</strong>x<strong>b</strong><!-- --></em></p>');
		expect(String(italic([bold('a'), 'x']))).toBe('*<!-- -->**a**x*');
		expect(String(italic(['x', bold('a')]))).toBe('*x**a**<!-- -->*');
		for (const count of [0, 1, 2, 3, 4]) {
			const body = `x${'\\'.repeat(count)}*`;
			const guard = count % 2 === 0 ? '<!-- -->' : '';
			expect(String(italic(raw(body)))).toBe(`*${body}${guard}*`);
		}
	});

	test('flattens same-type nesting', () => {
		for (const format of [bold, italic, strikethrough]) {
			expect(String(format(['x ', format('y')]))).toBe(String(format('x y')));
		}
		expect(renderHtml(italic(['x ', italic('y')]))).toBe('<p><em>x y</em></p>');
	});

	test('separates touching emphasis nodes', () => {
		expect(render([bold('a'), bold('b')])).toBe('**a**<!-- -->**b**');
		expect(renderHtml(render([bold('a'), bold('b')]))).toBe('<p><strong>a</strong><!-- --><strong>b</strong></p>');
		// GitHub leaves `**(a)**~~b~~` literal, so every touching emphasis pair gets a separator.
		expect(render([bold('(a)'), strikethrough('b')])).toBe('**(a)**<!-- -->~~b~~');
		expect(renderHtml(render([bold('(a)'), strikethrough('b')]))).toBe('<p><strong>(a)</strong><!-- --><del>b</del></p>');
		expect(render([bold('(a)'), '.'])).toBe('**(a)**.');
	});

	test('separates delimiters when punctuation prevents flanking', () => {
		expect(render(['a', bold('.b'), 'c'])).toBe('a<!-- -->**.b**c');
		expect(renderHtml(render(['a', bold('.b'), 'c']))).toBe('<p>a<!-- --><strong>.b</strong>c</p>');
	});
});
