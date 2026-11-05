import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { table } from '../../src/table.ts';
import { kbd, sub } from '../../src/misc.ts';
import { escape } from '../../src/escape.ts';
import { code } from '../../src/code.ts';

describe('table', () => {
	test('basic 2x2 table', () => {
		expect(table([
			['Name', 'Age'],
			['Alice', '30'],
		])).toBe(
			'| Name | Age |\n'
			+ '| - | - |\n'
			+ '| Alice | 30 |',
		);
	});

	test('alignment options', () => {
		expect(table([
			['Name', 'Age', 'City', 'Note'],
			['Alice', '30', 'NYC', 'hello'],
		], {
			align: ['left', 'center', 'right', 'none'],
		})).toBe(
			'| Name | Age | City | Note |\n'
			+ '| :- | :-: | -: | - |\n'
			+ '| Alice | 30 | NYC | hello |',
		);
	});

	test('ragged rows are padded with empty cells', () => {
		expect(table([
			['Name', 'Age', 'City'],
			['Alice', '30'],
		])).toBe(
			'| Name | Age | City |\n'
			+ '| - | - | - |\n'
			+ '| Alice | 30 |  |',
		);
	});

	test('escapes pipe characters in cells', () => {
		expect(table([
			['Expression', 'Result'],
			['a | b', 'true'],
		])).toBe(
			`| Expression | Result |\n| - | - |\n${String.raw`| a \| b | true |`}`,
		);
	});

	test('replaces newlines with <br> in cells', () => {
		expect(table([
			['Title', 'Content'],
			['Multi', 'line1\nline2'],
		])).toBe(
			'| Title | Content |\n'
			+ '| - | - |\n'
			+ '| Multi | line1<br>line2 |',
		);
	});

	test('single column table', () => {
		expect(table([
			['Item'],
			['Apple'],
			['Banana'],
		])).toBe(
			'| Item |\n'
			+ '| - |\n'
			+ '| Apple |\n'
			+ '| Banana |',
		);
	});

	test('empty rows returns empty string', () => {
		expect(table([])).toBe('');
	});

	test('auto-stringifies number cells', () => {
		expect(table([
			['Name', 'Age'],
			['Alice', 30],
		])).toBe(
			'| Name | Age |\n'
			+ '| - | - |\n'
			+ '| Alice | 30 |',
		);
	});

	test('auto-stringifies boolean cells', () => {
		expect(table([
			['Name', 'Active'],
			['Alice', true],
		])).toBe(
			'| Name | Active |\n'
			+ '| - | - |\n'
			+ '| Alice | true |',
		);
	});

	test('auto-stringifies mixed types', () => {
		expect(table([
			['String', 'Number', 'Bool'],
			['text', 42, false],
		])).toBe(
			'| String | Number | Bool |\n'
			+ '| - | - | - |\n'
			+ '| text | 42 | false |',
		);
	});

	test('accepts array of objects', () => {
		expect(table([
			{
				name: 'Alice',
				age: 30,
			},
			{
				name: 'Bob',
				age: 25,
			},
		])).toBe(
			'| name | age |\n'
			+ '| - | - |\n'
			+ '| Alice | 30 |\n'
			+ '| Bob | 25 |',
		);
	});

	test('array of objects with alignment', () => {
		expect(table([
			{
				name: 'Alice',
				age: 30,
			},
		], { align: ['left', 'right'] })).toBe(
			'| name | age |\n'
			+ '| :- | -: |\n'
			+ '| Alice | 30 |',
		);
	});

	test('array of objects with missing keys', () => {
		expect(table([
			{
				name: 'Alice',
				age: 30,
			},
			{ name: 'Bob' },
		])).toBe(
			'| name | age |\n'
			+ '| - | - |\n'
			+ '| Alice | 30 |\n'
			+ '| Bob |  |',
		);
	});

	test('columns option controls order', () => {
		expect(table([
			{
				name: 'Alice',
				age: 30,
				city: 'NYC',
			},
		], { columns: ['city', 'name'] })).toBe(
			'| city | name |\n'
			+ '| - | - |\n'
			+ '| NYC | Alice |',
		);
	});

	test('columns option omits unlisted properties', () => {
		expect(table([
			{
				name: 'Alice',
				age: 30,
				city: 'NYC',
				active: true,
			},
		], { columns: ['name', 'age'] })).toBe(
			'| name | age |\n'
			+ '| - | - |\n'
			+ '| Alice | 30 |',
		);
	});

	test('columns with tuple renames header', () => {
		expect(table([
			{
				firstName: 'Alice',
				lastName: 'Smith',
				age: 30,
			},
		], { columns: [['firstName', 'Name'], ['lastName', 'Surname'], 'age'] })).toBe(
			'| Name | Surname | age |\n'
			+ '| - | - | - |\n'
			+ '| Alice | Smith | 30 |',
		);
	});

	test('columns with all tuples', () => {
		expect(table([
			{
				a: 1,
				b: 2,
			},
		], { columns: [['b', 'B Column'], ['a', 'A Column']] })).toBe(
			'| B Column | A Column |\n'
			+ '| - | - |\n'
			+ '| 2 | 1 |',
		);
	});

	test('columns with alignment', () => {
		expect(table([
			{
				name: 'Alice',
				age: 30,
			},
		], {
			columns: ['age', 'name'],
			align: ['right', 'left'],
		})).toBe(
			'| age | name |\n'
			+ '| -: | :- |\n'
			+ '| 30 | Alice |',
		);
	});

	test('columns with nonexistent key produces empty cells', () => {
		expect(table([
			{ a: 1 },
		], { columns: ['missing'] })).toBe(
			'| missing |\n'
			+ '| - |\n'
			+ '|  |',
		);
	});

	test('object cells only read own properties', () => {
		const own = JSON.parse('{"toString":"own","__proto__":"prototype","constructor":"constructor","hasOwnProperty":"method"}');
		const columns = ['toString', '__proto__', 'constructor', 'hasOwnProperty'];
		expect(table([own, { name: 'missing' }])).toBe(
			'| toString | __proto__ | constructor | hasOwnProperty | name |\n'
			+ '| - | - | - | - | - |\n'
			+ '| own | prototype | constructor | method |  |\n'
			+ '|  |  |  |  | missing |',
		);
		for (const html of [false, true]) {
			const output = render(table([own, { name: 'missing' }], {
				columns,
				html,
			}));
			expect(output).toContain('own');
			expect(output).toContain('prototype');
			expect(output).not.toContain('[native code]');
			expect(output).not.toContain('[object Object]');
		}
	});

	test('undefined and null values produce empty cells', () => {
		expect(table([
			{
				name: 'Alice',
				age: undefined,
				city: null,
			},
		])).toBe(
			'| name | age | city |\n'
			+ '| - | - | - |\n'
			+ '| Alice |  |  |',
		);
	});

	test('empty array of objects returns empty string', () => {
		expect(table([])).toBe('');
	});

	test('header only with no body rows', () => {
		expect(table([
			['Name', 'Age'],
		])).toBe(
			'| Name | Age |\n'
			+ '| - | - |',
		);
	});
});

