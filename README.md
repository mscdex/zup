
Description
===========

A simple, fast template engine for node. The syntax is very close to that of other template engines, especially `ejs`.

One special feature of `zup` is that it ignores any 'end markers' that may appear in string literals inside a code block or expression. This is something that some other template engines (that usually use regexps for parsing) do not take into account and could lead to surprising results. For example:

```
<h1>[[- "Look ma, a fake ]]!" ]]</h1>
```

In this particular case, `zup` will correctly render this template like:

```html
<h1>Look ma, a fake ]]!</h1>
```

Benchmark results can be found [here](https://github.com/mscdex/zup/wiki/Benchmarks).


Requirements
============

* [node.js](http://nodejs.org/) -- v4.0.0 or newer, although v6.0.0+ is recommended for best performance.


Install
============

    npm install zup


Example
=======

```js
var compile = require('zup');

var fn = compile(`
<html>
  <head>
    <title>My First Article</title>
  </head>
  <body>
    <h1>[[=z.heading.length > 16 ? z.heading.slice(0,16) + '...' : z.heading]]</h1>
    [[ if (z.alert) { ]]
      <h3>[[=z.alert]]</h3>
    [[ } ]]
    <pre>[[-z.content>>]]</pre>
  </body>
</html>
`);

console.log(fn({
  heading: 'This title will be truncated',
  content: `
    My life story, and I'm not kidding this time...
  `,
  alert: '<b>HI MOM!</b>'
}));

// Displays:
//
// <html>
//   <head>
//     <title>My First Article</title>
//   </head>
//   <body>
//     <h1>This title will ...</h1>
//     
//       <h3>&lt;b&gt;HI MOM!&lt;/b&gt;</h3>
//     
//     <pre>My life story, and I'm not kidding this time...</pre>
//   </body>
// </html>
//
```

Syntax
======

`zup` expressions/code blocks are enclosed by (customizable) start and end markers.

Special symbols placed right inside the start and end markers control the output of expressions.

Symbols that can be used after **start** markers:

  * `=` - This indicates that the output resulting from the expression should have some special characters converted to their respective html entity names:

    * `<`, `>`, `&`, `'`, `"`

  * `-` - (opposite of `=`) This indicates that the output resulting from the expression should *not* have special characters converted to their respective html entity names.

  * *(none)* - This indicates a generic code block, useful for control flow (e.g. `if`, `while`, `for`, etc.) and other such statements.

Symbols that can be used before **end** markers:

  * `>` - If just a single `<`, this indicates that only newlines (`'\r'` and `'\n'`) will be trimmed from the beginning and end of the output returned from the expression.

  * `>>` - This indicates that all whitespace (`'\r'`, `'\n'`, `'\t'`, `' '`, and `'\f'`) will be trimmed from the beginning and end of the output returned from the expression.


API
===

`require('zup')` returns the template compiler function.

* **compile**(< _string_ >template[, < _object_ >options]) - _function_ - Creates and returns a compiled template as a renderer function. The following are valid `options` properties:

    * **objName** - _string_ - This is the name of the object used to access data variables. **Default:** `'z'`

    * **start** - _string_ - The start marker used to indicate the start of a zup expression or code block. **Default:** `'[['`

    * **end** - _string_ - The end marker used to indicate the end of a zup expression or code block. **Default:** `']]'`

    * **basePath** - _string_ - This is the default base path used for looking up templates referenced by calls to `include()` in a template. **Default:** (the directory of the "main" script)

    * **cache** - _object_ - This object should contain `get()` and `set()` functions:

      * **get**(< _string_ >name) - _(mixed)_ - `name` is the string passed to the `include()` function inside a template. Return a _function_ to use that for rendering the requested template. If no value/`undefined` is returned, then the template will be searched for on the local file system using the configured `basePath` and appending `'.ztpl'` to the end of `name`.

      * **set**(< _string_ >name, < _string_ >filepath, < _function_ >compiled) - _(void)_ - `name` is the string passed to the `include()` function inside a template, `filepath` is the absolute path of the newly compiled template, and `compiled` is the resulting renderer function. Store `compiled` somewhere for use in `get()` to avoid repeated template parsing/compilation.
