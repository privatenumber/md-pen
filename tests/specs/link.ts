import { describe, test, expect } from 'manten';
import { render } from '../utils/render.ts';
import { link, image } from '../../src/link.ts';
import { kbd, sub } from '../../src/misc.ts';
import { escape } from '../../src/escape.ts';
import { code } from '../../src/code.ts';

describe('link', () => {
	test('autolinks http URL without text', () => {
		expect(link('https://x.com')).toBe('<https://x.com>');
	});

	test('autolinks http URL with protocol variations', () => {
		expect(link('http://example.com')).toBe('<http://example.com>');
		expect(link('https://x.com/?a=1&b=2')).toBe('<https://x.com/?a=1&b=2>');
	});

	test('uses markdown link for non-http URL without text', () => {
		expect(link('/docs/guide')).toBe('[/docs/guide](/docs/guide)');
	});

	test('creates markdown link with text', () => {
		expect(link('https://x.com', 'click')).toBe('[click](https://x.com)');
	});

	test('creates markdown link with title only', () => {
		expect(link('https://x.com', 'click', { title: 'T' })).toBe('[click](https://x.com "T")');
	});

	test('falls back to HTML when options go beyond title', () => {
		expect(link('https://x.com', 'click', {
			title: 'T',
			target: '_blank',
		})).toBe(
			'<a title="T" target="_blank" href="https://x.com">click</a>',
		);
	});

	test('falls back to HTML with only non-title options', () => {
		expect(link('https://x.com', 'click', { target: '_blank' })).toBe(
			'<a target="_blank" href="https://x.com">click</a>',
		);
	});

	test('escapes parentheses in URLs', () => {
		expect(link('https://en.wikipedia.org/wiki/Foo_(bar)', 'link')).toBe(
			String.raw`[link](https://en.wikipedia.org/wiki/Foo_\(bar\))`,
		);
	});

	test('escapes spaces in URLs', () => {
		expect(link('/path/to/my file', 'link')).toBe(
			'[link](/path/to/my%20file)',
		);
	});

	test('HTML fallback passes text through for composition', () => {
		expect(link('https://x.com', '<kbd>Enter</kbd>', { target: '_blank' })).toBe(
			'<a target="_blank" href="https://x.com"><kbd>Enter</kbd></a>',
		);
	});

	test('escapes HTML in attribute values in HTML mode', () => {
		expect(link('https://x.com', 'click', {
			title: 'a"b',
			target: '_blank',
		})).toBe(
			'<a title="a&quot;b" target="_blank" href="https://x.com">click</a>',
		);
	});

	test('uses url as text when title-only options but no text', () => {
		expect(link('https://x.com', undefined, { title: 'T' })).toBe(
			'[https://x.com](https://x.com "T")',
		);
	});

	test('uses url as text in HTML fallback when no text', () => {
		expect(link('https://x.com', undefined, { target: '_blank' })).toBe(
			String.raw`<a target="_blank" href="https://x.com">https\://x.com</a>`,
		);
	});

	test('URL-derived labels are literal text', () => {
		const url = 'https://x.test/<img src=x onerror=alert(1)>';
		for (const options of [undefined, { title: 'title' }]) {
			const html = render(link(url, undefined, options));
			expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
			expect(html).not.toContain('<img');
		}
	});

	test('composes Markdown labels without changing code or escaping', () => {
		expect(render(link('u', code('a[0]')))).toBe('<p><a href="u"><code>a[0]</code></a></p>');
		expect(render(link('u', code('a]b[')))).toBe('<p><a href="u"><code>a]b[</code></a></p>');
		expect(render(link('u', escape('*x*')))).toBe('<p><a href="u">*x*</a></p>');
		expect(render(link('/x', image('/cat.png', 'cat')))).toBe('<p><a href="/x"><img src="/cat.png" alt="cat" /></a></p>');
	});

	test('balances brackets around escaped and unequal backtick runs', () => {
		expect(render(link('u', '\\`[`a]`'))).toBe('<p><a href="u">`[<code>a]</code></a></p>');
		expect(render(link('u', '``[`]``'))).toBe('<p><a href="u"><code>[`]</code></a></p>');
		expect(render(link('u', '\\``]`[`'))).toBe('<p><a href="u">`<code>]</code>[`</a></p>');
	});

	test('preserves entity-like URL text in destinations', () => {
		for (const reference of ['&#35;', '&copy;', '&amp;']) {
			const url = `https://x.test/?a=1${reference}z`;
			const href = url.replaceAll('&', '&amp;');
			expect(render(link(url, 'x'))).toContain(`href="${href}"`);
			expect(render(link(url))).toContain(`href="${href}"`);
		}
	});

	test('HTML fallback does not create nested autolinks', () => {
		for (const url of ['https://example.com?a=1&b=2', 'www.example.com']) {
			const html = render(link(url, undefined, { target: '_blank' }));
			expect(html.match(/<a /g)?.length).toBe(1);
			expect(html).toContain(url.replaceAll('&', '&amp;'));
		}
	});
});

