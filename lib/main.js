'use strict';
// TODO: support trim options for non-expressions, for trimming static output?
var path = require('path');
var readFileSync = require('fs').readFileSync;

var makeRenderer = require('./compile-env');

module.exports = compile;

// Make the default base path for `include()`'d templates be relative to the
// "main" script.
var defaultBasePath = (function() {
  var m = module;
  while (m.parent)
    m = m.parent;
  return path.dirname(m.filename);
})();

var emptyObj = {};


// Generates a simple renderer function for cases when the string template
// merely consists of static text.
function makeSimpleRenderer(str) {
  return function() {
    return str;
  };
}

// Creates an `include()` helper that can be used in templates for rendering an
// external template as a 'partial.'
function makeInclude(cfg) {
  var basePath = (typeof cfg.basePath === 'string' && cfg.basePath
                  ? cfg.basePath
                  : defaultBasePath);
  var cache = (cfg.cache
                && typeof cfg.cache.get === 'function'
                && typeof cfg.cache.set === 'function'
               ? cfg.cache
               : null);
  return function include(name, obj) {
    var filename;
    if (cache) {
      var fn;
      if (fn = cache.get(name))
        return fn(obj);
      filename = path.join(basePath, `${name}.ztpl`);
      fn = compile(readFileSync(filename, 'utf8'), cfg);
      cache.set(name, filename, fn);
      return fn(obj);
    } else {
      filename = path.join(basePath, `${name}.ztpl`);
      return compile(readFileSync(filename, 'utf8'), cfg)(obj);
    }
  };
}

// Escapes single quotes, backslashes, carriage returns, line feeds, and UTF-8
// line and paragraph separators. This is used as a faster, "simpler"
// alternative to `JSON.stringify()`.
function makeStringLiteral(s) {
  var p = 0;
  var r = '';
  for (var i = 0; i < s.length; ++i) {
    var c = s.charCodeAt(i);
    if (c === 39 || c === 92) {
      if (i-p) r+=s.slice(p, i); r+=`\\${s[i]}`;
    } else if (c === 10) {
      if (i-p) r+=s.slice(p, i); r+='\\n';
    } else if (c === 13) {
      if (i-p) r+=s.slice(p, i); r+='\\r';
    } else if (c === 8232) {
      if (i-p) r+=s.slice(p, i); r+='\\u2028';
    } else if (c === 8232) {
      if (i-p) r+=s.slice(p, i); r+='\\u2029';
    } else continue;
    p = i + 1;
  }
  if (r && p < s.length) r += s.slice(p);
  return `'${r || s}'`;
}

// Parses a string template and generates a function that renders output given
// an object containing data to be used by the template.
function compile(str, cfg) {
  if (typeof cfg !== 'object' || cfg === null)
    cfg = emptyObj;
  if (typeof str !== 'string')
    throw new Error('template must be a string');
  var fn = '';
  var start = (typeof cfg.start === 'string' && cfg.start) || '[[';
  var end = (typeof cfg.end === 'string' && cfg.end) || ']]';
  var lastPos = (str && str.charCodeAt(0) === 65279/*UTF-8 BOM*/ ? 1 : 0);
  var i = str.indexOf(start);
  var endChars = [];
  for (var c = 0; c < end.length; ++c)
    endChars[c] = end.charCodeAt(c);
  while (i !== -1) {
    var dquote = false;
    var squote = false;
    var tick = false;
    var esc = false;
    var endPos = 0;
    var j = i + start.length;
    for (; j < str.length; ++j) {
      var ch = str.charCodeAt(j);
      if (ch === 34) { // "
        if (dquote) {
          if (!esc)
            dquote = false;
        } else if (!squote && !tick) {
          dquote = true;
        }
      } else if (ch === 39) { // '
        if (squote) {
          if (!esc)
            squote = false;
        } else if (!dquote && !tick) {
          squote = true;
        }
      } else if (ch === 96) { // `
        if (tick) {
          if (!esc)
            tick = false;
        } else if (!dquote && !squote) {
          tick = true;
        }
      } else if (ch === 92) { // '\'
        if (!esc && (dquote || squote || tick)) {
          esc = true;
          continue;
        }
      } else if (!dquote && !squote && !tick) {
        if (ch === endChars[endPos]) {
          if (++endPos === endChars.length) {
            var sliceStart = i + start.length;
            var sliceEnd = j - endPos + 1;
            var eateol = (sliceStart < sliceEnd - 1
                          && str.charCodeAt(sliceEnd - 1) === 62); // <
            var eatws = (eateol
                         && sliceStart < sliceEnd - 2
                         && str.charCodeAt(sliceEnd - 2) === 62); // <
            var escOut = false;
            var expr = false;
            if ((eatws && sliceStart < j - 2)
                || (eateol && sliceStart < j - 1)
                || (!eateol && sliceStart < j)) {
              var startChar = str.charCodeAt(sliceStart);
              if (startChar === 45) { // -
                expr = true;
                ++sliceStart;
              } else if (startChar === 61) { // =
                expr = true;
                escOut = true;
                ++sliceStart;
              }
            }
            if (eatws)
              sliceEnd -= 2;
            else if (eateol)
              --sliceEnd;
            var slice = str.slice(sliceStart, sliceEnd);

            if (!fn) {
              if (i) {
                fn = `var __z=${makeStringLiteral(str.slice(0, i))};\n`;
                if (expr) {
                  var val = `(${slice})`;
                  if (escOut)
                    val = `__zesc${val}`;
                  if (eatws)
                    fn += `\n__z+=__ztws(''+${val});\n`;
                  else if (eateol)
                    fn += `\n__z+=__zteol(''+${val});\n`;
                  else
                    fn += `\n__z+=${val};\n`;
                } else {
                  fn += slice;
                }
              } else if (expr) {
                var val = `(${slice})`;
                if (escOut)
                  val = `__zesc${val}`;
                if (eatws)
                  val = `__ztws(''+${val})`;
                else if (eateol)
                  val = `__zteol(''+${val})`;
                fn = `var __z=${val};\n`;
              } else {
                fn = `var __z='';\n`;
                fn += slice;
              }
            } else {
              if (i - lastPos)
                fn += `\n__z+=${makeStringLiteral(str.slice(lastPos, i))};\n`;
              if (expr) {
                var val = `(${slice})`;
                if (escOut)
                  val = `__zesc${val}`;
                if (eatws)
                  fn += `\n__z+=__ztws(''+${val});\n`;
                else if (eateol)
                  fn += `\n__z+=__zteol(''+${val});\n`;
                else
                  fn += `\n__z+=${val};\n`;
              } else {
                fn += slice;
              }
            }

            endPos = 0;
            lastPos = j + 1;
            break;
          }
        } else {
          endPos = 0;
        }
      }
      esc = false;
    }
    if (j === str.length)
      break;
    i = str.indexOf(start, lastPos);
  }
  if (!fn)
    return makeSimpleRenderer(str);
  if (lastPos < str.length)
    fn += `\n__z+=${makeStringLiteral(str.slice(lastPos))};\n`;
  fn += `\nreturn __z;`;
  var objName = (typeof cfg.objName === 'string' && cfg.objName
                 ? cfg.objName
                 : 'z');
  return makeRenderer(fn, objName, makeInclude(cfg));
}