describe('table cells with carriage return', () => {
	test('CR in cell produces single cell, not two rows', () => {
		const html = render(table([['H'], [`a${'\r'}b`]]));
		const bodyRows = html.match(/<td>/g) ?? [];
		expect(bodyRows.length).toBe(1);
	});

	test('CRLF in cell produces single cell', () => {
		const html = render(table([['H'], [`a${'\r\n'}b`]]));
		const bodyRows = html.match(/<td>/g) ?? [];
		expect(bodyRows.length).toBe(1);
	});

	test('line endings each produce one break', () => {
		expect(render(table([['H'], ['a\r\nb\rc\nd']]))).toContain('<td>a<br>b<br>c<br>d</td>');
	});

	test('backslashes before line endings preserve the rendered text', () => {
		for (const ending of ['\n', '\r\n', '\r']) {
			for (let count = 0; count < 6; count += 1) {
				const text = `a${'\\'.repeat(count)}${ending}b`;
				const expected = render(text).slice(3, -4).replaceAll('<br />\n', '<br>').replaceAll('\n', '<br>');
				expect(render(table([['H'], [text]]))).toContain(`<td>${expected}</td>`);
			}
		}
	});
});

describe('table object keys union', () => {
	test('table collects keys from all objects', () => {
		const md = table([
			{ a: 1 },
			{
				a: 2,
				b: 3,
			},
		]);
		expect(md).toContain('| a | b |');
		expect(md).toContain('| 1 |');
		expect(md).toContain('| 2 | 3 |');
	});
});

describe('zero-column tables', () => {
	test('table([[]]) returns empty string', () => {
		expect(table([[]])).toBe('');
	});

	test('table([{}]) returns empty string', () => {
		expect(table([{}])).toBe('');
	});

	test('table with columns:[] returns empty string', () => {
		expect(table([{ a: 1 }], { columns: [] })).toBe('');
	});

	test('table([{}, {a:1}]) collects keys from all objects', () => {
		const md = table([{}, { a: 1 }]);
		expect(md).toContain('| a |');
		expect(md).toContain('| 1 |');
	});
});

describe('table backslash-pipe', () => {
	test('HTML mode preserves backslash before a pipe in a code span', () => {
		expect(render(table([['H'], [code(String.raw`a\|b`)]], { html: true })))
			.toContain(String.raw`<code>a\|b</code>`);
	});

	test('escaped literal backslashes before a pipe are preserved', () => {
		for (let count = 0; count < 6; count += 1) {
			const text = `${'\\'.repeat(count)}|`;
			expect(render(table([['H'], [escape(text)]]))).toContain(`<td>${text}</td>`);
		}
	});
	test('backslash runs before a pipe match ordinary Markdown', () => {
		for (let count = 0; count < 6; count += 1) {
			const text = `a${'\\'.repeat(count)}|b`;
			const expected = render(text).slice(3, -4);
			expect(render(table([['H'], [text]]))).toContain(`<td>${expected}</td>`);
		}
	});
});

