'use strict';
var assert = require('assert');
var path = require('path');

var compile = require('../lib/main');

[
  // Compile/Render tests
  { what: 'static only',
    tpl: '<hello world>',
    cfg: {},
    data: {},
    out: '<hello world>' },
  { what: 'unescaped output',
    tpl: '[[- "<p>hello world</p>" ]]',
    cfg: {},
    data: {},
    out: '<p>hello world</p>' },
  { what: 'escaped output',
    tpl: '[[= "<p>hello world</p>" ]]',
    cfg: {},
    data: {},
    out: '&lt;p&gt;hello world&lt;/p&gt;' },
  { what: 'variable output',
    tpl: '[[- z.str ]]',
    cfg: {},
    data: { str: 'hello world' },
    out: 'hello world' },
  { what: 'newline removal in output',
    tpl: '[[- z.str >]]',
    cfg: {},
    data: { str: '\n\n hello world\t\r\n' },
    out: ' hello world\t' },
  { what: 'all whitespace removal in output',
    tpl: '[[- z.str >>]]',
    cfg: {},
    data: { str: '    hello world\t\r\n' },
    out: 'hello world' },
  { what: 'code evaluation (not rendered)',
    tpl: '[[ if (z.n === 5) { ]] value is 5! [[ } ]]',
    cfg: {},
    data: { n: 6 },
    out: '' },
  { what: 'code evaluation (rendered)',
    tpl: '[[ if (z.n === 5) { ]] value is 5! [[ } ]]',
    cfg: {},
    data: { n: 5 },
    out: ' value is 5! ' },
  { what: 'end marker inside string literal #1',
    tpl: '[[- "321 [[ so sneaky! ]] 123" ]]',
    cfg: {},
    data: {},
    out: '321 [[ so sneaky! ]] 123' },
  { what: 'end marker inside string literal #2',
    tpl: '[[- \'321 [[ so sneaky! ]] 123\' ]]',
    cfg: {},
    data: {},
    out: '321 [[ so sneaky! ]] 123' },
  { what: 'end marker inside string literal #3',
    tpl: '[[- `321 [[ so sneaky! ]] 123` ]]',
    cfg: {},
    data: {},
    out: '321 [[ so sneaky! ]] 123' },
  // Configuration tests
  { what: 'custom objName',
    tpl: '[[- data.str ]]',
    cfg: { objName: 'data' },
    data: { str: 'hello world' },
    out: 'hello world' },
  { what: 'custom start marker',
    tpl: '!@- z.str ]]',
    cfg: { start: '!@' },
    data: { str: 'hello world' },
    out: 'hello world' },
  { what: 'custom end marker',
    tpl: '[[- z.str $$',
    cfg: { end: '$$' },
    data: { str: 'hello world' },
    out: 'hello world' },
].forEach(function(test) {
  var fn;
  var actual;
  try {
    fn = compile(test.tpl, test.cfg);
  } catch (ex) {
    throw new Error(`[${test.what}] compile() failed:\n${ex.stack}`);
  }
  try {
    actual = fn(test.data);
  } catch (ex) {
    throw new Error(`[${test.what}] render failed:\n${ex.stack}`);
  }
  var expected = test.out;
  var message = `[${test.what}] output mismatch\n`
                + `Actual:\n${JSON.stringify(actual)}\n`
                + `Expected:\n${JSON.stringify(expected)}`;
  assert.strictEqual(actual, expected, message);
});

// include() with custom cache (load from memory)
{
  let tpl = '[[- include(\'greeting\') >>]]! Nice to see you!';
  let greetingFn = compile('Hello World');
  let cache = {
    get: function(name) {
      assert.strictEqual(name, 'greeting');
      return greetingFn;
    },
    set: function(name, filename, fn) {
      assert(false, 'Should not set()');
    }
  };
  assert.strictEqual(compile(tpl, { cache })(),
                     'Hello World! Nice to see you!');
}

// include() with custom cache (load from disk)
{
  let tpl = '[[- include(\'fixtures/greeting\') >>]]! Nice to see you!';
  let cache = {
    get: function(name) {
      assert.strictEqual(name, 'fixtures/greeting');
    },
    set: function(name, filename, fn) {
      assert.strictEqual(name, 'fixtures/greeting');
      assert.strictEqual(filename,
                         path.join(__dirname, 'fixtures', 'greeting.ztpl'));
      assert.strictEqual(typeof fn, 'function');
    }
  };
  assert.strictEqual(compile(tpl, { cache })(),
                     'Good Morning! Nice to see you!');
}

// include() with custom cache (load from disk with explicit basePath)
{
  let tpl = '[[- include(\'greeting\') >>]]! Nice to see you!';
  let cache = {
    get: function(name) {
      assert.strictEqual(name, 'greeting');
    },
    set: function(name, filename, fn) {
      assert.strictEqual(name, 'greeting');
      assert.strictEqual(filename,
                         path.join(__dirname, 'fixtures', 'greeting.ztpl'));
      assert.strictEqual(typeof fn, 'function');
    }
  };
  let opts = {
    basePath: path.join(__dirname, 'fixtures'),
    cache
  };
  assert.strictEqual(compile(tpl, opts)(),
                     'Good Morning! Nice to see you!');
}

// include() with custom object
{
  let tpl = '[[- include(\'greeting\', { word: "Hi" }) >>]]! Nice to see you!';
  let greetingFn = compile('[[- z.word ]] World');
  let cache = {
    get: function(name) {
      assert.strictEqual(name, 'greeting');
      return greetingFn;
    },
    set: function(name, filename, fn) {
      assert(false, 'Should not set()');
    }
  };
  assert.strictEqual(compile(tpl, { cache })(),
                     'Hi World! Nice to see you!');
}
