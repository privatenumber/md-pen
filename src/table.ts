import { escapeTableCell } from './escape.ts';

type TableAlignment = 'left' | 'center' | 'right' | 'none';

export type ColumnEntry = string | [key: string, header: string];

export type TableOptions = {
	align?: TableAlignment[];
	columns?: ColumnEntry[];
	html?: boolean;
};

export type CellValue = string | number | boolean | null | undefined;

export type ReadonlyTableOptions = {
	align?: readonly TableAlignment[];
	columns?: readonly (string | readonly [key: string, header: string])[];
	html?: boolean;
};

const isObjectArray = (
	input: readonly (readonly CellValue[])[] | readonly Record<string, CellValue>[],
): input is readonly Record<string, CellValue>[] => !Array.isArray(input[0]);

const resolveRows = (
	input: readonly (readonly CellValue[])[] | readonly Record<string, CellValue>[],
	options?: ReadonlyTableOptions,
) => {
	if (isObjectArray(input)) {
		const columnEntries = options?.columns
			?? [...new Set(input.flatMap(item => Object.keys(item)))];
		const keys = columnEntries.map(entry => (Array.isArray(entry) ? entry[0] : entry as string));
		const headers = columnEntries.map(entry => (Array.isArray(entry) ? entry[1] : entry as string));

		return {
			rows: [
				headers,
				...input.map(item => keys.map(key => item[key] ?? '')),
			],
			columnCount: keys.length,
		};
	}

	let columnCount = 0;
	for (const row of input) {
		if (row.length > columnCount) {
			columnCount = row.length;
		}
	}

	return {
		rows: input,
		columnCount,
	};
};

const stringify = (value: CellValue) => ((value === null || value === undefined) ? '' : String(value));

// --- Markdown table ---

const separatorCell = (alignment: TableAlignment) => {
	switch (alignment) {
		case 'left': { return ':-';
		}
		case 'center': { return ':-:';
		}
		case 'right': { return '-:';
		}
		default: { return '-';
		}
	}
};

const buildMarkdownRow = (cells: readonly CellValue[], columnCount: number) => {
	let row = '|';
	for (let i = 0; i < columnCount; i += 1) {
		row += ` ${escapeTableCell(stringify(i < cells.length ? cells[i] : undefined))} |`;
	}
	return row;
};

const buildMarkdownTable = (
	rows: readonly (readonly CellValue[])[],
	columnCount: number,
	options?: ReadonlyTableOptions,
) => {
	const alignments = options?.align ?? [];

	let separator = '|';
	for (let i = 0; i < columnCount; i += 1) {
		separator += ` ${separatorCell(alignments[i] ?? 'none')} |`;
	}

	const lines = [
		buildMarkdownRow(rows[0], columnCount),
		separator,
	];

	for (let i = 1; i < rows.length; i += 1) {
		lines.push(buildMarkdownRow(rows[i], columnCount));
	}

	return lines.join('\n');
};

// --- HTML table ---

const validAlignments = new Set(['left', 'center', 'right']);

const alignAttribute = (alignment?: TableAlignment) => (alignment && validAlignments.has(alignment) ? ` align="${alignment}"` : '');

const buildHtmlTable = (
	rows: readonly (readonly CellValue[])[],
	columnCount: number,
	options?: ReadonlyTableOptions,
) => {
	const alignments = options?.align ?? [];
	const [header, ...body] = rows;

	const lines = ['<table>', '<thead>', '<tr>'];

	for (let i = 0; i < columnCount; i += 1) {
		const content = stringify(i < header.length ? header[i] : undefined);
		lines.push(`<th${alignAttribute(alignments[i])}>\n\n${content}\n\n</th>`);
	}

	lines.push('</tr>', '</thead>', '<tbody>');

	for (const row of body) {
		lines.push('<tr>');
		for (let i = 0; i < columnCount; i += 1) {
			const content = stringify(i < row.length ? row[i] : undefined);
			lines.push(`<td${alignAttribute(alignments[i])}>\n\n${content}\n\n</td>`);
		}
		lines.push('</tr>');
	}

	lines.push('</tbody>', '</table>');

	return lines.join('\n');
};

// --- Public API ---

type TableRows = readonly (readonly CellValue[])[] | readonly Readonly<Record<string, CellValue>>[];

export const table = (
	input: TableRows,
	options?: TableOptions | ReadonlyTableOptions,
) => {
	if (input.length === 0) {
		return '';
	}

	const { rows, columnCount } = resolveRows(input, options);

	if (columnCount === 0) {
		return '';
	}

	if (options?.html) {
		return buildHtmlTable(rows, columnCount, options);
	}

	return buildMarkdownTable(rows, columnCount, options);
};
