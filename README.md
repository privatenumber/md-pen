<p align="center">
    <img width="200" src=".github/logo.webp">
</p>
<h1 align="center">md-pen</h1>

Typed utilities for formatting Markdown. GFM (GitHub-Flavored Markdown) first.

### Features

- Zero dependencies
- Full TypeScript with exported types
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

#### `italic(text)`

```ts
italic('emphasis') // *emphasis*
```

#### `strikethrough(text)`

```ts
strikethrough('no') // ~~no~~
```

#### `link(url, text?, options?)`

Markdown by default. Falls back to HTML when options go beyond what markdown supports.

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

Also accepts an array of objects (keys become headers):

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
> In markdown mode, newlines become `<br>` and boundary whitespace becomes `&nbsp;`, so those literal strings can't be represented in cells. Use `html: true` for exact content preservation.

#### `ul(items)` / `ol(items)`

Nested arrays become children of the preceding item.

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
hr() // ---
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

```ts
footnoteRef('1') // [^1]
footnote('1', 'Source') // [^1]: Source
```

#### `details(summary, content, options?)`

Collapsible section. Summary is HTML-escaped, content supports markdown.

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

```ts
kbd('Ctrl') // <kbd>Ctrl</kbd>
kbd('Enter', { title: 'Confirm' }) // <kbd title="Confirm">Enter</kbd>
```

#### `sub(text, options?)` / `sup(text, options?)`

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

Generic HTML element builder for tags without a dedicated function. Attribute values are HTML-escaped and attribute names are sanitized against injection. Content is raw (not escaped). Without content, produces a self-closing tag.

```ts
el('br') // <br />
el('img', {
    src: 'cat.png',
    alt: 'A cat'
}) // <img src="cat.png" alt="A cat" />
el('p', { align: 'center' }, 'centered text')
// <p align="center">centered text</p>
```

### Escaping

#### `escape(text)`

Escapes markdown special characters in untrusted input.

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
- `link()` / `image()` percent-encodes `(`, `)`, spaces, and control chars in URLs
- `code()` adjusts backtick delimiter length
- HTML functions (`kbd`, `sub`, `sup`, `details`) escape `<`, `>`, `&`, `"`

Composition works without double-escaping. Use `escape()` for untrusted user input.
