import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { ul, ol, taskList } from '../../src/list.ts';
import { bold } from '../../src/emphasis.ts';

describe('ul', () => {
	test('basic flat list', () => {
		expect(ul(['a', 'b', 'c'])).toBe('- a\n- b\n- c');
	});

	test('nested list', () => {
		expect(ul(['a', 'b', ['nested 1', 'nested 2'], 'c'])).toBe(
			'- a\n- b\n  - nested 1\n  - nested 2\n- c',
		);
	});

	test('deeply nested list', () => {
		expect(ul(['a', ['b', ['c']]])).toBe('- a\n  - b\n    - c');
	});

	test('sub-array at index 0 treated as top-level items', () => {
		expect(ul([['a', 'b']])).toBe('- a\n- b');
	});

	test('leading arrays establish the preceding item for nesting', () => {
		const markdown = ul([[['a']], ['b', ['c']], 'd']);
		expect(markdown).toBe('- a\n  - b\n    - c\n- d');
		expect(render(markdown)).toBe('<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul>\n</li>\n</ul>\n</li>\n<li>d</li>\n</ul>');
	});

	test('empty nested arrays do not make a list loose', () => {
		const markdown = ul([[], 'a', [], [[]], 'b']);
		expect(markdown).toBe('- a\n- b');
		expect(render(markdown)).toBe('<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
	});

	test('an empty nested item does not become a setext heading', () => {
		expect(render(ul(['a', ['', ['b']]]))).toBe('<ul>\n<li>\n<p>a</p>\n<ul>\n<li>\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>');
		expect(render(ul(['', ['', ['b']]]))).toBe('<ul>\n<li>\n<ul>\n<li>\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>');
		expect(render(ul(['\nx', ['', 'b']]))).toContain('<li>\n<p>x</p>\n<ul>\n<li></li>\n<li>b</li>');
	});

	test('strips leading spaces and tabs from items', () => {
		const markdown = ul([[' \ta\ncontinued'], ['  \tb']]);
		expect(markdown).toBe('- a\n  continued\n  - b');
		expect(render(markdown)).toBe('<ul>\n<li>a\ncontinued\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ul>');
	});

	test('an empty item after a child list keeps that list tight', () => {
		const markdown = ul(['a', ['b'], [], ['', 'c']]);
		expect(markdown).toBe('- a\n  - b\n  - \n  - c');
		expect(render(markdown)).toBe('<ul>\n<li>a\n<ul>\n<li>b</li>\n<li></li>\n<li>c</li>\n</ul>\n</li>\n</ul>');
	});

	test('empty array', () => {
		expect(ul([])).toBe('');
	});
});

describe('ol', () => {
	test('basic flat list', () => {
		expect(ol(['first', 'second', 'third'])).toBe(
			'1. first\n2. second\n3. third',
		);
	});

	test('nested list with 3-space indent', () => {
		expect(ol(['first', 'second', ['sub-a', 'sub-b'], 'third'])).toBe(
			'1. first\n2. second\n   1. sub-a\n   2. sub-b\n3. third',
		);
	});

	test('deeply nested list', () => {
		expect(ol(['a', ['b', ['c']]])).toBe('1. a\n   1. b\n      1. c');
	});

	test('sub-array at index 0 treated as top-level items', () => {
		expect(ol([['a', 'b']])).toBe('1. a\n2. b');
	});

	test('leading arrays preserve numbering and the preceding marker width', () => {
		const markdown = ol([Array.from({ length: 10 }, (_, index) => String(index + 1)), ['child\ncontinued', ['grandchild']], 'last']);
		expect(markdown).toBe('1. 1\n2. 2\n3. 3\n4. 4\n5. 5\n6. 6\n7. 7\n8. 8\n9. 9\n10. 10\n    1. child\n       continued\n       1. grandchild\n11. last');
		expect(render(markdown)).toContain('<li>10\n<ol>\n<li>child\ncontinued\n<ol>\n<li>grandchild</li>');
	});

	test('empty nested arrays do not make a list loose', () => {
		const markdown = ol([[], 'a', [], [[]], 'b']);
		expect(markdown).toBe('1. a\n2. b');
		expect(render(markdown)).toBe('<ol>\n<li>a</li>\n<li>b</li>\n</ol>');
	});

	test('an empty nested item does not lose its marker', () => {
		expect(render(ol(['a', ['', ['b']]]))).toBe('<ol>\n<li>\n<p>a</p>\n<ol>\n<li>\n<ol>\n<li>b</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>');
		expect(render(ol(['', ['', ['b']]]))).toBe('<ol>\n<li>\n<ol>\n<li>\n<ol>\n<li>b</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>');
		expect(render(ol(['\nx', ['', 'b']]))).toContain('<li>\n<p>x</p>\n<ol>\n<li></li>\n<li>b</li>');
	});

	test('an empty item after a child list keeps that list tight', () => {
		const markdown = ol(['a', ['b'], [], ['', 'c']]);
		expect(markdown).toBe('1. a\n   1. b\n   1. \n   2. c');
		expect(render(markdown)).toBe('<ol>\n<li>a\n<ol>\n<li>b</li>\n<li></li>\n<li>c</li>\n</ol>\n</li>\n</ol>');
	});

	test('nested numbering restarts from 1', () => {
		expect(ol(['a', 'b', ['x', 'y', 'z'], 'c'])).toBe(
			'1. a\n2. b\n   1. x\n   2. y\n   3. z\n3. c',
		);
	});
});

describe('taskList', () => {
	test('basic with checked and unchecked items', () => {
		expect(taskList([[true, 'Done'], [false, 'Todo']])).toBe(
			'- [x] Done\n- [ ] Todo',
		);
	});

	test('all checked', () => {
		expect(taskList([[true, 'A'], [true, 'B']])).toBe(
			'- [x] A\n- [x] B',
		);
	});

	test('all unchecked', () => {
		expect(taskList([[false, 'A'], [false, 'B']])).toBe(
			'- [ ] A\n- [ ] B',
		);
	});
});

describe('list composition', () => {
	test('list items containing markdown', () => {
		expect(ul([bold('item'), 'plain'])).toBe('- __item__\n- plain');
	});
});

describe('ol nesting with 10+ items', () => {
	test('nested item under item 10 renders as nested', () => {
		const items = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', ['nested'], '11'];
		const html = render(ol(items));
		// The nested item should be inside a sub-list, not a top-level <li>
		expect(html).toContain('<ol>');
		// With correct nesting, "nested" is inside a sub-<ol>
		expect(html.match(/<ol>/g)?.length).toBeGreaterThanOrEqual(2);
	});
});

describe('multiline list items', () => {
	test('ul multiline item keeps content inside list', () => {
		const html = render(ul(['line1\n# heading']));
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>');
		// Heading must be inside the list, not after it
		const listEnd = html.indexOf('</ul>');
		const headingPos = html.indexOf('heading');
		expect(headingPos).toBeLessThan(listEnd);
	});

	test('ol multiline item keeps content inside list', () => {
		const html = render(ol(['line1\n# heading']));
		expect(html).toContain('<ol>');
		expect(html).toContain('<li>');
		const listEnd = html.indexOf('</ol>');
		const headingPos = html.indexOf('heading');
		expect(headingPos).toBeLessThan(listEnd);
	});

	test('taskList multiline item keeps content inside task item', () => {
		const html = render(taskList([[false, 'line1\n- nested?']]));
		// Content must stay inside the task list, not escape as a sibling
		expect(html).toContain('checkbox');
		expect(html).toContain('nested?');
		// Only one top-level <ul>
		expect(html.match(/<ul>/g)?.length).toBeLessThanOrEqual(2);
	});

	test('ul multiline preserves content', () => {
		const html = render(ul(['first\nsecond']));
		expect(html).toContain('first');
		expect(html).toContain('second');
	});
});

describe('taskList blank-line continuation', () => {
	test('taskList with blank line does not create code block', () => {
		const html = render(taskList([[false, 'line1\n\nline2']]));
		expect(html).not.toContain('<pre>');
		expect(html).not.toContain('<code>');
		expect(html).toContain('line1');
		expect(html).toContain('line2');
	});
});

describe('list CR handling', () => {
	test('ul with CR keeps content inside list', () => {
		const html = render(ul(['a\r# h']));
		expect(html).toContain('<ul>');
		const listEnd = html.indexOf('</ul>');
		const contentPos = html.lastIndexOf('h');
		expect(contentPos).toBeLessThan(listEnd);
	});

	test('ol with CR keeps content inside list', () => {
		const html = render(ol(['a\r# h']));
		expect(html).toContain('<ol>');
		const listEnd = html.indexOf('</ol>');
		const contentPos = html.lastIndexOf('h');
		expect(contentPos).toBeLessThan(listEnd);
	});

	test('taskList with CR keeps content inside list', () => {
		const html = render(taskList([[false, 'a\r# h']]));
		expect(html).toContain('<ul>');
		const listEnd = html.indexOf('</ul>');
		const contentPos = html.lastIndexOf('h');
		expect(contentPos).toBeLessThan(listEnd);
	});
});
