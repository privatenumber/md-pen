import { expectTypeOf } from 'expect-type';
import {
	alert, ol, table, taskList, ul,
	type AlertType, type CellValue, type ColumnEntry, type ListItem, type TableOptions,
	type ReadonlyListItem, type ReadonlyTableOptions,
} from '../src/exports.ts';

// Types released in v1.2.0 keep their exact shape.
expectTypeOf<ListItem>().toEqualTypeOf<string | ListItem[]>();
expectTypeOf<ColumnEntry>().toEqualTypeOf<string | [key: string, header: string]>();
expectTypeOf<TableOptions>().toEqualTypeOf<{
	align?: ('left' | 'center' | 'right' | 'none')[];
	columns?: ColumnEntry[];
	html?: boolean;
}>();
expectTypeOf<CellValue>().toEqualTypeOf<string | number | boolean | null | undefined>();
expectTypeOf<AlertType>().toEqualTypeOf<'note' | 'tip' | 'important' | 'warning' | 'caution'>();
expectTypeOf(table).parameter(1).toEqualTypeOf<TableOptions | ReadonlyTableOptions | undefined>();

// Readonly inputs
const readonlyList = ['a', ['b']] as const;
expectTypeOf(readonlyList).toExtend<readonly ReadonlyListItem[]>();
expectTypeOf(ul).toBeCallableWith(readonlyList);
expectTypeOf(ol).toBeCallableWith(readonlyList);
const readonlyTasks = [[true, 'x']] as const;
expectTypeOf(taskList).toBeCallableWith(readonlyTasks);
const readonlyRows = [['H'], ['x']] as const;
expectTypeOf(table).toBeCallableWith(readonlyRows);
expectTypeOf(table).toBeCallableWith([] as readonly { name: string }[]);
const readonlyOptions = {
	columns: [['name', 'Name']],
	align: ['left'],
} as const;
expectTypeOf(readonlyOptions).toExtend<ReadonlyTableOptions>();
expectTypeOf(table).toBeCallableWith([{ name: 'a' }], readonlyOptions);

// Values typed with the mutable released types are still accepted
expectTypeOf(alert).toBeCallableWith('note' as AlertType, 'content');
expectTypeOf(ul).toBeCallableWith([] as ListItem[]);
expectTypeOf(ol).toBeCallableWith([] as ListItem[]);
expectTypeOf(taskList).toBeCallableWith([] as [boolean, string][]);
expectTypeOf(table).toBeCallableWith([] as CellValue[][], {} as TableOptions);
expectTypeOf(table).toBeCallableWith([] as string[][] | Record<string, string>[]);
expectTypeOf(table).toBeCallableWith([{ count: 1 }, { count: null }]);
export const genericRows = <T extends Record<string, string>>(rows: T[]) => (
	expectTypeOf(table).toBeCallableWith(rows)
);

// Rejected inputs
// @ts-expect-error Object values are not table cells.
expectTypeOf(table).toBeCallableWith([{ name: { nested: 'x' } }]);
// @ts-expect-error Object values are not table cells.
expectTypeOf(table).toBeCallableWith([['header'], [{}]]);
// @ts-expect-error Rows cannot be null.
expectTypeOf(table).toBeCallableWith([null]);
// @ts-expect-error Object rows cannot include null.
expectTypeOf(table).toBeCallableWith([{ name: 'Alice' }, null]);
// @ts-expect-error Primitive values are not rows.
expectTypeOf(table).toBeCallableWith([1]);
// @ts-expect-error Array rows cannot be mixed with object rows.
expectTypeOf(table).toBeCallableWith([['Name'], { name: 'Alice' }]);
// @ts-expect-error A length property does not make an object an array row.
expectTypeOf(table).toBeCallableWith([['H'], { length: 1 }]);
// @ts-expect-error Object rows cannot be mixed with array rows.
expectTypeOf(table).toBeCallableWith([{ name: 'Alice' }, ['Name']]);
// @ts-expect-error The object type lacks a compatible index signature or known properties.
expectTypeOf(table).toBeCallableWith([] as object[]);
// @ts-expect-error List items must be strings or nested lists.
expectTypeOf(ul).toBeCallableWith([1]);
// @ts-expect-error Task labels must be strings.
expectTypeOf(taskList).toBeCallableWith([[true, 1]] as const);
