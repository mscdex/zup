'use strict';
// This file is used as the context used by compiled renderer functions.
//
// A separate file is used to remove any unrelated functions/variables (used by
// template engine itself) from the scopes of compiled renderer functions.
//
// The `vm` module could be used to more properly sandbox compiled renderer
// functions, but generating a new `vm` context per template is quite slow.


// Trims whitespace faster than `str.trim()` (tested against V8 5.1-5.5).
function __ztws(str) {
  var c;
  for (var i = 0; i < str.length; ++i) {
    c = str.charCodeAt(i);
    if (c !== 32 && c !== 10 && c !== 13 && c !== 9 && c !== 12) break;
  }
  for (var j = str.length - 1; j >= i; --j) {
    c = str.charCodeAt(j);
    if (c !== 32 && c !== 10 && c !== 13 && c !== 9 && c !== 12) break;
  }
  if (i === 0 && j === str.length - 1) return str;
  return str.slice(i, j + 1);
}

// Trims EOL characters faster than `str.trim()` (tested against V8 5.1-5.5).
function __zteol(str) {
  var c;
  for (var i = 0; i < str.length; ++i) {
    c = str.charCodeAt(i);
    if (c !== 10 && c !== 13) break;
  }
  for (var j = str.length - 1; j >= i; --j) {
    c = str.charCodeAt(j);
    if (c !== 10 && c !== 13) break;
  }
  if (i === 0 && j === str.length - 1) return str;
  return str.slice(i, j + 1);
}

// Encodes ampersands, less-than signs, greater-than signs, single quotes, and
// double quotes to their shortest, respective HTML entity names.
function __zesc(s) {
  var r = '';
  var p = 0;
  for (var k = 0; k < s.length; ++k) {
    var c = s.charCodeAt(k);
    if (c === 38) {
      if (k - p) r+=s.slice(p, k);
      r+='&amp;'; p=k+1;
    } else if (c === 60) {
      if (k - p) r+=s.slice(p, k);
      r+='&lt;'; p=k+1;
    } else if (c === 62) {
      if (k - p) r+=s.slice(p, k);
      r+='&gt;'; p=k+1;
    } else if (c === 34) {
      if (k - p) r+=s.slice(p, k);
      r+='&#34;'; p=k+1;
    } else if (c === 39) {
      if (k - p) r+=s.slice(p, k);
      r+='&#39;'; p=k+1;
    }
  }
  if (r && p < k) r += s.slice(p);
  return r || s;
}

module.exports = function(src, objName, include) {
  var fn = new Function(`${objName}, __ztws, __zteol, __zesc, include`, src);
  // TODO: is this wrapper necessary? Would explicitly inlining the helper
  //       functions be equivalent?
  return function renderWrapper(obj) {
    return fn(obj, __ztws, __zteol, __zesc, include);
  };
};
