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
	table([['H'], ['x']] as const);
	table([['H'], ['x']]);
	table([]);
	ul(['a', ['b']] as const);
	ol(['a', ['b']] as const);
	taskList([[true, 'x']] as const);

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
	// @ts-expect-error List items must be strings or nested lists.
	ul([1]);
	// @ts-expect-error Task labels must be strings.
	taskList([[true, 1]] as const);
};
