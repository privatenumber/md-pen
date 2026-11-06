import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { code, codeBlock, mermaid } from '../../src/code.ts';

describe('code', () => {
	test('wraps text in backticks', () => {
		expect(code('hello')).toBe('`hello`');
	});

	test('uses double backticks with padding when text contains backticks', () => {
		expect(code('a `b` c')).toBe('`` a `b` c ``');
	});

	test('uses enough backticks to exceed longest run in text', () => {
		expect(code('a `` b')).toBe('``` a `` b ```');
	});

	test('handles empty string', () => {
		expect(code('')).toBe('` `');
	});
});

describe('codeBlock', () => {
	test('creates a fenced code block', () => {
		expect(codeBlock('const x = 1')).toBe('```\nconst x = 1\n```');
	});

	test('includes language identifier', () => {
		expect(codeBlock('const x = 1', 'ts')).toBe('```ts\nconst x = 1\n```');
	});

	test('uses more backticks when content contains backtick fences', () => {
		expect(codeBlock('```\ncode\n```')).toBe('````\n```\ncode\n```\n````');
	});

	test('handles content with longer backtick fences', () => {
		expect(codeBlock('````\ncode\n````')).toBe('`````\n````\ncode\n````\n`````');
	});

	test('preserves trailing line endings without an extra blank line', () => {
		for (const content of ['x\n', 'x\r\n', 'x\r', '\n', '\n\n', '\r\n\r\n', '```\n']) {
			const normalized = content.replaceAll(/\r\n?|\n/g, '\n');
			expect(render(codeBlock(content)).replaceAll(/\r\n?|\n/g, '\n')).toBe(`<pre><code>${normalized}</code></pre>`);
		}
	});
});

describe('mermaid', () => {
	test('creates a mermaid code block', () => {
		expect(mermaid('graph TD\n  A --> B')).toBe('```mermaid\ngraph TD\n  A --> B\n```');
	});
});

describe('code with leading/trailing spaces', () => {
	test('code(" padded ") preserves spaces in rendered output', () => {
		const html = render(code(' padded '));
		expect(html).toContain('<code> padded </code>');
	});

	test('code(" x") preserves leading space', () => {
		const html = render(code(' x'));
		expect(html).toContain('<code> x</code>');
	});

	test('code("x ") preserves trailing space', () => {
		const html = render(code('x '));
		expect(html).toContain('<code>x </code>');
	});
});

describe('code over-padding with backticks + spaces', () => {
	test('code(" `a` ") preserves exactly one space each side', () => {
		const html = render(code(' `a` '));
		expect(html).toContain('<code> `a` </code>');
	});

	test('code(" x ") with no backticks preserves spaces', () => {
		const html = render(code(' x '));
		expect(html).toContain('<code> x </code>');
	});
});

describe('codeBlock language injection', () => {
	test('newline in language does not inject content', () => {
		const md = codeBlock('const x = 1', 'ts\n# injected');
		const html = render(md);
		expect(html).not.toContain('# injected');
		expect(html).toContain('language-ts');
	});

	test('backtick in language does not break fence', () => {
		const md = codeBlock('const x = 1', 'ts`');
		const html = render(md);
		expect(html).toContain('<pre>');
		expect(html).toContain('const x = 1');
	});
});

describe('codeBlock indented fence crash', () => {
	test('codeBlock with indented backtick fence does not crash', () => {
		expect(() => codeBlock('  ```\nafter')).not.toThrow();
	});

	test('codeBlock with indented longer fence does not crash', () => {
		expect(() => codeBlock('  ````\nafter')).not.toThrow();
	});

	test('mermaid with indented fence does not crash', () => {
		expect(() => mermaid('  ```\nafter')).not.toThrow();
	});

	test('codeBlock with indented fence renders correctly', () => {
		const html = render(codeBlock('  ```\nafter'));
		expect(html).toContain('<pre>');
		expect(html).toContain('```');
	});
});

describe('code with newlines + backticks', () => {
	test('code with newline and backticks renders as inline code', () => {
		const md = code('a\n```\nb');
		const html = render(md);
		expect(html).toContain('<code>');
		expect(html).not.toContain('<pre>');
	});

	test('code with newline renders as inline code', () => {
		const md = code('line1\nline2');
		const html = render(md);
		expect(html).toContain('<code>');
		expect(html).not.toContain('<pre>');
	});
});

describe('code with CR', () => {
	test(String.raw`code with \r and backticks renders as inline code`, () => {
		const html = render(code('a\r```\rb'));
		expect(html).toContain('<code>');
		expect(html).not.toContain('<pre>');
	});

	test(String.raw`code with \r only renders as inline code`, () => {
		const html = render(code('a\rb'));
		expect(html).toContain('<code>');
		expect(html).not.toContain('<pre>');
	});
});

describe('code mixed boundary whitespace', () => {
	test(String.raw`code(" \t ") preserves all boundary whitespace`, () => {
		const html = render(code(' \t '));
		expect(html).toContain('<code>');
		// Both space and tab should survive
		const codeContent = html.match(/<code>(.*?)<\/code>/)?.[1] ?? '';
		expect(codeContent.length).toBeGreaterThanOrEqual(2);
	});
});
