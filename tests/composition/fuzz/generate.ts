import type {
	Inline, List, ListKind, Block,
} from './tree.ts';

const literalTexts = [
	'alpha',
	'beta',
	'a*b',
	'x_y',
	'a~b',
	'[test]',
	'<tag>',
	'a&b',
	'a|b',
	'`tick`',
	'x:y',
	'a#12',
	'$x$',
	'@someone',
	':smile:',
	'www.example.com',
	'https://example.com/x',
	'a@example.com',
	'a\nb',
	'a\r\nb',
	'a  b',
	'one\ntwo',
];

export const generator = (seed: number) => {
	/* eslint-disable no-bitwise -- Mix the seed before initializing xorshift. */
	let state = Math.imul(seed ^ (seed >>> 16), 0x85_EB_CA_6B);
	state = Math.imul(state ^ (state >>> 13), 0xC2_B2_AE_35);
	state = (state ^ (state >>> 16)) || 1;
	/* eslint-enable no-bitwise */
	let footnoteId = 0;
	const random = (maximum: number) => {
		/* eslint-disable no-bitwise -- Xorshift is defined by bitwise operations. */
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) % maximum;
		/* eslint-enable no-bitwise */
	};
	const nextFootnoteId = () => {
		const id = `f${footnoteId}`;
		footnoteId += 1;
		return id;
	};
	const choose = <T>(values: readonly T[]): T => values[random(values.length)];
	const inline = (depth: number, inLink = false): Inline => {
		// Footnote references contain links, which cannot nest inside link text.
		const options: Exclude<Inline['kind'], 'sequence'>[] = ['word', 'literal', 'code', 'kbd', 'math', 'image', ...(inLink ? [] : ['ref' as const])];
		if (depth) {
			options.push('bold', 'italic', 'strike');
			if (!inLink) {
				options.push('link');
			}
		}
		const kind = choose(options);
		switch (kind) {
			case 'word': {
				return {
					kind,
					text: choose(['alpha', 'beta', 'gamma']),
				};
			}
			case 'literal': case 'code': {
				return {
					kind,
					text: choose(literalTexts),
				};
			}
			case 'kbd': {
				return {
					kind,
					text: choose(['alpha', 'a&b', '<tag>', 'x_y']),
				};
			}
			// Comrak and GitHub disagree on backtick-delimited math.
			case 'math': {
				return {
					kind,
					text: choose(['x+1', 'E=2', 'a-b']),
				};
			}
			case 'image': {
				return {
					kind,
					text: choose(['cat', 'dog']),
					url: '/cat.png',
				};
			}
			case 'ref': {
				return {
					kind,
					id: nextFootnoteId(),
				};
			}
			default: {
				return {
					kind,
					child: kind === 'link' && random(2) === 0
						? sequence(depth - 1, true)
						: inline(depth - 1, inLink || kind === 'link'),
				};
			}
		}
	};
	const sequence = (depth: number, inLink = false): Inline => {
		const children: Inline[] = [];
		const count = 2 + random(3);
		for (let index = 0; index < count; index += 1) {
			children.push(inline(depth, inLink));
		}
		return {
			kind: 'sequence',
			children,
		};
	};
	const list = (depth: number, kind: ListKind, insideDetails: boolean): List => ({
		kind,
		items: Array.from({ length: 1 + random(3) }, () => {
			const checked = Boolean(random(2));
			if (kind !== 'task' && random(4) === 0) {
				const blockKind = choose(insideDetails ? ['quote', 'codeBlock'] as const : ['details', 'quote', 'codeBlock'] as const);
				const child: Block = blockKind === 'codeBlock'
					? {
						kind: blockKind,
						text: 'x\ny',
					}
					: {
						kind: blockKind,
						child: {
							kind: 'word',
							text: 'alpha',
						},
					};
				return {
					checked,
					child,
				};
			}
			return {
				checked,
				child: sequence(Math.max(0, depth - 1)),
				...(kind !== 'task' && depth > 1 && random(4) === 0 ? { nested: list(depth - 1, kind, insideDetails) } : {}),
			};
		}),
	});
	const block = (
		depth: number,
		inContainer = false,
		insideDetails = false,
		afterContainer = false,
	): Block => {
		const types: Block['kind'][] = ['paragraph', 'heading', 'table', 'ul', 'ol', 'task', 'codeBlock', 'mathBlock', 'hr', 'footnote'];
		if (depth) {
			types.push('quote');
			// README's details() limit applies when a container separates two details sections.
			if (!afterContainer) {
				types.push('details');
			}
			if (!inContainer) {
				types.push('alert');
			}
		}
		const kind = choose(types);
		switch (kind) {
			case 'ul': case 'ol': case 'task': {
				return list(depth, kind, insideDetails);
			}
			case 'heading': {
				return {
					kind,
					level: choose([1, 2, 3, 4, 5, 6] as const),
					child: sequence(depth),
				};
			}
			case 'paragraph': {
				return {
					kind,
					child: sequence(depth),
				};
			}
			case 'table': {
				const columns = 1 + random(3);
				return {
					kind,
					rows: Array.from({ length: 2 + random(2) }, () => (
						Array.from({ length: columns }, () => sequence(depth))
					)),
				};
			}
			case 'codeBlock': {
				return {
					kind,
					text: choose(['alpha', 'a*b', 'x\ny', '<tag>']),
				};
			}
			case 'mathBlock': {
				return {
					kind,
					text: 'x+1',
				};
			}
			case 'hr': {
				return { kind };
			}
			case 'footnote': {
				return {
					kind,
					id: nextFootnoteId(),
					text: 'footnote',
				};
			}
			default: {
				return {
					kind,
					child: random(2)
						? block(depth - 1, true, insideDetails || kind === 'details', afterContainer || (insideDetails && (kind === 'quote' || kind === 'alert')))
						: inline(depth - 1),
				};
			}
		}
	};
	return () => {
		footnoteId = 0;
		return Array.from({ length: 1 + random(3) }, () => block(1 + random(4)));
	};
};
