import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { math, mathBlock } from '../../src/math.ts';
import { taskList } from '../../src/list.ts';

describe('math', () => {
	test('inline math', () => {
		expect(math('x^2')).toBe('$x^2$');
	});

	test('passes through LaTeX special characters', () => {
		expect(math(String.raw`\frac{a}{b}`)).toBe(String.raw`$\frac{a}{b}$`);
		expect(math(String.raw`\alpha + \beta`)).toBe(String.raw`$\alpha + \beta$`);
	});

	test('trims boundary whitespace', () => {
		expect(math(' \n x \t')).toBe('$x$');
		expect(render(math(' x '))).toBe('<p><span data-math-style="inline">x</span></p>');
		expect(math(' \n\t ')).toBe('');
	});

	test('preserves dollars and backslashes verbatim', () => {
		expect(math(String.raw`\sqrt{\$4}`)).toBe('$`\\sqrt{\\$4}`$');
		expect(math(String.raw`a\\$b`)).toBe('$`a\\\\$b`$');
		expect(math(String.raw`a\\\$b`)).toBe('$`a\\\\\\$b`$');
		expect(math(String.raw`\#`)).toBe('$`\\#`$');
		expect(math(String.raw`\{`)).toBe('$`\\{`$');
		expect(math('a\\')).toBe('$`a\\`$');
		expect(math('a_b')).toBe('$a_b$');
	});

	test('protects Markdown syntax and autolinks in inline expressions', () => {
		expect(math(String.raw`\mathbf{x}_{i,j} = \mathbf{y}_{i,j}`)).toBe('$`\\mathbf{x}_{i,j} = \\mathbf{y}_{i,j}`$');
		for (const character of ['*', '`', '[', ']', '<', '>', '~', '$', '|', '@']) {
			expect(math(`a${character}b`)).not.toBe(`$a${character}b$`);
		}
		expect(math('x www.example.com y')).toBe('$`x www.example.com y`$');
		expect(math('x https://example.com y')).toBe('$`x https://example.com y`$');
	});

	test('uses portable delimiters for bare ampersands and factorials', () => {
		expect(math('a & b')).toBe('$a & b$');
		expect(math('n!')).toBe('$n!$');
		expect(render(math('a & b'))).toBe('<p><span data-math-style="inline">a &amp; b</span></p>');
		for (const entity of ['&amp;', '&#38;', '&#x26;']) {
			expect(math(`a ${entity} b`)).toBe(`$\`a ${entity} b\`$`);
		}
		const matrix = String.raw`\begin{pmatrix}a & b\\ c & d\end{pmatrix}`;
		expect(math(matrix)).toBe(`$\`${matrix}\`$`);
		expect(mathBlock(matrix)).toBe(`\`\`\`math\n${matrix}\n\`\`\``);
	});

	test('keeps intraword underscores in portable math delimiters', () => {
		for (const expression of ['x_i', 'x_i + y_j', 'a_b_c', 'α_β']) {
			expect(math(expression)).toBe(`$${expression}$`);
			expect(render(math(expression))).toBe(`<p><span data-math-style="inline">${expression}</span></p>`);
		}
		for (const expression of ['_x', 'x_', 'x_{i}', 'a__b']) {
			expect(math(expression)).toBe(`$\`${expression}\`$`);
		}
	});

	test('uses longer backtick delimiters when needed', () => {
		expect(math('a`$b')).toBe('$`` a`$b ``$');
	});
});

describe('math edge cases', () => {
	test('empty expression returns empty string', () => {
		expect(math('')).toBe('');
	});

	test('expression with dollar sign is verbatim', () => {
		expect(math('price = $5')).toBe('$`price = $5`$');
	});
});

