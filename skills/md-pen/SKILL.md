---
name: md-pen
description: Usage patterns and API reference for md-pen. Use when formatting markdown strings programmatically.
---

# md-pen

Utilities for formatting Markdown strings. GFM-first, general-purpose.

## Import

```ts
// Namespace
import md from 'md-pen'
md.bold('text')

// Named (tree-shakeable)
import { bold, table, link } from 'md-pen'
```

## API Reference

### Inline Formatting

| Function | Example | Output |
| - | - | - |
| `code(text)` | `code('hello')` | `` `hello` `` |
| `bold(text)` | `bold('important')` | `__important__` |
| `italic(text)` | `italic('emphasis')` | `*emphasis*` |
| `strikethrough(text)` | `strikethrough('no')` | `~~no~~` |
| `bold(italic(text))` | `bold(italic('wow'))` | `__*wow*__` |

### Links and Images

Explicit link text and Markdown image alt text accept Markdown; an omitted link text displays the URL as literal text. HTML image alt text is an attribute.

> [!NOTE]
> `link(url, text)` and `image(url, alt)` take URL first — matches HTML's `<a href="url">text</a>`, not Markdown's `[text](url)`.

```ts
link('https://x.com')                          // <https://x.com>
link('https://x.com', 'click')                  // [click](https://x.com)
link('https://x.com', 'click', { title: 'T' })  // [click](https://x.com "T")

// HTML fallback for non-markdown attributes
link('https://x.com', 'click', { target: '_blank' })
// <a target="_blank" href="https://x.com">click</a>

image('cat.png', 'A cat')                     // ![A cat](cat.png)
image('cat.png', 'A cat', { width: 200 })
// <img width="200" src="cat.png" alt="A cat" />
```

### Block Elements

```ts
heading('Title', 2)  // ## Title
h1('Title')          // # Title  (also h2-h6)

blockquote('text')   // > text

codeBlock('const x = 1', 'ts')
// ```ts
// const x = 1
// ```

hr()  // ___
```

### Tables

Cells can be strings, numbers, or booleans.

```ts
table([
  ['Name', 'Age'],
  ['Alice', 30],
], { align: ['left', 'right'] })
// | Name | Age |
// | :- | -: |
// | Alice | 30 |

// Array of objects (keys become headers):
table([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }])

// columns: order, filter, rename (string or [key, header] tuple)
table([{ firstName: 'Alice', age: 30 }], { columns: [['firstName', 'Name'], 'age'] })

// html: true for block content in cells (code blocks, lists, etc.)
table([['Before', 'After'], [codeBlock('old', 'js'), codeBlock('new', 'js')]], { html: true })
```

Alignment: `'left'`, `'center'`, `'right'`, `'none'`. Ragged rows auto-padded. Pipes in cells escaped.

Markdown-mode pipe escaping may not preserve a backslash before a pipe inside code spans, math spans, angle-bracket autolinks, or raw HTML attributes; line endings in code spans become literal `<br>` text, so use `html: true` for those spans. HTML mode avoids table pipe escaping, but check the target renderer. HTML-mode cells are raw Markdown/HTML; closing tags are not protected and boundary whitespace may be trimmed. Wrap untrusted or literal cell text in `escape()` in either mode; whitespace and line breaks are not preserved exactly.

### Lists

```ts
ul(['a', 'b', ['nested'], 'c'])    // Unordered, nested arrays = children
ol(['first', 'second', 'third'])    // Ordered

taskList([[true, 'Done'], [false, 'Todo']])
// - [x] Done
// - [ ] Todo
```

### GFM Extras

```ts
alert('warning', 'Be careful')     // > [!WARNING]\n> Be careful
details('Summary', 'Content')       // <details><summary>...</summary>...</details>
details('S', 'C', { open: '' })     // <details open="">...</details>
footnoteRef('1')                    // [^1]
footnote('1', 'Source text')        // [^1]: Source text
```

`details()` escapes the summary and attributes, and its content supports Markdown. Nested `details()` output stays live; other `<details` and `</details` tokens are neutralized with an invisible zero-width space. They look unchanged in code, but copied code contains the space. Use `escape()` for untrusted Markdown text. Malformed raw HTML in content can still break the document.

> [!TIP]
> On GitHub, `details()` renders the content flush against the summary. For extra breathing room, prepend `<br>` to the content:
> ```ts
> details('Summary', '<br>\n\n' + ul(['one', 'two']))
> ```

### Niche

`kbd()`, `sub()`, and `sup()` HTML-escape content. In Markdown-parsed contexts, wrap literal text in `escape()`; inside raw HTML blocks, Markdown escapes such as `\*` remain visible, while a backslash before `<`, `>`, `&`, or `"` is dropped because that character is emitted as an HTML entity. Line endings become spaces, including in table cells.

```ts
kbd('Ctrl')          // <kbd>Ctrl</kbd>
kbd('Enter', { title: 'Confirm' })  // <kbd title="Confirm">Enter</kbd>
sub('2')             // <sub>2</sub>
sup('n')             // <sup>n</sup>
sub('2', { title: 'subscript' })    // <sub title="subscript">2</sub>
math('E = mc^2')     // $E = mc^2$
mathBlock('\\sum')   // $$\n\\sum\n$$
mathBlock('x^2')     // $$\nx^2\n$$
mermaid('graph TD')  // ```mermaid\ngraph TD\n```
mention('octocat')   // @octocat
emoji('rocket')      // :rocket:
```

Math uses dollar delimiters for Markdown-safe expressions and GitHub's backtick-delimited or fenced forms otherwise. Use `\lt` and `\gt` instead of literal `<` and `>` in inline math on GitHub. GitHub can expand issue references and emoji shortcodes in either inline form. Fenced display math does not render directly after a task-list checkbox on GitHub or comrak; GitHub also does not render `$$` display math there.

### Generic HTML Element

`el()` throws `TypeError` for tag names outside `[A-Za-z][A-Za-z0-9-]*`. All HTML helpers drop attribute names outside `[A-Za-z_:][A-Za-z0-9_.:-]*`; for example, `el('span', { '@invalid': 'x' }, 'text')` returns `<span>text</span>`.

```ts
el('br')                                    // <br />
el('div')                                   // <div></div>
el('img', { src: 'cat.png', alt: 'Cat' })   // <img src="cat.png" alt="Cat" />
el('p', { align: 'center' }, 'centered')    // <p align="center">centered</p>
```

Content is raw (not escaped). Without content, HTML void elements and the `svg`/`math` roots use a self-closing tag; other elements use an opening and closing tag.

### Escaping

```ts
escape('**not bold**')  // \*\*not bold\*\*
```

Use `escape()` for untrusted user input. It inserts a zero-width space in colon-delimited names in shortcode position even when they are not emoji names; among digit-only names, it guards only `:100:` and `:1234:`. Emphasis content is Markdown; use `escape()` for literal text. On delimiter collisions, bold uses `**` or `<strong>`, italic uses `<em>`, and strikethrough uses `<del>`. Bold's `__` form cannot apply inside a word; use `el('strong', undefined, 'text')` there. Emphasis content must stay within one paragraph: blank lines and block-starting lines end it.

```ts
bold(link('https://x.com', 'text'))  // __[text](https://x.com)__
```
