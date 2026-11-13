import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { blockquote, alert } from '../../src/blockquote.ts';
import { bold } from '../../src/emphasis.ts';

describe('blockquote', () => {
	test('single line', () => {
		expect(blockquote('hello')).toBe('> hello');
	});

	test('multiline', () => {
		expect(blockquote('line 1\nline 2')).toBe('> line 1\n> line 2');
	});

	test('empty string', () => {
		expect(blockquote('')).toBe('> ');
	});

	test('composition: blockquote(bold()) passes through markdown', () => {
		expect(blockquote(String(bold('text')))).toBe('> **text**');
	});
});

describe('alert', () => {
	test('note', () => {
		expect(alert('note', 'Info here')).toBe('> [!NOTE]\n> Info here');
	});

	test('tip', () => {
		expect(alert('tip', 'Helpful tip')).toBe('> [!TIP]\n> Helpful tip');
	});

	test('important', () => {
		expect(alert('important', 'Key info')).toBe('> [!IMPORTANT]\n> Key info');
	});

	test('warning', () => {
		expect(alert('warning', 'Be careful')).toBe('> [!WARNING]\n> Be careful');
	});

	test('caution', () => {
		expect(alert('caution', 'Danger zone')).toBe('> [!CAUTION]\n> Danger zone');
	});

	test('multiline content', () => {
		expect(alert('warning', 'Line 1\nLine 2')).toBe('> [!WARNING]\n> Line 1\n> Line 2');
	});
});

describe('blockquote CR handling', () => {
	test('blockquote with CR keeps content inside quote', () => {
		const html = render(blockquote('a\r# h'));
		expect(html).toContain('<blockquote>');
		// Content must be inside the blockquote, not after it
		const quoteEnd = html.indexOf('</blockquote>');
		const contentPos = html.indexOf('h');
		expect(contentPos).toBeLessThan(quoteEnd);
	});

	test('alert with CR keeps content inside alert', () => {
		const html = render(alert('note', 'a\r# h'));
		// comrak renders alerts as <div>, content must be inside
		expect(html).toContain('alert');
		expect(html).toContain('<h1>');
		// h1 must be before the closing tag
		const h1Pos = html.indexOf('<h1>');
		const closePos = html.lastIndexOf('</div>');
		expect(h1Pos).toBeLessThan(closePos);
	});
});