describe('image', () => {
	test('creates image with no alt text', () => {
		expect(image('cat.png')).toBe('![](cat.png)');
	});

	test('creates image with alt text', () => {
		expect(image('cat.png', 'A cat')).toBe('![A cat](cat.png)');
	});

	test('creates image with title only', () => {
		expect(image('cat.png', 'A cat', { title: 'T' })).toBe('![A cat](cat.png "T")');
	});

	test('falls back to HTML with width', () => {
		expect(image('cat.png', 'A cat', { width: 200 })).toBe(
			'<img width="200" src="cat.png" alt="A cat" />',
		);
	});

	test('falls back to HTML with title and width', () => {
		expect(image('cat.png', 'A cat', {
			title: 'T',
			width: 200,
		})).toBe(
			'<img title="T" width="200" src="cat.png" alt="A cat" />',
		);
	});

	test('falls back to HTML with width and height', () => {
		expect(image('cat.png', 'A cat', {
			width: 200,
			height: 100,
		})).toBe(
			'<img width="200" height="100" src="cat.png" alt="A cat" />',
		);
	});

	test('omits alt attribute in HTML when alt is undefined', () => {
		expect(image('cat.png', undefined, { width: 200 })).toBe(
			'<img width="200" src="cat.png" />',
		);
	});

	test('escapes parentheses in image URLs', () => {
		expect(image('photo (1).png', 'Photo')).toBe(String.raw`![Photo](photo%20\(1\).png)`);
	});

	test('escapes spaces in image URLs', () => {
		expect(image('my photo.png', 'Photo')).toBe('![Photo](my%20photo.png)');
	});

	test('title-only options with no alt', () => {
		expect(image('cat.png', undefined, { title: 'T' })).toBe('![](cat.png "T")');
	});

	test('preserves escaped Markdown in alt text', () => {
		expect(render(image('u', escape('a_b_c')))).toBe('<p><img src="u" alt="a_b_c" /></p>');
	});

	test('preserves a leading angle bracket in the destination', () => {
		expect(render(image('<bad>', 'x'))).toBe('<p><img src="%3Cbad%3E" alt="x" /></p>');
	});
});

describe('edge cases', () => {
	test('empty options object treated as no options', () => {
		expect(link('https://x.com', 'click', {})).toBe('[click](https://x.com)');
	});

	test('escapes newlines in URLs', () => {
		expect(link('https://x.com/\npath', 'text')).toBe('[text](https://x.com/%0Apath)');
	});

	test('image with empty options treated as no options', () => {
		expect(image('cat.png', 'A cat', {})).toBe('![A cat](cat.png)');
	});

	test('image escapes newlines in URLs', () => {
		expect(image('cat\n.png', 'A cat')).toBe('![A cat](cat%0A.png)');
	});
});

describe('composition', () => {
	test('link with formatted text', () => {
		const bold = (text: string) => `**${text}**`;
		expect(link('https://x.com', bold('text'))).toBe('[**text**](https://x.com)');
	});
});

describe('link/image title with double quote', () => {
	test('link title containing " renders as a working link', () => {
		const md = link('https://example.com', 'x', { title: 'a"b' });
		const html = render(md);
		expect(html).toContain('<a');
		expect(html).toContain('>x<');
	});

	test('image title containing " renders as a working image', () => {
		const md = image('cat.png', 'alt', { title: 'a"b' });
		const html = render(md);
		expect(html).toContain('<img');
		expect(html).toContain('src="cat.png"');
	});
});

describe('autolink URL escaping', () => {
	test('link with space in URL renders as a working link', () => {
		const html = render(link('https://example.com/a b'));
		expect(html).toContain('<a');
		expect(html).toContain('href');
	});
});

describe('title trailing backslash', () => {
	test(String.raw`link title ending with \ renders as a working link`, () => {
		const md = link('https://example.com', 'x', { title: 'ends with \\' });
		const html = render(md);
		expect(html).toContain('<a');
		expect(html).toContain('>x<');
	});

	test(String.raw`image title ending with \ renders as a working image`, () => {
		const md = image('cat.png', 'alt', { title: 'ends with \\' });
		const html = render(md);
		expect(html).toContain('<img');
		expect(html).toContain('src="cat.png"');
	});
});

