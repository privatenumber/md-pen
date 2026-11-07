import { describe } from 'manten';

describe('md-pen', () => {
	import('./specs/escape.ts');
	import('./specs/code.ts');
	import('./specs/emphasis.ts');
	import('./specs/heading.ts');
	import('./specs/link.ts');
	import('./specs/blockquote.ts');
	import('./specs/list.ts');
	import('./specs/table.ts');
	import('./specs/block.ts');
	import('./specs/math.ts');
	import('./specs/footnote.ts');
	import('./specs/misc.ts');
	import('./rendering/rendering.ts');
	import('./composition/nesting.ts');
	import('./composition/fuzz.ts');
});
