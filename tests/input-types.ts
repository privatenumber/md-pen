import {
	alert, ol, table, taskList, ul,
	type AlertType, type CellValue, type ColumnEntry, type ListItem, type TableOptions,
	type ReadonlyListItem, type ReadonlyTableOptions,
} from '../src/exports.ts';

export const genericRows = <T extends Record<string, string>>(rows: T[]) => table(rows);
export const columnHeader = (entry: ColumnEntry): string => (
	Array.isArray(entry) ? entry[1] : entry
);

export const inputTypes = (rows: readonly { name: string }[]) => {
	table(rows);
	table([{ name: 'a' }, { name: 'b' }]);
	table([{ count: 1 }, { count: null }]);
	const readonlyRows = [['H'], ['x']] as const;
	table(readonlyRows);
	table([['H'], ['x']]);
	table([]);
	const readonlyList = ['a', ['b']] as const;
	const readonlyTasks = [[true, 'x']] as const;
	const annotatedList: readonly ReadonlyListItem[] = readonlyList;
	ul(readonlyList);
	ol(readonlyList);
	ul(annotatedList);
	taskList(readonlyTasks);
	const readonlyOptions = {
		columns: [['name', 'Name']],
		align: ['left'],
	} as const;
	table(rows, readonlyOptions);
	const annotatedOptions: ReadonlyTableOptions = readonlyOptions;
	table(rows, annotatedOptions);

	const alertType: AlertType = 'note';
	const value: CellValue = 1;
	const item: ListItem = ['a', ['b']];
	const column: ColumnEntry = ['name', 'Name'];
	const options: TableOptions = { columns: [column] };
	options.columns!.push('name');
	const columnName: string = Array.isArray(column) ? column[1] : column;
	const legacyRows: string[][] | Record<string, string>[] = Math.random() ? [['name']] : [{ name: 'a' }];
	table(legacyRows);
	table([[columnName]]);
	alert(alertType, 'content');
	ul([item]);
	ol([item]);
	const mutableTasks: [boolean, string][] = [[true, 'x']];
	taskList(mutableTasks);
	table([[value]], options);

	// @ts-expect-error Object values are not table cells.
	table([{ name: { nested: 'x' } }]);
	// @ts-expect-error Object values are not table cells.
	table([['header'], [{}]]);
	// @ts-expect-error Rows cannot be null.
	table([null]);
	// @ts-expect-error Object rows cannot include null.
	table([{ name: 'Alice' }, null]);
	// @ts-expect-error Primitive values are not rows.
	table([1]);
	// @ts-expect-error Array rows cannot be mixed with object rows.
	table([['Name'], { name: 'Alice' }]);
	// @ts-expect-error A length property does not make an object an array row.
	table([['H'], { length: 1 }]);
	// @ts-expect-error Object rows cannot be mixed with array rows.
	table([{ name: 'Alice' }, ['Name']]);
	const unknownRows: object[] = [{ value: { nested: 'x' } }];
	// @ts-expect-error The object type lacks a compatible index signature or known properties.
	table(unknownRows);
	// @ts-expect-error List items must be strings or nested lists.
	ul([1]);
	// @ts-expect-error Task labels must be strings.
	taskList([[true, 1]] as const);
};