describe('unescaped ] in link/image text', () => {
	test('link text containing ] renders as a working link', () => {
		const md = link('https://example.com', 'a]b');
		const html = render(md);
		expect(html).toContain('>a]b</a>');
	});

	test('image alt containing ] renders as a working image', () => {
		const md = image('cat.png', 'a]b');
		const html = render(md);
		expect(html).toContain('<img');
		expect(html).toContain('alt="a]b"');
	});

	test('link text containing [ renders correctly', () => {
		const md = link('https://example.com', 'a[b');
		const html = render(md);
		expect(html).toContain('>a[b</a>');
	});
});

describe('link/image text ending with backslash', () => {
	test('link text ending with backslash renders as a working link', () => {
		const md = link('https://example.com', 'ends with \\');
		const html = render(md);
		// Must be a proper link with the text as content, not broken syntax
		expect(html).toContain('>ends with');
		expect(html).toContain('</a>');
		expect(html).not.toContain('[ends with');
	});

	test('image alt ending with backslash renders as a working image', () => {
		const md = image('cat.png', 'ends with \\');
		const html = render(md);
		expect(html).toContain('<img');
		expect(html).toContain('src="cat.png"');
	});
});

describe('escapeUrl gaps', () => {
	test('unbalanced open paren in URL renders as link', () => {
		const html = render(link('/docs/(guide', 'x'));
		expect(html).toContain('>x</a>');
	});

	test('tab in URL renders as link', () => {
		const html = render(link('https://example.com/\tpath', 'x'));
		expect(html).toContain('>x</a>');
	});

	test('image with open paren in URL renders', () => {
		const html = render(image('/photo/(1', 'pic'));
		expect(html).toContain('<img');
	});
});

describe('autolink control chars', () => {
	test('autolink with tab renders as link', () => {
		const html = render(link('https://example.com/\tpath'));
		expect(html).toContain('<a');
		expect(html).toContain('href');
	});

	test('autolink with control char renders as link', () => {
		const html = render(link('https://example.com/\u0001path'));
		expect(html).toContain('<a');
		expect(html).toContain('href');
	});
});

describe('autolink with <', () => {
	test('URL containing < falls back to markdown link', () => {
		const html = render(link('https://example.com/<foo'));
		expect(html).toContain('<a');
		expect(html).toContain('href');
	});
});

describe('link empty string text', () => {
	test('link(url, "") creates markdown link with empty text', () => {
		const md = link('https://example.com', '');
		// Should be [](url), not autolink <url>
		expect(md).toBe('[](https://example.com)');
	});

	test('link(url, "") is consistent with link(url, "", {title})', () => {
		// Both should produce a markdown link with empty text
		const withoutTitle = link('https://example.com', '');
		const withTitle = link('https://example.com', '', { title: 't' });
		// Both should start with []
		expect(withoutTitle.startsWith('[')).toBe(true);
		expect(withTitle.startsWith('[')).toBe(true);
	});
});

describe('HTML attribute name sanitization', () => {
	test('link rejects malformed attribute names', () => {
		const md = link('https://x.com', 'text', {
			'target" rel="noopener': '_blank',
		});
		const html = render(md);
		// Should render as a working link, not broken HTML
		expect(html).toContain('<a');
		expect(html).toContain('>text</a>');
	});

	test('image rejects malformed attribute names', () => {
		const md = image('cat.png', 'alt', {
			'on"error': 'alert(1)',
		});
		const html = render(md);
		expect(html).toContain('<img');
	});

	test('attribute name with angle bracket is sanitized', () => {
		const md = link('https://x.com', 'text', {
			'x><script': 'y',
		});
		const html = render(md);
		expect(html).not.toContain('<script');
	});
});

describe('backslash in URL', () => {
	test('link with trailing backslash renders as link', () => {
		const html = render(link('https://example.com/\\', 'x'));
		expect(html).toContain('>x</a>');
	});

	test('image with backslash in URL preserves path', () => {
		const md = image(String.raw`cat\.png`, 'alt');
		const html = render(md);
		expect(html).toContain('<img');
		// The src should contain the backslash (percent-encoded)
		expect(html).not.toBe(render('![alt](cat.png)'));
	});
});

describe('link/image blank lines in labels', () => {
	test('link with blank line in text renders as link', () => {
		const html = render(link('https://example.com', 'a\n\nb'));
		expect(html).toContain('>a');
		expect(html).toContain('</a>');
	});

	test('image with blank line in alt renders as image', () => {
		const html = render(image('cat.png', 'a\n\nb'));
		expect(html).toContain('<img');
	});
});

