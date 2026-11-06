<p align="center">
    <img width="200" src=".github/logo.webp">
</p>
<h1 align="center">md-pen</h1>

Typed utilities for formatting Markdown. GFM (GitHub-Flavored Markdown) first.

### Features

- Zero dependencies
- Full TypeScript with exported types, including `AlertType`, `ListItem`, `ReadonlyListItem`, `CellValue`, `TableOptions`, `ReadonlyTableOptions`, and `ColumnEntry`
- Every output verified against a CommonMark parser
- GitHub-compatible (audited against [cmark-gfm](https://github.com/github/cmark-gfm))
- Functions compose naturally

## Install

```sh
npm install md-pen
```

## Usage

```ts
import {
    bold, code, link, table
} from 'md-pen'

bold('important') // __important__
code('git status') // `git status`
link('https://github.com', 'GitHub') // [GitHub](https://github.com)

table([
    ['Name', 'Age'],
    ['Alice', '30']
])
// | Name | Age |
// | - | - |
// | Alice | 30 |
```

A default export is also available: `import md from 'md-pen'` then `md.bold()`, `md.table()`, etc.

## API

### Inline

#### `code(text)`

Wraps in backtick code span. Handles backticks in content automatically.

```ts
code('hello') // `hello`
code('a `b` c') // `` a `b` c ``
```

#### `bold(text)`

```ts
bold('important') // __important__
```

Underscore delimiters cannot apply bold inside a word. Use `el('strong', undefined, 'text')` for that case. Nested italic content ending in `_` may also prevent bold from rendering.

#### `italic(text)`

```ts
italic('emphasis') // *emphasis*
```

#### `strikethrough(text)`

```ts
strikethrough('no') // ~~no~~
```

The emphasis functions return an empty string for empty input and leave whitespace-only input unchanged. They move boundary whitespace outside the delimiters and preserve line endings. Content must stay within one paragraph: blank lines and lines that start a block, such as `- item`, end it. Backticks in Markdown link destinations or titles can pair with a later code span. Bare URLs inside emphasis content may be altered; `link(url)` without a label generates a protected angle-bracket autolink for lowercase `http://` or `https://` URLs without spaces, control characters, or angle brackets.

#### `link(url, text?, options?)`

Markdown by default. Falls back to HTML when options go beyond what markdown supports.
Explicit link text is Markdown, so it can contain output from other helpers. If text is omitted, the URL is displayed as literal text.

> [!NOTE]
> `link(url, text)` and `image(url, alt)` take URL first — matches HTML's `<a href="url">text</a>`, not Markdown's `[text](url)`.

```ts
link('https://x.com') // <https://x.com>
link('/docs/guide') // [/docs/guide](/docs/guide)
link('https://x.com', 'click') // [click](https://x.com)
link('https://x.com', 'click', { title: 'T' }) // [click](https://x.com "T")

// HTML fallback for attributes markdown can't express
link('https://x.com', 'click', { target: '_blank' })
// <a target="_blank" href="https://x.com">click</a>
```

#### `image(url, alt?, options?)`

Same fallback principle as `link`.
In Markdown output, alt text is Markdown and can contain output from other helpers. In HTML output, alt text is an HTML attribute.

```ts
image('cat.png') // ![](cat.png)
image('cat.png', 'A cat') // ![A cat](cat.png)
image('cat.png', 'A cat', { title: 'T' }) // ![A cat](cat.png "T")

// HTML fallback for width/height
image('cat.png', 'A cat', {
    width: 200,
    height: 100
})
// <img width="200" height="100" src="cat.png" alt="A cat" />
```

### Block

#### `heading(text, level?)` / `h1`-`h6`

```ts
heading('Title') // # Title
heading('Sub', 2) // ## Sub
h1('Title') // # Title
h3('Section') // ### Section
```

#### `blockquote(text)`

Prefixes each line with `> `.

```ts
blockquote('line 1\nline 2')
// > line 1
// > line 2
```

#### `codeBlock(code, language?)`

Fenced code block. Handles content containing backtick fences.

```ts
codeBlock('const x = 1', 'ts')
// ```ts
// const x = 1
// ```
```

#### `table(rows, options?)`

First row is the header. Cells auto-stringify numbers and booleans. Ragged rows are padded.

```ts
table([
    ['Name', 'Age'],
    ['Alice', 30]
], { align: ['left', 'right'] })
// | Name | Age |
// | :- | -: |
// | Alice | 30 |
```

Also accepts an array of objects. An object-literal `type` alias works without an index signature; an `interface` or class needs a compatible string index signature. Own enumerable string keys, including getters, become headers; pass `columns` for inherited or non-enumerable getters (in TypeScript, a class instance still needs that index signature).

List and table inputs accept readonly arrays, including nested arrays and task tuples.

```ts
table([
    {
        name: 'Alice',
        age: 30
    },
    {
        name: 'Bob',
        age: 25
    }
])
// | name | age |
// | - | - |
// | Alice | 30 |
// | Bob | 25 |
```

Use `columns` to control order, filter, and rename. Each entry is a key or `[key, header]` tuple:

```ts
table([
    {
        firstName: 'Alice',
        age: 30,
        id: 1
    }
], {
    columns: [['firstName', 'Name'], 'age']
})
// | Name | age |
// | - | - |
// | Alice | 30 |
```

Use `html: true` for block content in cells (code blocks, lists, etc.):

```ts
table([
    ['Before', 'After'],
    [codeBlock('old()', 'js'), codeBlock('updated()', 'js')]
], { html: true })
// Outputs an HTML <table> with markdown-rendered cells
```

Alignment: `'left'`, `'center'`, `'right'`, `'none'`

> [!NOTE]
> In Markdown mode, newlines become `<br>` and the first and last boundary spaces or tabs become non-breaking spaces. A backslash immediately before a pipe in a code span, math span, angle-bracket autolink, or raw HTML attribute may not be preserved; line endings in code spans become literal `<br>` text, so use HTML mode for those spans. HTML mode avoids table pipe escaping, but renderer behavior may still differ. HTML-mode cells are raw Markdown/HTML: closing tags such as `</td>` or `</table>` are not protected, and boundary whitespace may be trimmed. Wrap untrusted or literal cell text in `escape()` in either mode; it does not preserve whitespace or line breaks exactly.

#### `ul(items)` / `ol(items)`

Nested arrays become children of the preceding item.

Item text is Markdown and leading spaces and tabs are stripped; raw HTML blocks or other block syntax in an item can swallow or reshape nested lists.

```ts
ul(['a', 'b', ['nested 1', 'nested 2'], 'c'])
// - a
// - b
//   - nested 1
//   - nested 2
// - c

ol(['first', 'second', ['sub-a'], 'third'])
// 1. first
// 2. second
//    1. sub-a
// 3. third
```

#### `hr()`

```ts
hr() // ___
```

### GFM Extras

#### `taskList(items)`

```ts
taskList([
    [true, 'Done'],
    [false, 'Todo']
])
// - [x] Done
// - [ ] Todo
```

#### `alert(type, content)`

Types: `'note'`, `'tip'`, `'important'`, `'warning'`, `'caution'`

```ts
alert('warning', 'Be careful') // eslint-disable-line no-alert
// > [!WARNING]
// > Be careful
```

#### `footnoteRef(id)` / `footnote(id, text)`

GitHub footnote backlinks may not navigate correctly for IDs containing uppercase or non-ASCII characters.

```ts
footnoteRef('1') // [^1]
footnote('1', 'Source') // [^1]: Source
```

#### `details(summary, content, options?)`

Collapsible section. The summary and attributes are HTML-escaped, and content supports Markdown. Nested `details()` output stays live; other `<details` and `</details` tokens are neutralized with an invisible zero-width space. They look unchanged in code, but copied code contains the space. Use `escape()` for untrusted Markdown text. Malformed raw HTML in content can still break the document.

```ts
details('Click to expand', 'Hidden **markdown** here')
// <details>
// <summary>Click to expand</summary>
//
// Hidden **markdown** here
//
// </details>

details('Expanded', 'Visible', { open: '' })
// <details open="">
// <summary>Expanded</summary>
//
// Visible
//
// </details>
```

### Niche

#### `kbd(key, options?)`

Content is HTML-escaped but still parsed as Markdown, except inside a raw HTML block such as `el()` content. In Markdown-parsed contexts, wrap literal text in `escape()`; inside raw HTML blocks, Markdown escapes such as `\*` remain visible, while a backslash before `<`, `>`, `&`, or `"` is dropped because that character is emitted as an HTML entity. Line endings become spaces, including in table cells.

```ts
kbd('Ctrl') // <kbd>Ctrl</kbd>
kbd('Enter', { title: 'Confirm' }) // <kbd title="Confirm">Enter</kbd>
```

#### `sub(text, options?)` / `sup(text, options?)`

Content is HTML-escaped but still parsed as Markdown, except inside a raw HTML block such as `el()` content. In Markdown-parsed contexts, wrap literal text in `escape()`; inside raw HTML blocks, Markdown escapes such as `\*` remain visible, while a backslash before `<`, `>`, `&`, or `"` is dropped because that character is emitted as an HTML entity. Line endings become spaces, including in table cells.

```ts
sub('2') // <sub>2</sub>
sup('n') // <sup>n</sup>
sub('2', { title: 'subscript' }) // <sub title="subscript">2</sub>
```

#### `math(expression)` / `mathBlock(expression)`

```ts
math('E = mc^2') // $E = mc^2$

mathBlock(String.raw`\sum_{i=1}^n x_i`)
// $$
// \sum_{i=1}^n x_i
// $$
```

> [!NOTE]
> Inline `math()` cannot render expressions ending with `\` (the backslash escapes the closing `$`). Use `mathBlock()` instead.

#### `mermaid(code)`

Sugar for `codeBlock(code, 'mermaid')`.

```ts
mermaid('graph TD;\n  A-->B;')
// ```mermaid
// graph TD;
//   A-->B;
// ```
```

#### `mention(username)` / `emoji(name)`

```ts
mention('octocat') // @octocat
emoji('rocket') // :rocket:
```

### Generic

#### `el(tag, attributes?, content?)`

Generic HTML element builder for tags without a dedicated function. Tag names must match `[A-Za-z][A-Za-z0-9-]*`; invalid names throw a `TypeError`. Attribute values are HTML-escaped. All HTML helpers drop attribute names outside the CommonMark grammar `[A-Za-z_:][A-Za-z0-9_.:-]*`. Content is raw (not escaped). Without content, HTML void elements and the `svg`/`math` roots use a self-closing tag; other elements use an opening and closing tag.

```ts
el('br') // <br />
el('div') // <div></div>
el('span', { '@invalid': 'x' }, 'text') // <span>text</span>
el('img', {
    src: 'cat.png',
    alt: 'A cat'
}) // <img src="cat.png" alt="A cat" />
el('p', { align: 'center' }, 'centered text')
// <p align="center">centered text</p>
```

### Escaping

#### `escape(text)`

Backslash-escapes all ASCII punctuation in untrusted text, plus GitHub-specific guards for mentions, issue references, emoji shortcodes, and dollar signs. The guards use invisible zero-width spaces, which are retained when copying the rendered text. GitHub can interpret references in URL paths after the URL is escaped, so those paths may also contain zero-width spaces. Dollar signs are guarded even where GitHub does not render math, because other renderers may do so. GitHub commit SHA references are not neutralized. Leading indentation, whitespace before line breaks, and whitespace at the end of the input may be normalized, so `escape('a  ') + 'b'` produces `a b`.

`escape()` does not keep an emoji-name table. It inserts a zero-width space in colon-delimited names in shortcode position even if they are not emoji names. Digit-only names are an exception: only `:100:` and `:1234:` are guarded.

```ts
escape('**not bold**') // \*\*not bold\*\*
```

## Composition

Functions return plain strings. Bold uses `__` and italic uses `*`, so they compose without delimiter collision:

```ts
bold(italic('text'))
// __*text*__

bold(link('https://x.com', 'click'))
// __[click](https://x.com)__

blockquote(bold('important'))
// > __important__

ul([
    link('https://a.com', 'Link A'),
    link('https://b.com', 'Link B')
])
// - [Link A](https://a.com)
// - [Link B](https://b.com)
```

## Escaping Strategy

Each function escapes only what would break its own syntax:

- `table()` escapes `|` in cells, newlines become `<br>`
- `link()` / `image()` escapes Markdown destination delimiters and character references, and percent-encodes spaces and control characters in URLs in both Markdown and HTML output
- `code()` adjusts backtick delimiter length
- HTML functions (`kbd`, `sub`, `sup`) escape `<`, `>`, `&`, `"`; `details` escapes its summary and attributes, and protects its content against early closing

Composition works without double-escaping. Use `escape()` for untrusted user input.
