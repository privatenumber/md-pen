import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { escape } from '../../src/escape.ts';
import {
	heading, h1, h2, h3, h4, h5, h6,
} from '../../src/heading.ts';

describe('heading', () => {
	test('defaults to level 1', () => {
		expect(heading('Title')).toBe('# Title');
	});

	test('level 1', () => {
		expect(heading('Title', 1)).toBe('# Title');
	});

	test('level 2', () => {
		expect(heading('Sub', 2)).toBe('## Sub');
	});

	test('level 3', () => {
		expect(heading('Section', 3)).toBe('### Section');
	});

	test('level 4', () => {
		expect(heading('Subsection', 4)).toBe('#### Subsection');
	});

	test('level 5', () => {
		expect(heading('Minor', 5)).toBe('##### Minor');
	});

	test('level 6', () => {
		expect(heading('Deep', 6)).toBe('###### Deep');
	});

	test('empty text', () => {
		expect(heading('')).toBe('# ');
	});

	test('preserves escaped trailing hashes', () => {
		expect(render(heading(escape('a #')))).toBe('<h1>a #</h1>');
		expect(render(heading(String.raw`a \###`))).toBe('<h1>a ###</h1>');
		expect(render(heading(String.raw`a \\#`))).toBe(String.raw`<h1>a \#</h1>`);
	});

	test('preserves trailing hashes and backslashes in closing-sequence edge cases', () => {
		expect(render(heading('a#'))).toBe('<h1>a#</h1>');
		expect(render(heading('#'))).toBe('<h1>#</h1>');
		expect(render(heading('a\t#'))).toBe('<h1>a\t#</h1>');
		expect(render(heading('a \\'))).toBe(String.raw`<h1>a \</h1>`);
	});
});

describe('shorthand functions', () => {
	test('h1', () => {
		expect(h1('Title')).toBe('# Title');
	});

	test('h2', () => {
		expect(h2('Sub')).toBe('## Sub');
	});

	test('h3', () => {
		expect(h3('Section')).toBe('### Section');
	});

	test('h4', () => {
		expect(h4('Subsection')).toBe('#### Subsection');
	});

	test('h5', () => {
		expect(h5('Minor')).toBe('##### Minor');
	});

	test('h6', () => {
		expect(h6('Deep')).toBe('###### Deep');
	});
});

describe('heading trailing hashes', () => {
	test('heading preserves trailing ## in text', () => {
		const html = render(heading('Title ##'));
		expect(html).toContain('##');
	});

	test('heading preserves trailing # at h2', () => {
		const html = render(heading('Title #', 2));
		expect(html).toContain('#');
	});

	test('heading with only hashes', () => {
		const html = render(heading('##'));
		expect(html).toContain('##');
	});
});

describe('heading multiline', () => {
	test('heading strips newlines to prevent multiple blocks', () => {
		const html = render(heading('Title\n# second'));
		const headings = html.match(/<h1>/g) ?? [];
		expect(headings.length).toBe(1);
	});

	test('heading with blank line renders single heading', () => {
		const html = render(heading('Title\n\nnext'));
		const headings = html.match(/<h1>/g) ?? [];
		expect(headings.length).toBe(1);
		expect(html).not.toContain('<p>');
	});
});