describe('table backslash over-escaping', () => {
	test('backslash-asterisk in cell renders as literal text', () => {
		const html = render(table([['H'], [String.raw`\*x*`]]));
		expect(html).not.toContain('<em>');
		expect(html).toContain('*x*');
	});

	test('backslash-bracket in cell renders as literal text', () => {
		const html = render(table([['H'], [String.raw`\[x](u)`]]));
		expect(html).not.toContain('<a');
		expect(html).toContain('[x]');
	});
});

describe('table whitespace trimming', () => {
	test('leading/trailing whitespace in cell is preserved', () => {
		const html = render(table([[' H '], [' x ']]));
		const thMatch = html.match(/<th>(.*?)<\/th>/);
		// &nbsp; (char 160) preserves whitespace that GFM would otherwise trim
		expect(thMatch![1]).toContain('\u00A0');
		expect(thMatch![1]).toContain('H');
	});

	test('whitespace-only cell is not empty', () => {
		const html = render(table([['H'], ['   ']]));
		const tdMatch = html.match(/<td>(.*?)<\/td>/);
		expect(tdMatch![1].length).toBeGreaterThan(0);
	});

	test('multiple boundary spaces survive trimming', () => {
		expect(render(table([['H'], ['   x   '], ['   ']])))
			.toContain('<td>\u00A0  x  \u00A0</td>');
		expect(render(table([['H'], ['   ']]))).toContain('<td>\u00A0 \u00A0</td>');
	});

	test('backslashes before trailing whitespace remain literal', () => {
		for (const whitespace of [' ', '\t']) {
			for (let count = 0; count < 6; count += 1) {
				const text = `a${'\\'.repeat(count)}${whitespace}`;
				const expected = render(`${text}b`).slice(3, -4).slice(0, -2);
				expect(render(table([['H'], [text]]))).toContain(`<td>${expected}\u00A0</td>`);
			}
		}
	});
});

describe('table HTML composition in cells', () => {
	test('kbd() in cell renders as HTML', () => {
		const html = render(table([['Key'], [kbd('Enter')]]));
		expect(html).toContain('<kbd>Enter</kbd>');
	});

	test('sub() in cell renders as HTML', () => {
		const html = render(table([['Formula'], [sub('2')]]));
		expect(html).toContain('<sub>2</sub>');
	});
});

describe('table html mode', () => {
	test('basic html table', () => {
		const md = table([
			['Name', 'Age'],
			['Alice', '30'],
		], { html: true });
		expect(md).toContain('<table>');
		expect(md).toContain('<th>');
		expect(md).toContain('Name');
		expect(md).toContain('<td>');
		expect(md).toContain('Alice');
		expect(md).toContain('</table>');
	});

	test('html cells wrap content with blank lines for markdown rendering', () => {
		const md = table([
			['H'],
			['text'],
		], { html: true });
		expect(md).toContain('<td>\n\ntext\n\n</td>');
	});

	test('html mode supports code blocks in cells', () => {
		const md = table([
			['Before', 'After'],
			['```js\nold\n```', '```js\nnew\n```'],
		], { html: true });
		expect(md).toContain('```js');
		expect(md).toContain('<table>');
		// No pipe escaping — raw markdown content
		expect(md).not.toContain(String.raw`\|`);
	});

	test('html mode with alignment', () => {
		const md = table([
			['L', 'R'],
			['a', 'b'],
		], {
			html: true,
			align: ['left', 'right'],
		});
		expect(md).toContain('align="left"');
		expect(md).toContain('align="right"');
	});

	test('html mode with objects', () => {
		const md = table([
			{
				name: 'Alice',
				age: 30,
			},
		], { html: true });
		expect(md).toContain('<th>');
		expect(md).toContain('name');
		expect(md).toContain('<td>');
		expect(md).toContain('Alice');
	});

	test('html mode with columns tuples', () => {
		const md = table([
			{ firstName: 'Alice' },
		], {
			html: true,
			columns: [['firstName', 'Name']],
		});
		expect(md).toContain('<th>\n\nName\n\n</th>');
		expect(md).toContain('<td>\n\nAlice\n\n</td>');
	});

	test('html mode empty input', () => {
		expect(table([], { html: true })).toBe('');
	});

	test('html mode stringifies numbers', () => {
		const md = table([
			['Val'],
			[42],
		], { html: true });
		expect(md).toContain('42');
	});

	test('html mode null/undefined become empty cells', () => {
		const md = table([
			['H'],
			[null],
		], { html: true });
		expect(md).toContain('<td>\n\n\n\n</td>');
	});

	test('html mode alignment does not allow attribute injection', () => {
		const md = table([['H'], ['x']], {
			html: true,
			align: ['left" data-pwn="1' as 'left'],
		});
		expect(md).not.toContain('data-pwn');
	});
});