describe('mathBlock', () => {
	test('block math', () => {
		expect(mathBlock('x^2 + y^2 = z^2')).toBe('$$\nx^2 + y^2 = z^2\n$$');
		expect(mathBlock(String.raw`\frac{a}{b}`)).toBe('$$\n\\frac{a}{b}\n$$');
		expect(mathBlock(String.raw`\alpha + \beta`)).toBe('$$\n\\alpha + \\beta\n$$');
		expect(mathBlock(String.raw`\{x\}`)).toBe('```math\n\\{x\\}\n```');
		expect(mathBlock('x_1')).toBe('$$\nx_1\n$$');
		expect(mathBlock('x_{1}')).toBe('```math\nx_{1}\n```');
		expect(mathBlock('a\\\nb')).toBe('```math\na\\\nb\n```');
		expect(mathBlock('a & b')).toBe('$$\na & b\n$$');
		expect(mathBlock('n!')).toBe('$$\nn!\n$$');
		expect(mathBlock('a &amp; b')).toBe('```math\na &amp; b\n```');
	});

	test('multiline expression', () => {
		expect(mathBlock('a = 1\nb = 2')).toBe('$$\na = 1\nb = 2\n$$');
		expect(mathBlock('a\r\n \r- b')).toBe('```math\na\n \n- b\n```');
	});

	test('empty expression returns empty string', () => {
		expect(mathBlock('')).toBe('');
	});

	test('does not add a blank line after a trailing newline', () => {
		expect(mathBlock('x\n')).toBe('$$\nx\n$$');
		expect(mathBlock('x_{1}\n')).toBe('```math\nx_{1}\n```');
	});

	test('uses fences for lines that start Markdown blocks', () => {
		for (const line of [' ', '- b', '+ b', '> b', '# b', '1. b', '1) b', '    code', '\tcode', '---', '===', '<b>', '```', '~~~']) {
			expect(mathBlock(`a\n${line}`)).toMatch(/^`{3,}math\n/);
		}
	});

	test('uses fences for table delimiter rows', () => {
		for (const line of [':---:', ':---', '---:', ':-:', '  :---:  ', '--- | ---', '|---|']) {
			const expression = `a\n${line}`;
			const markdown = mathBlock(expression);
			expect(markdown).toBe(`\`\`\`math\n${expression}\n\`\`\``);
			expect(render(markdown)).toBe(`<pre><code class="language-math" data-math-style="display">${expression}\n</code></pre>`);
		}
	});

	test('simple display math composes in task lists in comrak', () => {
		const markdown = taskList([[false, mathBlock('x^2')]]);
		expect(render(markdown)).toContain('data-math-style="display"');
	});

	test('preserves blank lines and block markers inside the fence', () => {
		const expression = 'a\n \n- b\n> c\n# d\n1. e\n```\n    code';
		const markdown = mathBlock(expression);
		expect(markdown).toBe(`\`\`\`\`math\n${expression}\n\`\`\`\``);
		expect(render(markdown)).toBe('<pre><code class="language-math" data-math-style="display">a\n \n- b\n&gt; c\n# d\n1. e\n```\n    code\n</code></pre>');
		expect(mathBlock(' \n\t')).toBe('```math\n \n\t\n```');
	});

	test('preserves escaped dollars in fenced display math', () => {
		expect(mathBlock(String.raw`\sqrt{\$4}`)).toBe('```math\n\\sqrt{\\$4}\n```');
		expect(mathBlock(String.raw`a\\$b`)).toBe('```math\na\\\\$b\n```');
		expect(mathBlock('a$$b')).toBe('```math\na$$b\n```');
		expect(mathBlock('a```$b')).toBe('````math\na```$b\n````');
		expect(mathBlock(String.raw`\verb0$0`)).toBe('```math\n\\verb0$0\n```');
	});
});

describe('math with dollar signs', () => {
	test('inline dollars use GitHub backtick-delimited math', () => {
		expect(math('price = $5')).toBe('$`price = $5`$');
	});

	test('mathBlock with $$ does not close early', () => {
		const md = mathBlock('x = $$');
		const html = render(md);
		// Must be a single display math element
		expect(html.match(/data-math-style/g)?.length ?? 0).toBe(1);
		expect(html).toContain('data-math-style="display"');
	});
});

describe('math edge cases', () => {
	test('math("") returns empty string', () => {
		expect(math('')).toBe('');
	});

	test('math with blank line does not split into paragraphs', () => {
		const html = render(math('a\n\nb'));
		expect(html).toContain('data-math-style="inline"');
	});

	test('mathBlock("") returns empty string', () => {
		expect(mathBlock('')).toBe('');
	});

	test('mathBlock with blank line does not split', () => {
		const html = render(mathBlock('a\n\nb'));
		expect(html).toContain('data-math-style="display"');
	});
});

describe('math backslash', () => {
	test('math with LaTeX commands preserves backslash', () => {
		const html = render(math(String.raw`\frac{a}{b}`));
		expect(html).toContain('data-math-style="inline"');
		expect(html).toContain('frac');
	});

	test('mathBlock with trailing backslash renders as display math', () => {
		const markdown = mathBlock('a\\');
		expect(markdown).toBe('```math\na\\\n```');
		const html = render(markdown);
		expect(html).toContain('data-math-style="display"');
		expect(html).toContain('a\\');
	});
});

describe('mathBlock CR blank lines', () => {
	test('mathBlock with CRLF blank line renders as display math', () => {
		const html = render(mathBlock('a\r\n\r\nb'));
		expect(html).toContain('data-math-style="display"');
	});

	test('mathBlock with CR blank line renders as display math', () => {
		const html = render(mathBlock('a\r\rb'));
		expect(html).toContain('data-math-style="display"');
	});
});
