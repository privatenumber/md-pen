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

hr()  // ---
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

> [!TIP]
> On GitHub, `details()` renders the content flush against the summary. For extra breathing room, prepend `<br>` to the content:
> ```ts
> details('Summary', '<br>\n\n' + ul(['one', 'two']))
> ```

### Niche

```ts
kbd('Ctrl')          // <kbd>Ctrl</kbd>
kbd('Enter', { title: 'Confirm' })  // <kbd title="Confirm">Enter</kbd>
sub('2')             // <sub>2</sub>
sup('n')             // <sup>n</sup>
sub('2', { title: 'subscript' })    // <sub title="subscript">2</sub>
math('E = mc^2')     // $E = mc^2$
mathBlock('\\sum')   // $$\n\\sum\n$$
mermaid('graph TD')  // ```mermaid\ngraph TD\n```
mention('octocat')   // @octocat
emoji('rocket')      // :rocket:
```

### Generic HTML Element

```ts
el('br')                                    // <br />
el('img', { src: 'cat.png', alt: 'Cat' })   // <img src="cat.png" alt="Cat" />
el('p', { align: 'center' }, 'centered')    // <p align="center">centered</p>
```

Content is raw (not escaped). Without content, self-closing.

### Escaping

```ts
escape('**not bold**')  // \*\*not bold\*\*
```

Use `escape()` for untrusted user input. Bold uses `__` and italic uses `*` — different delimiters that compose without collision:

```ts
bold(link('https://x.com', 'text'))  // __[text](https://x.com)__
```
