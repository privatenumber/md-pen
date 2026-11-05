import {
	alert, ol, table, taskList, ul,
	type AlertType, type CellValue, type ColumnEntry, type ListItem, type TableOptions,
} from '../src/exports.ts';

export const inputTypes = (rows: readonly { name: string }[]) => {
	// Interface rows must not require a string index signature.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Row {
		name: string;
		count?: number;
	}
	const interfaceRows: Row[] = [];
	table(interfaceRows);
	table(rows);
	table([{ name: 'a' }, { name: 'b' }]);
	table([{ count: 1 }, { count: null }]);
	const readonlyRows = [['H'], ['x']] as const;
	table(readonlyRows);
	table([['H'], ['x']]);
	table([]);
	const readonlyList = ['a', ['b']] as const;
	const readonlyTasks = [[true, 'x']] as const;
	ul(readonlyList);
	ol(readonlyList);
	taskList(readonlyTasks);
	const readonlyOptions = {
		columns: [['name', 'Name']],
		align: ['left'],
	} as const;
	table(rows, readonlyOptions);

	const alertType: AlertType = 'note';
	const value: CellValue = 1;
	const item: ListItem = ['a', ['b']];
	const column: ColumnEntry = ['name', 'Name'];
	const options: TableOptions = { columns: [column] };
	alert(alertType, 'content');
	ul([item]);
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
	// @ts-expect-error Object rows cannot be mixed with array rows.
	table([{ name: 'Alice' }, ['Name']]);
	const unknownRows: object[] = [{ value: { nested: 'x' } }];
	// @ts-expect-error Object rows must have known cell value types.
	table(unknownRows);
	// @ts-expect-error List items must be strings or nested lists.
	ul([1]);
	// @ts-expect-error Task labels must be strings.
	taskList([[true, 1]] as const);
};