describe('title with blank lines', () => {
	test('link title with blank line renders as link', () => {
		const html = render(link('https://example.com', 'x', { title: 'a\n\nb' }));
		expect(html).toContain('>x</a>');
	});

	test('image title with CR blank line renders as image', () => {
		const html = render(image('cat.png', 'alt', { title: 'a\r\rb' }));
		expect(html).toContain('<img');
	});
});

describe('empty attribute name', () => {
	test('attribute with all-invalid-char name is omitted', () => {
		const md = link('https://x.com', 'x', { '"': 'v' } as Record<string, string>);
		expect(md).not.toContain('=""');
		expect(md).not.toContain('="v"');
	});
});

describe('HTML fallback composed HTML content', () => {
	test('link HTML fallback preserves kbd() in text', () => {
		const html = render(link('https://x.com', kbd('Enter'), { target: '_blank' }));
		expect(html).toContain('<kbd>Enter</kbd>');
		expect(html).not.toContain('&lt;kbd&gt;');
	});

	test('link HTML fallback preserves sub() in text', () => {
		const html = render(link('https://x.com', sub('2'), { target: '_blank' }));
		expect(html).toContain('<sub>2</sub>');
	});
});

describe('options cannot override destination', () => {
	test('link href option does not override url parameter', () => {
		const md = link('https://safe.example', 'x', {
			target: '_blank',
			href: 'https://evil.example',
		} as Record<string, string>);
		expect(md).toContain('href="https://safe.example"');
		expect(md).not.toContain('evil.example');
	});

	test('image src option does not override url parameter', () => {
		const md = image('safe.png', 'alt', {
			src: 'evil.png',
			width: 200,
		} as Record<string, string | number>);
		expect(md).toContain('src="safe.png"');
		expect(md).not.toContain('evil.png');
	});

	test('image alt option does not override alt parameter', () => {
		const md = image('safe.png', 'correct', {
			alt: 'overridden',
			width: 200,
		} as Record<string, string | number>);
		expect(md).toContain('alt="correct"');
		expect(md).not.toContain('overridden');
	});
});

describe('www and email autolinks', () => {
	test('link("www.commonmark.org") produces http:// href', () => {
		const html = render(link('www.commonmark.org'));
		expect(html).toContain('href="http://www.commonmark.org"');
	});

	test('link("foo@bar.baz") produces mailto: href', () => {
		const html = render(link('foo@bar.baz'));
		expect(html).toContain('href="mailto:foo@bar.baz"');
	});

	test('www with title option uses http:// href', () => {
		const md = link('www.commonmark.org', undefined, { title: 'site' });
		expect(md).toContain('http://www.commonmark.org');
	});

	test('email with HTML fallback options uses mailto: href', () => {
		const md = link('foo@bar.baz', undefined, { target: '_blank' });
		expect(md).toContain('mailto:foo@bar.baz');
	});

	test('email with + before @ IS auto-linked per cmark-gfm', () => {
		const md = link('hello+xyz@mail.example');
		expect(md).toContain('mailto:');
	});

	test('email HTML fallback does not produce nested anchors', () => {
		const html = render(link('foo@bar.baz', undefined, { target: '_blank' }));
		// Should have exactly one <a> opening tag
		expect(html.match(/<a /g)?.length).toBe(1);
		expect(html).toContain('foo@\u200Bbar.baz');
	});

	test('HTML fallback breaks mentions in URL display text', () => {
		const html = render(link('https://example.com/@user', undefined, { target: '_blank' }));
		expect(html).toContain('/@\u200Buser');
		expect(html.match(/<a /g)?.length).toBe(1);
	});

	test('www with underscore in last two domain segments is not auto-linked', () => {
		const md = link('www.foo.bar_baz');
		expect(md).not.toContain('http://');
	});

	test('www with underscore in first segment IS auto-linked', () => {
		const md = link('www.foo_bar.example.com');
		expect(md).toContain('http://');
	});

	test('www with underscore in path IS auto-linked', () => {
		const md = link('www.google.com/search?q=a_b');
		expect(md).toContain('http://');
	});

	test('www with underscore in path segment IS auto-linked', () => {
		const md = link('www.google.com/path_with_underscore');
		expect(md).toContain('http://');
	});

	test('www with underscore in query IS auto-linked', () => {
		expect(link('www.google.com?q=a_b')).toContain('http://');
	});

	test('www with underscore in fragment IS auto-linked', () => {
		expect(link('www.google.com#frag_underscore')).toContain('http://');
	});

	test('email ending with _ is not auto-linked', () => {
		expect(link('a@b.c_')).not.toContain('mailto:');
	});

	test('email with consecutive dots is not auto-linked', () => {
		expect(link('a@b..c')).not.toContain('mailto:');
	});
});
