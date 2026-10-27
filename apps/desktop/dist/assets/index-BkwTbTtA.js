(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function transformCallback(callback, once = false) {
  return window.__TAURI_INTERNALS__.transformCallback(callback, once);
}
async function invoke(cmd2, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd2, args, options);
}
var TauriEvent;
(function(TauriEvent2) {
  TauriEvent2["WINDOW_RESIZED"] = "tauri://resize";
  TauriEvent2["WINDOW_MOVED"] = "tauri://move";
  TauriEvent2["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
  TauriEvent2["WINDOW_DESTROYED"] = "tauri://destroyed";
  TauriEvent2["WINDOW_FOCUS"] = "tauri://focus";
  TauriEvent2["WINDOW_BLUR"] = "tauri://blur";
  TauriEvent2["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
  TauriEvent2["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
  TauriEvent2["WINDOW_CREATED"] = "tauri://window-created";
  TauriEvent2["WINDOW_SUSPENDED"] = "tauri://suspended";
  TauriEvent2["WINDOW_RESUMED"] = "tauri://resumed";
  TauriEvent2["WEBVIEW_CREATED"] = "tauri://webview-created";
  TauriEvent2["DRAG_ENTER"] = "tauri://drag-enter";
  TauriEvent2["DRAG_OVER"] = "tauri://drag-over";
  TauriEvent2["DRAG_DROP"] = "tauri://drag-drop";
  TauriEvent2["DRAG_LEAVE"] = "tauri://drag-leave";
})(TauriEvent || (TauriEvent = {}));
async function _unlisten(event, eventId) {
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, eventId);
  await invoke("plugin:event|unlisten", {
    event,
    eventId
  });
}
async function listen(event, handler, options) {
  var _a2;
  const target = (_a2 = void 0) !== null && _a2 !== void 0 ? _a2 : { kind: "Any" };
  return invoke("plugin:event|listen", {
    event,
    target,
    handler: transformCallback(handler)
  }).then((eventId) => {
    return async () => _unlisten(event, eventId);
  });
}
async function open(options = {}) {
  if (typeof options === "object") {
    Object.freeze(options);
  }
  return await invoke("plugin:dialog|open", { options });
}
let rangeFrom = [], rangeTo = [];
(() => {
  let numbers = "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,1n,9,16,o,,x,1i,3,,i,,7,a,2,t,3,1k,,,7,2,2,2,3,9,,a,2,q,,2,3,1k,,,5,4,2,2,3,3,,u,2,3,,b,3,1k,,,8,,3,,3,k,2,m,6,,3,1k,,,7,2,2,2,3,7,3,a,2,u,,1n,5,3,3,,4,9,,14,5,1j,,,7,,3,,4,7,2,b,2,t,3,1k,,,7,,3,,4,7,2,b,2,f,,c,4,1j,2,,7,,3,,4,9,,a,2,t,3,1y,,4,6,,,,8,i,2,1p,,,8,c,8,2q,,,a,b,7,21,2,r,,,,,,4,2,1d,k,,2,5,b,,10,9,,2u,b,,6,n,4,4,3,g,4,d,,,3,6,,f,,jj,3,qa,4,s,3,t,2,u,2,1s,w,9,,19,3,,,39,2,y,,3a,c,4,c,63,5,1l,a,,,,,2,o,2,,1c,1a,2,c,k,5,1b,h,12,9,c,3,u,d,1k,e,1c,k,48,3,,l,4,,6,,2,3,5i,1s,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,n,5,4,,2b,2,1e,i,q,i,d,,12,8,p,d,18,4,1b,e,10,,1v,e,c,,8,2,1a,,1f,,,3,2,2,5,2,,,15,5,5,2,6k,8,,2,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,1t,5,8t,2,25,6,1y,b,1d,4,3e,3,1h,f,15,,2,2,a,4,19,b,7,,1p,3,10,e,g,2,18,,c,3,1c,e,8,4,,2,2k,c,6,,2,,4d,c,l,4,1j,2,,7,2,2,2,3,9,,a,2,2,7,3,5,1v,9,,,2,,,4,,5,,,e,2,2a,i,n,,29,k,6j,7,2,9,r,2,2a,h,2y,d,2t,3,2,a,74,f,6t,6,,2,2,4,,,,2,3x,7,2,7,3,,s,a,14,7,,4,8,,9,b,1a,g,5i,8,5j,8,,8,2a,m,,e,3e,6,3,,,2,,7,,,1u,5,,2,,5,9n,4,9,2,,,1c,7,3,5,n,,44l,,6,f,8ug,i,1xc,5,1n,7,t4,,,1j,7,4,29,,b,2,f57,2,3mp,1a,2,n,f2,5,3,6,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,2s,,4g,7,af,,1p,4,e4,4,72,2,6r,,2,,7,2,5,,d6,7,31,7,240,5".split(",").map((s) => s ? parseInt(s, 36) : 1);
  for (let i2 = 0, n = 0; i2 < numbers.length; i2++)
    (i2 % 2 ? rangeTo : rangeFrom).push(n = n + numbers[i2]);
})();
function isExtendingChar(code2) {
  if (code2 < 768) return false;
  for (let from = 0, to = rangeFrom.length; ; ) {
    let mid = from + to >> 1;
    if (code2 < rangeFrom[mid]) to = mid;
    else if (code2 >= rangeTo[mid]) from = mid + 1;
    else return true;
    if (from == to) return false;
  }
}
function isRegionalIndicator(code2) {
  return code2 >= 127462 && code2 <= 127487;
}
const ZWJ = 8205;
function findClusterBreak$1(str, pos, forward = true, includeExtending = true) {
  return (forward ? nextClusterBreak : prevClusterBreak)(str, pos, includeExtending);
}
function nextClusterBreak(str, pos, includeExtending) {
  if (pos == str.length) return pos;
  if (pos && surrogateLow$1(str.charCodeAt(pos)) && surrogateHigh$1(str.charCodeAt(pos - 1))) pos--;
  let prev = codePointAt$1(str, pos);
  pos += codePointSize$1(prev);
  while (pos < str.length) {
    let next = codePointAt$1(str, pos);
    if (prev == ZWJ || next == ZWJ || includeExtending && isExtendingChar(next)) {
      pos += codePointSize$1(next);
      prev = next;
    } else if (isRegionalIndicator(next)) {
      let countBefore = 0, i2 = pos - 2;
      while (i2 >= 0 && isRegionalIndicator(codePointAt$1(str, i2))) {
        countBefore++;
        i2 -= 2;
      }
      if (countBefore % 2 == 0) break;
      else pos += 2;
    } else {
      break;
    }
  }
  return pos;
}
function prevClusterBreak(str, pos, includeExtending) {
  while (pos > 1) {
    let found = nextClusterBreak(str, pos - 2, includeExtending);
    if (found < pos) return found;
    pos--;
  }
  return 0;
}
function codePointAt$1(str, pos) {
  let code0 = str.charCodeAt(pos);
  if (!surrogateHigh$1(code0) || pos + 1 == str.length) return code0;
  let code1 = str.charCodeAt(pos + 1);
  if (!surrogateLow$1(code1)) return code0;
  return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
}
function surrogateLow$1(ch) {
  return ch >= 56320 && ch < 57344;
}
function surrogateHigh$1(ch) {
  return ch >= 55296 && ch < 56320;
}
function codePointSize$1(code2) {
  return code2 < 65536 ? 1 : 2;
}
class Text {
  /**
  Get the line description around the given position.
  */
  lineAt(pos) {
    if (pos < 0 || pos > this.length)
      throw new RangeError(`Invalid position ${pos} in document of length ${this.length}`);
    return this.lineInner(pos, false, 1, 0);
  }
  /**
  Get the description for the given (1-based) line number.
  */
  line(n) {
    if (n < 1 || n > this.lines)
      throw new RangeError(`Invalid line number ${n} in ${this.lines}-line document`);
    return this.lineInner(n, true, 1, 0);
  }
  /**
  Replace a range of the text with the given content.
  */
  replace(from, to, text) {
    [from, to] = clip(this, from, to);
    let parts = [];
    this.decompose(
      0,
      from,
      parts,
      2
      /* Open.To */
    );
    if (text.length)
      text.decompose(
        0,
        text.length,
        parts,
        1 | 2
        /* Open.To */
      );
    this.decompose(
      to,
      this.length,
      parts,
      1
      /* Open.From */
    );
    return TextNode.from(parts, this.length - (to - from) + text.length);
  }
  /**
  Append another document to this one.
  */
  append(other) {
    return this.replace(this.length, this.length, other);
  }
  /**
  Retrieve the text between the given points.
  */
  slice(from, to = this.length) {
    [from, to] = clip(this, from, to);
    let parts = [];
    this.decompose(from, to, parts, 0);
    return TextNode.from(parts, to - from);
  }
  /**
  Test whether this text is equal to another instance.
  */
  eq(other) {
    if (other == this)
      return true;
    if (other.length != this.length || other.lines != this.lines)
      return false;
    let start = this.scanIdentical(other, 1), end = this.length - this.scanIdentical(other, -1);
    let a = new RawTextCursor(this), b = new RawTextCursor(other);
    for (let skip = start, pos = start; ; ) {
      a.next(skip);
      b.next(skip);
      skip = 0;
      if (a.lineBreak != b.lineBreak || a.done != b.done || a.value != b.value)
        return false;
      pos += a.value.length;
      if (a.done || pos >= end)
        return true;
    }
  }
  /**
  Iterate over the text. When `dir` is `-1`, iteration happens
  from end to start. This will return lines and the breaks between
  them as separate strings.
  */
  iter(dir = 1) {
    return new RawTextCursor(this, dir);
  }
  /**
  Iterate over a range of the text. When `from` > `to`, the
  iterator will run in reverse.
  */
  iterRange(from, to = this.length) {
    return new PartialTextCursor(this, from, to);
  }
  /**
  Return a cursor that iterates over the given range of lines,
  _without_ returning the line breaks between, and yielding empty
  strings for empty lines.
  
  When `from` and `to` are given, they should be 1-based line numbers.
  */
  iterLines(from, to) {
    let inner;
    if (from == null) {
      inner = this.iter();
    } else {
      if (to == null)
        to = this.lines + 1;
      let start = this.line(from).from;
      inner = this.iterRange(start, Math.max(start, to == this.lines + 1 ? this.length : to <= 1 ? 0 : this.line(to - 1).to));
    }
    return new LineCursor(inner);
  }
  /**
  Return the document as a string, using newline characters to
  separate lines.
  */
  toString() {
    return this.sliceString(0);
  }
  /**
  Convert the document to an array of lines (which can be
  deserialized again via [`Text.of`](https://codemirror.net/6/docs/ref/#state.Text^of)).
  */
  toJSON() {
    let lines = [];
    this.flatten(lines);
    return lines;
  }
  /**
  @internal
  */
  constructor() {
  }
  /**
  Create a `Text` instance for the given array of lines.
  */
  static of(text) {
    if (text.length == 0)
      throw new RangeError("A document must have at least one line");
    if (text.length == 1 && !text[0])
      return Text.empty;
    return text.length <= 32 ? new TextLeaf(text) : TextNode.from(TextLeaf.split(text, []));
  }
}
class TextLeaf extends Text {
  constructor(text, length = textLength(text)) {
    super();
    this.text = text;
    this.length = length;
  }
  get lines() {
    return this.text.length;
  }
  get children() {
    return null;
  }
  lineInner(target, isLine, line, offset) {
    for (let i2 = 0; ; i2++) {
      let string2 = this.text[i2], end = offset + string2.length;
      if ((isLine ? line : end) >= target)
        return new Line(offset, end, line, string2);
      offset = end + 1;
      line++;
    }
  }
  decompose(from, to, target, open2) {
    let text = from <= 0 && to >= this.length ? this : new TextLeaf(sliceText(this.text, from, to), Math.min(to, this.length) - Math.max(0, from));
    if (open2 & 1) {
      let prev = target.pop();
      let joined = appendText(text.text, prev.text.slice(), 0, text.length);
      if (joined.length <= 32) {
        target.push(new TextLeaf(joined, prev.length + text.length));
      } else {
        let mid = joined.length >> 1;
        target.push(new TextLeaf(joined.slice(0, mid)), new TextLeaf(joined.slice(mid)));
      }
    } else {
      target.push(text);
    }
  }
  replace(from, to, text) {
    if (!(text instanceof TextLeaf))
      return super.replace(from, to, text);
    [from, to] = clip(this, from, to);
    let lines = appendText(this.text, appendText(text.text, sliceText(this.text, 0, from)), to);
    let newLen = this.length + text.length - (to - from);
    if (lines.length <= 32)
      return new TextLeaf(lines, newLen);
    return TextNode.from(TextLeaf.split(lines, []), newLen);
  }
  sliceString(from, to = this.length, lineSep = "\n") {
    [from, to] = clip(this, from, to);
    let result = "";
    for (let pos = 0, i2 = 0; pos <= to && i2 < this.text.length; i2++) {
      let line = this.text[i2], end = pos + line.length;
      if (pos > from && i2)
        result += lineSep;
      if (from < end && to > pos)
        result += line.slice(Math.max(0, from - pos), to - pos);
      pos = end + 1;
    }
    return result;
  }
  flatten(target) {
    for (let line of this.text)
      target.push(line);
  }
  scanIdentical() {
    return 0;
  }
  static split(text, target) {
    let part = [], len = -1;
    for (let line of text) {
      part.push(line);
      len += line.length + 1;
      if (part.length == 32) {
        target.push(new TextLeaf(part, len));
        part = [];
        len = -1;
      }
    }
    if (len > -1)
      target.push(new TextLeaf(part, len));
    return target;
  }
}
class TextNode extends Text {
  constructor(children, length) {
    super();
    this.children = children;
    this.length = length;
    this.lines = 0;
    for (let child of children)
      this.lines += child.lines;
  }
  lineInner(target, isLine, line, offset) {
    for (let i2 = 0; ; i2++) {
      let child = this.children[i2], end = offset + child.length, endLine = line + child.lines - 1;
      if ((isLine ? endLine : end) >= target)
        return child.lineInner(target, isLine, line, offset);
      offset = end + 1;
      line = endLine + 1;
    }
  }
  decompose(from, to, target, open2) {
    for (let i2 = 0, pos = 0; pos <= to && i2 < this.children.length; i2++) {
      let child = this.children[i2], end = pos + child.length;
      if (from <= end && to >= pos) {
        let childOpen = open2 & ((pos <= from ? 1 : 0) | (end >= to ? 2 : 0));
        if (pos >= from && end <= to && !childOpen)
          target.push(child);
        else
          child.decompose(from - pos, to - pos, target, childOpen);
      }
      pos = end + 1;
    }
  }
  replace(from, to, text) {
    [from, to] = clip(this, from, to);
    if (text.lines < this.lines)
      for (let i2 = 0, pos = 0; i2 < this.children.length; i2++) {
        let child = this.children[i2], end = pos + child.length;
        if (from >= pos && to <= end) {
          let updated = child.replace(from - pos, to - pos, text);
          let totalLines = this.lines - child.lines + updated.lines;
          if (updated.lines < totalLines >> 5 - 1 && updated.lines > totalLines >> 5 + 1) {
            let copy = this.children.slice();
            copy[i2] = updated;
            return new TextNode(copy, this.length - (to - from) + text.length);
          }
          return super.replace(pos, end, updated);
        }
        pos = end + 1;
      }
    return super.replace(from, to, text);
  }
  sliceString(from, to = this.length, lineSep = "\n") {
    [from, to] = clip(this, from, to);
    let result = "";
    for (let i2 = 0, pos = 0; i2 < this.children.length && pos <= to; i2++) {
      let child = this.children[i2], end = pos + child.length;
      if (pos > from && i2)
        result += lineSep;
      if (from < end && to > pos)
        result += child.sliceString(from - pos, to - pos, lineSep);
      pos = end + 1;
    }
    return result;
  }
  flatten(target) {
    for (let child of this.children)
      child.flatten(target);
  }
  scanIdentical(other, dir) {
    if (!(other instanceof TextNode))
      return 0;
    let length = 0;
    let [iA, iB, eA, eB] = dir > 0 ? [0, 0, this.children.length, other.children.length] : [this.children.length - 1, other.children.length - 1, -1, -1];
    for (; ; iA += dir, iB += dir) {
      if (iA == eA || iB == eB)
        return length;
      let chA = this.children[iA], chB = other.children[iB];
      if (chA != chB)
        return length + chA.scanIdentical(chB, dir);
      length += chA.length + 1;
    }
  }
  static from(children, length = children.reduce((l, ch) => l + ch.length + 1, -1)) {
    let lines = 0;
    for (let ch of children)
      lines += ch.lines;
    if (lines < 32) {
      let flat = [];
      for (let ch of children)
        ch.flatten(flat);
      return new TextLeaf(flat, length);
    }
    let chunk = Math.max(
      32,
      lines >> 5
      /* Tree.BranchShift */
    ), maxChunk = chunk << 1, minChunk = chunk >> 1;
    let chunked = [], currentLines = 0, currentLen = -1, currentChunk = [];
    function add2(child) {
      let last2;
      if (child.lines > maxChunk && child instanceof TextNode) {
        for (let node of child.children)
          add2(node);
      } else if (child.lines > minChunk && (currentLines > minChunk || !currentLines)) {
        flush();
        chunked.push(child);
      } else if (child instanceof TextLeaf && currentLines && (last2 = currentChunk[currentChunk.length - 1]) instanceof TextLeaf && child.lines + last2.lines <= 32) {
        currentLines += child.lines;
        currentLen += child.length + 1;
        currentChunk[currentChunk.length - 1] = new TextLeaf(last2.text.concat(child.text), last2.length + 1 + child.length);
      } else {
        if (currentLines + child.lines > chunk)
          flush();
        currentLines += child.lines;
        currentLen += child.length + 1;
        currentChunk.push(child);
      }
    }
    function flush() {
      if (currentLines == 0)
        return;
      chunked.push(currentChunk.length == 1 ? currentChunk[0] : TextNode.from(currentChunk, currentLen));
      currentLen = -1;
      currentLines = currentChunk.length = 0;
    }
    for (let child of children)
      add2(child);
    flush();
    return chunked.length == 1 ? chunked[0] : new TextNode(chunked, length);
  }
}
Text.empty = /* @__PURE__ */ new TextLeaf([""], 0);
function textLength(text) {
  let length = -1;
  for (let line of text)
    length += line.length + 1;
  return length;
}
function appendText(text, target, from = 0, to = 1e9) {
  for (let pos = 0, i2 = 0, first = true; i2 < text.length && pos <= to; i2++) {
    let line = text[i2], end = pos + line.length;
    if (end >= from) {
      if (end > to)
        line = line.slice(0, to - pos);
      if (pos < from)
        line = line.slice(from - pos);
      if (first) {
        target[target.length - 1] += line;
        first = false;
      } else
        target.push(line);
    }
    pos = end + 1;
  }
  return target;
}
function sliceText(text, from, to) {
  return appendText(text, [""], from, to);
}
class RawTextCursor {
  constructor(text, dir = 1) {
    this.dir = dir;
    this.done = false;
    this.lineBreak = false;
    this.value = "";
    this.nodes = [text];
    this.offsets = [dir > 0 ? 1 : (text instanceof TextLeaf ? text.text.length : text.children.length) << 1];
  }
  nextInner(skip, dir) {
    this.done = this.lineBreak = false;
    for (; ; ) {
      let last2 = this.nodes.length - 1;
      let top2 = this.nodes[last2], offsetValue = this.offsets[last2], offset = offsetValue >> 1;
      let size = top2 instanceof TextLeaf ? top2.text.length : top2.children.length;
      if (offset == (dir > 0 ? size : 0)) {
        if (last2 == 0) {
          this.done = true;
          this.value = "";
          return this;
        }
        if (dir > 0)
          this.offsets[last2 - 1]++;
        this.nodes.pop();
        this.offsets.pop();
      } else if ((offsetValue & 1) == (dir > 0 ? 0 : 1)) {
        this.offsets[last2] += dir;
        if (skip == 0) {
          this.lineBreak = true;
          this.value = "\n";
          return this;
        }
        skip--;
      } else if (top2 instanceof TextLeaf) {
        let next = top2.text[offset + (dir < 0 ? -1 : 0)];
        this.offsets[last2] += dir;
        if (next.length > Math.max(0, skip)) {
          this.value = skip == 0 ? next : dir > 0 ? next.slice(skip) : next.slice(0, next.length - skip);
          return this;
        }
        skip -= next.length;
      } else {
        let next = top2.children[offset + (dir < 0 ? -1 : 0)];
        if (skip > next.length) {
          skip -= next.length;
          this.offsets[last2] += dir;
        } else {
          if (dir < 0)
            this.offsets[last2]--;
          this.nodes.push(next);
          this.offsets.push(dir > 0 ? 1 : (next instanceof TextLeaf ? next.text.length : next.children.length) << 1);
        }
      }
    }
  }
  next(skip = 0) {
    if (skip < 0) {
      this.nextInner(-skip, -this.dir);
      skip = this.value.length;
    }
    return this.nextInner(skip, this.dir);
  }
}
class PartialTextCursor {
  constructor(text, start, end) {
    this.value = "";
    this.done = false;
    this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
    this.pos = start > end ? text.length : 0;
    this.from = Math.min(start, end);
    this.to = Math.max(start, end);
  }
  nextInner(skip, dir) {
    if (dir < 0 ? this.pos <= this.from : this.pos >= this.to) {
      this.value = "";
      this.done = true;
      return this;
    }
    skip += Math.max(0, dir < 0 ? this.pos - this.to : this.from - this.pos);
    let limit = dir < 0 ? this.pos - this.from : this.to - this.pos;
    if (skip > limit)
      skip = limit;
    limit -= skip;
    let { value } = this.cursor.next(skip);
    this.pos += (value.length + skip) * dir;
    this.value = value.length <= limit ? value : dir < 0 ? value.slice(value.length - limit) : value.slice(0, limit);
    this.done = !this.value;
    return this;
  }
  next(skip = 0) {
    if (skip < 0)
      skip = Math.max(skip, this.from - this.pos);
    else if (skip > 0)
      skip = Math.min(skip, this.to - this.pos);
    return this.nextInner(skip, this.cursor.dir);
  }
  get lineBreak() {
    return this.cursor.lineBreak && this.value != "";
  }
}
class LineCursor {
  constructor(inner) {
    this.inner = inner;
    this.afterBreak = true;
    this.value = "";
    this.done = false;
  }
  next(skip = 0) {
    let { done, lineBreak, value } = this.inner.next(skip);
    if (done && this.afterBreak) {
      this.value = "";
      this.afterBreak = false;
    } else if (done) {
      this.done = true;
      this.value = "";
    } else if (lineBreak) {
      if (this.afterBreak) {
        this.value = "";
      } else {
        this.afterBreak = true;
        this.next();
      }
    } else {
      this.value = value;
      this.afterBreak = false;
    }
    return this;
  }
  get lineBreak() {
    return false;
  }
}
if (typeof Symbol != "undefined") {
  Text.prototype[Symbol.iterator] = function() {
    return this.iter();
  };
  RawTextCursor.prototype[Symbol.iterator] = PartialTextCursor.prototype[Symbol.iterator] = LineCursor.prototype[Symbol.iterator] = function() {
    return this;
  };
}
class Line {
  /**
  @internal
  */
  constructor(from, to, number2, text) {
    this.from = from;
    this.to = to;
    this.number = number2;
    this.text = text;
  }
  /**
  The length of the line (not including any line break after it).
  */
  get length() {
    return this.to - this.from;
  }
}
function clip(text, from, to) {
  from = Math.max(0, Math.min(text.length, from));
  return [from, Math.max(from, Math.min(text.length, to))];
}
function findClusterBreak(str, pos, forward = true, includeExtending = true) {
  return findClusterBreak$1(str, pos, forward, includeExtending);
}
function surrogateLow(ch) {
  return ch >= 56320 && ch < 57344;
}
function surrogateHigh(ch) {
  return ch >= 55296 && ch < 56320;
}
function codePointAt(str, pos) {
  let code0 = str.charCodeAt(pos);
  if (!surrogateHigh(code0) || pos + 1 == str.length)
    return code0;
  let code1 = str.charCodeAt(pos + 1);
  if (!surrogateLow(code1))
    return code0;
  return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
}
function fromCodePoint(code2) {
  if (code2 <= 65535)
    return String.fromCharCode(code2);
  code2 -= 65536;
  return String.fromCharCode((code2 >> 10) + 55296, (code2 & 1023) + 56320);
}
function codePointSize(code2) {
  return code2 < 65536 ? 1 : 2;
}
const DefaultSplit = /\r\n?|\n/;
var MapMode = /* @__PURE__ */ (function(MapMode2) {
  MapMode2[MapMode2["Simple"] = 0] = "Simple";
  MapMode2[MapMode2["TrackDel"] = 1] = "TrackDel";
  MapMode2[MapMode2["TrackBefore"] = 2] = "TrackBefore";
  MapMode2[MapMode2["TrackAfter"] = 3] = "TrackAfter";
  return MapMode2;
})(MapMode || (MapMode = {}));
class ChangeDesc {
  // Sections are encoded as pairs of integers. The first is the
  // length in the current document, and the second is -1 for
  // unaffected sections, and the length of the replacement content
  // otherwise. So an insertion would be (0, n>0), a deletion (n>0,
  // 0), and a replacement two positive numbers.
  /**
  @internal
  */
  constructor(sections) {
    this.sections = sections;
  }
  /**
  The length of the document before the change.
  */
  get length() {
    let result = 0;
    for (let i2 = 0; i2 < this.sections.length; i2 += 2)
      result += this.sections[i2];
    return result;
  }
  /**
  The length of the document after the change.
  */
  get newLength() {
    let result = 0;
    for (let i2 = 0; i2 < this.sections.length; i2 += 2) {
      let ins = this.sections[i2 + 1];
      result += ins < 0 ? this.sections[i2] : ins;
    }
    return result;
  }
  /**
  False when there are actual changes in this set.
  */
  get empty() {
    return this.sections.length == 0 || this.sections.length == 2 && this.sections[1] < 0;
  }
  /**
  Iterate over the unchanged parts left by these changes. `posA`
  provides the position of the range in the old document, `posB`
  the new position in the changed document.
  */
  iterGaps(f) {
    for (let i2 = 0, posA = 0, posB = 0; i2 < this.sections.length; ) {
      let len = this.sections[i2++], ins = this.sections[i2++];
      if (ins < 0) {
        f(posA, posB, len);
        posB += len;
      } else {
        posB += ins;
      }
      posA += len;
    }
  }
  /**
  Iterate over the ranges changed by these changes. (See
  [`ChangeSet.iterChanges`](https://codemirror.net/6/docs/ref/#state.ChangeSet.iterChanges) for a
  variant that also provides you with the inserted text.)
  `fromA`/`toA` provides the extent of the change in the starting
  document, `fromB`/`toB` the extent of the replacement in the
  changed document.
  
  When `individual` is true, adjacent changes (which are kept
  separate for [position mapping](https://codemirror.net/6/docs/ref/#state.ChangeDesc.mapPos)) are
  reported separately.
  */
  iterChangedRanges(f, individual = false) {
    iterChanges(this, f, individual);
  }
  /**
  Get a description of the inverted form of these changes.
  */
  get invertedDesc() {
    let sections = [];
    for (let i2 = 0; i2 < this.sections.length; ) {
      let len = this.sections[i2++], ins = this.sections[i2++];
      if (ins < 0)
        sections.push(len, ins);
      else
        sections.push(ins, len);
    }
    return new ChangeDesc(sections);
  }
  /**
  Compute the combined effect of applying another set of changes
  after this one. The length of the document after this set should
  match the length before `other`.
  */
  composeDesc(other) {
    return this.empty ? other : other.empty ? this : composeSets(this, other);
  }
  /**
  Map this description, which should start with the same document
  as `other`, over another set of changes, so that it can be
  applied after it. When `before` is true, map as if the changes
  in `this` happened before the ones in `other`.
  */
  mapDesc(other, before = false) {
    return other.empty ? this : mapSet(this, other, before);
  }
  mapPos(pos, assoc = -1, mode = MapMode.Simple) {
    let posA = 0, posB = 0;
    for (let i2 = 0; i2 < this.sections.length; ) {
      let len = this.sections[i2++], ins = this.sections[i2++], endA = posA + len;
      if (ins < 0) {
        if (endA > pos)
          return posB + (pos - posA);
        posB += len;
      } else {
        if (mode != MapMode.Simple && endA >= pos && (mode == MapMode.TrackDel && posA < pos && endA > pos || mode == MapMode.TrackBefore && posA < pos || mode == MapMode.TrackAfter && endA > pos))
          return null;
        if (endA > pos || endA == pos && assoc < 0 && !len)
          return pos == posA || assoc < 0 ? posB : posB + ins;
        posB += ins;
      }
      posA = endA;
    }
    if (pos > posA)
      throw new RangeError(`Position ${pos} is out of range for changeset of length ${posA}`);
    return posB;
  }
  /**
  Check whether these changes touch a given range. When one of the
  changes entirely covers the range, the string `"cover"` is
  returned.
  */
  touchesRange(from, to = from) {
    for (let i2 = 0, pos = 0; i2 < this.sections.length && pos <= to; ) {
      let len = this.sections[i2++], ins = this.sections[i2++], end = pos + len;
      if (ins >= 0 && pos <= to && end >= from)
        return pos < from && end > to ? "cover" : true;
      pos = end;
    }
    return false;
  }
  /**
  @internal
  */
  toString() {
    let result = "";
    for (let i2 = 0; i2 < this.sections.length; ) {
      let len = this.sections[i2++], ins = this.sections[i2++];
      result += (result ? " " : "") + len + (ins >= 0 ? ":" + ins : "");
    }
    return result;
  }
  /**
  Serialize this change desc to a JSON-representable value.
  */
  toJSON() {
    return this.sections;
  }
  /**
  Create a change desc from its JSON representation (as produced
  by [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeDesc.toJSON).
  */
  static fromJSON(json2) {
    if (!Array.isArray(json2) || json2.length % 2 || json2.some((a) => typeof a != "number"))
      throw new RangeError("Invalid JSON representation of ChangeDesc");
    return new ChangeDesc(json2);
  }
  /**
  @internal
  */
  static create(sections) {
    return new ChangeDesc(sections);
  }
}
class ChangeSet extends ChangeDesc {
  constructor(sections, inserted) {
    super(sections);
    this.inserted = inserted;
  }
  /**
  Apply the changes to a document, returning the modified
  document.
  */
  apply(doc2) {
    if (this.length != doc2.length)
      throw new RangeError("Applying change set to a document with the wrong length");
    iterChanges(this, (fromA, toA, fromB, _toB, text) => doc2 = doc2.replace(fromB, fromB + (toA - fromA), text), false);
    return doc2;
  }
  mapDesc(other, before = false) {
    return mapSet(this, other, before, true);
  }
  /**
  Given the document as it existed _before_ the changes, return a
  change set that represents the inverse of this set, which could
  be used to go from the document created by the changes back to
  the document as it existed before the changes.
  */
  invert(doc2) {
    let sections = this.sections.slice(), inserted = [];
    for (let i2 = 0, pos = 0; i2 < sections.length; i2 += 2) {
      let len = sections[i2], ins = sections[i2 + 1];
      if (ins >= 0) {
        sections[i2] = ins;
        sections[i2 + 1] = len;
        let index = i2 >> 1;
        while (inserted.length < index)
          inserted.push(Text.empty);
        inserted.push(len ? doc2.slice(pos, pos + len) : Text.empty);
      }
      pos += len;
    }
    return new ChangeSet(sections, inserted);
  }
  /**
  Combine two subsequent change sets into a single set. `other`
  must start in the document produced by `this`. If `this` goes
  `docA` → `docB` and `other` represents `docB` → `docC`, the
  returned value will represent the change `docA` → `docC`.
  */
  compose(other) {
    return this.empty ? other : other.empty ? this : composeSets(this, other, true);
  }
  /**
  Given another change set starting in the same document, maps this
  change set over the other, producing a new change set that can be
  applied to the document produced by applying `other`. When
  `before` is `true`, order changes as if `this` comes before
  `other`, otherwise (the default) treat `other` as coming first.
  
  Given two changes `A` and `B`, `A.compose(B.map(A))` and
  `B.compose(A.map(B, true))` will produce the same document. This
  provides a basic form of [operational
  transformation](https://en.wikipedia.org/wiki/Operational_transformation),
  and can be used for collaborative editing.
  */
  map(other, before = false) {
    return other.empty ? this : mapSet(this, other, before, true);
  }
  /**
  Iterate over the changed ranges in the document, calling `f` for
  each, with the range in the original document (`fromA`-`toA`)
  and the range that replaces it in the new document
  (`fromB`-`toB`).
  
  When `individual` is true, adjacent changes are reported
  separately.
  */
  iterChanges(f, individual = false) {
    iterChanges(this, f, individual);
  }
  /**
  Get a [change description](https://codemirror.net/6/docs/ref/#state.ChangeDesc) for this change
  set.
  */
  get desc() {
    return ChangeDesc.create(this.sections);
  }
  /**
  @internal
  */
  filter(ranges) {
    let resultSections = [], resultInserted = [], filteredSections = [];
    let iter = new SectionIter(this);
    done: for (let i2 = 0, pos = 0; ; ) {
      let next = i2 == ranges.length ? 1e9 : ranges[i2++];
      while (pos < next || pos == next && iter.len == 0) {
        if (iter.done)
          break done;
        let len = Math.min(iter.len, next - pos);
        addSection(filteredSections, len, -1);
        let ins = iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0;
        addSection(resultSections, len, ins);
        if (ins > 0)
          addInsert(resultInserted, resultSections, iter.text);
        iter.forward(len);
        pos += len;
      }
      let end = ranges[i2++];
      while (pos < end) {
        if (iter.done)
          break done;
        let len = Math.min(iter.len, end - pos);
        addSection(resultSections, len, -1);
        addSection(filteredSections, len, iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0);
        iter.forward(len);
        pos += len;
      }
    }
    return {
      changes: new ChangeSet(resultSections, resultInserted),
      filtered: ChangeDesc.create(filteredSections)
    };
  }
  /**
  Serialize this change set to a JSON-representable value.
  */
  toJSON() {
    let parts = [];
    for (let i2 = 0; i2 < this.sections.length; i2 += 2) {
      let len = this.sections[i2], ins = this.sections[i2 + 1];
      if (ins < 0)
        parts.push(len);
      else if (ins == 0)
        parts.push([len]);
      else
        parts.push([len].concat(this.inserted[i2 >> 1].toJSON()));
    }
    return parts;
  }
  /**
  Create a change set for the given changes, for a document of the
  given length, using `lineSep` as line separator.
  */
  static of(changes, length, lineSep) {
    let sections = [], inserted = [], pos = 0;
    let total = null;
    function flush(force = false) {
      if (!force && !sections.length)
        return;
      if (pos < length)
        addSection(sections, length - pos, -1);
      let set = new ChangeSet(sections, inserted);
      total = total ? total.compose(set.map(total)) : set;
      sections = [];
      inserted = [];
      pos = 0;
    }
    function process2(spec) {
      if (Array.isArray(spec)) {
        for (let sub of spec)
          process2(sub);
      } else if (spec instanceof ChangeSet) {
        if (spec.length != length)
          throw new RangeError(`Mismatched change set length (got ${spec.length}, expected ${length})`);
        flush();
        total = total ? total.compose(spec.map(total)) : spec;
      } else {
        let { from, to = from, insert: insert2 } = spec;
        if (from > to || from < 0 || to > length)
          throw new RangeError(`Invalid change range ${from} to ${to} (in doc of length ${length})`);
        let insText = !insert2 ? Text.empty : typeof insert2 == "string" ? Text.of(insert2.split(lineSep || DefaultSplit)) : insert2;
        let insLen = insText.length;
        if (from == to && insLen == 0)
          return;
        if (from < pos)
          flush();
        if (from > pos)
          addSection(sections, from - pos, -1);
        addSection(sections, to - from, insLen);
        addInsert(inserted, sections, insText);
        pos = to;
      }
    }
    process2(changes);
    flush(!total);
    return total;
  }
  /**
  Create an empty changeset of the given length.
  */
  static empty(length) {
    return new ChangeSet(length ? [length, -1] : [], []);
  }
  /**
  Create a changeset from its JSON representation (as produced by
  [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeSet.toJSON).
  */
  static fromJSON(json2) {
    if (!Array.isArray(json2))
      throw new RangeError("Invalid JSON representation of ChangeSet");
    let sections = [], inserted = [];
    for (let i2 = 0; i2 < json2.length; i2++) {
      let part = json2[i2];
      if (typeof part == "number") {
        sections.push(part, -1);
      } else if (!Array.isArray(part) || typeof part[0] != "number" || part.some((e, i3) => i3 && typeof e != "string")) {
        throw new RangeError("Invalid JSON representation of ChangeSet");
      } else if (part.length == 1) {
        sections.push(part[0], 0);
      } else {
        while (inserted.length < i2)
          inserted.push(Text.empty);
        inserted[i2] = Text.of(part.slice(1));
        sections.push(part[0], inserted[i2].length);
      }
    }
    return new ChangeSet(sections, inserted);
  }
  /**
  @internal
  */
  static createSet(sections, inserted) {
    return new ChangeSet(sections, inserted);
  }
}
function addSection(sections, len, ins, forceJoin = false) {
  if (len == 0 && ins <= 0)
    return;
  let last2 = sections.length - 2;
  if (last2 >= 0 && ins <= 0 && ins == sections[last2 + 1])
    sections[last2] += len;
  else if (last2 >= 0 && len == 0 && sections[last2] == 0)
    sections[last2 + 1] += ins;
  else if (forceJoin) {
    sections[last2] += len;
    sections[last2 + 1] += ins;
  } else
    sections.push(len, ins);
}
function addInsert(values, sections, value) {
  if (value.length == 0)
    return;
  let index = sections.length - 2 >> 1;
  if (index < values.length) {
    values[values.length - 1] = values[values.length - 1].append(value);
  } else {
    while (values.length < index)
      values.push(Text.empty);
    values.push(value);
  }
}
function iterChanges(desc, f, individual) {
  let inserted = desc.inserted;
  for (let posA = 0, posB = 0, i2 = 0; i2 < desc.sections.length; ) {
    let len = desc.sections[i2++], ins = desc.sections[i2++];
    if (ins < 0) {
      posA += len;
      posB += len;
    } else {
      let endA = posA, endB = posB, text = Text.empty;
      for (; ; ) {
        endA += len;
        endB += ins;
        if (ins && inserted)
          text = text.append(inserted[i2 - 2 >> 1]);
        if (individual || i2 == desc.sections.length || desc.sections[i2 + 1] < 0)
          break;
        len = desc.sections[i2++];
        ins = desc.sections[i2++];
      }
      f(posA, endA, posB, endB, text);
      posA = endA;
      posB = endB;
    }
  }
}
function mapSet(setA, setB, before, mkSet = false) {
  let sections = [], insert2 = mkSet ? [] : null;
  let a = new SectionIter(setA), b = new SectionIter(setB);
  for (let inserted = -1; ; ) {
    if (a.done && b.len || b.done && a.len) {
      throw new Error("Mismatched change set lengths");
    } else if (a.ins == -1 && b.ins == -1) {
      let len = Math.min(a.len, b.len);
      addSection(sections, len, -1);
      a.forward(len);
      b.forward(len);
    } else if (b.ins >= 0 && (a.ins < 0 || inserted == a.i || a.off == 0 && (b.len < a.len || b.len == a.len && !before))) {
      let len = b.len;
      addSection(sections, b.ins, -1);
      while (len) {
        let piece = Math.min(a.len, len);
        if (a.ins >= 0 && inserted < a.i && a.len <= piece) {
          addSection(sections, 0, a.ins);
          if (insert2)
            addInsert(insert2, sections, a.text);
          inserted = a.i;
        }
        a.forward(piece);
        len -= piece;
      }
      b.next();
    } else if (a.ins >= 0) {
      let len = 0, left = a.len;
      while (left) {
        if (b.ins == -1) {
          let piece = Math.min(left, b.len);
          len += piece;
          left -= piece;
          b.forward(piece);
        } else if (b.ins == 0 && b.len < left) {
          left -= b.len;
          b.next();
        } else {
          break;
        }
      }
      addSection(sections, len, inserted < a.i ? a.ins : 0);
      if (insert2 && inserted < a.i)
        addInsert(insert2, sections, a.text);
      inserted = a.i;
      a.forward(a.len - left);
    } else if (a.done && b.done) {
      return insert2 ? ChangeSet.createSet(sections, insert2) : ChangeDesc.create(sections);
    } else {
      throw new Error("Mismatched change set lengths");
    }
  }
}
function composeSets(setA, setB, mkSet = false) {
  let sections = [];
  let insert2 = mkSet ? [] : null;
  let a = new SectionIter(setA), b = new SectionIter(setB);
  for (let open2 = false; ; ) {
    if (a.done && b.done) {
      return insert2 ? ChangeSet.createSet(sections, insert2) : ChangeDesc.create(sections);
    } else if (a.ins == 0) {
      addSection(sections, a.len, 0, open2);
      a.next();
    } else if (b.len == 0 && !b.done) {
      addSection(sections, 0, b.ins, open2);
      if (insert2)
        addInsert(insert2, sections, b.text);
      b.next();
    } else if (a.done || b.done) {
      throw new Error("Mismatched change set lengths");
    } else {
      let len = Math.min(a.len2, b.len), sectionLen = sections.length;
      if (a.ins == -1) {
        let insB = b.ins == -1 ? -1 : b.off ? 0 : b.ins;
        addSection(sections, len, insB, open2);
        if (insert2 && insB)
          addInsert(insert2, sections, b.text);
      } else if (b.ins == -1) {
        addSection(sections, a.off ? 0 : a.len, len, open2);
        if (insert2)
          addInsert(insert2, sections, a.textBit(len));
      } else {
        addSection(sections, a.off ? 0 : a.len, b.off ? 0 : b.ins, open2);
        if (insert2 && !b.off)
          addInsert(insert2, sections, b.text);
      }
      open2 = (a.ins > len || b.ins >= 0 && b.len > len) && (open2 || sections.length > sectionLen);
      a.forward2(len);
      b.forward(len);
    }
  }
}
class SectionIter {
  constructor(set) {
    this.set = set;
    this.i = 0;
    this.next();
  }
  next() {
    let { sections } = this.set;
    if (this.i < sections.length) {
      this.len = sections[this.i++];
      this.ins = sections[this.i++];
    } else {
      this.len = 0;
      this.ins = -2;
    }
    this.off = 0;
  }
  get done() {
    return this.ins == -2;
  }
  get len2() {
    return this.ins < 0 ? this.len : this.ins;
  }
  get text() {
    let { inserted } = this.set, index = this.i - 2 >> 1;
    return index >= inserted.length ? Text.empty : inserted[index];
  }
  textBit(len) {
    let { inserted } = this.set, index = this.i - 2 >> 1;
    return index >= inserted.length && !len ? Text.empty : inserted[index].slice(this.off, len == null ? void 0 : this.off + len);
  }
  forward(len) {
    if (len == this.len)
      this.next();
    else {
      this.len -= len;
      this.off += len;
    }
  }
  forward2(len) {
    if (this.ins == -1)
      this.forward(len);
    else if (len == this.ins)
      this.next();
    else {
      this.ins -= len;
      this.off += len;
    }
  }
}
class SelectionRange {
  constructor(from, to, flags, goalColumn) {
    this.from = from;
    this.to = to;
    this.flags = flags;
    this.goalColumn = goalColumn;
  }
  /**
  The anchor of the range—the side that doesn't move when you
  extend it.
  */
  get anchor() {
    return this.flags & 32 ? this.to : this.from;
  }
  /**
  The head of the range, which is moved when the range is
  [extended](https://codemirror.net/6/docs/ref/#state.SelectionRange.extend).
  */
  get head() {
    return this.flags & 32 ? this.from : this.to;
  }
  /**
  True when `anchor` and `head` are at the same position.
  */
  get empty() {
    return this.from == this.to;
  }
  /**
  If this is a cursor that is explicitly associated with the
  character on one of its sides, this returns the side. -1 means
  the character before its position, 1 the character after, and 0
  means no association.
  */
  get assoc() {
    return this.flags & 8 ? -1 : this.flags & 16 ? 1 : 0;
  }
  /**
  A flag that, when set, makes some selection-extending commands
  treat the range's head and anchor as exchangeable, so that for
  example Shift-ArrowUp will make the lower side of the selection
  the anchor, even if that was the head before. Used to implement
  MacOS-style undirectional selections.
  */
  get undirectional() {
    return (this.flags & 64) > 0;
  }
  /**
  The bidirectional text level associated with this cursor, if
  any.
  */
  get bidiLevel() {
    let level = this.flags & 7;
    return level == 7 ? null : level;
  }
  /**
  Map this range through a change, producing a valid range in the
  updated document.
  */
  map(change, assoc = -1) {
    let from, to;
    if (this.empty) {
      from = to = change.mapPos(this.from, assoc);
    } else {
      from = change.mapPos(this.from, 1);
      to = change.mapPos(this.to, -1);
    }
    return from == this.from && to == this.to ? this : new SelectionRange(from, to, this.flags, this.goalColumn);
  }
  /**
  Extend this range to cover at least `from` to `to`.
  */
  extend(from, to = from, assoc = 0) {
    if (from <= this.anchor && to >= this.anchor)
      return EditorSelection.range(from, to, void 0, void 0, assoc);
    let head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
    return EditorSelection.range(this.anchor, head, void 0, void 0, assoc);
  }
  /**
  Compare this range to another range.
  */
  eq(other, includeAssoc = false) {
    return this.anchor == other.anchor && this.head == other.head && this.goalColumn == other.goalColumn && (!includeAssoc || !this.empty || this.assoc == other.assoc);
  }
  /**
  Return a JSON-serializable object representing the range.
  */
  toJSON() {
    return { anchor: this.anchor, head: this.head };
  }
  /**
  Convert a JSON representation of a range to a `SelectionRange`
  instance.
  */
  static fromJSON(json2) {
    if (!json2 || typeof json2.anchor != "number" || typeof json2.head != "number")
      throw new RangeError("Invalid JSON representation for SelectionRange");
    return EditorSelection.range(json2.anchor, json2.head);
  }
  /**
  @internal
  */
  static create(from, to, flags, goalColumn) {
    return new SelectionRange(from, to, flags, goalColumn);
  }
}
class EditorSelection {
  constructor(ranges, mainIndex) {
    this.ranges = ranges;
    this.mainIndex = mainIndex;
  }
  /**
  Map a selection through a change. Used to adjust the selection
  position for changes.
  */
  map(change, assoc = -1) {
    if (change.empty)
      return this;
    return EditorSelection.create(this.ranges.map((r) => r.map(change, assoc)), this.mainIndex);
  }
  /**
  Compare this selection to another selection. By default, ranges
  are compared only by position. When `includeAssoc` is true,
  cursor ranges must also have the same
  [`assoc`](https://codemirror.net/6/docs/ref/#state.SelectionRange.assoc) value.
  */
  eq(other, includeAssoc = false) {
    if (this.ranges.length != other.ranges.length || this.mainIndex != other.mainIndex)
      return false;
    for (let i2 = 0; i2 < this.ranges.length; i2++)
      if (!this.ranges[i2].eq(other.ranges[i2], includeAssoc))
        return false;
    return true;
  }
  /**
  Get the primary selection range. Usually, you should make sure
  your code applies to _all_ ranges, by using methods like
  [`changeByRange`](https://codemirror.net/6/docs/ref/#state.EditorState.changeByRange).
  */
  get main() {
    return this.ranges[this.mainIndex];
  }
  /**
  Make sure the selection only has one range. Returns a selection
  holding only the main range from this selection.
  */
  asSingle() {
    return this.ranges.length == 1 ? this : new EditorSelection([this.main], 0);
  }
  /**
  Extend this selection with an extra range.
  */
  addRange(range, main = true) {
    return EditorSelection.create([range].concat(this.ranges), main ? 0 : this.mainIndex + 1);
  }
  /**
  Replace a given range with another range, and then normalize the
  selection to merge and sort ranges if necessary.
  */
  replaceRange(range, which = this.mainIndex) {
    let ranges = this.ranges.slice();
    ranges[which] = range;
    return EditorSelection.create(ranges, this.mainIndex);
  }
  /**
  Convert this selection to an object that can be serialized to
  JSON.
  */
  toJSON() {
    return { ranges: this.ranges.map((r) => r.toJSON()), main: this.mainIndex };
  }
  /**
  Create a selection from a JSON representation.
  */
  static fromJSON(json2) {
    if (!json2 || !Array.isArray(json2.ranges) || typeof json2.main != "number" || json2.main >= json2.ranges.length)
      throw new RangeError("Invalid JSON representation for EditorSelection");
    return new EditorSelection(json2.ranges.map((r) => SelectionRange.fromJSON(r)), json2.main);
  }
  /**
  Create a selection holding a single range.
  */
  static single(anchor, head = anchor) {
    return new EditorSelection([EditorSelection.range(anchor, head)], 0);
  }
  /**
  Sort and merge the given set of ranges, creating a valid
  selection.
  */
  static create(ranges, mainIndex = 0) {
    if (ranges.length == 0)
      throw new RangeError("A selection needs at least one range");
    for (let pos = 0, i2 = 0; i2 < ranges.length; i2++) {
      let range = ranges[i2];
      if (range.empty ? range.from <= pos : range.from < pos)
        return EditorSelection.normalized(ranges.slice(), mainIndex);
      pos = range.to;
    }
    return new EditorSelection(ranges, mainIndex);
  }
  /**
  Create a cursor selection range at the given position. You can
  safely ignore the optional arguments in most situations.
  */
  static cursor(pos, assoc = 0, bidiLevel, goalColumn) {
    return SelectionRange.create(pos, pos, (assoc == 0 ? 0 : assoc < 0 ? 8 : 16) | (bidiLevel == null ? 7 : Math.min(6, bidiLevel)), goalColumn);
  }
  /**
  Create a selection range.
  */
  static range(anchor, head, goalColumn, bidiLevel, assoc) {
    let flags = bidiLevel == null ? 7 : Math.min(6, bidiLevel);
    if (!assoc && anchor != head)
      assoc = head < anchor ? 1 : -1;
    if (assoc)
      flags |= assoc < 0 ? 8 : 16;
    return head < anchor ? SelectionRange.create(head, anchor, flags | 32, goalColumn) : SelectionRange.create(anchor, head, flags, goalColumn);
  }
  /**
  Create an [undirectional](https://codemirror.net/6/docs/ref/#state.SelectionRange.undirectional)
  selection range.
  */
  static undirectionalRange(from, to) {
    return SelectionRange.create(from, to, 64, void 0);
  }
  /**
  @internal
  */
  static normalized(ranges, mainIndex = 0) {
    let main = ranges[mainIndex];
    ranges.sort((a, b) => a.from - b.from);
    mainIndex = ranges.indexOf(main);
    for (let i2 = 1; i2 < ranges.length; i2++) {
      let range = ranges[i2], prev = ranges[i2 - 1];
      if (range.empty ? range.from <= prev.to : range.from < prev.to) {
        let from = prev.from, to = Math.max(range.to, prev.to);
        if (i2 <= mainIndex)
          mainIndex--;
        ranges.splice(--i2, 2, range.anchor > range.head ? EditorSelection.range(to, from) : EditorSelection.range(from, to));
      }
    }
    return new EditorSelection(ranges, mainIndex);
  }
}
function checkSelection(selection2, docLength) {
  for (let range of selection2.ranges)
    if (range.to > docLength)
      throw new RangeError("Selection points outside of document");
}
let nextID = 0;
class Facet {
  constructor(combine, compareInput, compare2, isStatic, enables) {
    this.combine = combine;
    this.compareInput = compareInput;
    this.compare = compare2;
    this.isStatic = isStatic;
    this.id = nextID++;
    this.default = combine([]);
    this.extensions = typeof enables == "function" ? enables(this) : enables;
  }
  /**
  Returns a facet reader for this facet, which can be used to
  [read](https://codemirror.net/6/docs/ref/#state.EditorState.facet) it but not to define values for it.
  */
  get reader() {
    return this;
  }
  /**
  Define a new facet.
  */
  static define(config2 = {}) {
    return new Facet(config2.combine || ((a) => a), config2.compareInput || ((a, b) => a === b), config2.compare || (!config2.combine ? sameArray$1 : (a, b) => a === b), !!config2.static, config2.enables);
  }
  /**
  Returns an extension that adds the given value to this facet.
  */
  of(value) {
    return new FacetProvider([], this, 0, value);
  }
  /**
  Create an extension that computes a value for the facet from a
  state. You must take care to declare the parts of the state that
  this value depends on, since your function is only called again
  for a new state when one of those parts changed.
  
  In cases where your value depends only on a single field, you'll
  want to use the [`from`](https://codemirror.net/6/docs/ref/#state.Facet.from) method instead.
  */
  compute(deps, get) {
    if (this.isStatic)
      throw new Error("Can't compute a static facet");
    return new FacetProvider(deps, this, 1, get);
  }
  /**
  Create an extension that computes zero or more values for this
  facet from a state.
  */
  computeN(deps, get) {
    if (this.isStatic)
      throw new Error("Can't compute a static facet");
    return new FacetProvider(deps, this, 2, get);
  }
  from(field, get) {
    if (!get)
      get = (x) => x;
    return this.compute([field], (state2) => get(state2.field(field)));
  }
}
function sameArray$1(a, b) {
  return a == b || a.length == b.length && a.every((e, i2) => e === b[i2]);
}
class FacetProvider {
  constructor(dependencies, facet, type, value) {
    this.dependencies = dependencies;
    this.facet = facet;
    this.type = type;
    this.value = value;
    this.id = nextID++;
  }
  dynamicSlot(addresses) {
    var _a2;
    let getter = this.value;
    let compare2 = this.facet.compareInput;
    let id = this.id, idx = addresses[id] >> 1, multi = this.type == 2;
    let depDoc = false, depSel = false, depAddrs = [];
    for (let dep of this.dependencies) {
      if (dep == "doc")
        depDoc = true;
      else if (dep == "selection")
        depSel = true;
      else if ((((_a2 = addresses[dep.id]) !== null && _a2 !== void 0 ? _a2 : 1) & 1) == 0)
        depAddrs.push(addresses[dep.id]);
    }
    return {
      create(state2) {
        state2.values[idx] = getter(state2);
        return 1;
      },
      update(state2, tr) {
        if (depDoc && tr.docChanged || depSel && (tr.docChanged || tr.selection) || ensureAll(state2, depAddrs)) {
          let newVal = getter(state2);
          if (multi ? !compareArray(newVal, state2.values[idx], compare2) : !compare2(newVal, state2.values[idx])) {
            state2.values[idx] = newVal;
            return 1;
          }
        }
        return 0;
      },
      reconfigure: (state2, oldState) => {
        let newVal, oldAddr = oldState.config.address[id];
        if (oldAddr != null) {
          let oldVal = getAddr(oldState, oldAddr);
          if (this.dependencies.every((dep) => {
            return dep instanceof Facet ? oldState.facet(dep) === state2.facet(dep) : dep instanceof StateField ? oldState.field(dep, false) == state2.field(dep, false) : true;
          }) || (multi ? compareArray(newVal = getter(state2), oldVal, compare2) : compare2(newVal = getter(state2), oldVal))) {
            state2.values[idx] = oldVal;
            return 0;
          }
        } else {
          newVal = getter(state2);
        }
        state2.values[idx] = newVal;
        return 1;
      }
    };
  }
  get extension() {
    return this;
  }
}
function compareArray(a, b, compare2) {
  if (a.length != b.length)
    return false;
  for (let i2 = 0; i2 < a.length; i2++)
    if (!compare2(a[i2], b[i2]))
      return false;
  return true;
}
function ensureAll(state2, addrs) {
  let changed = false;
  for (let addr of addrs)
    if (ensureAddr(state2, addr) & 1)
      changed = true;
  return changed;
}
function dynamicFacetSlot(addresses, facet, providers) {
  let providerAddrs = providers.map((p) => addresses[p.id]);
  let providerTypes = providers.map((p) => p.type);
  let dynamic = providerAddrs.filter((p) => !(p & 1));
  let idx = addresses[facet.id] >> 1;
  function get(state2) {
    let values = [];
    for (let i2 = 0; i2 < providerAddrs.length; i2++) {
      let value = getAddr(state2, providerAddrs[i2]);
      if (providerTypes[i2] == 2)
        for (let val of value)
          values.push(val);
      else
        values.push(value);
    }
    return facet.combine(values);
  }
  return {
    create(state2) {
      for (let addr of providerAddrs)
        ensureAddr(state2, addr);
      state2.values[idx] = get(state2);
      return 1;
    },
    update(state2, tr) {
      if (!ensureAll(state2, dynamic))
        return 0;
      let value = get(state2);
      if (facet.compare(value, state2.values[idx]))
        return 0;
      state2.values[idx] = value;
      return 1;
    },
    reconfigure(state2, oldState) {
      let depChanged = ensureAll(state2, providerAddrs);
      let oldProviders = oldState.config.facets[facet.id], oldValue = oldState.facet(facet);
      if (oldProviders && !depChanged && sameArray$1(providers, oldProviders)) {
        state2.values[idx] = oldValue;
        return 0;
      }
      let value = get(state2);
      if (facet.compare(value, oldValue)) {
        state2.values[idx] = oldValue;
        return 0;
      }
      state2.values[idx] = value;
      return 1;
    }
  };
}
const initField = /* @__PURE__ */ Facet.define({ static: true });
class StateField {
  constructor(id, createF, updateF, compareF, spec) {
    this.id = id;
    this.createF = createF;
    this.updateF = updateF;
    this.compareF = compareF;
    this.spec = spec;
    this.provides = void 0;
  }
  /**
  Define a state field.
  */
  static define(config2) {
    let field = new StateField(nextID++, config2.create, config2.update, config2.compare || ((a, b) => a === b), config2);
    if (config2.provide)
      field.provides = config2.provide(field);
    return field;
  }
  create(state2) {
    let init = state2.facet(initField).find((i2) => i2.field == this);
    return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state2);
  }
  /**
  @internal
  */
  slot(addresses) {
    let idx = addresses[this.id] >> 1;
    return {
      create: (state2) => {
        state2.values[idx] = this.create(state2);
        return 1;
      },
      update: (state2, tr) => {
        let oldVal = state2.values[idx];
        let value = this.updateF(oldVal, tr);
        if (this.compareF(oldVal, value))
          return 0;
        state2.values[idx] = value;
        return 1;
      },
      reconfigure: (state2, oldState) => {
        let init = state2.facet(initField), oldInit = oldState.facet(initField), reInit;
        if ((reInit = init.find((i2) => i2.field == this)) && reInit != oldInit.find((i2) => i2.field == this)) {
          state2.values[idx] = reInit.create(state2);
          return 1;
        }
        if (oldState.config.address[this.id] != null) {
          state2.values[idx] = oldState.field(this);
          return 0;
        }
        state2.values[idx] = this.create(state2);
        return 1;
      }
    };
  }
  /**
  Returns an extension that enables this field and overrides the
  way it is initialized. Can be useful when you need to provide a
  non-default starting value for the field.
  */
  init(create) {
    return [this, initField.of({ field: this, create })];
  }
  /**
  State field instances can be used as
  [`Extension`](https://codemirror.net/6/docs/ref/#state.Extension) values to enable the field in a
  given state.
  */
  get extension() {
    return this;
  }
}
const Prec_ = { lowest: 4, low: 3, default: 2, high: 1, highest: 0 };
function prec(value) {
  return (ext) => new PrecExtension(ext, value);
}
const Prec = {
  /**
  The highest precedence level, for extensions that should end up
  near the start of the precedence ordering.
  */
  highest: /* @__PURE__ */ prec(Prec_.highest),
  /**
  A higher-than-default precedence, for extensions that should
  come before those with default precedence.
  */
  high: /* @__PURE__ */ prec(Prec_.high),
  /**
  The default precedence, which is also used for extensions
  without an explicit precedence.
  */
  default: /* @__PURE__ */ prec(Prec_.default),
  /**
  A lower-than-default precedence.
  */
  low: /* @__PURE__ */ prec(Prec_.low),
  /**
  The lowest precedence level. Meant for things that should end up
  near the end of the extension order.
  */
  lowest: /* @__PURE__ */ prec(Prec_.lowest)
};
class PrecExtension {
  constructor(inner, prec2) {
    this.inner = inner;
    this.prec = prec2;
  }
  get extension() {
    return this;
  }
}
class Compartment {
  /**
  Create an instance of this compartment to add to your [state
  configuration](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions).
  */
  of(ext) {
    return new CompartmentInstance(this, ext);
  }
  /**
  Create an [effect](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) that
  reconfigures this compartment.
  */
  reconfigure(content2) {
    return Compartment.reconfigure.of({ compartment: this, extension: content2 });
  }
  /**
  Get the current content of the compartment in the state, or
  `undefined` if it isn't present.
  */
  get(state2) {
    return state2.config.compartments.get(this);
  }
}
class CompartmentInstance {
  constructor(compartment, inner) {
    this.compartment = compartment;
    this.inner = inner;
  }
  get extension() {
    return this;
  }
}
class Configuration {
  constructor(base2, compartments, dynamicSlots, address, staticValues, facets) {
    this.base = base2;
    this.compartments = compartments;
    this.dynamicSlots = dynamicSlots;
    this.address = address;
    this.staticValues = staticValues;
    this.facets = facets;
    this.statusTemplate = [];
    while (this.statusTemplate.length < dynamicSlots.length)
      this.statusTemplate.push(
        0
        /* SlotStatus.Unresolved */
      );
  }
  staticFacet(facet) {
    let addr = this.address[facet.id];
    return addr == null ? facet.default : this.staticValues[addr >> 1];
  }
  static resolve(base2, compartments, oldState) {
    let fields = [];
    let facets = /* @__PURE__ */ Object.create(null);
    let newCompartments = /* @__PURE__ */ new Map();
    for (let ext of flatten(base2, compartments, newCompartments)) {
      if (ext instanceof StateField)
        fields.push(ext);
      else
        (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
    }
    let address = /* @__PURE__ */ Object.create(null);
    let staticValues = [];
    let dynamicSlots = [];
    for (let field of fields) {
      address[field.id] = dynamicSlots.length << 1;
      dynamicSlots.push((a) => field.slot(a));
    }
    let oldFacets = oldState === null || oldState === void 0 ? void 0 : oldState.config.facets;
    for (let id in facets) {
      let providers = facets[id], facet = providers[0].facet;
      let oldProviders = oldFacets && oldFacets[id] || [];
      if (providers.every(
        (p) => p.type == 0
        /* Provider.Static */
      )) {
        address[facet.id] = staticValues.length << 1 | 1;
        if (sameArray$1(oldProviders, providers)) {
          staticValues.push(oldState.facet(facet));
        } else {
          let value = facet.combine(providers.map((p) => p.value));
          staticValues.push(oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value);
        }
      } else {
        for (let p of providers) {
          if (p.type == 0) {
            address[p.id] = staticValues.length << 1 | 1;
            staticValues.push(p.value);
          } else {
            address[p.id] = dynamicSlots.length << 1;
            dynamicSlots.push((a) => p.dynamicSlot(a));
          }
        }
        address[facet.id] = dynamicSlots.length << 1;
        dynamicSlots.push((a) => dynamicFacetSlot(a, facet, providers));
      }
    }
    let dynamic = dynamicSlots.map((f) => f(address));
    return new Configuration(base2, newCompartments, dynamic, address, staticValues, facets);
  }
}
function flatten(extension, compartments, newCompartments) {
  let result = [[], [], [], [], []];
  let seen = /* @__PURE__ */ new Map();
  function inner(ext, prec2) {
    let known = seen.get(ext);
    if (known != null) {
      if (known <= prec2)
        return;
      let found = result[known].indexOf(ext);
      if (found > -1)
        result[known].splice(found, 1);
      if (ext instanceof CompartmentInstance)
        newCompartments.delete(ext.compartment);
    }
    seen.set(ext, prec2);
    if (Array.isArray(ext)) {
      for (let e of ext)
        inner(e, prec2);
    } else if (ext instanceof CompartmentInstance) {
      if (newCompartments.has(ext.compartment))
        throw new RangeError(`Duplicate use of compartment in extensions`);
      let content2 = compartments.get(ext.compartment) || ext.inner;
      newCompartments.set(ext.compartment, content2);
      inner(content2, prec2);
    } else if (ext instanceof PrecExtension) {
      inner(ext.inner, ext.prec);
    } else if (ext instanceof StateField) {
      result[prec2].push(ext);
      if (ext.provides)
        inner(ext.provides, prec2);
    } else if (ext instanceof FacetProvider) {
      result[prec2].push(ext);
      if (ext.facet.extensions)
        inner(ext.facet.extensions, Prec_.default);
    } else {
      let content2 = ext.extension;
      if (!content2)
        throw new Error(`Unrecognized extension value in extension set (${ext}).`);
      if (content2 == ext)
        throw new Error(`Unrecognized extension value in extension set (${ext}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`);
      inner(content2, prec2);
    }
  }
  inner(extension, Prec_.default);
  return result.reduce((a, b) => a.concat(b));
}
function ensureAddr(state2, addr) {
  if (addr & 1)
    return 2;
  let idx = addr >> 1;
  let status = state2.status[idx];
  if (status == 4)
    throw new Error("Cyclic dependency between fields and/or facets");
  if (status & 2)
    return status;
  state2.status[idx] = 4;
  let changed = state2.computeSlot(state2, state2.config.dynamicSlots[idx]);
  return state2.status[idx] = 2 | changed;
}
function getAddr(state2, addr) {
  return addr & 1 ? state2.config.staticValues[addr >> 1] : state2.values[addr >> 1];
}
const languageData = /* @__PURE__ */ Facet.define();
const allowMultipleSelections = /* @__PURE__ */ Facet.define({
  combine: (values) => values.some((v) => v),
  static: true
});
const lineSeparator = /* @__PURE__ */ Facet.define({
  combine: (values) => values.length ? values[0] : void 0,
  static: true
});
const changeFilter = /* @__PURE__ */ Facet.define();
const transactionFilter = /* @__PURE__ */ Facet.define();
const transactionExtender = /* @__PURE__ */ Facet.define();
const readOnly = /* @__PURE__ */ Facet.define({
  combine: (values) => values.length ? values[0] : false
});
class Annotation {
  /**
  @internal
  */
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
  /**
  Define a new type of annotation.
  */
  static define() {
    return new AnnotationType();
  }
}
class AnnotationType {
  /**
  Create an instance of this annotation.
  */
  of(value) {
    return new Annotation(this, value);
  }
}
class StateEffectType {
  /**
  @internal
  */
  constructor(map) {
    this.map = map;
  }
  /**
  Create a [state effect](https://codemirror.net/6/docs/ref/#state.StateEffect) instance of this
  type.
  */
  of(value) {
    return new StateEffect(this, value);
  }
}
class StateEffect {
  /**
  @internal
  */
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
  /**
  Map this effect through a position mapping. Will return
  `undefined` when that ends up deleting the effect.
  */
  map(mapping) {
    let mapped = this.type.map(this.value, mapping);
    return mapped === void 0 ? void 0 : mapped == this.value ? this : new StateEffect(this.type, mapped);
  }
  /**
  Tells you whether this effect object is of a given
  [type](https://codemirror.net/6/docs/ref/#state.StateEffectType).
  */
  is(type) {
    return this.type == type;
  }
  /**
  Define a new effect type. The type parameter indicates the type
  of values that his effect holds. It should be a type that
  doesn't include `undefined`, since that is used in
  [mapping](https://codemirror.net/6/docs/ref/#state.StateEffect.map) to indicate that an effect is
  removed.
  */
  static define(spec = {}) {
    return new StateEffectType(spec.map || ((v) => v));
  }
  /**
  Map an array of effects through a change set.
  */
  static mapEffects(effects, mapping) {
    if (!effects.length)
      return effects;
    let result = [];
    for (let effect of effects) {
      let mapped = effect.map(mapping);
      if (mapped)
        result.push(mapped);
    }
    return result;
  }
}
StateEffect.reconfigure = /* @__PURE__ */ StateEffect.define();
StateEffect.appendConfig = /* @__PURE__ */ StateEffect.define();
class Transaction {
  constructor(startState, changes, selection2, effects, annotations, scrollIntoView2) {
    this.startState = startState;
    this.changes = changes;
    this.selection = selection2;
    this.effects = effects;
    this.annotations = annotations;
    this.scrollIntoView = scrollIntoView2;
    this._doc = null;
    this._state = null;
    if (selection2)
      checkSelection(selection2, changes.newLength);
    if (!annotations.some((a) => a.type == Transaction.time))
      this.annotations = annotations.concat(Transaction.time.of(Date.now()));
  }
  /**
  @internal
  */
  static create(startState, changes, selection2, effects, annotations, scrollIntoView2) {
    return new Transaction(startState, changes, selection2, effects, annotations, scrollIntoView2);
  }
  /**
  The new document produced by the transaction. Contrary to
  [`.state`](https://codemirror.net/6/docs/ref/#state.Transaction.state)`.doc`, accessing this won't
  force the entire new state to be computed right away, so it is
  recommended that [transaction
  filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) use this getter
  when they need to look at the new document.
  */
  get newDoc() {
    return this._doc || (this._doc = this.changes.apply(this.startState.doc));
  }
  /**
  The new selection produced by the transaction. If
  [`this.selection`](https://codemirror.net/6/docs/ref/#state.Transaction.selection) is undefined,
  this will [map](https://codemirror.net/6/docs/ref/#state.EditorSelection.map) the start state's
  current selection through the changes made by the transaction.
  */
  get newSelection() {
    return this.selection || this.startState.selection.map(this.changes);
  }
  /**
  The new state created by the transaction. Computed on demand
  (but retained for subsequent access), so it is recommended not to
  access it in [transaction
  filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) when possible.
  */
  get state() {
    if (!this._state)
      this.startState.applyTransaction(this);
    return this._state;
  }
  /**
  Get the value of the given annotation type, if any.
  */
  annotation(type) {
    for (let ann of this.annotations)
      if (ann.type == type)
        return ann.value;
    return void 0;
  }
  /**
  Indicates whether the transaction changed the document.
  */
  get docChanged() {
    return !this.changes.empty;
  }
  /**
  Indicates whether this transaction reconfigures the state
  (through a [configuration compartment](https://codemirror.net/6/docs/ref/#state.Compartment) or
  with a top-level configuration
  [effect](https://codemirror.net/6/docs/ref/#state.StateEffect^reconfigure).
  */
  get reconfigured() {
    return this.startState.config != this.state.config;
  }
  /**
  Returns true if the transaction has a [user
  event](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent) annotation that is equal to
  or more specific than `event`. For example, if the transaction
  has `"select.pointer"` as user event, `"select"` and
  `"select.pointer"` will match it.
  */
  isUserEvent(event) {
    let e = this.annotation(Transaction.userEvent);
    return !!(e && (e == event || e.length > event.length && e.slice(0, event.length) == event && e[event.length] == "."));
  }
}
Transaction.time = /* @__PURE__ */ Annotation.define();
Transaction.userEvent = /* @__PURE__ */ Annotation.define();
Transaction.addToHistory = /* @__PURE__ */ Annotation.define();
Transaction.remote = /* @__PURE__ */ Annotation.define();
function joinRanges(a, b) {
  let result = [];
  for (let iA = 0, iB = 0; ; ) {
    let from, to;
    if (iA < a.length && (iB == b.length || b[iB] >= a[iA])) {
      from = a[iA++];
      to = a[iA++];
    } else if (iB < b.length) {
      from = b[iB++];
      to = b[iB++];
    } else
      return result;
    if (!result.length || result[result.length - 1] < from)
      result.push(from, to);
    else if (result[result.length - 1] < to)
      result[result.length - 1] = to;
  }
}
function mergeTransaction(a, b, sequential) {
  var _a2;
  let mapForA, mapForB, changes;
  if (sequential) {
    mapForA = b.changes;
    mapForB = ChangeSet.empty(b.changes.length);
    changes = a.changes.compose(b.changes);
  } else {
    mapForA = b.changes.map(a.changes);
    mapForB = a.changes.mapDesc(b.changes, true);
    changes = a.changes.compose(mapForA);
  }
  return {
    changes,
    selection: b.selection ? b.selection.map(mapForB) : (_a2 = a.selection) === null || _a2 === void 0 ? void 0 : _a2.map(mapForA),
    effects: StateEffect.mapEffects(a.effects, mapForA).concat(StateEffect.mapEffects(b.effects, mapForB)),
    annotations: a.annotations.length ? a.annotations.concat(b.annotations) : b.annotations,
    scrollIntoView: a.scrollIntoView || b.scrollIntoView
  };
}
function resolveTransactionInner(state2, spec, docSize) {
  let sel = spec.selection, annotations = asArray$1(spec.annotations);
  if (spec.userEvent)
    annotations = annotations.concat(Transaction.userEvent.of(spec.userEvent));
  return {
    changes: spec.changes instanceof ChangeSet ? spec.changes : ChangeSet.of(spec.changes || [], docSize, state2.facet(lineSeparator)),
    selection: sel && (sel instanceof EditorSelection ? sel : EditorSelection.single(sel.anchor, sel.head)),
    effects: asArray$1(spec.effects),
    annotations,
    scrollIntoView: !!spec.scrollIntoView
  };
}
function resolveTransaction(state2, specs, filter) {
  let s = resolveTransactionInner(state2, specs.length ? specs[0] : {}, state2.doc.length);
  if (specs.length && specs[0].filter === false)
    filter = false;
  for (let i2 = 1; i2 < specs.length; i2++) {
    if (specs[i2].filter === false)
      filter = false;
    let seq = !!specs[i2].sequential;
    s = mergeTransaction(s, resolveTransactionInner(state2, specs[i2], seq ? s.changes.newLength : state2.doc.length), seq);
  }
  let tr = Transaction.create(state2, s.changes, s.selection, s.effects, s.annotations, s.scrollIntoView);
  return extendTransaction(filter ? filterTransaction(tr) : tr);
}
function filterTransaction(tr) {
  let state2 = tr.startState;
  let result = true;
  for (let filter of state2.facet(changeFilter)) {
    let value = filter(tr);
    if (value === false) {
      result = false;
      break;
    }
    if (Array.isArray(value))
      result = result === true ? value : joinRanges(result, value);
  }
  if (result !== true) {
    let changes, back;
    if (result === false) {
      back = tr.changes.invertedDesc;
      changes = ChangeSet.empty(state2.doc.length);
    } else {
      let filtered = tr.changes.filter(result);
      changes = filtered.changes;
      back = filtered.filtered.mapDesc(filtered.changes).invertedDesc;
    }
    tr = Transaction.create(state2, changes, tr.selection && tr.selection.map(back), StateEffect.mapEffects(tr.effects, back), tr.annotations, tr.scrollIntoView);
  }
  let filters = state2.facet(transactionFilter);
  for (let i2 = filters.length - 1; i2 >= 0; i2--) {
    let filtered = filters[i2](tr);
    if (filtered instanceof Transaction)
      tr = filtered;
    else if (Array.isArray(filtered) && filtered.length == 1 && filtered[0] instanceof Transaction)
      tr = filtered[0];
    else
      tr = resolveTransaction(state2, asArray$1(filtered), false);
  }
  return tr;
}
function extendTransaction(tr) {
  let state2 = tr.startState, extenders = state2.facet(transactionExtender), spec = tr;
  for (let i2 = extenders.length - 1; i2 >= 0; i2--) {
    let extension = extenders[i2](tr);
    if (extension && Object.keys(extension).length)
      spec = mergeTransaction(spec, resolveTransactionInner(state2, extension, tr.changes.newLength), true);
  }
  return spec == tr ? tr : Transaction.create(state2, tr.changes, tr.selection, spec.effects, spec.annotations, spec.scrollIntoView);
}
const none$2 = [];
function asArray$1(value) {
  return value == null ? none$2 : Array.isArray(value) ? value : [value];
}
var CharCategory = /* @__PURE__ */ (function(CharCategory2) {
  CharCategory2[CharCategory2["Word"] = 0] = "Word";
  CharCategory2[CharCategory2["Space"] = 1] = "Space";
  CharCategory2[CharCategory2["Other"] = 2] = "Other";
  return CharCategory2;
})(CharCategory || (CharCategory = {}));
const nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
let wordChar;
try {
  wordChar = /* @__PURE__ */ new RegExp("[\\p{Alphabetic}\\p{Number}_]", "u");
} catch (_) {
}
function hasWordChar(str) {
  if (wordChar)
    return wordChar.test(str);
  for (let i2 = 0; i2 < str.length; i2++) {
    let ch = str[i2];
    if (/\w/.test(ch) || ch > "" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch)))
      return true;
  }
  return false;
}
function makeCategorizer(wordChars) {
  return (char) => {
    if (!/\S/.test(char))
      return CharCategory.Space;
    if (hasWordChar(char))
      return CharCategory.Word;
    for (let i2 = 0; i2 < wordChars.length; i2++)
      if (char.indexOf(wordChars[i2]) > -1)
        return CharCategory.Word;
    return CharCategory.Other;
  };
}
class EditorState {
  constructor(config2, doc2, selection2, values, computeSlot, tr) {
    this.config = config2;
    this.doc = doc2;
    this.selection = selection2;
    this.values = values;
    this.status = config2.statusTemplate.slice();
    this.computeSlot = computeSlot;
    if (tr)
      tr._state = this;
    for (let i2 = 0; i2 < this.config.dynamicSlots.length; i2++)
      ensureAddr(this, i2 << 1);
    this.computeSlot = null;
  }
  field(field, require2 = true) {
    let addr = this.config.address[field.id];
    if (addr == null) {
      if (require2)
        throw new RangeError("Field is not present in this state");
      return void 0;
    }
    ensureAddr(this, addr);
    return getAddr(this, addr);
  }
  /**
  Create a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) that updates this
  state. Any number of [transaction specs](https://codemirror.net/6/docs/ref/#state.TransactionSpec)
  can be passed. Unless
  [`sequential`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.sequential) is set, the
  [changes](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) (if any) of each spec
  are assumed to start in the _current_ document (not the document
  produced by previous specs), and its
  [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) and
  [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) are assumed to refer
  to the document created by its _own_ changes. The resulting
  transaction contains the combined effect of all the different
  specs. For [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection), later
  specs take precedence over earlier ones.
  */
  update(...specs) {
    return resolveTransaction(this, specs, true);
  }
  /**
  @internal
  */
  applyTransaction(tr) {
    let conf = this.config, { base: base2, compartments } = conf;
    for (let effect of tr.effects) {
      if (effect.is(Compartment.reconfigure)) {
        if (conf) {
          compartments = /* @__PURE__ */ new Map();
          conf.compartments.forEach((val, key) => compartments.set(key, val));
          conf = null;
        }
        compartments.set(effect.value.compartment, effect.value.extension);
      } else if (effect.is(StateEffect.reconfigure)) {
        conf = null;
        base2 = effect.value;
      } else if (effect.is(StateEffect.appendConfig)) {
        conf = null;
        base2 = asArray$1(base2).concat(effect.value);
      }
    }
    let startValues;
    if (!conf) {
      conf = Configuration.resolve(base2, compartments, this);
      let intermediateState = new EditorState(conf, this.doc, this.selection, conf.dynamicSlots.map(() => null), (state2, slot) => slot.reconfigure(state2, this), null);
      startValues = intermediateState.values;
    } else {
      startValues = tr.startState.values.slice();
    }
    let selection2 = tr.startState.facet(allowMultipleSelections) ? tr.newSelection : tr.newSelection.asSingle();
    new EditorState(conf, tr.newDoc, selection2, startValues, (state2, slot) => slot.update(state2, tr), tr);
  }
  /**
  Create a [transaction spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec) that
  replaces every selection range with the given content.
  */
  replaceSelection(text) {
    if (typeof text == "string")
      text = this.toText(text);
    return this.changeByRange((range) => ({
      changes: { from: range.from, to: range.to, insert: text },
      range: EditorSelection.cursor(range.from + text.length, -1)
    }));
  }
  /**
  Create a set of changes and a new selection by running the given
  function for each range in the active selection. The function
  can return an optional set of changes (in the coordinate space
  of the start document), plus an updated range (in the coordinate
  space of the document produced by the call's own changes). This
  method will merge all the changes and ranges into a single
  changeset and selection, and return it as a [transaction
  spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec), which can be passed to
  [`update`](https://codemirror.net/6/docs/ref/#state.EditorState.update).
  */
  changeByRange(f) {
    let sel = this.selection;
    let result1 = f(sel.ranges[0]);
    let changes = this.changes(result1.changes), ranges = [result1.range];
    let effects = asArray$1(result1.effects);
    for (let i2 = 1; i2 < sel.ranges.length; i2++) {
      let result = f(sel.ranges[i2]);
      let newChanges = this.changes(result.changes), newMapped = newChanges.map(changes);
      for (let j = 0; j < i2; j++)
        ranges[j] = ranges[j].map(newMapped);
      let mapBy = changes.mapDesc(newChanges, true);
      ranges.push(result.range.map(mapBy));
      changes = changes.compose(newMapped);
      effects = StateEffect.mapEffects(effects, newMapped).concat(StateEffect.mapEffects(asArray$1(result.effects), mapBy));
    }
    return {
      changes,
      selection: EditorSelection.create(ranges, sel.mainIndex),
      effects
    };
  }
  /**
  Create a [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet) from the given change
  description, taking the state's document length and line
  separator into account.
  */
  changes(spec = []) {
    if (spec instanceof ChangeSet)
      return spec;
    return ChangeSet.of(spec, this.doc.length, this.facet(EditorState.lineSeparator));
  }
  /**
  Using the state's [line
  separator](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator), create a
  [`Text`](https://codemirror.net/6/docs/ref/#state.Text) instance from the given string.
  */
  toText(string2) {
    return Text.of(string2.split(this.facet(EditorState.lineSeparator) || DefaultSplit));
  }
  /**
  Return the given range of the document as a string.
  */
  sliceDoc(from = 0, to = this.doc.length) {
    return this.doc.sliceString(from, to, this.lineBreak);
  }
  /**
  Get the value of a state [facet](https://codemirror.net/6/docs/ref/#state.Facet).
  */
  facet(facet) {
    let addr = this.config.address[facet.id];
    if (addr == null)
      return facet.default;
    ensureAddr(this, addr);
    return getAddr(this, addr);
  }
  /**
  Convert this state to a JSON-serializable object. When custom
  fields should be serialized, you can pass them in as an object
  mapping property names (in the resulting object, which should
  not use `doc` or `selection`) to fields.
  */
  toJSON(fields) {
    let result = {
      doc: this.sliceDoc(),
      selection: this.selection.toJSON()
    };
    if (fields)
      for (let prop in fields) {
        let value = fields[prop];
        if (value instanceof StateField && this.config.address[value.id] != null)
          result[prop] = value.spec.toJSON(this.field(fields[prop]), this);
      }
    return result;
  }
  /**
  Deserialize a state from its JSON representation. When custom
  fields should be deserialized, pass the same object you passed
  to [`toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON) when serializing as
  third argument.
  */
  static fromJSON(json2, config2 = {}, fields) {
    if (!json2 || typeof json2.doc != "string")
      throw new RangeError("Invalid JSON representation for EditorState");
    let fieldInit = [];
    if (fields)
      for (let prop in fields) {
        if (Object.prototype.hasOwnProperty.call(json2, prop)) {
          let field = fields[prop], value = json2[prop];
          fieldInit.push(field.init((state2) => field.spec.fromJSON(value, state2)));
        }
      }
    return EditorState.create({
      doc: json2.doc,
      selection: EditorSelection.fromJSON(json2.selection),
      extensions: config2.extensions ? fieldInit.concat([config2.extensions]) : fieldInit
    });
  }
  /**
  Create a new state. You'll usually only need this when
  initializing an editor—updated states are created by applying
  transactions.
  */
  static create(config2 = {}) {
    let configuration = Configuration.resolve(config2.extensions || [], /* @__PURE__ */ new Map());
    let doc2 = config2.doc instanceof Text ? config2.doc : Text.of((config2.doc || "").split(configuration.staticFacet(EditorState.lineSeparator) || DefaultSplit));
    let selection2 = !config2.selection ? EditorSelection.single(0) : config2.selection instanceof EditorSelection ? config2.selection : EditorSelection.single(config2.selection.anchor, config2.selection.head);
    checkSelection(selection2, doc2.length);
    if (!configuration.staticFacet(allowMultipleSelections))
      selection2 = selection2.asSingle();
    return new EditorState(configuration, doc2, selection2, configuration.dynamicSlots.map(() => null), (state2, slot) => slot.create(state2), null);
  }
  /**
  The size (in columns) of a tab in the document, determined by
  the [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) facet.
  */
  get tabSize() {
    return this.facet(EditorState.tabSize);
  }
  /**
  Get the proper [line-break](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)
  string for this state.
  */
  get lineBreak() {
    return this.facet(EditorState.lineSeparator) || "\n";
  }
  /**
  Returns true when the editor is
  [configured](https://codemirror.net/6/docs/ref/#state.EditorState^readOnly) to be read-only.
  */
  get readOnly() {
    return this.facet(readOnly);
  }
  /**
  Look up a translation for the given phrase (via the
  [`phrases`](https://codemirror.net/6/docs/ref/#state.EditorState^phrases) facet), or return the
  original string if no translation is found.
  
  If additional arguments are passed, they will be inserted in
  place of markers like `$1` (for the first value) and `$2`, etc.
  A single `$` is equivalent to `$1`, and `$$` will produce a
  literal dollar sign.
  */
  phrase(phrase2, ...insert2) {
    for (let map of this.facet(EditorState.phrases))
      if (Object.prototype.hasOwnProperty.call(map, phrase2)) {
        phrase2 = map[phrase2];
        break;
      }
    if (insert2.length)
      phrase2 = phrase2.replace(/\$(\$|\d*)/g, (m, i2) => {
        if (i2 == "$")
          return "$";
        let n = +(i2 || 1);
        return !n || n > insert2.length ? m : insert2[n - 1];
      });
    return phrase2;
  }
  /**
  Find the values for a given language data field, provided by the
  the [`languageData`](https://codemirror.net/6/docs/ref/#state.EditorState^languageData) facet.
  
  Examples of language data fields are...
  
  - [`"commentTokens"`](https://codemirror.net/6/docs/ref/#commands.CommentTokens) for specifying
    comment syntax.
  - [`"autocomplete"`](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion^config.override)
    for providing language-specific completion sources.
  - [`"wordChars"`](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) for adding
    characters that should be considered part of words in this
    language.
  - [`"closeBrackets"`](https://codemirror.net/6/docs/ref/#autocomplete.CloseBracketConfig) controls
    bracket closing behavior.
  */
  languageDataAt(name2, pos, side = -1) {
    let values = [];
    for (let provider of this.facet(languageData)) {
      for (let result of provider(this, pos, side)) {
        if (Object.prototype.hasOwnProperty.call(result, name2))
          values.push(result[name2]);
      }
    }
    return values;
  }
  /**
  Return a function that can categorize strings (expected to
  represent a single [grapheme cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak))
  into one of:
  
   - Word (contains an alphanumeric character or a character
     explicitly listed in the local language's `"wordChars"`
     language data, which should be a string)
   - Space (contains only whitespace)
   - Other (anything else)
  */
  charCategorizer(at) {
    let chars = this.languageDataAt("wordChars", at);
    return makeCategorizer(chars.length ? chars[0] : "");
  }
  /**
  Find the word at the given position, meaning the range
  containing all [word](https://codemirror.net/6/docs/ref/#state.CharCategory.Word) characters
  around it. If no word characters are adjacent to the position,
  this returns null.
  */
  wordAt(pos) {
    let { text, from, length } = this.doc.lineAt(pos);
    let cat = this.charCategorizer(pos);
    let start = pos - from, end = pos - from;
    while (start > 0) {
      let prev = findClusterBreak(text, start, false);
      if (cat(text.slice(prev, start)) != CharCategory.Word)
        break;
      start = prev;
    }
    while (end < length) {
      let next = findClusterBreak(text, end);
      if (cat(text.slice(end, next)) != CharCategory.Word)
        break;
      end = next;
    }
    return start == end ? null : EditorSelection.range(start + from, end + from);
  }
}
EditorState.allowMultipleSelections = allowMultipleSelections;
EditorState.tabSize = /* @__PURE__ */ Facet.define({
  combine: (values) => values.length ? values[0] : 4
});
EditorState.lineSeparator = lineSeparator;
EditorState.readOnly = readOnly;
EditorState.phrases = /* @__PURE__ */ Facet.define({
  compare(a, b) {
    let kA = Object.keys(a), kB = Object.keys(b);
    return kA.length == kB.length && kA.every((k) => a[k] == b[k]);
  }
});
EditorState.languageData = languageData;
EditorState.changeFilter = changeFilter;
EditorState.transactionFilter = transactionFilter;
EditorState.transactionExtender = transactionExtender;
Compartment.reconfigure = /* @__PURE__ */ StateEffect.define();
function combineConfig(configs, defaults2, combine = {}) {
  let result = {};
  for (let config2 of configs)
    for (let key of Object.keys(config2)) {
      let value = config2[key], current = result[key];
      if (current === void 0)
        result[key] = value;
      else if (current === value || value === void 0) ;
      else if (Object.hasOwnProperty.call(combine, key))
        result[key] = combine[key](current, value);
      else
        throw new Error("Config merge conflict for field " + key);
    }
  for (let key in defaults2)
    if (result[key] === void 0)
      result[key] = defaults2[key];
  return result;
}
class RangeValue {
  /**
  Compare this value with another value. Used when comparing
  rangesets. The default implementation compares by identity.
  Unless you are only creating a fixed number of unique instances
  of your value type, it is a good idea to implement this
  properly.
  */
  eq(other) {
    return this == other;
  }
  /**
  Create a [range](https://codemirror.net/6/docs/ref/#state.Range) with this value.
  */
  range(from, to = from) {
    return Range$1.create(from, to, this);
  }
}
RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
RangeValue.prototype.point = false;
RangeValue.prototype.mapMode = MapMode.TrackDel;
function cmpVal(a, b) {
  return a == b || a.constructor == b.constructor && a.eq(b);
}
let Range$1 = class Range {
  constructor(from, to, value) {
    this.from = from;
    this.to = to;
    this.value = value;
  }
  /**
  @internal
  */
  static create(from, to, value) {
    return new Range(from, to, value);
  }
};
function cmpRange(a, b) {
  return a.from - b.from || a.value.startSide - b.value.startSide;
}
class Chunk {
  constructor(from, to, value, maxPoint) {
    this.from = from;
    this.to = to;
    this.value = value;
    this.maxPoint = maxPoint;
  }
  get length() {
    return last(this.to);
  }
  // Find the index of the given position and side. Use the ranges'
  // `from` pos when `end == false`, `to` when `end == true`.
  findIndex(pos, side, end, startAt = 0) {
    let arr = end ? this.to : this.from;
    for (let lo = startAt, hi = arr.length; ; ) {
      if (lo == hi)
        return lo;
      let mid = lo + hi >> 1;
      let diff = arr[mid] - pos || (end ? this.value[mid].endSide : this.value[mid].startSide) - side;
      if (mid == lo)
        return diff >= 0 ? lo : hi;
      if (diff >= 0)
        hi = mid;
      else
        lo = mid + 1;
    }
  }
  between(offset, from, to, f) {
    for (let i2 = this.findIndex(from, -1e9, true), e = this.findIndex(to, 1e9, false, i2); i2 < e; i2++)
      if (f(this.from[i2] + offset, this.to[i2] + offset, this.value[i2]) === false)
        return false;
  }
  map(offset, changes, basePos, baseSide, spill) {
    let value = [], from = [], to = [], newPos = -1, maxPoint = -1;
    iter: for (let i2 = 0; i2 < this.value.length; i2++) {
      let val = this.value[i2], curFrom = this.from[i2] + offset, curTo = this.to[i2] + offset, newFrom, newTo;
      if (curFrom == curTo) {
        let mapped = changes.mapPos(curFrom, val.startSide, val.mapMode);
        if (mapped == null)
          continue;
        newFrom = newTo = mapped;
        if (val.startSide != val.endSide) {
          newTo = changes.mapPos(curFrom, val.endSide);
          if (newTo < newFrom)
            continue;
        }
      } else {
        newFrom = changes.mapPos(curFrom, val.startSide);
        newTo = changes.mapPos(curTo, val.endSide);
        if (newFrom > newTo || newFrom == newTo && val.startSide > 0 && val.endSide <= 0)
          continue;
      }
      if ((newTo - newFrom || val.endSide - val.startSide) < 0)
        continue;
      if (newPos < 0)
        newPos = newFrom;
      if (val.point)
        maxPoint = Math.max(maxPoint, newTo - newFrom);
      if ((newFrom - basePos || val.startSide - baseSide) >= 0) {
        value.push(val);
        from.push(newFrom - newPos);
        to.push(newTo - newPos);
        basePos = newTo;
        baseSide = val.endSide;
      } else {
        if (newFrom == newTo) {
          for (let i3 = value.length; i3 > 0; i3--) {
            if ((newFrom - (to[i3 - 1] + newPos) || val.startSide - value[i3 - 1].endSide) >= 0) {
              value.splice(i3, 0, val);
              from.splice(i3, 0, newFrom - newPos);
              to.splice(i3, 0, newTo - newPos);
              continue iter;
            }
            if ((newFrom - (from[i3 - 1] + newPos) || val.endSide - value[i3 - 1].startSide) > 0)
              break;
          }
        }
        spill(newFrom, newTo, val);
      }
    }
    return { mapped: value.length ? new Chunk(from, to, value, maxPoint) : null, pos: newPos };
  }
}
class RangeSet {
  constructor(chunkPos, chunk, nextLayer, maxPoint) {
    this.chunkPos = chunkPos;
    this.chunk = chunk;
    this.nextLayer = nextLayer;
    this.maxPoint = maxPoint;
  }
  /**
  @internal
  */
  static create(chunkPos, chunk, nextLayer, maxPoint) {
    return new RangeSet(chunkPos, chunk, nextLayer, maxPoint);
  }
  /**
  @internal
  */
  get length() {
    let last2 = this.chunk.length - 1;
    return last2 < 0 ? 0 : Math.max(this.chunkEnd(last2), this.nextLayer.length);
  }
  /**
  The number of ranges in the set.
  */
  get size() {
    if (this.isEmpty)
      return 0;
    let size = this.nextLayer.size;
    for (let chunk of this.chunk)
      size += chunk.value.length;
    return size;
  }
  /**
  @internal
  */
  chunkEnd(index) {
    return this.chunkPos[index] + this.chunk[index].length;
  }
  /**
  Update the range set, optionally adding new ranges or filtering
  out existing ones.
  
  (Note: The type parameter is just there as a kludge to work
  around TypeScript variance issues that prevented `RangeSet<X>`
  from being a subtype of `RangeSet<Y>` when `X` is a subtype of
  `Y`.)
  */
  update(updateSpec) {
    let { add: add2 = [], sort = false, filterFrom = 0, filterTo = this.length } = updateSpec;
    let filter = updateSpec.filter;
    if (add2.length == 0 && !filter)
      return this;
    if (sort)
      add2 = add2.slice().sort(cmpRange);
    if (this.isEmpty)
      return add2.length ? RangeSet.of(add2) : this;
    let cur2 = new LayerCursor(this, null, -1).goto(0), i2 = 0, spill = [];
    let builder = new RangeSetBuilder();
    while (cur2.value || i2 < add2.length) {
      if (i2 < add2.length && (cur2.from - add2[i2].from || cur2.startSide - add2[i2].value.startSide) >= 0) {
        let range = add2[i2++];
        if (!builder.addInner(range.from, range.to, range.value, false))
          spill.push(range);
      } else if (cur2.rangeIndex == 1 && cur2.chunkIndex < this.chunk.length && (i2 == add2.length || this.chunkEnd(cur2.chunkIndex) < add2[i2].from) && (!filter || filterFrom > this.chunkEnd(cur2.chunkIndex) || filterTo < this.chunkPos[cur2.chunkIndex]) && builder.addChunk(this.chunkPos[cur2.chunkIndex], this.chunk[cur2.chunkIndex])) {
        cur2.nextChunk();
      } else {
        if (!filter || filterFrom > cur2.to || filterTo < cur2.from || filter(cur2.from, cur2.to, cur2.value)) {
          if (!builder.addInner(cur2.from, cur2.to, cur2.value, false))
            spill.push(Range$1.create(cur2.from, cur2.to, cur2.value));
        }
        cur2.next();
      }
    }
    return builder.finishInner(this.nextLayer.isEmpty && !spill.length ? RangeSet.empty : this.nextLayer.update({ add: spill, filter, filterFrom, filterTo }));
  }
  /**
  Map this range set through a set of changes, return the new set.
  */
  map(changes) {
    if (changes.empty || this.isEmpty)
      return this;
    let chunks = [], chunkPos = [], maxPoint = -1;
    let spilled;
    let spill = (from, to, value) => {
      if (!spilled)
        spilled = new RangeSetBuilder();
      spilled.addRange(from, to, value, false);
    };
    for (let i2 = 0; i2 < this.chunk.length; i2++) {
      let start = this.chunkPos[i2], chunk = this.chunk[i2];
      let touch = changes.touchesRange(start, start + chunk.length);
      if (touch === false) {
        maxPoint = Math.max(maxPoint, chunk.maxPoint);
        chunks.push(chunk);
        chunkPos.push(changes.mapPos(start));
      } else if (touch === true) {
        let [prevPos, prevSide] = !chunks.length ? [-1, -1] : [last(chunkPos) + last(chunks).length, last(last(chunks).value).endSide];
        let { mapped, pos } = chunk.map(start, changes, prevPos, prevSide, spill);
        if (mapped) {
          maxPoint = Math.max(maxPoint, mapped.maxPoint);
          chunks.push(mapped);
          chunkPos.push(pos);
        }
      }
    }
    let next = this.nextLayer.map(changes);
    if (spilled)
      next = spilled.finishInner(next);
    return chunks.length == 0 ? next : new RangeSet(chunkPos, chunks, next || RangeSet.empty, maxPoint);
  }
  /**
  Iterate over the ranges that touch the region `from` to `to`,
  calling `f` for each. There is no guarantee that the ranges will
  be reported in any specific order. When the callback returns
  `false`, iteration stops.
  */
  between(from, to, f) {
    if (this.isEmpty)
      return;
    for (let i2 = 0; i2 < this.chunk.length; i2++) {
      let start = this.chunkPos[i2], chunk = this.chunk[i2];
      if (to >= start && from <= start + chunk.length && chunk.between(start, from - start, to - start, f) === false)
        return;
    }
    this.nextLayer.between(from, to, f);
  }
  /**
  Iterate over the ranges in this set, in order, including all
  ranges that end at or after `from`.
  */
  iter(from = 0) {
    return HeapCursor.from([this]).goto(from);
  }
  /**
  @internal
  */
  get isEmpty() {
    return this.nextLayer == this;
  }
  /**
  Iterate over the ranges in a collection of sets, in order,
  starting from `from`.
  */
  static iter(sets, from = 0) {
    return HeapCursor.from(sets).goto(from);
  }
  /**
  Iterate over two groups of sets, calling methods on `comparator`
  to notify it of possible differences.
  */
  static compare(oldSets, newSets, textDiff, comparator, minPointSize = -1) {
    let a = oldSets.filter((set) => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
    let b = newSets.filter((set) => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
    let sharedChunks = findSharedChunks(a, b, textDiff);
    let sideA = new SpanCursor(a, sharedChunks, minPointSize);
    let sideB = new SpanCursor(b, sharedChunks, minPointSize);
    textDiff.iterGaps((fromA, fromB, length) => compare(sideA, fromA, sideB, fromB, length, comparator));
    if (textDiff.empty && textDiff.length == 0)
      compare(sideA, 0, sideB, 0, 0, comparator);
  }
  /**
  Compare the contents of two groups of range sets, returning true
  if they are equivalent in the given range.
  */
  static eq(oldSets, newSets, from = 0, to) {
    if (to == null)
      to = 1e9 - 1;
    let a = oldSets.filter((set) => !set.isEmpty && newSets.indexOf(set) < 0);
    let b = newSets.filter((set) => !set.isEmpty && oldSets.indexOf(set) < 0);
    if (a.length != b.length)
      return false;
    if (!a.length)
      return true;
    let sharedChunks = findSharedChunks(a, b);
    let sideA = new SpanCursor(a, sharedChunks, 0).goto(from), sideB = new SpanCursor(b, sharedChunks, 0).goto(from);
    for (; ; ) {
      if (sideA.to != sideB.to || !sameValues(sideA.active, sideB.active) || sideA.point && (!sideB.point || !cmpVal(sideA.point, sideB.point)))
        return false;
      if (sideA.to > to)
        return true;
      sideA.next();
      sideB.next();
    }
  }
  /**
  Iterate over a group of range sets at the same time, notifying
  the iterator about the ranges covering every given piece of
  content. Returns the open count (see
  [`SpanIterator.span`](https://codemirror.net/6/docs/ref/#state.SpanIterator.span)) at the end
  of the iteration.
  */
  static spans(sets, from, to, iterator, minPointSize = -1) {
    let cursor2 = new SpanCursor(sets, null, minPointSize).goto(from), pos = from;
    let openRanges = cursor2.openStart;
    for (; ; ) {
      let curTo = Math.min(cursor2.to, to);
      if (cursor2.point) {
        let active = cursor2.activeForPoint(cursor2.to);
        let openCount = cursor2.pointFrom < from ? active.length + 1 : cursor2.point.startSide < 0 ? active.length : Math.min(active.length, openRanges);
        iterator.point(pos, curTo, cursor2.point, active, openCount, cursor2.pointRank);
        openRanges = Math.min(cursor2.openEnd(curTo), active.length);
      } else if (curTo > pos) {
        iterator.span(pos, curTo, cursor2.active, openRanges);
        openRanges = cursor2.openEnd(curTo);
      }
      if (cursor2.to > to)
        return openRanges + (cursor2.point && cursor2.to > to ? 1 : 0);
      pos = cursor2.to;
      cursor2.next();
    }
  }
  /**
  Create a range set for the given range or array of ranges. By
  default, this expects the ranges to be _sorted_ (by start
  position and, if two start at the same position,
  `value.startSide`). You can pass `true` as second argument to
  cause the method to sort them.
  */
  static of(ranges, sort = false) {
    let build = new RangeSetBuilder();
    for (let range of ranges instanceof Range$1 ? [ranges] : sort ? lazySort(ranges) : ranges)
      build.add(range.from, range.to, range.value);
    return build.finish();
  }
  /**
  Join an array of range sets into a single set.
  */
  static join(sets) {
    if (!sets.length)
      return RangeSet.empty;
    let result = last(sets);
    for (let i2 = sets.length - 2; i2 >= 0; i2--) {
      for (let layer2 = sets[i2]; layer2 != RangeSet.empty; layer2 = layer2.nextLayer)
        result = new RangeSet(layer2.chunkPos, layer2.chunk, result, Math.max(layer2.maxPoint, result.maxPoint));
    }
    return result;
  }
}
RangeSet.empty = /* @__PURE__ */ new RangeSet([], [], null, -1);
function last(arr) {
  return arr[arr.length - 1];
}
function lazySort(ranges) {
  if (ranges.length > 1)
    for (let prev = ranges[0], i2 = 1; i2 < ranges.length; i2++) {
      let cur2 = ranges[i2];
      if (cmpRange(prev, cur2) > 0)
        return ranges.slice().sort(cmpRange);
      prev = cur2;
    }
  return ranges;
}
RangeSet.empty.nextLayer = RangeSet.empty;
class RangeSetBuilder {
  finishChunk(newArrays) {
    this.chunks.push(new Chunk(this.from, this.to, this.value, this.maxPoint));
    this.chunkPos.push(this.chunkStart);
    this.chunkStart = -1;
    this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint);
    this.maxPoint = -1;
    if (newArrays) {
      this.from = [];
      this.to = [];
      this.value = [];
    }
  }
  /**
  Create an empty builder.
  */
  constructor() {
    this.chunks = [];
    this.chunkPos = [];
    this.chunkStart = -1;
    this.last = null;
    this.lastFrom = -1e9;
    this.lastTo = -1e9;
    this.from = [];
    this.to = [];
    this.value = [];
    this.maxPoint = -1;
    this.setMaxPoint = -1;
    this.nextLayer = null;
  }
  /**
  Add a range. Ranges should be added in sorted (by `from` and
  `value.startSide`) order.
  */
  add(from, to, value) {
    this.addRange(from, to, value, true);
  }
  /**
  @internal
  */
  addRange(from, to, value, strict) {
    if (!this.addInner(from, to, value, strict))
      (this.nextLayer || (this.nextLayer = new RangeSetBuilder())).addRange(from, to, value, strict);
  }
  /**
  @internal
  */
  addInner(from, to, value, strict) {
    let diff = from - this.lastTo || value.startSide - this.last.endSide;
    if (strict && diff <= 0 && (from - this.lastFrom || value.startSide - this.last.startSide) < 0)
      throw new Error("Ranges must be added sorted by `from` position and `startSide`");
    if (diff < 0)
      return false;
    if (this.from.length == 250)
      this.finishChunk(true);
    if (this.chunkStart < 0)
      this.chunkStart = from;
    this.from.push(from - this.chunkStart);
    this.to.push(to - this.chunkStart);
    this.last = value;
    this.lastFrom = from;
    this.lastTo = to;
    this.value.push(value);
    if (value.point)
      this.maxPoint = Math.max(this.maxPoint, to - from);
    return true;
  }
  /**
  @internal
  */
  addChunk(from, chunk) {
    if ((from - this.lastTo || chunk.value[0].startSide - this.last.endSide) < 0)
      return false;
    if (this.from.length)
      this.finishChunk(true);
    this.setMaxPoint = Math.max(this.setMaxPoint, chunk.maxPoint);
    this.chunks.push(chunk);
    this.chunkPos.push(from);
    let last2 = chunk.value.length - 1;
    this.last = chunk.value[last2];
    this.lastFrom = chunk.from[last2] + from;
    this.lastTo = chunk.to[last2] + from;
    return true;
  }
  /**
  Finish the range set. Returns the new set. The builder can't be
  used anymore after this has been called.
  */
  finish() {
    return this.finishInner(RangeSet.empty);
  }
  /**
  @internal
  */
  finishInner(next) {
    if (this.from.length)
      this.finishChunk(false);
    if (this.chunks.length == 0)
      return next;
    let result = RangeSet.create(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(next) : next, this.setMaxPoint);
    this.from = null;
    return result;
  }
}
function findSharedChunks(a, b, textDiff) {
  let inA = /* @__PURE__ */ new Map();
  for (let set of a)
    for (let i2 = 0; i2 < set.chunk.length; i2++)
      if (set.chunk[i2].maxPoint <= 0)
        inA.set(set.chunk[i2], set.chunkPos[i2]);
  let shared = /* @__PURE__ */ new Set();
  for (let set of b)
    for (let i2 = 0; i2 < set.chunk.length; i2++) {
      let known = inA.get(set.chunk[i2]);
      if (known != null && (textDiff ? textDiff.mapPos(known) : known) == set.chunkPos[i2] && !(textDiff === null || textDiff === void 0 ? void 0 : textDiff.touchesRange(known, known + set.chunk[i2].length)))
        shared.add(set.chunk[i2]);
    }
  return shared;
}
class LayerCursor {
  constructor(layer2, skip, minPoint, rank = 0) {
    this.layer = layer2;
    this.skip = skip;
    this.minPoint = minPoint;
    this.rank = rank;
  }
  get startSide() {
    return this.value ? this.value.startSide : 0;
  }
  get endSide() {
    return this.value ? this.value.endSide : 0;
  }
  goto(pos, side = -1e9) {
    this.chunkIndex = this.rangeIndex = 0;
    this.gotoInner(pos, side, false);
    return this;
  }
  gotoInner(pos, side, forward) {
    while (this.chunkIndex < this.layer.chunk.length) {
      let next = this.layer.chunk[this.chunkIndex];
      if (!(this.skip && this.skip.has(next) || this.layer.chunkEnd(this.chunkIndex) < pos || next.maxPoint < this.minPoint))
        break;
      this.chunkIndex++;
      forward = false;
    }
    if (this.chunkIndex < this.layer.chunk.length) {
      let rangeIndex = this.layer.chunk[this.chunkIndex].findIndex(pos - this.layer.chunkPos[this.chunkIndex], side, true);
      if (!forward || this.rangeIndex < rangeIndex)
        this.setRangeIndex(rangeIndex);
    }
    this.next();
  }
  forward(pos, side) {
    if ((this.to - pos || this.endSide - side) < 0)
      this.gotoInner(pos, side, true);
  }
  next() {
    for (; ; ) {
      if (this.chunkIndex == this.layer.chunk.length) {
        this.from = this.to = 1e9;
        this.value = null;
        break;
      } else {
        let chunkPos = this.layer.chunkPos[this.chunkIndex], chunk = this.layer.chunk[this.chunkIndex];
        let from = chunkPos + chunk.from[this.rangeIndex];
        this.from = from;
        this.to = chunkPos + chunk.to[this.rangeIndex];
        this.value = chunk.value[this.rangeIndex];
        this.setRangeIndex(this.rangeIndex + 1);
        if (this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint)
          break;
      }
    }
  }
  setRangeIndex(index) {
    if (index == this.layer.chunk[this.chunkIndex].value.length) {
      this.chunkIndex++;
      if (this.skip) {
        while (this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex]))
          this.chunkIndex++;
      }
      this.rangeIndex = 0;
    } else {
      this.rangeIndex = index;
    }
  }
  nextChunk() {
    this.chunkIndex++;
    this.rangeIndex = 0;
    this.next();
  }
  compare(other) {
    return this.from - other.from || this.startSide - other.startSide || this.rank - other.rank || this.to - other.to || this.endSide - other.endSide;
  }
}
class HeapCursor {
  constructor(heap) {
    this.heap = heap;
  }
  static from(sets, skip = null, minPoint = -1) {
    let heap = [];
    for (let i2 = 0; i2 < sets.length; i2++) {
      for (let cur2 = sets[i2]; !cur2.isEmpty; cur2 = cur2.nextLayer) {
        if (cur2.maxPoint >= minPoint)
          heap.push(new LayerCursor(cur2, skip, minPoint, i2));
      }
    }
    return heap.length == 1 ? heap[0] : new HeapCursor(heap);
  }
  get startSide() {
    return this.value ? this.value.startSide : 0;
  }
  goto(pos, side = -1e9) {
    for (let cur2 of this.heap)
      cur2.goto(pos, side);
    for (let i2 = this.heap.length >> 1; i2 >= 0; i2--)
      heapBubble(this.heap, i2);
    this.next();
    return this;
  }
  forward(pos, side) {
    for (let cur2 of this.heap)
      cur2.forward(pos, side);
    for (let i2 = this.heap.length >> 1; i2 >= 0; i2--)
      heapBubble(this.heap, i2);
    if ((this.to - pos || this.value.endSide - side) < 0)
      this.next();
  }
  next() {
    if (this.heap.length == 0) {
      this.from = this.to = 1e9;
      this.value = null;
      this.rank = -1;
    } else {
      let top2 = this.heap[0];
      this.from = top2.from;
      this.to = top2.to;
      this.value = top2.value;
      this.rank = top2.rank;
      if (top2.value)
        top2.next();
      heapBubble(this.heap, 0);
    }
  }
}
function heapBubble(heap, index) {
  for (let cur2 = heap[index]; ; ) {
    let childIndex = (index << 1) + 1;
    if (childIndex >= heap.length)
      break;
    let child = heap[childIndex];
    if (childIndex + 1 < heap.length && child.compare(heap[childIndex + 1]) >= 0) {
      child = heap[childIndex + 1];
      childIndex++;
    }
    if (cur2.compare(child) < 0)
      break;
    heap[childIndex] = cur2;
    heap[index] = child;
    index = childIndex;
  }
}
class SpanCursor {
  constructor(sets, skip, minPoint) {
    this.minPoint = minPoint;
    this.active = [];
    this.activeTo = [];
    this.activeRank = [];
    this.minActive = -1;
    this.point = null;
    this.pointFrom = 0;
    this.pointRank = 0;
    this.to = -1e9;
    this.endSide = 0;
    this.openStart = -1;
    this.cursor = HeapCursor.from(sets, skip, minPoint);
  }
  goto(pos, side = -1e9) {
    this.cursor.goto(pos, side);
    this.active.length = this.activeTo.length = this.activeRank.length = 0;
    this.minActive = -1;
    this.to = pos;
    this.endSide = side;
    this.openStart = -1;
    this.next();
    return this;
  }
  forward(pos, side) {
    while (this.minActive > -1 && (this.activeTo[this.minActive] - pos || this.active[this.minActive].endSide - side) < 0)
      this.removeActive(this.minActive);
    this.cursor.forward(pos, side);
  }
  removeActive(index) {
    remove(this.active, index);
    remove(this.activeTo, index);
    remove(this.activeRank, index);
    this.minActive = findMinIndex(this.active, this.activeTo);
  }
  addActive(trackOpen) {
    let i2 = 0, { value, to, rank } = this.cursor;
    while (i2 < this.activeRank.length && (rank - this.activeRank[i2] || to - this.activeTo[i2]) > 0)
      i2++;
    insert(this.active, i2, value);
    insert(this.activeTo, i2, to);
    insert(this.activeRank, i2, rank);
    if (trackOpen)
      insert(trackOpen, i2, this.cursor.from);
    this.minActive = findMinIndex(this.active, this.activeTo);
  }
  // After calling this, if `this.point` != null, the next range is a
  // point. Otherwise, it's a regular range, covered by `this.active`.
  next() {
    let from = this.to, wasPoint = this.point;
    this.point = null;
    let trackOpen = this.openStart < 0 ? [] : null;
    for (; ; ) {
      let a = this.minActive;
      if (a > -1 && (this.activeTo[a] - this.cursor.from || this.active[a].endSide - this.cursor.startSide) < 0) {
        if (this.activeTo[a] > from) {
          this.to = this.activeTo[a];
          this.endSide = this.active[a].endSide;
          break;
        }
        this.removeActive(a);
        if (trackOpen)
          remove(trackOpen, a);
      } else if (!this.cursor.value) {
        this.to = this.endSide = 1e9;
        break;
      } else if (this.cursor.from > from) {
        this.to = this.cursor.from;
        this.endSide = this.cursor.startSide;
        break;
      } else {
        let nextVal = this.cursor.value;
        if (!nextVal.point) {
          this.addActive(trackOpen);
          this.cursor.next();
        } else if (wasPoint && this.cursor.to == this.to && this.cursor.from < this.cursor.to) {
          this.cursor.next();
        } else {
          this.point = nextVal;
          this.pointFrom = this.cursor.from;
          this.pointRank = this.cursor.rank;
          this.to = this.cursor.to;
          this.endSide = nextVal.endSide;
          this.cursor.next();
          this.forward(this.to, this.endSide);
          break;
        }
      }
    }
    if (trackOpen) {
      this.openStart = 0;
      for (let i2 = trackOpen.length - 1; i2 >= 0 && trackOpen[i2] < from; i2--)
        this.openStart++;
    }
  }
  activeForPoint(to) {
    if (!this.active.length)
      return this.active;
    let active = [];
    for (let i2 = this.active.length - 1; i2 >= 0; i2--) {
      if (this.activeRank[i2] < this.pointRank)
        break;
      if (this.activeTo[i2] > to || this.activeTo[i2] == to && this.active[i2].endSide >= this.point.endSide)
        active.push(this.active[i2]);
    }
    return active.reverse();
  }
  openEnd(to) {
    let open2 = 0;
    for (let i2 = this.activeTo.length - 1; i2 >= 0 && this.activeTo[i2] > to; i2--)
      open2++;
    return open2;
  }
}
function compare(a, startA, b, startB, length, comparator) {
  a.goto(startA);
  b.goto(startB);
  let endB = startB + length;
  let pos = startB, dPos = startB - startA;
  let bounds = !!comparator.boundChange;
  for (let boundChange = false; ; ) {
    let dEnd = a.to + dPos - b.to, diff = dEnd || a.endSide - b.endSide;
    let end = diff < 0 ? a.to + dPos : b.to, clipEnd = Math.min(end, endB);
    let point = a.point || b.point;
    if (point) {
      if (!(a.point && b.point && cmpVal(a.point, b.point) && sameValues(a.activeForPoint(a.to), b.activeForPoint(b.to))))
        comparator.comparePoint(pos, clipEnd, a.point, b.point);
      boundChange = false;
    } else {
      if (boundChange) {
        comparator.boundChange(pos);
        boundChange = false;
      }
      if (clipEnd > pos && !sameValues(a.active, b.active))
        comparator.compareRange(pos, clipEnd, a.active, b.active);
      if (bounds && clipEnd < endB && (dEnd || a.openEnd(end) != b.openEnd(end)))
        boundChange = true;
    }
    if (end > endB)
      break;
    pos = end;
    if (diff <= 0)
      a.next();
    if (diff >= 0)
      b.next();
  }
}
function sameValues(a, b) {
  if (a.length != b.length)
    return false;
  for (let i2 = 0; i2 < a.length; i2++)
    if (a[i2] != b[i2] && !cmpVal(a[i2], b[i2]))
      return false;
  return true;
}
function remove(array, index) {
  for (let i2 = index, e = array.length - 1; i2 < e; i2++)
    array[i2] = array[i2 + 1];
  array.pop();
}
function insert(array, index, value) {
  for (let i2 = array.length - 1; i2 >= index; i2--)
    array[i2 + 1] = array[i2];
  array[index] = value;
}
function findMinIndex(value, array) {
  let found = -1, foundPos = 1e9;
  for (let i2 = 0; i2 < array.length; i2++)
    if ((array[i2] - foundPos || value[i2].endSide - value[found].endSide) < 0) {
      found = i2;
      foundPos = array[i2];
    }
  return found;
}
function countColumn(string2, tabSize, to = string2.length) {
  let n = 0;
  for (let i2 = 0; i2 < to && i2 < string2.length; ) {
    if (string2.charCodeAt(i2) == 9) {
      n += tabSize - n % tabSize;
      i2++;
    } else {
      n++;
      i2 = findClusterBreak(string2, i2);
    }
  }
  return n;
}
function findColumn(string2, col, tabSize, strict) {
  for (let i2 = 0, n = 0; ; ) {
    if (n >= col)
      return i2;
    if (i2 == string2.length)
      break;
    n += string2.charCodeAt(i2) == 9 ? tabSize - n % tabSize : 1;
    i2 = findClusterBreak(string2, i2);
  }
  return strict === true ? -1 : string2.length;
}
const C = "ͼ";
const COUNT = typeof Symbol == "undefined" ? "__" + C : Symbol.for(C);
const SET = typeof Symbol == "undefined" ? "__styleSet" + Math.floor(Math.random() * 1e8) : /* @__PURE__ */ Symbol("styleSet");
const top = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : {};
class StyleModule {
  // :: (Object<Style>, ?{finish: ?(string) → string})
  // Create a style module from the given spec.
  //
  // When `finish` is given, it is called on regular (non-`@`)
  // selectors (after `&` expansion) to compute the final selector.
  constructor(spec, options) {
    this.rules = [];
    let { finish } = options || {};
    function splitSelector(selector) {
      return /^@/.test(selector) ? [selector] : selector.split(/,\s*/);
    }
    function render(selectors, spec2, target, isKeyframes) {
      let local = [], isAt = /^@(\w+)\b/.exec(selectors[0]), keyframes = isAt && isAt[1] == "keyframes";
      if (isAt && spec2 == null) return target.push(selectors[0] + ";");
      for (let prop in spec2) {
        let value = spec2[prop];
        if (/&/.test(prop)) {
          render(
            prop.split(/,\s*/).map((part) => selectors.map((sel) => part.replace(/&/, sel))).reduce((a, b) => a.concat(b)),
            value,
            target
          );
        } else if (value && typeof value == "object") {
          if (!isAt) throw new RangeError("The value of a property (" + prop + ") should be a primitive value.");
          render(splitSelector(prop), value, local, keyframes);
        } else if (value != null) {
          local.push(prop.replace(/_.*/, "").replace(/[A-Z]/g, (l) => "-" + l.toLowerCase()) + ": " + value + ";");
        }
      }
      if (local.length || keyframes) {
        target.push((finish && !isAt && !isKeyframes ? selectors.map(finish) : selectors).join(", ") + " {" + local.join(" ") + "}");
      }
    }
    for (let prop in spec) render(splitSelector(prop), spec[prop], this.rules);
  }
  // :: () → string
  // Returns a string containing the module's CSS rules.
  getRules() {
    return this.rules.join("\n");
  }
  // :: () → string
  // Generate a new unique CSS class name.
  static newName() {
    let id = top[COUNT] || 1;
    top[COUNT] = id + 1;
    return C + id.toString(36);
  }
  // :: (union<Document, ShadowRoot>, union<[StyleModule], StyleModule>, ?{nonce: ?string})
  //
  // Mount the given set of modules in the given DOM root, which ensures
  // that the CSS rules defined by the module are available in that
  // context.
  //
  // Rules are only added to the document once per root.
  //
  // Rule order will follow the order of the modules, so that rules from
  // modules later in the array take precedence of those from earlier
  // modules. If you call this function multiple times for the same root
  // in a way that changes the order of already mounted modules, the old
  // order will be changed.
  //
  // If a Content Security Policy nonce is provided, it is added to
  // the `<style>` tag generated by the library.
  static mount(root, modules, options) {
    let set = root[SET], nonce = options && options.nonce;
    if (!set) set = new StyleSet(root, nonce);
    else if (nonce) set.setNonce(nonce);
    set.mount(Array.isArray(modules) ? modules : [modules], root);
  }
}
let adoptedSet = /* @__PURE__ */ new Map();
class StyleSet {
  constructor(root, nonce) {
    let doc2 = root.ownerDocument || root, win = doc2.defaultView;
    if (!root.head && root.adoptedStyleSheets && win.CSSStyleSheet) {
      let adopted = adoptedSet.get(doc2);
      if (adopted) return root[SET] = adopted;
      this.sheet = new win.CSSStyleSheet();
      adoptedSet.set(doc2, this);
    } else {
      this.styleTag = doc2.createElement("style");
      if (nonce) this.styleTag.setAttribute("nonce", nonce);
    }
    this.modules = [];
    root[SET] = this;
  }
  mount(modules, root) {
    let sheet = this.sheet;
    let pos = 0, j = 0;
    let changed = false;
    for (let i2 = 0; i2 < modules.length; i2++) {
      let mod = modules[i2], index = this.modules.indexOf(mod);
      if (index < j && index > -1) {
        this.modules.splice(index, 1);
        changed = true;
        j--;
        index = -1;
      }
      if (index == -1) {
        this.modules.splice(j++, 0, mod);
        changed = true;
        if (sheet) for (let k = 0; k < mod.rules.length; k++)
          sheet.insertRule(mod.rules[k], pos++);
      } else {
        while (j < index) pos += this.modules[j++].rules.length;
        pos += mod.rules.length;
        j++;
      }
    }
    if (sheet) {
      if (root.adoptedStyleSheets.indexOf(this.sheet) < 0)
        root.adoptedStyleSheets = [this.sheet, ...root.adoptedStyleSheets];
    } else {
      if (changed) {
        let text = "";
        for (let i2 = 0; i2 < this.modules.length; i2++)
          text += this.modules[i2].getRules() + "\n";
        this.styleTag.textContent = text;
      }
      let target = root.head || root;
      if (this.styleTag.parentNode != target)
        target.insertBefore(this.styleTag, target.firstChild);
    }
  }
  setNonce(nonce) {
    if (this.styleTag && this.styleTag.getAttribute("nonce") != nonce)
      this.styleTag.setAttribute("nonce", nonce);
  }
}
var base = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};
var shift = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
};
var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
var ie$1 = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);
for (var i = 1; i <= 24; i++) base[i + 111] = "F" + i;
for (var i = 65; i <= 90; i++) {
  base[i] = String.fromCharCode(i + 32);
  shift[i] = String.fromCharCode(i);
}
for (var code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];
function keyName(event) {
  var ignoreKey = mac && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey || ie$1 && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
  var name2 = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
  if (name2 == "Esc") name2 = "Escape";
  if (name2 == "Del") name2 = "Delete";
  if (name2 == "Left") name2 = "ArrowLeft";
  if (name2 == "Up") name2 = "ArrowUp";
  if (name2 == "Right") name2 = "ArrowRight";
  if (name2 == "Down") name2 = "ArrowDown";
  return name2;
}
function crelt() {
  var elt = arguments[0];
  if (typeof elt == "string") elt = document.createElement(elt);
  var i2 = 1, next = arguments[1];
  if (next && typeof next == "object" && next.nodeType == null && !Array.isArray(next)) {
    for (var name2 in next) if (Object.prototype.hasOwnProperty.call(next, name2)) {
      var value = next[name2];
      if (typeof value == "string") elt.setAttribute(name2, value);
      else if (value != null) elt[name2] = value;
    }
    i2++;
  }
  for (; i2 < arguments.length; i2++) add(elt, arguments[i2]);
  return elt;
}
function add(elt, child) {
  if (typeof child == "string") {
    elt.appendChild(document.createTextNode(child));
  } else if (child == null) ;
  else if (child.nodeType != null) {
    elt.appendChild(child);
  } else if (Array.isArray(child)) {
    for (var i2 = 0; i2 < child.length; i2++) add(elt, child[i2]);
  } else {
    throw new RangeError("Unsupported child node: " + child);
  }
}
let nav = typeof navigator != "undefined" ? navigator : { userAgent: "", vendor: "", platform: "" };
let doc = typeof document != "undefined" ? document : { documentElement: { style: {} } };
const ie_edge = /* @__PURE__ */ /Edge\/(\d+)/.exec(nav.userAgent);
const ie_upto10 = /* @__PURE__ */ /MSIE \d/.test(nav.userAgent);
const ie_11up = /* @__PURE__ */ /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
const ie = !!(ie_upto10 || ie_11up || ie_edge);
const gecko = !ie && /* @__PURE__ */ /gecko\/(\d+)/i.test(nav.userAgent);
const chrome = !ie && /* @__PURE__ */ /Chrome\/(\d+)/.exec(nav.userAgent);
const webkit = "webkitFontSmoothing" in doc.documentElement.style;
const safari = !ie && /* @__PURE__ */ /Apple Computer/.test(nav.vendor);
const ios = safari && (/* @__PURE__ */ /Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2);
var browser = {
  mac: ios || /* @__PURE__ */ /Mac/.test(nav.platform),
  windows: /* @__PURE__ */ /Win/.test(nav.platform),
  linux: /* @__PURE__ */ /Linux|X11/.test(nav.platform),
  ie,
  ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
  gecko,
  gecko_version: gecko ? +(/* @__PURE__ */ /Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
  chrome: !!chrome,
  chrome_version: chrome ? +chrome[1] : 0,
  ios,
  android: /* @__PURE__ */ /Android\b/.test(nav.userAgent),
  webkit,
  webkit_version: webkit ? +(/* @__PURE__ */ /\bAppleWebKit\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
  safari,
  safari_version: safari ? +(/* @__PURE__ */ /\bVersion\/(\d+(\.\d+)?)/.exec(nav.userAgent) || [0, 0])[1] : 0,
  tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
};
function combineAttrs(source, target) {
  for (let name2 in source) {
    if (name2 == "class" && target.class)
      target.class += " " + source.class;
    else if (name2 == "style" && target.style)
      target.style += ";" + source.style;
    else
      target[name2] = source[name2];
  }
  return target;
}
const noAttrs$1 = /* @__PURE__ */ Object.create(null);
function attrsEq(a, b, ignore) {
  if (a == b)
    return true;
  if (!a)
    a = noAttrs$1;
  if (!b)
    b = noAttrs$1;
  let keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length - 0 != keysB.length - 0)
    return false;
  for (let key of keysA) {
    if (key != ignore && (keysB.indexOf(key) == -1 || a[key] !== b[key]))
      return false;
  }
  return true;
}
function setAttrs(dom, attrs) {
  for (let i2 = dom.attributes.length - 1; i2 >= 0; i2--) {
    let name2 = dom.attributes[i2].name;
    if (attrs[name2] == null)
      dom.removeAttribute(name2);
  }
  for (let name2 in attrs) {
    let value = attrs[name2];
    if (name2 == "style")
      dom.style.cssText = value;
    else if (dom.getAttribute(name2) != value)
      dom.setAttribute(name2, value);
  }
}
function updateAttrs(dom, prev, attrs) {
  let changed = false;
  if (prev) {
    for (let name2 in prev)
      if (!(attrs && name2 in attrs)) {
        changed = true;
        if (name2 == "style")
          dom.style.cssText = "";
        else
          dom.removeAttribute(name2);
      }
  }
  if (attrs) {
    for (let name2 in attrs)
      if (!(prev && prev[name2] == attrs[name2])) {
        changed = true;
        if (name2 == "style")
          dom.style.cssText = attrs[name2];
        else
          dom.setAttribute(name2, attrs[name2]);
      }
  }
  return changed;
}
function getAttrs(dom) {
  let attrs = /* @__PURE__ */ Object.create(null);
  for (let i2 = 0; i2 < dom.attributes.length; i2++) {
    let attr = dom.attributes[i2];
    attrs[attr.name] = attr.value;
  }
  return attrs;
}
class WidgetType {
  /**
  Compare this instance to another instance of the same type.
  (TypeScript can't express this, but only instances of the same
  specific class will be passed to this method.) This is used to
  avoid redrawing widgets when they are replaced by a new
  decoration of the same type. The default implementation just
  returns `false`, which will cause new instances of the widget to
  always be redrawn.
  */
  eq(widget) {
    return false;
  }
  /**
  Update a DOM element created by a widget of the same type (but
  different, non-`eq` content) to reflect this widget. May return
  true to indicate that it could update, false to indicate it
  couldn't (in which case the widget will be redrawn). The default
  implementation just returns false.
  */
  updateDOM(dom, view, from) {
    return false;
  }
  /**
  @internal
  */
  compare(other) {
    return this == other || this.constructor == other.constructor && this.eq(other);
  }
  /**
  The estimated height this widget will have, to be used when
  estimating the height of content that hasn't been drawn. May
  return -1 to indicate you don't know. The default implementation
  returns -1.
  */
  get estimatedHeight() {
    return -1;
  }
  /**
  For inline widgets that are displayed inline (as opposed to
  `inline-block`) and introduce line breaks (through `<br>` tags
  or textual newlines), this must indicate the amount of line
  breaks they introduce. Defaults to 0.
  */
  get lineBreaks() {
    return 0;
  }
  /**
  Can be used to configure which kinds of events inside the widget
  should be ignored by the editor. The default is to ignore all
  events.
  */
  ignoreEvent(event) {
    return true;
  }
  /**
  Override the way screen coordinates for positions at/in the
  widget are found. `pos` will be the offset into the widget, and
  `side` the side of the position that is being queried—less than
  zero for before, greater than zero for after, and zero for
  directly at that position.
  */
  coordsAt(dom, pos, side) {
    return null;
  }
  /**
  @internal
  */
  get isHidden() {
    return false;
  }
  /**
  @internal
  */
  get editable() {
    return false;
  }
  /**
  This is called when the an instance of the widget is removed
  from the editor view.
  */
  destroy(dom) {
  }
}
var BlockType = /* @__PURE__ */ (function(BlockType2) {
  BlockType2[BlockType2["Text"] = 0] = "Text";
  BlockType2[BlockType2["WidgetBefore"] = 1] = "WidgetBefore";
  BlockType2[BlockType2["WidgetAfter"] = 2] = "WidgetAfter";
  BlockType2[BlockType2["WidgetRange"] = 3] = "WidgetRange";
  return BlockType2;
})(BlockType || (BlockType = {}));
class Decoration extends RangeValue {
  constructor(startSide, endSide, widget, spec) {
    super();
    this.startSide = startSide;
    this.endSide = endSide;
    this.widget = widget;
    this.spec = spec;
  }
  /**
  @internal
  */
  get heightRelevant() {
    return false;
  }
  /**
  Create a mark decoration, which influences the styling of the
  content in its range. Nested mark decorations will cause nested
  DOM elements to be created. Nesting order is determined by
  precedence of the [facet](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), with
  the higher-precedence decorations creating the inner DOM nodes.
  Such elements are split on line boundaries and on the boundaries
  of lower-precedence decorations.
  */
  static mark(spec) {
    return new MarkDecoration(spec);
  }
  /**
  Create a widget decoration, which displays a DOM element at the
  given position.
  */
  static widget(spec) {
    let side = Math.max(-1e4, Math.min(1e4, spec.side || 0)), block = !!spec.block;
    side += block && !spec.inlineOrder ? side > 0 ? 3e8 : -4e8 : side > 0 ? 1e8 : -1e8;
    return new PointDecoration(spec, side, side, block, spec.widget || null, false);
  }
  /**
  Create a replace decoration which replaces the given range with
  a widget, or simply hides it.
  */
  static replace(spec) {
    let block = !!spec.block, startSide, endSide;
    if (spec.isBlockGap) {
      startSide = -5e8;
      endSide = 4e8;
    } else {
      let { start, end } = getInclusive(spec, block);
      startSide = (start ? block ? -3e8 : -1 : 5e8) - 1;
      endSide = (end ? block ? 2e8 : 1 : -6e8) + 1;
    }
    return new PointDecoration(spec, startSide, endSide, block, spec.widget || null, true);
  }
  /**
  Create a line decoration, which can add DOM attributes to the
  line starting at the given position.
  */
  static line(spec) {
    return new LineDecoration(spec);
  }
  /**
  Build a [`DecorationSet`](https://codemirror.net/6/docs/ref/#view.DecorationSet) from the given
  decorated range or ranges. If the ranges aren't already sorted,
  pass `true` for `sort` to make the library sort them for you.
  */
  static set(of, sort = false) {
    return RangeSet.of(of, sort);
  }
  /**
  @internal
  */
  hasHeight() {
    return this.widget ? this.widget.estimatedHeight > -1 : false;
  }
}
Decoration.none = RangeSet.empty;
class MarkDecoration extends Decoration {
  constructor(spec) {
    let { start, end } = getInclusive(spec);
    super(start ? -1 : 5e8, end ? 1 : -6e8, null, spec);
    this.tagName = spec.tagName || "span";
    this.attrs = spec.class && spec.attributes ? combineAttrs(spec.attributes, { class: spec.class }) : spec.class ? { class: spec.class } : spec.attributes || noAttrs$1;
  }
  eq(other) {
    return this == other || other instanceof MarkDecoration && this.tagName == other.tagName && attrsEq(this.attrs, other.attrs);
  }
  range(from, to = from) {
    if (from >= to)
      throw new RangeError("Mark decorations may not be empty");
    return super.range(from, to);
  }
}
MarkDecoration.prototype.point = false;
class LineDecoration extends Decoration {
  constructor(spec) {
    super(-2e8, -2e8, null, spec);
  }
  eq(other) {
    return other instanceof LineDecoration && this.spec.class == other.spec.class && attrsEq(this.spec.attributes, other.spec.attributes);
  }
  range(from, to = from) {
    if (to != from)
      throw new RangeError("Line decoration ranges must be zero-length");
    return super.range(from, to);
  }
}
LineDecoration.prototype.mapMode = MapMode.TrackBefore;
LineDecoration.prototype.point = true;
class PointDecoration extends Decoration {
  constructor(spec, startSide, endSide, block, widget, isReplace) {
    super(startSide, endSide, widget, spec);
    this.block = block;
    this.isReplace = isReplace;
    this.mapMode = !block ? MapMode.TrackDel : startSide <= 0 ? MapMode.TrackBefore : MapMode.TrackAfter;
  }
  // Only relevant when this.block == true
  get type() {
    return this.startSide != this.endSide ? BlockType.WidgetRange : this.startSide <= 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
  }
  get heightRelevant() {
    return this.block || !!this.widget && (this.widget.estimatedHeight >= 5 || this.widget.lineBreaks > 0);
  }
  eq(other) {
    return other instanceof PointDecoration && widgetsEq(this.widget, other.widget) && this.block == other.block && this.startSide == other.startSide && this.endSide == other.endSide;
  }
  range(from, to = from) {
    if (this.isReplace && (from > to || from == to && this.startSide > 0 && this.endSide <= 0))
      throw new RangeError("Invalid range for replacement decoration");
    if (!this.isReplace && to != from)
      throw new RangeError("Widget decorations can only have zero-length ranges");
    return super.range(from, to);
  }
}
PointDecoration.prototype.point = true;
function getInclusive(spec, block = false) {
  let { inclusiveStart: start, inclusiveEnd: end } = spec;
  if (start == null)
    start = spec.inclusive;
  if (end == null)
    end = spec.inclusive;
  return { start: start !== null && start !== void 0 ? start : block, end: end !== null && end !== void 0 ? end : block };
}
function widgetsEq(a, b) {
  return a == b || !!(a && b && a.compare(b));
}
function addRange(from, to, ranges, margin = 0) {
  let last2 = ranges.length - 1;
  if (last2 >= 0 && ranges[last2] + margin >= from)
    ranges[last2] = Math.max(ranges[last2], to);
  else
    ranges.push(from, to);
}
class BlockWrapper extends RangeValue {
  constructor(tagName, attributes, rank) {
    super();
    this.tagName = tagName;
    this.attributes = attributes;
    this.rank = rank;
  }
  eq(other) {
    return other == this || other instanceof BlockWrapper && this.tagName == other.tagName && attrsEq(this.attributes, other.attributes);
  }
  /**
  Create a block wrapper object with the given tag name and
  attributes.
  */
  static create(spec) {
    return new BlockWrapper(spec.tagName, spec.attributes || noAttrs$1, spec.rank == null ? 50 : Math.max(0, Math.min(spec.rank, 100)));
  }
  /**
  Create a range set from the given block wrapper ranges.
  */
  static set(of, sort = false) {
    return RangeSet.of(of, sort);
  }
}
BlockWrapper.prototype.startSide = BlockWrapper.prototype.endSide = -1;
const isElt = (node) => node.nodeType == 1;
const isText = (node) => node.nodeType == 3;
function getSelection(root) {
  let target;
  if (root.nodeType == 11) {
    target = root.getSelection ? root : root.ownerDocument;
  } else {
    target = root;
  }
  return target.getSelection();
}
function contains(dom, node) {
  return node ? dom == node || dom.contains(node.nodeType != 1 ? node.parentNode : node) : false;
}
function hasSelection(dom, selection2) {
  if (!selection2.anchorNode)
    return false;
  try {
    return contains(dom, selection2.anchorNode);
  } catch (_) {
    return false;
  }
}
function clientRectsFor(dom) {
  if (isText(dom))
    return textRange(dom, 0, dom.nodeValue.length).getClientRects();
  else if (isElt(dom))
    return dom.getClientRects();
  else
    return [];
}
function isEquivalentPosition(node, off, targetNode, targetOff) {
  return targetNode ? scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1) : false;
}
function domIndex(node) {
  for (var index = 0; ; index++) {
    node = node.previousSibling;
    if (!node)
      return index;
  }
}
function isBlockElement(node) {
  return isElt(node) && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
}
function scanFor(node, off, targetNode, targetOff, dir) {
  for (; ; ) {
    if (node == targetNode && off == targetOff)
      return true;
    if (off == (dir < 0 ? 0 : maxOffset(node))) {
      if (node.nodeName == "DIV")
        return false;
      let parent = node.parentNode;
      if (!parent || !isElt(parent))
        return false;
      off = domIndex(node) + (dir < 0 ? 0 : 1);
      node = parent;
    } else if (isElt(node)) {
      node = node.childNodes[off + (dir < 0 ? -1 : 0)];
      if (isElt(node) && (node.nodeName == "IMG" || node.nodeName == "BR" || node.contentEditable == "false"))
        return false;
      off = dir < 0 ? maxOffset(node) : 0;
    } else {
      return false;
    }
  }
}
function maxOffset(node) {
  return isText(node) ? node.nodeValue.length : node.childNodes.length;
}
function flattenRect(rect, toLeft) {
  let { left, right } = rect;
  if (left == right)
    return rect;
  let x = toLeft ? left : right;
  return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}
function windowRect(win) {
  let vp = win.visualViewport;
  if (vp)
    return {
      left: 0,
      right: vp.width,
      top: 0,
      bottom: vp.height
    };
  return {
    left: 0,
    right: win.innerWidth,
    top: 0,
    bottom: win.innerHeight
  };
}
function getScale(elt, rect) {
  let scaleX = rect.width / elt.offsetWidth;
  let scaleY = rect.height / elt.offsetHeight;
  if (scaleX > 0.995 && scaleX < 1.005 || !isFinite(scaleX) || Math.abs(rect.width - elt.offsetWidth) < 1)
    scaleX = 1;
  if (scaleY > 0.995 && scaleY < 1.005 || !isFinite(scaleY) || Math.abs(rect.height - elt.offsetHeight) < 1)
    scaleY = 1;
  return { scaleX, scaleY };
}
function scrollRectIntoView(dom, rect, side, x, y, xMargin, yMargin, ltr) {
  let doc2 = dom.ownerDocument, win = doc2.defaultView || window;
  for (let cur2 = dom, stop = false; cur2 && !stop; ) {
    if (isElt(cur2)) {
      let bounding, top2 = cur2 == doc2.body;
      let scaleX = 1, scaleY = 1, xScroll = true, yScroll = true;
      if (top2) {
        bounding = windowRect(win);
      } else {
        let style = getComputedStyle(cur2);
        if (/^(fixed|sticky)$/.test(style.position))
          stop = true;
        if (cur2.scrollHeight <= cur2.clientHeight || !/auto|scroll/.test(style.overflowY))
          yScroll = false;
        if (cur2.scrollWidth <= cur2.clientWidth || !/auto|scroll/.test(style.overflowX))
          xScroll = false;
        if (!xScroll && !yScroll) {
          cur2 = cur2.assignedSlot || cur2.parentNode;
          continue;
        }
        let rect2 = cur2.getBoundingClientRect();
        ({ scaleX, scaleY } = getScale(cur2, rect2));
        bounding = {
          left: rect2.left,
          right: rect2.left + cur2.clientWidth * scaleX,
          top: rect2.top,
          bottom: rect2.top + cur2.clientHeight * scaleY
        };
      }
      let moveX = 0, moveY = 0;
      if (!yScroll) ;
      else if (y == "nearest") {
        if (rect.top < bounding.top + yMargin) {
          moveY = rect.top - (bounding.top + yMargin);
          if (side > 0 && rect.bottom > bounding.bottom + moveY)
            moveY = rect.bottom - bounding.bottom + yMargin;
        } else if (rect.bottom > bounding.bottom - yMargin) {
          moveY = rect.bottom - bounding.bottom + yMargin;
          if (side < 0 && rect.top - moveY < bounding.top)
            moveY = rect.top - (bounding.top + yMargin);
        }
      } else {
        let rectHeight = rect.bottom - rect.top, boundingHeight = bounding.bottom - bounding.top;
        let targetTop = y == "center" && rectHeight <= boundingHeight ? rect.top + rectHeight / 2 - boundingHeight / 2 : y == "start" || y == "center" && side < 0 ? rect.top - yMargin : rect.bottom - boundingHeight + yMargin;
        moveY = targetTop - bounding.top;
      }
      if (!xScroll) ;
      else if (x == "nearest") {
        if (rect.left < bounding.left + xMargin) {
          moveX = rect.left - (bounding.left + xMargin);
          if (side > 0 && rect.right > bounding.right + moveX)
            moveX = rect.right - bounding.right + xMargin;
        } else if (rect.right > bounding.right - xMargin) {
          moveX = rect.right - bounding.right + xMargin;
          if (side < 0 && rect.left < bounding.left + moveX)
            moveX = rect.left - (bounding.left + xMargin);
        }
      } else {
        let targetLeft = x == "center" ? rect.left + (rect.right - rect.left) / 2 - (bounding.right - bounding.left) / 2 : x == "start" == ltr ? rect.left - xMargin : rect.right - (bounding.right - bounding.left) + xMargin;
        moveX = targetLeft - bounding.left;
      }
      if (moveX || moveY) {
        if (top2) {
          win.scrollBy(moveX, moveY);
        } else {
          let movedX = 0, movedY = 0;
          if (moveY) {
            let start = cur2.scrollTop;
            cur2.scrollTop += moveY / scaleY;
            movedY = (cur2.scrollTop - start) * scaleY;
          }
          if (moveX) {
            let start = cur2.scrollLeft;
            cur2.scrollLeft += moveX / scaleX;
            movedX = (cur2.scrollLeft - start) * scaleX;
          }
          rect = {
            left: rect.left - movedX,
            top: rect.top - movedY,
            right: rect.right - movedX,
            bottom: rect.bottom - movedY
          };
          if (movedX && Math.abs(movedX - moveX) < 1)
            x = "nearest";
          if (movedY && Math.abs(movedY - moveY) < 1)
            y = "nearest";
        }
      }
      if (top2)
        break;
      if (rect.top < bounding.top || rect.bottom > bounding.bottom || rect.left < bounding.left || rect.right > bounding.right)
        rect = {
          left: Math.max(rect.left, bounding.left),
          right: Math.min(rect.right, bounding.right),
          top: Math.max(rect.top, bounding.top),
          bottom: Math.min(rect.bottom, bounding.bottom)
        };
      cur2 = cur2.assignedSlot || cur2.parentNode;
    } else if (cur2.nodeType == 11) {
      cur2 = cur2.host;
    } else {
      break;
    }
  }
}
function scrollableParents(dom, getX = true) {
  let doc2 = dom.ownerDocument, x = null, y = null;
  for (let cur2 = dom.parentNode; cur2; ) {
    if (cur2 == doc2.body || (!getX || x) && y) {
      break;
    } else if (isElt(cur2)) {
      if (!y && cur2.scrollHeight > cur2.clientHeight && /scroll|auto/.test(getComputedStyle(cur2).overflowY))
        y = cur2;
      if (getX && !x && cur2.scrollWidth > cur2.clientWidth && /scroll|auto/.test(getComputedStyle(cur2).overflowX))
        x = cur2;
      cur2 = cur2.assignedSlot || cur2.parentNode;
    } else if (cur2.nodeType == 11) {
      cur2 = cur2.host;
    } else {
      break;
    }
  }
  return { x, y };
}
class DOMSelectionState {
  constructor() {
    this.anchorNode = null;
    this.anchorOffset = 0;
    this.focusNode = null;
    this.focusOffset = 0;
  }
  eq(domSel) {
    return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset && this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
  }
  setRange(range) {
    let { anchorNode, focusNode } = range;
    this.set(anchorNode, Math.min(range.anchorOffset, anchorNode ? maxOffset(anchorNode) : 0), focusNode, Math.min(range.focusOffset, focusNode ? maxOffset(focusNode) : 0));
  }
  set(anchorNode, anchorOffset, focusNode, focusOffset) {
    this.anchorNode = anchorNode;
    this.anchorOffset = anchorOffset;
    this.focusNode = focusNode;
    this.focusOffset = focusOffset;
  }
}
function getScrollStack(target) {
  let stack = [];
  for (let cur2 = target; cur2; cur2 = cur2.nodeType == 11 ? cur2.host : cur2.parentNode) {
    if (isElt(cur2))
      stack.push({ node: cur2, left: cur2.scrollLeft, top: cur2.scrollTop });
  }
  return stack;
}
function restoreScrollStack(stack, vert = true) {
  for (let { node, left, top: top2 } of stack) {
    if (vert && node.scrollTop != top2)
      node.scrollTop = top2;
    if (node.scrollLeft != left)
      node.scrollLeft = left;
  }
}
let preventScrollSupported = null;
if (browser.safari && browser.safari_version >= 26)
  preventScrollSupported = false;
function focusPreventScroll(dom) {
  if (dom.setActive)
    return dom.setActive();
  if (preventScrollSupported)
    return dom.focus(preventScrollSupported);
  let stack = getScrollStack(dom);
  dom.focus(preventScrollSupported == null ? {
    get preventScroll() {
      preventScrollSupported = { preventScroll: true };
      return true;
    }
  } : void 0);
  if (!preventScrollSupported) {
    preventScrollSupported = false;
    restoreScrollStack(stack);
  }
}
let scratchRange;
function textRange(node, from, to = from) {
  let range = scratchRange || (scratchRange = document.createRange());
  range.setEnd(node, to);
  range.setStart(node, from);
  return range;
}
function dispatchKey(elt, name2, code2, mods) {
  let options = { key: name2, code: name2, keyCode: code2, which: code2, cancelable: true };
  if (mods)
    ({ altKey: options.altKey, ctrlKey: options.ctrlKey, shiftKey: options.shiftKey, metaKey: options.metaKey } = mods);
  let down = new KeyboardEvent("keydown", options);
  down.synthetic = true;
  elt.dispatchEvent(down);
  let up = new KeyboardEvent("keyup", options);
  up.synthetic = true;
  elt.dispatchEvent(up);
  return down.defaultPrevented || up.defaultPrevented;
}
function getRoot(node) {
  while (node) {
    if (node && (node.nodeType == 9 || node.nodeType == 11 && node.host))
      return node;
    node = node.assignedSlot || node.parentNode;
  }
  return null;
}
function atElementStart(doc2, selection2) {
  let node = selection2.focusNode, offset = selection2.focusOffset;
  if (!node || selection2.anchorNode != node || selection2.anchorOffset != offset)
    return false;
  offset = Math.min(offset, maxOffset(node));
  for (; ; ) {
    if (offset) {
      if (!isElt(node))
        return false;
      let prev = node.childNodes[offset - 1];
      if (prev.contentEditable == "false")
        offset--;
      else {
        node = prev;
        offset = maxOffset(node);
      }
    } else if (node == doc2) {
      return true;
    } else {
      offset = domIndex(node);
      node = node.parentNode;
    }
  }
}
function isScrolledToBottom(elt) {
  if (elt instanceof Window)
    return elt.pageYOffset > Math.max(0, elt.document.documentElement.scrollHeight - elt.innerHeight - 4);
  return elt.scrollTop > Math.max(1, elt.scrollHeight - elt.clientHeight - 4);
}
function textNodeBefore(startNode, startOffset) {
  for (let node = startNode, offset = startOffset; ; ) {
    if (isText(node) && offset > 0) {
      return { node, offset };
    } else if (isElt(node) && offset > 0) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset - 1];
      offset = maxOffset(node);
    } else if (node.parentNode && !isBlockElement(node)) {
      offset = domIndex(node);
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function textNodeAfter(startNode, startOffset) {
  for (let node = startNode, offset = startOffset; ; ) {
    if (isText(node) && offset < node.nodeValue.length) {
      return { node, offset };
    } else if (isElt(node) && offset < node.childNodes.length) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset];
      offset = 0;
    } else if (node.parentNode && !isBlockElement(node)) {
      offset = domIndex(node) + 1;
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
class DOMPos {
  constructor(node, offset, precise = true) {
    this.node = node;
    this.offset = offset;
    this.precise = precise;
  }
  static before(dom, precise) {
    return new DOMPos(dom.parentNode, domIndex(dom), precise);
  }
  static after(dom, precise) {
    return new DOMPos(dom.parentNode, domIndex(dom) + 1, precise);
  }
}
var Direction = /* @__PURE__ */ (function(Direction2) {
  Direction2[Direction2["LTR"] = 0] = "LTR";
  Direction2[Direction2["RTL"] = 1] = "RTL";
  return Direction2;
})(Direction || (Direction = {}));
const LTR = Direction.LTR, RTL = Direction.RTL;
function dec(str) {
  let result = [];
  for (let i2 = 0; i2 < str.length; i2++)
    result.push(1 << +str[i2]);
  return result;
}
const LowTypes = /* @__PURE__ */ dec("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008");
const ArabicTypes = /* @__PURE__ */ dec("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333");
const Brackets = /* @__PURE__ */ Object.create(null), BracketStack = [];
for (let p of ["()", "[]", "{}"]) {
  let l = /* @__PURE__ */ p.charCodeAt(0), r = /* @__PURE__ */ p.charCodeAt(1);
  Brackets[l] = r;
  Brackets[r] = -l;
}
function charType(ch) {
  return ch <= 247 ? LowTypes[ch] : 1424 <= ch && ch <= 1524 ? 2 : 1536 <= ch && ch <= 1785 ? ArabicTypes[ch - 1536] : 1774 <= ch && ch <= 2220 ? 4 : 8192 <= ch && ch <= 8204 ? 256 : 64336 <= ch && ch <= 65023 ? 4 : 1;
}
const BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
class BidiSpan {
  /**
  The direction of this span.
  */
  get dir() {
    return this.level % 2 ? RTL : LTR;
  }
  /**
  @internal
  */
  constructor(from, to, level) {
    this.from = from;
    this.to = to;
    this.level = level;
  }
  /**
  @internal
  */
  side(end, dir) {
    return this.dir == dir == end ? this.to : this.from;
  }
  /**
  @internal
  */
  forward(forward, dir) {
    return forward == (this.dir == dir);
  }
  /**
  @internal
  */
  static find(order, index, level, assoc) {
    let maybe = -1;
    for (let i2 = 0; i2 < order.length; i2++) {
      let span = order[i2];
      if (span.from <= index && span.to >= index) {
        if (span.level == level)
          return i2;
        if (maybe < 0 || (assoc != 0 ? assoc < 0 ? span.from < index : span.to > index : order[maybe].level > span.level))
          maybe = i2;
      }
    }
    if (maybe < 0)
      throw new RangeError("Index out of range");
    return maybe;
  }
}
function isolatesEq(a, b) {
  if (a.length != b.length)
    return false;
  for (let i2 = 0; i2 < a.length; i2++) {
    let iA = a[i2], iB = b[i2];
    if (iA.from != iB.from || iA.to != iB.to || iA.direction != iB.direction || !isolatesEq(iA.inner, iB.inner))
      return false;
  }
  return true;
}
const types = [];
function computeCharTypes(line, rFrom, rTo, isolates, outerType) {
  for (let iI = 0; iI <= isolates.length; iI++) {
    let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
    let prevType = iI ? 256 : outerType;
    for (let i2 = from, prev = prevType, prevStrong = prevType; i2 < to; i2++) {
      let type = charType(line.charCodeAt(i2));
      if (type == 512)
        type = prev;
      else if (type == 8 && prevStrong == 4)
        type = 16;
      types[i2] = type == 4 ? 2 : type;
      if (type & 7)
        prevStrong = type;
      prev = type;
    }
    for (let i2 = from, prev = prevType, prevStrong = prevType; i2 < to; i2++) {
      let type = types[i2];
      if (type == 128) {
        if (i2 < to - 1 && prev == types[i2 + 1] && prev & 24)
          type = types[i2] = prev;
        else
          types[i2] = 256;
      } else if (type == 64) {
        let end = i2 + 1;
        while (end < to && types[end] == 64)
          end++;
        let replace2 = i2 && prev == 8 || end < rTo && types[end] == 8 ? prevStrong == 1 ? 1 : 8 : 256;
        for (let j = i2; j < end; j++)
          types[j] = replace2;
        i2 = end - 1;
      } else if (type == 8 && prevStrong == 1) {
        types[i2] = 1;
      }
      prev = type;
      if (type & 7)
        prevStrong = type;
    }
  }
}
function processBracketPairs(line, rFrom, rTo, isolates, outerType) {
  let oppositeType = outerType == 1 ? 2 : 1;
  for (let iI = 0, sI = 0, context = 0; iI <= isolates.length; iI++) {
    let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
    for (let i2 = from, ch, br, type; i2 < to; i2++) {
      if (br = Brackets[ch = line.charCodeAt(i2)]) {
        if (br < 0) {
          for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
            if (BracketStack[sJ + 1] == -br) {
              let flags = BracketStack[sJ + 2];
              let type2 = flags & 2 ? outerType : !(flags & 4) ? 0 : flags & 1 ? oppositeType : outerType;
              if (type2)
                types[i2] = types[BracketStack[sJ]] = type2;
              sI = sJ;
              break;
            }
          }
        } else if (BracketStack.length == 189) {
          break;
        } else {
          BracketStack[sI++] = i2;
          BracketStack[sI++] = ch;
          BracketStack[sI++] = context;
        }
      } else if ((type = types[i2]) == 2 || type == 1) {
        let embed = type == outerType;
        context = embed ? 0 : 1;
        for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
          let cur2 = BracketStack[sJ + 2];
          if (cur2 & 2)
            break;
          if (embed) {
            BracketStack[sJ + 2] |= 2;
          } else {
            if (cur2 & 4)
              break;
            BracketStack[sJ + 2] |= 4;
          }
        }
      }
    }
  }
}
function processNeutrals(rFrom, rTo, isolates, outerType) {
  for (let iI = 0, prev = outerType; iI <= isolates.length; iI++) {
    let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
    for (let i2 = from; i2 < to; ) {
      let type = types[i2];
      if (type == 256) {
        let end = i2 + 1;
        for (; ; ) {
          if (end == to) {
            if (iI == isolates.length)
              break;
            end = isolates[iI++].to;
            to = iI < isolates.length ? isolates[iI].from : rTo;
          } else if (types[end] == 256) {
            end++;
          } else {
            break;
          }
        }
        let beforeL = prev == 1;
        let afterL = (end < rTo ? types[end] : outerType) == 1;
        let replace2 = beforeL == afterL ? beforeL ? 1 : 2 : outerType;
        for (let j = end, jI = iI, fromJ = jI ? isolates[jI - 1].to : rFrom; j > i2; ) {
          if (j == fromJ) {
            j = isolates[--jI].from;
            fromJ = jI ? isolates[jI - 1].to : rFrom;
          }
          types[--j] = replace2;
        }
        i2 = end;
      } else {
        prev = type;
        i2++;
      }
    }
  }
}
function emitSpans(line, from, to, level, baseLevel, isolates, order) {
  let ourType = level % 2 ? 2 : 1;
  if (level % 2 == baseLevel % 2) {
    for (let iCh = from, iI = 0; iCh < to; ) {
      let sameDir = true, isNum = false;
      if (iI == isolates.length || iCh < isolates[iI].from) {
        let next = types[iCh];
        if (next != ourType) {
          sameDir = false;
          isNum = next == 16;
        }
      }
      let recurse = !sameDir && ourType == 1 ? [] : null;
      let localLevel = sameDir ? level : level + 1;
      let iScan = iCh;
      run: for (; ; ) {
        if (iI < isolates.length && iScan == isolates[iI].from) {
          if (isNum)
            break run;
          let iso = isolates[iI];
          if (!sameDir)
            for (let upto = iso.to, jI = iI + 1; ; ) {
              if (upto == to)
                break run;
              if (jI < isolates.length && isolates[jI].from == upto)
                upto = isolates[jI++].to;
              else if (types[upto] == ourType)
                break run;
              else
                break;
            }
          iI++;
          if (recurse) {
            recurse.push(iso);
          } else {
            if (iso.from > iCh)
              order.push(new BidiSpan(iCh, iso.from, localLevel));
            let dirSwap = iso.direction == LTR != !(localLevel % 2);
            computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
            iCh = iso.to;
          }
          iScan = iso.to;
        } else if (iScan == to || (sameDir ? types[iScan] != ourType : types[iScan] == ourType)) {
          break;
        } else {
          iScan++;
        }
      }
      if (recurse)
        emitSpans(line, iCh, iScan, level + 1, baseLevel, recurse, order);
      else if (iCh < iScan)
        order.push(new BidiSpan(iCh, iScan, localLevel));
      iCh = iScan;
    }
  } else {
    for (let iCh = to, iI = isolates.length; iCh > from; ) {
      let sameDir = true, isNum = false;
      if (!iI || iCh > isolates[iI - 1].to) {
        let next = types[iCh - 1];
        if (next != ourType) {
          sameDir = false;
          isNum = next == 16;
        }
      }
      let recurse = !sameDir && ourType == 1 ? [] : null;
      let localLevel = sameDir ? level : level + 1;
      let iScan = iCh;
      run: for (; ; ) {
        if (iI && iScan == isolates[iI - 1].to) {
          if (isNum)
            break run;
          let iso = isolates[--iI];
          if (!sameDir)
            for (let upto = iso.from, jI = iI; ; ) {
              if (upto == from)
                break run;
              if (jI && isolates[jI - 1].to == upto)
                upto = isolates[--jI].from;
              else if (types[upto - 1] == ourType)
                break run;
              else
                break;
            }
          if (recurse) {
            recurse.push(iso);
          } else {
            if (iso.to < iCh)
              order.push(new BidiSpan(iso.to, iCh, localLevel));
            let dirSwap = iso.direction == LTR != !(localLevel % 2);
            computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
            iCh = iso.from;
          }
          iScan = iso.from;
        } else if (iScan == from || (sameDir ? types[iScan - 1] != ourType : types[iScan - 1] == ourType)) {
          break;
        } else {
          iScan--;
        }
      }
      if (recurse)
        emitSpans(line, iScan, iCh, level + 1, baseLevel, recurse, order);
      else if (iScan < iCh)
        order.push(new BidiSpan(iScan, iCh, localLevel));
      iCh = iScan;
    }
  }
}
function computeSectionOrder(line, level, baseLevel, isolates, from, to, order) {
  let outerType = level % 2 ? 2 : 1;
  computeCharTypes(line, from, to, isolates, outerType);
  processBracketPairs(line, from, to, isolates, outerType);
  processNeutrals(from, to, isolates, outerType);
  emitSpans(line, from, to, level, baseLevel, isolates, order);
}
function computeOrder(line, direction, isolates) {
  if (!line)
    return [new BidiSpan(0, 0, direction == RTL ? 1 : 0)];
  if (direction == LTR && !isolates.length && !BidiRE.test(line))
    return trivialOrder(line.length);
  if (isolates.length)
    while (line.length > types.length)
      types[types.length] = 256;
  let order = [], level = direction == LTR ? 0 : 1;
  computeSectionOrder(line, level, level, isolates, 0, line.length, order);
  return order;
}
function trivialOrder(length) {
  return [new BidiSpan(0, length, 0)];
}
let movedOver = "";
function moveVisually(line, order, dir, start, forward) {
  var _a2;
  if (!line.length)
    return null;
  let startIndex = start.head - line.from, spanI;
  if (start.head == line.from && start.assoc < 0) {
    if (!forward)
      return null;
    startIndex = order[spanI = 0].side(false, dir);
  } else if (start.head == line.to && start.assoc > 0) {
    if (forward)
      return null;
    startIndex = order[spanI = order.length - 1].side(true, dir);
  } else {
    spanI = BidiSpan.find(order, startIndex, (_a2 = start.bidiLevel) !== null && _a2 !== void 0 ? _a2 : -1, start.assoc);
  }
  let span = order[spanI], spanEnd = span.side(forward, dir);
  if (startIndex == spanEnd) {
    let nextI = spanI += forward ? 1 : -1;
    if (nextI < 0 || nextI >= order.length)
      return null;
    span = order[spanI = nextI];
    startIndex = span.side(!forward, dir);
    spanEnd = span.side(forward, dir);
  }
  let nextIndex = findClusterBreak(line.text, startIndex, span.forward(forward, dir));
  if (nextIndex < span.from || nextIndex > span.to)
    nextIndex = spanEnd;
  movedOver = line.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
  let nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
  if (nextIndex == spanEnd) {
    if (!nextSpan)
      return forward ? EditorSelection.cursor(line.to, 1) : EditorSelection.cursor(line.from, -1);
    if (nextSpan.level + (forward ? 0 : 1) < span.level)
      return EditorSelection.cursor(nextSpan.side(!forward, dir) + line.from, nextSpan.forward(forward, dir) ? 1 : -1, nextSpan.level);
  }
  return EditorSelection.cursor(nextIndex + line.from, span.forward(forward, dir) ? -1 : 1, span.level);
}
function autoDirection(text, from, to) {
  for (let i2 = from; i2 < to; i2++) {
    let type = charType(text.charCodeAt(i2));
    if (type == 1)
      return LTR;
    if (type == 2 || type == 4)
      return RTL;
  }
}
const clickAddsSelectionRange = /* @__PURE__ */ Facet.define();
const dragMovesSelection$1 = /* @__PURE__ */ Facet.define();
const mouseSelectionStyle = /* @__PURE__ */ Facet.define();
const exceptionSink = /* @__PURE__ */ Facet.define();
const updateListener = /* @__PURE__ */ Facet.define();
const inputHandler$1 = /* @__PURE__ */ Facet.define();
const focusChangeEffect = /* @__PURE__ */ Facet.define();
const clipboardInputFilter = /* @__PURE__ */ Facet.define();
const clipboardOutputFilter = /* @__PURE__ */ Facet.define();
const perLineTextDirection = /* @__PURE__ */ Facet.define({
  combine: (values) => values.some((x) => x)
});
const nativeSelectionHidden = /* @__PURE__ */ Facet.define({
  combine: (values) => values.some((x) => x)
});
const scrollHandler = /* @__PURE__ */ Facet.define();
class ScrollTarget {
  constructor(range, y, x, yMargin, xMargin, isSnapshot = false) {
    this.range = range;
    this.y = y;
    this.x = x;
    this.yMargin = yMargin;
    this.xMargin = xMargin;
    this.isSnapshot = isSnapshot;
  }
  map(changes) {
    return changes.empty ? this : new ScrollTarget(this.range.map(changes), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
  }
  clip(state2) {
    return this.range.to <= state2.doc.length ? this : new ScrollTarget(EditorSelection.cursor(state2.doc.length), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
  }
}
const scrollIntoView$1 = /* @__PURE__ */ StateEffect.define({ map: (t2, ch) => t2.map(ch) });
const setEditContextFormatting = /* @__PURE__ */ StateEffect.define();
function logException(state2, exception, context) {
  let handler = state2.facet(exceptionSink);
  if (handler.length)
    handler[0](exception);
  else if (window.onerror && window.onerror(String(exception), context, void 0, void 0, exception)) ;
  else if (context)
    console.error(context + ":", exception);
  else
    console.error(exception);
}
const editable = /* @__PURE__ */ Facet.define({ combine: (values) => values.length ? values[0] : true });
let nextPluginID = 0;
const viewPlugin = /* @__PURE__ */ Facet.define({
  combine(plugins) {
    return plugins.filter((p, i2) => {
      for (let j = 0; j < i2; j++)
        if (plugins[j].plugin == p.plugin)
          return false;
      return true;
    });
  }
});
class ViewPlugin {
  constructor(id, create, domEventHandlers, domEventObservers, buildExtensions) {
    this.id = id;
    this.create = create;
    this.domEventHandlers = domEventHandlers;
    this.domEventObservers = domEventObservers;
    this.baseExtensions = buildExtensions(this);
    this.extension = this.baseExtensions.concat(viewPlugin.of({ plugin: this, arg: void 0 }));
  }
  /**
  Create an extension for this plugin with the given argument.
  */
  of(arg) {
    return this.baseExtensions.concat(viewPlugin.of({ plugin: this, arg }));
  }
  /**
  Define a plugin from a constructor function that creates the
  plugin's value, given an editor view.
  */
  static define(create, spec) {
    const { eventHandlers, eventObservers, provide, decorations: deco } = spec || {};
    return new ViewPlugin(nextPluginID++, create, eventHandlers, eventObservers, (plugin) => {
      let ext = [];
      if (deco)
        ext.push(decorations.of((view) => {
          let pluginInst = view.plugin(plugin);
          return pluginInst ? deco(pluginInst) : Decoration.none;
        }));
      if (provide)
        ext.push(provide(plugin));
      return ext;
    });
  }
  /**
  Create a plugin for a class whose constructor takes a single
  editor view as argument.
  */
  static fromClass(cls, spec) {
    return ViewPlugin.define((view, arg) => new cls(view, arg), spec);
  }
}
class PluginInstance {
  constructor(spec) {
    this.spec = spec;
    this.mustUpdate = null;
    this.value = null;
  }
  get plugin() {
    return this.spec && this.spec.plugin;
  }
  update(view) {
    if (!this.value) {
      if (this.spec) {
        try {
          this.value = this.spec.plugin.create(view, this.spec.arg);
        } catch (e) {
          logException(view.state, e, "CodeMirror plugin crashed");
          this.deactivate();
        }
      }
    } else if (this.mustUpdate) {
      let update = this.mustUpdate;
      this.mustUpdate = null;
      if (this.value.update) {
        try {
          this.value.update(update);
        } catch (e) {
          logException(update.state, e, "CodeMirror plugin crashed");
          if (this.value.destroy)
            try {
              this.value.destroy();
            } catch (_) {
            }
          this.deactivate();
        }
      }
    }
    return this;
  }
  destroy(view) {
    var _a2;
    if ((_a2 = this.value) === null || _a2 === void 0 ? void 0 : _a2.destroy) {
      try {
        this.value.destroy();
      } catch (e) {
        logException(view.state, e, "CodeMirror plugin crashed");
      }
    }
  }
  deactivate() {
    this.spec = this.value = null;
  }
}
const editorAttributes = /* @__PURE__ */ Facet.define();
const contentAttributes = /* @__PURE__ */ Facet.define();
const decorations = /* @__PURE__ */ Facet.define();
const blockWrappers = /* @__PURE__ */ Facet.define();
const outerDecorations = /* @__PURE__ */ Facet.define();
const atomicRanges = /* @__PURE__ */ Facet.define();
const bidiIsolatedRanges = /* @__PURE__ */ Facet.define();
function getIsolatedRanges(view, line) {
  let isolates = view.state.facet(bidiIsolatedRanges);
  if (!isolates.length)
    return isolates;
  let sets = isolates.map((i2) => i2 instanceof Function ? i2(view) : i2);
  let result = [];
  RangeSet.spans(sets, line.from, line.to, {
    point() {
    },
    span(fromDoc, toDoc, active, open2) {
      let from = fromDoc - line.from, to = toDoc - line.from;
      let level = result;
      for (let i2 = active.length - 1; i2 >= 0; i2--, open2--) {
        let direction = active[i2].spec.bidiIsolate, update;
        if (open2 > 0 && level.length && (update = level[level.length - 1]).to == from && update.direction == direction) {
          update.to = to;
          level = update.inner;
        } else {
          let add2 = { from, to, direction, inner: [] };
          level.push(add2);
          level = add2.inner;
        }
      }
    }
  });
  return resolveIsolates(line.text, result);
}
function resolveIsolates(text, isolates) {
  for (let i2 of isolates) {
    if (i2.direction == null) {
      for (let pos = i2.from, j = 0; pos < i2.to; j++) {
        let nextInner = j < i2.inner.length ? i2.inner[j] : null;
        let dir = autoDirection(text, pos, nextInner ? nextInner.from : i2.to);
        if (dir) {
          i2.direction = dir;
          break;
        }
        if (!nextInner)
          break;
        pos = nextInner.to;
      }
      if (i2.direction == null)
        i2.direction = Direction.LTR;
    }
    resolveIsolates(text, i2.inner);
  }
  return isolates;
}
const scrollMargins = /* @__PURE__ */ Facet.define();
function getScrollMargins(view) {
  let left = 0, right = 0, top2 = 0, bottom = 0;
  for (let source of view.state.facet(scrollMargins)) {
    let m = source(view);
    if (m) {
      if (m.left != null)
        left = Math.max(left, m.left);
      if (m.right != null)
        right = Math.max(right, m.right);
      if (m.top != null)
        top2 = Math.max(top2, m.top);
      if (m.bottom != null)
        bottom = Math.max(bottom, m.bottom);
    }
  }
  return { left, right, top: top2, bottom };
}
const styleModule = /* @__PURE__ */ Facet.define();
class ChangedRange {
  constructor(fromA, toA, fromB, toB) {
    this.fromA = fromA;
    this.toA = toA;
    this.fromB = fromB;
    this.toB = toB;
  }
  join(other) {
    return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
  }
  addToSet(set) {
    let i2 = set.length, me = this;
    for (; i2 > 0; i2--) {
      let range = set[i2 - 1];
      if (range.fromA > me.toA)
        continue;
      if (range.toA < me.fromA)
        break;
      me = me.join(range);
      set.splice(i2 - 1, 1);
    }
    set.splice(i2, 0, me);
    return set;
  }
  // Extend a set to cover all the content in `ranges`, which is a
  // flat array with each pair of numbers representing fromB/toB
  // positions. These pairs are generated in unchanged ranges, so the
  // offset between doc A and doc B is the same for their start and
  // end points.
  static extendWithRanges(diff, ranges) {
    if (ranges.length == 0)
      return diff;
    let result = [];
    for (let dI = 0, rI = 0, off = 0; ; ) {
      let nextD = dI < diff.length ? diff[dI].fromB : 1e9;
      let nextR = rI < ranges.length ? ranges[rI] : 1e9;
      let fromB = Math.min(nextD, nextR);
      if (fromB == 1e9)
        break;
      let fromA = fromB + off, toB = fromB, toA = fromA;
      for (; ; ) {
        if (rI < ranges.length && ranges[rI] <= toB) {
          let end = ranges[rI + 1];
          rI += 2;
          toB = Math.max(toB, end);
          for (let i2 = dI; i2 < diff.length && diff[i2].fromB <= toB; i2++)
            off = diff[i2].toA - diff[i2].toB;
          toA = Math.max(toA, end + off);
        } else if (dI < diff.length && diff[dI].fromB <= toB) {
          let next = diff[dI++];
          toB = Math.max(toB, next.toB);
          toA = Math.max(toA, next.toA);
          off = next.toA - next.toB;
        } else {
          break;
        }
      }
      result.push(new ChangedRange(fromA, toA, fromB, toB));
    }
    return result;
  }
}
class ViewUpdate {
  constructor(view, state2, transactions) {
    this.view = view;
    this.state = state2;
    this.transactions = transactions;
    this.flags = 0;
    this.startState = view.state;
    this.changes = ChangeSet.empty(this.startState.doc.length);
    for (let tr of transactions)
      this.changes = this.changes.compose(tr.changes);
    let changedRanges = [];
    this.changes.iterChangedRanges((fromA, toA, fromB, toB) => changedRanges.push(new ChangedRange(fromA, toA, fromB, toB)));
    this.changedRanges = changedRanges;
  }
  /**
  @internal
  */
  static create(view, state2, transactions) {
    return new ViewUpdate(view, state2, transactions);
  }
  /**
  Tells you whether the [viewport](https://codemirror.net/6/docs/ref/#view.EditorView.viewport) or
  [visible ranges](https://codemirror.net/6/docs/ref/#view.EditorView.visibleRanges) changed in this
  update.
  */
  get viewportChanged() {
    return (this.flags & 4) > 0;
  }
  /**
  Returns true when
  [`viewportChanged`](https://codemirror.net/6/docs/ref/#view.ViewUpdate.viewportChanged) is true
  and the viewport change is not just the result of mapping it in
  response to document changes.
  */
  get viewportMoved() {
    return (this.flags & 8) > 0;
  }
  /**
  Indicates whether the height of a block element in the editor
  changed in this update.
  */
  get heightChanged() {
    return (this.flags & 2) > 0;
  }
  /**
  Returns true when the document was modified or the size of the
  editor, or elements within the editor, changed.
  */
  get geometryChanged() {
    return this.docChanged || (this.flags & (16 | 2)) > 0;
  }
  /**
  True when this update indicates a focus change.
  */
  get focusChanged() {
    return (this.flags & 1) > 0;
  }
  /**
  Whether the document changed in this update.
  */
  get docChanged() {
    return !this.changes.empty;
  }
  /**
  Whether the selection was explicitly set in this update.
  */
  get selectionSet() {
    return this.transactions.some((tr) => tr.selection);
  }
  /**
  @internal
  */
  get empty() {
    return this.flags == 0 && this.transactions.length == 0;
  }
}
const noChildren = [];
class Tile {
  constructor(dom, length, flags = 0) {
    this.dom = dom;
    this.length = length;
    this.flags = flags;
    this.parent = null;
    dom.cmTile = this;
  }
  get breakAfter() {
    return this.flags & 1;
  }
  get children() {
    return noChildren;
  }
  isWidget() {
    return false;
  }
  get isHidden() {
    return false;
  }
  isComposite() {
    return false;
  }
  isLine() {
    return false;
  }
  isText() {
    return false;
  }
  isBlock() {
    return false;
  }
  get domAttrs() {
    return null;
  }
  sync(track) {
    this.flags |= 2;
    if (this.flags & 4) {
      this.flags &= -5;
      let attrs = this.domAttrs;
      if (attrs)
        setAttrs(this.dom, attrs);
    }
  }
  toString() {
    return this.constructor.name + (this.children.length ? `(${this.children})` : "") + (this.breakAfter ? "#" : "");
  }
  destroy() {
    this.parent = null;
  }
  setDOM(dom) {
    this.dom = dom;
    dom.cmTile = this;
  }
  get posAtStart() {
    return this.parent ? this.parent.posBefore(this) : 0;
  }
  get posAtEnd() {
    return this.posAtStart + this.length;
  }
  posBefore(tile, start = this.posAtStart) {
    let pos = start;
    for (let child of this.children) {
      if (child == tile)
        return pos;
      pos += child.length + child.breakAfter;
    }
    throw new RangeError("Invalid child in posBefore");
  }
  posAfter(tile) {
    return this.posBefore(tile) + tile.length;
  }
  covers(side) {
    return true;
  }
  coordsIn(pos, side, rtl) {
    return null;
  }
  domPosFor(off, side) {
    let index = domIndex(this.dom);
    let after = this.length ? off > 0 : side > 0;
    return new DOMPos(this.parent.dom, index + (after ? 1 : 0), off == 0 || off == this.length);
  }
  markDirty(attrs) {
    this.flags &= -3;
    if (attrs)
      this.flags |= 4;
    if (this.parent && this.parent.flags & 2)
      this.parent.markDirty(false);
  }
  get overrideDOMText() {
    return null;
  }
  get root() {
    for (let t2 = this; t2; t2 = t2.parent)
      if (t2 instanceof DocTile)
        return t2;
    return null;
  }
  static get(dom) {
    return dom.cmTile;
  }
}
class CompositeTile extends Tile {
  constructor(dom) {
    super(dom, 0);
    this._children = [];
  }
  isComposite() {
    return true;
  }
  get children() {
    return this._children;
  }
  get lastChild() {
    return this.children.length ? this.children[this.children.length - 1] : null;
  }
  append(child) {
    this.children.push(child);
    child.parent = this;
  }
  sync(track) {
    if (this.flags & 2)
      return;
    super.sync(track);
    let parent = this.dom, prev = null, next;
    let tracking = (track === null || track === void 0 ? void 0 : track.node) == parent ? track : null;
    let length = 0;
    for (let child of this.children) {
      child.sync(track);
      length += child.length + child.breakAfter;
      next = prev ? prev.nextSibling : parent.firstChild;
      if (tracking && next != child.dom)
        tracking.written = true;
      if (child.dom.parentNode == parent) {
        while (next && next != child.dom)
          next = rm$1(next);
      } else {
        parent.insertBefore(child.dom, next);
      }
      prev = child.dom;
    }
    next = prev ? prev.nextSibling : parent.firstChild;
    if (tracking && next)
      tracking.written = true;
    while (next)
      next = rm$1(next);
    this.length = length;
  }
}
function rm$1(dom) {
  let next = dom.nextSibling;
  dom.parentNode.removeChild(dom);
  return next;
}
class DocTile extends CompositeTile {
  constructor(view, dom) {
    super(dom);
    this.view = view;
  }
  owns(tile) {
    for (; tile; tile = tile.parent)
      if (tile == this)
        return true;
    return false;
  }
  isBlock() {
    return true;
  }
  nearest(dom) {
    for (; ; ) {
      if (!dom)
        return null;
      let tile = Tile.get(dom);
      if (tile && this.owns(tile))
        return tile;
      dom = dom.parentNode;
    }
  }
  blockTiles(f) {
    for (let stack = [], cur2 = this, i2 = 0, pos = 0; ; ) {
      if (i2 == cur2.children.length) {
        if (!stack.length)
          return;
        cur2 = cur2.parent;
        if (cur2.breakAfter)
          pos++;
        i2 = stack.pop();
      } else {
        let next = cur2.children[i2++];
        if (next instanceof BlockWrapperTile) {
          stack.push(i2);
          cur2 = next;
          i2 = 0;
        } else {
          let end = pos + next.length;
          let result = f(next, pos);
          if (result !== void 0)
            return result;
          pos = end + next.breakAfter;
        }
      }
    }
  }
  // Find the block at the given position. If side < -1, make sure to
  // stay before block widgets at that position, if side > 1, after
  // such widgets (used for selection drawing, which needs to be able
  // to get coordinates for positions that aren't valid cursor positions).
  resolveBlock(pos, side) {
    let before, beforeOff = -1, after, afterOff = -1;
    this.blockTiles((tile, off) => {
      let end = off + tile.length;
      if (pos >= off && pos <= end) {
        if (tile.isWidget() && side >= -1 && side <= 1) {
          if (tile.flags & 32)
            return true;
          if (tile.flags & 16)
            before = void 0;
        }
        if ((off < pos || pos == end && (side < -1 ? tile.length : tile.covers(1))) && (!before || !tile.isWidget() && before.isWidget())) {
          before = tile;
          beforeOff = pos - off;
        }
        if ((end > pos || pos == off && (side > 1 ? tile.length : tile.covers(-1))) && (!after || !tile.isWidget() && after.isWidget())) {
          after = tile;
          afterOff = pos - off;
        }
      }
    });
    if (!before && !after)
      throw new Error("No tile at position " + pos);
    return before && side < 0 || !after ? { tile: before, offset: beforeOff } : { tile: after, offset: afterOff };
  }
}
class BlockWrapperTile extends CompositeTile {
  constructor(dom, wrapper) {
    super(dom);
    this.wrapper = wrapper;
  }
  isBlock() {
    return true;
  }
  covers(side) {
    if (!this.children.length)
      return false;
    return side < 0 ? this.children[0].covers(-1) : this.lastChild.covers(1);
  }
  get domAttrs() {
    return this.wrapper.attributes;
  }
  static of(wrapper, dom) {
    let tile = new BlockWrapperTile(dom || document.createElement(wrapper.tagName), wrapper);
    if (!dom)
      tile.flags |= 4;
    return tile;
  }
}
class LineTile extends CompositeTile {
  constructor(dom, attrs) {
    super(dom);
    this.attrs = attrs;
  }
  isLine() {
    return true;
  }
  static start(attrs, dom, keepAttrs) {
    let line = new LineTile(dom || document.createElement("div"), attrs);
    if (!dom || !keepAttrs)
      line.flags |= 4;
    return line;
  }
  get domAttrs() {
    return this.attrs;
  }
  // Find the tile associated with a given position in this line.
  // Side -2/2 is handled specially, in that it allows the position
  // returned to be before (-2) or after (2) widgets that would always
  // be after/before a cursor position.
  resolveInline(pos, side, forCoords = false) {
    let before = null, beforeOff = -1, after = null, afterOff = -1;
    function scan(tile, pos2) {
      for (let i2 = 0, off = 0; i2 < tile.children.length && off <= pos2; i2++) {
        let child = tile.children[i2], end = off + child.length;
        if (end >= pos2) {
          if (child.isComposite()) {
            scan(child, pos2 - off);
          } else if ((!after || forCoords && after.isHidden && (side > 0 && !(after.flags & 32) || forCoords && onSameLine(after, child))) && (end > pos2 || child.flags & 32 && side <= 1)) {
            after = child;
            afterOff = pos2 - off;
          } else if (off < pos2 || child.flags & 16 && !(forCoords && child.isHidden) && side >= -1) {
            before = child;
            beforeOff = pos2 - off;
          }
        }
        off = end;
      }
    }
    scan(this, pos);
    let target = (side < 0 ? before : after) || before || after;
    return target ? { tile: target, offset: target == before ? beforeOff : afterOff } : null;
  }
  coordsIn(pos, side, rtl) {
    let found = this.resolveInline(pos, side, true);
    if (!found)
      return fallbackRect(this);
    return found.tile.coordsIn(Math.max(0, found.offset), side, rtl);
  }
  domIn(pos, side) {
    let found = this.resolveInline(pos, side);
    if (found) {
      let { tile, offset } = found;
      if (this.dom.contains(tile.dom)) {
        if (tile.isText())
          return new DOMPos(tile.dom, Math.min(tile.dom.nodeValue.length, offset));
        return tile.domPosFor(offset, tile.flags & 16 ? 1 : tile.flags & 32 ? -1 : side);
      }
      let parent = found.tile.parent, saw = false;
      for (let ch of parent.children) {
        if (saw)
          return new DOMPos(ch.dom, 0);
        if (ch == found.tile) {
          saw = true;
        }
      }
    }
    return new DOMPos(this.dom, 0);
  }
}
function fallbackRect(tile) {
  let last2 = tile.dom.lastChild;
  if (!last2)
    return tile.dom.getBoundingClientRect();
  let rects = clientRectsFor(last2);
  return rects[rects.length - 1] || null;
}
function onSameLine(a, b) {
  let posA = a.coordsIn(0, 1), posB = b.coordsIn(0, 1);
  return posA && posB && posB.top < posA.bottom;
}
class MarkTile extends CompositeTile {
  constructor(dom, mark) {
    super(dom);
    this.mark = mark;
  }
  get domAttrs() {
    return this.mark.attrs;
  }
  static of(mark, dom) {
    let tile = new MarkTile(dom || document.createElement(mark.tagName), mark);
    if (!dom)
      tile.flags |= 4;
    return tile;
  }
}
class TextTile extends Tile {
  constructor(dom, text) {
    super(dom, text.length);
    this.text = text;
  }
  sync(track) {
    if (this.flags & 2)
      return;
    super.sync(track);
    if (this.dom.nodeValue != this.text) {
      if (track && track.node == this.dom)
        track.written = true;
      this.dom.nodeValue = this.text;
    }
  }
  isText() {
    return true;
  }
  toString() {
    return JSON.stringify(this.text);
  }
  coordsIn(pos, side, rtl) {
    let length = this.dom.nodeValue.length;
    if (pos > length)
      pos = length;
    let from = pos, to = pos, flatten2 = 0;
    if (pos == 0 && side < 0 || pos == length && side >= 0) {
      if (!(browser.chrome || browser.gecko)) {
        if (pos) {
          from--;
          flatten2 = 1;
        } else if (to < length) {
          to++;
          flatten2 = -1;
        }
      }
    } else {
      if (side < 0)
        from--;
      else if (to < length)
        to++;
    }
    let rects = textRange(this.dom, from, to).getClientRects();
    if (!rects.length)
      return null;
    let rect = rects[(flatten2 ? flatten2 < 0 : side >= 0) ? 0 : rects.length - 1];
    if (browser.safari && !flatten2 && rect.width == 0)
      rect = Array.prototype.find.call(rects, (r) => r.width) || rect;
    return rtl == null ? rect : flattenRect(rect, (flatten2 ? flatten2 > 0 : side < 0) == rtl);
  }
  static of(text, dom) {
    let tile = new TextTile(dom || document.createTextNode(text), text);
    if (!dom)
      tile.flags |= 2;
    return tile;
  }
}
class WidgetTile extends Tile {
  constructor(dom, length, widget, flags) {
    super(dom, length, flags);
    this.widget = widget;
  }
  isWidget() {
    return true;
  }
  get isHidden() {
    return this.widget.isHidden;
  }
  covers(side) {
    if (this.flags & 48)
      return false;
    return (this.flags & (side < 0 ? 64 : 128)) > 0;
  }
  coordsIn(pos, side) {
    return this.coordsInWidget(pos, side, false);
  }
  coordsInWidget(pos, side, block) {
    let custom = this.widget.coordsAt(this.dom, pos, side);
    if (custom)
      return custom;
    if (block) {
      return flattenRect(this.dom.getBoundingClientRect(), this.length ? pos == 0 : side <= 0);
    } else {
      let rects = this.dom.getClientRects(), rect = null;
      if (!rects.length)
        return null;
      let fromBack = this.flags & 16 ? true : this.flags & 32 ? false : pos > 0;
      for (let i2 = fromBack ? rects.length - 1 : 0; ; i2 += fromBack ? -1 : 1) {
        rect = rects[i2];
        if (pos > 0 ? i2 == 0 : i2 == rects.length - 1 || rect.top < rect.bottom)
          break;
      }
      return flattenRect(rect, !fromBack);
    }
  }
  get overrideDOMText() {
    if (!this.length)
      return Text.empty;
    let { root } = this;
    if (!root)
      return Text.empty;
    let start = this.posAtStart;
    return root.view.state.doc.slice(start, start + this.length);
  }
  destroy() {
    super.destroy();
    this.widget.destroy(this.dom);
  }
  static of(widget, view, length, flags, dom) {
    if (!dom) {
      dom = widget.toDOM(view);
      if (!widget.editable)
        dom.contentEditable = "false";
    }
    return new WidgetTile(dom, length, widget, flags);
  }
}
class WidgetBufferTile extends Tile {
  constructor(flags) {
    let img = document.createElement("img");
    img.className = "cm-widgetBuffer";
    img.setAttribute("aria-hidden", "true");
    super(img, 0, flags);
  }
  get isHidden() {
    return true;
  }
  get overrideDOMText() {
    return Text.empty;
  }
  coordsIn(pos, side, rtl) {
    let rect = this.dom.getBoundingClientRect();
    return rtl == null ? rect : flattenRect(rect, side > 0 == rtl);
  }
}
class TilePointer {
  constructor(top2) {
    this.index = 0;
    this.beforeBreak = false;
    this.parents = [];
    this.tile = top2;
  }
  // Advance by the given distance. If side is -1, stop leaving or
  // entering tiles, or skipping zero-length tiles, once the distance
  // has been traversed. When side is 1, leave, enter, or skip
  // everything at the end position.
  advance(dist2, side, walker) {
    let { tile, index, beforeBreak, parents } = this;
    while (dist2 || side > 0) {
      if (!tile.isComposite()) {
        let len = tile.length;
        if (index < len && dist2) {
          let take = Math.min(dist2, len - index);
          if (walker)
            walker.skip(tile, index, index + take);
          dist2 -= take;
          index += take;
        }
        if (index == len) {
          beforeBreak = !!tile.breakAfter;
          ({ tile, index } = parents.pop());
          index++;
        } else if (!dist2) {
          break;
        }
      } else if (beforeBreak) {
        if (!dist2)
          break;
        if (walker)
          walker.break();
        dist2--;
        beforeBreak = false;
      } else if (index == tile.children.length) {
        if (!dist2 && !parents.length)
          break;
        if (walker)
          walker.leave(tile);
        beforeBreak = !!tile.breakAfter;
        ({ tile, index } = parents.pop());
        index++;
      } else {
        let next = tile.children[index], brk = next.breakAfter;
        if ((side > 0 ? next.length <= dist2 : next.length < dist2) && (!walker || walker.skip(next, 0, next.length) !== false || !next.isComposite)) {
          beforeBreak = !!brk;
          index++;
          dist2 -= next.length;
        } else {
          parents.push({ tile, index });
          tile = next;
          index = 0;
          if (walker && next.isComposite())
            walker.enter(next);
        }
      }
    }
    this.tile = tile;
    this.index = index;
    this.beforeBreak = beforeBreak;
    return this;
  }
  get root() {
    return this.parents.length ? this.parents[0].tile : this.tile;
  }
}
class OpenWrapper {
  constructor(from, to, wrapper, rank) {
    this.from = from;
    this.to = to;
    this.wrapper = wrapper;
    this.rank = rank;
  }
}
class TileBuilder {
  constructor(cache, root, blockWrappers2) {
    this.cache = cache;
    this.root = root;
    this.blockWrappers = blockWrappers2;
    this.curLine = null;
    this.lastBlock = null;
    this.afterWidget = null;
    this.pos = 0;
    this.wrappers = [];
    this.wrapperPos = 0;
  }
  addText(text, marks, openStart, tile) {
    var _a2;
    this.flushBuffer();
    let parent = this.ensureMarks(marks, openStart);
    let prev = parent.lastChild;
    if (prev && prev.isText() && !(prev.flags & 8) && prev.length + text.length < 512) {
      this.cache.reused.set(
        prev,
        2
        /* Reused.DOM */
      );
      let tile2 = parent.children[parent.children.length - 1] = new TextTile(prev.dom, prev.text + text);
      tile2.parent = parent;
    } else {
      parent.append(tile || TextTile.of(text, (_a2 = this.cache.find(TextTile)) === null || _a2 === void 0 ? void 0 : _a2.dom));
    }
    this.pos += text.length;
    this.afterWidget = null;
  }
  addComposition(composition, context) {
    let line = this.curLine;
    if (line.dom != context.line.dom) {
      line.setDOM(this.cache.reused.has(context.line) ? freeNode(context.line.dom) : context.line.dom);
      this.cache.reused.set(
        context.line,
        2
        /* Reused.DOM */
      );
    }
    let head = line;
    for (let i2 = context.marks.length - 1; i2 >= 0; i2--) {
      let mark = context.marks[i2];
      let last2 = head.lastChild;
      if (last2 instanceof MarkTile && last2.mark.eq(mark.mark)) {
        if (last2.dom != mark.dom)
          last2.setDOM(freeNode(mark.dom));
        head = last2;
      } else {
        let { dom } = mark;
        if (this.cache.reused.get(mark)) {
          let tile = Tile.get(mark.dom);
          if (tile)
            dom = freeNode(mark.dom);
        }
        let nw = MarkTile.of(mark.mark, dom);
        head.append(nw);
        head = nw;
      }
      this.cache.reused.set(
        mark,
        2
        /* Reused.DOM */
      );
    }
    let oldTile = Tile.get(composition.text);
    if (oldTile)
      this.cache.reused.set(
        oldTile,
        2
        /* Reused.DOM */
      );
    let text = new TextTile(composition.text, composition.text.nodeValue);
    text.flags |= 8;
    this.pos = composition.range.toB;
    head.append(text);
  }
  addInlineWidget(widget, marks, openStart) {
    let noSpace = this.afterWidget && widget.flags & 48 && (this.afterWidget.flags & 48) == (widget.flags & 48);
    if (!noSpace)
      this.flushBuffer();
    let parent = this.ensureMarks(marks, openStart);
    if (!noSpace && !(widget.flags & 16))
      parent.append(this.getBuffer(1));
    parent.append(widget);
    this.pos += widget.length;
    this.afterWidget = widget;
  }
  addMark(tile, marks, openStart) {
    this.flushBuffer();
    let parent = this.ensureMarks(marks, openStart);
    parent.append(tile);
    this.pos += tile.length;
    this.afterWidget = null;
  }
  addBlockWidget(widget) {
    this.getBlockPos().append(widget);
    this.pos += widget.length;
    this.lastBlock = widget;
    this.endLine();
  }
  continueWidget(length) {
    let widget = this.afterWidget || this.lastBlock;
    widget.length += length;
    this.pos += length;
  }
  addLineStart(attrs, dom) {
    var _a2;
    if (!attrs)
      attrs = lineBaseAttrs;
    let tile = LineTile.start(attrs, dom || ((_a2 = this.cache.find(LineTile)) === null || _a2 === void 0 ? void 0 : _a2.dom), !!dom);
    this.getBlockPos().append(this.lastBlock = this.curLine = tile);
  }
  addLine(tile) {
    this.getBlockPos().append(tile);
    this.pos += tile.length;
    this.lastBlock = tile;
    this.endLine();
  }
  addBreak() {
    this.lastBlock.flags |= 1;
    this.endLine();
    this.pos++;
  }
  addLineStartIfNotCovered(attrs) {
    if (!this.blockPosCovered())
      this.addLineStart(attrs);
  }
  ensureLine(attrs) {
    if (!this.curLine)
      this.addLineStart(attrs);
  }
  ensureMarks(marks, openStart) {
    var _a2;
    let parent = this.curLine;
    for (let i2 = marks.length - 1; i2 >= 0; i2--) {
      let mark = marks[i2], last2;
      if (openStart > 0 && (last2 = parent.lastChild) && last2 instanceof MarkTile && last2.mark.eq(mark)) {
        parent = last2;
        openStart--;
      } else {
        let tile = MarkTile.of(mark, (_a2 = this.cache.find(MarkTile, (m) => m.mark.eq(mark))) === null || _a2 === void 0 ? void 0 : _a2.dom);
        parent.append(tile);
        parent = tile;
        openStart = 0;
      }
    }
    return parent;
  }
  endLine() {
    if (this.curLine) {
      this.flushBuffer();
      let last2 = this.curLine.lastChild;
      if (!last2 || !hasContent(this.curLine, false) || last2.dom.nodeName != "BR" && last2.isWidget() && !(browser.ios && hasContent(this.curLine, true)))
        this.curLine.append(this.cache.findWidget(
          BreakWidget,
          0,
          32
          /* TileFlag.After */
        ) || new WidgetTile(
          BreakWidget.toDOM(),
          0,
          BreakWidget,
          32
          /* TileFlag.After */
        ));
      this.curLine = this.afterWidget = null;
    }
  }
  updateBlockWrappers() {
    if (this.wrapperPos > this.pos + 1e4) {
      this.blockWrappers.goto(this.pos);
      this.wrappers.length = 0;
    }
    for (let i2 = this.wrappers.length - 1; i2 >= 0; i2--)
      if (this.wrappers[i2].to < this.pos)
        this.wrappers.splice(i2, 1);
    for (let cur2 = this.blockWrappers; cur2.value && cur2.from <= this.pos; cur2.next())
      if (cur2.to >= this.pos) {
        let rank = cur2.rank * 102 + cur2.value.rank;
        let wrap = new OpenWrapper(cur2.from, cur2.to, cur2.value, rank), i2 = this.wrappers.length;
        while (i2 > 0 && (this.wrappers[i2 - 1].rank - wrap.rank || this.wrappers[i2 - 1].to - wrap.to) < 0)
          i2--;
        this.wrappers.splice(i2, 0, wrap);
      }
    this.wrapperPos = this.pos;
  }
  getBlockPos() {
    var _a2;
    this.updateBlockWrappers();
    let parent = this.root;
    for (let wrap of this.wrappers) {
      let last2 = parent.lastChild;
      if (wrap.from < this.pos && last2 instanceof BlockWrapperTile && last2.wrapper.eq(wrap.wrapper)) {
        parent = last2;
      } else {
        let tile = BlockWrapperTile.of(wrap.wrapper, (_a2 = this.cache.find(BlockWrapperTile, (t2) => t2.wrapper.eq(wrap.wrapper))) === null || _a2 === void 0 ? void 0 : _a2.dom);
        parent.append(tile);
        parent = tile;
      }
    }
    return parent;
  }
  blockPosCovered() {
    let last2 = this.lastBlock;
    return last2 != null && !last2.breakAfter && (!last2.isWidget() || (last2.flags & (32 | 128)) > 0);
  }
  getBuffer(side) {
    let flags = 2 | (side < 0 ? 16 : 32);
    let found = this.cache.find(
      WidgetBufferTile,
      void 0,
      1
      /* Reused.Full */
    );
    if (found)
      found.flags = flags;
    return found || new WidgetBufferTile(flags);
  }
  flushBuffer() {
    if (this.afterWidget && !(this.afterWidget.flags & 32)) {
      this.afterWidget.parent.append(this.getBuffer(-1));
      this.afterWidget = null;
    }
  }
}
class TextStream {
  constructor(doc2) {
    this.skipCount = 0;
    this.text = "";
    this.textOff = 0;
    this.cursor = doc2.iter();
  }
  skip(len) {
    if (this.textOff + len <= this.text.length) {
      this.textOff += len;
    } else {
      this.skipCount += len - (this.text.length - this.textOff);
      this.text = "";
      this.textOff = 0;
    }
  }
  next(maxLen) {
    if (this.textOff == this.text.length) {
      let { value, lineBreak, done } = this.cursor.next(this.skipCount);
      this.skipCount = 0;
      if (done)
        throw new Error("Ran out of text content when drawing inline views");
      this.text = value;
      let len = this.textOff = Math.min(maxLen, value.length);
      return lineBreak ? null : value.slice(0, len);
    }
    let end = Math.min(this.text.length, this.textOff + maxLen);
    let chars = this.text.slice(this.textOff, end);
    this.textOff = end;
    return chars;
  }
}
const buckets = [WidgetTile, LineTile, TextTile, MarkTile, WidgetBufferTile, BlockWrapperTile, DocTile];
for (let i2 = 0; i2 < buckets.length; i2++)
  buckets[i2].bucket = i2;
class TileCache {
  constructor(view) {
    this.view = view;
    this.buckets = buckets.map(() => []);
    this.index = buckets.map(() => 0);
    this.reused = /* @__PURE__ */ new Map();
  }
  // Put a tile in the cache.
  add(tile) {
    let i2 = tile.constructor.bucket, bucket = this.buckets[i2];
    if (bucket.length < 6)
      bucket.push(tile);
    else
      bucket[
        this.index[i2] = (this.index[i2] + 1) % 6
        /* C.Bucket */
      ] = tile;
  }
  find(cls, test, type = 2) {
    let i2 = cls.bucket;
    let bucket = this.buckets[i2], off = this.index[i2];
    for (let j = 0; j < bucket.length; j++) {
      let index = (j + off) % bucket.length, tile = bucket[index];
      if ((!test || test(tile)) && !this.reused.has(tile)) {
        bucket.splice(index, 1);
        if (index < off)
          this.index[i2]--;
        this.reused.set(tile, type);
        return tile;
      }
    }
    return null;
  }
  findWidget(widget, length, flags) {
    let widgets = this.buckets[0];
    if (widgets.length)
      for (let i2 = 0, pass = 0; ; i2++) {
        if (i2 == widgets.length) {
          if (pass)
            return null;
          pass = 1;
          i2 = 0;
        }
        let tile = widgets[i2];
        if (!this.reused.has(tile) && (pass == 0 ? tile.widget.compare(widget) : tile.widget.constructor == widget.constructor && widget.updateDOM(tile.dom, this.view, tile.widget))) {
          widgets.splice(i2, 1);
          if (i2 < this.index[0])
            this.index[0]--;
          if (tile.widget == widget && tile.length == length && (tile.flags & (496 | 1)) == flags) {
            this.reused.set(
              tile,
              1
              /* Reused.Full */
            );
            return tile;
          } else {
            this.reused.set(
              tile,
              2
              /* Reused.DOM */
            );
            return new WidgetTile(tile.dom, length, widget, tile.flags & -498 | flags);
          }
        }
      }
  }
  reuse(tile) {
    this.reused.set(
      tile,
      1
      /* Reused.Full */
    );
    return tile;
  }
  maybeReuse(tile, type = 2) {
    if (this.reused.has(tile))
      return void 0;
    this.reused.set(tile, type);
    return tile.dom;
  }
  clear() {
    for (let i2 = 0; i2 < this.buckets.length; i2++)
      this.buckets[i2].length = this.index[i2] = 0;
  }
}
class TileUpdate {
  constructor(view, old, blockWrappers2, decorations2, disallowBlockEffectsFor) {
    this.view = view;
    this.decorations = decorations2;
    this.disallowBlockEffectsFor = disallowBlockEffectsFor;
    this.openWidget = false;
    this.openMarks = 0;
    this.cache = new TileCache(view);
    this.text = new TextStream(view.state.doc);
    this.builder = new TileBuilder(this.cache, new DocTile(view, view.contentDOM), RangeSet.iter(blockWrappers2));
    this.cache.reused.set(
      old,
      2
      /* Reused.DOM */
    );
    this.old = new TilePointer(old);
    this.reuseWalker = {
      skip: (tile, from, to) => {
        this.cache.add(tile);
        if (tile.isComposite())
          return false;
      },
      enter: (tile) => this.cache.add(tile),
      leave: () => {
      },
      break: () => {
      }
    };
  }
  run(changes, composition) {
    let compositionContext = composition && this.getCompositionContext(composition.text);
    for (let posA = 0, posB = 0, i2 = 0; ; ) {
      let next = i2 < changes.length ? changes[i2++] : null;
      let skipA = next ? next.fromA : this.old.root.length;
      if (skipA > posA) {
        let len = skipA - posA;
        this.preserve(len, !i2, !next);
        posA = skipA;
        posB += len;
      }
      if (!next)
        break;
      if (composition && next.fromA <= composition.range.fromA && next.toA >= composition.range.toA) {
        this.forward(next.fromA, composition.range.fromA, composition.range.fromA < composition.range.toA ? 1 : -1);
        this.emit(posB, composition.range.fromB);
        this.builder.flushBuffer();
        this.cache.clear();
        this.builder.addComposition(composition, compositionContext);
        this.text.skip(composition.range.toB - composition.range.fromB);
        this.forward(composition.range.fromA, next.toA);
        this.emit(composition.range.toB, next.toB);
      } else {
        this.forward(next.fromA, next.toA);
        this.emit(posB, next.toB);
      }
      posB = next.toB;
      posA = next.toA;
    }
    if (this.builder.curLine)
      this.builder.endLine();
    return this.builder.root;
  }
  preserve(length, incStart, incEnd) {
    let activeMarks = getMarks(this.old), openMarks = this.openMarks;
    this.old.advance(length, incEnd ? 1 : -1, {
      skip: (tile, from, to) => {
        if (tile.isWidget()) {
          if (this.openWidget) {
            this.builder.continueWidget(to - from);
          } else {
            let widget = to > 0 || from < tile.length ? WidgetTile.of(tile.widget, this.view, to - from, tile.flags & 496, this.cache.maybeReuse(tile)) : this.cache.reuse(tile);
            if (widget.flags & 256) {
              widget.flags &= -2;
              this.builder.addBlockWidget(widget);
            } else {
              this.builder.ensureLine(null);
              this.builder.addInlineWidget(widget, activeMarks, openMarks);
              openMarks = activeMarks.length;
            }
          }
        } else if (tile.isText()) {
          this.builder.ensureLine(null);
          if (!from && to == tile.length && !this.cache.reused.has(tile)) {
            this.builder.addText(tile.text, activeMarks, openMarks, this.cache.reuse(tile));
          } else {
            this.cache.add(tile);
            this.builder.addText(tile.text.slice(from, to), activeMarks, openMarks);
          }
          openMarks = activeMarks.length;
        } else if (tile.isLine()) {
          tile.flags &= -2;
          this.cache.reused.set(
            tile,
            1
            /* Reused.Full */
          );
          this.builder.addLine(tile);
        } else if (tile instanceof WidgetBufferTile) {
          this.cache.add(tile);
        } else if (tile instanceof MarkTile) {
          this.builder.ensureLine(null);
          this.builder.addMark(tile, activeMarks, openMarks);
          this.cache.reused.set(
            tile,
            1
            /* Reused.Full */
          );
          openMarks = activeMarks.length;
        } else {
          return false;
        }
        this.openWidget = false;
      },
      enter: (tile) => {
        if (tile.isLine()) {
          this.builder.addLineStart(tile.attrs, this.cache.maybeReuse(tile));
        } else {
          this.cache.add(tile);
          if (tile instanceof MarkTile)
            activeMarks.unshift(tile.mark);
        }
        this.openWidget = false;
      },
      leave: (tile) => {
        if (tile.isLine()) {
          if (activeMarks.length)
            activeMarks.length = openMarks = 0;
        } else if (tile instanceof MarkTile) {
          activeMarks.shift();
          openMarks = Math.min(openMarks, activeMarks.length);
        }
      },
      break: () => {
        this.builder.addBreak();
        this.openWidget = false;
      }
    });
    this.text.skip(length);
  }
  emit(from, to) {
    let pendingLineAttrs = null;
    let b = this.builder, markCount = -1;
    let openEnd = RangeSet.spans(this.decorations, from, to, {
      point: (from2, to2, deco, active, openStart, index) => {
        if (deco instanceof PointDecoration) {
          if (this.disallowBlockEffectsFor[index]) {
            if (deco.block)
              throw new RangeError("Block decorations may not be specified via plugins");
            if (to2 > this.view.state.doc.lineAt(from2).to)
              throw new RangeError("Decorations that replace line breaks may not be specified via plugins");
          }
          markCount = active.length;
          if (openStart > active.length) {
            b.continueWidget(to2 - from2);
          } else {
            let widget = deco.widget || (deco.block ? NullWidget.block : NullWidget.inline);
            let flags = widgetFlags(deco);
            let tile = this.cache.findWidget(widget, to2 - from2, flags) || WidgetTile.of(widget, this.view, to2 - from2, flags);
            if (deco.block) {
              if (deco.startSide > 0)
                b.addLineStartIfNotCovered(pendingLineAttrs);
              b.addBlockWidget(tile);
            } else {
              b.ensureLine(pendingLineAttrs);
              b.addInlineWidget(tile, active, openStart);
            }
          }
          pendingLineAttrs = null;
        } else {
          pendingLineAttrs = addLineDeco(pendingLineAttrs, deco);
        }
        if (to2 > from2)
          this.text.skip(to2 - from2);
      },
      span: (from2, to2, active, openStart) => {
        for (let pos = from2; pos < to2; ) {
          let chars = this.text.next(Math.min(512, to2 - pos));
          if (chars == null) {
            b.addLineStartIfNotCovered(pendingLineAttrs);
            b.addBreak();
            pos++;
          } else {
            b.ensureLine(pendingLineAttrs);
            b.addText(chars, active, pos == from2 ? openStart : active.length);
            pos += chars.length;
          }
          pendingLineAttrs = null;
        }
        markCount = active.length;
      }
    });
    if (markCount > -1)
      this.openWidget = openEnd > markCount;
    if (!this.openWidget)
      b.addLineStartIfNotCovered(pendingLineAttrs);
    this.openMarks = openEnd;
  }
  forward(from, to, side = 1) {
    if (to - from <= 10) {
      this.old.advance(to - from, side, this.reuseWalker);
    } else {
      this.old.advance(5, -1, this.reuseWalker);
      this.old.advance(to - from - 10, -1);
      this.old.advance(5, side, this.reuseWalker);
    }
  }
  getCompositionContext(text) {
    let marks = [], line = null;
    for (let parent = text.parentNode; ; parent = parent.parentNode) {
      let tile = Tile.get(parent);
      if (parent == this.view.contentDOM)
        break;
      if (tile instanceof MarkTile)
        marks.push(tile);
      else if (tile === null || tile === void 0 ? void 0 : tile.isLine())
        line = tile;
      else if (tile instanceof BlockWrapperTile) ;
      else if (parent.nodeName == "DIV" && !line)
        line = new LineTile(parent, lineBaseAttrs);
      else if (!line)
        marks.push(MarkTile.of(new MarkDecoration({ tagName: parent.nodeName.toLowerCase(), attributes: getAttrs(parent) }), parent));
    }
    if (!line)
      return null;
    return { line, marks };
  }
}
function hasContent(tile, requireText) {
  let scan = (tile2) => {
    for (let ch of tile2.children)
      if ((requireText ? ch.isText() : ch.length) || scan(ch))
        return true;
    return false;
  };
  return scan(tile);
}
function widgetFlags(deco) {
  let flags = deco.isReplace ? (deco.startSide < 0 ? 64 : 0) | (deco.endSide > 0 ? 128 : 0) : deco.startSide > 0 ? 32 : 16;
  if (deco.block)
    flags |= 256;
  return flags;
}
const lineBaseAttrs = { class: "cm-line" };
function addLineDeco(value, deco) {
  let attrs = deco.spec.attributes, cls = deco.spec.class;
  if (!attrs && !cls)
    return value;
  if (!value)
    value = { class: "cm-line" };
  if (attrs)
    combineAttrs(attrs, value);
  if (cls)
    value.class += " " + cls;
  return value;
}
function getMarks(ptr) {
  let found = [];
  for (let i2 = ptr.parents.length; i2 > 1; i2--) {
    let tile = i2 == ptr.parents.length ? ptr.tile : ptr.parents[i2].tile;
    if (tile instanceof MarkTile)
      found.push(tile.mark);
  }
  return found;
}
function freeNode(node) {
  let tile = Tile.get(node);
  if (tile)
    tile.setDOM(node.cloneNode());
  return node;
}
class NullWidget extends WidgetType {
  constructor(tag) {
    super();
    this.tag = tag;
  }
  eq(other) {
    return other.tag == this.tag;
  }
  toDOM() {
    return document.createElement(this.tag);
  }
  updateDOM(elt) {
    return elt.nodeName.toLowerCase() == this.tag;
  }
  get isHidden() {
    return true;
  }
}
NullWidget.inline = /* @__PURE__ */ new NullWidget("span");
NullWidget.block = /* @__PURE__ */ new NullWidget("div");
const BreakWidget = /* @__PURE__ */ new class extends WidgetType {
  toDOM() {
    return document.createElement("br");
  }
  get isHidden() {
    return true;
  }
  get editable() {
    return true;
  }
}();
class DocView {
  constructor(view) {
    this.view = view;
    this.decorations = [];
    this.blockWrappers = [];
    this.dynamicDecorationMap = [false];
    this.domChanged = null;
    this.hasComposition = null;
    this.editContextFormatting = Decoration.none;
    this.lastCompositionAfterCursor = false;
    this.minWidth = 0;
    this.minWidthFrom = 0;
    this.minWidthTo = 0;
    this.impreciseAnchor = null;
    this.impreciseHead = null;
    this.forceSelection = false;
    this.lastUpdate = Date.now();
    this.updateDeco();
    this.tile = new DocTile(view, view.contentDOM);
    this.updateInner([new ChangedRange(0, 0, 0, view.state.doc.length)], null);
  }
  // Update the document view to a given state.
  update(update) {
    var _a2;
    let changedRanges = update.changedRanges;
    if (this.minWidth > 0 && changedRanges.length) {
      if (!changedRanges.every(({ fromA, toA }) => toA < this.minWidthFrom || fromA > this.minWidthTo)) {
        this.minWidth = this.minWidthFrom = this.minWidthTo = 0;
      } else {
        this.minWidthFrom = update.changes.mapPos(this.minWidthFrom, 1);
        this.minWidthTo = update.changes.mapPos(this.minWidthTo, 1);
      }
    }
    this.updateEditContextFormatting(update);
    let readCompositionAt = -1;
    if (this.view.inputState.composing >= 0 && !this.view.observer.editContext) {
      if ((_a2 = this.domChanged) === null || _a2 === void 0 ? void 0 : _a2.newSel)
        readCompositionAt = this.domChanged.newSel.head;
      else if (!touchesComposition(update.changes, this.hasComposition) && !update.selectionSet)
        readCompositionAt = update.state.selection.main.head;
    }
    let composition = readCompositionAt > -1 ? findCompositionRange(this.view, update.changes, readCompositionAt) : null;
    this.domChanged = null;
    if (this.hasComposition) {
      let { from, to } = this.hasComposition;
      changedRanges = new ChangedRange(from, to, update.changes.mapPos(from, -1), update.changes.mapPos(to, 1)).addToSet(changedRanges.slice());
    }
    this.hasComposition = composition ? { from: composition.range.fromB, to: composition.range.toB } : null;
    if ((browser.ie || browser.chrome) && !composition && update && update.state.doc.lines != update.startState.doc.lines)
      this.forceSelection = true;
    let prevDeco = this.decorations, prevWrappers = this.blockWrappers;
    this.updateDeco();
    let decoDiff = findChangedDeco(prevDeco, this.decorations, update.changes);
    if (decoDiff.length)
      changedRanges = ChangedRange.extendWithRanges(changedRanges, decoDiff);
    let blockDiff = findChangedWrappers(prevWrappers, this.blockWrappers, update.changes);
    if (blockDiff.length)
      changedRanges = ChangedRange.extendWithRanges(changedRanges, blockDiff);
    if (composition && !changedRanges.some((r) => r.fromA <= composition.range.fromA && r.toA >= composition.range.toA))
      changedRanges = composition.range.addToSet(changedRanges.slice());
    if (this.tile.flags & 2 && changedRanges.length == 0) {
      return false;
    } else {
      this.updateInner(changedRanges, composition);
      if (update.transactions.length)
        this.lastUpdate = Date.now();
      return true;
    }
  }
  // Used by update and the constructor do perform the actual DOM
  // update
  updateInner(changes, composition) {
    this.view.viewState.mustMeasureContent = true;
    let { observer } = this.view;
    observer.ignore(() => {
      if (composition || changes.length) {
        let oldTile = this.tile;
        let builder = new TileUpdate(this.view, oldTile, this.blockWrappers, this.decorations, this.dynamicDecorationMap);
        if (composition && Tile.get(composition.text))
          builder.cache.reused.set(
            Tile.get(composition.text),
            2
            /* Reused.DOM */
          );
        this.tile = builder.run(changes, composition);
        destroyDropped(oldTile, builder.cache.reused);
      }
      this.tile.dom.style.height = this.view.viewState.contentHeight / this.view.scaleY + "px";
      this.tile.dom.style.flexBasis = this.minWidth ? this.minWidth + "px" : "";
      let track = browser.chrome || browser.ios ? { node: observer.selectionRange.focusNode, written: false } : void 0;
      this.tile.sync(track);
      if (track && (track.written || observer.selectionRange.focusNode != track.node || !this.tile.dom.contains(track.node)))
        this.forceSelection = true;
      this.tile.dom.style.height = "";
    });
    let gaps = [];
    if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length) {
      for (let child of this.tile.children)
        if (child.isWidget() && child.widget instanceof BlockGapWidget)
          gaps.push(child.dom);
    }
    observer.updateGaps(gaps);
  }
  updateEditContextFormatting(update) {
    this.editContextFormatting = this.editContextFormatting.map(update.changes);
    for (let tr of update.transactions)
      for (let effect of tr.effects)
        if (effect.is(setEditContextFormatting)) {
          this.editContextFormatting = effect.value;
        }
  }
  // Sync the DOM selection to this.state.selection
  updateSelection(mustRead = false, fromPointer = false) {
    if (mustRead || !this.view.observer.selectionRange.focusNode)
      this.view.observer.readSelectionRange();
    let { dom } = this.tile;
    let activeElt = this.view.root.activeElement, focused = activeElt == dom;
    let selectionNotFocus = !focused && !(this.view.state.facet(editable) || dom.tabIndex > -1) && hasSelection(dom, this.view.observer.selectionRange) && !(activeElt && dom.contains(activeElt));
    if (!(focused || fromPointer || selectionNotFocus))
      return;
    let force = this.forceSelection;
    this.forceSelection = false;
    let main = this.view.state.selection.main, anchor, head;
    if (main.empty) {
      head = anchor = this.inlineDOMNearPos(main.anchor, main.assoc || 1);
    } else {
      head = this.inlineDOMNearPos(main.head, main.head == main.from ? 1 : -1);
      anchor = this.inlineDOMNearPos(main.anchor, main.anchor == main.from ? 1 : -1);
    }
    if (browser.gecko && main.empty && !this.hasComposition && betweenUneditable(anchor)) {
      let dummy = document.createTextNode("");
      this.view.observer.ignore(() => anchor.node.insertBefore(dummy, anchor.node.childNodes[anchor.offset] || null));
      anchor = head = new DOMPos(dummy, 0);
      force = true;
    }
    let domSel = this.view.observer.selectionRange;
    if (force || !domSel.focusNode || (!isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) || !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) && !this.suppressWidgetCursorChange(domSel, main)) {
      this.view.observer.ignore(() => {
        if (browser.android && browser.chrome && dom.contains(domSel.focusNode) && inUneditable(domSel.focusNode, dom)) {
          dom.blur();
          dom.focus({ preventScroll: true });
        }
        let rawSel = getSelection(this.view.root);
        if (!rawSel) ;
        else if (main.empty) {
          if (browser.gecko) {
            let nextTo = nextToUneditable(anchor.node, anchor.offset);
            if (nextTo && nextTo != (1 | 2)) {
              let text = (nextTo == 1 ? textNodeBefore : textNodeAfter)(anchor.node, anchor.offset);
              if (text)
                anchor = new DOMPos(text.node, text.offset);
            }
          }
          rawSel.collapse(anchor.node, anchor.offset);
          if (main.bidiLevel != null && rawSel.caretBidiLevel !== void 0)
            rawSel.caretBidiLevel = main.bidiLevel;
        } else if (rawSel.extend) {
          rawSel.collapse(anchor.node, anchor.offset);
          try {
            rawSel.extend(head.node, head.offset);
          } catch (_) {
          }
        } else {
          let range = document.createRange();
          if (main.anchor > main.head)
            [anchor, head] = [head, anchor];
          range.setEnd(head.node, head.offset);
          range.setStart(anchor.node, anchor.offset);
          rawSel.removeAllRanges();
          rawSel.addRange(range);
        }
        if (selectionNotFocus && this.view.root.activeElement == dom) {
          dom.blur();
          if (activeElt)
            activeElt.focus();
        }
      });
      this.view.observer.setSelectionRange(anchor, head);
    }
    this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
    this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
  }
  // If a zero-length widget is inserted next to the cursor during
  // composition, avoid moving it across it and disrupting the
  // composition.
  suppressWidgetCursorChange(sel, cursor2) {
    return this.hasComposition && cursor2.empty && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset) && this.posFromDOM(sel.focusNode, sel.focusOffset) == cursor2.head;
  }
  enforceCursorAssoc() {
    if (this.hasComposition)
      return;
    let { view } = this, cursor2 = view.state.selection.main;
    let sel = getSelection(view.root);
    let { anchorNode, anchorOffset } = view.observer.selectionRange;
    if (!sel || !cursor2.empty || !cursor2.assoc || !sel.modify)
      return;
    let line = this.lineAt(cursor2.head, cursor2.assoc);
    if (!line)
      return;
    let lineStart = line.posAtStart;
    if (cursor2.head == lineStart || cursor2.head == lineStart + line.length)
      return;
    let before = this.coordsAt(cursor2.head, -1), after = this.coordsAt(cursor2.head, 1);
    if (!before || !after || before.bottom > after.top)
      return;
    let dom = this.domAtPos(cursor2.head + cursor2.assoc, cursor2.assoc);
    sel.collapse(dom.node, dom.offset);
    sel.modify("move", cursor2.assoc < 0 ? "forward" : "backward", "lineboundary");
    view.observer.readSelectionRange();
    let newRange = view.observer.selectionRange;
    if (view.docView.posFromDOM(newRange.anchorNode, newRange.anchorOffset) != cursor2.from)
      sel.collapse(anchorNode, anchorOffset);
  }
  posFromDOM(node, offset) {
    let tile = this.tile.nearest(node);
    if (!tile)
      return this.tile.dom.compareDocumentPosition(node) & 2 ? 0 : this.view.state.doc.length;
    let start = tile.posAtStart;
    if (tile.isComposite()) {
      let after;
      if (node == tile.dom) {
        after = tile.dom.childNodes[offset];
      } else {
        let bias = maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
        for (; ; ) {
          let parent = node.parentNode;
          if (parent == tile.dom)
            break;
          if (bias == 0 && parent.firstChild != parent.lastChild) {
            if (node == parent.firstChild)
              bias = -1;
            else
              bias = 1;
          }
          node = parent;
        }
        if (bias < 0)
          after = node;
        else
          after = node.nextSibling;
      }
      if (after == tile.dom.firstChild)
        return start;
      while (after && !Tile.get(after))
        after = after.nextSibling;
      if (!after)
        return start + tile.length;
      for (let i2 = 0, pos = start; ; i2++) {
        let child = tile.children[i2];
        if (child.dom == after)
          return pos;
        pos += child.length + child.breakAfter;
      }
    } else if (tile.isText()) {
      return node == tile.dom ? start + offset : start + (offset ? tile.length : 0);
    } else {
      return start;
    }
  }
  domAtPos(pos, side) {
    let { tile, offset } = this.tile.resolveBlock(pos, side);
    if (tile.isWidget())
      return tile.domPosFor(offset, side);
    return tile.domIn(offset, side);
  }
  inlineDOMNearPos(pos, side) {
    let before, beforeOff = -1, beforeBad = false;
    let after, afterOff = -1, afterBad = false;
    this.tile.blockTiles((tile, off) => {
      if (tile.isWidget()) {
        if (tile.flags & 32 && off >= pos)
          return true;
        if (tile.flags & 16)
          beforeBad = true;
      } else {
        let end = off + tile.length;
        if (off <= pos) {
          before = tile;
          beforeOff = pos - off;
          beforeBad = end < pos;
        }
        if (end >= pos && !after) {
          after = tile;
          afterOff = pos - off;
          afterBad = off > pos;
        }
        if (off > pos && after)
          return true;
      }
    });
    if (!before && !after)
      return this.domAtPos(pos, side);
    if (beforeBad && after)
      before = null;
    else if (afterBad && before)
      after = null;
    return before && side < 0 || !after ? before.domIn(beforeOff, side) : after.domIn(afterOff, side);
  }
  // Get the coord of the element at the given side of the given
  // position. If rtl is given, flatten it using that text direction.
  coordsAt(pos, side, rtl) {
    let { tile, offset } = this.tile.resolveBlock(pos, side);
    if (tile.isWidget()) {
      if (tile.widget instanceof BlockGapWidget)
        return null;
      return tile.coordsInWidget(offset, side, true);
    }
    return tile.coordsIn(offset, side, rtl);
  }
  lineAt(pos, side) {
    let { tile } = this.tile.resolveBlock(pos, side);
    return tile.isLine() ? tile : null;
  }
  coordsForChar(pos) {
    let { tile, offset } = this.tile.resolveBlock(pos, 1);
    if (!tile.isLine())
      return null;
    function scan(tile2, offset2) {
      if (tile2.isComposite()) {
        for (let ch of tile2.children) {
          if (ch.length >= offset2) {
            let found = scan(ch, offset2);
            if (found)
              return found;
          }
          offset2 -= ch.length;
          if (offset2 < 0)
            break;
        }
      } else if (tile2.isText() && offset2 < tile2.length) {
        let end = findClusterBreak(tile2.text, offset2);
        if (end == offset2)
          return null;
        let rects = textRange(tile2.dom, offset2, end).getClientRects();
        for (let i2 = 0; i2 < rects.length; i2++) {
          let rect = rects[i2];
          if (i2 == rects.length - 1 || rect.top < rect.bottom && rect.left < rect.right)
            return rect;
        }
      }
      return null;
    }
    return scan(tile, offset);
  }
  measureVisibleLineHeights(viewport) {
    let result = [], { from, to } = viewport;
    let contentWidth = this.view.contentDOM.clientWidth;
    let isWider = contentWidth > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
    let widest = -1, ltr = this.view.textDirection == Direction.LTR;
    let spaceAbove = 0;
    let scan = (tile, pos, measureBounds) => {
      for (let i2 = 0; i2 < tile.children.length; i2++) {
        if (pos > to)
          break;
        let child = tile.children[i2], end = pos + child.length;
        let childRect = child.dom.getBoundingClientRect(), { height } = childRect;
        if (measureBounds && !i2)
          spaceAbove += childRect.top - measureBounds.top;
        if (child instanceof BlockWrapperTile) {
          if (end > from)
            scan(child, pos, childRect);
        } else if (pos >= from) {
          if (spaceAbove > 0)
            result.push(-spaceAbove);
          result.push(height + spaceAbove);
          spaceAbove = 0;
          if (isWider) {
            let last2 = child.dom.lastChild;
            let rects = last2 ? clientRectsFor(last2) : [];
            if (rects.length) {
              let rect = rects[rects.length - 1];
              let width = ltr ? rect.right - childRect.left : childRect.right - rect.left;
              if (width > widest) {
                widest = width;
                this.minWidth = contentWidth;
                this.minWidthFrom = pos;
                this.minWidthTo = end;
              }
            }
          }
        }
        if (measureBounds && i2 == tile.children.length - 1)
          spaceAbove += measureBounds.bottom - childRect.bottom;
        pos = end + child.breakAfter;
      }
    };
    scan(this.tile, 0, null);
    return result;
  }
  textDirectionAt(pos) {
    let { tile } = this.tile.resolveBlock(pos, 1);
    return getComputedStyle(tile.dom).direction == "rtl" ? Direction.RTL : Direction.LTR;
  }
  measureTextSize() {
    let lineMeasure = this.tile.blockTiles((tile) => {
      if (tile.isLine() && tile.children.length && tile.length <= 20) {
        let totalWidth = 0, textHeight2;
        for (let child of tile.children) {
          if (!child.isText() || /[^ -~]/.test(child.text))
            return void 0;
          let rects = clientRectsFor(child.dom);
          if (rects.length != 1)
            return void 0;
          totalWidth += rects[0].width;
          textHeight2 = rects[0].height;
        }
        if (totalWidth)
          return {
            lineHeight: tile.dom.getBoundingClientRect().height,
            charWidth: totalWidth / tile.length,
            textHeight: textHeight2
          };
      }
    });
    if (lineMeasure)
      return lineMeasure;
    let dummy = document.createElement("div"), lineHeight, charWidth, textHeight;
    dummy.className = "cm-line";
    dummy.style.width = "99999px";
    dummy.style.position = "absolute";
    dummy.textContent = "abc def ghi jkl mno pqr stu";
    this.view.observer.ignore(() => {
      this.tile.dom.appendChild(dummy);
      let rect = clientRectsFor(dummy.firstChild)[0];
      lineHeight = dummy.getBoundingClientRect().height;
      charWidth = rect && rect.width ? rect.width / 27 : 7;
      textHeight = rect && rect.height ? rect.height : lineHeight;
      dummy.remove();
    });
    return { lineHeight, charWidth, textHeight };
  }
  computeBlockGapDeco() {
    let deco = [], vs = this.view.viewState;
    for (let pos = 0, i2 = 0; ; i2++) {
      let next = i2 == vs.viewports.length ? null : vs.viewports[i2];
      let end = next ? next.from - 1 : this.view.state.doc.length;
      if (end > pos) {
        let height = (vs.lineBlockAt(end).bottom - vs.lineBlockAt(pos).top) / this.view.scaleY;
        deco.push(Decoration.replace({
          widget: new BlockGapWidget(height),
          block: true,
          inclusive: true,
          isBlockGap: true
        }).range(pos, end));
      }
      if (!next)
        break;
      pos = next.to + 1;
    }
    return Decoration.set(deco);
  }
  updateDeco() {
    let i2 = 1;
    let allDeco = this.view.state.facet(decorations).map((d) => {
      let dynamic = this.dynamicDecorationMap[i2++] = typeof d == "function";
      return dynamic ? d(this.view) : d;
    });
    let dynamicOuter = false, outerDeco = this.view.state.facet(outerDecorations).map((d, i3) => {
      let dynamic = typeof d == "function";
      if (dynamic)
        dynamicOuter = true;
      return dynamic ? d(this.view) : d;
    });
    if (outerDeco.length) {
      this.dynamicDecorationMap[i2++] = dynamicOuter;
      allDeco.push(RangeSet.join(outerDeco));
    }
    this.decorations = [
      this.editContextFormatting,
      ...allDeco,
      this.computeBlockGapDeco(),
      this.view.viewState.lineGapDeco
    ];
    while (i2 < this.decorations.length)
      this.dynamicDecorationMap[i2++] = false;
    this.blockWrappers = this.view.state.facet(blockWrappers).map((v) => typeof v == "function" ? v(this.view) : v);
  }
  scrollIntoView(target) {
    if (target.isSnapshot) {
      let ref = this.view.viewState.lineBlockAt(target.range.head);
      this.view.scrollDOM.scrollTop = ref.top - target.yMargin;
      this.view.scrollDOM.scrollLeft = target.xMargin;
      return;
    }
    for (let handler of this.view.state.facet(scrollHandler)) {
      try {
        if (handler(this.view, target.range, target))
          return true;
      } catch (e) {
        logException(this.view.state, e, "scroll handler");
      }
    }
    let { range } = target;
    let rect = this.coordsAt(range.head, range.assoc || (range.head > range.anchor ? -1 : 1)), other;
    if (!rect)
      return;
    if (!range.empty && (other = this.coordsAt(range.anchor, range.anchor > range.head ? -1 : 1)))
      rect = {
        left: Math.min(rect.left, other.left),
        top: Math.min(rect.top, other.top),
        right: Math.max(rect.right, other.right),
        bottom: Math.max(rect.bottom, other.bottom)
      };
    let margins = getScrollMargins(this.view);
    let targetRect = {
      left: rect.left - margins.left,
      top: rect.top - margins.top,
      right: rect.right + margins.right,
      bottom: rect.bottom + margins.bottom
    };
    let { offsetWidth, offsetHeight } = this.view.scrollDOM;
    scrollRectIntoView(this.view.scrollDOM, targetRect, range.head < range.anchor ? -1 : 1, target.x, target.y, Math.max(Math.min(target.xMargin, offsetWidth), -offsetWidth), Math.max(Math.min(target.yMargin, offsetHeight), -offsetHeight), this.view.textDirection == Direction.LTR);
    if (window.visualViewport && window.innerHeight - window.visualViewport.height > 1 && (rect.top > window.visualViewport.offsetTop + window.visualViewport.height || rect.bottom < window.visualViewport.offsetTop)) {
      let line = this.view.docView.lineAt(range.head, 1);
      if (line) {
        let stack = getScrollStack(line.dom);
        line.dom.scrollIntoView({ block: "nearest" });
        restoreScrollStack(stack, false);
      }
    }
  }
  lineHasWidget(pos) {
    let scan = (child) => child.isWidget() || child.children.some(scan);
    return scan(this.tile.resolveBlock(pos, 1).tile);
  }
  destroy() {
    destroyDropped(this.tile);
  }
}
function destroyDropped(tile, reused) {
  let r = reused === null || reused === void 0 ? void 0 : reused.get(tile);
  if (r != 1) {
    if (r == null)
      tile.destroy();
    for (let ch of tile.children)
      destroyDropped(ch, reused);
  }
}
function betweenUneditable(pos) {
  return isElt(pos.node) && pos.node.firstChild && (pos.offset == 0 || pos.node.childNodes[pos.offset - 1].contentEditable == "false") && (pos.offset == pos.node.childNodes.length || pos.node.childNodes[pos.offset].contentEditable == "false");
}
function findCompositionNode(view, headPos) {
  let sel = view.observer.selectionRange;
  if (!sel.focusNode)
    return null;
  let textBefore = textNodeBefore(sel.focusNode, sel.focusOffset);
  let textAfter = textNodeAfter(sel.focusNode, sel.focusOffset);
  let textNode = textBefore || textAfter;
  if (textAfter && textBefore && textAfter.node != textBefore.node) {
    let tileAfter = Tile.get(textAfter.node);
    if (!tileAfter || tileAfter.isText() && tileAfter.text != textAfter.node.nodeValue) {
      textNode = textAfter;
    } else if (view.docView.lastCompositionAfterCursor) {
      let tileBefore = Tile.get(textBefore.node);
      if (!(!tileBefore || tileBefore.isText() && tileBefore.text != textBefore.node.nodeValue))
        textNode = textAfter;
    }
  }
  view.docView.lastCompositionAfterCursor = textNode != textBefore;
  if (!textNode)
    return null;
  let from = headPos - textNode.offset;
  return { from, to: from + textNode.node.nodeValue.length, node: textNode.node };
}
function findCompositionRange(view, changes, headPos) {
  let found = findCompositionNode(view, headPos);
  if (!found)
    return null;
  let { node: textNode, from, to } = found, text = textNode.nodeValue;
  if (/[\n\r]/.test(text))
    return null;
  if (view.state.doc.sliceString(found.from, found.to) != text)
    return null;
  let inv = changes.invertedDesc;
  return { range: new ChangedRange(inv.mapPos(from), inv.mapPos(to), from, to), text: textNode };
}
function nextToUneditable(node, offset) {
  if (!isElt(node))
    return 0;
  return (offset && node.childNodes[offset - 1].contentEditable == "false" ? 1 : 0) | (offset < node.childNodes.length && node.childNodes[offset].contentEditable == "false" ? 2 : 0);
}
let DecorationComparator$1 = class DecorationComparator {
  constructor() {
    this.changes = [];
  }
  compareRange(from, to) {
    addRange(from, to, this.changes);
  }
  comparePoint(from, to) {
    addRange(from, to, this.changes);
  }
  boundChange(pos) {
    addRange(pos, pos, this.changes);
  }
};
function findChangedDeco(a, b, diff) {
  let comp = new DecorationComparator$1();
  RangeSet.compare(a, b, diff, comp);
  return comp.changes;
}
class WrapperComparator {
  constructor() {
    this.changes = [];
  }
  compareRange(from, to) {
    addRange(from, to, this.changes);
  }
  comparePoint() {
  }
  boundChange(pos) {
    addRange(pos, pos, this.changes);
  }
}
function findChangedWrappers(a, b, diff) {
  let comp = new WrapperComparator();
  RangeSet.compare(a, b, diff, comp);
  return comp.changes;
}
function inUneditable(node, inside) {
  for (let cur2 = node; cur2 && cur2 != inside; cur2 = cur2.assignedSlot || cur2.parentNode) {
    if (isElt(cur2) && cur2.contentEditable == "false")
      return true;
  }
  return false;
}
function touchesComposition(changes, composition) {
  let touched = false;
  if (composition)
    changes.iterChangedRanges((from, to) => {
      if (from < composition.to && to > composition.from)
        touched = true;
    });
  return touched;
}
class BlockGapWidget extends WidgetType {
  constructor(height) {
    super();
    this.height = height;
  }
  toDOM() {
    let elt = document.createElement("div");
    elt.className = "cm-gap";
    this.updateDOM(elt);
    return elt;
  }
  eq(other) {
    return other.height == this.height;
  }
  updateDOM(elt) {
    elt.style.height = this.height + "px";
    return true;
  }
  get editable() {
    return true;
  }
  get estimatedHeight() {
    return this.height;
  }
  ignoreEvent() {
    return false;
  }
}
function groupAt(state2, pos, bias = 1) {
  let categorize = state2.charCategorizer(pos);
  let line = state2.doc.lineAt(pos), linePos = pos - line.from;
  if (line.length == 0)
    return EditorSelection.cursor(pos);
  if (linePos == 0)
    bias = 1;
  else if (linePos == line.length)
    bias = -1;
  let from = linePos, to = linePos;
  if (bias < 0)
    from = findClusterBreak(line.text, linePos, false);
  else
    to = findClusterBreak(line.text, linePos);
  let cat = categorize(line.text.slice(from, to));
  while (from > 0) {
    let prev = findClusterBreak(line.text, from, false);
    if (categorize(line.text.slice(prev, from)) != cat)
      break;
    from = prev;
  }
  while (to < line.length) {
    let next = findClusterBreak(line.text, to);
    if (categorize(line.text.slice(to, next)) != cat)
      break;
    to = next;
  }
  return EditorSelection.undirectionalRange(from + line.from, to + line.from);
}
function posAtCoordsImprecise(view, contentRect, block, x, y) {
  let into = Math.round((x - contentRect.left) * view.defaultCharacterWidth);
  if (view.lineWrapping && block.height > view.defaultLineHeight * 1.5) {
    let textHeight = view.viewState.heightOracle.textHeight;
    let line = Math.floor((y - block.top - (view.defaultLineHeight - textHeight) * 0.5) / textHeight);
    into += line * view.viewState.heightOracle.lineLength;
  }
  let content2 = view.state.sliceDoc(block.from, block.to);
  return block.from + findColumn(content2, into, view.state.tabSize);
}
function blockAt(view, pos, side) {
  let line = view.lineBlockAt(pos);
  if (Array.isArray(line.type)) {
    let best;
    for (let l of line.type) {
      if (l.from > pos)
        break;
      if (l.to < pos)
        continue;
      if (l.from < pos && l.to > pos)
        return l;
      if (!best || l.type == BlockType.Text && (best.type != l.type || (side < 0 ? l.from < pos : l.to > pos)))
        best = l;
    }
    return best || line;
  }
  return line;
}
function moveToLineBoundary(view, start, forward, includeWrap) {
  let block = blockAt(view, start.head, start.assoc || -1);
  let coords = !includeWrap || block.type != BlockType.Text || !(view.lineWrapping || block.widgetLineBreaks) ? null : view.coordsAtPos(start.assoc < 0 && start.head > block.from ? start.head - 1 : start.head);
  if (coords) {
    let editorRect = view.dom.getBoundingClientRect();
    let direction = view.textDirectionAt(block.from);
    let pos = view.posAndSideAtCoords({
      x: forward == (direction == Direction.LTR) ? editorRect.right - 1 : editorRect.left + 1,
      y: (coords.top + coords.bottom) / 2
    });
    if (pos)
      return EditorSelection.cursor(pos.pos, pos.assoc);
  }
  return EditorSelection.cursor(forward ? block.to : block.from, forward ? 1 : -1);
}
function moveByChar(view, start, forward, by) {
  let line = view.state.doc.lineAt(start.head), spans = view.bidiSpans(line);
  let direction = view.textDirectionAt(line.from);
  for (let cur2 = start, check = null; ; ) {
    let next = moveVisually(line, spans, direction, cur2, forward), char = movedOver;
    if (!next) {
      if (line.number == (forward ? view.state.doc.lines : 1))
        return cur2;
      char = "\n";
      line = view.state.doc.line(line.number + (forward ? 1 : -1));
      spans = view.bidiSpans(line);
      next = forward ? EditorSelection.cursor(line.from, -1) : EditorSelection.cursor(line.to, 1);
    }
    if (!check) {
      if (!by)
        return next;
      check = by(char);
    } else if (!check(char)) {
      return cur2;
    }
    cur2 = next;
  }
}
function byGroup(view, pos, start) {
  let categorize = view.state.charCategorizer(pos);
  let cat = categorize(start);
  return (next) => {
    let nextCat = categorize(next);
    if (cat == CharCategory.Space)
      cat = nextCat;
    return cat == nextCat;
  };
}
function moveVertically(view, start, forward, distance) {
  let startPos = start.head, dir = forward ? 1 : -1;
  if (startPos == (forward ? view.state.doc.length : 0))
    return EditorSelection.cursor(startPos, start.assoc);
  let goal = start.goalColumn, startY;
  let rect = view.contentDOM.getBoundingClientRect();
  let startCoords = view.coordsAtPos(startPos, start.assoc || ((start.empty ? forward : start.head == start.from) ? 1 : -1));
  let docTop = view.documentTop;
  if (startCoords) {
    if (goal == null)
      goal = startCoords.left - rect.left;
    startY = dir < 0 ? startCoords.top : startCoords.bottom;
  } else {
    let line = view.viewState.lineBlockAt(startPos);
    if (goal == null)
      goal = Math.min(rect.right - rect.left, view.defaultCharacterWidth * (startPos - line.from));
    startY = (dir < 0 ? line.top : line.bottom) + docTop;
  }
  let resolvedGoal = rect.left + goal;
  let halfText = view.viewState.heightOracle.textHeight >> 1, dist2 = distance !== null && distance !== void 0 ? distance : halfText;
  for (let scan = 0; ; scan += halfText) {
    let y = startY + (dist2 + scan) * dir;
    let pos = posAtCoords(view, { x: resolvedGoal, y }, false, dir);
    if (forward ? y > rect.bottom : y < rect.top)
      return EditorSelection.cursor(pos.pos, pos.assoc);
    let posCoords = view.coordsAtPos(pos.pos, pos.assoc), mid = posCoords ? (posCoords.top + posCoords.bottom) / 2 : 0;
    if (!posCoords || (forward ? mid > startY : mid < startY))
      return EditorSelection.cursor(pos.pos, pos.assoc, void 0, goal);
  }
}
function skipAtomicRanges(atoms, pos, bias) {
  for (; ; ) {
    let moved = 0;
    for (let set of atoms) {
      set.between(pos - 1, pos + 1, (from, to, value) => {
        if (pos > from && pos < to) {
          let side = moved || bias || (pos - from < to - pos ? -1 : 1);
          pos = side < 0 ? from : to;
          moved = side;
        }
      });
    }
    if (!moved)
      return pos;
  }
}
function skipAtomsForSelection(atoms, sel) {
  let ranges = null;
  for (let i2 = 0; i2 < sel.ranges.length; i2++) {
    let range = sel.ranges[i2], updated = null;
    if (range.empty) {
      let pos = skipAtomicRanges(atoms, range.from, 0);
      if (pos != range.from)
        updated = EditorSelection.cursor(pos, -1);
    } else {
      let from = skipAtomicRanges(atoms, range.from, -1);
      let to = skipAtomicRanges(atoms, range.to, 1);
      if (from != range.from || to != range.to) {
        if (range.undirectional)
          updated = EditorSelection.undirectionalRange(range.from, range.to);
        else
          updated = EditorSelection.range(range.from == range.anchor ? from : to, range.from == range.head ? from : to);
      }
    }
    if (updated) {
      if (!ranges)
        ranges = sel.ranges.slice();
      ranges[i2] = updated;
    }
  }
  return ranges ? EditorSelection.create(ranges, sel.mainIndex) : sel;
}
function skipAtoms(view, oldPos, pos) {
  let newPos = skipAtomicRanges(view.state.facet(atomicRanges).map((f) => f(view)), pos.from, oldPos.head > pos.from ? -1 : 1);
  return newPos == pos.from ? pos : EditorSelection.cursor(newPos, newPos < pos.from ? 1 : -1);
}
class PosAssoc {
  constructor(pos, assoc) {
    this.pos = pos;
    this.assoc = assoc;
  }
}
function posAtCoords(view, coords, precise, scanY) {
  let content2 = view.contentDOM.getBoundingClientRect(), docTop = content2.top + view.viewState.paddingTop;
  let { x, y } = coords, yOffset = y - docTop, block;
  for (; ; ) {
    if (yOffset < 0)
      return new PosAssoc(0, 1);
    if (yOffset > view.viewState.docHeight)
      return new PosAssoc(view.state.doc.length, -1);
    block = view.elementAtHeight(yOffset);
    if (scanY == null)
      break;
    if (block.type == BlockType.Text) {
      if (scanY < 0 ? block.to < view.viewport.from : block.from > view.viewport.to)
        break;
      let rect = view.docView.coordsAt(scanY < 0 ? block.from : block.to, scanY > 0 ? -1 : 1);
      if (rect && (scanY < 0 ? rect.top <= yOffset + docTop : rect.bottom >= yOffset + docTop))
        break;
    }
    let halfLine = view.viewState.heightOracle.textHeight / 2;
    yOffset = scanY > 0 ? block.bottom + halfLine : block.top - halfLine;
  }
  if (view.viewport.from >= block.to || view.viewport.to <= block.from) {
    if (precise)
      return null;
    if (block.type == BlockType.Text) {
      let pos = posAtCoordsImprecise(view, content2, block, x, y);
      return new PosAssoc(pos, pos == block.from ? 1 : -1);
    }
  }
  if (block.type != BlockType.Text)
    return yOffset < (block.top + block.bottom) / 2 ? new PosAssoc(block.from, 1) : new PosAssoc(block.to, -1);
  let line = view.docView.lineAt(block.from, 2);
  if (!line || line.length != block.length)
    line = view.docView.lineAt(block.from, -2);
  return new InlineCoordsScan(view, x, y, view.textDirectionAt(block.from)).scanTile(line, block.from);
}
class InlineCoordsScan {
  constructor(view, x, y, baseDir) {
    this.view = view;
    this.x = x;
    this.y = y;
    this.baseDir = baseDir;
    this.line = null;
    this.spans = null;
  }
  bidiSpansAt(pos) {
    if (!this.line || this.line.from > pos || this.line.to < pos) {
      this.line = this.view.state.doc.lineAt(pos);
      this.spans = this.view.bidiSpans(this.line);
    }
    return this;
  }
  baseDirAt(pos, side) {
    let { line, spans } = this.bidiSpansAt(pos);
    let level = spans[BidiSpan.find(spans, pos - line.from, -1, side)].level;
    return level == this.baseDir;
  }
  dirAt(pos, side) {
    let { line, spans } = this.bidiSpansAt(pos);
    return spans[BidiSpan.find(spans, pos - line.from, -1, side)].dir;
  }
  // Used to short-circuit bidi tests for content with a uniform direction
  bidiIn(from, to) {
    let { spans, line } = this.bidiSpansAt(from);
    return spans.length > 1 || spans.length && (spans[0].level != this.baseDir || spans[0].to + line.from < to);
  }
  // Scan through the rectangles for the content of a tile with inline
  // content, looking for one that overlaps the queried position
  // vertically and is closest horizontally. The caller is responsible
  // for dividing its content into N pieces, and pass an array with
  // N+1 positions (including the position after the last piece). For
  // a text tile, these will be character clusters, for a composite
  // tile, these will be child tiles.
  scan(positions, getRects, recursed = false) {
    let lo = 0, hi = positions.length - 1, seen = /* @__PURE__ */ new Set();
    let bidi = this.bidiIn(positions[0], positions[hi]);
    let above, below;
    let closestI = -1, closestDx = 1e9, closestRect;
    search: while (lo < hi) {
      let dist2 = hi - lo, mid = lo + hi >> 1;
      adjust: if (seen.has(mid)) {
        for (let i2 = 1; i2 < dist2; i2++) {
          let scan = mid + i2;
          if (scan >= hi)
            scan -= dist2;
          if (!seen.has(scan)) {
            mid = scan;
            break adjust;
          }
        }
        break search;
      }
      seen.add(mid);
      let rects = getRects(mid), side = 0;
      if (rects)
        for (let i2 = 0; i2 < rects.length; i2++) {
          let rect = rects[i2];
          if (rect.width == 0 && rects.length > 1)
            continue;
          if (rect.bottom < this.y) {
            if (!above || above.bottom < rect.bottom)
              above = rect;
            side = 1;
          } else if (rect.top > this.y) {
            if (!below || below.top > rect.top)
              below = rect;
            side = -1;
          } else {
            let off = rect.left > this.x ? this.x - rect.left : rect.right < this.x ? this.x - rect.right : 0;
            let dx = Math.abs(off);
            if (dx < closestDx) {
              closestI = mid;
              closestDx = dx;
              closestRect = rect;
            }
            if (off)
              side = off < 0 == (this.baseDir == Direction.LTR) ? -1 : 1;
          }
        }
      if (side == -1 && (!bidi || this.baseDirAt(positions[mid], 1)))
        hi = mid;
      else if (side == 1 && (!bidi || this.baseDirAt(positions[mid + 1], -1)))
        lo = mid + 1;
    }
    if (!closestRect) {
      if (!below && !above)
        return { i: 0, after: false };
      let side = above && (!below || this.y - above.bottom < below.top - this.y) ? above : below;
      this.y = (side.top + side.bottom) / 2;
      return this.scan(positions, getRects, true);
    }
    if (closestDx && !recursed) {
      let { top: top2, bottom } = closestRect;
      if (above && above.bottom > (top2 + top2 + bottom) / 3) {
        this.y = above.bottom - 1;
        return this.scan(positions, getRects, true);
      }
      if (below && below.top < (top2 + bottom + bottom) / 3) {
        this.y = below.top + 1;
        return this.scan(positions, getRects, true);
      }
    }
    let ltr = (bidi ? this.dirAt(positions[closestI], 1) : this.baseDir) == Direction.LTR;
    return {
      i: closestI,
      // Test whether x is closes to the start or end of this element
      after: this.x > (closestRect.left + closestRect.right) / 2 == ltr
    };
  }
  scanText(tile, offset) {
    let positions = [];
    for (let i2 = 0; i2 < tile.length; i2 = findClusterBreak(tile.text, i2))
      positions.push(offset + i2);
    positions.push(offset + tile.length);
    let scan = this.scan(positions, (i2) => {
      let off = positions[i2] - offset, end = positions[i2 + 1] - offset;
      return textRange(tile.dom, off, end).getClientRects();
    });
    return scan.after ? new PosAssoc(positions[scan.i + 1], -1) : new PosAssoc(positions[scan.i], 1);
  }
  scanTile(tile, offset) {
    if (!tile.length)
      return new PosAssoc(offset, 1);
    if (tile.children.length == 1) {
      let child2 = tile.children[0];
      if (child2.isText())
        return this.scanText(child2, offset);
      else if (child2.isComposite())
        return this.scanTile(child2, offset);
    }
    let positions = [offset];
    for (let i2 = 0, pos2 = offset; i2 < tile.children.length; i2++)
      positions.push(pos2 += tile.children[i2].length);
    let scan = this.scan(positions, (i2) => {
      let child2 = tile.children[i2];
      if (child2.flags & 48)
        return null;
      return (isElt(child2.dom) ? child2.dom : textRange(child2.dom, 0, child2.length)).getClientRects();
    });
    let child = tile.children[scan.i], pos = positions[scan.i];
    if (child.isText())
      return this.scanText(child, pos);
    if (child.isComposite())
      return this.scanTile(child, pos);
    return scan.after ? new PosAssoc(positions[scan.i + 1], -1) : new PosAssoc(pos, 1);
  }
}
const LineBreakPlaceholder = "￿";
class DOMReader {
  constructor(points, view) {
    this.points = points;
    this.view = view;
    this.text = "";
    this.lineSeparator = view.state.facet(EditorState.lineSeparator);
  }
  append(text) {
    this.text += text;
  }
  lineBreak() {
    this.text += LineBreakPlaceholder;
  }
  readRange(start, end) {
    if (!start)
      return this;
    let parent = start.parentNode;
    for (let cur2 = start; ; ) {
      this.findPointBefore(parent, cur2);
      let oldLen = this.text.length;
      this.readNode(cur2);
      let tile = Tile.get(cur2), next = cur2.nextSibling;
      if (next == end) {
        if ((tile === null || tile === void 0 ? void 0 : tile.breakAfter) && !next && parent != this.view.contentDOM)
          this.lineBreak();
        break;
      }
      let nextTile = Tile.get(next);
      if ((tile && nextTile ? tile.breakAfter : (tile ? tile.breakAfter : isBlockElement(cur2)) || isBlockElement(next) && (cur2.nodeName != "BR" || (tile === null || tile === void 0 ? void 0 : tile.isWidget())) && this.text.length > oldLen) && !isEmptyToEnd(next, end))
        this.lineBreak();
      cur2 = next;
    }
    this.findPointBefore(parent, end);
    return this;
  }
  readTextNode(node) {
    let text = node.nodeValue;
    for (let point of this.points)
      if (point.node == node)
        point.pos = this.text.length + Math.min(point.offset, text.length);
    for (let off = 0, re = this.lineSeparator ? null : /\r\n?|\n/g; ; ) {
      let nextBreak = -1, breakSize = 1, m;
      if (this.lineSeparator) {
        nextBreak = text.indexOf(this.lineSeparator, off);
        breakSize = this.lineSeparator.length;
      } else if (m = re.exec(text)) {
        nextBreak = m.index;
        breakSize = m[0].length;
      }
      this.append(text.slice(off, nextBreak < 0 ? text.length : nextBreak));
      if (nextBreak < 0)
        break;
      this.lineBreak();
      if (breakSize > 1) {
        for (let point of this.points)
          if (point.node == node && point.pos > this.text.length)
            point.pos -= breakSize - 1;
      }
      off = nextBreak + breakSize;
    }
  }
  readNode(node) {
    let tile = Tile.get(node);
    let fromView = tile && tile.overrideDOMText;
    if (fromView != null) {
      this.findPointInside(node, fromView.length);
      for (let i2 = fromView.iter(); !i2.next().done; ) {
        if (i2.lineBreak)
          this.lineBreak();
        else
          this.append(i2.value);
      }
    } else if (isText(node)) {
      this.readTextNode(node);
    } else if (node.nodeName == "BR") {
      if (node.nextSibling)
        this.lineBreak();
    } else if (isElt(node)) {
      this.readRange(node.firstChild, null);
    }
  }
  findPointBefore(node, next) {
    for (let point of this.points)
      if (point.node == node && node.childNodes[point.offset] == next)
        point.pos = this.text.length;
  }
  findPointInside(node, length) {
    for (let point of this.points)
      if (isText(node) ? point.node == node : node.contains(point.node))
        point.pos = this.text.length + (isAtEnd(node, point.node, point.offset) ? length : 0);
  }
}
function isAtEnd(parent, node, offset) {
  for (; ; ) {
    if (!node || offset < maxOffset(node))
      return false;
    if (node == parent)
      return true;
    offset = domIndex(node) + 1;
    node = node.parentNode;
  }
}
function isEmptyToEnd(node, end) {
  let widgets;
  for (; ; node = node.nextSibling) {
    if (node == end || !node)
      break;
    let view = Tile.get(node);
    if (!(view === null || view === void 0 ? void 0 : view.isWidget()))
      return false;
    if (view)
      (widgets || (widgets = [])).push(view);
  }
  if (widgets)
    for (let w of widgets) {
      let override = w.overrideDOMText;
      if (override === null || override === void 0 ? void 0 : override.length)
        return false;
    }
  return true;
}
class DOMPoint {
  constructor(node, offset) {
    this.node = node;
    this.offset = offset;
    this.pos = -1;
  }
}
class DOMChange {
  constructor(view, start, end, typeOver) {
    this.typeOver = typeOver;
    this.bounds = null;
    this.text = "";
    this.domChanged = start > -1;
    let { impreciseHead: iHead, impreciseAnchor: iAnchor } = view.docView, curSel = view.state.selection;
    if (view.state.readOnly && start > -1) {
      this.newSel = null;
    } else if (start > -1 && (this.bounds = domBoundsAround(view.docView.tile, start, end, 0))) {
      let selPoints = iHead || iAnchor ? [] : selectionPoints(view);
      let reader = new DOMReader(selPoints, view);
      reader.readRange(this.bounds.startDOM, this.bounds.endDOM);
      this.text = reader.text;
      this.newSel = selectionFromPoints(selPoints, this.bounds.from);
    } else {
      let domSel = view.observer.selectionRange;
      let head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset || !contains(view.contentDOM, domSel.focusNode) ? curSel.main.head : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
      let anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset || !contains(view.contentDOM, domSel.anchorNode) ? curSel.main.anchor : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
      let vp = view.viewport;
      if ((browser.ios || browser.chrome) && head != anchor && Math.min(head, anchor) <= curSel.main.from && Math.max(head, anchor) >= curSel.main.to && (vp.from > 0 || vp.to < view.state.doc.length)) {
        let from = Math.min(head, anchor), to = Math.max(head, anchor);
        let offFrom = vp.from - from, offTo = vp.to - to;
        if ((offFrom == 0 || offFrom == 1 || from == 0) && (offTo == 0 || offTo == -1 || to == view.state.doc.length)) {
          head = 0;
          anchor = view.state.doc.length;
        }
      }
      if (view.inputState.composing > -1 && curSel.ranges.length > 1) {
        this.newSel = curSel.replaceRange(EditorSelection.range(anchor, head));
      } else if (view.lineWrapping && anchor == head && !(curSel.main.empty && curSel.main.head == head) && view.inputState.lastTouchTime > Date.now() - 100) {
        let before = view.coordsAtPos(head, -1), assoc = 0;
        if (before)
          assoc = view.inputState.lastTouchY <= before.bottom ? -1 : 1;
        this.newSel = EditorSelection.create([EditorSelection.cursor(head, assoc)]);
      } else {
        this.newSel = EditorSelection.single(anchor, head);
      }
    }
  }
}
function domBoundsAround(tile, from, to, offset) {
  if (tile.isComposite()) {
    let fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
    for (let i2 = 0, pos = offset, prevEnd = offset; i2 < tile.children.length; i2++) {
      let child = tile.children[i2], end = pos + child.length;
      if (pos < from && end > to)
        return domBoundsAround(child, from, to, pos);
      if (end >= from && fromI == -1) {
        fromI = i2;
        fromStart = pos;
      }
      if (pos > to && child.dom.parentNode == tile.dom) {
        toI = i2;
        toEnd = prevEnd;
        break;
      }
      prevEnd = end;
      pos = end + child.breakAfter;
    }
    return {
      from: fromStart,
      to: toEnd < 0 ? offset + tile.length : toEnd,
      startDOM: (fromI ? tile.children[fromI - 1].dom.nextSibling : null) || tile.dom.firstChild,
      endDOM: toI < tile.children.length && toI >= 0 ? tile.children[toI].dom : null
    };
  } else if (tile.isText()) {
    return { from: offset, to: offset + tile.length, startDOM: tile.dom, endDOM: tile.dom.nextSibling };
  } else {
    return null;
  }
}
function applyDOMChange(view, domChange) {
  let change;
  let { newSel } = domChange, { state: state2 } = view, sel = state2.selection.main;
  let lastKey = view.inputState.lastKeyTime > Date.now() - 100 ? view.inputState.lastKeyCode : -1;
  if (domChange.bounds) {
    let { from, to } = domChange.bounds;
    let preferredPos = sel.from, preferredSide = null;
    if (lastKey === 8 || browser.android && domChange.text.length < to - from) {
      preferredPos = sel.to;
      preferredSide = "end";
    }
    let cmp = state2.doc.sliceString(from, to, LineBreakPlaceholder), selEnd, diff;
    if (!sel.empty && sel.from >= from && sel.to <= to && (domChange.typeOver || cmp != domChange.text) && cmp.slice(0, sel.from - from) == domChange.text.slice(0, sel.from - from) && cmp.slice(sel.to - from) == domChange.text.slice(selEnd = domChange.text.length - (cmp.length - (sel.to - from)))) {
      change = {
        from: sel.from,
        to: sel.to,
        insert: Text.of(domChange.text.slice(sel.from - from, selEnd).split(LineBreakPlaceholder))
      };
    } else if (diff = findDiff(cmp, domChange.text, preferredPos - from, preferredSide)) {
      if (browser.chrome && lastKey == 13 && diff.toB == diff.from + 2 && domChange.text.slice(diff.from, diff.toB) == LineBreakPlaceholder + LineBreakPlaceholder)
        diff.toB--;
      change = {
        from: from + diff.from,
        to: from + diff.toA,
        insert: Text.of(domChange.text.slice(diff.from, diff.toB).split(LineBreakPlaceholder))
      };
    }
  } else if (newSel && (!view.hasFocus && state2.facet(editable) || sameSelPos(newSel, sel))) {
    newSel = null;
  }
  if (!change && !newSel)
    return false;
  if ((browser.mac || browser.android) && change && change.from == change.to && change.from == sel.head - 1 && /^\. ?$/.test(change.insert.toString()) && view.contentDOM.getAttribute("autocorrect") == "off") {
    if (newSel && change.insert.length == 2)
      newSel = EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
    change = { from: change.from, to: change.to, insert: Text.of([change.insert.toString().replace(".", " ")]) };
  } else if (state2.doc.lineAt(sel.from).to < sel.to && view.docView.lineHasWidget(sel.to) && view.inputState.insertingTextAt > Date.now() - 50) {
    change = {
      from: sel.from,
      to: sel.to,
      insert: state2.toText(view.inputState.insertingText)
    };
  } else if (browser.chrome && change && change.from == change.to && change.from == sel.head && change.insert.toString() == "\n " && view.lineWrapping) {
    if (newSel)
      newSel = EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
    change = { from: sel.from, to: sel.to, insert: Text.of([" "]) };
  }
  if (change) {
    return applyDOMChangeInner(view, change, newSel, lastKey);
  } else if (newSel && !sameSelPos(newSel, sel)) {
    let scrollIntoView2 = false, userEvent = "select";
    if (view.inputState.lastSelectionTime > Date.now() - 50) {
      if (view.inputState.lastSelectionOrigin == "select")
        scrollIntoView2 = true;
      userEvent = view.inputState.lastSelectionOrigin;
      if (userEvent == "select.pointer")
        newSel = skipAtomsForSelection(state2.facet(atomicRanges).map((f) => f(view)), newSel);
    }
    view.dispatch({ selection: newSel, scrollIntoView: scrollIntoView2, userEvent });
    return true;
  } else {
    return false;
  }
}
function applyDOMChangeInner(view, change, newSel, lastKey = -1) {
  if (browser.ios && view.inputState.flushIOSKey(change))
    return true;
  let sel = view.state.selection.main;
  if (browser.android && (change.to == sel.to && // GBoard will sometimes remove a space it just inserted
  // after a completion when you press enter
  (change.from == sel.from || change.from == sel.from - 1 && view.state.sliceDoc(change.from, sel.from) == " ") && change.insert.length == 1 && change.insert.lines == 2 && dispatchKey(view.contentDOM, "Enter", 13) || (change.from == sel.from - 1 && change.to == sel.to && change.insert.length == 0 || lastKey == 8 && change.insert.length < change.to - change.from && change.to > sel.head) && dispatchKey(view.contentDOM, "Backspace", 8) || change.from == sel.from && change.to == sel.to + 1 && change.insert.length == 0 && dispatchKey(view.contentDOM, "Delete", 46)))
    return true;
  let text = change.insert.toString();
  if (view.inputState.composing >= 0)
    view.inputState.composing++;
  let defaultTr;
  let defaultInsert = () => defaultTr || (defaultTr = applyDefaultInsert(view, change, newSel));
  if (!view.state.facet(inputHandler$1).some((h) => h(view, change.from, change.to, text, defaultInsert)))
    view.dispatch(defaultInsert());
  return true;
}
function applyDefaultInsert(view, change, newSel) {
  let tr, startState = view.state, sel = startState.selection.main, inAtomic = -1;
  if (change.from == change.to && change.from < sel.from || change.from > sel.to) {
    let side = change.from < sel.from ? -1 : 1, pos = side < 0 ? sel.from : sel.to;
    let moved = skipAtomicRanges(startState.facet(atomicRanges).map((f) => f(view)), pos, side);
    if (change.from == moved)
      inAtomic = moved;
  }
  if (inAtomic > -1) {
    tr = {
      changes: change,
      selection: EditorSelection.cursor(change.from + change.insert.length, -1)
    };
  } else if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3 && (!newSel || newSel.main.empty && newSel.main.from == change.from + change.insert.length) && view.inputState.composing < 0) {
    let before = sel.from < change.from ? startState.sliceDoc(sel.from, change.from) : "";
    let after = sel.to > change.to ? startState.sliceDoc(change.to, sel.to) : "";
    tr = startState.replaceSelection(view.state.toText(before + change.insert.sliceString(0, void 0, view.state.lineBreak) + after));
  } else {
    let changes = startState.changes(change);
    let mainSel = newSel && newSel.main.to <= changes.newLength ? newSel.main : void 0;
    if (startState.selection.ranges.length > 1 && (view.inputState.composing >= 0 || view.inputState.compositionPendingChange) && change.to <= sel.to + 10 && change.to >= sel.to - 10) {
      let replaced = view.state.sliceDoc(change.from, change.to);
      let compositionRange, composition = newSel && findCompositionNode(view, newSel.main.head);
      if (composition) {
        let dLen = change.insert.length - (change.to - change.from);
        compositionRange = { from: composition.from, to: composition.to - dLen };
      } else {
        compositionRange = view.state.doc.lineAt(sel.head);
      }
      let offset = sel.to - change.to;
      tr = startState.changeByRange((range) => {
        if (range.from == sel.from && range.to == sel.to)
          return { changes, range: mainSel || range.map(changes) };
        let to = range.to - offset, from = to - replaced.length;
        if (view.state.sliceDoc(from, to) != replaced || // Unfortunately, there's no way to make multiple
        // changes in the same node work without aborting
        // composition, so cursors in the composition range are
        // ignored.
        to >= compositionRange.from && from <= compositionRange.to)
          return { range };
        let rangeChanges = startState.changes({ from, to, insert: change.insert }), selOff = range.to - sel.to;
        return {
          changes: rangeChanges,
          range: !mainSel ? range.map(rangeChanges) : EditorSelection.range(Math.max(0, mainSel.anchor + selOff), Math.max(0, mainSel.head + selOff))
        };
      });
    } else {
      tr = {
        changes,
        selection: mainSel && startState.selection.replaceRange(mainSel)
      };
    }
  }
  let userEvent = "input.type";
  if (view.composing || view.inputState.compositionPendingChange && view.inputState.compositionEndedAt > Date.now() - 50) {
    view.inputState.compositionPendingChange = false;
    userEvent += ".compose";
    if (view.inputState.compositionFirstChange) {
      userEvent += ".start";
      view.inputState.compositionFirstChange = false;
    }
  }
  return startState.update(tr, { userEvent, scrollIntoView: true });
}
function findDiff(a, b, preferredPos, preferredSide) {
  let minLen = Math.min(a.length, b.length);
  let from = 0;
  while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
    from++;
  if (from == minLen && a.length == b.length)
    return null;
  let toA = a.length, toB = b.length;
  while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
    toA--;
    toB--;
  }
  if (preferredSide == "end") {
    let adjust = Math.max(0, from - Math.min(toA, toB));
    preferredPos -= toA + adjust - from;
  }
  if (toA < from && a.length < b.length) {
    let move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
    from -= move;
    toB = from + (toB - toA);
    toA = from;
  } else if (toB < from) {
    let move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
    from -= move;
    toA = from + (toA - toB);
    toB = from;
  }
  return { from, toA, toB };
}
function selectionPoints(view) {
  let result = [];
  if (view.root.activeElement != view.contentDOM)
    return result;
  let { anchorNode, anchorOffset, focusNode, focusOffset } = view.observer.selectionRange;
  if (anchorNode) {
    result.push(new DOMPoint(anchorNode, anchorOffset));
    if (focusNode != anchorNode || focusOffset != anchorOffset)
      result.push(new DOMPoint(focusNode, focusOffset));
  }
  return result;
}
function selectionFromPoints(points, base2) {
  if (points.length == 0)
    return null;
  let anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
  return anchor < 0 || head < 0 ? null : anchor == head ? EditorSelection.create([EditorSelection.cursor(head + base2, -1)]) : EditorSelection.single(anchor + base2, head + base2);
}
function sameSelPos(selection2, range) {
  return range.head == selection2.main.head && range.anchor == selection2.main.anchor;
}
class InputState {
  setSelectionOrigin(origin) {
    this.lastSelectionOrigin = origin;
    this.lastSelectionTime = Date.now();
  }
  constructor(view) {
    this.view = view;
    this.lastKeyCode = 0;
    this.lastKeyTime = 0;
    this.touchActive = false;
    this.lastTouchTime = 0;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.lastFocusTime = 0;
    this.lastScrollTop = 0;
    this.lastScrollLeft = 0;
    this.lastWheelEvent = 0;
    this.pendingIOSKey = void 0;
    this.lastIOSMomentumScroll = 0;
    this.tabFocusMode = -1;
    this.lastSelectionOrigin = null;
    this.lastSelectionTime = 0;
    this.lastContextMenu = 0;
    this.scrollHandlers = [];
    this.handlers = /* @__PURE__ */ Object.create(null);
    this.composing = -1;
    this.compositionFirstChange = null;
    this.compositionEndedAt = 0;
    this.compositionPendingKey = false;
    this.compositionPendingChange = false;
    this.insertingText = "";
    this.insertingTextAt = 0;
    this.mouseSelection = null;
    this.draggedContent = null;
    this.handleEvent = this.handleEvent.bind(this);
    this.notifiedFocused = view.hasFocus;
    if (browser.safari)
      view.contentDOM.addEventListener("input", () => null);
    if (browser.gecko)
      firefoxCopyCutHack(view.contentDOM.ownerDocument);
  }
  handleEvent(event) {
    if (!eventBelongsToEditor(this.view, event) || this.ignoreDuringComposition(event))
      return;
    if (event.type == "keydown" && this.keydown(event))
      return;
    if (this.view.updateState != 0)
      Promise.resolve().then(() => this.runHandlers(event.type, event));
    else
      this.runHandlers(event.type, event);
  }
  runHandlers(type, event) {
    let handlers2 = this.handlers[type];
    if (handlers2) {
      for (let observer of handlers2.observers)
        observer(this.view, event);
      for (let handler of handlers2.handlers) {
        if (event.defaultPrevented)
          break;
        if (handler(this.view, event)) {
          event.preventDefault();
          break;
        }
      }
    }
  }
  ensureHandlers(plugins) {
    let handlers2 = computeHandlers(plugins), prev = this.handlers, dom = this.view.contentDOM;
    for (let type in handlers2)
      if (type != "scroll") {
        let passive = !handlers2[type].handlers.length;
        let exists = prev[type];
        if (exists && passive != !exists.handlers.length) {
          dom.removeEventListener(type, this.handleEvent);
          exists = null;
        }
        if (!exists)
          dom.addEventListener(type, this.handleEvent, { passive });
      }
    for (let type in prev)
      if (type != "scroll" && !handlers2[type])
        dom.removeEventListener(type, this.handleEvent);
    this.handlers = handlers2;
  }
  keydown(event) {
    this.lastKeyCode = event.keyCode;
    this.lastKeyTime = Date.now();
    if (event.keyCode == 9 && this.tabFocusMode > -1 && (!this.tabFocusMode || Date.now() <= this.tabFocusMode))
      return true;
    if (this.tabFocusMode > 0 && event.keyCode != 27 && modifierCodes.indexOf(event.keyCode) < 0)
      this.tabFocusMode = -1;
    if (browser.android && browser.chrome && !event.synthetic && (event.keyCode == 13 || event.keyCode == 8)) {
      this.view.observer.delayAndroidKey(event.key, event.keyCode);
      return true;
    }
    if (browser.ios && !event.synthetic && !event.altKey && !event.metaKey && (PendingKeys.some((key) => key.keyCode == event.keyCode) && !event.ctrlKey || EmacsyPendingKeys.indexOf(event.key) > -1 && event.ctrlKey)) {
      let mods = { ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey, shiftKey: event.shiftKey };
      if (mods.shiftKey && browser.ios && !/^(off|none)$/.test(this.view.contentDOM.autocapitalize) && iosVirtualKeyboardOpen(this.view.win))
        mods.shiftKey = false;
      let pending = this.pendingIOSKey = { key: event.key, keyCode: event.keyCode, mods };
      setTimeout(() => {
        if (this.pendingIOSKey == pending)
          this.flushIOSKey();
      }, 50);
      return true;
    }
    if (event.keyCode != 229)
      this.view.observer.forceFlush();
    return false;
  }
  flushIOSKey(change) {
    let key = this.pendingIOSKey;
    if (!key || this.view.observer.pendingRecords().length)
      return false;
    if (key.key == "Enter" && change && change.from < change.to && /^\S+$/.test(change.insert.toString()))
      return false;
    this.pendingIOSKey = void 0;
    return dispatchKey(this.view.contentDOM, key.key, key.keyCode, key.mods);
  }
  ignoreDuringComposition(event) {
    if (!/^key/.test(event.type) || event.synthetic)
      return false;
    if (this.composing > 0)
      return true;
    if (browser.safari && !browser.ios && this.compositionPendingKey && Date.now() - this.compositionEndedAt < 100) {
      this.compositionPendingKey = false;
      return true;
    }
    return false;
  }
  startMouseSelection(mouseSelection) {
    if (this.mouseSelection)
      this.mouseSelection.destroy();
    this.mouseSelection = mouseSelection;
  }
  update(update) {
    this.view.observer.update(update);
    if (this.mouseSelection)
      this.mouseSelection.update(update);
    if (this.draggedContent && update.docChanged)
      this.draggedContent = this.draggedContent.map(update.changes);
    if (update.transactions.length)
      this.lastKeyCode = this.lastSelectionTime = 0;
  }
  destroy() {
    if (this.mouseSelection)
      this.mouseSelection.destroy();
  }
}
function iosVirtualKeyboardOpen(win) {
  if (!win.visualViewport)
    return false;
  return win.visualViewport.height * win.visualViewport.scale / win.document.documentElement.clientHeight < 0.85;
}
function bindHandler(plugin, handler) {
  return (view, event) => {
    try {
      return handler.call(plugin, event, view);
    } catch (e) {
      logException(view.state, e);
    }
  };
}
function computeHandlers(plugins) {
  let result = /* @__PURE__ */ Object.create(null);
  function record(type) {
    return result[type] || (result[type] = { observers: [], handlers: [] });
  }
  for (let plugin of plugins) {
    let spec = plugin.spec, handlers2 = spec && spec.plugin.domEventHandlers, observers2 = spec && spec.plugin.domEventObservers;
    if (handlers2)
      for (let type in handlers2) {
        let f = handlers2[type];
        if (f)
          record(type).handlers.push(bindHandler(plugin.value, f));
      }
    if (observers2)
      for (let type in observers2) {
        let f = observers2[type];
        if (f)
          record(type).observers.push(bindHandler(plugin.value, f));
      }
  }
  for (let type in handlers)
    record(type).handlers.push(handlers[type]);
  for (let type in observers)
    record(type).observers.push(observers[type]);
  return result;
}
const PendingKeys = [
  { key: "Backspace", keyCode: 8, inputType: "deleteContentBackward" },
  { key: "Enter", keyCode: 13, inputType: "insertParagraph" },
  { key: "Enter", keyCode: 13, inputType: "insertLineBreak" },
  { key: "Delete", keyCode: 46, inputType: "deleteContentForward" }
];
const EmacsyPendingKeys = "dthko";
const modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225];
const dragScrollMargin = 6;
function dragScrollSpeed(dist2) {
  return Math.max(0, dist2) * 0.7 + 8;
}
function dist(a, b) {
  return Math.max(Math.abs(a.clientX - b.clientX), Math.abs(a.clientY - b.clientY));
}
class MouseSelection {
  constructor(view, startEvent, style, mustSelect) {
    this.view = view;
    this.startEvent = startEvent;
    this.style = style;
    this.mustSelect = mustSelect;
    this.scrollSpeed = { x: 0, y: 0 };
    this.scrolling = -1;
    this.lastEvent = startEvent;
    this.scrollParents = scrollableParents(view.contentDOM);
    this.atoms = view.state.facet(atomicRanges).map((f) => f(view));
    let doc2 = view.contentDOM.ownerDocument;
    doc2.addEventListener("mousemove", this.move = this.move.bind(this));
    doc2.addEventListener("mouseup", this.up = this.up.bind(this));
    this.extend = startEvent.shiftKey;
    this.multiple = view.state.facet(EditorState.allowMultipleSelections) && addsSelectionRange(view, startEvent);
    this.dragging = isInPrimarySelection(view, startEvent) && getClickType(startEvent) == 1 ? null : false;
  }
  start(event) {
    if (this.dragging === false)
      this.select(event);
  }
  move(event) {
    if (event.buttons == 0)
      return this.destroy();
    if (this.dragging || this.dragging == null && dist(this.startEvent, event) < 10)
      return;
    this.select(this.lastEvent = event);
    let sx = 0, sy = 0;
    let left = 0, top2 = 0, right = this.view.win.innerWidth, bottom = this.view.win.innerHeight;
    if (this.scrollParents.x)
      ({ left, right } = this.scrollParents.x.getBoundingClientRect());
    if (this.scrollParents.y)
      ({ top: top2, bottom } = this.scrollParents.y.getBoundingClientRect());
    let margins = getScrollMargins(this.view);
    if (event.clientX - margins.left <= left + dragScrollMargin)
      sx = -dragScrollSpeed(left - event.clientX);
    else if (event.clientX + margins.right >= right - dragScrollMargin)
      sx = dragScrollSpeed(event.clientX - right);
    if (event.clientY - margins.top <= top2 + dragScrollMargin)
      sy = -dragScrollSpeed(top2 - event.clientY);
    else if (event.clientY + margins.bottom >= bottom - dragScrollMargin)
      sy = dragScrollSpeed(event.clientY - bottom);
    this.setScrollSpeed(sx, sy);
  }
  up(event) {
    if (this.dragging == null)
      this.select(this.lastEvent);
    if (!this.dragging)
      event.preventDefault();
    this.destroy();
  }
  destroy() {
    this.setScrollSpeed(0, 0);
    let doc2 = this.view.contentDOM.ownerDocument;
    doc2.removeEventListener("mousemove", this.move);
    doc2.removeEventListener("mouseup", this.up);
    this.view.inputState.mouseSelection = this.view.inputState.draggedContent = null;
  }
  setScrollSpeed(sx, sy) {
    this.scrollSpeed = { x: sx, y: sy };
    if (sx || sy) {
      if (this.scrolling < 0)
        this.scrolling = setInterval(() => this.scroll(), 50);
    } else if (this.scrolling > -1) {
      clearInterval(this.scrolling);
      this.scrolling = -1;
    }
  }
  scroll() {
    let { x, y } = this.scrollSpeed;
    if (x && this.scrollParents.x) {
      this.scrollParents.x.scrollLeft += x;
      x = 0;
    }
    if (y && this.scrollParents.y) {
      this.scrollParents.y.scrollTop += y;
      y = 0;
    }
    if (x || y)
      this.view.win.scrollBy(x, y);
    if (this.dragging === false)
      this.select(this.lastEvent);
  }
  select(event) {
    let { view } = this, selection2 = skipAtomsForSelection(this.atoms, this.style.get(event, this.extend, this.multiple));
    if (this.mustSelect || !selection2.eq(view.state.selection, this.dragging === false))
      this.view.dispatch({
        selection: selection2,
        userEvent: "select.pointer"
      });
    this.mustSelect = false;
  }
  update(update) {
    if (update.transactions.some((tr) => tr.isUserEvent("input.type")))
      this.destroy();
    else if (this.style.update(update))
      setTimeout(() => this.select(this.lastEvent), 20);
  }
}
function addsSelectionRange(view, event) {
  let facet = view.state.facet(clickAddsSelectionRange);
  return facet.length ? facet[0](event) : browser.mac ? event.metaKey : event.ctrlKey;
}
function dragMovesSelection(view, event) {
  let facet = view.state.facet(dragMovesSelection$1);
  return facet.length ? facet[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
}
function isInPrimarySelection(view, event) {
  let { main } = view.state.selection;
  if (main.empty)
    return false;
  let sel = getSelection(view.root);
  if (!sel || sel.rangeCount == 0)
    return true;
  let rects = sel.getRangeAt(0).getClientRects();
  for (let i2 = 0; i2 < rects.length; i2++) {
    let rect = rects[i2];
    if (rect.left <= event.clientX && rect.right >= event.clientX && rect.top <= event.clientY && rect.bottom >= event.clientY)
      return true;
  }
  return false;
}
function eventBelongsToEditor(view, event) {
  if (!event.bubbles)
    return true;
  if (event.defaultPrevented)
    return false;
  for (let node = event.target, tile; node != view.contentDOM; node = node.parentNode)
    if (!node || node.nodeType == 11 || (tile = Tile.get(node)) && tile.isWidget() && !tile.isHidden && tile.widget.ignoreEvent(event))
      return false;
  return true;
}
const handlers = /* @__PURE__ */ Object.create(null);
const observers = /* @__PURE__ */ Object.create(null);
const brokenClipboardAPI = browser.ie && browser.ie_version < 15 || browser.ios && browser.webkit_version < 604;
function capturePaste(view) {
  let parent = view.dom.parentNode;
  if (!parent)
    return;
  let target = parent.appendChild(document.createElement("textarea"));
  target.style.cssText = "position: fixed; left: -10000px; top: 10px";
  target.focus();
  setTimeout(() => {
    view.focus();
    target.remove();
    doPaste(view, target.value);
  }, 50);
}
function textFilter(state2, facet, text) {
  for (let filter of state2.facet(facet))
    text = filter(text, state2);
  return text;
}
function doPaste(view, input) {
  input = textFilter(view.state, clipboardInputFilter, input);
  let { state: state2 } = view, changes, i2 = 1, text = state2.toText(input);
  let byLine = text.lines == state2.selection.ranges.length;
  let linewise = lastLinewiseCopy != null && state2.selection.ranges.every((r) => r.empty) && lastLinewiseCopy == text.toString();
  if (linewise) {
    let lastLine = -1;
    changes = state2.changeByRange((range) => {
      let line = state2.doc.lineAt(range.from);
      if (line.from == lastLine)
        return { range };
      lastLine = line.from;
      let insert2 = state2.toText((byLine ? text.line(i2++).text : input) + state2.lineBreak);
      return {
        changes: { from: line.from, insert: insert2 },
        range: EditorSelection.cursor(range.from + insert2.length, -1)
      };
    });
  } else if (byLine) {
    changes = state2.changeByRange((range) => {
      let line = text.line(i2++);
      return {
        changes: { from: range.from, to: range.to, insert: line.text },
        range: EditorSelection.cursor(range.from + line.length, -1)
      };
    });
  } else {
    changes = state2.replaceSelection(text);
  }
  view.dispatch(changes, {
    userEvent: "input.paste",
    scrollIntoView: true
  });
}
observers.scroll = (view) => {
  let iState = view.inputState;
  iState.lastScrollTop = view.scrollDOM.scrollTop;
  iState.lastScrollLeft = view.scrollDOM.scrollLeft;
  if (browser.ios && !iState.touchActive)
    iState.lastIOSMomentumScroll = Date.now();
};
observers.wheel = observers.mousewheel = (view) => {
  view.inputState.lastWheelEvent = Date.now();
};
handlers.keydown = (view, event) => {
  view.inputState.setSelectionOrigin("select");
  if (event.keyCode == 27 && view.inputState.tabFocusMode != 0)
    view.inputState.tabFocusMode = Date.now() + 2e3;
  return false;
};
observers.touchstart = (view, e) => {
  let iState = view.inputState, touch = e.targetTouches[0];
  iState.touchActive = true;
  iState.lastTouchTime = Date.now();
  if (touch) {
    iState.lastTouchX = touch.clientX;
    iState.lastTouchY = touch.clientY;
  }
  iState.setSelectionOrigin("select.pointer");
};
observers.touchmove = (view) => {
  view.inputState.setSelectionOrigin("select.pointer");
};
observers.touchend = (view, e) => {
  view.inputState.touchActive = false;
};
handlers.mousedown = (view, event) => {
  view.observer.flush();
  if (view.inputState.lastTouchTime > Date.now() - 2e3)
    return false;
  let style = null;
  for (let makeStyle of view.state.facet(mouseSelectionStyle)) {
    style = makeStyle(view, event);
    if (style)
      break;
  }
  if (!style && event.button == 0)
    style = basicMouseSelection(view, event);
  if (style) {
    let mustFocus = !view.hasFocus;
    view.inputState.startMouseSelection(new MouseSelection(view, event, style, mustFocus));
    if (mustFocus)
      view.observer.ignore(() => {
        focusPreventScroll(view.contentDOM);
        let active = view.root.activeElement;
        if (active && !active.contains(view.contentDOM))
          active.blur();
      });
    let mouseSel = view.inputState.mouseSelection;
    if (mouseSel) {
      mouseSel.start(event);
      return mouseSel.dragging === false;
    }
  } else {
    view.inputState.setSelectionOrigin("select.pointer");
  }
  return false;
};
function rangeForClick(view, pos, bias, type) {
  if (type == 1) {
    return EditorSelection.cursor(pos, bias);
  } else if (type == 2) {
    return groupAt(view.state, pos, bias);
  } else {
    let visual = view.docView.lineAt(pos, bias), line = view.state.doc.lineAt(visual ? visual.posAtEnd : pos);
    let from = visual ? visual.posAtStart : line.from, to = visual ? visual.posAtEnd : line.to;
    if (to < view.state.doc.length && to == line.to)
      to++;
    return EditorSelection.undirectionalRange(from, to);
  }
}
const BadMouseDetail = browser.ie && browser.ie_version <= 11;
let lastMouseDown = null, lastMouseDownCount = 0, lastMouseDownTime = 0;
function getClickType(event) {
  if (!BadMouseDetail)
    return event.detail;
  let last2 = lastMouseDown, lastTime = lastMouseDownTime;
  lastMouseDown = event;
  lastMouseDownTime = Date.now();
  return lastMouseDownCount = !last2 || lastTime > Date.now() - 400 && Math.abs(last2.clientX - event.clientX) < 2 && Math.abs(last2.clientY - event.clientY) < 2 ? (lastMouseDownCount + 1) % 3 : 1;
}
function basicMouseSelection(view, event) {
  let start = view.posAndSideAtCoords({ x: event.clientX, y: event.clientY }, false), type = getClickType(event);
  let startSel = view.state.selection;
  return {
    update(update) {
      if (update.docChanged) {
        start.pos = update.changes.mapPos(start.pos);
        startSel = startSel.map(update.changes);
      }
    },
    get(event2, extend, multiple) {
      let cur2 = view.posAndSideAtCoords({ x: event2.clientX, y: event2.clientY }, false), removed;
      let range = rangeForClick(view, cur2.pos, cur2.assoc, type);
      if (start.pos != cur2.pos && !extend) {
        let startRange = rangeForClick(view, start.pos, start.assoc, type);
        let from = Math.min(startRange.from, range.from), to = Math.max(startRange.to, range.to);
        range = from < range.from ? EditorSelection.range(from, to, range.assoc) : EditorSelection.range(to, from, range.assoc);
      }
      if (extend)
        return startSel.replaceRange(startSel.main.extend(range.from, range.to, range.assoc));
      else if (multiple && type == 1 && startSel.ranges.length > 1 && (removed = removeRangeAround(startSel, cur2.pos)))
        return removed;
      else if (multiple)
        return startSel.addRange(range);
      else
        return EditorSelection.create([range]);
    }
  };
}
function removeRangeAround(sel, pos) {
  for (let i2 = 0; i2 < sel.ranges.length; i2++) {
    let { from, to } = sel.ranges[i2];
    if (from <= pos && to >= pos)
      return EditorSelection.create(sel.ranges.slice(0, i2).concat(sel.ranges.slice(i2 + 1)), sel.mainIndex == i2 ? 0 : sel.mainIndex - (sel.mainIndex > i2 ? 1 : 0));
  }
  return null;
}
handlers.dragstart = (view, event) => {
  let { selection: { main: range } } = view.state;
  if (event.target.draggable) {
    let tile = view.docView.tile.nearest(event.target);
    if (tile && tile.isWidget()) {
      let from = tile.posAtStart, to = from + tile.length;
      if (from >= range.to || to <= range.from)
        range = EditorSelection.undirectionalRange(from, to);
    }
  }
  let { inputState } = view;
  if (inputState.mouseSelection)
    inputState.mouseSelection.dragging = true;
  inputState.draggedContent = range;
  if (event.dataTransfer) {
    event.dataTransfer.setData("Text", textFilter(view.state, clipboardOutputFilter, view.state.sliceDoc(range.from, range.to)));
    event.dataTransfer.effectAllowed = "copyMove";
  }
  return false;
};
handlers.dragend = (view) => {
  view.inputState.draggedContent = null;
  return false;
};
function dropText(view, event, text, direct) {
  text = textFilter(view.state, clipboardInputFilter, text);
  if (!text)
    return;
  let dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
  let { draggedContent } = view.inputState;
  let del = direct && draggedContent && dragMovesSelection(view, event) ? { from: draggedContent.from, to: draggedContent.to } : null;
  let ins = { from: dropPos, insert: text };
  let changes = view.state.changes(del ? [del, ins] : ins);
  view.focus();
  view.dispatch({
    changes,
    selection: { anchor: changes.mapPos(dropPos, -1), head: changes.mapPos(dropPos, 1) },
    userEvent: del ? "move.drop" : "input.drop"
  });
  view.inputState.draggedContent = null;
}
handlers.drop = (view, event) => {
  if (!event.dataTransfer)
    return false;
  if (view.state.readOnly)
    return true;
  let files = event.dataTransfer.files;
  if (files && files.length) {
    let text = Array(files.length), read = 0;
    let finishFile = () => {
      if (++read == files.length)
        dropText(view, event, text.filter((s) => s != null).join(view.state.lineBreak), false);
    };
    for (let i2 = 0; i2 < files.length; i2++) {
      let reader = new FileReader();
      reader.onerror = finishFile;
      reader.onload = () => {
        if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result))
          text[i2] = reader.result;
        finishFile();
      };
      reader.readAsText(files[i2]);
    }
    return true;
  } else {
    let text = event.dataTransfer.getData("Text");
    if (text) {
      dropText(view, event, text, true);
      return true;
    }
  }
  return false;
};
handlers.paste = (view, event) => {
  if (view.state.readOnly)
    return true;
  view.observer.flush();
  let data = brokenClipboardAPI ? null : event.clipboardData;
  if (data) {
    doPaste(view, data.getData("text/plain") || data.getData("text/uri-list"));
    return true;
  } else {
    capturePaste(view);
    return false;
  }
};
function captureCopy(view, text) {
  let parent = view.dom.parentNode;
  if (!parent)
    return;
  let target = parent.appendChild(document.createElement("textarea"));
  target.style.cssText = "position: fixed; left: -10000px; top: 10px";
  target.value = text;
  target.focus();
  target.selectionEnd = text.length;
  target.selectionStart = 0;
  setTimeout(() => {
    target.remove();
    view.focus();
  }, 50);
}
function copiedRange(state2) {
  let content2 = [], ranges = [], linewise = false;
  for (let range of state2.selection.ranges)
    if (!range.empty) {
      content2.push(state2.sliceDoc(range.from, range.to));
      ranges.push(range);
    }
  if (!content2.length) {
    let upto = -1;
    for (let { from } of state2.selection.ranges) {
      let line = state2.doc.lineAt(from);
      if (line.number > upto) {
        content2.push(line.text);
        ranges.push({ from: line.from, to: Math.min(state2.doc.length, line.to + 1) });
      }
      upto = line.number;
    }
    linewise = true;
  }
  return { text: textFilter(state2, clipboardOutputFilter, content2.join(state2.lineBreak)), ranges, linewise };
}
let lastLinewiseCopy = null;
handlers.copy = handlers.cut = (view, event) => {
  if (!hasSelection(view.contentDOM, view.observer.selectionRange))
    return false;
  let { text, ranges, linewise } = copiedRange(view.state);
  if (!text && !linewise)
    return false;
  lastLinewiseCopy = linewise ? text : null;
  if (event.type == "cut" && !view.state.readOnly)
    view.dispatch({
      changes: ranges,
      scrollIntoView: true,
      userEvent: "delete.cut"
    });
  let data = brokenClipboardAPI ? null : event.clipboardData;
  if (data) {
    data.clearData();
    data.setData("text/plain", text);
    return true;
  } else {
    captureCopy(view, text);
    return false;
  }
};
const isFocusChange = /* @__PURE__ */ Annotation.define();
function focusChangeTransaction(state2, focus) {
  let effects = [];
  for (let getEffect of state2.facet(focusChangeEffect)) {
    let effect = getEffect(state2, focus);
    if (effect)
      effects.push(effect);
  }
  return effects.length ? state2.update({ effects, annotations: isFocusChange.of(true) }) : null;
}
function updateForFocusChange(view) {
  setTimeout(() => {
    let focus = view.hasFocus;
    if (focus != view.inputState.notifiedFocused) {
      let tr = focusChangeTransaction(view.state, focus);
      if (tr)
        view.dispatch(tr);
      else
        view.update([]);
    }
  }, 10);
}
observers.focus = (view) => {
  view.inputState.lastFocusTime = Date.now();
  if (!view.scrollDOM.scrollTop && (view.inputState.lastScrollTop || view.inputState.lastScrollLeft)) {
    view.scrollDOM.scrollTop = view.inputState.lastScrollTop;
    view.scrollDOM.scrollLeft = view.inputState.lastScrollLeft;
  }
  updateForFocusChange(view);
};
observers.blur = (view) => {
  view.observer.clearSelectionRange();
  updateForFocusChange(view);
};
observers.compositionstart = observers.compositionupdate = (view, event) => {
  if (view.observer.editContext)
    return;
  if (view.inputState.compositionFirstChange == null)
    view.inputState.compositionFirstChange = true;
  if (view.inputState.composing < 0) {
    let { main } = view.state.selection;
    if (!main.empty && view.lineBlockAt(main.from).from != view.lineBlockAt(main.to).from && !view.state.readOnly) {
      view.dispatch({
        changes: view.state.selection.ranges.filter((r) => !r.empty).map((r) => ({ from: r.from, to: r.to })),
        userEvent: "input"
      });
    }
    view.inputState.composing = 0;
  }
};
observers.compositionend = (view) => {
  if (view.observer.editContext)
    return;
  view.inputState.composing = -1;
  view.inputState.compositionEndedAt = Date.now();
  view.inputState.compositionPendingKey = true;
  view.inputState.compositionPendingChange = view.observer.pendingRecords().length > 0;
  view.inputState.compositionFirstChange = null;
  if (browser.chrome && browser.android) {
    view.observer.flushSoon();
  } else if (view.inputState.compositionPendingChange) {
    Promise.resolve().then(() => view.observer.flush());
  } else {
    setTimeout(() => {
      if (view.inputState.composing < 0 && view.docView.hasComposition)
        view.update([]);
    }, 50);
  }
};
observers.contextmenu = (view) => {
  view.inputState.lastContextMenu = Date.now();
};
handlers.beforeinput = (view, event) => {
  var _a2, _b;
  if (event.inputType == "insertText" || event.inputType == "insertCompositionText") {
    view.inputState.insertingText = event.data;
    view.inputState.insertingTextAt = Date.now();
  }
  if (event.inputType == "insertReplacementText" && view.observer.editContext) {
    let text = (_a2 = event.dataTransfer) === null || _a2 === void 0 ? void 0 : _a2.getData("text/plain"), ranges = event.getTargetRanges();
    if (text && ranges.length) {
      let r = ranges[0];
      let from = view.posAtDOM(r.startContainer, r.startOffset), to = view.posAtDOM(r.endContainer, r.endOffset);
      applyDOMChangeInner(view, { from, to, insert: view.state.toText(text) }, null);
      return true;
    }
  }
  let pending;
  if (browser.chrome && browser.android && (pending = PendingKeys.find((key) => key.inputType == event.inputType))) {
    view.observer.delayAndroidKey(pending.key, pending.keyCode);
    if (pending.key == "Backspace" || pending.key == "Delete") {
      let startViewHeight = ((_b = window.visualViewport) === null || _b === void 0 ? void 0 : _b.height) || 0;
      setTimeout(() => {
        var _a3;
        if ((((_a3 = window.visualViewport) === null || _a3 === void 0 ? void 0 : _a3.height) || 0) > startViewHeight + 10 && view.hasFocus) {
          view.contentDOM.blur();
          view.focus();
        }
      }, 100);
    }
  }
  if (browser.ios && event.inputType == "deleteContentForward") {
    view.observer.flushSoon();
  }
  if (browser.safari && event.inputType == "insertText" && view.inputState.composing >= 0) {
    setTimeout(() => observers.compositionend(view, event), 20);
  }
  return false;
};
const appliedFirefoxHack = /* @__PURE__ */ new Set();
function firefoxCopyCutHack(doc2) {
  if (!appliedFirefoxHack.has(doc2)) {
    appliedFirefoxHack.add(doc2);
    doc2.addEventListener("copy", () => {
    });
    doc2.addEventListener("cut", () => {
    });
  }
}
const wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line", "break-spaces"];
let heightChangeFlag = false;
function clearHeightChangeFlag() {
  heightChangeFlag = false;
}
class HeightOracle {
  constructor(lineWrapping) {
    this.lineWrapping = lineWrapping;
    this.doc = Text.empty;
    this.heightSamples = {};
    this.lineHeight = 14;
    this.charWidth = 7;
    this.textHeight = 14;
    this.lineLength = 30;
  }
  heightForGap(from, to) {
    let lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
    if (this.lineWrapping)
      lines += Math.max(0, Math.ceil((to - from - lines * this.lineLength * 0.5) / this.lineLength));
    return this.lineHeight * lines;
  }
  heightForLine(length) {
    if (!this.lineWrapping)
      return this.lineHeight;
    let lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / Math.max(1, this.lineLength - 5)));
    return lines * this.lineHeight;
  }
  setDoc(doc2) {
    this.doc = doc2;
    return this;
  }
  mustRefreshForWrapping(whiteSpace) {
    return wrappingWhiteSpace.indexOf(whiteSpace) > -1 != this.lineWrapping;
  }
  mustRefreshForHeights(lineHeights) {
    let newHeight = false;
    for (let i2 = 0; i2 < lineHeights.length; i2++) {
      let h = lineHeights[i2];
      if (h < 0) {
        i2++;
      } else if (!this.heightSamples[Math.floor(h * 10)]) {
        newHeight = true;
        this.heightSamples[Math.floor(h * 10)] = true;
      }
    }
    return newHeight;
  }
  refresh(whiteSpace, lineHeight, charWidth, textHeight, lineLength, knownHeights) {
    let lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
    let changed = Math.abs(lineHeight - this.lineHeight) > 0.3 || this.lineWrapping != lineWrapping;
    this.lineWrapping = lineWrapping;
    this.lineHeight = lineHeight;
    this.charWidth = charWidth;
    this.textHeight = textHeight;
    this.lineLength = lineLength;
    if (changed) {
      this.heightSamples = {};
      for (let i2 = 0; i2 < knownHeights.length; i2++) {
        let h = knownHeights[i2];
        if (h < 0)
          i2++;
        else
          this.heightSamples[Math.floor(h * 10)] = true;
      }
    }
    return changed;
  }
}
class MeasuredHeights {
  constructor(from, heights) {
    this.from = from;
    this.heights = heights;
    this.index = 0;
  }
  get more() {
    return this.index < this.heights.length;
  }
}
class BlockInfo {
  /**
  @internal
  */
  constructor(from, length, top2, height, _content) {
    this.from = from;
    this.length = length;
    this.top = top2;
    this.height = height;
    this._content = _content;
  }
  /**
  The type of element this is. When querying lines, this may be
  an array of all the blocks that make up the line.
  */
  get type() {
    return typeof this._content == "number" ? BlockType.Text : Array.isArray(this._content) ? this._content : this._content.type;
  }
  /**
  The end of the element as a document position.
  */
  get to() {
    return this.from + this.length;
  }
  /**
  The bottom position of the element.
  */
  get bottom() {
    return this.top + this.height;
  }
  /**
  If this is a widget block, this will return the widget
  associated with it.
  */
  get widget() {
    return this._content instanceof PointDecoration ? this._content.widget : null;
  }
  /**
  If this is a textblock, this holds the number of line breaks
  that appear in widgets inside the block.
  */
  get widgetLineBreaks() {
    return typeof this._content == "number" ? this._content : 0;
  }
  /**
  @internal
  */
  join(other) {
    let content2 = (Array.isArray(this._content) ? this._content : [this]).concat(Array.isArray(other._content) ? other._content : [other]);
    return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, content2);
  }
}
var QueryType$1 = /* @__PURE__ */ (function(QueryType2) {
  QueryType2[QueryType2["ByPos"] = 0] = "ByPos";
  QueryType2[QueryType2["ByHeight"] = 1] = "ByHeight";
  QueryType2[QueryType2["ByPosNoHeight"] = 2] = "ByPosNoHeight";
  return QueryType2;
})(QueryType$1 || (QueryType$1 = {}));
const Epsilon = 1e-3;
class HeightMap {
  constructor(length, height, flags = 2) {
    this.length = length;
    this.height = height;
    this.flags = flags;
  }
  get outdated() {
    return (this.flags & 2) > 0;
  }
  set outdated(value) {
    this.flags = (value ? 2 : 0) | this.flags & -3;
  }
  setHeight(height) {
    if (this.height != height) {
      if (Math.abs(this.height - height) > Epsilon)
        heightChangeFlag = true;
      this.height = height;
    }
  }
  // Base case is to replace a leaf node, which simply builds a tree
  // from the new nodes and returns that (HeightMapBranch and
  // HeightMapGap override this to actually use from/to)
  replace(_from, _to, nodes) {
    return HeightMap.of(nodes);
  }
  // Again, these are base cases, and are overridden for branch and gap nodes.
  decomposeLeft(_to, result) {
    result.push(this);
  }
  decomposeRight(_from, result) {
    result.push(this);
  }
  applyChanges(decorations2, oldDoc, oracle, changes) {
    let me = this, doc2 = oracle.doc;
    for (let i2 = changes.length - 1; i2 >= 0; i2--) {
      let { fromA, toA, fromB, toB } = changes[i2];
      let start = me.lineAt(fromA, QueryType$1.ByPosNoHeight, oracle.setDoc(oldDoc), 0, 0);
      let end = start.to >= toA ? start : me.lineAt(toA, QueryType$1.ByPosNoHeight, oracle, 0, 0);
      toB += end.to - toA;
      toA = end.to;
      while (i2 > 0 && start.from <= changes[i2 - 1].toA) {
        fromA = changes[i2 - 1].fromA;
        fromB = changes[i2 - 1].fromB;
        i2--;
        if (fromA < start.from)
          start = me.lineAt(fromA, QueryType$1.ByPosNoHeight, oracle, 0, 0);
      }
      fromB += start.from - fromA;
      fromA = start.from;
      let nodes = NodeBuilder.build(oracle.setDoc(doc2), decorations2, fromB, toB);
      me = replace(me, me.replace(fromA, toA, nodes));
    }
    return me.updateHeight(oracle, 0);
  }
  static empty() {
    return new HeightMapText(0, 0, 0);
  }
  // nodes uses null values to indicate the position of line breaks.
  // There are never line breaks at the start or end of the array, or
  // two line breaks next to each other, and the array isn't allowed
  // to be empty (same restrictions as return value from the builder).
  static of(nodes) {
    if (nodes.length == 1)
      return nodes[0];
    let i2 = 0, j = nodes.length, before = 0, after = 0;
    for (; ; ) {
      if (i2 == j) {
        if (before > after * 2) {
          let split = nodes[i2 - 1];
          if (split.break)
            nodes.splice(--i2, 1, split.left, null, split.right);
          else
            nodes.splice(--i2, 1, split.left, split.right);
          j += 1 + split.break;
          before -= split.size;
        } else if (after > before * 2) {
          let split = nodes[j];
          if (split.break)
            nodes.splice(j, 1, split.left, null, split.right);
          else
            nodes.splice(j, 1, split.left, split.right);
          j += 2 + split.break;
          after -= split.size;
        } else {
          break;
        }
      } else if (before < after) {
        let next = nodes[i2++];
        if (next)
          before += next.size;
      } else {
        let next = nodes[--j];
        if (next)
          after += next.size;
      }
    }
    let brk = false;
    if (nodes[i2 - 1] == null) {
      brk = true;
      i2--;
    } else if (nodes[i2] == null) {
      brk = true;
      j++;
    }
    return new HeightMapBranch(HeightMap.of(nodes.slice(0, i2)), brk, HeightMap.of(nodes.slice(j)));
  }
}
function replace(old, val) {
  if (old == val)
    return old;
  if (old.constructor != val.constructor)
    heightChangeFlag = true;
  return val;
}
HeightMap.prototype.size = 1;
const SpaceDeco = /* @__PURE__ */ Decoration.replace({});
class HeightMapBlock extends HeightMap {
  constructor(length, height, deco) {
    super(length, height);
    this.deco = deco;
    this.spaceAbove = 0;
  }
  mainBlock(top2, offset) {
    return new BlockInfo(offset, this.length, top2 + this.spaceAbove, this.height - this.spaceAbove, this.deco || 0);
  }
  blockAt(height, _oracle, top2, offset) {
    return this.spaceAbove && height < top2 + this.spaceAbove ? new BlockInfo(offset, 0, top2, this.spaceAbove, SpaceDeco) : this.mainBlock(top2, offset);
  }
  lineAt(_value, _type, oracle, top2, offset) {
    let main = this.mainBlock(top2, offset);
    return this.spaceAbove ? this.blockAt(0, oracle, top2, offset).join(main) : main;
  }
  forEachLine(from, to, oracle, top2, offset, f) {
    if (from <= offset + this.length && to >= offset)
      f(this.lineAt(0, QueryType$1.ByPos, oracle, top2, offset));
  }
  setMeasuredHeight(measured) {
    let next = measured.heights[measured.index++];
    if (next < 0) {
      this.spaceAbove = -next;
      next = measured.heights[measured.index++];
    } else {
      this.spaceAbove = 0;
    }
    this.setHeight(next);
  }
  updateHeight(oracle, offset = 0, _force = false, measured) {
    if (measured && measured.from <= offset && measured.more)
      this.setMeasuredHeight(measured);
    this.outdated = false;
    return this;
  }
  toString() {
    return `block(${this.length})`;
  }
}
class HeightMapText extends HeightMapBlock {
  constructor(length, height, above) {
    super(length, height, null);
    this.collapsed = 0;
    this.widgetHeight = 0;
    this.breaks = 0;
    this.spaceAbove = above;
  }
  mainBlock(top2, offset) {
    return new BlockInfo(offset, this.length, top2 + this.spaceAbove, this.height - this.spaceAbove, this.breaks);
  }
  replace(_from, _to, nodes) {
    let node = nodes[0];
    if (nodes.length == 1 && (node instanceof HeightMapText || node instanceof HeightMapGap && node.flags & 4) && Math.abs(this.length - node.length) < 10) {
      if (node instanceof HeightMapGap)
        node = new HeightMapText(node.length, this.height, this.spaceAbove);
      else
        node.height = this.height;
      if (!this.outdated)
        node.outdated = false;
      return node;
    } else {
      return HeightMap.of(nodes);
    }
  }
  updateHeight(oracle, offset = 0, force = false, measured) {
    if (measured && measured.from <= offset && measured.more) {
      this.setMeasuredHeight(measured);
    } else if (force || this.outdated) {
      this.spaceAbove = 0;
      this.setHeight(Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)) + this.breaks * oracle.lineHeight);
    }
    this.outdated = false;
    return this;
  }
  toString() {
    return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
  }
}
class HeightMapGap extends HeightMap {
  constructor(length) {
    super(length, 0);
  }
  heightMetrics(oracle, offset) {
    let firstLine = oracle.doc.lineAt(offset).number, lastLine = oracle.doc.lineAt(offset + this.length).number;
    let lines = lastLine - firstLine + 1;
    let perLine, perChar = 0;
    if (oracle.lineWrapping) {
      let totalPerLine = Math.min(this.height, oracle.lineHeight * lines);
      perLine = totalPerLine / lines;
      if (this.length > lines + 1)
        perChar = (this.height - totalPerLine) / (this.length - lines - 1);
    } else {
      perLine = this.height / lines;
    }
    return { firstLine, lastLine, perLine, perChar };
  }
  blockAt(height, oracle, top2, offset) {
    let { firstLine, lastLine, perLine, perChar } = this.heightMetrics(oracle, offset);
    if (oracle.lineWrapping) {
      let guess = offset + (height < oracle.lineHeight ? 0 : Math.round(Math.max(0, Math.min(1, (height - top2) / this.height)) * this.length));
      let line = oracle.doc.lineAt(guess), lineHeight = perLine + line.length * perChar;
      let lineTop = Math.max(top2, height - lineHeight / 2);
      return new BlockInfo(line.from, line.length, lineTop, lineHeight, 0);
    } else {
      let line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top2) / perLine)));
      let { from, length } = oracle.doc.line(firstLine + line);
      return new BlockInfo(from, length, top2 + perLine * line, perLine, 0);
    }
  }
  lineAt(value, type, oracle, top2, offset) {
    if (type == QueryType$1.ByHeight)
      return this.blockAt(value, oracle, top2, offset);
    if (type == QueryType$1.ByPosNoHeight) {
      let { from, to } = oracle.doc.lineAt(value);
      return new BlockInfo(from, to - from, 0, 0, 0);
    }
    let { firstLine, perLine, perChar } = this.heightMetrics(oracle, offset);
    let line = oracle.doc.lineAt(value), lineHeight = perLine + line.length * perChar;
    let linesAbove = line.number - firstLine;
    let lineTop = top2 + perLine * linesAbove + perChar * (line.from - offset - linesAbove);
    return new BlockInfo(line.from, line.length, Math.max(top2, Math.min(lineTop, top2 + this.height - lineHeight)), lineHeight, 0);
  }
  forEachLine(from, to, oracle, top2, offset, f) {
    from = Math.max(from, offset);
    to = Math.min(to, offset + this.length);
    let { firstLine, perLine, perChar } = this.heightMetrics(oracle, offset);
    for (let pos = from, lineTop = top2; pos <= to; ) {
      let line = oracle.doc.lineAt(pos);
      if (pos == from) {
        let linesAbove = line.number - firstLine;
        lineTop += perLine * linesAbove + perChar * (from - offset - linesAbove);
      }
      let lineHeight = perLine + perChar * line.length;
      f(new BlockInfo(line.from, line.length, lineTop, lineHeight, 0));
      lineTop += lineHeight;
      pos = line.to + 1;
    }
  }
  replace(from, to, nodes) {
    let after = this.length - to;
    if (after > 0) {
      let last2 = nodes[nodes.length - 1];
      if (last2 instanceof HeightMapGap)
        nodes[nodes.length - 1] = new HeightMapGap(last2.length + after);
      else
        nodes.push(null, new HeightMapGap(after - 1));
    }
    if (from > 0) {
      let first = nodes[0];
      if (first instanceof HeightMapGap)
        nodes[0] = new HeightMapGap(from + first.length);
      else
        nodes.unshift(new HeightMapGap(from - 1), null);
    }
    return HeightMap.of(nodes);
  }
  decomposeLeft(to, result) {
    result.push(new HeightMapGap(to - 1), null);
  }
  decomposeRight(from, result) {
    result.push(null, new HeightMapGap(this.length - from - 1));
  }
  updateHeight(oracle, offset = 0, force = false, measured) {
    let end = offset + this.length;
    if (measured && measured.from <= offset + this.length && measured.more) {
      let nodes = [], pos = Math.max(offset, measured.from), singleHeight = -1;
      if (measured.from > offset)
        nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
      while (pos <= end && measured.more) {
        let len = oracle.doc.lineAt(pos).length;
        if (nodes.length)
          nodes.push(null);
        let height = measured.heights[measured.index++], above = 0;
        if (height < 0) {
          above = -height;
          height = measured.heights[measured.index++];
        }
        if (singleHeight == -1)
          singleHeight = height;
        else if (Math.abs(height - singleHeight) >= Epsilon)
          singleHeight = -2;
        let line = new HeightMapText(len, height, above);
        line.outdated = false;
        nodes.push(line);
        pos += len + 1;
      }
      if (pos <= end)
        nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
      let result = HeightMap.of(nodes);
      if (singleHeight < 0 || Math.abs(result.height - this.height) >= Epsilon || Math.abs(singleHeight - this.heightMetrics(oracle, offset).perLine) >= Epsilon)
        heightChangeFlag = true;
      return replace(this, result);
    } else if (force || this.outdated) {
      this.setHeight(oracle.heightForGap(offset, offset + this.length));
      this.outdated = false;
    }
    return this;
  }
  toString() {
    return `gap(${this.length})`;
  }
}
class HeightMapBranch extends HeightMap {
  constructor(left, brk, right) {
    super(left.length + (brk ? 1 : 0) + right.length, left.height + right.height, (brk ? 1 : 0) | (left.outdated || right.outdated ? 2 : 0));
    this.left = left;
    this.right = right;
    this.size = left.size + right.size;
  }
  // Returns 1 if there is a line break between this.left and
  // this.right, 0 otherwise.
  get break() {
    return this.flags & 1;
  }
  blockAt(height, oracle, top2, offset) {
    let mid = top2 + this.left.height;
    return height < mid ? this.left.blockAt(height, oracle, top2, offset) : this.right.blockAt(height, oracle, mid, offset + this.left.length + this.break);
  }
  lineAt(value, type, oracle, top2, offset) {
    let rightTop = top2 + this.left.height, rightOffset = offset + this.left.length + this.break;
    let left = type == QueryType$1.ByHeight ? value < rightTop : value < rightOffset;
    let base2 = left ? this.left.lineAt(value, type, oracle, top2, offset) : this.right.lineAt(value, type, oracle, rightTop, rightOffset);
    if (this.break || (left ? base2.to < rightOffset : base2.from > rightOffset))
      return base2;
    let subQuery = type == QueryType$1.ByPosNoHeight ? QueryType$1.ByPosNoHeight : QueryType$1.ByPos;
    if (left)
      return base2.join(this.right.lineAt(rightOffset, subQuery, oracle, rightTop, rightOffset));
    else
      return this.left.lineAt(rightOffset, subQuery, oracle, top2, offset).join(base2);
  }
  forEachLine(from, to, oracle, top2, offset, f) {
    let rightTop = top2 + this.left.height, rightOffset = offset + this.left.length + this.break;
    if (this.break) {
      if (from < rightOffset)
        this.left.forEachLine(from, to, oracle, top2, offset, f);
      if (to >= rightOffset)
        this.right.forEachLine(from, to, oracle, rightTop, rightOffset, f);
    } else {
      let mid = this.lineAt(rightOffset, QueryType$1.ByPos, oracle, top2, offset);
      if (from < mid.from)
        this.left.forEachLine(from, Math.min(to, mid.from - 1), oracle, top2, offset, f);
      if (mid.to >= from && mid.from <= to)
        f(mid);
      if (to > mid.to)
        this.right.forEachLine(Math.max(from, mid.to + 1), to, oracle, rightTop, rightOffset, f);
    }
  }
  replace(from, to, nodes) {
    let rightStart = this.left.length + this.break;
    if (to < rightStart)
      return this.balanced(this.left.replace(from, to, nodes), this.right);
    if (from > this.left.length)
      return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
    let result = [];
    if (from > 0)
      this.decomposeLeft(from, result);
    let left = result.length;
    for (let node of nodes)
      result.push(node);
    if (from > 0)
      mergeGaps(result, left - 1);
    if (to < this.length) {
      let right = result.length;
      this.decomposeRight(to, result);
      mergeGaps(result, right);
    }
    return HeightMap.of(result);
  }
  decomposeLeft(to, result) {
    let left = this.left.length;
    if (to <= left)
      return this.left.decomposeLeft(to, result);
    result.push(this.left);
    if (this.break) {
      left++;
      if (to >= left)
        result.push(null);
    }
    if (to > left)
      this.right.decomposeLeft(to - left, result);
  }
  decomposeRight(from, result) {
    let left = this.left.length, right = left + this.break;
    if (from >= right)
      return this.right.decomposeRight(from - right, result);
    if (from < left)
      this.left.decomposeRight(from, result);
    if (this.break && from < right)
      result.push(null);
    result.push(this.right);
  }
  balanced(left, right) {
    if (left.size > 2 * right.size || right.size > 2 * left.size)
      return HeightMap.of(this.break ? [left, null, right] : [left, right]);
    this.left = replace(this.left, left);
    this.right = replace(this.right, right);
    this.setHeight(left.height + right.height);
    this.outdated = left.outdated || right.outdated;
    this.size = left.size + right.size;
    this.length = left.length + this.break + right.length;
    return this;
  }
  updateHeight(oracle, offset = 0, force = false, measured) {
    let { left, right } = this, rightStart = offset + left.length + this.break, rebalance = null;
    if (measured && measured.from <= offset + left.length && measured.more)
      rebalance = left = left.updateHeight(oracle, offset, force, measured);
    else
      left.updateHeight(oracle, offset, force);
    if (measured && measured.from <= rightStart + right.length && measured.more)
      rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
    else
      right.updateHeight(oracle, rightStart, force);
    if (rebalance)
      return this.balanced(left, right);
    this.height = this.left.height + this.right.height;
    this.outdated = false;
    return this;
  }
  toString() {
    return this.left + (this.break ? " " : "-") + this.right;
  }
}
function mergeGaps(nodes, around) {
  let before, after;
  if (nodes[around] == null && (before = nodes[around - 1]) instanceof HeightMapGap && (after = nodes[around + 1]) instanceof HeightMapGap)
    nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
}
const relevantWidgetHeight = 5;
class NodeBuilder {
  constructor(pos, oracle) {
    this.pos = pos;
    this.oracle = oracle;
    this.nodes = [];
    this.lineStart = -1;
    this.lineEnd = -1;
    this.covering = null;
    this.writtenTo = pos;
  }
  get isCovered() {
    return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
  }
  span(_from, to) {
    if (this.lineStart > -1) {
      let end = Math.min(to, this.lineEnd), last2 = this.nodes[this.nodes.length - 1];
      if (last2 instanceof HeightMapText)
        last2.length += end - this.pos;
      else if (end > this.pos || !this.isCovered)
        this.nodes.push(new HeightMapText(end - this.pos, -1, 0));
      this.writtenTo = end;
      if (to > end) {
        this.nodes.push(null);
        this.writtenTo++;
        this.lineStart = -1;
      }
    }
    this.pos = to;
  }
  point(from, to, deco) {
    if (from < to || deco.heightRelevant) {
      let height = deco.widget ? deco.widget.estimatedHeight : 0;
      let breaks = deco.widget ? deco.widget.lineBreaks : 0;
      if (height < 0)
        height = this.oracle.lineHeight;
      let len = to - from;
      if (deco.block) {
        this.addBlock(new HeightMapBlock(len, height, deco));
      } else if (len || breaks || height >= relevantWidgetHeight) {
        this.addLineDeco(height, breaks, len);
      }
    } else if (to > from) {
      this.span(from, to);
    }
    if (this.lineEnd > -1 && this.lineEnd < this.pos)
      this.lineEnd = this.oracle.doc.lineAt(this.pos).to;
  }
  enterLine() {
    if (this.lineStart > -1)
      return;
    let { from, to } = this.oracle.doc.lineAt(this.pos);
    this.lineStart = from;
    this.lineEnd = to;
    if (this.writtenTo < from) {
      if (this.writtenTo < from - 1 || this.nodes[this.nodes.length - 1] == null)
        this.nodes.push(this.blankContent(this.writtenTo, from - 1));
      this.nodes.push(null);
    }
    if (this.pos > from)
      this.nodes.push(new HeightMapText(this.pos - from, -1, 0));
    this.writtenTo = this.pos;
  }
  blankContent(from, to) {
    let gap = new HeightMapGap(to - from);
    if (this.oracle.doc.lineAt(from).to == to)
      gap.flags |= 4;
    return gap;
  }
  ensureLine() {
    this.enterLine();
    let last2 = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
    if (last2 instanceof HeightMapText)
      return last2;
    let line = new HeightMapText(0, -1, 0);
    this.nodes.push(line);
    return line;
  }
  addBlock(block) {
    this.enterLine();
    let deco = block.deco;
    if (deco && deco.startSide > 0 && !this.isCovered)
      this.ensureLine();
    this.nodes.push(block);
    this.writtenTo = this.pos = this.pos + block.length;
    if (deco && deco.endSide > 0)
      this.covering = block;
  }
  addLineDeco(height, breaks, length) {
    let line = this.ensureLine();
    line.length += length;
    line.collapsed += length;
    line.widgetHeight = Math.max(line.widgetHeight, height);
    line.breaks += breaks;
    this.writtenTo = this.pos = this.pos + length;
  }
  finish(from) {
    let last2 = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
    if (this.lineStart > -1 && !(last2 instanceof HeightMapText) && !this.isCovered)
      this.nodes.push(new HeightMapText(0, -1, 0));
    else if (this.writtenTo < this.pos || last2 == null)
      this.nodes.push(this.blankContent(this.writtenTo, this.pos));
    let pos = from;
    for (let node of this.nodes) {
      if (node instanceof HeightMapText)
        node.updateHeight(this.oracle, pos);
      pos += node ? node.length : 1;
    }
    return this.nodes;
  }
  // Always called with a region that on both sides either stretches
  // to a line break or the end of the document.
  // The returned array uses null to indicate line breaks, but never
  // starts or ends in a line break, or has multiple line breaks next
  // to each other.
  static build(oracle, decorations2, from, to) {
    let builder = new NodeBuilder(from, oracle);
    RangeSet.spans(decorations2, from, to, builder, 0);
    return builder.finish(from);
  }
}
function heightRelevantDecoChanges(a, b, diff) {
  let comp = new DecorationComparator2();
  RangeSet.compare(a, b, diff, comp, 0);
  return comp.changes;
}
class DecorationComparator2 {
  constructor() {
    this.changes = [];
  }
  compareRange() {
  }
  comparePoint(from, to, a, b) {
    if (from < to || a && a.heightRelevant || b && b.heightRelevant)
      addRange(from, to, this.changes, 5);
  }
}
function visiblePixelRange(dom, paddingTop) {
  let rect = dom.getBoundingClientRect();
  let doc2 = dom.ownerDocument, win = doc2.defaultView || window;
  let left = Math.max(0, rect.left), right = Math.min(win.innerWidth, rect.right);
  let top2 = Math.max(0, rect.top), bottom = Math.min(win.innerHeight, rect.bottom);
  for (let parent = dom.parentNode; parent && parent != doc2.body; ) {
    if (isElt(parent)) {
      let style = window.getComputedStyle(parent);
      if ((parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) && style.overflow != "visible") {
        let parentRect = parent.getBoundingClientRect();
        left = Math.max(left, parentRect.left);
        right = Math.min(right, parentRect.right);
        top2 = Math.max(top2, parentRect.top);
        bottom = Math.min(parent == dom.parentNode ? win.innerHeight : bottom, parentRect.bottom);
      }
      parent = style.position == "absolute" || style.position == "fixed" ? parent.offsetParent : parent.parentNode;
    } else if (parent.nodeType == 11) {
      parent = parent.host;
    } else {
      break;
    }
  }
  return {
    left: left - rect.left,
    right: Math.max(left, right) - rect.left,
    top: top2 - (rect.top + paddingTop),
    bottom: Math.max(top2, bottom) - (rect.top + paddingTop)
  };
}
function inWindow(elt) {
  let rect = elt.getBoundingClientRect(), win = elt.ownerDocument.defaultView || window;
  return rect.left < win.innerWidth && rect.right > 0 && rect.top < win.innerHeight && rect.bottom > 0;
}
function fullPixelRange(dom, paddingTop) {
  let rect = dom.getBoundingClientRect();
  return {
    left: 0,
    right: rect.right - rect.left,
    top: paddingTop,
    bottom: rect.bottom - (rect.top + paddingTop)
  };
}
class LineGap {
  constructor(from, to, size, displaySize) {
    this.from = from;
    this.to = to;
    this.size = size;
    this.displaySize = displaySize;
  }
  static same(a, b) {
    if (a.length != b.length)
      return false;
    for (let i2 = 0; i2 < a.length; i2++) {
      let gA = a[i2], gB = b[i2];
      if (gA.from != gB.from || gA.to != gB.to || gA.size != gB.size)
        return false;
    }
    return true;
  }
  draw(viewState, wrapping) {
    return Decoration.replace({
      widget: new LineGapWidget(this.displaySize * (wrapping ? viewState.scaleY : viewState.scaleX), wrapping)
    }).range(this.from, this.to);
  }
}
class LineGapWidget extends WidgetType {
  constructor(size, vertical) {
    super();
    this.size = size;
    this.vertical = vertical;
  }
  eq(other) {
    return other.size == this.size && other.vertical == this.vertical;
  }
  toDOM() {
    let elt = document.createElement("div");
    if (this.vertical) {
      elt.style.height = this.size + "px";
    } else {
      elt.style.width = this.size + "px";
      elt.style.height = "2px";
      elt.style.display = "inline-block";
    }
    return elt;
  }
  get estimatedHeight() {
    return this.vertical ? this.size : -1;
  }
}
class ViewState {
  constructor(view, state2) {
    this.view = view;
    this.state = state2;
    this.pixelViewport = { left: 0, right: window.innerWidth, top: 0, bottom: 0 };
    this.inView = true;
    this.paddingTop = 0;
    this.paddingBottom = 0;
    this.contentDOMWidth = 0;
    this.contentDOMHeight = 0;
    this.editorHeight = 0;
    this.editorWidth = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.scrollOffset = 0;
    this.scrolledToBottom = false;
    this.scrollAnchorPos = 0;
    this.scrollAnchorHeight = -1;
    this.scaler = IdScaler;
    this.scrollTarget = null;
    this.printing = false;
    this.mustMeasureContent = true;
    this.defaultTextDirection = Direction.LTR;
    this.visibleRanges = [];
    this.mustEnforceCursorAssoc = false;
    let guessWrapping = state2.facet(contentAttributes).some((v) => typeof v != "function" && v.class == "cm-lineWrapping");
    this.heightOracle = new HeightOracle(guessWrapping);
    this.stateDeco = staticDeco(state2);
    this.heightMap = HeightMap.empty().applyChanges(this.stateDeco, Text.empty, this.heightOracle.setDoc(state2.doc), [new ChangedRange(0, 0, 0, state2.doc.length)]);
    for (let i2 = 0; i2 < 2; i2++) {
      this.viewport = this.getViewport(0, null);
      if (!this.updateForViewport())
        break;
    }
    this.updateViewportLines();
    this.lineGaps = this.ensureLineGaps([]);
    this.lineGapDeco = Decoration.set(this.lineGaps.map((gap) => gap.draw(this, false)));
    this.scrollParent = view.scrollDOM;
    this.computeVisibleRanges();
  }
  updateForViewport() {
    let viewports = [this.viewport], { main } = this.state.selection;
    for (let i2 = 0; i2 <= 1; i2++) {
      let pos = i2 ? main.head : main.anchor;
      if (!viewports.some(({ from, to }) => pos >= from && pos <= to)) {
        let { from, to } = this.lineBlockAt(pos);
        viewports.push(new Viewport(from, to));
      }
    }
    this.viewports = viewports.sort((a, b) => a.from - b.from);
    return this.updateScaler();
  }
  updateScaler() {
    let scaler = this.scaler;
    this.scaler = this.heightMap.height <= 7e6 ? IdScaler : BigScaler.get(this.heightOracle, this.heightMap, this.viewports);
    return scaler.eq(this.scaler) ? 0 : 2;
  }
  updateViewportLines() {
    this.viewportLines = [];
    this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.heightOracle.setDoc(this.state.doc), 0, 0, (block) => {
      this.viewportLines.push(scaleBlock(block, this.scaler));
    });
  }
  update(update, scrollTarget = null) {
    this.state = update.state;
    let prevDeco = this.stateDeco;
    this.stateDeco = staticDeco(this.state);
    let contentChanges = update.changedRanges;
    let heightChanges = ChangedRange.extendWithRanges(contentChanges, heightRelevantDecoChanges(prevDeco, this.stateDeco, update ? update.changes : ChangeSet.empty(this.state.doc.length)));
    let prevHeight = this.heightMap.height;
    let scrollAnchor = this.scrolledToBottom ? null : this.scrollAnchorAt(this.scrollOffset);
    clearHeightChangeFlag();
    this.heightMap = this.heightMap.applyChanges(this.stateDeco, update.startState.doc, this.heightOracle.setDoc(this.state.doc), heightChanges);
    if (this.heightMap.height != prevHeight || heightChangeFlag)
      update.flags |= 2;
    if (scrollAnchor) {
      this.scrollAnchorPos = update.changes.mapPos(scrollAnchor.from, -1);
      this.scrollAnchorHeight = scrollAnchor.top;
    } else {
      this.scrollAnchorPos = -1;
      this.scrollAnchorHeight = prevHeight;
    }
    let viewport = heightChanges.length ? this.mapViewport(this.viewport, update.changes) : this.viewport;
    if (scrollTarget && (scrollTarget.range.head < viewport.from || scrollTarget.range.head > viewport.to) || !this.viewportIsAppropriate(viewport))
      viewport = this.getViewport(0, scrollTarget);
    let viewportChange = viewport.from != this.viewport.from || viewport.to != this.viewport.to;
    this.viewport = viewport;
    update.flags |= this.updateForViewport();
    if (viewportChange || !update.changes.empty || update.flags & 2)
      this.updateViewportLines();
    if (this.lineGaps.length || this.viewport.to - this.viewport.from > 2e3 << 1)
      this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, update.changes)));
    update.flags |= this.computeVisibleRanges(update.changes);
    if (scrollTarget)
      this.scrollTarget = scrollTarget;
    if (!this.mustEnforceCursorAssoc && (update.selectionSet || update.focusChanged) && update.view.lineWrapping && update.state.selection.main.empty && update.state.selection.main.assoc && !update.state.facet(nativeSelectionHidden))
      this.mustEnforceCursorAssoc = true;
  }
  measure() {
    let { view } = this, dom = view.contentDOM, style = window.getComputedStyle(dom);
    let oracle = this.heightOracle;
    let whiteSpace = style.whiteSpace;
    this.defaultTextDirection = style.direction == "rtl" ? Direction.RTL : Direction.LTR;
    let refresh = this.heightOracle.mustRefreshForWrapping(whiteSpace) || this.mustMeasureContent === "refresh";
    let domRect = dom.getBoundingClientRect();
    let measureContent = refresh || this.mustMeasureContent || this.contentDOMHeight != domRect.height;
    this.contentDOMHeight = domRect.height;
    this.mustMeasureContent = false;
    let result = 0, bias = 0;
    if (domRect.width && domRect.height) {
      let { scaleX, scaleY } = getScale(dom, domRect);
      if (scaleX > 5e-3 && Math.abs(this.scaleX - scaleX) > 5e-3 || scaleY > 5e-3 && Math.abs(this.scaleY - scaleY) > 5e-3) {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        result |= 16;
        refresh = measureContent = true;
      }
    }
    let paddingTop = (parseInt(style.paddingTop) || 0) * this.scaleY;
    let paddingBottom = (parseInt(style.paddingBottom) || 0) * this.scaleY;
    if (this.paddingTop != paddingTop || this.paddingBottom != paddingBottom) {
      this.paddingTop = paddingTop;
      this.paddingBottom = paddingBottom;
      result |= 16 | 2;
    }
    if (this.editorWidth != view.scrollDOM.clientWidth) {
      if (oracle.lineWrapping)
        measureContent = true;
      this.editorWidth = view.scrollDOM.clientWidth;
      result |= 16;
    }
    let scrollParent = scrollableParents(this.view.contentDOM, false).y;
    if (scrollParent != this.scrollParent) {
      this.scrollParent = scrollParent;
      this.scrollAnchorHeight = -1;
      this.scrollOffset = 0;
    }
    let scrollOffset = this.getScrollOffset();
    if (this.scrollOffset != scrollOffset) {
      this.scrollAnchorHeight = -1;
      this.scrollOffset = scrollOffset;
    }
    this.scrolledToBottom = isScrolledToBottom(this.scrollParent || view.win);
    let pixelViewport = (this.printing ? fullPixelRange : visiblePixelRange)(dom, this.paddingTop);
    let dTop = pixelViewport.top - this.pixelViewport.top, dBottom = pixelViewport.bottom - this.pixelViewport.bottom;
    this.pixelViewport = pixelViewport;
    let inView = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
    if (inView != this.inView) {
      this.inView = inView;
      if (inView)
        measureContent = true;
    }
    if (!this.inView && !this.scrollTarget && !inWindow(view.dom))
      return 0;
    let contentWidth = domRect.width;
    if (this.contentDOMWidth != contentWidth || this.editorHeight != view.scrollDOM.clientHeight) {
      this.contentDOMWidth = domRect.width;
      this.editorHeight = view.scrollDOM.clientHeight;
      result |= 16;
    }
    if (measureContent) {
      let lineHeights = view.docView.measureVisibleLineHeights(this.viewport);
      if (oracle.mustRefreshForHeights(lineHeights))
        refresh = true;
      if (refresh || oracle.lineWrapping && Math.abs(contentWidth - this.contentDOMWidth) > oracle.charWidth) {
        let { lineHeight, charWidth, textHeight } = view.docView.measureTextSize();
        refresh = lineHeight > 0 && oracle.refresh(whiteSpace, lineHeight, charWidth, textHeight, Math.max(5, contentWidth / charWidth), lineHeights);
        if (refresh) {
          view.docView.minWidth = 0;
          result |= 16;
        }
      }
      if (dTop > 0 && dBottom > 0)
        bias = Math.max(dTop, dBottom);
      else if (dTop < 0 && dBottom < 0)
        bias = Math.min(dTop, dBottom);
      clearHeightChangeFlag();
      for (let vp of this.viewports) {
        let heights = vp.from == this.viewport.from ? lineHeights : view.docView.measureVisibleLineHeights(vp);
        this.heightMap = (refresh ? HeightMap.empty().applyChanges(this.stateDeco, Text.empty, this.heightOracle, [new ChangedRange(0, 0, 0, view.state.doc.length)]) : this.heightMap).updateHeight(oracle, 0, refresh, new MeasuredHeights(vp.from, heights));
      }
      if (heightChangeFlag)
        result |= 2;
    }
    let viewportChange = !this.viewportIsAppropriate(this.viewport, bias) || this.scrollTarget && (this.scrollTarget.range.head < this.viewport.from || this.scrollTarget.range.head > this.viewport.to);
    if (viewportChange) {
      if (result & 2)
        result |= this.updateScaler();
      this.viewport = this.getViewport(bias, this.scrollTarget);
      result |= this.updateForViewport();
    }
    if (result & 2 || viewportChange)
      this.updateViewportLines();
    if (this.lineGaps.length || this.viewport.to - this.viewport.from > 2e3 << 1)
      this.updateLineGaps(this.ensureLineGaps(refresh ? [] : this.lineGaps, view));
    result |= this.computeVisibleRanges();
    if (this.mustEnforceCursorAssoc) {
      this.mustEnforceCursorAssoc = false;
      view.docView.enforceCursorAssoc();
    }
    return result;
  }
  get visibleTop() {
    return this.scaler.fromDOM(this.pixelViewport.top);
  }
  get visibleBottom() {
    return this.scaler.fromDOM(this.pixelViewport.bottom);
  }
  getViewport(bias, scrollTarget) {
    let marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / 1e3 / 2));
    let map = this.heightMap, oracle = this.heightOracle;
    let { visibleTop, visibleBottom } = this;
    let viewport = new Viewport(map.lineAt(visibleTop - marginTop * 1e3, QueryType$1.ByHeight, oracle, 0, 0).from, map.lineAt(visibleBottom + (1 - marginTop) * 1e3, QueryType$1.ByHeight, oracle, 0, 0).to);
    if (scrollTarget) {
      let { head } = scrollTarget.range;
      if (head < viewport.from || head > viewport.to) {
        let viewHeight = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top);
        let block = map.lineAt(head, QueryType$1.ByPos, oracle, 0, 0), topPos;
        if (scrollTarget.y == "center")
          topPos = (block.top + block.bottom) / 2 - viewHeight / 2;
        else if (scrollTarget.y == "start" || scrollTarget.y == "nearest" && head < viewport.from)
          topPos = block.top;
        else
          topPos = block.bottom - viewHeight;
        viewport = new Viewport(map.lineAt(topPos - 1e3 / 2, QueryType$1.ByHeight, oracle, 0, 0).from, map.lineAt(topPos + viewHeight + 1e3 / 2, QueryType$1.ByHeight, oracle, 0, 0).to);
      }
    }
    return viewport;
  }
  mapViewport(viewport, changes) {
    let from = changes.mapPos(viewport.from, -1), to = changes.mapPos(viewport.to, 1);
    return new Viewport(this.heightMap.lineAt(from, QueryType$1.ByPos, this.heightOracle, 0, 0).from, this.heightMap.lineAt(to, QueryType$1.ByPos, this.heightOracle, 0, 0).to);
  }
  // Checks if a given viewport covers the visible part of the
  // document and not too much beyond that.
  viewportIsAppropriate({ from, to }, bias = 0) {
    if (!this.inView)
      return true;
    let { top: top2 } = this.heightMap.lineAt(from, QueryType$1.ByPos, this.heightOracle, 0, 0);
    let { bottom } = this.heightMap.lineAt(to, QueryType$1.ByPos, this.heightOracle, 0, 0);
    let { visibleTop, visibleBottom } = this;
    return (from == 0 || top2 <= visibleTop - Math.max(10, Math.min(
      -bias,
      250
      /* VP.MaxCoverMargin */
    ))) && (to == this.state.doc.length || bottom >= visibleBottom + Math.max(10, Math.min(
      bias,
      250
      /* VP.MaxCoverMargin */
    ))) && (top2 > visibleTop - 2 * 1e3 && bottom < visibleBottom + 2 * 1e3);
  }
  mapLineGaps(gaps, changes) {
    if (!gaps.length || changes.empty)
      return gaps;
    let mapped = [];
    for (let gap of gaps)
      if (!changes.touchesRange(gap.from, gap.to))
        mapped.push(new LineGap(changes.mapPos(gap.from), changes.mapPos(gap.to), gap.size, gap.displaySize));
    return mapped;
  }
  // Computes positions in the viewport where the start or end of a
  // line should be hidden, trying to reuse existing line gaps when
  // appropriate to avoid unneccesary redraws.
  // Uses crude character-counting for the positioning and sizing,
  // since actual DOM coordinates aren't always available and
  // predictable. Relies on generous margins (see LG.Margin) to hide
  // the artifacts this might produce from the user.
  ensureLineGaps(current, mayMeasure) {
    let wrapping = this.heightOracle.lineWrapping;
    let margin = wrapping ? 1e4 : 2e3, halfMargin = margin >> 1, doubleMargin = margin << 1;
    if (this.defaultTextDirection != Direction.LTR && !wrapping)
      return [];
    let gaps = [];
    let addGap = (from, to, line, structure) => {
      if (to - from < halfMargin)
        return;
      let sel = this.state.selection.main, avoid = [sel.from];
      if (!sel.empty)
        avoid.push(sel.to);
      for (let pos of avoid) {
        if (pos > from && pos < to) {
          addGap(from, pos - 10, line, structure);
          addGap(pos + 10, to, line, structure);
          return;
        }
      }
      let gap = find(current, (gap2) => gap2.from >= line.from && gap2.to <= line.to && Math.abs(gap2.from - from) < halfMargin && Math.abs(gap2.to - to) < halfMargin && !avoid.some((pos) => gap2.from < pos && gap2.to > pos));
      if (!gap) {
        if (to < line.to && mayMeasure && wrapping && mayMeasure.visibleRanges.some((r) => r.from <= to && r.to >= to)) {
          let lineStart = mayMeasure.moveToLineBoundary(EditorSelection.cursor(to), false, true).head;
          if (lineStart > from)
            to = lineStart;
        }
        let size = this.gapSize(line, from, to, structure);
        let displaySize = wrapping || size < 2e6 ? size : 2e6;
        gap = new LineGap(from, to, size, displaySize);
      }
      gaps.push(gap);
    };
    let checkLine = (line) => {
      if (line.length < doubleMargin || line.type != BlockType.Text)
        return;
      let structure = lineStructure(line.from, line.to, this.stateDeco);
      if (structure.total < doubleMargin)
        return;
      let target = this.scrollTarget ? this.scrollTarget.range.head : null;
      let viewFrom, viewTo;
      if (wrapping) {
        let marginHeight = margin / this.heightOracle.lineLength * this.heightOracle.lineHeight;
        let top2, bot;
        if (target != null) {
          let targetFrac = findFraction(structure, target);
          let spaceFrac = ((this.visibleBottom - this.visibleTop) / 2 + marginHeight) / line.height;
          top2 = targetFrac - spaceFrac;
          bot = targetFrac + spaceFrac;
        } else {
          top2 = (this.visibleTop - line.top - marginHeight) / line.height;
          bot = (this.visibleBottom - line.top + marginHeight) / line.height;
        }
        viewFrom = findPosition(structure, top2);
        viewTo = findPosition(structure, bot);
      } else {
        let totalWidth = structure.total * this.heightOracle.charWidth;
        let marginWidth = margin * this.heightOracle.charWidth;
        let horizOffset = 0;
        if (totalWidth > 2e6)
          for (let old of current) {
            if (old.from >= line.from && old.from < line.to && old.size != old.displaySize && old.from * this.heightOracle.charWidth + horizOffset < this.pixelViewport.left)
              horizOffset = old.size - old.displaySize;
          }
        let pxLeft = this.pixelViewport.left + horizOffset, pxRight = this.pixelViewport.right + horizOffset;
        let left, right;
        if (target != null) {
          let targetFrac = findFraction(structure, target);
          let spaceFrac = ((pxRight - pxLeft) / 2 + marginWidth) / totalWidth;
          left = targetFrac - spaceFrac;
          right = targetFrac + spaceFrac;
        } else {
          left = (pxLeft - marginWidth) / totalWidth;
          right = (pxRight + marginWidth) / totalWidth;
        }
        viewFrom = findPosition(structure, left);
        viewTo = findPosition(structure, right);
      }
      if (viewFrom > line.from)
        addGap(line.from, viewFrom, line, structure);
      if (viewTo < line.to)
        addGap(viewTo, line.to, line, structure);
    };
    for (let line of this.viewportLines) {
      if (Array.isArray(line.type))
        line.type.forEach(checkLine);
      else
        checkLine(line);
    }
    return gaps;
  }
  gapSize(line, from, to, structure) {
    let fraction = findFraction(structure, to) - findFraction(structure, from);
    if (this.heightOracle.lineWrapping) {
      return line.height * fraction;
    } else {
      return structure.total * this.heightOracle.charWidth * fraction;
    }
  }
  updateLineGaps(gaps) {
    if (!LineGap.same(gaps, this.lineGaps)) {
      this.lineGaps = gaps;
      this.lineGapDeco = Decoration.set(gaps.map((gap) => gap.draw(this, this.heightOracle.lineWrapping)));
    }
  }
  computeVisibleRanges(changes) {
    let deco = this.stateDeco;
    if (this.lineGaps.length)
      deco = deco.concat(this.lineGapDeco);
    let ranges = [];
    RangeSet.spans(deco, this.viewport.from, this.viewport.to, {
      span(from, to) {
        ranges.push({ from, to });
      },
      point() {
      }
    }, 20);
    let changed = 0;
    if (ranges.length != this.visibleRanges.length) {
      changed = 8 | 4;
    } else {
      for (let i2 = 0; i2 < ranges.length && !(changed & 8); i2++) {
        let old = this.visibleRanges[i2], nw = ranges[i2];
        if (old.from != nw.from || old.to != nw.to) {
          changed |= 4;
          if (!(changes && changes.mapPos(old.from, -1) == nw.from && changes.mapPos(old.to, 1) == nw.to))
            changed |= 8;
        }
      }
    }
    this.visibleRanges = ranges;
    return changed;
  }
  lineBlockAt(pos) {
    return pos >= this.viewport.from && pos <= this.viewport.to && this.viewportLines.find((b) => b.from <= pos && b.to >= pos) || scaleBlock(this.heightMap.lineAt(pos, QueryType$1.ByPos, this.heightOracle, 0, 0), this.scaler);
  }
  lineBlockAtHeight(height) {
    return height >= this.viewportLines[0].top && height <= this.viewportLines[this.viewportLines.length - 1].bottom && this.viewportLines.find((l) => l.top <= height && l.bottom >= height) || scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height), QueryType$1.ByHeight, this.heightOracle, 0, 0), this.scaler);
  }
  getScrollOffset() {
    return this.scrollParent == this.view.scrollDOM ? this.scrollParent.scrollTop * this.scaleY : (this.scrollParent ? this.scrollParent.getBoundingClientRect().top : 0) - this.view.contentDOM.getBoundingClientRect().top;
  }
  scrollAnchorAt(scrollOffset) {
    let block = this.lineBlockAtHeight(scrollOffset + 12 - this.paddingTop);
    return block.from >= this.viewport.from || this.viewportLines[0].top - scrollOffset > 200 ? block : this.viewportLines[0];
  }
  elementAtHeight(height) {
    return scaleBlock(this.heightMap.blockAt(this.scaler.fromDOM(height), this.heightOracle, 0, 0), this.scaler);
  }
  get docHeight() {
    return this.scaler.toDOM(this.heightMap.height);
  }
  get contentHeight() {
    return this.docHeight + this.paddingTop + this.paddingBottom;
  }
}
class Viewport {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
}
function lineStructure(from, to, stateDeco) {
  let ranges = [], pos = from, total = 0;
  RangeSet.spans(stateDeco, from, to, {
    span() {
    },
    point(from2, to2) {
      if (from2 > pos) {
        ranges.push({ from: pos, to: from2 });
        total += from2 - pos;
      }
      pos = to2;
    }
  }, 20);
  if (pos < to) {
    ranges.push({ from: pos, to });
    total += to - pos;
  }
  return { total, ranges };
}
function findPosition({ total, ranges }, ratio) {
  if (ratio <= 0)
    return ranges[0].from;
  if (ratio >= 1)
    return ranges[ranges.length - 1].to;
  let dist2 = Math.floor(total * ratio);
  for (let i2 = 0; ; i2++) {
    let { from, to } = ranges[i2], size = to - from;
    if (dist2 <= size)
      return from + dist2;
    dist2 -= size;
  }
}
function findFraction(structure, pos) {
  let counted = 0;
  for (let { from, to } of structure.ranges) {
    if (pos <= to) {
      counted += pos - from;
      break;
    }
    counted += to - from;
  }
  return counted / structure.total;
}
function find(array, f) {
  for (let val of array)
    if (f(val))
      return val;
  return void 0;
}
const IdScaler = {
  toDOM(n) {
    return n;
  },
  fromDOM(n) {
    return n;
  },
  scale: 1,
  eq(other) {
    return other == this;
  }
};
function staticDeco(state2) {
  let deco = state2.facet(decorations).filter((d) => typeof d != "function");
  let outer = state2.facet(outerDecorations).filter((d) => typeof d != "function");
  if (outer.length)
    deco.push(RangeSet.join(outer));
  return deco;
}
class BigScaler {
  constructor(scale, viewports) {
    this.scale = scale;
    this.viewports = viewports;
  }
  static get(oracle, heightMap, viewports) {
    let vpHeight = 0, base2 = 0, domBase = 0;
    let vps = viewports.map(({ from, to }) => {
      let top2 = heightMap.lineAt(from, QueryType$1.ByPos, oracle, 0, 0).top;
      let bottom = heightMap.lineAt(to, QueryType$1.ByPos, oracle, 0, 0).bottom;
      vpHeight += bottom - top2;
      return { from, to, top: top2, bottom, domTop: 0, domBottom: 0 };
    });
    if (heightMap.height - vpHeight < 10)
      return IdScaler;
    let scale = (7e6 - vpHeight) / (heightMap.height - vpHeight);
    for (let obj of vps) {
      obj.domTop = domBase + (obj.top - base2) * scale;
      domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
      base2 = obj.bottom;
    }
    return new BigScaler(scale, vps);
  }
  toDOM(n) {
    for (let i2 = 0, base2 = 0, domBase = 0; ; i2++) {
      let vp = i2 < this.viewports.length ? this.viewports[i2] : null;
      if (!vp || n < vp.top)
        return domBase + (n - base2) * this.scale;
      if (n <= vp.bottom)
        return vp.domTop + (n - vp.top);
      base2 = vp.bottom;
      domBase = vp.domBottom;
    }
  }
  fromDOM(n) {
    for (let i2 = 0, base2 = 0, domBase = 0; ; i2++) {
      let vp = i2 < this.viewports.length ? this.viewports[i2] : null;
      if (!vp || n < vp.domTop)
        return base2 + (n - domBase) / this.scale;
      if (n <= vp.domBottom)
        return vp.top + (n - vp.domTop);
      base2 = vp.bottom;
      domBase = vp.domBottom;
    }
  }
  eq(other) {
    if (!(other instanceof BigScaler))
      return false;
    return this.scale == other.scale && this.viewports.length == other.viewports.length && this.viewports.every((vp, i2) => vp.from == other.viewports[i2].from && vp.to == other.viewports[i2].to);
  }
}
function scaleBlock(block, scaler) {
  if (scaler.scale == 1)
    return block;
  let bTop = scaler.toDOM(block.top), bBottom = scaler.toDOM(block.bottom);
  return new BlockInfo(block.from, block.length, bTop, bBottom - bTop, Array.isArray(block._content) ? block._content.map((b) => scaleBlock(b, scaler)) : block._content);
}
const theme = /* @__PURE__ */ Facet.define({ combine: (strs) => strs.join(" ") });
const darkTheme = /* @__PURE__ */ Facet.define({ combine: (values) => values.indexOf(true) > -1 });
const baseThemeID = /* @__PURE__ */ StyleModule.newName(), baseLightID = /* @__PURE__ */ StyleModule.newName(), baseDarkID = /* @__PURE__ */ StyleModule.newName();
const lightDarkIDs = { "&light": "." + baseLightID, "&dark": "." + baseDarkID };
function buildTheme(main, spec, scopes) {
  return new StyleModule(spec, {
    finish(sel) {
      return /&/.test(sel) ? sel.replace(/&\w*/, (m) => {
        if (m == "&")
          return main;
        if (!scopes || !scopes[m])
          throw new RangeError(`Unsupported selector: ${m}`);
        return scopes[m];
      }) : main + " " + sel;
    }
  });
}
const baseTheme$1$2 = /* @__PURE__ */ buildTheme("." + baseThemeID, {
  "&": {
    position: "relative !important",
    boxSizing: "border-box",
    "&.cm-focused": {
      // Provide a simple default outline to make sure a focused
      // editor is visually distinct. Can't leave the default behavior
      // because that will apply to the content element, which is
      // inside the scrollable container and doesn't include the
      // gutters. We also can't use an 'auto' outline, since those
      // are, for some reason, drawn behind the element content, which
      // will cause things like the active line background to cover
      // the outline (#297).
      outline: "1px dotted #212121"
    },
    display: "flex !important",
    flexDirection: "column"
  },
  ".cm-scroller": {
    display: "flex !important",
    alignItems: "flex-start !important",
    fontFamily: "monospace",
    lineHeight: 1.4,
    height: "100%",
    overflowX: "auto",
    position: "relative",
    zIndex: 0,
    overflowAnchor: "none"
  },
  ".cm-content": {
    margin: 0,
    flexGrow: 2,
    flexShrink: 0,
    display: "block",
    whiteSpace: "pre",
    wordWrap: "normal",
    // Issue #456
    boxSizing: "border-box",
    minHeight: "100%",
    padding: "4px 0",
    outline: "none",
    "&[contenteditable=true]": {
      WebkitUserModify: "read-write-plaintext-only"
    }
  },
  ".cm-lineWrapping": {
    whiteSpace_fallback: "pre-wrap",
    // For IE
    whiteSpace: "break-spaces",
    wordBreak: "break-word",
    // For Safari, which doesn't support overflow-wrap: anywhere
    overflowWrap: "anywhere",
    flexShrink: 1
  },
  "&light .cm-content": { caretColor: "black" },
  "&dark .cm-content": { caretColor: "white" },
  ".cm-line": {
    display: "block",
    padding: "0 2px 0 6px"
  },
  ".cm-layer": {
    userSelect: "none",
    // #1708
    position: "absolute",
    left: 0,
    top: 0,
    contain: "size style",
    "& > *": {
      position: "absolute"
    }
  },
  "&light .cm-selectionBackground": {
    background: "#d9d9d9"
  },
  "&dark .cm-selectionBackground": {
    background: "#222"
  },
  "&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "#d7d4f0"
  },
  "&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "#233"
  },
  ".cm-cursorLayer": {
    pointerEvents: "none"
  },
  "&.cm-focused > .cm-scroller > .cm-cursorLayer": {
    animation: "steps(1) cm-blink 1.2s infinite"
  },
  // Two animations defined so that we can switch between them to
  // restart the animation without forcing another style
  // recomputation.
  "@keyframes cm-blink": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
  "@keyframes cm-blink2": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
  ".cm-cursor, .cm-dropCursor": {
    borderLeft: "1.2px solid black",
    marginLeft: "-0.6px",
    pointerEvents: "none"
  },
  ".cm-cursor": {
    display: "none"
  },
  "&dark .cm-cursor": {
    borderLeftColor: "#ddd"
  },
  ".cm-selectionHandle": {
    backgroundColor: "currentColor",
    width: "1.5px"
  },
  ".cm-selectionHandle-start::before, .cm-selectionHandle-end::before": {
    content: '""',
    backgroundColor: "inherit",
    borderRadius: "50%",
    width: "8px",
    height: "8px",
    position: "absolute",
    left: "-3.25px"
  },
  ".cm-selectionHandle-start::before": { top: "-8px" },
  ".cm-selectionHandle-end::before": { bottom: "-8px" },
  ".cm-dropCursor": {
    position: "absolute"
  },
  "&.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor": {
    display: "block"
  },
  ".cm-iso": {
    unicodeBidi: "isolate"
  },
  ".cm-announced": {
    position: "fixed",
    top: "-10000px"
  },
  "@media print": {
    ".cm-announced": { display: "none" }
  },
  "&light .cm-activeLine": { backgroundColor: "#cceeff44" },
  "&dark .cm-activeLine": { backgroundColor: "#99eeff33" },
  "&light .cm-specialChar": { color: "red" },
  "&dark .cm-specialChar": { color: "#f78" },
  ".cm-gutters": {
    flexShrink: 0,
    display: "flex",
    height: "100%",
    boxSizing: "border-box",
    zIndex: 200
  },
  ".cm-gutters-before": { insetInlineStart: 0 },
  ".cm-gutters-after": { insetInlineEnd: 0 },
  "&light .cm-gutters": {
    backgroundColor: "#f5f5f5",
    color: "#6c6c6c",
    border: "0px solid #ddd",
    "&.cm-gutters-before": { borderRightWidth: "1px" },
    "&.cm-gutters-after": { borderLeftWidth: "1px" }
  },
  "&dark .cm-gutters": {
    backgroundColor: "#333338",
    color: "#ccc"
  },
  ".cm-gutter": {
    display: "flex !important",
    // Necessary -- prevents margin collapsing
    flexDirection: "column",
    flexShrink: 0,
    boxSizing: "border-box",
    minHeight: "100%",
    overflow: "hidden"
  },
  ".cm-gutterElement": {
    boxSizing: "border-box"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 3px 0 5px",
    minWidth: "20px",
    textAlign: "right",
    whiteSpace: "nowrap"
  },
  "&light .cm-activeLineGutter": {
    backgroundColor: "#e2f2ff"
  },
  "&dark .cm-activeLineGutter": {
    backgroundColor: "#222227"
  },
  ".cm-panels": {
    boxSizing: "border-box",
    position: "sticky",
    left: 0,
    right: 0,
    zIndex: 300
  },
  "&light .cm-panels": {
    backgroundColor: "#f5f5f5",
    color: "black"
  },
  ".cm-panels-top": { top: "0" },
  ".cm-panels-bottom": { bottom: "0" },
  "&light .cm-panels-top": {
    borderBottom: "1px solid #ddd"
  },
  "&light .cm-panels-bottom": {
    borderTop: "1px solid #ddd"
  },
  "&dark .cm-panels": {
    backgroundColor: "#333338",
    color: "white"
  },
  ".cm-dialog": {
    padding: "2px 19px 4px 6px",
    position: "relative",
    "& label": { fontSize: "80%" }
  },
  ".cm-dialog-close": {
    position: "absolute",
    top: "3px",
    right: "4px",
    backgroundColor: "inherit",
    border: "none",
    font: "inherit",
    fontSize: "14px",
    padding: "0"
  },
  ".cm-tab": {
    display: "inline-block",
    overflow: "hidden",
    verticalAlign: "bottom"
  },
  ".cm-widgetBuffer": {
    verticalAlign: "baseline",
    height: "1em",
    width: 0,
    display: "inline"
  },
  ".cm-placeholder": {
    color: "#888",
    display: "inline-block",
    verticalAlign: "top",
    userSelect: "none"
  },
  ".cm-highlightSpace": {
    background: "radial-gradient(circle at 50% 55%, #aaa 20%, transparent 0) no-repeat",
    backgroundSize: ".4em",
    backgroundPosition: "calc(min(50%, 0px)) center"
  },
  ".cm-highlightTab": {
    backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><path stroke="%23888" stroke-width="1" fill="none" d="M1 10H196L190 5M190 15L196 10M197 4L197 16"/></svg>')`,
    backgroundSize: "auto 100%",
    backgroundPosition: "right 90%",
    backgroundRepeat: "no-repeat"
  },
  ".cm-trailingSpace": {
    backgroundColor: "#ff332255"
  },
  ".cm-button": {
    verticalAlign: "middle",
    color: "inherit",
    fontSize: "70%",
    padding: ".2em 1em",
    borderRadius: "1px"
  },
  "&light .cm-button": {
    backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
    border: "1px solid #888",
    "&:active": {
      backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)"
    }
  },
  "&dark .cm-button": {
    backgroundImage: "linear-gradient(#393939, #111)",
    border: "1px solid #888",
    "&:active": {
      backgroundImage: "linear-gradient(#111, #333)"
    }
  },
  ".cm-textfield": {
    verticalAlign: "middle",
    color: "inherit",
    fontSize: "70%",
    border: "1px solid silver",
    padding: ".2em .5em"
  },
  "&light .cm-textfield": {
    backgroundColor: "white"
  },
  "&dark .cm-textfield": {
    border: "1px solid #555",
    backgroundColor: "inherit"
  }
}, lightDarkIDs);
const observeOptions = {
  childList: true,
  characterData: true,
  subtree: true,
  attributes: true,
  characterDataOldValue: true
};
const useCharData = browser.ie && browser.ie_version <= 11;
class DOMObserver {
  constructor(view) {
    this.view = view;
    this.active = false;
    this.editContext = null;
    this.selectionRange = new DOMSelectionState();
    this.selectionChanged = false;
    this.delayedFlush = -1;
    this.resizeTimeout = -1;
    this.queue = [];
    this.delayedAndroidKey = null;
    this.flushingAndroidKey = -1;
    this.lastChange = 0;
    this.scrollTargets = [];
    this.intersection = null;
    this.resizeScroll = null;
    this.intersecting = false;
    this.gapIntersection = null;
    this.gaps = [];
    this.printQuery = null;
    this.parentCheck = -1;
    this.dom = view.contentDOM;
    this.observer = new MutationObserver((mutations) => {
      for (let mut of mutations)
        this.queue.push(mut);
      if ((browser.ie && browser.ie_version <= 11 || browser.ios && view.composing) && mutations.some((m) => m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length))
        this.flushSoon();
      else
        this.flush();
    });
    if (window.EditContext && browser.android && view.constructor.EDIT_CONTEXT !== false && // Chrome <126 doesn't support inverted selections in edit context (#1392)
    !(browser.chrome && browser.chrome_version < 126)) {
      this.editContext = new EditContextManager(view);
      if (view.state.facet(editable))
        view.contentDOM.editContext = this.editContext.editContext;
    }
    if (useCharData)
      this.onCharData = (event) => {
        this.queue.push({
          target: event.target,
          type: "characterData",
          oldValue: event.prevValue
        });
        this.flushSoon();
      };
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onPrint = this.onPrint.bind(this);
    this.onScroll = this.onScroll.bind(this);
    if (window.matchMedia)
      this.printQuery = window.matchMedia("print");
    if (typeof ResizeObserver == "function") {
      this.resizeScroll = new ResizeObserver(() => {
        var _a2;
        if (((_a2 = this.view.docView) === null || _a2 === void 0 ? void 0 : _a2.lastUpdate) < Date.now() - 75)
          this.onResize();
      });
      this.resizeScroll.observe(view.scrollDOM);
    }
    this.addWindowListeners(this.win = view.win);
    this.start();
    if (typeof IntersectionObserver == "function") {
      this.intersection = new IntersectionObserver((entries) => {
        if (this.parentCheck < 0)
          this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1e3);
        if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0 != this.intersecting) {
          this.intersecting = !this.intersecting;
          if (this.intersecting != this.view.inView)
            this.onScrollChanged(document.createEvent("Event"));
        }
      }, { threshold: [0, 1e-3] });
      this.intersection.observe(this.dom);
      this.gapIntersection = new IntersectionObserver((entries) => {
        if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0)
          this.onScrollChanged(document.createEvent("Event"));
      }, {});
    }
    this.listenForScroll();
    this.readSelectionRange();
  }
  onScrollChanged(e) {
    this.view.inputState.runHandlers("scroll", e);
    if (this.intersecting)
      this.view.measure();
  }
  onScroll(e) {
    if (this.intersecting)
      this.flush(this.pendingRecords().length > 0);
    if (this.editContext)
      this.view.requestMeasure(this.editContext.measureReq);
    this.onScrollChanged(e);
  }
  onResize() {
    if (this.resizeTimeout < 0)
      this.resizeTimeout = setTimeout(() => {
        this.resizeTimeout = -1;
        this.view.requestMeasure();
      }, 50);
  }
  onPrint(event) {
    if ((event.type == "change" || !event.type) && !event.matches)
      return;
    this.view.viewState.printing = true;
    this.view.measure();
    setTimeout(() => {
      this.view.viewState.printing = false;
      this.view.requestMeasure();
    }, 500);
  }
  updateGaps(gaps) {
    if (this.gapIntersection && (gaps.length != this.gaps.length || this.gaps.some((g, i2) => g != gaps[i2]))) {
      this.gapIntersection.disconnect();
      for (let gap of gaps)
        this.gapIntersection.observe(gap);
      this.gaps = gaps;
    }
  }
  onSelectionChange(event) {
    let wasChanged = this.selectionChanged;
    if (!this.readSelectionRange() || this.delayedAndroidKey)
      return;
    let { view } = this, sel = this.selectionRange;
    if (view.state.facet(editable) ? view.root.activeElement != this.dom : !hasSelection(this.dom, sel))
      return;
    let context = sel.anchorNode && view.docView.tile.nearest(sel.anchorNode);
    if (context && context.isWidget() && context.widget.ignoreEvent(event)) {
      if (!wasChanged)
        this.selectionChanged = false;
      return;
    }
    if ((browser.ie && browser.ie_version <= 11 || browser.android && browser.chrome) && !view.state.selection.main.empty && // (Selection.isCollapsed isn't reliable on IE)
    sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
      this.flushSoon();
    else
      this.flush(false);
  }
  readSelectionRange() {
    let { view } = this;
    let selection2 = getSelection(view.root);
    if (!selection2)
      return false;
    let range = browser.safari && view.root.nodeType == 11 && view.root.activeElement == this.dom && safariSelectionRangeHack(this.view, selection2) || selection2;
    if (!range || this.selectionRange.eq(range))
      return false;
    let local = hasSelection(this.dom, range);
    if (local && !this.selectionChanged && view.inputState.lastFocusTime > Date.now() - 200 && view.inputState.lastTouchTime < Date.now() - 300 && atElementStart(this.dom, range)) {
      this.view.inputState.lastFocusTime = 0;
      view.docView.updateSelection();
      return false;
    }
    this.selectionRange.setRange(range);
    if (local)
      this.selectionChanged = true;
    return true;
  }
  setSelectionRange(anchor, head) {
    this.selectionRange.set(anchor.node, anchor.offset, head.node, head.offset);
    this.selectionChanged = false;
  }
  clearSelectionRange() {
    this.selectionRange.set(null, 0, null, 0);
  }
  listenForScroll() {
    this.parentCheck = -1;
    let i2 = 0, changed = null;
    for (let dom = this.dom; dom; ) {
      if (isElt(dom)) {
        if (!changed && i2 < this.scrollTargets.length && this.scrollTargets[i2] == dom)
          i2++;
        else if (!changed)
          changed = this.scrollTargets.slice(0, i2);
        if (changed)
          changed.push(dom);
        dom = dom.assignedSlot || dom.parentNode;
      } else if (dom.nodeType == 11) {
        dom = dom.host;
      } else {
        break;
      }
    }
    if (i2 < this.scrollTargets.length && !changed)
      changed = this.scrollTargets.slice(0, i2);
    if (changed) {
      for (let dom of this.scrollTargets)
        dom.removeEventListener("scroll", this.onScroll);
      for (let dom of this.scrollTargets = changed)
        dom.addEventListener("scroll", this.onScroll);
    }
  }
  ignore(f) {
    if (!this.active)
      return f();
    try {
      this.stop();
      return f();
    } finally {
      this.start();
      this.clear();
    }
  }
  start() {
    if (this.active)
      return;
    this.observer.observe(this.dom, observeOptions);
    if (useCharData)
      this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
    this.active = true;
  }
  stop() {
    if (!this.active)
      return;
    this.active = false;
    this.observer.disconnect();
    if (useCharData)
      this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
  }
  // Throw away any pending changes
  clear() {
    this.processRecords();
    this.queue.length = 0;
    this.selectionChanged = false;
  }
  // Chrome Android, especially in combination with GBoard, not only
  // doesn't reliably fire regular key events, but also often
  // surrounds the effect of enter or backspace with a bunch of
  // composition events that, when interrupted, cause text duplication
  // or other kinds of corruption. This hack makes the editor back off
  // from handling DOM changes for a moment when such a key is
  // detected (via beforeinput or keydown), and then tries to flush
  // them or, if that has no effect, dispatches the given key.
  delayAndroidKey(key, keyCode) {
    var _a2;
    if (!this.delayedAndroidKey) {
      let flush = () => {
        let key2 = this.delayedAndroidKey;
        if (key2) {
          this.clearDelayedAndroidKey();
          this.view.inputState.lastKeyCode = key2.keyCode;
          this.view.inputState.lastKeyTime = Date.now();
          let flushed = this.flush();
          if (!flushed && key2.force)
            dispatchKey(this.dom, key2.key, key2.keyCode);
        }
      };
      this.flushingAndroidKey = this.view.win.requestAnimationFrame(flush);
    }
    if (!this.delayedAndroidKey || key == "Enter")
      this.delayedAndroidKey = {
        key,
        keyCode,
        // Only run the key handler when no changes are detected if
        // this isn't coming right after another change, in which case
        // it is probably part of a weird chain of updates, and should
        // be ignored if it returns the DOM to its previous state.
        force: this.lastChange < Date.now() - 50 || !!((_a2 = this.delayedAndroidKey) === null || _a2 === void 0 ? void 0 : _a2.force)
      };
  }
  clearDelayedAndroidKey() {
    this.win.cancelAnimationFrame(this.flushingAndroidKey);
    this.delayedAndroidKey = null;
    this.flushingAndroidKey = -1;
  }
  flushSoon() {
    if (this.delayedFlush < 0)
      this.delayedFlush = this.view.win.requestAnimationFrame(() => {
        this.delayedFlush = -1;
        this.flush();
      });
  }
  forceFlush() {
    if (this.delayedFlush >= 0) {
      this.view.win.cancelAnimationFrame(this.delayedFlush);
      this.delayedFlush = -1;
    }
    this.flush();
  }
  pendingRecords() {
    for (let mut of this.observer.takeRecords())
      this.queue.push(mut);
    return this.queue;
  }
  processRecords() {
    let records = this.pendingRecords();
    if (records.length)
      this.queue = [];
    let from = -1, to = -1, typeOver = false;
    for (let record of records) {
      let range = this.readMutation(record);
      if (!range)
        continue;
      if (range.typeOver)
        typeOver = true;
      if (from == -1) {
        ({ from, to } = range);
      } else {
        from = Math.min(range.from, from);
        to = Math.max(range.to, to);
      }
    }
    return { from, to, typeOver };
  }
  readChange() {
    let { from, to, typeOver } = this.processRecords();
    let newSel = this.selectionChanged && hasSelection(this.dom, this.selectionRange);
    if (from < 0 && !newSel)
      return null;
    if (from > -1)
      this.lastChange = Date.now();
    this.view.inputState.lastFocusTime = 0;
    this.selectionChanged = false;
    let change = new DOMChange(this.view, from, to, typeOver);
    this.view.docView.domChanged = { newSel: change.newSel ? change.newSel.main : null };
    return change;
  }
  // Apply pending changes, if any
  flush(readSelection = true) {
    if (this.delayedFlush >= 0 || this.delayedAndroidKey)
      return false;
    if (readSelection)
      this.readSelectionRange();
    let selChange = this.selectionChanged, domChange = this.readChange();
    if (!domChange) {
      this.view.requestMeasure();
      return false;
    }
    let startState = this.view.state;
    let handled = applyDOMChange(this.view, domChange);
    if (this.view.state == startState && (domChange.domChanged || selChange))
      this.view.update([]);
    return handled;
  }
  readMutation(rec) {
    let tile = this.view.docView.tile.nearest(rec.target);
    if (!tile || tile.isWidget())
      return null;
    tile.markDirty(rec.type == "attributes");
    if (rec.type == "childList") {
      let childBefore = findChild(tile, rec.previousSibling || rec.target.previousSibling, -1);
      let childAfter = findChild(tile, rec.nextSibling || rec.target.nextSibling, 1);
      return {
        from: childBefore ? tile.posAfter(childBefore) : tile.posAtStart,
        to: childAfter ? tile.posBefore(childAfter) : tile.posAtEnd,
        typeOver: false
      };
    } else if (rec.type == "characterData") {
      return { from: tile.posAtStart, to: tile.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
    } else {
      return null;
    }
  }
  setWindow(win) {
    if (win != this.win) {
      this.removeWindowListeners(this.win);
      this.win = win;
      this.addWindowListeners(this.win);
    }
  }
  addWindowListeners(win) {
    win.addEventListener("resize", this.onResize);
    if (this.printQuery) {
      if (this.printQuery.addEventListener)
        this.printQuery.addEventListener("change", this.onPrint);
      else
        this.printQuery.addListener(this.onPrint);
    } else
      win.addEventListener("beforeprint", this.onPrint);
    win.addEventListener("scroll", this.onScroll);
    win.document.addEventListener("selectionchange", this.onSelectionChange);
  }
  removeWindowListeners(win) {
    win.removeEventListener("scroll", this.onScroll);
    win.removeEventListener("resize", this.onResize);
    if (this.printQuery) {
      if (this.printQuery.removeEventListener)
        this.printQuery.removeEventListener("change", this.onPrint);
      else
        this.printQuery.removeListener(this.onPrint);
    } else
      win.removeEventListener("beforeprint", this.onPrint);
    win.document.removeEventListener("selectionchange", this.onSelectionChange);
  }
  update(update) {
    if (this.editContext) {
      this.editContext.update(update);
      if (update.startState.facet(editable) != update.state.facet(editable))
        update.view.contentDOM.editContext = update.state.facet(editable) ? this.editContext.editContext : null;
    }
  }
  destroy() {
    var _a2, _b, _c;
    this.stop();
    (_a2 = this.intersection) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
    (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
    (_c = this.resizeScroll) === null || _c === void 0 ? void 0 : _c.disconnect();
    for (let dom of this.scrollTargets)
      dom.removeEventListener("scroll", this.onScroll);
    this.removeWindowListeners(this.win);
    clearTimeout(this.parentCheck);
    clearTimeout(this.resizeTimeout);
    this.win.cancelAnimationFrame(this.delayedFlush);
    this.win.cancelAnimationFrame(this.flushingAndroidKey);
    if (this.editContext) {
      this.view.contentDOM.editContext = null;
      this.editContext.destroy();
    }
  }
}
function findChild(tile, dom, dir) {
  while (dom) {
    let curTile = Tile.get(dom);
    if (curTile && curTile.parent == tile)
      return curTile;
    let parent = dom.parentNode;
    dom = parent != tile.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
  }
  return null;
}
function buildSelectionRangeFromRange(view, range) {
  let anchorNode = range.startContainer, anchorOffset = range.startOffset;
  let focusNode = range.endContainer, focusOffset = range.endOffset;
  let curAnchor = view.docView.domAtPos(view.state.selection.main.anchor, 1);
  if (isEquivalentPosition(curAnchor.node, curAnchor.offset, focusNode, focusOffset))
    [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
  return { anchorNode, anchorOffset, focusNode, focusOffset };
}
function safariSelectionRangeHack(view, selection2) {
  if (selection2.getComposedRanges) {
    let range = selection2.getComposedRanges(view.root)[0];
    if (range)
      return buildSelectionRangeFromRange(view, range);
  }
  let found = null;
  function read(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    found = event.getTargetRanges()[0];
  }
  view.contentDOM.addEventListener("beforeinput", read, true);
  view.dom.ownerDocument.execCommand("indent");
  view.contentDOM.removeEventListener("beforeinput", read, true);
  return found ? buildSelectionRangeFromRange(view, found) : null;
}
class EditContextManager {
  constructor(view) {
    this.from = 0;
    this.to = 0;
    this.pendingContextChange = null;
    this.handlers = /* @__PURE__ */ Object.create(null);
    this.composing = null;
    this.resetRange(view.state);
    let context = this.editContext = new window.EditContext({
      text: view.state.doc.sliceString(this.from, this.to),
      selectionStart: this.toContextPos(Math.max(this.from, Math.min(this.to, view.state.selection.main.anchor))),
      selectionEnd: this.toContextPos(view.state.selection.main.head)
    });
    this.handlers.textupdate = (e) => {
      let main = view.state.selection.main, { anchor, head } = main;
      let from = this.toEditorPos(e.updateRangeStart), to = this.toEditorPos(e.updateRangeEnd);
      if (view.inputState.composing >= 0 && !this.composing)
        this.composing = { contextBase: e.updateRangeStart, editorBase: from, drifted: false };
      let deletes = to - from > e.text.length;
      if (from == this.from && anchor < this.from)
        from = anchor;
      else if (to == this.to && anchor > this.to)
        to = anchor;
      let diff = findDiff(view.state.sliceDoc(from, to), e.text, (deletes ? main.from : main.to) - from, deletes ? "end" : null);
      if (!diff) {
        let newSel = EditorSelection.single(this.toEditorPos(e.selectionStart), this.toEditorPos(e.selectionEnd));
        if (!sameSelPos(newSel, main))
          view.dispatch({ selection: newSel, userEvent: "select" });
        return;
      }
      let change = {
        from: diff.from + from,
        to: diff.toA + from,
        insert: Text.of(e.text.slice(diff.from, diff.toB).split("\n"))
      };
      if ((browser.mac || browser.android) && change.from == head - 1 && /^\. ?$/.test(e.text) && view.contentDOM.getAttribute("autocorrect") == "off")
        change = { from, to, insert: Text.of([e.text.replace(".", " ")]) };
      this.pendingContextChange = change;
      if (!view.state.readOnly) {
        let newLen = this.to - this.from + (change.to - change.from + change.insert.length);
        applyDOMChangeInner(view, change, EditorSelection.single(this.toEditorPos(e.selectionStart, newLen), this.toEditorPos(e.selectionEnd, newLen)));
      }
      if (this.pendingContextChange) {
        this.revertPending(view.state);
        this.setSelection(view.state);
      }
      if (change.from < change.to && !change.insert.length && view.inputState.composing >= 0 && !/[\\p{Alphabetic}\\p{Number}_]/.test(context.text.slice(Math.max(0, e.updateRangeStart - 1), Math.min(context.text.length, e.updateRangeStart + 1))))
        this.handlers.compositionend(e);
    };
    this.handlers.characterboundsupdate = (e) => {
      let rects = [], prev = null;
      for (let i2 = this.toEditorPos(e.rangeStart), end = this.toEditorPos(e.rangeEnd); i2 < end; i2++) {
        let rect = view.coordsForChar(i2);
        prev = rect && new DOMRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top) || prev || new DOMRect();
        rects.push(prev);
      }
      context.updateCharacterBounds(e.rangeStart, rects);
    };
    this.handlers.textformatupdate = (e) => {
      let deco = [];
      for (let format of e.getTextFormats()) {
        let lineStyle = format.underlineStyle, thickness = format.underlineThickness;
        if (!/none/i.test(lineStyle) && !/none/i.test(thickness)) {
          let from = this.toEditorPos(format.rangeStart), to = this.toEditorPos(format.rangeEnd);
          if (from < to) {
            let style = `text-decoration: underline ${/^[a-z]/.test(lineStyle) ? lineStyle + " " : lineStyle == "Dashed" ? "dashed " : lineStyle == "Squiggle" ? "wavy " : ""}${/thin/i.test(thickness) ? 1 : 2}px`;
            deco.push(Decoration.mark({ attributes: { style } }).range(from, to));
          }
        }
      }
      view.dispatch({ effects: setEditContextFormatting.of(Decoration.set(deco)) });
    };
    this.handlers.compositionstart = () => {
      if (view.inputState.composing < 0) {
        view.inputState.composing = 0;
        view.inputState.compositionFirstChange = true;
      }
    };
    this.handlers.compositionend = () => {
      view.inputState.composing = -1;
      view.inputState.compositionFirstChange = null;
      if (this.composing) {
        let { drifted } = this.composing;
        this.composing = null;
        if (drifted)
          this.reset(view.state);
      }
    };
    for (let event in this.handlers)
      context.addEventListener(event, this.handlers[event]);
    this.measureReq = { read: (view2) => {
      let sel = getSelection(view2.root);
      if (sel && sel.rangeCount)
        this.editContext.updateSelectionBounds(sel.getRangeAt(0).getBoundingClientRect());
    } };
  }
  applyEdits(update) {
    let off = 0, abort = false, pending = this.pendingContextChange;
    update.changes.iterChanges((fromA, toA, _fromB, _toB, insert2) => {
      if (abort)
        return;
      let dLen = insert2.length - (toA - fromA);
      if (pending && toA >= pending.to) {
        if (pending.from == fromA && pending.to == toA && pending.insert.eq(insert2)) {
          pending = this.pendingContextChange = null;
          off += dLen;
          this.to += dLen;
          return;
        } else {
          pending = null;
          this.revertPending(update.state);
        }
      }
      fromA += off;
      toA += off;
      if (toA <= this.from) {
        this.from += dLen;
        this.to += dLen;
      } else if (fromA < this.to) {
        if (fromA < this.from || toA > this.to || this.to - this.from + insert2.length > 3e4) {
          abort = true;
          return;
        }
        this.editContext.updateText(this.toContextPos(fromA), this.toContextPos(toA), insert2.toString());
        this.to += dLen;
      }
      off += dLen;
    });
    if (pending && !abort)
      this.revertPending(update.state);
    return !abort;
  }
  update(update) {
    let reverted = this.pendingContextChange, startSel = update.startState.selection.main;
    if (this.composing && (this.composing.drifted || !update.changes.touchesRange(startSel.from, startSel.to) && update.transactions.some((tr) => !tr.isUserEvent("input.type") && tr.changes.touchesRange(this.from, this.to)))) {
      this.composing.drifted = true;
      this.composing.editorBase = update.changes.mapPos(this.composing.editorBase);
    } else if (!this.applyEdits(update) || !this.rangeIsValid(update.state)) {
      this.pendingContextChange = null;
      this.reset(update.state);
    } else if (update.docChanged || update.selectionSet || reverted) {
      this.setSelection(update.state);
    }
    if (update.geometryChanged || update.docChanged || update.selectionSet)
      update.view.requestMeasure(this.measureReq);
  }
  resetRange(state2) {
    let { head } = state2.selection.main;
    this.from = Math.max(
      0,
      head - 1e4
      /* CxVp.Margin */
    );
    this.to = Math.min(
      state2.doc.length,
      head + 1e4
      /* CxVp.Margin */
    );
  }
  reset(state2) {
    this.resetRange(state2);
    this.editContext.updateText(0, this.editContext.text.length, state2.doc.sliceString(this.from, this.to));
    this.setSelection(state2);
  }
  revertPending(state2) {
    let pending = this.pendingContextChange;
    this.pendingContextChange = null;
    this.editContext.updateText(this.toContextPos(pending.from), this.toContextPos(pending.from + pending.insert.length), state2.doc.sliceString(pending.from, pending.to));
  }
  setSelection(state2) {
    let { main } = state2.selection;
    let start = this.toContextPos(Math.max(this.from, Math.min(this.to, main.anchor)));
    let end = this.toContextPos(main.head);
    if (this.editContext.selectionStart != start || this.editContext.selectionEnd != end)
      this.editContext.updateSelection(start, end);
  }
  rangeIsValid(state2) {
    let { head } = state2.selection.main;
    return !(this.from > 0 && head - this.from < 500 || this.to < state2.doc.length && this.to - head < 500 || this.to - this.from > 1e4 * 3);
  }
  toEditorPos(contextPos, clipLen = this.to - this.from) {
    contextPos = Math.min(contextPos, clipLen);
    let c = this.composing;
    return c && c.drifted ? c.editorBase + (contextPos - c.contextBase) : contextPos + this.from;
  }
  toContextPos(editorPos) {
    let c = this.composing;
    return c && c.drifted ? c.contextBase + (editorPos - c.editorBase) : editorPos - this.from;
  }
  destroy() {
    for (let event in this.handlers)
      this.editContext.removeEventListener(event, this.handlers[event]);
  }
}
class EditorView {
  /**
  The current editor state.
  */
  get state() {
    return this.viewState.state;
  }
  /**
  To be able to display large documents without consuming too much
  memory or overloading the browser, CodeMirror only draws the
  code that is visible (plus a margin around it) to the DOM. This
  property tells you the extent of the current drawn viewport, in
  document positions.
  */
  get viewport() {
    return this.viewState.viewport;
  }
  /**
  When there are, for example, large collapsed ranges in the
  viewport, its size can be a lot bigger than the actual visible
  content. Thus, if you are doing something like styling the
  content in the viewport, it is preferable to only do so for
  these ranges, which are the subset of the viewport that is
  actually drawn.
  */
  get visibleRanges() {
    return this.viewState.visibleRanges;
  }
  /**
  Returns false when the editor is entirely scrolled out of view
  or otherwise hidden.
  */
  get inView() {
    return this.viewState.inView;
  }
  /**
  Indicates whether the user is currently composing text via
  [IME](https://en.wikipedia.org/wiki/Input_method), and at least
  one change has been made in the current composition.
  */
  get composing() {
    return !!this.inputState && this.inputState.composing > 0;
  }
  /**
  Indicates whether the user is currently in composing state. Note
  that on some platforms, like Android, this will be the case a
  lot, since just putting the cursor on a word starts a
  composition there.
  */
  get compositionStarted() {
    return !!this.inputState && this.inputState.composing >= 0;
  }
  /**
  The document or shadow root that the view lives in.
  */
  get root() {
    return this._root;
  }
  /**
  @internal
  */
  get win() {
    return this.dom.ownerDocument.defaultView || window;
  }
  /**
  Construct a new view. You'll want to either provide a `parent`
  option, or put `view.dom` into your document after creating a
  view, so that the user can see the editor.
  */
  constructor(config2 = {}) {
    var _a2;
    this.plugins = [];
    this.pluginMap = /* @__PURE__ */ new Map();
    this.editorAttrs = {};
    this.contentAttrs = {};
    this.bidiCache = [];
    this.destroyed = false;
    this.updateState = 2;
    this.measureScheduled = -1;
    this.measureRequests = [];
    this.clearAnnouncement = -1;
    this.contentDOM = document.createElement("div");
    this.scrollDOM = document.createElement("div");
    this.scrollDOM.tabIndex = -1;
    this.scrollDOM.className = "cm-scroller";
    this.scrollDOM.appendChild(this.contentDOM);
    this.announceDOM = document.createElement("div");
    this.announceDOM.className = "cm-announced";
    this.announceDOM.setAttribute("aria-live", "polite");
    this.dom = document.createElement("div");
    this.dom.appendChild(this.announceDOM);
    this.dom.appendChild(this.scrollDOM);
    if (config2.parent)
      config2.parent.appendChild(this.dom);
    let { dispatch } = config2;
    this.dispatchTransactions = config2.dispatchTransactions || dispatch && ((trs) => trs.forEach((tr) => dispatch(tr, this))) || ((trs) => this.update(trs));
    this.dispatch = this.dispatch.bind(this);
    this._root = config2.root || getRoot(config2.parent) || document;
    this.viewState = new ViewState(this, config2.state || EditorState.create(config2));
    if (config2.scrollTo && config2.scrollTo.is(scrollIntoView$1))
      this.viewState.scrollTarget = config2.scrollTo.value.clip(this.viewState.state);
    this.plugins = this.state.facet(viewPlugin).map((spec) => new PluginInstance(spec));
    for (let plugin of this.plugins)
      plugin.update(this);
    this.observer = new DOMObserver(this);
    this.inputState = new InputState(this);
    this.inputState.ensureHandlers(this.plugins);
    this.docView = new DocView(this);
    this.mountStyles();
    this.updateAttrs();
    this.updateState = 0;
    this.requestMeasure();
    if ((_a2 = document.fonts) === null || _a2 === void 0 ? void 0 : _a2.ready)
      document.fonts.ready.then(() => {
        this.viewState.mustMeasureContent = "refresh";
        this.requestMeasure();
      });
  }
  dispatch(...input) {
    let trs = input.length == 1 && input[0] instanceof Transaction ? input : input.length == 1 && Array.isArray(input[0]) ? input[0] : [this.state.update(...input)];
    this.dispatchTransactions(trs, this);
  }
  /**
  Update the view for the given array of transactions. This will
  update the visible document and selection to match the state
  produced by the transactions, and notify view plugins of the
  change. You should usually call
  [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead, which uses this
  as a primitive.
  */
  update(transactions) {
    if (this.updateState != 0)
      throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
    let redrawn = false, attrsChanged = false, update;
    let state2 = this.state;
    for (let tr of transactions) {
      if (tr.startState != state2)
        throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
      state2 = tr.state;
    }
    if (this.destroyed) {
      this.viewState.state = state2;
      return;
    }
    let focus = this.hasFocus, focusFlag = 0, dispatchFocus = null;
    if (transactions.some((tr) => tr.annotation(isFocusChange))) {
      this.inputState.notifiedFocused = focus;
      focusFlag = 1;
    } else if (focus != this.inputState.notifiedFocused) {
      this.inputState.notifiedFocused = focus;
      dispatchFocus = focusChangeTransaction(state2, focus);
      if (!dispatchFocus)
        focusFlag = 1;
    }
    let pendingKey = this.observer.delayedAndroidKey, domChange = null;
    if (pendingKey) {
      this.observer.clearDelayedAndroidKey();
      domChange = this.observer.readChange();
      if (domChange && !this.state.doc.eq(state2.doc) || !this.state.selection.eq(state2.selection))
        domChange = null;
    } else {
      this.observer.clear();
    }
    if (state2.facet(EditorState.phrases) != this.state.facet(EditorState.phrases))
      return this.setState(state2);
    update = ViewUpdate.create(this, state2, transactions);
    update.flags |= focusFlag;
    let scrollTarget = this.viewState.scrollTarget;
    try {
      this.updateState = 2;
      for (let tr of transactions) {
        if (scrollTarget)
          scrollTarget = scrollTarget.map(tr.changes);
        if (tr.scrollIntoView) {
          let { main } = tr.state.selection;
          let { x, y } = this.state.facet(EditorView.cursorScrollMargin);
          scrollTarget = new ScrollTarget(main.empty ? main : EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1), "nearest", "nearest", y, x);
        }
        for (let e of tr.effects)
          if (e.is(scrollIntoView$1))
            scrollTarget = e.value.clip(this.state);
      }
      this.viewState.update(update, scrollTarget);
      this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
      if (!update.empty) {
        this.updatePlugins(update);
        this.inputState.update(update);
      }
      redrawn = this.docView.update(update);
      if (this.state.facet(styleModule) != this.styleModules)
        this.mountStyles();
      attrsChanged = this.updateAttrs();
      this.showAnnouncements(transactions);
      this.docView.updateSelection(redrawn, transactions.some((tr) => tr.isUserEvent("select.pointer")));
    } finally {
      this.updateState = 0;
    }
    if (update.startState.facet(theme) != update.state.facet(theme))
      this.viewState.mustMeasureContent = true;
    if (redrawn || attrsChanged || scrollTarget || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent)
      this.requestMeasure();
    if (redrawn)
      this.docViewUpdate();
    if (!update.empty)
      for (let listener of this.state.facet(updateListener)) {
        try {
          listener(update);
        } catch (e) {
          logException(this.state, e, "update listener");
        }
      }
    if (dispatchFocus || domChange)
      Promise.resolve().then(() => {
        if (dispatchFocus && this.state == dispatchFocus.startState)
          this.dispatch(dispatchFocus);
        if (domChange) {
          if (!applyDOMChange(this, domChange) && pendingKey.force)
            dispatchKey(this.contentDOM, pendingKey.key, pendingKey.keyCode);
        }
      });
  }
  /**
  Reset the view to the given state. (This will cause the entire
  document to be redrawn and all view plugins to be reinitialized,
  so you should probably only use it when the new state isn't
  derived from the old state. Otherwise, use
  [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead.)
  */
  setState(newState) {
    if (this.updateState != 0)
      throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
    if (this.destroyed) {
      this.viewState.state = newState;
      return;
    }
    this.updateState = 2;
    let hadFocus = this.hasFocus;
    try {
      for (let plugin of this.plugins)
        plugin.destroy(this);
      this.viewState = new ViewState(this, newState);
      this.plugins = newState.facet(viewPlugin).map((spec) => new PluginInstance(spec));
      this.pluginMap.clear();
      for (let plugin of this.plugins)
        plugin.update(this);
      this.docView.destroy();
      this.docView = new DocView(this);
      this.inputState.ensureHandlers(this.plugins);
      this.mountStyles();
      this.updateAttrs();
      this.bidiCache = [];
    } finally {
      this.updateState = 0;
    }
    if (hadFocus)
      this.focus();
    this.requestMeasure();
  }
  updatePlugins(update) {
    let prevSpecs = update.startState.facet(viewPlugin), specs = update.state.facet(viewPlugin);
    if (prevSpecs != specs) {
      let newPlugins = [];
      for (let spec of specs) {
        let found = prevSpecs.indexOf(spec);
        if (found < 0) {
          newPlugins.push(new PluginInstance(spec));
        } else {
          let plugin = this.plugins[found];
          plugin.mustUpdate = update;
          newPlugins.push(plugin);
        }
      }
      for (let plugin of this.plugins)
        if (plugin.mustUpdate != update)
          plugin.destroy(this);
      this.plugins = newPlugins;
      this.pluginMap.clear();
    } else {
      for (let p of this.plugins)
        p.mustUpdate = update;
    }
    for (let i2 = 0; i2 < this.plugins.length; i2++)
      this.plugins[i2].update(this);
    if (prevSpecs != specs)
      this.inputState.ensureHandlers(this.plugins);
  }
  docViewUpdate() {
    for (let plugin of this.plugins) {
      let val = plugin.value;
      if (val && val.docViewUpdate) {
        try {
          val.docViewUpdate(this);
        } catch (e) {
          logException(this.state, e, "doc view update listener");
        }
      }
    }
  }
  /**
  @internal
  */
  measure(flush = true) {
    if (this.destroyed)
      return;
    if (this.measureScheduled > -1)
      this.win.cancelAnimationFrame(this.measureScheduled);
    if (this.observer.delayedAndroidKey) {
      this.measureScheduled = -1;
      this.requestMeasure();
      return;
    }
    this.measureScheduled = 0;
    if (flush)
      this.observer.forceFlush();
    let updated = null;
    let scroll = this.viewState.scrollParent, scrollOffset = this.viewState.getScrollOffset();
    let { scrollAnchorPos, scrollAnchorHeight, scaleY: scrollScale } = this.viewState;
    if (Math.abs(scrollOffset - this.viewState.scrollOffset) > 1)
      scrollAnchorHeight = -1;
    this.viewState.scrollAnchorHeight = -1;
    try {
      for (let i2 = 0; ; i2++) {
        if (scrollAnchorHeight < 0) {
          if (isScrolledToBottom(scroll || this.win)) {
            scrollAnchorPos = -1;
            scrollAnchorHeight = this.viewState.heightMap.height / this.viewState.scaleY;
          } else {
            let block = this.viewState.scrollAnchorAt(scrollOffset);
            scrollAnchorPos = block.from;
            scrollAnchorHeight = block.top;
          }
          scrollScale = this.viewState.scaleY;
        }
        this.updateState = 1;
        let changed = this.viewState.measure();
        if (!changed && !this.measureRequests.length && this.viewState.scrollTarget == null)
          break;
        if (i2 > 5) {
          console.warn(this.measureRequests.length ? "Measure loop restarted more than 5 times" : "Viewport failed to stabilize");
          break;
        }
        let measuring = [];
        if (!(changed & 4))
          [this.measureRequests, measuring] = [measuring, this.measureRequests];
        let measured = measuring.map((m) => {
          try {
            return m.read(this);
          } catch (e) {
            logException(this.state, e);
            return BadMeasure;
          }
        });
        let update = ViewUpdate.create(this, this.state, []), redrawn = false;
        update.flags |= changed;
        if (!updated)
          updated = update;
        else
          updated.flags |= changed;
        this.updateState = 2;
        if (!update.empty) {
          this.updatePlugins(update);
          this.inputState.update(update);
          this.updateAttrs();
          redrawn = this.docView.update(update);
          if (redrawn)
            this.docViewUpdate();
        }
        for (let i3 = 0; i3 < measuring.length; i3++)
          if (measured[i3] != BadMeasure) {
            try {
              let m = measuring[i3];
              if (m.write)
                m.write(measured[i3], this);
            } catch (e) {
              logException(this.state, e);
            }
          }
        if (redrawn)
          this.docView.updateSelection(true);
        if (!update.viewportChanged && this.measureRequests.length == 0) {
          if (this.viewState.editorHeight) {
            if (this.viewState.scrollTarget) {
              this.docView.scrollIntoView(this.viewState.scrollTarget);
              this.viewState.scrollTarget = null;
              scrollAnchorHeight = -1;
              continue;
            } else {
              let newAnchorHeight = scrollAnchorPos < 0 ? this.viewState.heightMap.height : this.viewState.lineBlockAt(scrollAnchorPos).top;
              let diff = newAnchorHeight / this.viewState.scaleY - scrollAnchorHeight / scrollScale;
              if ((diff > 1 || diff < -1) && !(browser.ios && this.inputState.lastIOSMomentumScroll > Date.now() - 100) && (scroll == this.scrollDOM || this.hasFocus || Math.max(this.inputState.lastWheelEvent, this.inputState.lastTouchTime) > Date.now() - 100)) {
                scrollOffset = scrollOffset + diff;
                if (!scroll)
                  this.win.scrollBy(0, diff);
                else if (scrollAnchorPos < 0)
                  scroll.scrollTop = scroll.scrollHeight;
                else
                  scroll.scrollTop += diff;
                scrollAnchorHeight = -1;
                continue;
              }
            }
          }
          break;
        }
      }
    } finally {
      this.updateState = 0;
      this.measureScheduled = -1;
    }
    if (updated && !updated.empty)
      for (let listener of this.state.facet(updateListener))
        listener(updated);
  }
  /**
  Get the CSS classes for the currently active editor themes.
  */
  get themeClasses() {
    return baseThemeID + " " + (this.state.facet(darkTheme) ? baseDarkID : baseLightID) + " " + this.state.facet(theme);
  }
  updateAttrs() {
    let editorAttrs = attrsFromFacet(this, editorAttributes, {
      class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses
    });
    let contentAttrs = {
      spellcheck: "false",
      autocorrect: "off",
      autocapitalize: "off",
      writingsuggestions: "false",
      translate: "no",
      contenteditable: !this.state.facet(editable) ? "false" : "true",
      class: "cm-content",
      style: `${browser.tabSize}: ${this.state.tabSize}`,
      role: "textbox",
      "aria-multiline": "true"
    };
    if (this.state.readOnly)
      contentAttrs["aria-readonly"] = "true";
    attrsFromFacet(this, contentAttributes, contentAttrs);
    let changed = this.observer.ignore(() => {
      let changedContent = updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
      let changedEditor = updateAttrs(this.dom, this.editorAttrs, editorAttrs);
      return changedContent || changedEditor;
    });
    this.editorAttrs = editorAttrs;
    this.contentAttrs = contentAttrs;
    return changed;
  }
  showAnnouncements(trs) {
    let first = true;
    for (let tr of trs)
      for (let effect of tr.effects)
        if (effect.is(EditorView.announce)) {
          if (first) {
            this.announceDOM.textContent = "";
            this.win.clearTimeout(this.clearAnnouncement);
            this.clearAnnouncement = this.win.setTimeout(() => {
              this.announceDOM.textContent = " ";
            }, 200);
            first = false;
          }
          let div = this.announceDOM.appendChild(document.createElement("div"));
          div.textContent = effect.value;
        }
  }
  mountStyles() {
    this.styleModules = this.state.facet(styleModule);
    let nonce = this.state.facet(EditorView.cspNonce);
    StyleModule.mount(this.root, this.styleModules.concat(baseTheme$1$2).reverse(), nonce ? { nonce } : void 0);
  }
  readMeasured() {
    if (this.updateState == 2)
      throw new Error("Reading the editor layout isn't allowed during an update");
    if (this.updateState == 0 && this.measureScheduled > -1)
      this.measure(false);
  }
  /**
  Schedule a layout measurement, optionally providing callbacks to
  do custom DOM measuring followed by a DOM write phase. Using
  this is preferable to reading DOM layout directly from, for
  example, an event handler, because it'll make sure measuring and
  drawing done by other components is synchronized, avoiding
  unnecessary DOM layout computations.
  */
  requestMeasure(request) {
    if (this.measureScheduled < 0)
      this.measureScheduled = this.win.requestAnimationFrame(() => this.measure());
    if (request) {
      if (this.measureRequests.indexOf(request) > -1)
        return;
      if (request.key != null)
        for (let i2 = 0; i2 < this.measureRequests.length; i2++) {
          if (this.measureRequests[i2].key === request.key) {
            this.measureRequests[i2] = request;
            return;
          }
        }
      this.measureRequests.push(request);
    }
  }
  /**
  Get the value of a specific plugin, if present. Note that
  plugins that crash can be dropped from a view, so even when you
  know you registered a given plugin, it is recommended to check
  the return value of this method.
  */
  plugin(plugin) {
    let known = this.pluginMap.get(plugin);
    if (known === void 0 || known && known.plugin != plugin)
      this.pluginMap.set(plugin, known = this.plugins.find((p) => p.plugin == plugin) || null);
    return known && known.update(this).value;
  }
  /**
  The top position of the document, in screen coordinates. This
  may be negative when the editor is scrolled down. Points
  directly to the top of the first line, not above the padding.
  */
  get documentTop() {
    return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
  }
  /**
  Reports the padding above and below the document.
  */
  get documentPadding() {
    return { top: this.viewState.paddingTop, bottom: this.viewState.paddingBottom };
  }
  /**
  If the editor is transformed with CSS, this provides the scale
  along the X axis. Otherwise, it will just be 1. Note that
  transforms other than translation and scaling are not supported.
  */
  get scaleX() {
    return this.viewState.scaleX;
  }
  /**
  Provide the CSS transformed scale along the Y axis.
  */
  get scaleY() {
    return this.viewState.scaleY;
  }
  /**
  Find the text line or block widget at the given vertical
  position (which is interpreted as relative to the [top of the
  document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop)).
  */
  elementAtHeight(height) {
    this.readMeasured();
    return this.viewState.elementAtHeight(height);
  }
  /**
  Find the line block (see
  [`lineBlockAt`](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt)) at the given
  height, again interpreted relative to the [top of the
  document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop).
  */
  lineBlockAtHeight(height) {
    this.readMeasured();
    return this.viewState.lineBlockAtHeight(height);
  }
  /**
  Get the extent and vertical position of all [line
  blocks](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) in the viewport. Positions
  are relative to the [top of the
  document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop);
  */
  get viewportLineBlocks() {
    return this.viewState.viewportLines;
  }
  /**
  Find the line block around the given document position. A line
  block is a range delimited on both sides by either a
  non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^replace) line break, or the
  start/end of the document. It will usually just hold a line of
  text, but may be broken into multiple textblocks by block
  widgets.
  */
  lineBlockAt(pos) {
    return this.viewState.lineBlockAt(pos);
  }
  /**
  The editor's total content height.
  */
  get contentHeight() {
    return this.viewState.contentHeight;
  }
  /**
  Move a cursor position by [grapheme
  cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak). `forward` determines whether
  the motion is away from the line start, or towards it. In
  bidirectional text, the line is traversed in visual order, using
  the editor's [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
  When the start position was the last one on the line, the
  returned position will be across the line break. If there is no
  further line, the original position is returned.
  
  By default, this method moves over a single cluster. The
  optional `by` argument can be used to move across more. It will
  be called with the first cluster as argument, and should return
  a predicate that determines, for each subsequent cluster,
  whether it should also be moved over.
  */
  moveByChar(start, forward, by) {
    return skipAtoms(this, start, moveByChar(this, start, forward, by));
  }
  /**
  Move a cursor position across the next group of either
  [letters](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) or non-letter
  non-whitespace characters.
  */
  moveByGroup(start, forward) {
    return skipAtoms(this, start, moveByChar(this, start, forward, (initial) => byGroup(this, start.head, initial)));
  }
  /**
  **\[DEPRECATED]** Get the cursor position visually at the start
  or end of a line.
  */
  visualLineSide(line, end) {
    return end ? EditorSelection.cursor(line.to, 1) : EditorSelection.cursor(line.from, -1);
  }
  /**
  Move to the next line boundary in the given direction. If
  `includeWrap` is true, line wrapping is on, and there is a
  further wrap point on the current line, the wrap point will be
  returned. Otherwise this function will return the start or end
  of the line.
  */
  moveToLineBoundary(start, forward, includeWrap = true) {
    return moveToLineBoundary(this, start, forward, includeWrap);
  }
  /**
  Move a cursor position vertically. When `distance` isn't given,
  it defaults to moving to the next line (including wrapped
  lines). Otherwise, `distance` should provide a positive distance
  in pixels.
  
  When `start` has a
  [`goalColumn`](https://codemirror.net/6/docs/ref/#state.SelectionRange.goalColumn), the vertical
  motion will use that as a target horizontal position. Otherwise,
  the cursor's own horizontal position is used. The returned
  cursor will have its goal column set to whichever column was
  used.
  */
  moveVertically(start, forward, distance) {
    return skipAtoms(this, start, moveVertically(this, start, forward, distance));
  }
  /**
  Find the DOM parent node and offset (child offset if `node` is
  an element, character offset when it is a text node) at the
  given document position.
  
  Note that for positions that aren't currently in
  `visibleRanges`, the resulting DOM position isn't necessarily
  meaningful (it may just point before or after a placeholder
  element).
  */
  domAtPos(pos, side = 1) {
    return this.docView.domAtPos(pos, side);
  }
  /**
  Find the document position at the given DOM node. Can be useful
  for associating positions with DOM events. Will raise an error
  when `node` isn't part of the editor content.
  */
  posAtDOM(node, offset = 0) {
    return this.docView.posFromDOM(node, offset);
  }
  posAtCoords(coords, precise = true) {
    this.readMeasured();
    let found = posAtCoords(this, coords, precise);
    return found && found.pos;
  }
  posAndSideAtCoords(coords, precise = true) {
    this.readMeasured();
    return posAtCoords(this, coords, precise);
  }
  /**
  Get the screen coordinates at the given document position.
  `side` determines whether the coordinates are based on the
  element before (-1) or after (1) the position (if no element is
  available on the given side, the method will transparently use
  another strategy to get reasonable coordinates).
  */
  coordsAtPos(pos, side = 1) {
    this.readMeasured();
    let line = this.state.doc.lineAt(pos), order = this.bidiSpans(line);
    let span = order[BidiSpan.find(order, pos - line.from, -1, side)];
    if (line.length && (pos == line.from && side < 0 || pos == line.to && side > 0) && span.dir != this.textDirectionAt(line.from)) {
      if (pos == line.to) {
        pos = line.from + span.from;
        side = 1;
      } else {
        pos = line.from + span.to;
        side = -1;
      }
    }
    return this.docView.coordsAt(pos, side, span.dir == Direction.RTL);
  }
  /**
  Return the rectangle around a given character. If `pos` does not
  point in front of a character that is in the viewport and
  rendered (i.e. not replaced, not a line break), this will return
  null. For space characters that are a line wrap point, this will
  return the position before the line break.
  */
  coordsForChar(pos) {
    this.readMeasured();
    return this.docView.coordsForChar(pos);
  }
  /**
  The default width of a character in the editor. May not
  accurately reflect the width of all characters (given variable
  width fonts or styling of invididual ranges).
  */
  get defaultCharacterWidth() {
    return this.viewState.heightOracle.charWidth;
  }
  /**
  The default height of a line in the editor. May not be accurate
  for all lines.
  */
  get defaultLineHeight() {
    return this.viewState.heightOracle.lineHeight;
  }
  /**
  The text direction
  ([`direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)
  CSS property) of the editor's content element.
  */
  get textDirection() {
    return this.viewState.defaultTextDirection;
  }
  /**
  Find the text direction of the block at the given position, as
  assigned by CSS. If
  [`perLineTextDirection`](https://codemirror.net/6/docs/ref/#view.EditorView^perLineTextDirection)
  isn't enabled, or the given position is outside of the viewport,
  this will always return the same as
  [`textDirection`](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection). Note that
  this may trigger a DOM layout.
  */
  textDirectionAt(pos) {
    let perLine = this.state.facet(perLineTextDirection);
    if (!perLine || pos < this.viewport.from || pos > this.viewport.to)
      return this.textDirection;
    this.readMeasured();
    return this.docView.textDirectionAt(pos);
  }
  /**
  Whether this editor [wraps lines](https://codemirror.net/6/docs/ref/#view.EditorView.lineWrapping)
  (as determined by the
  [`white-space`](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
  CSS property of its content element).
  */
  get lineWrapping() {
    return this.viewState.heightOracle.lineWrapping;
  }
  /**
  Returns the bidirectional text structure of the given line
  (which should be in the current document) as an array of span
  objects. The order of these spans matches the [text
  direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection)—if that is
  left-to-right, the leftmost spans come first, otherwise the
  rightmost spans come first.
  */
  bidiSpans(line) {
    if (line.length > MaxBidiLine)
      return trivialOrder(line.length);
    let dir = this.textDirectionAt(line.from), isolates;
    for (let entry of this.bidiCache) {
      if (entry.from == line.from && entry.dir == dir && (entry.fresh || isolatesEq(entry.isolates, isolates = getIsolatedRanges(this, line))))
        return entry.order;
    }
    if (!isolates)
      isolates = getIsolatedRanges(this, line);
    let order = computeOrder(line.text, dir, isolates);
    this.bidiCache.push(new CachedOrder(line.from, line.to, dir, isolates, true, order));
    return order;
  }
  /**
  Check whether the editor has focus.
  */
  get hasFocus() {
    var _a2;
    return (this.dom.ownerDocument.hasFocus() || browser.safari && ((_a2 = this.inputState) === null || _a2 === void 0 ? void 0 : _a2.lastContextMenu) > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
  }
  /**
  Put focus on the editor.
  */
  focus() {
    this.observer.ignore(() => {
      focusPreventScroll(this.contentDOM);
      this.docView.updateSelection();
    });
  }
  /**
  Update the [root](https://codemirror.net/6/docs/ref/##view.EditorViewConfig.root) in which the editor lives. This is only
  necessary when moving the editor's existing DOM to a new window or shadow root.
  */
  setRoot(root) {
    if (this._root != root) {
      this._root = root;
      this.observer.setWindow((root.nodeType == 9 ? root : root.ownerDocument).defaultView || window);
      this.mountStyles();
    }
  }
  /**
  Clean up this editor view, removing its element from the
  document, unregistering event handlers, and notifying
  plugins. The view instance can no longer be used after
  calling this.
  */
  destroy() {
    if (this.root.activeElement == this.contentDOM)
      this.contentDOM.blur();
    for (let plugin of this.plugins)
      plugin.destroy(this);
    this.plugins = [];
    this.inputState.destroy();
    this.docView.destroy();
    this.dom.remove();
    this.observer.destroy();
    this.win.clearTimeout(this.clearAnnouncement);
    if (this.measureScheduled > -1)
      this.win.cancelAnimationFrame(this.measureScheduled);
    this.destroyed = true;
  }
  /**
  Returns an effect that can be
  [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a transaction to
  cause it to scroll the given position or range into view.
  */
  static scrollIntoView(pos, options = {}) {
    var _a2, _b, _c, _d;
    return scrollIntoView$1.of(new ScrollTarget(typeof pos == "number" ? EditorSelection.cursor(pos) : pos, (_a2 = options.y) !== null && _a2 !== void 0 ? _a2 : "nearest", (_b = options.x) !== null && _b !== void 0 ? _b : "nearest", (_c = options.yMargin) !== null && _c !== void 0 ? _c : 5, (_d = options.xMargin) !== null && _d !== void 0 ? _d : 5));
  }
  /**
  Return an effect that resets the editor to its current (at the
  time this method was called) scroll position. Note that this
  only affects the editor's own scrollable element, not parents.
  See also
  [`EditorViewConfig.scrollTo`](https://codemirror.net/6/docs/ref/#view.EditorViewConfig.scrollTo).
  
  The effect should be used with a document identical to the one
  it was created for. Failing to do so is not an error, but may
  not scroll to the expected position. You can
  [map](https://codemirror.net/6/docs/ref/#state.StateEffect.map) the effect to account for changes.
  */
  scrollSnapshot() {
    let { scrollTop, scrollLeft } = this.scrollDOM;
    let ref = this.viewState.scrollAnchorAt(scrollTop);
    return scrollIntoView$1.of(new ScrollTarget(EditorSelection.cursor(ref.from), "start", "start", ref.top - scrollTop, scrollLeft, true));
  }
  /**
  Enable or disable tab-focus mode, which disables key bindings
  for Tab and Shift-Tab, letting the browser's default
  focus-changing behavior go through instead. This is useful to
  prevent trapping keyboard users in your editor.
  
  Without argument, this toggles the mode. With a boolean, it
  enables (true) or disables it (false). Given a number, it
  temporarily enables the mode until that number of milliseconds
  have passed or another non-Tab key is pressed.
  */
  setTabFocusMode(to) {
    if (to == null)
      this.inputState.tabFocusMode = this.inputState.tabFocusMode < 0 ? 0 : -1;
    else if (typeof to == "boolean")
      this.inputState.tabFocusMode = to ? 0 : -1;
    else if (this.inputState.tabFocusMode != 0)
      this.inputState.tabFocusMode = Date.now() + to;
  }
  /**
  Returns an extension that can be used to add DOM event handlers.
  The value should be an object mapping event names to handler
  functions. For any given event, such functions are ordered by
  extension precedence, and the first handler to return true will
  be assumed to have handled that event, and no other handlers or
  built-in behavior will be activated for it. These are registered
  on the [content element](https://codemirror.net/6/docs/ref/#view.EditorView.contentDOM), except
  for `scroll` handlers, which will be called any time the
  editor's [scroll element](https://codemirror.net/6/docs/ref/#view.EditorView.scrollDOM) or one of
  its parent nodes is scrolled.
  */
  static domEventHandlers(handlers2) {
    return ViewPlugin.define(() => ({}), { eventHandlers: handlers2 });
  }
  /**
  Create an extension that registers DOM event observers. Contrary
  to event [handlers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventHandlers),
  observers can't be prevented from running by a higher-precedence
  handler returning true. They also don't prevent other handlers
  and observers from running when they return true, and should not
  call `preventDefault`.
  */
  static domEventObservers(observers2) {
    return ViewPlugin.define(() => ({}), { eventObservers: observers2 });
  }
  /**
  Create a theme extension. The first argument can be a
  [`style-mod`](https://code.haverbeke.berlin/marijn/style-mod#documentation)
  style spec providing the styles for the theme. These will be
  prefixed with a generated class for the style.
  
  Because the selectors will be prefixed with a scope class, rule
  that directly match the editor's [wrapper
  element](https://codemirror.net/6/docs/ref/#view.EditorView.dom)—to which the scope class will be
  added—need to be explicitly differentiated by adding an `&` to
  the selector for that element—for example
  `&.cm-focused`.
  
  When `dark` is set to true, the theme will be marked as dark,
  which will cause the `&dark` rules from [base
  themes](https://codemirror.net/6/docs/ref/#view.EditorView^baseTheme) to be used (as opposed to
  `&light` when a light theme is active).
  */
  static theme(spec, options) {
    let prefix = StyleModule.newName();
    let result = [theme.of(prefix), styleModule.of(buildTheme(`.${prefix}`, spec))];
    if (options && options.dark)
      result.push(darkTheme.of(true));
    return result;
  }
  /**
  Create an extension that adds styles to the base theme. Like
  with [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme), use `&` to indicate the
  place of the editor wrapper element when directly targeting
  that. You can also use `&dark` or `&light` instead to only
  target editors with a dark or light theme.
  */
  static baseTheme(spec) {
    return Prec.lowest(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
  }
  /**
  Retrieve an editor view instance from the view's DOM
  representation.
  */
  static findFromDOM(dom) {
    var _a2;
    let content2 = dom.querySelector(".cm-content");
    let tile = content2 && Tile.get(content2) || Tile.get(dom);
    return ((_a2 = tile === null || tile === void 0 ? void 0 : tile.root) === null || _a2 === void 0 ? void 0 : _a2.view) || null;
  }
}
EditorView.styleModule = styleModule;
EditorView.inputHandler = inputHandler$1;
EditorView.clipboardInputFilter = clipboardInputFilter;
EditorView.clipboardOutputFilter = clipboardOutputFilter;
EditorView.scrollHandler = scrollHandler;
EditorView.focusChangeEffect = focusChangeEffect;
EditorView.perLineTextDirection = perLineTextDirection;
EditorView.exceptionSink = exceptionSink;
EditorView.updateListener = updateListener;
EditorView.editable = editable;
EditorView.mouseSelectionStyle = mouseSelectionStyle;
EditorView.dragMovesSelection = dragMovesSelection$1;
EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
EditorView.decorations = decorations;
EditorView.blockWrappers = blockWrappers;
EditorView.outerDecorations = outerDecorations;
EditorView.atomicRanges = atomicRanges;
EditorView.bidiIsolatedRanges = bidiIsolatedRanges;
EditorView.cursorScrollMargin = /* @__PURE__ */ Facet.define({
  combine: (inputs) => {
    let x = 5, y = 5;
    for (let i2 of inputs) {
      if (typeof i2 == "number")
        x = y = i2;
      else
        ({ x, y } = i2);
    }
    return { x, y };
  }
});
EditorView.scrollMargins = scrollMargins;
EditorView.darkTheme = darkTheme;
EditorView.cspNonce = /* @__PURE__ */ Facet.define({ combine: (values) => values.length ? values[0] : "" });
EditorView.contentAttributes = contentAttributes;
EditorView.editorAttributes = editorAttributes;
EditorView.lineWrapping = /* @__PURE__ */ EditorView.contentAttributes.of({ "class": "cm-lineWrapping" });
EditorView.announce = /* @__PURE__ */ StateEffect.define();
const MaxBidiLine = 4096;
const BadMeasure = {};
class CachedOrder {
  constructor(from, to, dir, isolates, fresh, order) {
    this.from = from;
    this.to = to;
    this.dir = dir;
    this.isolates = isolates;
    this.fresh = fresh;
    this.order = order;
  }
  static update(cache, changes) {
    if (changes.empty && !cache.some((c) => c.fresh))
      return cache;
    let result = [], lastDir = cache.length ? cache[cache.length - 1].dir : Direction.LTR;
    for (let i2 = Math.max(0, cache.length - 10); i2 < cache.length; i2++) {
      let entry = cache[i2];
      if (entry.dir == lastDir && !changes.touchesRange(entry.from, entry.to))
        result.push(new CachedOrder(changes.mapPos(entry.from, 1), changes.mapPos(entry.to, -1), entry.dir, entry.isolates, false, entry.order));
    }
    return result;
  }
}
function attrsFromFacet(view, facet, base2) {
  for (let sources = view.state.facet(facet), i2 = sources.length - 1; i2 >= 0; i2--) {
    let source = sources[i2], value = typeof source == "function" ? source(view) : source;
    if (value)
      combineAttrs(value, base2);
  }
  return base2;
}
const currentPlatform = browser.mac ? "mac" : browser.windows ? "win" : browser.linux ? "linux" : "key";
function normalizeKeyName(name2, platform) {
  const parts = name2.split(/-(?!$)/);
  let result = parts[parts.length - 1];
  if (result == "Space")
    result = " ";
  let alt, ctrl, shift2, meta2;
  for (let i2 = 0; i2 < parts.length - 1; ++i2) {
    const mod = parts[i2];
    if (/^(cmd|meta|m)$/i.test(mod))
      meta2 = true;
    else if (/^a(lt)?$/i.test(mod))
      alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod))
      ctrl = true;
    else if (/^s(hift)?$/i.test(mod))
      shift2 = true;
    else if (/^mod$/i.test(mod)) {
      if (platform == "mac")
        meta2 = true;
      else
        ctrl = true;
    } else
      throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt)
    result = "Alt-" + result;
  if (ctrl)
    result = "Ctrl-" + result;
  if (meta2)
    result = "Meta-" + result;
  if (shift2)
    result = "Shift-" + result;
  return result;
}
function modifiers(name2, event, shift2) {
  if (event.altKey)
    name2 = "Alt-" + name2;
  if (event.ctrlKey)
    name2 = "Ctrl-" + name2;
  if (event.metaKey)
    name2 = "Meta-" + name2;
  if (shift2 !== false && event.shiftKey)
    name2 = "Shift-" + name2;
  return name2;
}
const handleKeyEvents = /* @__PURE__ */ Prec.default(/* @__PURE__ */ EditorView.domEventHandlers({
  keydown(event, view) {
    return runHandlers(getKeymap(view.state), event, view, "editor");
  }
}));
const keymap = /* @__PURE__ */ Facet.define({ enables: handleKeyEvents });
const Keymaps = /* @__PURE__ */ new WeakMap();
function getKeymap(state2) {
  let bindings = state2.facet(keymap);
  let map = Keymaps.get(bindings);
  if (!map)
    Keymaps.set(bindings, map = buildKeymap(bindings.reduce((a, b) => a.concat(b), [])));
  return map;
}
function runScopeHandlers(view, event, scope) {
  return runHandlers(getKeymap(view.state), event, view, scope);
}
let storedPrefix = null;
const PrefixTimeout = 4e3;
function buildKeymap(bindings, platform = currentPlatform) {
  let bound = /* @__PURE__ */ Object.create(null);
  let isPrefix = /* @__PURE__ */ Object.create(null);
  let checkPrefix = (name2, is) => {
    let current = isPrefix[name2];
    if (current == null)
      isPrefix[name2] = is;
    else if (current != is)
      throw new Error("Key binding " + name2 + " is used both as a regular binding and as a multi-stroke prefix");
  };
  let add2 = (scope, key, command2, preventDefault, stopPropagation) => {
    var _a2, _b;
    let scopeObj = bound[scope] || (bound[scope] = /* @__PURE__ */ Object.create(null));
    let parts = key.split(/ (?!$)/).map((k) => normalizeKeyName(k, platform));
    for (let i2 = 1; i2 < parts.length; i2++) {
      let prefix = parts.slice(0, i2).join(" ");
      checkPrefix(prefix, true);
      if (!scopeObj[prefix])
        scopeObj[prefix] = {
          preventDefault: true,
          stopPropagation: false,
          run: [(view) => {
            let ourObj = storedPrefix = { view, prefix, scope };
            setTimeout(() => {
              if (storedPrefix == ourObj)
                storedPrefix = null;
            }, PrefixTimeout);
            return true;
          }]
        };
    }
    let full = parts.join(" ");
    checkPrefix(full, false);
    let binding = scopeObj[full] || (scopeObj[full] = {
      preventDefault: false,
      stopPropagation: false,
      run: ((_b = (_a2 = scopeObj._any) === null || _a2 === void 0 ? void 0 : _a2.run) === null || _b === void 0 ? void 0 : _b.slice()) || []
    });
    if (command2)
      binding.run.push(command2);
    if (preventDefault)
      binding.preventDefault = true;
    if (stopPropagation)
      binding.stopPropagation = true;
  };
  for (let b of bindings) {
    let scopes = b.scope ? b.scope.split(" ") : ["editor"];
    if (b.any)
      for (let scope of scopes) {
        let scopeObj = bound[scope] || (bound[scope] = /* @__PURE__ */ Object.create(null));
        if (!scopeObj._any)
          scopeObj._any = { preventDefault: false, stopPropagation: false, run: [] };
        let { any } = b;
        for (let key in scopeObj)
          scopeObj[key].run.push((view) => any(view, currentKeyEvent));
      }
    let name2 = b[platform] || b.key;
    if (!name2)
      continue;
    for (let scope of scopes) {
      add2(scope, name2, b.run, b.preventDefault, b.stopPropagation);
      if (b.shift)
        add2(scope, "Shift-" + name2, b.shift, b.preventDefault, b.stopPropagation);
    }
  }
  return bound;
}
let currentKeyEvent = null;
function runHandlers(map, event, view, scope) {
  currentKeyEvent = event;
  let name2 = keyName(event);
  let charCode = codePointAt(name2, 0), isChar = codePointSize(charCode) == name2.length && name2 != " ";
  let prefix = "", handled = false, prevented = false, stopPropagation = false;
  if (storedPrefix && storedPrefix.view == view && storedPrefix.scope == scope) {
    prefix = storedPrefix.prefix + " ";
    if (modifierCodes.indexOf(event.keyCode) < 0) {
      prevented = true;
      storedPrefix = null;
    }
  }
  let ran = /* @__PURE__ */ new Set();
  let runFor = (binding) => {
    if (binding) {
      for (let cmd2 of binding.run)
        if (!ran.has(cmd2)) {
          ran.add(cmd2);
          if (cmd2(view)) {
            if (binding.stopPropagation)
              stopPropagation = true;
            return true;
          }
        }
      if (binding.preventDefault) {
        if (binding.stopPropagation)
          stopPropagation = true;
        prevented = true;
      }
    }
    return false;
  };
  let scopeObj = map[scope], baseName, shiftName;
  if (scopeObj) {
    if (runFor(scopeObj[prefix + modifiers(name2, event, !isChar)])) {
      handled = true;
    } else if (isChar && (event.altKey || event.metaKey || event.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
    !(browser.windows && event.ctrlKey && event.altKey) && // Alt-combinations on macOS tend to be typed characters
    !(browser.mac && event.altKey && !(event.ctrlKey || event.metaKey)) && (baseName = base[event.keyCode]) && baseName != name2) {
      if (runFor(scopeObj[prefix + modifiers(baseName, event, true)])) {
        handled = true;
      } else if (event.shiftKey && (shiftName = shift[event.keyCode]) != name2 && shiftName != baseName && runFor(scopeObj[prefix + modifiers(shiftName, event, false)])) {
        handled = true;
      }
    } else if (isChar && event.shiftKey && runFor(scopeObj[prefix + modifiers(name2, event, true)])) {
      handled = true;
    }
    if (!handled && runFor(scopeObj._any))
      handled = true;
  }
  if (prevented)
    handled = true;
  if (handled && stopPropagation)
    event.stopPropagation();
  currentKeyEvent = null;
  return handled;
}
class RectangleMarker {
  /**
  Create a marker with the given class and dimensions. If `width`
  is null, the DOM element will get no width style.
  */
  constructor(className, left, top2, width, height) {
    this.className = className;
    this.left = left;
    this.top = top2;
    this.width = width;
    this.height = height;
  }
  draw() {
    let elt = document.createElement("div");
    elt.className = this.className;
    this.adjust(elt);
    return elt;
  }
  update(elt, prev) {
    if (prev.className != this.className)
      return false;
    this.adjust(elt);
    return true;
  }
  adjust(elt) {
    elt.style.left = this.left + "px";
    elt.style.top = this.top + "px";
    if (this.width != null)
      elt.style.width = this.width + "px";
    elt.style.height = this.height + "px";
  }
  eq(p) {
    return this.left == p.left && this.top == p.top && this.width == p.width && this.height == p.height && this.className == p.className;
  }
  /**
  Create a set of rectangles for the given selection range,
  assigning them theclass`className`. Will create a single
  rectangle for empty ranges, and a set of selection-style
  rectangles covering the range's content (in a bidi-aware
  way) for non-empty ones.
  */
  static forRange(view, className, range) {
    if (range.empty) {
      let pos = view.coordsAtPos(range.head, range.assoc || 1);
      if (!pos)
        return [];
      let base2 = getBase(view);
      return [new RectangleMarker(className, pos.left - base2.left, pos.top - base2.top, null, pos.bottom - pos.top)];
    } else {
      return rectanglesForRange(view, className, range);
    }
  }
}
function getBase(view) {
  let rect = view.scrollDOM.getBoundingClientRect();
  let left = view.textDirection == Direction.LTR ? rect.left : rect.right - view.scrollDOM.clientWidth * view.scaleX;
  return { left: left - view.scrollDOM.scrollLeft * view.scaleX, top: rect.top - view.scrollDOM.scrollTop * view.scaleY };
}
function wrappedLine(view, pos, side, inside) {
  let coords = view.coordsAtPos(pos, side * 2);
  if (!coords)
    return inside;
  let editorRect = view.dom.getBoundingClientRect();
  let y = (coords.top + coords.bottom) / 2;
  let left = view.posAtCoords({ x: editorRect.left + 1, y });
  let right = view.posAtCoords({ x: editorRect.right - 1, y });
  if (left == null || right == null)
    return inside;
  return { from: Math.max(inside.from, Math.min(left, right)), to: Math.min(inside.to, Math.max(left, right)) };
}
function rectanglesForRange(view, className, range) {
  if (range.to <= view.viewport.from || range.from >= view.viewport.to)
    return [];
  let from = Math.max(range.from, view.viewport.from), to = Math.min(range.to, view.viewport.to);
  let ltr = view.textDirection == Direction.LTR;
  let content2 = view.contentDOM, contentRect = content2.getBoundingClientRect(), base2 = getBase(view);
  let lineElt = content2.querySelector(".cm-line"), lineStyle = lineElt && window.getComputedStyle(lineElt);
  let leftSide = contentRect.left + (lineStyle ? parseInt(lineStyle.paddingLeft) + Math.min(0, parseInt(lineStyle.textIndent)) : 0);
  let rightSide = contentRect.right - (lineStyle ? parseInt(lineStyle.paddingRight) : 0);
  let startBlock = blockAt(view, from, 1), endBlock = blockAt(view, to, -1);
  let visualStart = startBlock.type == BlockType.Text ? startBlock : null;
  let visualEnd = endBlock.type == BlockType.Text ? endBlock : null;
  if (visualStart && (view.lineWrapping || startBlock.widgetLineBreaks))
    visualStart = wrappedLine(view, from, 1, visualStart);
  if (visualEnd && (view.lineWrapping || endBlock.widgetLineBreaks))
    visualEnd = wrappedLine(view, to, -1, visualEnd);
  if (visualStart && visualEnd && visualStart.from == visualEnd.from && visualStart.to == visualEnd.to) {
    return pieces(drawForLine(range.from, range.to, visualStart));
  } else {
    let top2 = visualStart ? drawForLine(range.from, null, visualStart) : drawForWidget(startBlock, false);
    let bottom = visualEnd ? drawForLine(null, range.to, visualEnd) : drawForWidget(endBlock, true);
    let between = [];
    if ((visualStart || startBlock).to < (visualEnd || endBlock).from - (visualStart && visualEnd ? 1 : 0) || startBlock.widgetLineBreaks > 1 && top2.bottom + view.defaultLineHeight / 2 < bottom.top)
      between.push(piece(leftSide, top2.bottom, rightSide, bottom.top));
    else if (top2.bottom < bottom.top && view.elementAtHeight((top2.bottom + bottom.top) / 2).type == BlockType.Text)
      top2.bottom = bottom.top = (top2.bottom + bottom.top) / 2;
    return pieces(top2).concat(between).concat(pieces(bottom));
  }
  function piece(left, top2, right, bottom) {
    return new RectangleMarker(className, left - base2.left, top2 - base2.top, Math.max(0, right - left), bottom - top2);
  }
  function pieces({ top: top2, bottom, horizontal }) {
    let pieces2 = [];
    for (let i2 = 0; i2 < horizontal.length; i2 += 2)
      pieces2.push(piece(horizontal[i2], top2, horizontal[i2 + 1], bottom));
    return pieces2;
  }
  function drawForLine(from2, to2, line) {
    let top2 = 1e9, bottom = -1e9, horizontal = [];
    function addSpan(from3, fromOpen, to3, toOpen, dir) {
      let fromCoords = view.coordsAtPos(from3, from3 == line.to ? -2 : 2);
      let toCoords = view.coordsAtPos(to3, to3 == line.from ? 2 : -2);
      if (!fromCoords || !toCoords)
        return;
      top2 = Math.min(fromCoords.top, toCoords.top, top2);
      bottom = Math.max(fromCoords.bottom, toCoords.bottom, bottom);
      if (dir == Direction.LTR)
        horizontal.push(ltr && fromOpen ? leftSide : fromCoords.left, ltr && toOpen ? rightSide : toCoords.right);
      else
        horizontal.push(!ltr && toOpen ? leftSide : toCoords.left, !ltr && fromOpen ? rightSide : fromCoords.right);
    }
    let start = from2 !== null && from2 !== void 0 ? from2 : line.from, end = to2 !== null && to2 !== void 0 ? to2 : line.to;
    for (let r of view.visibleRanges)
      if (r.to > start && r.from < end) {
        for (let pos = Math.max(r.from, start), endPos = Math.min(r.to, end); ; ) {
          let docLine = view.state.doc.lineAt(pos);
          for (let span of view.bidiSpans(docLine)) {
            let spanFrom = span.from + docLine.from, spanTo = span.to + docLine.from;
            if (spanFrom >= endPos)
              break;
            if (spanTo > pos)
              addSpan(Math.max(spanFrom, pos), from2 == null && spanFrom <= start, Math.min(spanTo, endPos), to2 == null && spanTo >= end, span.dir);
          }
          pos = docLine.to + 1;
          if (pos >= endPos)
            break;
        }
      }
    if (horizontal.length == 0)
      addSpan(start, from2 == null, end, to2 == null, view.textDirection);
    return { top: top2, bottom, horizontal };
  }
  function drawForWidget(block, top2) {
    let y = contentRect.top + (top2 ? block.top : block.bottom);
    return { top: y, bottom: y, horizontal: [] };
  }
}
function sameMarker(a, b) {
  return a.constructor == b.constructor && a.eq(b);
}
class LayerView {
  constructor(view, layer2) {
    this.view = view;
    this.layer = layer2;
    this.drawn = [];
    this.scaleX = 1;
    this.scaleY = 1;
    this.measureReq = { read: this.measure.bind(this), write: this.draw.bind(this) };
    this.dom = view.scrollDOM.appendChild(document.createElement("div"));
    this.dom.classList.add("cm-layer");
    if (layer2.above)
      this.dom.classList.add("cm-layer-above");
    if (layer2.class)
      this.dom.classList.add(layer2.class);
    this.scale();
    this.dom.setAttribute("aria-hidden", "true");
    this.setOrder(view.state);
    view.requestMeasure(this.measureReq);
    if (layer2.mount)
      layer2.mount(this.dom, view);
  }
  update(update) {
    if (update.startState.facet(layerOrder) != update.state.facet(layerOrder))
      this.setOrder(update.state);
    if (this.layer.update(update, this.dom) || update.geometryChanged) {
      this.scale();
      update.view.requestMeasure(this.measureReq);
    }
  }
  docViewUpdate(view) {
    if (this.layer.updateOnDocViewUpdate !== false)
      view.requestMeasure(this.measureReq);
  }
  setOrder(state2) {
    let pos = 0, order = state2.facet(layerOrder);
    while (pos < order.length && order[pos] != this.layer)
      pos++;
    this.dom.style.zIndex = String((this.layer.above ? 150 : -1) - pos);
  }
  measure() {
    return this.layer.markers(this.view);
  }
  scale() {
    let { scaleX, scaleY } = this.view;
    if (scaleX != this.scaleX || scaleY != this.scaleY) {
      this.scaleX = scaleX;
      this.scaleY = scaleY;
      this.dom.style.transform = `scale(${1 / scaleX}, ${1 / scaleY})`;
    }
  }
  draw(markers) {
    if (markers.length != this.drawn.length || markers.some((p, i2) => !sameMarker(p, this.drawn[i2]))) {
      let old = this.dom.firstChild, oldI = 0;
      for (let marker of markers) {
        if (marker.update && old && marker.constructor && this.drawn[oldI].constructor && marker.update(old, this.drawn[oldI])) {
          old = old.nextSibling;
          oldI++;
        } else {
          this.dom.insertBefore(marker.draw(), old);
        }
      }
      while (old) {
        let next = old.nextSibling;
        old.remove();
        old = next;
      }
      this.drawn = markers;
      if (browser.webkit)
        this.dom.style.display = this.dom.firstChild ? "" : "none";
    }
  }
  destroy() {
    if (this.layer.destroy)
      this.layer.destroy(this.dom, this.view);
    this.dom.remove();
  }
}
const layerOrder = /* @__PURE__ */ Facet.define();
function layer(config2) {
  return [
    ViewPlugin.define((v) => new LayerView(v, config2)),
    layerOrder.of(config2)
  ];
}
const drawMainRange = !browser.ios;
const selectionConfig = /* @__PURE__ */ Facet.define({
  combine(configs) {
    return combineConfig(configs, {
      cursorBlinkRate: 1200,
      drawRangeCursor: true,
      iosSelectionHandles: true
    }, {
      cursorBlinkRate: (a, b) => Math.min(a, b),
      drawRangeCursor: (a, b) => a || b
    });
  }
});
function drawSelection(config2 = {}) {
  return [
    selectionConfig.of(config2),
    cursorLayer,
    selectionLayer,
    hideNativeSelection,
    nativeSelectionHidden.of(true)
  ];
}
function configChanged(update) {
  return update.startState.facet(selectionConfig) != update.state.facet(selectionConfig);
}
const cursorLayer = /* @__PURE__ */ layer({
  above: true,
  markers(view) {
    let { state: state2 } = view, conf = state2.facet(selectionConfig);
    let cursors = [];
    for (let r of state2.selection.ranges) {
      let prim = r == state2.selection.main;
      if (r.empty || conf.drawRangeCursor && !(prim && browser.ios && conf.iosSelectionHandles)) {
        let className = prim ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary";
        let cursor2 = r.empty ? r : EditorSelection.cursor(r.head, r.assoc);
        for (let piece of RectangleMarker.forRange(view, className, cursor2))
          cursors.push(piece);
      }
    }
    return cursors;
  },
  update(update, dom) {
    if (update.transactions.some((tr) => tr.selection))
      dom.style.animationName = dom.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink";
    let confChange = configChanged(update);
    if (confChange)
      setBlinkRate(update.state, dom);
    return update.docChanged || update.selectionSet || confChange;
  },
  mount(dom, view) {
    setBlinkRate(view.state, dom);
  },
  class: "cm-cursorLayer"
});
function setBlinkRate(state2, dom) {
  dom.style.animationDuration = state2.facet(selectionConfig).cursorBlinkRate + "ms";
}
const selectionLayer = /* @__PURE__ */ layer({
  above: false,
  markers(view) {
    let markers = [], { main, ranges } = view.state.selection;
    for (let r of ranges)
      if (!r.empty && (drawMainRange || r != main)) {
        for (let marker of RectangleMarker.forRange(view, "cm-selectionBackground", r))
          markers.push(marker);
      }
    if (browser.ios && !main.empty && view.state.facet(selectionConfig).iosSelectionHandles) {
      for (let piece of RectangleMarker.forRange(view, "cm-selectionHandle cm-selectionHandle-start", EditorSelection.cursor(main.from, 1)))
        markers.push(piece);
      for (let piece of RectangleMarker.forRange(view, "cm-selectionHandle cm-selectionHandle-end", EditorSelection.cursor(main.to, 1)))
        markers.push(piece);
    }
    return markers;
  },
  update(update, dom) {
    return update.docChanged || update.selectionSet || update.viewportChanged || configChanged(update);
  },
  class: "cm-selectionLayer"
});
const selectionBg = browser.gecko && browser.gecko_version == 153 ? "#ffffff01" : "transparent";
const hideNativeSelection = /* @__PURE__ */ Prec.highest(/* @__PURE__ */ EditorView.theme({
  ".cm-line": {
    ...drawMainRange ? {
      "& ::selection, &::selection": { backgroundColor: `${selectionBg} !important` }
    } : {},
    caretColor: "transparent !important"
  },
  ".cm-content": {
    caretColor: "transparent !important",
    "& :focus": {
      caretColor: "initial !important",
      ...drawMainRange ? {
        "&::selection, & ::selection": {
          backgroundColor: "Highlight !important"
        }
      } : {}
    }
  }
}));
const setDropCursorPos = /* @__PURE__ */ StateEffect.define({
  map(pos, mapping) {
    return pos == null ? null : mapping.mapPos(pos);
  }
});
const dropCursorPos = /* @__PURE__ */ StateField.define({
  create() {
    return null;
  },
  update(pos, tr) {
    if (pos != null)
      pos = tr.changes.mapPos(pos);
    return tr.effects.reduce((pos2, e) => e.is(setDropCursorPos) ? e.value : pos2, pos);
  }
});
const drawDropCursor = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.cursor = null;
    this.measureReq = { read: this.readPos.bind(this), write: this.drawCursor.bind(this) };
  }
  update(update) {
    var _a2;
    let cursorPos = update.state.field(dropCursorPos);
    if (cursorPos == null) {
      if (this.cursor != null) {
        (_a2 = this.cursor) === null || _a2 === void 0 ? void 0 : _a2.remove();
        this.cursor = null;
      }
    } else {
      if (!this.cursor) {
        this.cursor = this.view.scrollDOM.appendChild(document.createElement("div"));
        this.cursor.className = "cm-dropCursor";
      }
      if (update.startState.field(dropCursorPos) != cursorPos || update.docChanged || update.geometryChanged)
        this.view.requestMeasure(this.measureReq);
    }
  }
  readPos() {
    let { view } = this;
    let pos = view.state.field(dropCursorPos);
    let rect = pos != null && view.coordsAtPos(pos);
    if (!rect)
      return null;
    let outer = view.scrollDOM.getBoundingClientRect();
    return {
      left: rect.left - outer.left + view.scrollDOM.scrollLeft * view.scaleX,
      top: rect.top - outer.top + view.scrollDOM.scrollTop * view.scaleY,
      height: rect.bottom - rect.top
    };
  }
  drawCursor(pos) {
    if (this.cursor) {
      let { scaleX, scaleY } = this.view;
      if (pos) {
        this.cursor.style.left = pos.left / scaleX + "px";
        this.cursor.style.top = pos.top / scaleY + "px";
        this.cursor.style.height = pos.height / scaleY + "px";
      } else {
        this.cursor.style.left = "-100000px";
      }
    }
  }
  destroy() {
    if (this.cursor)
      this.cursor.remove();
  }
  setDropPos(pos) {
    if (this.view.state.field(dropCursorPos) != pos)
      this.view.dispatch({ effects: setDropCursorPos.of(pos) });
  }
}, {
  eventObservers: {
    dragover(event) {
      this.setDropPos(this.view.posAtCoords({ x: event.clientX, y: event.clientY }));
    },
    dragleave(event) {
      if (event.target == this.view.contentDOM || !this.view.contentDOM.contains(event.relatedTarget))
        this.setDropPos(null);
    },
    dragend() {
      this.setDropPos(null);
    },
    drop() {
      this.setDropPos(null);
    }
  }
});
function dropCursor() {
  return [dropCursorPos, drawDropCursor];
}
function iterMatches(doc2, re, from, to, f) {
  re.lastIndex = 0;
  for (let cursor2 = doc2.iterRange(from, to), pos = from, m; !cursor2.next().done; pos += cursor2.value.length) {
    if (!cursor2.lineBreak)
      while (m = re.exec(cursor2.value))
        f(pos + m.index, m);
  }
}
function matchRanges(view, maxLength) {
  let visible = view.visibleRanges;
  if (visible.length == 1 && visible[0].from == view.viewport.from && visible[0].to == view.viewport.to)
    return visible;
  let result = [];
  for (let { from, to } of visible) {
    from = Math.max(view.state.doc.lineAt(from).from, from - maxLength);
    to = Math.min(view.state.doc.lineAt(to).to, to + maxLength);
    if (result.length && result[result.length - 1].to >= from)
      result[result.length - 1].to = to;
    else
      result.push({ from, to });
  }
  return result;
}
class MatchDecorator {
  /**
  Create a decorator.
  */
  constructor(config2) {
    const { regexp, decoration, decorate, boundary, maxLength = 1e3 } = config2;
    if (!regexp.global)
      throw new RangeError("The regular expression given to MatchDecorator should have its 'g' flag set");
    this.regexp = regexp;
    if (decorate) {
      this.addMatch = (match, view, from, add2) => decorate(add2, from, from + match[0].length, match, view);
    } else if (typeof decoration == "function") {
      this.addMatch = (match, view, from, add2) => {
        let deco = decoration(match, view, from);
        if (deco)
          add2(from, from + match[0].length, deco);
      };
    } else if (decoration) {
      this.addMatch = (match, _view, from, add2) => add2(from, from + match[0].length, decoration);
    } else {
      throw new RangeError("Either 'decorate' or 'decoration' should be provided to MatchDecorator");
    }
    this.boundary = boundary;
    this.maxLength = maxLength;
  }
  /**
  Compute the full set of decorations for matches in the given
  view's viewport. You'll want to call this when initializing your
  plugin.
  */
  createDeco(view) {
    let build = new RangeSetBuilder(), add2 = build.add.bind(build);
    for (let { from, to } of matchRanges(view, this.maxLength))
      iterMatches(view.state.doc, this.regexp, from, to, (from2, m) => this.addMatch(m, view, from2, add2));
    return build.finish();
  }
  /**
  Update a set of decorations for a view update. `deco` _must_ be
  the set of decorations produced by _this_ `MatchDecorator` for
  the view state before the update.
  */
  updateDeco(update, deco) {
    let changeFrom = 1e9, changeTo = -1;
    if (update.docChanged)
      update.changes.iterChanges((_f, _t, from, to) => {
        if (to >= update.view.viewport.from && from <= update.view.viewport.to) {
          changeFrom = Math.min(from, changeFrom);
          changeTo = Math.max(to, changeTo);
        }
      });
    if (update.viewportMoved || changeTo - changeFrom > 1e3)
      return this.createDeco(update.view);
    if (changeTo > -1)
      return this.updateRange(update.view, deco.map(update.changes), changeFrom, changeTo);
    return deco;
  }
  updateRange(view, deco, updateFrom, updateTo) {
    for (let r of view.visibleRanges) {
      let from = Math.max(r.from, updateFrom), to = Math.min(r.to, updateTo);
      if (to >= from) {
        let fromLine = view.state.doc.lineAt(from), toLine = fromLine.to < to ? view.state.doc.lineAt(to) : fromLine;
        let start = Math.max(r.from, fromLine.from), end = Math.min(r.to, toLine.to);
        if (this.boundary) {
          for (; from > fromLine.from; from--)
            if (this.boundary.test(fromLine.text[from - 1 - fromLine.from])) {
              start = from;
              break;
            }
          for (; to < toLine.to; to++)
            if (this.boundary.test(toLine.text[to - toLine.from])) {
              end = to;
              break;
            }
        }
        let ranges = [], m;
        let add2 = (from2, to2, deco2) => ranges.push(deco2.range(from2, to2));
        if (fromLine == toLine) {
          this.regexp.lastIndex = start - fromLine.from;
          while ((m = this.regexp.exec(fromLine.text)) && m.index < end - fromLine.from)
            this.addMatch(m, view, m.index + fromLine.from, add2);
        } else {
          iterMatches(view.state.doc, this.regexp, start, end, (from2, m2) => this.addMatch(m2, view, from2, add2));
        }
        deco = deco.update({ filterFrom: start, filterTo: end, filter: (from2, to2) => from2 < start || to2 > end, add: ranges });
      }
    }
    return deco;
  }
}
const UnicodeRegexpSupport = /x/.unicode != null ? "gu" : "g";
const Specials = /* @__PURE__ */ new RegExp("[\0-\b\n--­؜​‎‏\u2028\u2029‭‮⁦⁧⁩\uFEFF￹-￼]", UnicodeRegexpSupport);
const Names = {
  0: "null",
  7: "bell",
  8: "backspace",
  10: "newline",
  11: "vertical tab",
  13: "carriage return",
  27: "escape",
  8203: "zero width space",
  8204: "zero width non-joiner",
  8205: "zero width joiner",
  8206: "left-to-right mark",
  8207: "right-to-left mark",
  8232: "line separator",
  8237: "left-to-right override",
  8238: "right-to-left override",
  8294: "left-to-right isolate",
  8295: "right-to-left isolate",
  8297: "pop directional isolate",
  8233: "paragraph separator",
  65279: "zero width no-break space",
  65532: "object replacement"
};
let _supportsTabSize = null;
function supportsTabSize() {
  var _a2;
  if (_supportsTabSize == null && typeof document != "undefined" && document.body) {
    let styles = document.body.style;
    _supportsTabSize = ((_a2 = styles.tabSize) !== null && _a2 !== void 0 ? _a2 : styles.MozTabSize) != null;
  }
  return _supportsTabSize || false;
}
const specialCharConfig = /* @__PURE__ */ Facet.define({
  combine(configs) {
    let config2 = combineConfig(configs, {
      render: null,
      specialChars: Specials,
      addSpecialChars: null
    });
    if (config2.replaceTabs = !supportsTabSize())
      config2.specialChars = new RegExp("	|" + config2.specialChars.source, UnicodeRegexpSupport);
    if (config2.addSpecialChars)
      config2.specialChars = new RegExp(config2.specialChars.source + "|" + config2.addSpecialChars.source, UnicodeRegexpSupport);
    return config2;
  }
});
function highlightSpecialChars(config2 = {}) {
  return [specialCharConfig.of(config2), specialCharPlugin()];
}
let _plugin = null;
function specialCharPlugin() {
  return _plugin || (_plugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.decorations = Decoration.none;
      this.decorationCache = /* @__PURE__ */ Object.create(null);
      this.decorator = this.makeDecorator(view.state.facet(specialCharConfig));
      this.decorations = this.decorator.createDeco(view);
    }
    makeDecorator(conf) {
      return new MatchDecorator({
        regexp: conf.specialChars,
        decoration: (m, view, pos) => {
          let { doc: doc2 } = view.state;
          let code2 = codePointAt(m[0], 0);
          if (code2 == 9) {
            let line = doc2.lineAt(pos);
            let size = view.state.tabSize, col = countColumn(line.text, size, pos - line.from);
            return Decoration.replace({
              widget: new TabWidget((size - col % size) * this.view.defaultCharacterWidth / this.view.scaleX)
            });
          }
          return this.decorationCache[code2] || (this.decorationCache[code2] = Decoration.replace({ widget: new SpecialCharWidget(conf, code2) }));
        },
        boundary: conf.replaceTabs ? void 0 : /[^]/
      });
    }
    update(update) {
      let conf = update.state.facet(specialCharConfig);
      if (update.startState.facet(specialCharConfig) != conf) {
        this.decorator = this.makeDecorator(conf);
        this.decorations = this.decorator.createDeco(update.view);
      } else {
        this.decorations = this.decorator.updateDeco(update, this.decorations);
      }
    }
  }, {
    decorations: (v) => v.decorations
  }));
}
const DefaultPlaceholder = "•";
function placeholder$1(code2) {
  if (code2 >= 32)
    return DefaultPlaceholder;
  if (code2 == 10)
    return "␤";
  return String.fromCharCode(9216 + code2);
}
class SpecialCharWidget extends WidgetType {
  constructor(options, code2) {
    super();
    this.options = options;
    this.code = code2;
  }
  eq(other) {
    return other.code == this.code;
  }
  toDOM(view) {
    let ph = placeholder$1(this.code);
    let desc = view.state.phrase("Control character") + " " + (Names[this.code] || "0x" + this.code.toString(16));
    let custom = this.options.render && this.options.render(this.code, desc, ph);
    if (custom)
      return custom;
    let span = document.createElement("span");
    span.textContent = ph;
    span.title = desc;
    span.setAttribute("aria-label", desc);
    span.className = "cm-specialChar";
    return span;
  }
  ignoreEvent() {
    return false;
  }
}
class TabWidget extends WidgetType {
  constructor(width) {
    super();
    this.width = width;
  }
  eq(other) {
    return other.width == this.width;
  }
  toDOM() {
    let span = document.createElement("span");
    span.textContent = "	";
    span.className = "cm-tab";
    span.style.width = this.width + "px";
    return span;
  }
  ignoreEvent() {
    return false;
  }
}
function highlightActiveLine() {
  return activeLineHighlighter;
}
const lineDeco = /* @__PURE__ */ Decoration.line({ class: "cm-activeLine" });
const activeLineHighlighter = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.getDeco(view);
  }
  update(update) {
    if (update.docChanged || update.selectionSet)
      this.decorations = this.getDeco(update.view);
  }
  getDeco(view) {
    let lastLineStart = -1, deco = [];
    for (let r of view.state.selection.ranges) {
      let line = view.lineBlockAt(r.head);
      if (line.from > lastLineStart) {
        deco.push(lineDeco.range(line.from));
        lastLineStart = line.from;
      }
    }
    return Decoration.set(deco);
  }
}, {
  decorations: (v) => v.decorations
});
const MaxOff = 2e3;
function rectangleFor(state2, a, b) {
  let startLine = Math.min(a.line, b.line), endLine = Math.max(a.line, b.line);
  let ranges = [];
  if (a.off > MaxOff || b.off > MaxOff || a.col < 0 || b.col < 0) {
    let startOff = Math.min(a.off, b.off), endOff = Math.max(a.off, b.off);
    for (let i2 = startLine; i2 <= endLine; i2++) {
      let line = state2.doc.line(i2);
      if (line.length <= endOff)
        ranges.push(EditorSelection.range(line.from + startOff, line.to + endOff));
    }
  } else {
    let startCol = Math.min(a.col, b.col), endCol = Math.max(a.col, b.col);
    for (let i2 = startLine; i2 <= endLine; i2++) {
      let line = state2.doc.line(i2);
      let start = findColumn(line.text, startCol, state2.tabSize, true);
      if (start < 0) {
        ranges.push(EditorSelection.cursor(line.to));
      } else {
        let end = findColumn(line.text, endCol, state2.tabSize);
        ranges.push(EditorSelection.range(line.from + start, line.from + end));
      }
    }
  }
  return ranges;
}
function absoluteColumn(view, x) {
  let ref = view.coordsAtPos(view.viewport.from);
  return ref ? Math.round(Math.abs((ref.left - x) / view.defaultCharacterWidth)) : -1;
}
function getPos(view, event) {
  let offset = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
  let line = view.state.doc.lineAt(offset), off = offset - line.from;
  let col = off > MaxOff ? -1 : off == line.length ? absoluteColumn(view, event.clientX) : countColumn(line.text, view.state.tabSize, offset - line.from);
  return { line: line.number, col, off };
}
function rectangleSelectionStyle(view, event) {
  let start = getPos(view, event), startSel = view.state.selection;
  if (!start)
    return null;
  return {
    update(update) {
      if (update.docChanged) {
        let newStart = update.changes.mapPos(update.startState.doc.line(start.line).from);
        let newLine = update.state.doc.lineAt(newStart);
        start = { line: newLine.number, col: start.col, off: Math.min(start.off, newLine.length) };
        startSel = startSel.map(update.changes);
      }
    },
    get(event2, _extend, multiple) {
      let cur2 = getPos(view, event2);
      if (!cur2)
        return startSel;
      let ranges = rectangleFor(view.state, start, cur2);
      if (!ranges.length)
        return startSel;
      if (multiple)
        return EditorSelection.create(ranges.concat(startSel.ranges));
      else
        return EditorSelection.create(ranges);
    }
  };
}
function rectangularSelection(options) {
  let filter = ((e) => e.altKey && e.button == 0);
  return EditorView.mouseSelectionStyle.of((view, event) => filter(event) ? rectangleSelectionStyle(view, event) : null);
}
const keys = {
  Alt: [18, (e) => !!e.altKey],
  Control: [17, (e) => !!e.ctrlKey],
  Shift: [16, (e) => !!e.shiftKey],
  Meta: [91, (e) => !!e.metaKey]
};
const showCrosshair = { style: "cursor: crosshair" };
function crosshairCursor(options = {}) {
  let [code2, getter] = keys[options.key || "Alt"];
  let plugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.isDown = false;
    }
    set(isDown) {
      if (this.isDown != isDown) {
        this.isDown = isDown;
        this.view.update([]);
      }
    }
  }, {
    eventObservers: {
      keydown(e) {
        this.set(e.keyCode == code2 || getter(e));
      },
      keyup(e) {
        if (e.keyCode == code2 || !getter(e))
          this.set(false);
      },
      mousemove(e) {
        this.set(getter(e));
      }
    }
  });
  return [
    plugin,
    EditorView.contentAttributes.of((view) => {
      var _a2;
      return ((_a2 = view.plugin(plugin)) === null || _a2 === void 0 ? void 0 : _a2.isDown) ? showCrosshair : null;
    })
  ];
}
const Outside = "-10000px";
class TooltipViewManager {
  constructor(view, facet, createTooltipView, removeTooltipView) {
    this.facet = facet;
    this.createTooltipView = createTooltipView;
    this.removeTooltipView = removeTooltipView;
    this.input = view.state.facet(facet);
    this.tooltips = this.input.filter((t2) => t2);
    let prev = null;
    this.tooltipViews = this.tooltips.map((t2) => prev = createTooltipView(t2, prev));
  }
  update(update, above) {
    var _a2;
    let input = update.state.facet(this.facet);
    let tooltips = input.filter((x) => x);
    if (input === this.input) {
      for (let t2 of this.tooltipViews)
        if (t2.update)
          t2.update(update);
      return false;
    }
    let tooltipViews = [], newAbove = above ? [] : null;
    for (let i2 = 0; i2 < tooltips.length; i2++) {
      let tip = tooltips[i2], known = -1;
      if (!tip)
        continue;
      for (let i3 = 0; i3 < this.tooltips.length; i3++) {
        let other = this.tooltips[i3];
        if (other && other.create == tip.create)
          known = i3;
      }
      if (known < 0) {
        tooltipViews[i2] = this.createTooltipView(tip, i2 ? tooltipViews[i2 - 1] : null);
        if (newAbove)
          newAbove[i2] = !!tip.above;
      } else {
        let tooltipView = tooltipViews[i2] = this.tooltipViews[known];
        if (newAbove)
          newAbove[i2] = above[known];
        if (tooltipView.update)
          tooltipView.update(update);
      }
    }
    for (let t2 of this.tooltipViews)
      if (tooltipViews.indexOf(t2) < 0) {
        this.removeTooltipView(t2);
        (_a2 = t2.destroy) === null || _a2 === void 0 ? void 0 : _a2.call(t2);
      }
    if (above) {
      newAbove.forEach((val, i2) => above[i2] = val);
      above.length = newAbove.length;
    }
    this.input = input;
    this.tooltips = tooltips;
    this.tooltipViews = tooltipViews;
    return true;
  }
}
function fixedRange(view) {
  let docElt = view.dom.ownerDocument.documentElement, width = docElt.clientWidth;
  let style = getComputedStyle(docElt);
  if (!/stable/.test(style.scrollbarGutter || ""))
    return { left: 0, right: width };
  let rect = docElt.getBoundingClientRect(), scrollX = view.win.scrollX;
  return {
    left: Math.max(0, rect.left + scrollX - parseFloat(style.marginLeft)),
    right: Math.min(width, rect.right + scrollX + parseFloat(style.marginRight))
  };
}
function windowSpace(view) {
  let { left, right } = fixedRange(view);
  return { top: 0, left, right, bottom: view.dom.ownerDocument.documentElement.clientHeight };
}
const tooltipConfig = /* @__PURE__ */ Facet.define({
  combine: (values) => {
    var _a2, _b, _c;
    return {
      position: browser.ios ? "absolute" : ((_a2 = values.find((conf) => conf.position)) === null || _a2 === void 0 ? void 0 : _a2.position) || "fixed",
      parent: ((_b = values.find((conf) => conf.parent)) === null || _b === void 0 ? void 0 : _b.parent) || null,
      tooltipSpace: ((_c = values.find((conf) => conf.tooltipSpace)) === null || _c === void 0 ? void 0 : _c.tooltipSpace) || windowSpace
    };
  }
});
const knownHeight = /* @__PURE__ */ new WeakMap();
const tooltipPlugin = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.above = [];
    this.inView = true;
    this.madeAbsolute = false;
    this.lastTransaction = 0;
    this.measureTimeout = -1;
    let config2 = view.state.facet(tooltipConfig);
    this.position = config2.position;
    this.parent = config2.parent;
    this.classes = view.themeClasses;
    this.createContainer();
    this.measureReq = { read: this.readMeasure.bind(this), write: this.writeMeasure.bind(this), key: this };
    this.resizeObserver = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.measureSoon()) : null;
    this.manager = new TooltipViewManager(view, showTooltip, (t2, p) => this.createTooltip(t2, p), (t2) => {
      if (this.resizeObserver)
        this.resizeObserver.unobserve(t2.dom);
      t2.dom.remove();
    });
    this.above = this.manager.tooltips.map((t2) => !!t2.above);
    this.intersectionObserver = typeof IntersectionObserver == "function" ? new IntersectionObserver((entries) => {
      if (Date.now() > this.lastTransaction - 50 && entries.length > 0 && entries[entries.length - 1].intersectionRatio < 1)
        this.measureSoon();
    }, { threshold: [1] }) : null;
    this.observeIntersection();
    view.win.addEventListener("resize", this.measureSoon = this.measureSoon.bind(this));
    this.maybeMeasure();
  }
  createContainer() {
    if (this.parent) {
      this.container = document.createElement("div");
      this.container.style.position = "relative";
      this.container.className = this.view.themeClasses;
      this.parent.appendChild(this.container);
    } else {
      this.container = this.view.dom;
    }
  }
  observeIntersection() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      for (let tooltip of this.manager.tooltipViews)
        this.intersectionObserver.observe(tooltip.dom);
    }
  }
  measureSoon() {
    if (this.measureTimeout < 0)
      this.measureTimeout = setTimeout(() => {
        this.measureTimeout = -1;
        this.maybeMeasure();
      }, 50);
  }
  update(update) {
    if (update.transactions.length)
      this.lastTransaction = Date.now();
    let updated = this.manager.update(update, this.above);
    if (updated)
      this.observeIntersection();
    let shouldMeasure = updated || update.geometryChanged;
    let newConfig = update.state.facet(tooltipConfig);
    if (newConfig.position != this.position && !this.madeAbsolute) {
      this.position = newConfig.position;
      for (let t2 of this.manager.tooltipViews)
        t2.dom.style.position = this.position;
      shouldMeasure = true;
    }
    if (newConfig.parent != this.parent) {
      if (this.parent)
        this.container.remove();
      this.parent = newConfig.parent;
      this.createContainer();
      for (let t2 of this.manager.tooltipViews)
        this.container.appendChild(t2.dom);
      shouldMeasure = true;
    } else if (this.parent && this.view.themeClasses != this.classes) {
      this.classes = this.container.className = this.view.themeClasses;
    }
    if (shouldMeasure)
      this.maybeMeasure();
  }
  createTooltip(tooltip, prev) {
    let tooltipView = tooltip.create(this.view);
    let before = prev ? prev.dom : null;
    tooltipView.dom.classList.add("cm-tooltip");
    if (tooltip.arrow && !tooltipView.dom.querySelector(".cm-tooltip > .cm-tooltip-arrow")) {
      let arrow = document.createElement("div");
      arrow.className = "cm-tooltip-arrow";
      tooltipView.dom.appendChild(arrow);
    }
    tooltipView.dom.style.position = this.position;
    tooltipView.dom.style.top = Outside;
    tooltipView.dom.style.left = "0px";
    this.container.insertBefore(tooltipView.dom, before);
    if (tooltipView.mount)
      tooltipView.mount(this.view);
    if (this.resizeObserver)
      this.resizeObserver.observe(tooltipView.dom);
    return tooltipView;
  }
  destroy() {
    var _a2, _b, _c;
    this.view.win.removeEventListener("resize", this.measureSoon);
    for (let tooltipView of this.manager.tooltipViews) {
      tooltipView.dom.remove();
      (_a2 = tooltipView.destroy) === null || _a2 === void 0 ? void 0 : _a2.call(tooltipView);
    }
    if (this.parent)
      this.container.remove();
    (_b = this.resizeObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
    (_c = this.intersectionObserver) === null || _c === void 0 ? void 0 : _c.disconnect();
    clearTimeout(this.measureTimeout);
  }
  readMeasure() {
    let scaleX = 1, scaleY = 1, makeAbsolute = false, fixedLeft = 0;
    if (this.position == "fixed" && this.manager.tooltipViews.length) {
      let { dom } = this.manager.tooltipViews[0];
      if (browser.safari) {
        let rect = dom.getBoundingClientRect();
        makeAbsolute = Math.abs(rect.top + 1e4) > 1 || Math.abs(rect.left) > 1;
      } else {
        makeAbsolute = !!dom.offsetParent && dom.offsetParent != this.container.ownerDocument.body;
      }
    }
    if (makeAbsolute || this.position == "absolute") {
      if (this.parent) {
        let rect = this.parent.getBoundingClientRect();
        if (rect.width && rect.height) {
          scaleX = rect.width / this.parent.offsetWidth;
          scaleY = rect.height / this.parent.offsetHeight;
        }
      } else {
        ({ scaleX, scaleY } = this.view.viewState);
      }
    } else {
      fixedLeft = fixedRange(this.view).left;
    }
    let visible = this.view.scrollDOM.getBoundingClientRect(), margins = getScrollMargins(this.view);
    return {
      visible: {
        left: visible.left + margins.left,
        top: visible.top + margins.top,
        right: visible.right - margins.right,
        bottom: visible.bottom - margins.bottom
      },
      parent: this.parent ? this.container.getBoundingClientRect() : this.view.dom.getBoundingClientRect(),
      pos: this.manager.tooltips.map((t2, i2) => {
        let tv = this.manager.tooltipViews[i2];
        return tv.getCoords ? tv.getCoords(t2.pos) : this.view.coordsAtPos(t2.pos);
      }),
      size: this.manager.tooltipViews.map(({ dom }) => dom.getBoundingClientRect()),
      space: this.view.state.facet(tooltipConfig).tooltipSpace(this.view),
      scaleX,
      scaleY,
      makeAbsolute,
      fixedLeft
    };
  }
  writeMeasure(measured) {
    var _a2;
    if (measured.makeAbsolute) {
      this.madeAbsolute = true;
      this.position = "absolute";
      for (let t2 of this.manager.tooltipViews)
        t2.dom.style.position = "absolute";
    }
    let { visible, space, scaleX, scaleY } = measured;
    let others = [];
    for (let i2 = 0; i2 < this.manager.tooltips.length; i2++) {
      let tooltip = this.manager.tooltips[i2], tView = this.manager.tooltipViews[i2], { dom } = tView;
      let pos = measured.pos[i2], size = measured.size[i2];
      if (!pos || tooltip.clip !== false && (pos.bottom <= Math.max(visible.top, space.top) || pos.top >= Math.min(visible.bottom, space.bottom) || pos.right < Math.max(visible.left, space.left) - 0.1 || pos.left > Math.min(visible.right, space.right) + 0.1)) {
        dom.style.top = Outside;
        continue;
      }
      let arrow = tooltip.arrow ? tView.dom.querySelector(".cm-tooltip-arrow") : null;
      let arrowHeight = arrow ? 7 : 0;
      let width = size.right - size.left, height = (_a2 = knownHeight.get(tView)) !== null && _a2 !== void 0 ? _a2 : size.bottom - size.top;
      let offset = tView.offset || noOffset, ltr = this.view.textDirection == Direction.LTR;
      let left = size.width > space.right - space.left ? ltr ? space.left : space.right - size.width : ltr ? Math.max(space.left, Math.min(pos.left - (arrow ? 14 : 0) + offset.x, space.right - width)) : Math.min(Math.max(space.left, pos.left - width + (arrow ? 14 : 0) - offset.x), space.right - width);
      let above = this.above[i2];
      if (!tooltip.strictSide && (above ? pos.top - height - arrowHeight - offset.y < space.top : pos.bottom + height + arrowHeight + offset.y > space.bottom) && above == space.bottom - pos.bottom > pos.top - space.top)
        above = this.above[i2] = !above;
      let spaceVert = (above ? pos.top - space.top : space.bottom - pos.bottom) - arrowHeight;
      if (spaceVert < height && tView.resize !== false) {
        if (spaceVert < this.view.defaultLineHeight) {
          dom.style.top = Outside;
          continue;
        }
        knownHeight.set(tView, height);
        dom.style.height = (height = spaceVert) / scaleY + "px";
      } else if (dom.style.height) {
        dom.style.height = "";
      }
      let top2 = above ? pos.top - height - arrowHeight - offset.y : pos.bottom + arrowHeight + offset.y;
      let right = left + width;
      if (tView.overlap !== true) {
        for (let r of others)
          if (r.left < right && r.right > left && r.top < top2 + height && r.bottom > top2)
            top2 = above ? r.top - height - 2 - arrowHeight : r.bottom + arrowHeight + 2;
      }
      if (this.position == "absolute") {
        dom.style.top = (top2 - measured.parent.top) / scaleY + "px";
        setLeftStyle(dom, (left - measured.parent.left) / scaleX);
      } else {
        dom.style.top = top2 / scaleY + "px";
        setLeftStyle(dom, (left - measured.fixedLeft) / scaleX);
      }
      if (arrow) {
        let arrowLeft = pos.left + (ltr ? offset.x : -offset.x) - (left + 14 - 7);
        arrow.style.left = arrowLeft / scaleX + "px";
      }
      if (tView.overlap !== true)
        others.push({ left, top: top2, right, bottom: top2 + height });
      dom.classList.toggle("cm-tooltip-above", above);
      dom.classList.toggle("cm-tooltip-below", !above);
      if (tView.positioned)
        tView.positioned(measured.space);
    }
  }
  maybeMeasure() {
    if (this.manager.tooltips.length) {
      if (this.view.inView)
        this.view.requestMeasure(this.measureReq);
      if (this.inView != this.view.inView) {
        this.inView = this.view.inView;
        if (!this.inView)
          for (let tv of this.manager.tooltipViews)
            tv.dom.style.top = Outside;
      }
    }
  }
}, {
  eventObservers: {
    scroll() {
      this.maybeMeasure();
    }
  }
});
function setLeftStyle(elt, value) {
  let current = parseInt(elt.style.left, 10);
  if (isNaN(current) || Math.abs(value - current) > 1)
    elt.style.left = value + "px";
}
const baseTheme$4 = /* @__PURE__ */ EditorView.baseTheme({
  ".cm-tooltip": {
    zIndex: 500,
    boxSizing: "border-box"
  },
  "&light .cm-tooltip": {
    border: "1px solid #bbb",
    backgroundColor: "#f5f5f5"
  },
  "&light .cm-tooltip-section:not(:first-child)": {
    borderTop: "1px solid #bbb"
  },
  "&dark .cm-tooltip": {
    backgroundColor: "#333338",
    color: "white"
  },
  ".cm-tooltip-arrow": {
    height: `${7}px`,
    width: `${7 * 2}px`,
    position: "absolute",
    zIndex: -1,
    overflow: "hidden",
    "&:before, &:after": {
      content: "''",
      position: "absolute",
      width: 0,
      height: 0,
      borderLeft: `${7}px solid transparent`,
      borderRight: `${7}px solid transparent`
    },
    ".cm-tooltip-above &": {
      bottom: `-${7}px`,
      "&:before": {
        borderTop: `${7}px solid #bbb`
      },
      "&:after": {
        borderTop: `${7}px solid #f5f5f5`,
        bottom: "1px"
      }
    },
    ".cm-tooltip-below &": {
      top: `-${7}px`,
      "&:before": {
        borderBottom: `${7}px solid #bbb`
      },
      "&:after": {
        borderBottom: `${7}px solid #f5f5f5`,
        top: "1px"
      }
    }
  },
  "&dark .cm-tooltip .cm-tooltip-arrow": {
    "&:before": {
      borderTopColor: "#333338",
      borderBottomColor: "#333338"
    },
    "&:after": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent"
    }
  }
});
const noOffset = { x: 0, y: 0 };
const showTooltip = /* @__PURE__ */ Facet.define({
  enables: [tooltipPlugin, baseTheme$4]
});
const showHoverTooltip = /* @__PURE__ */ Facet.define({
  combine: (inputs) => inputs.reduce((a, i2) => a.concat(i2), [])
});
class HoverTooltipHost {
  // Needs to be static so that host tooltip instances always match
  static create(view) {
    return new HoverTooltipHost(view);
  }
  constructor(view) {
    this.view = view;
    this.mounted = false;
    this.dom = document.createElement("div");
    this.dom.classList.add("cm-tooltip-hover");
    this.manager = new TooltipViewManager(view, showHoverTooltip, (t2, p) => this.createHostedView(t2, p), (t2) => t2.dom.remove());
  }
  createHostedView(tooltip, prev) {
    let hostedView = tooltip.create(this.view);
    hostedView.dom.classList.add("cm-tooltip-section");
    this.dom.insertBefore(hostedView.dom, prev ? prev.dom.nextSibling : this.dom.firstChild);
    if (this.mounted && hostedView.mount)
      hostedView.mount(this.view);
    return hostedView;
  }
  mount(view) {
    for (let hostedView of this.manager.tooltipViews) {
      if (hostedView.mount)
        hostedView.mount(view);
    }
    this.mounted = true;
  }
  positioned(space) {
    for (let hostedView of this.manager.tooltipViews) {
      if (hostedView.positioned)
        hostedView.positioned(space);
    }
  }
  update(update) {
    this.manager.update(update);
  }
  destroy() {
    var _a2;
    for (let t2 of this.manager.tooltipViews)
      (_a2 = t2.destroy) === null || _a2 === void 0 ? void 0 : _a2.call(t2);
  }
  passProp(name2) {
    let value = void 0;
    for (let view of this.manager.tooltipViews) {
      let given = view[name2];
      if (given !== void 0) {
        if (value === void 0)
          value = given;
        else if (value !== given)
          return void 0;
      }
    }
    return value;
  }
  get offset() {
    return this.passProp("offset");
  }
  get getCoords() {
    return this.passProp("getCoords");
  }
  get overlap() {
    return this.passProp("overlap");
  }
  get resize() {
    return this.passProp("resize");
  }
}
const showHoverTooltipHost = /* @__PURE__ */ showTooltip.compute([showHoverTooltip], (state2) => {
  let tooltips = state2.facet(showHoverTooltip);
  if (tooltips.length === 0)
    return null;
  return {
    pos: Math.min(...tooltips.map((t2) => t2.pos)),
    end: Math.max(...tooltips.map((t2) => {
      var _a2;
      return (_a2 = t2.end) !== null && _a2 !== void 0 ? _a2 : t2.pos;
    })),
    create: HoverTooltipHost.create,
    above: tooltips[0].above,
    arrow: tooltips.some((t2) => t2.arrow)
  };
});
const hoverPlugin = /* @__PURE__ */ Facet.define();
class HoverPlugin {
  constructor(view, source, field, locked, setHover, hoverTime) {
    this.view = view;
    this.source = source;
    this.field = field;
    this.locked = locked;
    this.setHover = setHover;
    this.hoverTime = hoverTime;
    this.hoverTimeout = -1;
    this.restartTimeout = -1;
    this.pending = null;
    this.lastMove = { x: 0, y: 0, target: view.dom, time: 0 };
    this.checkHover = this.checkHover.bind(this);
    view.dom.addEventListener("mouseleave", this.mouseleave = this.mouseleave.bind(this));
    view.dom.addEventListener("mousemove", this.mousemove = this.mousemove.bind(this));
  }
  update(update) {
    if (this.pending) {
      this.pending = null;
      clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => this.startHover(), 20);
    }
  }
  get active() {
    return this.view.state.field(this.field);
  }
  checkHover() {
    this.hoverTimeout = -1;
    if (this.active.length)
      return;
    let hovered = Date.now() - this.lastMove.time;
    if (hovered < this.hoverTime)
      this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime - hovered);
    else
      this.startHover();
  }
  startHover() {
    clearTimeout(this.restartTimeout);
    let { view, lastMove } = this;
    let tile = view.docView.tile.nearest(lastMove.target);
    if (!tile)
      return;
    let pos, side = 1;
    if (tile.isWidget()) {
      pos = tile.posAtStart;
    } else {
      pos = view.posAtCoords(lastMove);
      if (pos == null)
        return;
      let posCoords = view.coordsAtPos(pos);
      if (!posCoords || lastMove.y < posCoords.top || lastMove.y > posCoords.bottom || lastMove.x < posCoords.left - view.defaultCharacterWidth || lastMove.x > posCoords.right + view.defaultCharacterWidth)
        return;
      let bidi = view.bidiSpans(view.state.doc.lineAt(pos)).find((s) => s.from <= pos && s.to >= pos);
      let rtl = bidi && bidi.dir == Direction.RTL ? -1 : 1;
      side = lastMove.x < posCoords.left ? -rtl : rtl;
    }
    this.activateHover(view, pos, side);
  }
  activateHover(view, pos, side, locked) {
    let open2 = this.source(view, pos, side);
    let done = (value) => {
      if (value && !(Array.isArray(value) && !value.length)) {
        let tooltips = Array.isArray(value) ? value : [value];
        if (locked)
          this.locked.set(tooltips, locked);
        view.dispatch({ effects: this.setHover.of(tooltips) });
      }
    };
    if (open2 && "then" in open2) {
      let pending = this.pending = { pos };
      open2.then((result) => {
        if (this.pending == pending) {
          this.pending = null;
          done(result);
        }
      }, (e) => logException(view.state, e, "hover tooltip"));
    } else {
      done(open2);
    }
  }
  get tooltip() {
    let plugin = this.view.plugin(tooltipPlugin);
    let index = plugin ? plugin.manager.tooltips.findIndex((t2) => t2.create == HoverTooltipHost.create) : -1;
    return index > -1 ? plugin.manager.tooltipViews[index] : null;
  }
  mousemove(event) {
    var _a2, _b;
    this.lastMove = { x: event.clientX, y: event.clientY, target: event.target, time: Date.now() };
    if (this.hoverTimeout < 0)
      this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime);
    let { active, tooltip } = this;
    if (active.length && !this.locked.has(active) && tooltip && !isInTooltip(tooltip.dom, event) || this.pending) {
      let { pos } = active[0] || this.pending, end = (_b = (_a2 = active[0]) === null || _a2 === void 0 ? void 0 : _a2.end) !== null && _b !== void 0 ? _b : pos;
      if (pos == end ? this.view.posAtCoords(this.lastMove) != pos : !isOverRange(this.view, pos, end, event.clientX, event.clientY)) {
        this.view.dispatch({ effects: this.setHover.of([]) });
        this.pending = null;
      }
    }
  }
  mouseleave(event) {
    clearTimeout(this.hoverTimeout);
    this.hoverTimeout = -1;
    let { active } = this;
    if (active.length && !this.locked.has(active)) {
      let { tooltip } = this;
      let inTooltip = tooltip && tooltip.dom.contains(event.relatedTarget);
      if (!inTooltip)
        this.view.dispatch({ effects: this.setHover.of([]) });
      else
        this.watchTooltipLeave(tooltip.dom);
    }
  }
  watchTooltipLeave(tooltip) {
    let watch = (event) => {
      tooltip.removeEventListener("mouseleave", watch);
      let { active } = this;
      if (active.length && !this.locked.has(active) && !this.view.dom.contains(event.relatedTarget))
        this.view.dispatch({ effects: this.setHover.of([]) });
    };
    tooltip.addEventListener("mouseleave", watch);
  }
  destroy() {
    clearTimeout(this.hoverTimeout);
    clearTimeout(this.restartTimeout);
    this.view.dom.removeEventListener("mouseleave", this.mouseleave);
    this.view.dom.removeEventListener("mousemove", this.mousemove);
  }
}
const tooltipMargin = 4;
function isInTooltip(tooltip, event) {
  let { left, right, top: top2, bottom } = tooltip.getBoundingClientRect(), arrow;
  if (arrow = tooltip.querySelector(".cm-tooltip-arrow")) {
    let arrowRect = arrow.getBoundingClientRect();
    top2 = Math.min(arrowRect.top, top2);
    bottom = Math.max(arrowRect.bottom, bottom);
  }
  return event.clientX >= left - tooltipMargin && event.clientX <= right + tooltipMargin && event.clientY >= top2 - tooltipMargin && event.clientY <= bottom + tooltipMargin;
}
function isOverRange(view, from, to, x, y, margin) {
  let rect = view.scrollDOM.getBoundingClientRect();
  let docBottom = view.documentTop + view.documentPadding.top + view.contentHeight;
  if (rect.left > x || rect.right < x || rect.top > y || Math.min(rect.bottom, docBottom) < y)
    return false;
  let pos = view.posAtCoords({ x, y }, false);
  return pos >= from && pos <= to;
}
function hoverTooltip(source, options = {}) {
  let setHover = StateEffect.define();
  let locked = /* @__PURE__ */ new WeakMap();
  let hoverState = StateField.define({
    create() {
      return [];
    },
    update(value, tr) {
      let lock = locked.get(value);
      if (value.length) {
        if (options.hideOnChange && (tr.docChanged || tr.selection))
          value = [];
        else if (lock && lock(tr))
          value = [];
        else if (options.hideOn)
          value = value.filter((v) => !options.hideOn(tr, v));
      }
      if (tr.docChanged && value.length) {
        let mapped = [];
        for (let tooltip of value) {
          let newPos = tr.changes.mapPos(tooltip.pos, -1, MapMode.TrackDel);
          if (newPos != null) {
            let copy = Object.assign(/* @__PURE__ */ Object.create(null), tooltip);
            copy.pos = newPos;
            if (copy.end != null)
              copy.end = tr.changes.mapPos(copy.end);
            mapped.push(copy);
          }
        }
        value = mapped;
      }
      for (let effect of tr.effects) {
        if (effect.is(setHover)) {
          value = effect.value;
          lock = void 0;
        }
        if (effect.is(closeHoverTooltipEffect) && !effect.value || effect.value == hoverState)
          value = [];
      }
      if (value.length && lock)
        locked.set(value, lock);
      return value;
    },
    provide: (f) => showHoverTooltip.from(f)
  });
  const plugin = ViewPlugin.define((view) => new HoverPlugin(
    view,
    source,
    hoverState,
    locked,
    setHover,
    options.hoverTime || 300
    /* Hover.Time */
  ));
  return {
    active: hoverState,
    extension: [
      hoverState,
      plugin,
      hoverPlugin.of(plugin),
      showHoverTooltipHost
    ]
  };
}
function activateHover(view, pos, side, options = {}) {
  var _a2;
  let plugins = view.state.facet(hoverPlugin).map((p) => view.plugin(p)).filter((p) => !!p);
  if (options.tooltip && options.tooltip.active) {
    let found = plugins.find((p) => p.field == options.tooltip.active);
    if (found)
      plugins = [found];
  }
  for (let plugin of plugins)
    plugin.activateHover(view, pos, side, (_a2 = options.until) !== null && _a2 !== void 0 ? _a2 : (() => false));
}
function getTooltip(view, tooltip) {
  let plugin = view.plugin(tooltipPlugin);
  if (!plugin)
    return null;
  let found = plugin.manager.tooltips.indexOf(tooltip);
  return found < 0 ? null : plugin.manager.tooltipViews[found];
}
const closeHoverTooltipEffect = /* @__PURE__ */ StateEffect.define();
const panelConfig = /* @__PURE__ */ Facet.define({
  combine(configs) {
    let topContainer, bottomContainer;
    for (let c of configs) {
      topContainer = topContainer || c.topContainer;
      bottomContainer = bottomContainer || c.bottomContainer;
    }
    return { topContainer, bottomContainer };
  }
});
function getPanel(view, panel) {
  let plugin = view.plugin(panelPlugin);
  let index = plugin ? plugin.specs.indexOf(panel) : -1;
  return index > -1 ? plugin.panels[index] : null;
}
const panelPlugin = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.input = view.state.facet(showPanel);
    this.specs = this.input.filter((s) => s);
    this.panels = this.specs.map((spec) => spec(view));
    let conf = view.state.facet(panelConfig);
    this.top = new PanelGroup(view, true, conf.topContainer);
    this.bottom = new PanelGroup(view, false, conf.bottomContainer);
    this.top.sync(this.panels.filter((p) => p.top));
    this.bottom.sync(this.panels.filter((p) => !p.top));
    for (let p of this.panels) {
      p.dom.classList.add("cm-panel");
      if (p.mount)
        p.mount();
    }
  }
  update(update) {
    let conf = update.state.facet(panelConfig);
    if (this.top.container != conf.topContainer) {
      this.top.sync([]);
      this.top = new PanelGroup(update.view, true, conf.topContainer);
    }
    if (this.bottom.container != conf.bottomContainer) {
      this.bottom.sync([]);
      this.bottom = new PanelGroup(update.view, false, conf.bottomContainer);
    }
    this.top.syncClasses();
    this.bottom.syncClasses();
    let input = update.state.facet(showPanel);
    if (input != this.input) {
      let specs = input.filter((x) => x);
      let panels = [], top2 = [], bottom = [], mount = [];
      for (let spec of specs) {
        let known = this.specs.indexOf(spec), panel;
        if (known < 0) {
          panel = spec(update.view);
          mount.push(panel);
        } else {
          panel = this.panels[known];
          if (panel.update)
            panel.update(update);
        }
        panels.push(panel);
        (panel.top ? top2 : bottom).push(panel);
      }
      this.specs = specs;
      this.panels = panels;
      this.top.sync(top2);
      this.bottom.sync(bottom);
      for (let p of mount) {
        p.dom.classList.add("cm-panel");
        if (p.mount)
          p.mount();
      }
    } else {
      for (let p of this.panels)
        if (p.update)
          p.update(update);
    }
  }
  destroy() {
    this.top.sync([]);
    this.bottom.sync([]);
  }
}, {
  provide: (plugin) => EditorView.scrollMargins.of((view) => {
    let value = view.plugin(plugin);
    return value && { top: value.top.scrollMargin(), bottom: value.bottom.scrollMargin() };
  })
});
class PanelGroup {
  constructor(view, top2, container) {
    this.view = view;
    this.top = top2;
    this.container = container;
    this.dom = void 0;
    this.classes = "";
    this.panels = [];
    this.syncClasses();
  }
  sync(panels) {
    for (let p of this.panels)
      if (p.destroy && panels.indexOf(p) < 0)
        p.destroy();
    this.panels = panels;
    this.syncDOM();
  }
  syncDOM() {
    if (this.panels.length == 0) {
      if (this.dom) {
        this.dom.remove();
        this.dom = void 0;
      }
      return;
    }
    if (!this.dom) {
      this.dom = document.createElement("div");
      this.dom.className = this.top ? "cm-panels cm-panels-top" : "cm-panels cm-panels-bottom";
      let parent = this.container || this.view.dom;
      parent.insertBefore(this.dom, this.top ? parent.firstChild : null);
    }
    let curDOM = this.dom.firstChild;
    for (let panel of this.panels) {
      if (panel.dom.parentNode == this.dom) {
        while (curDOM != panel.dom)
          curDOM = rm(curDOM);
        curDOM = curDOM.nextSibling;
      } else {
        this.dom.insertBefore(panel.dom, curDOM);
      }
    }
    while (curDOM)
      curDOM = rm(curDOM);
  }
  scrollMargin() {
    return !this.dom || this.container ? 0 : Math.max(0, this.top ? this.dom.getBoundingClientRect().bottom - Math.max(0, this.view.scrollDOM.getBoundingClientRect().top) : Math.min(innerHeight, this.view.scrollDOM.getBoundingClientRect().bottom) - this.dom.getBoundingClientRect().top);
  }
  syncClasses() {
    if (!this.container || this.classes == this.view.themeClasses)
      return;
    for (let cls of this.classes.split(" "))
      if (cls)
        this.container.classList.remove(cls);
    for (let cls of (this.classes = this.view.themeClasses).split(" "))
      if (cls)
        this.container.classList.add(cls);
  }
}
function rm(node) {
  let next = node.nextSibling;
  node.remove();
  return next;
}
const showPanel = /* @__PURE__ */ Facet.define({
  enables: panelPlugin
});
function showDialog(view, config2) {
  let resolve;
  let promise = new Promise((r) => resolve = r);
  let panelCtor = (view2) => createDialog(view2, config2, resolve);
  if (view.state.field(dialogField, false)) {
    view.dispatch({ effects: openDialogEffect.of(panelCtor) });
  } else {
    view.dispatch({ effects: StateEffect.appendConfig.of(dialogField.init(() => [panelCtor])) });
  }
  let close = closeDialogEffect.of(panelCtor);
  return { close, result: promise.then((form) => {
    let queue = view.win.queueMicrotask || ((f) => view.win.setTimeout(f, 10));
    queue(() => {
      if (view.state.field(dialogField).indexOf(panelCtor) > -1)
        view.dispatch({ effects: close });
    });
    return form;
  }) };
}
function getDialog(view, className) {
  let dialogs = view.state.field(dialogField, false) || [];
  for (let open2 of dialogs) {
    let panel = getPanel(view, open2);
    if (panel && panel.dom.classList.contains(className))
      return panel;
  }
  return null;
}
const dialogField = /* @__PURE__ */ StateField.define({
  create() {
    return [];
  },
  update(dialogs, tr) {
    for (let e of tr.effects) {
      if (e.is(openDialogEffect))
        dialogs = [e.value].concat(dialogs);
      else if (e.is(closeDialogEffect))
        dialogs = dialogs.filter((d) => d != e.value);
    }
    return dialogs;
  },
  provide: (f) => showPanel.computeN([f], (state2) => state2.field(f))
});
const openDialogEffect = /* @__PURE__ */ StateEffect.define();
const closeDialogEffect = /* @__PURE__ */ StateEffect.define();
function createDialog(view, config2, result) {
  let content2 = config2.content ? config2.content(view, () => done(null)) : null;
  if (!content2) {
    content2 = crelt("form");
    if (config2.input) {
      let input = crelt("input", config2.input);
      if (/^(text|password|number|email|tel|url)$/.test(input.type))
        input.classList.add("cm-textfield");
      if (!input.name)
        input.name = "input";
      content2.appendChild(crelt("label", (config2.label || "") + ": ", input));
    } else {
      content2.appendChild(document.createTextNode(config2.label || ""));
    }
    content2.appendChild(document.createTextNode(" "));
    content2.appendChild(crelt("button", { class: "cm-button", type: "submit" }, config2.submitLabel || "OK"));
  }
  let forms = content2.nodeName == "FORM" ? [content2] : content2.querySelectorAll("form");
  for (let i2 = 0; i2 < forms.length; i2++) {
    let form = forms[i2];
    form.addEventListener("keydown", (event) => {
      if (event.keyCode == 27) {
        event.preventDefault();
        done(null);
      } else if (event.keyCode == 13) {
        event.preventDefault();
        done(form);
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      done(form);
    });
  }
  let panel = crelt("div", content2, crelt("button", {
    onclick: () => done(null),
    "aria-label": view.state.phrase("close"),
    class: "cm-dialog-close",
    type: "button"
  }, ["×"]));
  if (config2.class)
    panel.className = config2.class;
  panel.classList.add("cm-dialog");
  let focus = typeof config2.focus == "string" ? content2.querySelector(config2.focus) : config2.focus ? content2.querySelector("input") || content2.querySelector("button") : null;
  function done(form) {
    if (panel.contains(panel.ownerDocument.activeElement))
      view.focus();
    result(form);
  }
  return {
    dom: panel,
    top: config2.top,
    mount: () => {
      if (focus) {
        if ("select" in focus)
          focus.select();
        else if ("focus" in focus)
          focus.focus();
      }
    },
    destroy: () => result(null)
  };
}
class GutterMarker extends RangeValue {
  /**
  @internal
  */
  compare(other) {
    return this == other || this.constructor == other.constructor && this.eq(other);
  }
  /**
  Compare this marker to another marker of the same type.
  */
  eq(other) {
    return false;
  }
  /**
  Called if the marker has a `toDOM` method and its representation
  was removed from a gutter.
  */
  destroy(dom) {
  }
}
GutterMarker.prototype.elementClass = "";
GutterMarker.prototype.toDOM = void 0;
GutterMarker.prototype.mapMode = MapMode.TrackBefore;
GutterMarker.prototype.startSide = GutterMarker.prototype.endSide = -1;
GutterMarker.prototype.point = true;
const gutterLineClass = /* @__PURE__ */ Facet.define();
const gutterWidgetClass = /* @__PURE__ */ Facet.define();
const defaults$1 = {
  class: "",
  renderEmptyElements: false,
  elementStyle: "",
  markers: () => RangeSet.empty,
  lineMarker: () => null,
  widgetMarker: () => null,
  lineMarkerChange: null,
  initialSpacer: null,
  updateSpacer: null,
  domEventHandlers: {},
  side: "before"
};
const activeGutters = /* @__PURE__ */ Facet.define();
function gutter(config2) {
  return [gutters(), activeGutters.of({ ...defaults$1, ...config2 })];
}
const unfixGutters = /* @__PURE__ */ Facet.define({
  combine: (values) => values.some((x) => x)
});
function gutters(config2) {
  let result = [
    gutterView
  ];
  return result;
}
const gutterView = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.domAfter = null;
    this.prevViewport = view.viewport;
    this.dom = document.createElement("div");
    this.dom.className = "cm-gutters cm-gutters-before";
    this.dom.setAttribute("aria-hidden", "true");
    this.dom.style.minHeight = this.view.contentHeight / this.view.scaleY + "px";
    this.gutters = view.state.facet(activeGutters).map((conf) => new SingleGutterView(view, conf));
    this.fixed = !view.state.facet(unfixGutters);
    for (let gutter2 of this.gutters) {
      if (gutter2.config.side == "after")
        this.getDOMAfter().appendChild(gutter2.dom);
      else
        this.dom.appendChild(gutter2.dom);
    }
    if (this.fixed) {
      this.dom.style.position = "sticky";
    }
    this.syncGutters(false);
    view.scrollDOM.insertBefore(this.dom, view.contentDOM);
  }
  getDOMAfter() {
    if (!this.domAfter) {
      this.domAfter = document.createElement("div");
      this.domAfter.className = "cm-gutters cm-gutters-after";
      this.domAfter.setAttribute("aria-hidden", "true");
      this.domAfter.style.minHeight = this.view.contentHeight / this.view.scaleY + "px";
      this.domAfter.style.position = this.fixed ? "sticky" : "";
      this.view.scrollDOM.appendChild(this.domAfter);
    }
    return this.domAfter;
  }
  update(update) {
    if (this.updateGutters(update)) {
      let vpA = this.prevViewport, vpB = update.view.viewport;
      let vpOverlap = Math.min(vpA.to, vpB.to) - Math.max(vpA.from, vpB.from);
      this.syncGutters(vpOverlap < (vpB.to - vpB.from) * 0.8);
    }
    if (update.geometryChanged) {
      let min = this.view.contentHeight / this.view.scaleY + "px";
      this.dom.style.minHeight = min;
      if (this.domAfter)
        this.domAfter.style.minHeight = min;
    }
    if (this.view.state.facet(unfixGutters) != !this.fixed) {
      this.fixed = !this.fixed;
      this.dom.style.position = this.fixed ? "sticky" : "";
      if (this.domAfter)
        this.domAfter.style.position = this.fixed ? "sticky" : "";
    }
    this.prevViewport = update.view.viewport;
  }
  syncGutters(detach) {
    let after = this.dom.nextSibling;
    if (detach) {
      this.dom.remove();
      if (this.domAfter)
        this.domAfter.remove();
    }
    let lineClasses = RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
    let classSet = [];
    let contexts = this.gutters.map((gutter2) => new UpdateContext(gutter2, this.view.viewport, -this.view.documentPadding.top));
    for (let line of this.view.viewportLineBlocks) {
      if (classSet.length)
        classSet = [];
      if (Array.isArray(line.type)) {
        let first = true;
        for (let b of line.type) {
          if (b.type == BlockType.Text && first) {
            advanceCursor(lineClasses, classSet, b.from);
            for (let cx of contexts)
              cx.line(this.view, b, classSet);
            first = false;
          } else if (b.widget) {
            for (let cx of contexts)
              cx.widget(this.view, b);
          }
        }
      } else if (line.type == BlockType.Text) {
        advanceCursor(lineClasses, classSet, line.from);
        for (let cx of contexts)
          cx.line(this.view, line, classSet);
      } else if (line.widget) {
        for (let cx of contexts)
          cx.widget(this.view, line);
      }
    }
    for (let cx of contexts)
      cx.finish();
    if (detach) {
      this.view.scrollDOM.insertBefore(this.dom, after);
      if (this.domAfter)
        this.view.scrollDOM.appendChild(this.domAfter);
    }
  }
  updateGutters(update) {
    let prev = update.startState.facet(activeGutters), cur2 = update.state.facet(activeGutters);
    let change = update.docChanged || update.heightChanged || update.viewportChanged || !RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
    if (prev == cur2) {
      for (let gutter2 of this.gutters)
        if (gutter2.update(update))
          change = true;
    } else {
      change = true;
      let gutters2 = [];
      for (let conf of cur2) {
        let known = prev.indexOf(conf);
        if (known < 0) {
          gutters2.push(new SingleGutterView(this.view, conf));
        } else {
          this.gutters[known].update(update);
          gutters2.push(this.gutters[known]);
        }
      }
      for (let g of this.gutters) {
        g.dom.remove();
        if (gutters2.indexOf(g) < 0)
          g.destroy();
      }
      for (let g of gutters2) {
        if (g.config.side == "after")
          this.getDOMAfter().appendChild(g.dom);
        else
          this.dom.appendChild(g.dom);
      }
      this.gutters = gutters2;
    }
    return change;
  }
  destroy() {
    for (let view of this.gutters)
      view.destroy();
    this.dom.remove();
    if (this.domAfter)
      this.domAfter.remove();
  }
}, {
  provide: (plugin) => EditorView.scrollMargins.of((view) => {
    let value = view.plugin(plugin);
    if (!value || value.gutters.length == 0 || !value.fixed)
      return null;
    let before = value.dom.offsetWidth * view.scaleX, after = value.domAfter ? value.domAfter.offsetWidth * view.scaleX : 0;
    return view.textDirection == Direction.LTR ? { left: before, right: after } : { right: before, left: after };
  })
});
function asArray(val) {
  return Array.isArray(val) ? val : [val];
}
function advanceCursor(cursor2, collect, pos) {
  while (cursor2.value && cursor2.from <= pos) {
    if (cursor2.from == pos)
      collect.push(cursor2.value);
    cursor2.next();
  }
}
class UpdateContext {
  constructor(gutter2, viewport, height) {
    this.gutter = gutter2;
    this.height = height;
    this.i = 0;
    this.cursor = RangeSet.iter(gutter2.markers, viewport.from);
  }
  addElement(view, block, markers) {
    let { gutter: gutter2 } = this, above = (block.top - this.height) / view.scaleY, height = block.height / view.scaleY;
    if (this.i == gutter2.elements.length) {
      let newElt = new GutterElement(view, height, above, markers);
      gutter2.elements.push(newElt);
      gutter2.dom.appendChild(newElt.dom);
    } else {
      gutter2.elements[this.i].update(view, height, above, markers);
    }
    this.height = block.bottom;
    this.i++;
  }
  line(view, line, extraMarkers) {
    let localMarkers = [];
    advanceCursor(this.cursor, localMarkers, line.from);
    if (extraMarkers.length)
      localMarkers = localMarkers.concat(extraMarkers);
    let forLine = this.gutter.config.lineMarker(view, line, localMarkers);
    if (forLine)
      localMarkers.unshift(forLine);
    let gutter2 = this.gutter;
    if (localMarkers.length == 0 && !gutter2.config.renderEmptyElements)
      return;
    this.addElement(view, line, localMarkers);
  }
  widget(view, block) {
    let marker = this.gutter.config.widgetMarker(view, block.widget, block), markers = marker ? [marker] : null;
    for (let cls of view.state.facet(gutterWidgetClass)) {
      let marker2 = cls(view, block.widget, block);
      if (marker2)
        (markers || (markers = [])).push(marker2);
    }
    if (markers)
      this.addElement(view, block, markers);
  }
  finish() {
    let gutter2 = this.gutter;
    while (gutter2.elements.length > this.i) {
      let last2 = gutter2.elements.pop();
      gutter2.dom.removeChild(last2.dom);
      last2.destroy();
    }
  }
}
class SingleGutterView {
  constructor(view, config2) {
    this.view = view;
    this.config = config2;
    this.elements = [];
    this.spacer = null;
    this.dom = document.createElement("div");
    this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
    for (let prop in config2.domEventHandlers) {
      this.dom.addEventListener(prop, (event) => {
        let target = event.target, y;
        if (target != this.dom && this.dom.contains(target)) {
          while (target.parentNode != this.dom)
            target = target.parentNode;
          let rect = target.getBoundingClientRect();
          y = (rect.top + rect.bottom) / 2;
        } else {
          y = event.clientY;
        }
        let line = view.lineBlockAtHeight(y - view.documentTop);
        if (config2.domEventHandlers[prop](view, line, event))
          event.preventDefault();
      });
    }
    this.markers = asArray(config2.markers(view));
    if (config2.initialSpacer) {
      this.spacer = new GutterElement(view, 0, 0, [config2.initialSpacer(view)]);
      this.dom.appendChild(this.spacer.dom);
      this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
    }
  }
  update(update) {
    let prevMarkers = this.markers;
    this.markers = asArray(this.config.markers(update.view));
    if (this.spacer && this.config.updateSpacer) {
      let updated = this.config.updateSpacer(this.spacer.markers[0], update);
      if (updated != this.spacer.markers[0])
        this.spacer.update(update.view, 0, 0, [updated]);
    }
    let vp = update.view.viewport;
    return !RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to) || (this.config.lineMarkerChange ? this.config.lineMarkerChange(update) : false);
  }
  destroy() {
    for (let elt of this.elements)
      elt.destroy();
  }
}
class GutterElement {
  constructor(view, height, above, markers) {
    this.height = -1;
    this.above = 0;
    this.markers = [];
    this.dom = document.createElement("div");
    this.dom.className = "cm-gutterElement";
    this.update(view, height, above, markers);
  }
  update(view, height, above, markers) {
    if (this.height != height) {
      this.height = height;
      this.dom.style.height = height + "px";
    }
    if (this.above != above)
      this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
    if (!sameMarkers(this.markers, markers))
      this.setMarkers(view, markers);
  }
  setMarkers(view, markers) {
    let cls = "cm-gutterElement", domPos = this.dom.firstChild;
    for (let iNew = 0, iOld = 0; ; ) {
      let skipTo = iOld, marker = iNew < markers.length ? markers[iNew++] : null, matched = false;
      if (marker) {
        let c = marker.elementClass;
        if (c)
          cls += " " + c;
        for (let i2 = iOld; i2 < this.markers.length; i2++)
          if (this.markers[i2].compare(marker)) {
            skipTo = i2;
            matched = true;
            break;
          }
      } else {
        skipTo = this.markers.length;
      }
      while (iOld < skipTo) {
        let next = this.markers[iOld++];
        if (next.toDOM) {
          next.destroy(domPos);
          let after = domPos.nextSibling;
          domPos.remove();
          domPos = after;
        }
      }
      if (!marker)
        break;
      if (marker.toDOM) {
        if (matched)
          domPos = domPos.nextSibling;
        else
          this.dom.insertBefore(marker.toDOM(view), domPos);
      }
      if (matched)
        iOld++;
    }
    this.dom.className = cls;
    this.markers = markers;
  }
  destroy() {
    this.setMarkers(null, []);
  }
}
function sameMarkers(a, b) {
  if (a.length != b.length)
    return false;
  for (let i2 = 0; i2 < a.length; i2++)
    if (!a[i2].compare(b[i2]))
      return false;
  return true;
}
const lineNumberMarkers = /* @__PURE__ */ Facet.define();
const lineNumberWidgetMarker = /* @__PURE__ */ Facet.define();
const lineNumberConfig = /* @__PURE__ */ Facet.define({
  combine(values) {
    return combineConfig(values, { formatNumber: String, domEventHandlers: {} }, {
      domEventHandlers(a, b) {
        let result = Object.assign({}, a);
        for (let event in b) {
          let exists = result[event], add2 = b[event];
          result[event] = exists ? (view, line, event2) => exists(view, line, event2) || add2(view, line, event2) : add2;
        }
        return result;
      }
    });
  }
});
class NumberMarker extends GutterMarker {
  constructor(number2) {
    super();
    this.number = number2;
  }
  eq(other) {
    return this.number == other.number;
  }
  toDOM() {
    return document.createTextNode(this.number);
  }
}
function formatNumber(view, number2) {
  return view.state.facet(lineNumberConfig).formatNumber(number2, view.state);
}
const lineNumberGutter = /* @__PURE__ */ activeGutters.compute([lineNumberConfig], (state2) => ({
  class: "cm-lineNumbers",
  renderEmptyElements: false,
  markers(view) {
    return view.state.facet(lineNumberMarkers);
  },
  lineMarker(view, line, others) {
    if (others.some((m) => m.toDOM))
      return null;
    return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line.from).number));
  },
  widgetMarker: (view, widget, block) => {
    for (let m of view.state.facet(lineNumberWidgetMarker)) {
      let result = m(view, widget, block);
      if (result)
        return result;
    }
    return null;
  },
  lineMarkerChange: (update) => update.startState.facet(lineNumberConfig) != update.state.facet(lineNumberConfig),
  initialSpacer(view) {
    return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
  },
  updateSpacer(spacer, update) {
    let max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
    return max == spacer.number ? spacer : new NumberMarker(max);
  },
  domEventHandlers: state2.facet(lineNumberConfig).domEventHandlers,
  side: "before"
}));
function lineNumbers(config2 = {}) {
  return [
    lineNumberConfig.of(config2),
    gutters(),
    lineNumberGutter
  ];
}
function maxLineNumber(lines) {
  let last2 = 9;
  while (last2 < lines)
    last2 = last2 * 10 + 9;
  return last2;
}
const activeLineGutterMarker = /* @__PURE__ */ new class extends GutterMarker {
  constructor() {
    super(...arguments);
    this.elementClass = "cm-activeLineGutter";
  }
}();
const activeLineGutterHighlighter = /* @__PURE__ */ gutterLineClass.compute(["selection"], (state2) => {
  let marks = [], last2 = -1;
  for (let range of state2.selection.ranges) {
    let linePos = state2.doc.lineAt(range.head).from;
    if (linePos > last2) {
      last2 = linePos;
      marks.push(activeLineGutterMarker.range(linePos));
    }
  }
  return RangeSet.of(marks);
});
function highlightActiveLineGutter() {
  return activeLineGutterHighlighter;
}
const DefaultBufferLength = 1024;
let nextPropID = 0;
class Range2 {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
}
class NodeProp {
  /**
  Create a new node prop type.
  */
  constructor(config2 = {}) {
    this.id = nextPropID++;
    this.perNode = !!config2.perNode;
    this.deserialize = config2.deserialize || (() => {
      throw new Error("This node type doesn't define a deserialize function");
    });
    this.combine = config2.combine || null;
  }
  /**
  This is meant to be used with
  [`NodeSet.extend`](#common.NodeSet.extend) or
  [`LRParser.configure`](#lr.ParserConfig.props) to compute
  prop values for each node type in the set. Takes a [match
  object](#common.NodeType^match) or function that returns undefined
  if the node type doesn't get this prop, and the prop's value if
  it does.
  */
  add(match) {
    if (this.perNode)
      throw new RangeError("Can't add per-node props to node types");
    if (typeof match != "function")
      match = NodeType.match(match);
    return (type) => {
      let result = match(type);
      return result === void 0 ? null : [this, result];
    };
  }
}
NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.isolate = new NodeProp({ deserialize: (value) => {
  if (value && value != "rtl" && value != "ltr" && value != "auto")
    throw new RangeError("Invalid value for isolate: " + value);
  return value || "auto";
} });
NodeProp.contextHash = new NodeProp({ perNode: true });
NodeProp.lookAhead = new NodeProp({ perNode: true });
NodeProp.mounted = new NodeProp({ perNode: true });
class MountedTree {
  constructor(tree, overlay, parser2, bracketed = false) {
    this.tree = tree;
    this.overlay = overlay;
    this.parser = parser2;
    this.bracketed = bracketed;
  }
  /**
  @internal
  */
  static get(tree) {
    return tree && tree.props && tree.props[NodeProp.mounted.id];
  }
}
const noProps = /* @__PURE__ */ Object.create(null);
class NodeType {
  /**
  @internal
  */
  constructor(name2, props, id, flags = 0) {
    this.name = name2;
    this.props = props;
    this.id = id;
    this.flags = flags;
  }
  /**
  Define a node type.
  */
  static define(spec) {
    let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
    let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
    let type = new NodeType(spec.name || "", props, spec.id, flags);
    if (spec.props)
      for (let src of spec.props) {
        if (!Array.isArray(src))
          src = src(type);
        if (src) {
          if (src[0].perNode)
            throw new RangeError("Can't store a per-node prop on a node type");
          props[src[0].id] = src[1];
        }
      }
    return type;
  }
  /**
  Retrieves a node prop for this type. Will return `undefined` if
  the prop isn't present on this node.
  */
  prop(prop) {
    return this.props[prop.id];
  }
  /**
  True when this is the top node of a grammar.
  */
  get isTop() {
    return (this.flags & 1) > 0;
  }
  /**
  True when this node is produced by a skip rule.
  */
  get isSkipped() {
    return (this.flags & 2) > 0;
  }
  /**
  Indicates whether this is an error node.
  */
  get isError() {
    return (this.flags & 4) > 0;
  }
  /**
  When true, this node type doesn't correspond to a user-declared
  named node, for example because it is used to cache repetition.
  */
  get isAnonymous() {
    return (this.flags & 8) > 0;
  }
  /**
  Returns true when this node's name or one of its
  [groups](#common.NodeProp^group) matches the given string.
  */
  is(name2) {
    if (typeof name2 == "string") {
      if (this.name == name2)
        return true;
      let group = this.prop(NodeProp.group);
      return group ? group.indexOf(name2) > -1 : false;
    }
    return this.id == name2;
  }
  /**
  Create a function from node types to arbitrary values by
  specifying an object whose property names are node or
  [group](#common.NodeProp^group) names. Often useful with
  [`NodeProp.add`](#common.NodeProp.add). You can put multiple
  names, separated by spaces, in a single property name to map
  multiple node names to a single value.
  */
  static match(map) {
    let direct = /* @__PURE__ */ Object.create(null);
    for (let prop in map)
      for (let name2 of prop.split(" "))
        direct[name2] = map[prop];
    return (node) => {
      for (let groups = node.prop(NodeProp.group), i2 = -1; i2 < (groups ? groups.length : 0); i2++) {
        let found = direct[i2 < 0 ? node.name : groups[i2]];
        if (found)
          return found;
      }
    };
  }
}
NodeType.none = new NodeType(
  "",
  /* @__PURE__ */ Object.create(null),
  0,
  8
  /* NodeFlag.Anonymous */
);
class NodeSet {
  /**
  Create a set with the given types. The `id` property of each
  type should correspond to its position within the array.
  */
  constructor(types2) {
    this.types = types2;
    for (let i2 = 0; i2 < types2.length; i2++)
      if (types2[i2].id != i2)
        throw new RangeError("Node type ids should correspond to array positions when creating a node set");
  }
  /**
  Create a copy of this set with some node properties added. The
  arguments to this method can be created with
  [`NodeProp.add`](#common.NodeProp.add).
  */
  extend(...props) {
    let newTypes = [];
    for (let type of this.types) {
      let newProps = null;
      for (let source of props) {
        let add2 = source(type);
        if (add2) {
          if (!newProps)
            newProps = Object.assign({}, type.props);
          let value = add2[1], prop = add2[0];
          if (prop.combine && prop.id in newProps)
            value = prop.combine(newProps[prop.id], value);
          newProps[prop.id] = value;
        }
      }
      newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
    }
    return new NodeSet(newTypes);
  }
}
const CachedNode = /* @__PURE__ */ new WeakMap(), CachedInnerNode = /* @__PURE__ */ new WeakMap();
var IterMode;
(function(IterMode2) {
  IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
  IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
  IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
  IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
  IterMode2[IterMode2["EnterBracketed"] = 16] = "EnterBracketed";
})(IterMode || (IterMode = {}));
class Tree {
  /**
  Construct a new tree. See also [`Tree.build`](#common.Tree^build).
  */
  constructor(type, children, positions, length, props) {
    this.type = type;
    this.children = children;
    this.positions = positions;
    this.length = length;
    this.props = null;
    if (props && props.length) {
      this.props = /* @__PURE__ */ Object.create(null);
      for (let [prop, value] of props)
        this.props[typeof prop == "number" ? prop : prop.id] = value;
    }
  }
  /**
  @internal
  */
  toString() {
    let mounted = MountedTree.get(this);
    if (mounted && !mounted.overlay)
      return mounted.tree.toString();
    let children = "";
    for (let ch of this.children) {
      let str = ch.toString();
      if (str) {
        if (children)
          children += ",";
        children += str;
      }
    }
    return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
  }
  /**
  Get a [tree cursor](#common.TreeCursor) positioned at the top of
  the tree. Mode can be used to [control](#common.IterMode) which
  nodes the cursor visits.
  */
  cursor(mode = 0) {
    return new TreeCursor(this.topNode, mode);
  }
  /**
  Get a [tree cursor](#common.TreeCursor) pointing into this tree
  at the given position and side (see
  [`moveTo`](#common.TreeCursor.moveTo).
  */
  cursorAt(pos, side = 0, mode = 0) {
    let scope = CachedNode.get(this) || this.topNode;
    let cursor2 = new TreeCursor(scope);
    cursor2.moveTo(pos, side);
    CachedNode.set(this, cursor2._tree);
    return cursor2;
  }
  /**
  Get a [syntax node](#common.SyntaxNode) object for the top of the
  tree.
  */
  get topNode() {
    return new TreeNode(this, 0, 0, null);
  }
  /**
  Get the [syntax node](#common.SyntaxNode) at the given position.
  If `side` is -1, this will move into nodes that end at the
  position. If 1, it'll move into nodes that start at the
  position. With 0, it'll only enter nodes that cover the position
  from both sides.
  
  Note that this will not enter
  [overlays](#common.MountedTree.overlay), and you often want
  [`resolveInner`](#common.Tree.resolveInner) instead.
  */
  resolve(pos, side = 0) {
    let node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
    CachedNode.set(this, node);
    return node;
  }
  /**
  Like [`resolve`](#common.Tree.resolve), but will enter
  [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
  pointing into the innermost overlaid tree at the given position
  (with parent links going through all parent structure, including
  the host trees).
  */
  resolveInner(pos, side = 0) {
    let node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
    CachedInnerNode.set(this, node);
    return node;
  }
  /**
  In some situations, it can be useful to iterate through all
  nodes around a position, including those in overlays that don't
  directly cover the position. This method gives you an iterator
  that will produce all nodes, from small to big, around the given
  position.
  */
  resolveStack(pos, side = 0) {
    return stackIterator(this, pos, side);
  }
  /**
  Iterate over the tree and its children, calling `enter` for any
  node that touches the `from`/`to` region (if given) before
  running over such a node's children, and `leave` (if given) when
  leaving the node. When `enter` returns `false`, that node will
  not have its children iterated over (or `leave` called).
  */
  iterate(spec) {
    let { enter, leave, from = 0, to = this.length } = spec;
    let mode = spec.mode || 0, anon = (mode & IterMode.IncludeAnonymous) > 0;
    for (let c = this.cursor(mode | IterMode.IncludeAnonymous); ; ) {
      let entered = false;
      if (c.from <= to && c.to >= from && (!anon && c.type.isAnonymous || enter(c) !== false)) {
        if (c.firstChild())
          continue;
        entered = true;
      }
      for (; ; ) {
        if (entered && leave && (anon || !c.type.isAnonymous))
          leave(c);
        if (c.nextSibling())
          break;
        if (!c.parent())
          return;
        entered = true;
      }
    }
  }
  /**
  Get the value of the given [node prop](#common.NodeProp) for this
  node. Works with both per-node and per-type props.
  */
  prop(prop) {
    return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
  }
  /**
  Returns the node's [per-node props](#common.NodeProp.perNode) in a
  format that can be passed to the [`Tree`](#common.Tree)
  constructor.
  */
  get propValues() {
    let result = [];
    if (this.props)
      for (let id in this.props)
        result.push([+id, this.props[id]]);
    return result;
  }
  /**
  Balance the direct children of this tree, producing a copy of
  which may have children grouped into subtrees with type
  [`NodeType.none`](#common.NodeType^none).
  */
  balance(config2 = {}) {
    return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new Tree(this.type, children, positions, length, this.propValues), config2.makeTree || ((children, positions, length) => new Tree(NodeType.none, children, positions, length)));
  }
  /**
  Build a tree from a postfix-ordered buffer of node information,
  or a cursor over such a buffer.
  */
  static build(data) {
    return buildTree(data);
  }
}
Tree.empty = new Tree(NodeType.none, [], [], 0);
class FlatBufferCursor {
  constructor(buffer, index) {
    this.buffer = buffer;
    this.index = index;
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  get pos() {
    return this.index;
  }
  next() {
    this.index -= 4;
  }
  fork() {
    return new FlatBufferCursor(this.buffer, this.index);
  }
}
class TreeBuffer {
  /**
  Create a tree buffer.
  */
  constructor(buffer, length, set) {
    this.buffer = buffer;
    this.length = length;
    this.set = set;
  }
  /**
  @internal
  */
  get type() {
    return NodeType.none;
  }
  /**
  @internal
  */
  toString() {
    let result = [];
    for (let index = 0; index < this.buffer.length; ) {
      result.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result.join(",");
  }
  /**
  @internal
  */
  childString(index) {
    let id = this.buffer[index], endIndex = this.buffer[index + 3];
    let type = this.set.types[id], result = type.name;
    if (/\W/.test(result) && !type.isError)
      result = JSON.stringify(result);
    index += 4;
    if (endIndex == index)
      return result;
    let children = [];
    while (index < endIndex) {
      children.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result + "(" + children.join(",") + ")";
  }
  /**
  @internal
  */
  findChild(startIndex, endIndex, dir, pos, side) {
    let { buffer } = this, pick = -1;
    for (let i2 = startIndex; i2 != endIndex; i2 = buffer[i2 + 3]) {
      if (checkSide(side, pos, buffer[i2 + 1], buffer[i2 + 2])) {
        pick = i2;
        if (dir > 0)
          break;
      }
    }
    return pick;
  }
  /**
  @internal
  */
  slice(startI, endI, from) {
    let b = this.buffer;
    let copy = new Uint16Array(endI - startI), len = 0;
    for (let i2 = startI, j = 0; i2 < endI; ) {
      copy[j++] = b[i2++];
      copy[j++] = b[i2++] - from;
      let to = copy[j++] = b[i2++] - from;
      copy[j++] = b[i2++] - startI;
      len = Math.max(len, to);
    }
    return new TreeBuffer(copy, len, this.set);
  }
}
function checkSide(side, pos, from, to) {
  switch (side) {
    case -2:
      return from < pos;
    case -1:
      return to >= pos && from < pos;
    case 0:
      return from < pos && to > pos;
    case 1:
      return from <= pos && to > pos;
    case 2:
      return to > pos;
    case 4:
      return true;
  }
}
function resolveNode(node, pos, side, overlays) {
  var _a2;
  while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
    let parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
    if (!parent)
      return node;
    node = parent;
  }
  let mode = overlays ? 0 : IterMode.IgnoreOverlays;
  if (overlays)
    for (let scan = node, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
      if (scan instanceof TreeNode && scan.index < 0 && ((_a2 = parent.enter(pos, side, mode)) === null || _a2 === void 0 ? void 0 : _a2.from) != scan.from)
        node = parent;
    }
  for (; ; ) {
    let inner = node.enter(pos, side, mode);
    if (!inner)
      return node;
    node = inner;
  }
}
class BaseNode {
  cursor(mode = 0) {
    return new TreeCursor(this, mode);
  }
  getChild(type, before = null, after = null) {
    let r = getChildren(this, type, before, after);
    return r.length ? r[0] : null;
  }
  getChildren(type, before = null, after = null) {
    return getChildren(this, type, before, after);
  }
  resolve(pos, side = 0) {
    return resolveNode(this, pos, side, false);
  }
  resolveInner(pos, side = 0) {
    return resolveNode(this, pos, side, true);
  }
  matchContext(context) {
    return matchNodeContext(this.parent, context);
  }
  enterUnfinishedNodesBefore(pos) {
    let scan = this.childBefore(pos), node = this;
    while (scan) {
      let last2 = scan.lastChild;
      if (!last2 || last2.to != scan.to)
        break;
      if (last2.type.isError && last2.from == last2.to) {
        node = scan;
        scan = last2.prevSibling;
      } else {
        scan = last2;
      }
    }
    return node;
  }
  get node() {
    return this;
  }
  get next() {
    return this.parent;
  }
}
class TreeNode extends BaseNode {
  constructor(_tree, from, index, _parent) {
    super();
    this._tree = _tree;
    this.from = from;
    this.index = index;
    this._parent = _parent;
  }
  get type() {
    return this._tree.type;
  }
  get name() {
    return this._tree.type.name;
  }
  get to() {
    return this.from + this._tree.length;
  }
  nextChild(i2, dir, pos, side, mode = 0) {
    for (let parent = this; ; ) {
      for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i2 != e; i2 += dir) {
        let next = children[i2], start = positions[i2] + parent.from, mounted;
        if (!(mode & IterMode.EnterBracketed && next instanceof Tree && (mounted = MountedTree.get(next)) && !mounted.overlay && mounted.bracketed && pos >= start && pos <= start + next.length) && !checkSide(side, pos, start, start + next.length))
          continue;
        if (next instanceof TreeBuffer) {
          if (mode & IterMode.ExcludeBuffers)
            continue;
          let index = next.findChild(0, next.buffer.length, dir, pos - start, side);
          if (index > -1)
            return new BufferNode(new BufferContext(parent, next, i2, start), null, index);
        } else if (mode & IterMode.IncludeAnonymous || (!next.type.isAnonymous || hasChild(next))) {
          let mounted2;
          if (!(mode & IterMode.IgnoreMounts) && (mounted2 = MountedTree.get(next)) && !mounted2.overlay)
            return new TreeNode(mounted2.tree, start, i2, parent);
          let inner = new TreeNode(next, start, i2, parent);
          return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side, mode);
        }
      }
      if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
        return null;
      if (parent.index >= 0)
        i2 = parent.index + dir;
      else
        i2 = dir < 0 ? -1 : parent._parent._tree.children.length;
      parent = parent._parent;
      if (!parent)
        return null;
    }
  }
  get firstChild() {
    return this.nextChild(
      0,
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.nextChild(
      0,
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  prop(prop) {
    return this._tree.prop(prop);
  }
  enter(pos, side, mode = 0) {
    let mounted;
    if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
      let rPos = pos - this.from, enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
      for (let { from, to } of mounted.overlay) {
        if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos))
          return new TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
      }
    }
    return this.nextChild(0, 1, pos, side, mode);
  }
  nextSignificantParent() {
    let val = this;
    while (val.type.isAnonymous && val._parent)
      val = val._parent;
    return val;
  }
  get parent() {
    return this._parent ? this._parent.nextSignificantParent() : null;
  }
  get nextSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index + 1,
      1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get prevSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get tree() {
    return this._tree;
  }
  toTree() {
    return this._tree;
  }
  /**
  @internal
  */
  toString() {
    return this._tree.toString();
  }
}
function getChildren(node, type, before, after) {
  let cur2 = node.cursor(), result = [];
  if (!cur2.firstChild())
    return result;
  if (before != null)
    for (let found = false; !found; ) {
      found = cur2.type.is(before);
      if (!cur2.nextSibling())
        return result;
    }
  for (; ; ) {
    if (after != null && cur2.type.is(after))
      return result;
    if (cur2.type.is(type))
      result.push(cur2.node);
    if (!cur2.nextSibling())
      return after == null ? result : [];
  }
}
function matchNodeContext(node, context, i2 = context.length - 1) {
  for (let p = node; i2 >= 0; p = p.parent) {
    if (!p)
      return false;
    if (!p.type.isAnonymous) {
      if (context[i2] && context[i2] != p.name)
        return false;
      i2--;
    }
  }
  return true;
}
class BufferContext {
  constructor(parent, buffer, index, start) {
    this.parent = parent;
    this.buffer = buffer;
    this.index = index;
    this.start = start;
  }
}
class BufferNode extends BaseNode {
  get name() {
    return this.type.name;
  }
  get from() {
    return this.context.start + this.context.buffer.buffer[this.index + 1];
  }
  get to() {
    return this.context.start + this.context.buffer.buffer[this.index + 2];
  }
  constructor(context, _parent, index) {
    super();
    this.context = context;
    this._parent = _parent;
    this.index = index;
    this.type = context.buffer.set.types[context.buffer.buffer[index]];
  }
  child(dir, pos, side) {
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
    return index < 0 ? null : new BufferNode(this.context, this, index);
  }
  get firstChild() {
    return this.child(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.child(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.child(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.child(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  prop(prop) {
    return this.type.prop(prop);
  }
  enter(pos, side, mode = 0) {
    if (mode & IterMode.ExcludeBuffers)
      return null;
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
    return index < 0 ? null : new BufferNode(this.context, this, index);
  }
  get parent() {
    return this._parent || this.context.parent.nextSignificantParent();
  }
  externalSibling(dir) {
    return this._parent ? null : this.context.parent.nextChild(
      this.context.index + dir,
      dir,
      0,
      4
      /* Side.DontCare */
    );
  }
  get nextSibling() {
    let { buffer } = this.context;
    let after = buffer.buffer[this.index + 3];
    if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
      return new BufferNode(this.context, this._parent, after);
    return this.externalSibling(1);
  }
  get prevSibling() {
    let { buffer } = this.context;
    let parentStart = this._parent ? this._parent.index + 4 : 0;
    if (this.index == parentStart)
      return this.externalSibling(-1);
    return new BufferNode(this.context, this._parent, buffer.findChild(
      parentStart,
      this.index,
      -1,
      0,
      4
      /* Side.DontCare */
    ));
  }
  get tree() {
    return null;
  }
  toTree() {
    let children = [], positions = [];
    let { buffer } = this.context;
    let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
    if (endI > startI) {
      let from = buffer.buffer[this.index + 1];
      children.push(buffer.slice(startI, endI, from));
      positions.push(0);
    }
    return new Tree(this.type, children, positions, this.to - this.from);
  }
  /**
  @internal
  */
  toString() {
    return this.context.buffer.childString(this.index);
  }
}
function iterStack(heads) {
  if (!heads.length)
    return null;
  let pick = 0, picked = heads[0];
  for (let i2 = 1; i2 < heads.length; i2++) {
    let node = heads[i2];
    if (node.from > picked.from || node.to < picked.to) {
      picked = node;
      pick = i2;
    }
  }
  let next = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
  let newHeads = heads.slice();
  if (next)
    newHeads[pick] = next;
  else
    newHeads.splice(pick, 1);
  return new StackIterator(newHeads, picked);
}
class StackIterator {
  constructor(heads, node) {
    this.heads = heads;
    this.node = node;
  }
  get next() {
    return iterStack(this.heads);
  }
}
function stackIterator(tree, pos, side) {
  let inner = tree.resolveInner(pos, side), layers = null;
  for (let scan = inner instanceof TreeNode ? inner : inner.context.parent; scan; scan = scan.parent) {
    if (scan.index < 0) {
      let parent = scan.parent;
      (layers || (layers = [inner])).push(parent.resolve(pos, side));
      scan = parent;
    } else {
      let mount = MountedTree.get(scan.tree);
      if (mount && mount.overlay && mount.overlay[0].from <= pos && mount.overlay[mount.overlay.length - 1].to >= pos) {
        let root = new TreeNode(mount.tree, mount.overlay[0].from + scan.from, -1, scan);
        (layers || (layers = [inner])).push(resolveNode(root, pos, side, false));
      }
    }
  }
  return layers ? iterStack(layers) : inner;
}
class TreeCursor {
  /**
  Shorthand for `.type.name`.
  */
  get name() {
    return this.type.name;
  }
  /**
  @internal
  */
  constructor(node, mode = 0) {
    this.buffer = null;
    this.stack = [];
    this.index = 0;
    this.bufferNode = null;
    this.mode = mode & ~IterMode.EnterBracketed;
    if (node instanceof TreeNode) {
      this.yieldNode(node);
    } else {
      this._tree = node.context.parent;
      this.buffer = node.context;
      for (let n = node._parent; n; n = n._parent)
        this.stack.unshift(n.index);
      this.bufferNode = node;
      this.yieldBuf(node.index);
    }
  }
  yieldNode(node) {
    if (!node)
      return false;
    this._tree = node;
    this.type = node.type;
    this.from = node.from;
    this.to = node.to;
    return true;
  }
  yieldBuf(index, type) {
    this.index = index;
    let { start, buffer } = this.buffer;
    this.type = type || buffer.set.types[buffer.buffer[index]];
    this.from = start + buffer.buffer[index + 1];
    this.to = start + buffer.buffer[index + 2];
    return true;
  }
  /**
  @internal
  */
  yield(node) {
    if (!node)
      return false;
    if (node instanceof TreeNode) {
      this.buffer = null;
      return this.yieldNode(node);
    }
    this.buffer = node.context;
    return this.yieldBuf(node.index, node.type);
  }
  /**
  @internal
  */
  toString() {
    return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
  }
  /**
  @internal
  */
  enterChild(dir, pos, side) {
    if (!this.buffer)
      return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
    let { buffer } = this.buffer;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
    if (index < 0)
      return false;
    this.stack.push(this.index);
    return this.yieldBuf(index);
  }
  /**
  Move the cursor to this node's first child. When this returns
  false, the node has no child, and the cursor has not been moved.
  */
  firstChild() {
    return this.enterChild(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /**
  Move the cursor to this node's last child.
  */
  lastChild() {
    return this.enterChild(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /**
  Move the cursor to the first child that ends after `pos`.
  */
  childAfter(pos) {
    return this.enterChild(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  /**
  Move to the last child that starts before `pos`.
  */
  childBefore(pos) {
    return this.enterChild(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  /**
  Move the cursor to the child around `pos`. If side is -1 the
  child may end at that position, when 1 it may start there. This
  will also enter [overlaid](#common.MountedTree.overlay)
  [mounted](#common.NodeProp^mounted) trees unless `overlays` is
  set to false.
  */
  enter(pos, side, mode = this.mode) {
    if (!this.buffer)
      return this.yield(this._tree.enter(pos, side, mode));
    return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
  }
  /**
  Move to the node's parent node, if this isn't the top node.
  */
  parent() {
    if (!this.buffer)
      return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
    if (this.stack.length)
      return this.yieldBuf(this.stack.pop());
    let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
    this.buffer = null;
    return this.yieldNode(parent);
  }
  /**
  @internal
  */
  sibling(dir) {
    if (!this.buffer)
      return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
    let { buffer } = this.buffer, d = this.stack.length - 1;
    if (dir < 0) {
      let parentStart = d < 0 ? 0 : this.stack[d] + 4;
      if (this.index != parentStart)
        return this.yieldBuf(buffer.findChild(
          parentStart,
          this.index,
          -1,
          0,
          4
          /* Side.DontCare */
        ));
    } else {
      let after = buffer.buffer[this.index + 3];
      if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
        return this.yieldBuf(after);
    }
    return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
  }
  /**
  Move to this node's next sibling, if any.
  */
  nextSibling() {
    return this.sibling(1);
  }
  /**
  Move to this node's previous sibling, if any.
  */
  prevSibling() {
    return this.sibling(-1);
  }
  atLastNode(dir) {
    let index, parent, { buffer } = this;
    if (buffer) {
      if (dir > 0) {
        if (this.index < buffer.buffer.buffer.length)
          return false;
      } else {
        for (let i2 = 0; i2 < this.index; i2++)
          if (buffer.buffer.buffer[i2 + 3] < this.index)
            return false;
      }
      ({ index, parent } = buffer);
    } else {
      ({ index, _parent: parent } = this._tree);
    }
    for (; parent; { index, _parent: parent } = parent) {
      if (index > -1)
        for (let i2 = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i2 != e; i2 += dir) {
          let child = parent._tree.children[i2];
          if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
            return false;
        }
    }
    return true;
  }
  move(dir, enter) {
    if (enter && this.enterChild(
      dir,
      0,
      4
      /* Side.DontCare */
    ))
      return true;
    for (; ; ) {
      if (this.sibling(dir))
        return true;
      if (this.atLastNode(dir) || !this.parent())
        return false;
    }
  }
  /**
  Move to the next node in a
  [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
  traversal, going from a node to its first child or, if the
  current node is empty or `enter` is false, its next sibling or
  the next sibling of the first parent node that has one.
  */
  next(enter = true) {
    return this.move(1, enter);
  }
  /**
  Move to the next node in a last-to-first pre-order traversal. A
  node is followed by its last child or, if it has none, its
  previous sibling or the previous sibling of the first parent
  node that has one.
  */
  prev(enter = true) {
    return this.move(-1, enter);
  }
  /**
  Move the cursor to the innermost node that covers `pos`. If
  `side` is -1, it will enter nodes that end at `pos`. If it is 1,
  it will enter nodes that start at `pos`.
  */
  moveTo(pos, side = 0) {
    while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
      if (!this.parent())
        break;
    while (this.enterChild(1, pos, side)) {
    }
    return this;
  }
  /**
  Get a [syntax node](#common.SyntaxNode) at the cursor's current
  position.
  */
  get node() {
    if (!this.buffer)
      return this._tree;
    let cache = this.bufferNode, result = null, depth = 0;
    if (cache && cache.context == this.buffer) {
      scan: for (let index = this.index, d = this.stack.length; d >= 0; ) {
        for (let c = cache; c; c = c._parent)
          if (c.index == index) {
            if (index == this.index)
              return c;
            result = c;
            depth = d + 1;
            break scan;
          }
        index = this.stack[--d];
      }
    }
    for (let i2 = depth; i2 < this.stack.length; i2++)
      result = new BufferNode(this.buffer, result, this.stack[i2]);
    return this.bufferNode = new BufferNode(this.buffer, result, this.index);
  }
  /**
  Get the [tree](#common.Tree) that represents the current node, if
  any. Will return null when the node is in a [tree
  buffer](#common.TreeBuffer).
  */
  get tree() {
    return this.buffer ? null : this._tree._tree;
  }
  /**
  Iterate over the current node and all its descendants, calling
  `enter` when entering a node and `leave`, if given, when leaving
  one. When `enter` returns `false`, any children of that node are
  skipped, and `leave` isn't called for it.
  */
  iterate(enter, leave) {
    for (let depth = 0; ; ) {
      let mustLeave = false;
      if (this.type.isAnonymous || enter(this) !== false) {
        if (this.firstChild()) {
          depth++;
          continue;
        }
        if (!this.type.isAnonymous)
          mustLeave = true;
      }
      for (; ; ) {
        if (mustLeave && leave)
          leave(this);
        mustLeave = this.type.isAnonymous;
        if (!depth)
          return;
        if (this.nextSibling())
          break;
        this.parent();
        depth--;
        mustLeave = true;
      }
    }
  }
  /**
  Test whether the current node matches a given context—a sequence
  of direct parent node names. Empty strings in the context array
  are treated as wildcards.
  */
  matchContext(context) {
    if (!this.buffer)
      return matchNodeContext(this.node.parent, context);
    let { buffer } = this.buffer, { types: types2 } = buffer.set;
    for (let i2 = context.length - 1, d = this.stack.length - 1; i2 >= 0; d--) {
      if (d < 0)
        return matchNodeContext(this._tree, context, i2);
      let type = types2[buffer.buffer[this.stack[d]]];
      if (!type.isAnonymous) {
        if (context[i2] && context[i2] != type.name)
          return false;
        i2--;
      }
    }
    return true;
  }
}
function hasChild(tree) {
  return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
function buildTree(data) {
  var _a2;
  let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
  let cursor2 = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
  let types2 = nodeSet.types;
  let contextHash = 0, lookAhead = 0;
  function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
    let { id, start, end, size } = cursor2;
    let lookAheadAtStart = lookAhead, contextAtStart = contextHash;
    if (size < 0) {
      cursor2.next();
      if (size == -1) {
        let node2 = reused[id];
        children2.push(node2);
        positions2.push(start - parentStart);
        return;
      } else if (size == -3) {
        contextHash = id;
        return;
      } else if (size == -4) {
        lookAhead = id;
        return;
      } else {
        throw new RangeError(`Unrecognized record size: ${size}`);
      }
    }
    let type = types2[id], node, buffer2;
    let startPos = start - parentStart;
    if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor2.pos - minPos, inRepeat))) {
      let data2 = new Uint16Array(buffer2.size - buffer2.skip);
      let endPos = cursor2.pos - buffer2.size, index = data2.length;
      while (cursor2.pos > endPos)
        index = copyToBuffer(buffer2.start, data2, index);
      node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
      startPos = buffer2.start - parentStart;
    } else {
      let endPos = cursor2.pos - size;
      cursor2.next();
      let localChildren = [], localPositions = [];
      let localInRepeat = id >= minRepeatType ? id : -1;
      let lastGroup = 0, lastEnd = end, groupLookAhead = lookAheadAtStart;
      while (cursor2.pos > endPos) {
        if (localInRepeat >= 0 && cursor2.id == localInRepeat && cursor2.size >= 0) {
          if (cursor2.end <= lastEnd - maxBufferLength) {
            makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor2.end, lastEnd, localInRepeat, groupLookAhead, contextAtStart);
            lastGroup = localChildren.length;
            lastEnd = cursor2.end;
            groupLookAhead = lookAhead;
          }
          cursor2.next();
        } else if (depth > 2500) {
          takeFlatNode(start, endPos, localChildren, localPositions);
        } else {
          takeNode(start, endPos, localChildren, localPositions, localInRepeat, depth + 1);
        }
      }
      if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
        makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, groupLookAhead, contextAtStart);
      localChildren.reverse();
      localPositions.reverse();
      if (localInRepeat > -1 && lastGroup > 0) {
        let make = makeBalanced(type, contextAtStart);
        node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
      } else {
        node = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end, contextAtStart);
      }
    }
    children2.push(node);
    positions2.push(startPos);
  }
  function takeFlatNode(parentStart, minPos, children2, positions2) {
    let nodes = [];
    let nodeCount = 0, stopAt = -1;
    while (cursor2.pos > minPos) {
      let { id, start, end, size } = cursor2;
      if (size > 4) {
        cursor2.next();
      } else if (stopAt > -1 && start < stopAt) {
        break;
      } else {
        if (stopAt < 0)
          stopAt = end - maxBufferLength;
        nodes.push(id, start, end);
        nodeCount++;
        cursor2.next();
      }
    }
    if (nodeCount) {
      let buffer2 = new Uint16Array(nodeCount * 4);
      let start = nodes[nodes.length - 2];
      for (let i2 = nodes.length - 3, j = 0; i2 >= 0; i2 -= 3) {
        buffer2[j++] = nodes[i2];
        buffer2[j++] = nodes[i2 + 1] - start;
        buffer2[j++] = nodes[i2 + 2] - start;
        buffer2[j++] = j;
      }
      children2.push(new TreeBuffer(buffer2, nodes[2] - start, nodeSet));
      positions2.push(start - parentStart);
    }
  }
  function makeBalanced(type, contextHash2) {
    return (children2, positions2, length2) => {
      let lookAhead2 = 0, lastI = children2.length - 1, last2, lookAheadProp;
      if (lastI >= 0 && (last2 = children2[lastI]) instanceof Tree) {
        if (!lastI && last2.type == type && last2.length == length2)
          return last2;
        if (lookAheadProp = last2.prop(NodeProp.lookAhead))
          lookAhead2 = positions2[lastI] + last2.length + lookAheadProp - length2;
      }
      return makeTree(type, children2, positions2, length2, lookAhead2, contextHash2);
    };
  }
  function makeRepeatLeaf(children2, positions2, base2, i2, from, to, type, lookAhead2, contextHash2) {
    let localChildren = [], localPositions = [];
    while (children2.length > i2) {
      localChildren.push(children2.pop());
      localPositions.push(positions2.pop() + base2 - from);
    }
    children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to, contextHash2));
    positions2.push(from - base2);
  }
  function makeTree(type, children2, positions2, length2, lookAhead2, contextHash2, props) {
    if (contextHash2) {
      let pair2 = [NodeProp.contextHash, contextHash2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    if (lookAhead2 > 25) {
      let pair2 = [NodeProp.lookAhead, lookAhead2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    return new Tree(type, children2, positions2, length2, props);
  }
  function findBufferSize(maxSize, inRepeat) {
    let fork = cursor2.fork();
    let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
    let result = { size: 0, start: 0, skip: 0 };
    scan: for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
      let nodeSize2 = fork.size;
      if (fork.id == inRepeat && nodeSize2 >= 0) {
        result.size = size;
        result.start = start;
        result.skip = skip;
        skip += 4;
        size += 4;
        fork.next();
        continue;
      }
      let startPos = fork.pos - nodeSize2;
      if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
        break;
      let localSkipped = fork.id >= minRepeatType ? 4 : 0;
      let nodeStart2 = fork.start;
      fork.next();
      while (fork.pos > startPos) {
        if (fork.size < 0) {
          if (fork.size == -3 || fork.size == -4)
            localSkipped += 4;
          else
            break scan;
        } else if (fork.id >= minRepeatType) {
          localSkipped += 4;
        }
        fork.next();
      }
      start = nodeStart2;
      size += nodeSize2;
      skip += localSkipped;
    }
    if (inRepeat < 0 || size == maxSize) {
      result.size = size;
      result.start = start;
      result.skip = skip;
    }
    return result.size > 4 ? result : void 0;
  }
  function copyToBuffer(bufferStart, buffer2, index) {
    let { id, start, end, size } = cursor2;
    cursor2.next();
    if (size >= 0 && id < minRepeatType) {
      let startIndex = index;
      if (size > 4) {
        let endPos = cursor2.pos - (size - 4);
        while (cursor2.pos > endPos)
          index = copyToBuffer(bufferStart, buffer2, index);
      }
      buffer2[--index] = startIndex;
      buffer2[--index] = end - bufferStart;
      buffer2[--index] = start - bufferStart;
      buffer2[--index] = id;
    } else if (size == -3) {
      contextHash = id;
    } else if (size == -4) {
      lookAhead = id;
    }
    return index;
  }
  let children = [], positions = [];
  while (cursor2.pos > 0)
    takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
  let length = (_a2 = data.length) !== null && _a2 !== void 0 ? _a2 : children.length ? positions[0] + children[0].length : 0;
  return new Tree(types2[data.topID], children.reverse(), positions.reverse(), length);
}
const nodeSizeCache = /* @__PURE__ */ new WeakMap();
function nodeSize(balanceType, node) {
  if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType)
    return 1;
  let size = nodeSizeCache.get(node);
  if (size == null) {
    size = 1;
    for (let child of node.children) {
      if (child.type != balanceType || !(child instanceof Tree)) {
        size = 1;
        break;
      }
      size += nodeSize(balanceType, child);
    }
    nodeSizeCache.set(node, size);
  }
  return size;
}
function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
  let total = 0;
  for (let i2 = from; i2 < to; i2++)
    total += nodeSize(balanceType, children[i2]);
  let maxChild = Math.ceil(
    total * 1.5 / 8
    /* Balance.BranchFactor */
  );
  let localChildren = [], localPositions = [];
  function divide(children2, positions2, from2, to2, offset) {
    for (let i2 = from2; i2 < to2; ) {
      let groupFrom = i2, groupStart = positions2[i2], groupSize = nodeSize(balanceType, children2[i2]);
      i2++;
      for (; i2 < to2; i2++) {
        let nextSize = nodeSize(balanceType, children2[i2]);
        if (groupSize + nextSize >= maxChild)
          break;
        groupSize += nextSize;
      }
      if (i2 == groupFrom + 1) {
        if (groupSize > maxChild) {
          let only = children2[groupFrom];
          divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
          continue;
        }
        localChildren.push(children2[groupFrom]);
      } else {
        let length2 = positions2[i2 - 1] + children2[i2 - 1].length - groupStart;
        localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i2, groupStart, length2, null, mkTree));
      }
      localPositions.push(groupStart + offset - start);
    }
  }
  divide(children, positions, from, to, 0);
  return (mkTop || mkTree)(localChildren, localPositions, length);
}
class TreeFragment {
  /**
  Construct a tree fragment. You'll usually want to use
  [`addTree`](#common.TreeFragment^addTree) and
  [`applyChanges`](#common.TreeFragment^applyChanges) instead of
  calling this directly.
  */
  constructor(from, to, tree, offset, openStart = false, openEnd = false) {
    this.from = from;
    this.to = to;
    this.tree = tree;
    this.offset = offset;
    this.open = (openStart ? 1 : 0) | (openEnd ? 2 : 0);
  }
  /**
  Whether the start of the fragment represents the start of a
  parse, or the end of a change. (In the second case, it may not
  be safe to reuse some nodes at the start, depending on the
  parsing algorithm.)
  */
  get openStart() {
    return (this.open & 1) > 0;
  }
  /**
  Whether the end of the fragment represents the end of a
  full-document parse, or the start of a change.
  */
  get openEnd() {
    return (this.open & 2) > 0;
  }
  /**
  Create a set of fragments from a freshly parsed tree, or update
  an existing set of fragments by replacing the ones that overlap
  with a tree with content from the new tree. When `partial` is
  true, the parse is treated as incomplete, and the resulting
  fragment has [`openEnd`](#common.TreeFragment.openEnd) set to
  true.
  */
  static addTree(tree, fragments = [], partial = false) {
    let result = [new TreeFragment(0, tree.length, tree, 0, false, partial)];
    for (let f of fragments)
      if (f.to > tree.length)
        result.push(f);
    return result;
  }
  /**
  Apply a set of edits to an array of fragments, removing or
  splitting fragments as necessary to remove edited ranges, and
  adjusting offsets for fragments that moved.
  */
  static applyChanges(fragments, changes, minGap = 128) {
    if (!changes.length)
      return fragments;
    let result = [];
    let fI = 1, nextF = fragments.length ? fragments[0] : null;
    for (let cI = 0, pos = 0, off = 0; ; cI++) {
      let nextC = cI < changes.length ? changes[cI] : null;
      let nextPos = nextC ? nextC.fromA : 1e9;
      if (nextPos - pos >= minGap)
        while (nextF && nextF.from < nextPos) {
          let cut = nextF;
          if (pos >= cut.from || nextPos <= cut.to || off) {
            let fFrom = Math.max(cut.from, pos) - off, fTo = Math.min(cut.to, nextPos) - off;
            cut = fFrom >= fTo ? null : new TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, cI > 0, !!nextC);
          }
          if (cut)
            result.push(cut);
          if (nextF.to > nextPos)
            break;
          nextF = fI < fragments.length ? fragments[fI++] : null;
        }
      if (!nextC)
        break;
      pos = nextC.toA;
      off = nextC.toA - nextC.toB;
    }
    return result;
  }
}
class Parser {
  /**
  Start a parse, returning a [partial parse](#common.PartialParse)
  object. [`fragments`](#common.TreeFragment) can be passed in to
  make the parse incremental.
  
  By default, the entire input is parsed. You can pass `ranges`,
  which should be a sorted array of non-empty, non-overlapping
  ranges, to parse only those ranges. The tree returned in that
  case will start at `ranges[0].from`.
  */
  startParse(input, fragments, ranges) {
    if (typeof input == "string")
      input = new StringInput(input);
    ranges = !ranges ? [new Range2(0, input.length)] : ranges.length ? ranges.map((r) => new Range2(r.from, r.to)) : [new Range2(0, 0)];
    return this.createParse(input, fragments || [], ranges);
  }
  /**
  Run a full parse, returning the resulting tree.
  */
  parse(input, fragments, ranges) {
    let parse = this.startParse(input, fragments, ranges);
    for (; ; ) {
      let done = parse.advance();
      if (done)
        return done;
    }
  }
}
class StringInput {
  constructor(string2) {
    this.string = string2;
  }
  get length() {
    return this.string.length;
  }
  chunk(from) {
    return this.string.slice(from);
  }
  get lineChunks() {
    return false;
  }
  read(from, to) {
    return this.string.slice(from, to);
  }
}
new NodeProp({ perNode: true });
let nextTagID = 0;
class Tag {
  /**
  @internal
  */
  constructor(name2, set, base2, modified) {
    this.name = name2;
    this.set = set;
    this.base = base2;
    this.modified = modified;
    this.id = nextTagID++;
  }
  toString() {
    let { name: name2 } = this;
    for (let mod of this.modified)
      if (mod.name)
        name2 = `${mod.name}(${name2})`;
    return name2;
  }
  static define(nameOrParent, parent) {
    let name2 = typeof nameOrParent == "string" ? nameOrParent : "?";
    if (nameOrParent instanceof Tag)
      parent = nameOrParent;
    if (parent === null || parent === void 0 ? void 0 : parent.base)
      throw new Error("Can not derive from a modified tag");
    let tag = new Tag(name2, [], null, []);
    tag.set.push(tag);
    if (parent)
      for (let t2 of parent.set)
        tag.set.push(t2);
    return tag;
  }
  /**
  Define a tag _modifier_, which is a function that, given a tag,
  will return a tag that is a subtag of the original. Applying the
  same modifier to a twice tag will return the same value (`m1(t1)
  == m1(t1)`) and applying multiple modifiers will, regardless or
  order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
  
  When multiple modifiers are applied to a given base tag, each
  smaller set of modifiers is registered as a parent, so that for
  example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
  `m1(m3(t1)`, and so on.
  */
  static defineModifier(name2) {
    let mod = new Modifier(name2);
    return (tag) => {
      if (tag.modified.indexOf(mod) > -1)
        return tag;
      return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a, b) => a.id - b.id));
    };
  }
}
let nextModifierID = 0;
class Modifier {
  constructor(name2) {
    this.name = name2;
    this.instances = [];
    this.id = nextModifierID++;
  }
  static get(base2, mods) {
    if (!mods.length)
      return base2;
    let exists = mods[0].instances.find((t2) => t2.base == base2 && sameArray(mods, t2.modified));
    if (exists)
      return exists;
    let set = [], tag = new Tag(base2.name, set, base2, mods);
    for (let m of mods)
      m.instances.push(tag);
    let configs = powerSet(mods);
    for (let parent of base2.set)
      if (!parent.modified.length)
        for (let config2 of configs)
          set.push(Modifier.get(parent, config2));
    return tag;
  }
}
function sameArray(a, b) {
  return a.length == b.length && a.every((x, i2) => x == b[i2]);
}
function powerSet(array) {
  let sets = [[]];
  for (let i2 = 0; i2 < array.length; i2++) {
    for (let j = 0, e = sets.length; j < e; j++) {
      sets.push(sets[j].concat(array[i2]));
    }
  }
  return sets.sort((a, b) => b.length - a.length);
}
function styleTags(spec) {
  let byName = /* @__PURE__ */ Object.create(null);
  for (let prop in spec) {
    let tags2 = spec[prop];
    if (!Array.isArray(tags2))
      tags2 = [tags2];
    for (let part of prop.split(" "))
      if (part) {
        let pieces = [], mode = 2, rest = part;
        for (let pos = 0; ; ) {
          if (rest == "..." && pos > 0 && pos + 3 == part.length) {
            mode = 1;
            break;
          }
          let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
          if (!m)
            throw new RangeError("Invalid path: " + part);
          pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
          pos += m[0].length;
          if (pos == part.length)
            break;
          let next = part[pos++];
          if (pos == part.length && next == "!") {
            mode = 0;
            break;
          }
          if (next != "/")
            throw new RangeError("Invalid path: " + part);
          rest = part.slice(pos);
        }
        let last2 = pieces.length - 1, inner = pieces[last2];
        if (!inner)
          throw new RangeError("Invalid path: " + part);
        let rule = new Rule(tags2, mode, last2 > 0 ? pieces.slice(0, last2) : null);
        byName[inner] = rule.sort(byName[inner]);
      }
  }
  return ruleNodeProp.add(byName);
}
const ruleNodeProp = new NodeProp({
  combine(a, b) {
    let cur2, root, take;
    while (a || b) {
      if (!a || b && a.depth <= b.depth) {
        take = b;
        b = b.next;
      } else {
        take = a;
        a = a.next;
      }
      if (cur2 && cur2.mode == take.mode && !take.context && !cur2.context)
        continue;
      let copy = new Rule(take.tags, take.mode, take.context);
      if (cur2)
        cur2.next = copy;
      else
        root = copy;
      cur2 = copy;
    }
    return root;
  }
});
class Rule {
  constructor(tags2, mode, context, next) {
    this.tags = tags2;
    this.mode = mode;
    this.context = context;
    this.next = next;
  }
  get opaque() {
    return this.mode == 0;
  }
  get inherit() {
    return this.mode == 1;
  }
  sort(other) {
    if (!other || other.depth < this.depth) {
      this.next = other;
      return this;
    }
    other.next = this.sort(other.next);
    return other;
  }
  get depth() {
    return this.context ? this.context.length : 0;
  }
}
Rule.empty = new Rule([], 2, null);
function tagHighlighter(tags2, options) {
  let map = /* @__PURE__ */ Object.create(null);
  for (let style of tags2) {
    if (!Array.isArray(style.tag))
      map[style.tag.id] = style.class;
    else
      for (let tag of style.tag)
        map[tag.id] = style.class;
  }
  let { scope, all = null } = options || {};
  return {
    style: (tags3) => {
      let cls = all;
      for (let tag of tags3) {
        for (let sub of tag.set) {
          let tagClass = map[sub.id];
          if (tagClass) {
            cls = cls ? cls + " " + tagClass : tagClass;
            break;
          }
        }
      }
      return cls;
    },
    scope
  };
}
function highlightTags(highlighters, tags2) {
  let result = null;
  for (let highlighter of highlighters) {
    let value = highlighter.style(tags2);
    if (value)
      result = result ? result + " " + value : value;
  }
  return result;
}
function highlightTree(tree, highlighter, putStyle, from = 0, to = tree.length) {
  let builder = new HighlightBuilder(from, Array.isArray(highlighter) ? highlighter : [highlighter], putStyle);
  builder.highlightRange(tree.cursor(), from, to, "", builder.highlighters);
  builder.flush(to);
}
class HighlightBuilder {
  constructor(at, highlighters, span) {
    this.at = at;
    this.highlighters = highlighters;
    this.span = span;
    this.class = "";
  }
  startSpan(at, cls) {
    if (cls != this.class) {
      this.flush(at);
      if (at > this.at)
        this.at = at;
      this.class = cls;
    }
  }
  flush(to) {
    if (to > this.at && this.class)
      this.span(this.at, to, this.class);
  }
  highlightRange(cursor2, from, to, inheritedClass, highlighters) {
    let { type, from: start, to: end } = cursor2;
    if (start >= to || end <= from)
      return;
    if (type.isTop)
      highlighters = this.highlighters.filter((h) => !h.scope || h.scope(type));
    let cls = inheritedClass;
    let rule = getStyleTags(cursor2) || Rule.empty;
    let tagCls = highlightTags(highlighters, rule.tags);
    if (tagCls) {
      if (cls)
        cls += " ";
      cls += tagCls;
      if (rule.mode == 1)
        inheritedClass += (inheritedClass ? " " : "") + tagCls;
    }
    this.startSpan(Math.max(from, start), cls);
    if (rule.opaque)
      return;
    let mounted = cursor2.tree && cursor2.tree.prop(NodeProp.mounted);
    if (mounted && mounted.overlay) {
      let inner = cursor2.node.enter(mounted.overlay[0].from + start, 1);
      let innerHighlighters = this.highlighters.filter((h) => !h.scope || h.scope(mounted.tree.type));
      let hasChild2 = cursor2.firstChild();
      for (let i2 = 0, pos = start; ; i2++) {
        let next = i2 < mounted.overlay.length ? mounted.overlay[i2] : null;
        let nextPos = next ? next.from + start : end;
        let rangeFrom2 = Math.max(from, pos), rangeTo2 = Math.min(to, nextPos);
        if (rangeFrom2 < rangeTo2 && hasChild2) {
          while (cursor2.from < rangeTo2) {
            this.highlightRange(cursor2, rangeFrom2, rangeTo2, inheritedClass, highlighters);
            this.startSpan(Math.min(rangeTo2, cursor2.to), cls);
            if (cursor2.to >= nextPos || !cursor2.nextSibling())
              break;
          }
        }
        if (!next || nextPos > to)
          break;
        pos = next.to + start;
        if (pos > from) {
          this.highlightRange(inner.cursor(), Math.max(from, next.from + start), Math.min(to, pos), "", innerHighlighters);
          this.startSpan(Math.min(to, pos), cls);
        }
      }
      if (hasChild2)
        cursor2.parent();
    } else if (cursor2.firstChild()) {
      if (mounted)
        inheritedClass = "";
      do {
        if (cursor2.to <= from)
          continue;
        if (cursor2.from >= to)
          break;
        this.highlightRange(cursor2, from, to, inheritedClass, highlighters);
        this.startSpan(Math.min(to, cursor2.to), cls);
      } while (cursor2.nextSibling());
      cursor2.parent();
    }
  }
}
function getStyleTags(node) {
  let rule = node.type.prop(ruleNodeProp);
  while (rule && rule.context && !node.matchContext(rule.context))
    rule = rule.next;
  return rule || null;
}
const t = Tag.define;
const comment = t(), name = t(), typeName = t(name), propertyName = t(name), literal = t(), string = t(literal), number = t(literal), content = t(), heading = t(content), keyword = t(), operator = t(), punctuation = t(), bracket = t(punctuation), meta = t();
const tags = {
  /**
  A comment.
  */
  comment,
  /**
  A line [comment](#highlight.tags.comment).
  */
  lineComment: t(comment),
  /**
  A block [comment](#highlight.tags.comment).
  */
  blockComment: t(comment),
  /**
  A documentation [comment](#highlight.tags.comment).
  */
  docComment: t(comment),
  /**
  Any kind of identifier.
  */
  name,
  /**
  The [name](#highlight.tags.name) of a variable.
  */
  variableName: t(name),
  /**
  A type [name](#highlight.tags.name).
  */
  typeName,
  /**
  A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
  */
  tagName: t(typeName),
  /**
  A property or field [name](#highlight.tags.name).
  */
  propertyName,
  /**
  An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
  */
  attributeName: t(propertyName),
  /**
  The [name](#highlight.tags.name) of a class.
  */
  className: t(name),
  /**
  A label [name](#highlight.tags.name).
  */
  labelName: t(name),
  /**
  A namespace [name](#highlight.tags.name).
  */
  namespace: t(name),
  /**
  The [name](#highlight.tags.name) of a macro.
  */
  macroName: t(name),
  /**
  A literal value.
  */
  literal,
  /**
  A string [literal](#highlight.tags.literal).
  */
  string,
  /**
  A documentation [string](#highlight.tags.string).
  */
  docString: t(string),
  /**
  A character literal (subtag of [string](#highlight.tags.string)).
  */
  character: t(string),
  /**
  An attribute value (subtag of [string](#highlight.tags.string)).
  */
  attributeValue: t(string),
  /**
  A number [literal](#highlight.tags.literal).
  */
  number,
  /**
  An integer [number](#highlight.tags.number) literal.
  */
  integer: t(number),
  /**
  A floating-point [number](#highlight.tags.number) literal.
  */
  float: t(number),
  /**
  A boolean [literal](#highlight.tags.literal).
  */
  bool: t(literal),
  /**
  Regular expression [literal](#highlight.tags.literal).
  */
  regexp: t(literal),
  /**
  An escape [literal](#highlight.tags.literal), for example a
  backslash escape in a string.
  */
  escape: t(literal),
  /**
  A color [literal](#highlight.tags.literal).
  */
  color: t(literal),
  /**
  A URL [literal](#highlight.tags.literal).
  */
  url: t(literal),
  /**
  A language keyword.
  */
  keyword,
  /**
  The [keyword](#highlight.tags.keyword) for the self or this
  object.
  */
  self: t(keyword),
  /**
  The [keyword](#highlight.tags.keyword) for null.
  */
  null: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) denoting some atomic value.
  */
  atom: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that represents a unit.
  */
  unit: t(keyword),
  /**
  A modifier [keyword](#highlight.tags.keyword).
  */
  modifier: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that acts as an operator.
  */
  operatorKeyword: t(keyword),
  /**
  A control-flow related [keyword](#highlight.tags.keyword).
  */
  controlKeyword: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that defines something.
  */
  definitionKeyword: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) related to defining or
  interfacing with modules.
  */
  moduleKeyword: t(keyword),
  /**
  An operator.
  */
  operator,
  /**
  An [operator](#highlight.tags.operator) that dereferences something.
  */
  derefOperator: t(operator),
  /**
  Arithmetic-related [operator](#highlight.tags.operator).
  */
  arithmeticOperator: t(operator),
  /**
  Logical [operator](#highlight.tags.operator).
  */
  logicOperator: t(operator),
  /**
  Bit [operator](#highlight.tags.operator).
  */
  bitwiseOperator: t(operator),
  /**
  Comparison [operator](#highlight.tags.operator).
  */
  compareOperator: t(operator),
  /**
  [Operator](#highlight.tags.operator) that updates its operand.
  */
  updateOperator: t(operator),
  /**
  [Operator](#highlight.tags.operator) that defines something.
  */
  definitionOperator: t(operator),
  /**
  Type-related [operator](#highlight.tags.operator).
  */
  typeOperator: t(operator),
  /**
  Control-flow [operator](#highlight.tags.operator).
  */
  controlOperator: t(operator),
  /**
  Program or markup punctuation.
  */
  punctuation,
  /**
  [Punctuation](#highlight.tags.punctuation) that separates
  things.
  */
  separator: t(punctuation),
  /**
  Bracket-style [punctuation](#highlight.tags.punctuation).
  */
  bracket,
  /**
  Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
  tokens).
  */
  angleBracket: t(bracket),
  /**
  Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
  tokens).
  */
  squareBracket: t(bracket),
  /**
  Parentheses (usually `(` and `)` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  paren: t(bracket),
  /**
  Braces (usually `{` and `}` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  brace: t(bracket),
  /**
  Content, for example plain text in XML or markup documents.
  */
  content,
  /**
  [Content](#highlight.tags.content) that represents a heading.
  */
  heading,
  /**
  A level 1 [heading](#highlight.tags.heading).
  */
  heading1: t(heading),
  /**
  A level 2 [heading](#highlight.tags.heading).
  */
  heading2: t(heading),
  /**
  A level 3 [heading](#highlight.tags.heading).
  */
  heading3: t(heading),
  /**
  A level 4 [heading](#highlight.tags.heading).
  */
  heading4: t(heading),
  /**
  A level 5 [heading](#highlight.tags.heading).
  */
  heading5: t(heading),
  /**
  A level 6 [heading](#highlight.tags.heading).
  */
  heading6: t(heading),
  /**
  A prose [content](#highlight.tags.content) separator (such as a horizontal rule).
  */
  contentSeparator: t(content),
  /**
  [Content](#highlight.tags.content) that represents a list.
  */
  list: t(content),
  /**
  [Content](#highlight.tags.content) that represents a quote.
  */
  quote: t(content),
  /**
  [Content](#highlight.tags.content) that is emphasized.
  */
  emphasis: t(content),
  /**
  [Content](#highlight.tags.content) that is styled strong.
  */
  strong: t(content),
  /**
  [Content](#highlight.tags.content) that is part of a link.
  */
  link: t(content),
  /**
  [Content](#highlight.tags.content) that is styled as code or
  monospace.
  */
  monospace: t(content),
  /**
  [Content](#highlight.tags.content) that has a strike-through
  style.
  */
  strikethrough: t(content),
  /**
  Inserted text in a change-tracking format.
  */
  inserted: t(),
  /**
  Deleted text.
  */
  deleted: t(),
  /**
  Changed text.
  */
  changed: t(),
  /**
  An invalid or unsyntactic element.
  */
  invalid: t(),
  /**
  Metadata or meta-instruction.
  */
  meta,
  /**
  [Metadata](#highlight.tags.meta) that applies to the entire
  document.
  */
  documentMeta: t(meta),
  /**
  [Metadata](#highlight.tags.meta) that annotates or adds
  attributes to a given syntactic element.
  */
  annotation: t(meta),
  /**
  Processing instruction or preprocessor directive. Subtag of
  [meta](#highlight.tags.meta).
  */
  processingInstruction: t(meta),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that a
  given element is being defined. Expected to be used with the
  various [name](#highlight.tags.name) tags.
  */
  definition: Tag.defineModifier("definition"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that
  something is constant. Mostly expected to be used with
  [variable names](#highlight.tags.variableName).
  */
  constant: Tag.defineModifier("constant"),
  /**
  [Modifier](#highlight.Tag^defineModifier) used to indicate that
  a [variable](#highlight.tags.variableName) or [property
  name](#highlight.tags.propertyName) is being called or defined
  as a function.
  */
  function: Tag.defineModifier("function"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that can be applied to
  [names](#highlight.tags.name) to indicate that they belong to
  the language's standard environment.
  */
  standard: Tag.defineModifier("standard"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates a given
  [names](#highlight.tags.name) is local to some scope.
  */
  local: Tag.defineModifier("local"),
  /**
  A generic variant [modifier](#highlight.Tag^defineModifier) that
  can be used to tag language-specific alternative variants of
  some common tag. It is recommended for themes to define special
  forms of at least the [string](#highlight.tags.string) and
  [variable name](#highlight.tags.variableName) tags, since those
  come up a lot.
  */
  special: Tag.defineModifier("special")
};
for (let name2 in tags) {
  let val = tags[name2];
  if (val instanceof Tag)
    val.name = name2;
}
tagHighlighter([
  { tag: tags.link, class: "tok-link" },
  { tag: tags.heading, class: "tok-heading" },
  { tag: tags.emphasis, class: "tok-emphasis" },
  { tag: tags.strong, class: "tok-strong" },
  { tag: tags.keyword, class: "tok-keyword" },
  { tag: tags.atom, class: "tok-atom" },
  { tag: tags.bool, class: "tok-bool" },
  { tag: tags.url, class: "tok-url" },
  { tag: tags.labelName, class: "tok-labelName" },
  { tag: tags.inserted, class: "tok-inserted" },
  { tag: tags.deleted, class: "tok-deleted" },
  { tag: tags.literal, class: "tok-literal" },
  { tag: tags.string, class: "tok-string" },
  { tag: tags.number, class: "tok-number" },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
  { tag: tags.variableName, class: "tok-variableName" },
  { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
  { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
  { tag: tags.special(tags.variableName), class: "tok-variableName2" },
  { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
  { tag: tags.typeName, class: "tok-typeName" },
  { tag: tags.namespace, class: "tok-namespace" },
  { tag: tags.className, class: "tok-className" },
  { tag: tags.macroName, class: "tok-macroName" },
  { tag: tags.propertyName, class: "tok-propertyName" },
  { tag: tags.operator, class: "tok-operator" },
  { tag: tags.comment, class: "tok-comment" },
  { tag: tags.meta, class: "tok-meta" },
  { tag: tags.invalid, class: "tok-invalid" },
  { tag: tags.punctuation, class: "tok-punctuation" }
]);
var _a;
const languageDataProp = /* @__PURE__ */ new NodeProp();
function defineLanguageFacet(baseData) {
  return Facet.define({
    combine: baseData ? (values) => values.concat(baseData) : void 0
  });
}
const sublanguageProp = /* @__PURE__ */ new NodeProp();
class Language {
  /**
  Construct a language object. If you need to invoke this
  directly, first define a data facet with
  [`defineLanguageFacet`](https://codemirror.net/6/docs/ref/#language.defineLanguageFacet), and then
  configure your parser to [attach](https://codemirror.net/6/docs/ref/#language.languageDataProp) it
  to the language's outer syntax node.
  */
  constructor(data, parser2, extraExtensions = [], name2 = "") {
    this.data = data;
    this.name = name2;
    if (!EditorState.prototype.hasOwnProperty("tree"))
      Object.defineProperty(EditorState.prototype, "tree", { get() {
        return syntaxTree(this);
      } });
    this.parser = parser2;
    this.extension = [
      language.of(this),
      EditorState.languageData.of((state2, pos, side) => {
        let top2 = topNodeAt(state2, pos, side), data2 = top2.type.prop(languageDataProp);
        if (!data2)
          return [];
        let base2 = state2.facet(data2), sub = top2.type.prop(sublanguageProp);
        if (sub) {
          let innerNode = top2.resolve(pos - top2.from, side);
          for (let sublang of sub)
            if (sublang.test(innerNode, state2)) {
              let data3 = state2.facet(sublang.facet);
              return sublang.type == "replace" ? data3 : data3.concat(base2);
            }
        }
        return base2;
      })
    ].concat(extraExtensions);
  }
  /**
  Query whether this language is active at the given position.
  */
  isActiveAt(state2, pos, side = -1) {
    return topNodeAt(state2, pos, side).type.prop(languageDataProp) == this.data;
  }
  /**
  Find the document regions that were parsed using this language.
  The returned regions will _include_ any nested languages rooted
  in this language, when those exist.
  */
  findRegions(state2) {
    let lang = state2.facet(language);
    if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data)
      return [{ from: 0, to: state2.doc.length }];
    if (!lang || !lang.allowsNesting)
      return [];
    let result = [];
    let explore = (tree, from) => {
      if (tree.prop(languageDataProp) == this.data) {
        result.push({ from, to: from + tree.length });
        return;
      }
      let mount = tree.prop(NodeProp.mounted);
      if (mount) {
        if (mount.tree.prop(languageDataProp) == this.data) {
          if (mount.overlay)
            for (let r of mount.overlay)
              result.push({ from: r.from + from, to: r.to + from });
          else
            result.push({ from, to: from + tree.length });
          return;
        } else if (mount.overlay) {
          let size = result.length;
          explore(mount.tree, mount.overlay[0].from + from);
          if (result.length > size)
            return;
        }
      }
      for (let i2 = 0; i2 < tree.children.length; i2++) {
        let ch = tree.children[i2];
        if (ch instanceof Tree)
          explore(ch, tree.positions[i2] + from);
      }
    };
    explore(syntaxTree(state2), 0);
    return result;
  }
  /**
  Indicates whether this language allows nested languages. The
  default implementation returns true.
  */
  get allowsNesting() {
    return true;
  }
}
Language.setState = /* @__PURE__ */ StateEffect.define();
function topNodeAt(state2, pos, side) {
  let topLang = state2.facet(language), tree = syntaxTree(state2).topNode;
  if (!topLang || topLang.allowsNesting) {
    for (let node = tree; node; node = node.enter(pos, side, IterMode.ExcludeBuffers | IterMode.EnterBracketed))
      if (node.type.isTop)
        tree = node;
  }
  return tree;
}
class LRLanguage extends Language {
  constructor(data, parser2, name2) {
    super(data, parser2, [], name2);
    this.parser = parser2;
  }
  /**
  Define a language from a parser.
  */
  static define(spec) {
    let data = defineLanguageFacet(spec.languageData);
    return new LRLanguage(data, spec.parser.configure({
      props: [languageDataProp.add((type) => type.isTop ? data : void 0)]
    }), spec.name);
  }
  /**
  Create a new instance of this language with a reconfigured
  version of its parser and optionally a new name.
  */
  configure(options, name2) {
    return new LRLanguage(this.data, this.parser.configure(options), name2 || this.name);
  }
  get allowsNesting() {
    return this.parser.hasWrappers();
  }
}
function syntaxTree(state2) {
  let field = state2.field(Language.state, false);
  return field ? field.tree : Tree.empty;
}
class DocInput {
  /**
  Create an input object for the given document.
  */
  constructor(doc2) {
    this.doc = doc2;
    this.cursorPos = 0;
    this.string = "";
    this.cursor = doc2.iter();
  }
  get length() {
    return this.doc.length;
  }
  syncTo(pos) {
    this.string = this.cursor.next(pos - this.cursorPos).value;
    this.cursorPos = pos + this.string.length;
    return this.cursorPos - this.string.length;
  }
  chunk(pos) {
    this.syncTo(pos);
    return this.string;
  }
  get lineChunks() {
    return true;
  }
  read(from, to) {
    let stringStart = this.cursorPos - this.string.length;
    if (from < stringStart || to >= this.cursorPos)
      return this.doc.sliceString(from, to);
    else
      return this.string.slice(from - stringStart, to - stringStart);
  }
}
let currentContext = null;
class ParseContext {
  constructor(parser2, state2, fragments = [], tree, treeLen, viewport, skipped, scheduleOn) {
    this.parser = parser2;
    this.state = state2;
    this.fragments = fragments;
    this.tree = tree;
    this.treeLen = treeLen;
    this.viewport = viewport;
    this.skipped = skipped;
    this.scheduleOn = scheduleOn;
    this.parse = null;
    this.tempSkipped = [];
  }
  /**
  @internal
  */
  static create(parser2, state2, viewport) {
    return new ParseContext(parser2, state2, [], Tree.empty, 0, viewport, [], null);
  }
  startParse() {
    return this.parser.startParse(new DocInput(this.state.doc), this.fragments);
  }
  /**
  @internal
  */
  work(until, upto) {
    if (upto != null && upto >= this.state.doc.length)
      upto = void 0;
    if (this.tree != Tree.empty && this.isDone(upto !== null && upto !== void 0 ? upto : this.state.doc.length)) {
      this.takeTree();
      return true;
    }
    return this.withContext(() => {
      var _a2;
      if (typeof until == "number") {
        let endTime = Date.now() + until;
        until = () => Date.now() > endTime;
      }
      if (!this.parse)
        this.parse = this.startParse();
      if (upto != null && (this.parse.stoppedAt == null || this.parse.stoppedAt > upto) && upto < this.state.doc.length)
        this.parse.stopAt(upto);
      for (; ; ) {
        let done = this.parse.advance();
        if (done) {
          this.fragments = this.withoutTempSkipped(TreeFragment.addTree(done, this.fragments, this.parse.stoppedAt != null));
          this.treeLen = (_a2 = this.parse.stoppedAt) !== null && _a2 !== void 0 ? _a2 : this.state.doc.length;
          this.tree = done;
          this.parse = null;
          if (this.treeLen < (upto !== null && upto !== void 0 ? upto : this.state.doc.length))
            this.parse = this.startParse();
          else
            return true;
        }
        if (until())
          return false;
      }
    });
  }
  /**
  @internal
  */
  takeTree() {
    let pos, tree;
    if (this.parse && (pos = this.parse.parsedPos) >= this.treeLen) {
      if (this.parse.stoppedAt == null || this.parse.stoppedAt > pos)
        this.parse.stopAt(pos);
      this.withContext(() => {
        while (!(tree = this.parse.advance())) {
        }
      });
      this.treeLen = pos;
      this.tree = tree;
      this.fragments = this.withoutTempSkipped(TreeFragment.addTree(this.tree, this.fragments, true));
      this.parse = null;
    }
  }
  withContext(f) {
    let prev = currentContext;
    currentContext = this;
    try {
      return f();
    } finally {
      currentContext = prev;
    }
  }
  withoutTempSkipped(fragments) {
    for (let r; r = this.tempSkipped.pop(); )
      fragments = cutFragments(fragments, r.from, r.to);
    return fragments;
  }
  /**
  @internal
  */
  changes(changes, newState) {
    let { fragments, tree, treeLen, viewport, skipped } = this;
    this.takeTree();
    if (!changes.empty) {
      let ranges = [];
      changes.iterChangedRanges((fromA, toA, fromB, toB) => ranges.push({ fromA, toA, fromB, toB }));
      fragments = TreeFragment.applyChanges(fragments, ranges);
      tree = Tree.empty;
      treeLen = 0;
      viewport = { from: changes.mapPos(viewport.from, -1), to: changes.mapPos(viewport.to, 1) };
      if (this.skipped.length) {
        skipped = [];
        for (let r of this.skipped) {
          let from = changes.mapPos(r.from, 1), to = changes.mapPos(r.to, -1);
          if (from < to)
            skipped.push({ from, to });
        }
      }
    }
    return new ParseContext(this.parser, newState, fragments, tree, treeLen, viewport, skipped, this.scheduleOn);
  }
  /**
  @internal
  */
  updateViewport(viewport) {
    if (this.viewport.from == viewport.from && this.viewport.to == viewport.to)
      return false;
    this.viewport = viewport;
    let startLen = this.skipped.length;
    for (let i2 = 0; i2 < this.skipped.length; i2++) {
      let { from, to } = this.skipped[i2];
      if (from < viewport.to && to > viewport.from) {
        this.fragments = cutFragments(this.fragments, from, to);
        this.skipped.splice(i2--, 1);
      }
    }
    if (this.skipped.length >= startLen)
      return false;
    this.reset();
    return true;
  }
  /**
  @internal
  */
  reset() {
    if (this.parse) {
      this.takeTree();
      this.parse = null;
    }
  }
  /**
  Notify the parse scheduler that the given region was skipped
  because it wasn't in view, and the parse should be restarted
  when it comes into view.
  */
  skipUntilInView(from, to) {
    this.skipped.push({ from, to });
  }
  /**
  Returns a parser intended to be used as placeholder when
  asynchronously loading a nested parser. It'll skip its input and
  mark it as not-really-parsed, so that the next update will parse
  it again.
  
  When `until` is given, a reparse will be scheduled when that
  promise resolves.
  */
  static getSkippingParser(until) {
    return new class extends Parser {
      createParse(input, fragments, ranges) {
        let from = ranges[0].from, to = ranges[ranges.length - 1].to;
        let parser2 = {
          parsedPos: from,
          advance() {
            let cx = currentContext;
            if (cx) {
              for (let r of ranges)
                cx.tempSkipped.push(r);
              if (until)
                cx.scheduleOn = cx.scheduleOn ? Promise.all([cx.scheduleOn, until]) : until;
            }
            this.parsedPos = to;
            return new Tree(NodeType.none, [], [], to - from);
          },
          stoppedAt: null,
          stopAt() {
          }
        };
        return parser2;
      }
    }();
  }
  /**
  @internal
  */
  isDone(upto) {
    upto = Math.min(upto, this.state.doc.length);
    let frags = this.fragments;
    return this.treeLen >= upto && frags.length && frags[0].from == 0 && frags[0].to >= upto;
  }
  /**
  Get the context for the current parse, or `null` if no editor
  parse is in progress.
  */
  static get() {
    return currentContext;
  }
}
function cutFragments(fragments, from, to) {
  return TreeFragment.applyChanges(fragments, [{ fromA: from, toA: to, fromB: from, toB: to }]);
}
class LanguageState {
  constructor(context) {
    this.context = context;
    this.tree = context.tree;
  }
  apply(tr) {
    if (!tr.docChanged && this.tree == this.context.tree)
      return this;
    let newCx = this.context.changes(tr.changes, tr.state);
    let upto = this.context.treeLen == tr.startState.doc.length ? void 0 : Math.max(tr.changes.mapPos(this.context.treeLen), newCx.viewport.to);
    if (!newCx.work(20, upto))
      newCx.takeTree();
    return new LanguageState(newCx);
  }
  static init(state2) {
    let vpTo = Math.min(3e3, state2.doc.length);
    let parseState = ParseContext.create(state2.facet(language).parser, state2, { from: 0, to: vpTo });
    if (!parseState.work(20, vpTo))
      parseState.takeTree();
    return new LanguageState(parseState);
  }
}
Language.state = /* @__PURE__ */ StateField.define({
  create: LanguageState.init,
  update(value, tr) {
    for (let e of tr.effects)
      if (e.is(Language.setState))
        return e.value;
    if (tr.startState.facet(language) != tr.state.facet(language))
      return LanguageState.init(tr.state);
    return value.apply(tr);
  }
});
let requestIdle = (callback) => {
  let timeout = setTimeout(
    () => callback(),
    500
    /* Work.MaxPause */
  );
  return () => clearTimeout(timeout);
};
if (typeof requestIdleCallback != "undefined")
  requestIdle = (callback) => {
    let idle = -1, timeout = setTimeout(
      () => {
        idle = requestIdleCallback(callback, {
          timeout: 500 - 100
          /* Work.MinPause */
        });
      },
      100
      /* Work.MinPause */
    );
    return () => idle < 0 ? clearTimeout(timeout) : cancelIdleCallback(idle);
  };
const isInputPending = typeof navigator != "undefined" && ((_a = navigator.scheduling) === null || _a === void 0 ? void 0 : _a.isInputPending) ? () => navigator.scheduling.isInputPending() : null;
const parseWorker = /* @__PURE__ */ ViewPlugin.fromClass(class ParseWorker {
  constructor(view) {
    this.view = view;
    this.working = null;
    this.workScheduled = 0;
    this.chunkEnd = -1;
    this.chunkBudget = -1;
    this.work = this.work.bind(this);
    this.scheduleWork();
  }
  update(update) {
    let cx = this.view.state.field(Language.state).context;
    if (cx.updateViewport(update.view.viewport) || this.view.viewport.to > cx.treeLen)
      this.scheduleWork();
    if (update.docChanged || update.selectionSet) {
      if (this.view.hasFocus)
        this.chunkBudget += 50;
      this.scheduleWork();
    }
    this.checkAsyncSchedule(cx);
  }
  scheduleWork() {
    if (this.working)
      return;
    let { state: state2 } = this.view, field = state2.field(Language.state);
    if (field.tree != field.context.tree || !field.context.isDone(state2.doc.length))
      this.working = requestIdle(this.work);
  }
  work(deadline) {
    this.working = null;
    let now = Date.now();
    if (this.chunkEnd < now && (this.chunkEnd < 0 || this.view.hasFocus)) {
      this.chunkEnd = now + 3e4;
      this.chunkBudget = 3e3;
    }
    if (this.chunkBudget <= 0)
      return;
    let { state: state2, viewport: { to: vpTo } } = this.view, field = state2.field(Language.state);
    if (field.tree == field.context.tree && field.context.isDone(
      vpTo + 1e5
      /* Work.MaxParseAhead */
    ))
      return;
    let endTime = Date.now() + Math.min(this.chunkBudget, 100, deadline && !isInputPending ? Math.max(25, deadline.timeRemaining() - 5) : 1e9);
    let viewportFirst = field.context.treeLen < vpTo && state2.doc.length > vpTo + 1e3;
    let done = field.context.work(() => {
      return isInputPending && isInputPending() || Date.now() > endTime;
    }, vpTo + (viewportFirst ? 0 : 1e5));
    this.chunkBudget -= Date.now() - now;
    if (done || this.chunkBudget <= 0) {
      field.context.takeTree();
      this.view.dispatch({ effects: Language.setState.of(new LanguageState(field.context)) });
    }
    if (this.chunkBudget > 0 && !(done && !viewportFirst))
      this.scheduleWork();
    this.checkAsyncSchedule(field.context);
  }
  checkAsyncSchedule(cx) {
    if (cx.scheduleOn) {
      this.workScheduled++;
      cx.scheduleOn.then(() => this.scheduleWork()).catch((err) => logException(this.view.state, err)).then(() => this.workScheduled--);
      cx.scheduleOn = null;
    }
  }
  destroy() {
    if (this.working)
      this.working();
  }
  isWorking() {
    return !!(this.working || this.workScheduled > 0);
  }
}, {
  eventHandlers: { focus() {
    this.scheduleWork();
  } }
});
const language = /* @__PURE__ */ Facet.define({
  combine(languages) {
    return languages.length ? languages[0] : null;
  },
  enables: (language2) => [
    Language.state,
    parseWorker,
    EditorView.contentAttributes.compute([language2], (state2) => {
      let lang = state2.facet(language2);
      return lang && lang.name ? { "data-language": lang.name } : {};
    })
  ]
});
class LanguageSupport {
  /**
  Create a language support object.
  */
  constructor(language2, support = []) {
    this.language = language2;
    this.support = support;
    this.extension = [language2, support];
  }
}
const indentService = /* @__PURE__ */ Facet.define();
const indentUnit = /* @__PURE__ */ Facet.define({
  combine: (values) => {
    if (!values.length)
      return "  ";
    let unit = values[0];
    if (!unit || /\S/.test(unit) || Array.from(unit).some((e) => e != unit[0]))
      throw new Error("Invalid indent unit: " + JSON.stringify(values[0]));
    return unit;
  }
});
function getIndentUnit(state2) {
  let unit = state2.facet(indentUnit);
  return unit.charCodeAt(0) == 9 ? state2.tabSize * unit.length : unit.length;
}
function indentString(state2, cols) {
  let result = "", ts = state2.tabSize, ch = state2.facet(indentUnit)[0];
  if (ch == "	") {
    while (cols >= ts) {
      result += "	";
      cols -= ts;
    }
    ch = " ";
  }
  for (let i2 = 0; i2 < cols; i2++)
    result += ch;
  return result;
}
function getIndentation(context, pos) {
  if (context instanceof EditorState)
    context = new IndentContext(context);
  for (let service of context.state.facet(indentService)) {
    let result = service(context, pos);
    if (result !== void 0)
      return result;
  }
  let tree = syntaxTree(context.state);
  return tree.length >= pos ? syntaxIndentation(context, tree, pos) : null;
}
class IndentContext {
  /**
  Create an indent context.
  */
  constructor(state2, options = {}) {
    this.state = state2;
    this.options = options;
    this.unit = getIndentUnit(state2);
  }
  /**
  Get a description of the line at the given position, taking
  [simulated line
  breaks](https://codemirror.net/6/docs/ref/#language.IndentContext.constructor^options.simulateBreak)
  into account. If there is such a break at `pos`, the `bias`
  argument determines whether the part of the line line before or
  after the break is used.
  */
  lineAt(pos, bias = 1) {
    let line = this.state.doc.lineAt(pos);
    let { simulateBreak, simulateDoubleBreak } = this.options;
    if (simulateBreak != null && simulateBreak >= line.from && simulateBreak <= line.to) {
      if (simulateDoubleBreak && simulateBreak == pos)
        return { text: "", from: pos };
      else if (bias < 0 ? simulateBreak < pos : simulateBreak <= pos)
        return { text: line.text.slice(simulateBreak - line.from), from: simulateBreak };
      else
        return { text: line.text.slice(0, simulateBreak - line.from), from: line.from };
    }
    return line;
  }
  /**
  Get the text directly after `pos`, either the entire line
  or the next 100 characters, whichever is shorter.
  */
  textAfterPos(pos, bias = 1) {
    if (this.options.simulateDoubleBreak && pos == this.options.simulateBreak)
      return "";
    let { text, from } = this.lineAt(pos, bias);
    return text.slice(pos - from, Math.min(text.length, pos + 100 - from));
  }
  /**
  Find the column for the given position.
  */
  column(pos, bias = 1) {
    let { text, from } = this.lineAt(pos, bias);
    let result = this.countColumn(text, pos - from);
    let override = this.options.overrideIndentation ? this.options.overrideIndentation(from) : -1;
    if (override > -1)
      result += override - this.countColumn(text, text.search(/\S|$/));
    return result;
  }
  /**
  Find the column position (taking tabs into account) of the given
  position in the given string.
  */
  countColumn(line, pos = line.length) {
    return countColumn(line, this.state.tabSize, pos);
  }
  /**
  Find the indentation column of the line at the given point.
  */
  lineIndent(pos, bias = 1) {
    let { text, from } = this.lineAt(pos, bias);
    let override = this.options.overrideIndentation;
    if (override) {
      let overriden = override(from);
      if (overriden > -1)
        return overriden;
    }
    return this.countColumn(text, text.search(/\S|$/));
  }
  /**
  Returns the [simulated line
  break](https://codemirror.net/6/docs/ref/#language.IndentContext.constructor^options.simulateBreak)
  for this context, if any.
  */
  get simulatedBreak() {
    return this.options.simulateBreak || null;
  }
}
const indentNodeProp = /* @__PURE__ */ new NodeProp();
function syntaxIndentation(cx, ast, pos) {
  let stack = ast.resolveStack(pos);
  let inner = ast.resolveInner(pos, -1).resolve(pos, 0).enterUnfinishedNodesBefore(pos);
  if (inner != stack.node) {
    let add2 = [];
    for (let cur2 = inner; cur2 && !(cur2.from < stack.node.from || cur2.to > stack.node.to || cur2.from == stack.node.from && cur2.type == stack.node.type); cur2 = cur2.parent)
      add2.push(cur2);
    for (let i2 = add2.length - 1; i2 >= 0; i2--)
      stack = { node: add2[i2], next: stack };
  }
  return indentFor(stack, cx, pos);
}
function indentFor(stack, cx, pos) {
  for (let cur2 = stack; cur2; cur2 = cur2.next) {
    let strategy = indentStrategy(cur2.node);
    if (strategy)
      return strategy(TreeIndentContext.create(cx, pos, cur2));
  }
  return 0;
}
function ignoreClosed(cx) {
  return cx.pos == cx.options.simulateBreak && cx.options.simulateDoubleBreak;
}
function indentStrategy(tree) {
  let strategy = tree.type.prop(indentNodeProp);
  if (strategy)
    return strategy;
  let first = tree.firstChild, close;
  if (first && (close = first.type.prop(NodeProp.closedBy))) {
    let last2 = tree.lastChild, closed = last2 && close.indexOf(last2.name) > -1;
    return (cx) => delimitedStrategy(cx, true, 1, void 0, closed && !ignoreClosed(cx) ? last2.from : void 0);
  }
  return tree.parent == null ? topIndent : null;
}
function topIndent() {
  return 0;
}
class TreeIndentContext extends IndentContext {
  constructor(base2, pos, context) {
    super(base2.state, base2.options);
    this.base = base2;
    this.pos = pos;
    this.context = context;
  }
  /**
  The syntax tree node to which the indentation strategy
  applies.
  */
  get node() {
    return this.context.node;
  }
  /**
  @internal
  */
  static create(base2, pos, context) {
    return new TreeIndentContext(base2, pos, context);
  }
  /**
  Get the text directly after `this.pos`, either the entire line
  or the next 100 characters, whichever is shorter.
  */
  get textAfter() {
    return this.textAfterPos(this.pos);
  }
  /**
  Get the indentation at the reference line for `this.node`, which
  is the line on which it starts, unless there is a node that is
  _not_ a parent of this node covering the start of that line. If
  so, the line at the start of that node is tried, again skipping
  on if it is covered by another such node.
  */
  get baseIndent() {
    return this.baseIndentFor(this.node);
  }
  /**
  Get the indentation for the reference line of the given node
  (see [`baseIndent`](https://codemirror.net/6/docs/ref/#language.TreeIndentContext.baseIndent)).
  */
  baseIndentFor(node) {
    let line = this.state.doc.lineAt(node.from);
    for (; ; ) {
      let atBreak = node.resolve(line.from);
      while (atBreak.parent && atBreak.parent.from == atBreak.from)
        atBreak = atBreak.parent;
      if (isParent(atBreak, node))
        break;
      line = this.state.doc.lineAt(atBreak.from);
    }
    return this.lineIndent(line.from);
  }
  /**
  Continue looking for indentations in the node's parent nodes,
  and return the result of that.
  */
  continue() {
    return indentFor(this.context.next, this.base, this.pos);
  }
}
function isParent(parent, of) {
  for (let cur2 = of; cur2; cur2 = cur2.parent)
    if (parent == cur2)
      return true;
  return false;
}
function bracketedAligned(context) {
  let tree = context.node;
  let openToken = tree.childAfter(tree.from), last2 = tree.lastChild;
  if (!openToken)
    return null;
  let sim = context.options.simulateBreak;
  let openLine = context.state.doc.lineAt(openToken.from);
  let lineEnd = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim);
  for (let pos = openToken.to; ; ) {
    let next = tree.childAfter(pos);
    if (!next || next == last2)
      return null;
    if (!next.type.isSkipped) {
      if (next.from >= lineEnd)
        return null;
      let space = /^ */.exec(openLine.text.slice(openToken.to - openLine.from))[0].length;
      return { from: openToken.from, to: openToken.to + space };
    }
    pos = next.to;
  }
}
function delimitedIndent({ closing: closing2, align = true, units = 1 }) {
  return (context) => delimitedStrategy(context, align, units, closing2);
}
function delimitedStrategy(context, align, units, closing2, closedAt) {
  let after = context.textAfter, space = after.match(/^\s*/)[0].length;
  let closed = closing2 && after.slice(space, space + closing2.length) == closing2 || closedAt == context.pos + space;
  let aligned = align ? bracketedAligned(context) : null;
  if (aligned)
    return closed ? context.column(aligned.from) : context.column(aligned.to);
  return context.baseIndent + (closed ? 0 : context.unit * units);
}
const flatIndent = (context) => context.baseIndent;
function continuedIndent({ except, units = 1 } = {}) {
  return (context) => {
    let matchExcept = except && except.test(context.textAfter);
    return context.baseIndent + (matchExcept ? 0 : units * context.unit);
  };
}
const DontIndentBeyond = 200;
function indentOnInput() {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent("input.type") && !tr.isUserEvent("input.complete"))
      return tr;
    let rules = tr.startState.languageDataAt("indentOnInput", tr.startState.selection.main.head);
    if (!rules.length)
      return tr;
    let doc2 = tr.newDoc, { head } = tr.newSelection.main, line = doc2.lineAt(head);
    if (head > line.from + DontIndentBeyond)
      return tr;
    let lineStart = doc2.sliceString(line.from, head);
    if (!rules.some((r) => r.test(lineStart)))
      return tr;
    let { state: state2 } = tr, last2 = -1, changes = [];
    for (let { head: head2 } of state2.selection.ranges) {
      let line2 = state2.doc.lineAt(head2);
      if (line2.from == last2)
        continue;
      last2 = line2.from;
      let indent = getIndentation(state2, line2.from);
      if (indent == null)
        continue;
      let cur2 = /^\s*/.exec(line2.text)[0];
      let norm = indentString(state2, indent);
      if (cur2 != norm)
        changes.push({ from: line2.from, to: line2.from + cur2.length, insert: norm });
    }
    return changes.length ? [tr, { changes, sequential: true }] : tr;
  });
}
const foldService = /* @__PURE__ */ Facet.define();
const foldNodeProp = /* @__PURE__ */ new NodeProp();
function foldInside(node) {
  let first = node.firstChild, last2 = node.lastChild;
  return first && first.to < last2.from ? { from: first.to, to: last2.type.isError ? node.to : last2.from } : null;
}
function syntaxFolding(state2, start, end) {
  let tree = syntaxTree(state2);
  if (tree.length < end)
    return null;
  let stack = tree.resolveStack(end, 1);
  let found = null;
  for (let iter = stack; iter; iter = iter.next) {
    let cur2 = iter.node;
    if (cur2.to <= end || cur2.from > end)
      continue;
    if (found && cur2.from < start)
      break;
    let prop = cur2.type.prop(foldNodeProp);
    if (prop && (cur2.to < tree.length - 50 || tree.length == state2.doc.length || !isUnfinished(cur2))) {
      let value = prop(cur2, state2);
      if (value && value.from <= end && value.from >= start && value.to > end)
        found = value;
    }
  }
  return found;
}
function isUnfinished(node) {
  let ch = node.lastChild;
  return ch && ch.to == node.to && ch.type.isError;
}
function foldable(state2, lineStart, lineEnd) {
  for (let service of state2.facet(foldService)) {
    let result = service(state2, lineStart, lineEnd);
    if (result)
      return result;
  }
  return syntaxFolding(state2, lineStart, lineEnd);
}
function mapRange(range, mapping) {
  let from = mapping.mapPos(range.from, 1), to = mapping.mapPos(range.to, -1);
  return from >= to ? void 0 : { from, to };
}
const foldEffect = /* @__PURE__ */ StateEffect.define({ map: mapRange });
const unfoldEffect = /* @__PURE__ */ StateEffect.define({ map: mapRange });
function selectedLines(view) {
  let lines = [];
  for (let { head } of view.state.selection.ranges) {
    if (lines.some((l) => l.from <= head && l.to >= head))
      continue;
    lines.push(view.lineBlockAt(head));
  }
  return lines;
}
const foldState = /* @__PURE__ */ StateField.define({
  create() {
    return Decoration.none;
  },
  update(folded, tr) {
    if (tr.isUserEvent("delete"))
      tr.changes.iterChangedRanges((fromA, toA) => folded = clearTouchedFolds(folded, fromA, toA));
    folded = folded.map(tr.changes);
    let rangesToFold = [];
    for (let e of tr.effects) {
      if (e.is(foldEffect) && !foldExists(folded, e.value.from, e.value.to)) {
        rangesToFold.push(e.value);
      } else if (e.is(unfoldEffect)) {
        folded = folded.update({
          filter: (from, to) => e.value.from != from || e.value.to != to,
          filterFrom: e.value.from,
          filterTo: e.value.to
        });
      }
    }
    if (rangesToFold.length) {
      let { preparePlaceholder } = tr.state.facet(foldConfig);
      let decorations2 = rangesToFold.map((value) => {
        let widget = !preparePlaceholder ? foldWidget : Decoration.replace({ widget: new PreparedFoldWidget(preparePlaceholder(tr.state, value)) });
        return widget.range(value.from, value.to);
      });
      folded = folded.update({ add: decorations2 });
    }
    if (tr.selection)
      folded = clearTouchedFolds(folded, tr.selection.main.head);
    return folded;
  },
  provide: (f) => EditorView.decorations.from(f),
  toJSON(folded, state2) {
    let ranges = [];
    folded.between(0, state2.doc.length, (from, to) => {
      ranges.push(from, to);
    });
    return ranges;
  },
  fromJSON(value) {
    if (!Array.isArray(value) || value.length % 2)
      throw new RangeError("Invalid JSON for fold state");
    let ranges = [];
    for (let i2 = 0; i2 < value.length; ) {
      let from = value[i2++], to = value[i2++];
      if (typeof from != "number" || typeof to != "number")
        throw new RangeError("Invalid JSON for fold state");
      ranges.push(foldWidget.range(from, to));
    }
    return Decoration.set(ranges, true);
  }
});
function clearTouchedFolds(folded, from, to = from) {
  let touched = false;
  folded.between(from, to, (a, b) => {
    if (a < to && b > from)
      touched = true;
  });
  return !touched ? folded : folded.update({
    filterFrom: from,
    filterTo: to,
    filter: (a, b) => a >= to || b <= from
  });
}
function findFold(state2, from, to) {
  var _a2;
  let found = null;
  (_a2 = state2.field(foldState, false)) === null || _a2 === void 0 ? void 0 : _a2.between(from, to, (from2, to2) => {
    if (!found || found.from > from2)
      found = { from: from2, to: to2 };
  });
  return found;
}
function foldExists(folded, from, to) {
  let found = false;
  folded.between(from, from, (a, b) => {
    if (a == from && b == to)
      found = true;
  });
  return found;
}
function maybeEnable(state2, other) {
  return state2.field(foldState, false) ? other : other.concat(StateEffect.appendConfig.of(codeFolding()));
}
const foldCode = (view) => {
  for (let line of selectedLines(view)) {
    let range = foldable(view.state, line.from, line.to);
    if (range) {
      view.dispatch({ effects: maybeEnable(view.state, [foldEffect.of(range), announceFold(view, range)]) });
      return true;
    }
  }
  return false;
};
const unfoldCode = (view) => {
  if (!view.state.field(foldState, false))
    return false;
  let effects = [];
  for (let line of selectedLines(view)) {
    let folded = findFold(view.state, line.from, line.to);
    if (folded)
      effects.push(unfoldEffect.of(folded), announceFold(view, folded, false));
  }
  if (effects.length)
    view.dispatch({ effects });
  return effects.length > 0;
};
function announceFold(view, range, fold = true) {
  let lineFrom = view.state.doc.lineAt(range.from).number, lineTo = view.state.doc.lineAt(range.to).number;
  return EditorView.announce.of(`${view.state.phrase(fold ? "Folded lines" : "Unfolded lines")} ${lineFrom} ${view.state.phrase("to")} ${lineTo}.`);
}
const foldAll = (view) => {
  let { state: state2 } = view, effects = [];
  for (let pos = 0; pos < state2.doc.length; ) {
    let line = view.lineBlockAt(pos), range = foldable(state2, line.from, line.to);
    if (range)
      effects.push(foldEffect.of(range));
    pos = (range ? view.lineBlockAt(range.to) : line).to + 1;
  }
  if (effects.length)
    view.dispatch({ effects: maybeEnable(view.state, effects) });
  return !!effects.length;
};
const unfoldAll = (view) => {
  let field = view.state.field(foldState, false);
  if (!field || !field.size)
    return false;
  let effects = [];
  field.between(0, view.state.doc.length, (from, to) => {
    effects.push(unfoldEffect.of({ from, to }));
  });
  view.dispatch({ effects });
  return true;
};
const foldKeymap = [
  { key: "Ctrl-Shift-[", mac: "Cmd-Alt-[", run: foldCode },
  { key: "Ctrl-Shift-]", mac: "Cmd-Alt-]", run: unfoldCode },
  { key: "Ctrl-Alt-[", run: foldAll },
  { key: "Ctrl-Alt-]", run: unfoldAll }
];
const defaultConfig = {
  placeholderDOM: null,
  preparePlaceholder: null,
  placeholderText: "…"
};
const foldConfig = /* @__PURE__ */ Facet.define({
  combine(values) {
    return combineConfig(values, defaultConfig);
  }
});
function codeFolding(config2) {
  let result = [foldState, baseTheme$1$1];
  return result;
}
function widgetToDOM(view, prepared) {
  let { state: state2 } = view, conf = state2.facet(foldConfig);
  let onclick = (event) => {
    let line = view.lineBlockAt(view.posAtDOM(event.target));
    let folded = findFold(view.state, line.from, line.to);
    if (folded)
      view.dispatch({ effects: unfoldEffect.of(folded) });
    event.preventDefault();
  };
  if (conf.placeholderDOM)
    return conf.placeholderDOM(view, onclick, prepared);
  let element = document.createElement("span");
  element.textContent = conf.placeholderText;
  element.setAttribute("aria-label", state2.phrase("folded code"));
  element.title = state2.phrase("unfold");
  element.className = "cm-foldPlaceholder";
  element.onclick = onclick;
  return element;
}
const foldWidget = /* @__PURE__ */ Decoration.replace({ widget: /* @__PURE__ */ new class extends WidgetType {
  toDOM(view) {
    return widgetToDOM(view, null);
  }
}() });
class PreparedFoldWidget extends WidgetType {
  constructor(value) {
    super();
    this.value = value;
  }
  eq(other) {
    return this.value == other.value;
  }
  toDOM(view) {
    return widgetToDOM(view, this.value);
  }
}
const foldGutterDefaults = {
  openText: "⌄",
  closedText: "›",
  markerDOM: null,
  domEventHandlers: {},
  foldingChanged: () => false
};
class FoldMarker extends GutterMarker {
  constructor(config2, open2) {
    super();
    this.config = config2;
    this.open = open2;
  }
  eq(other) {
    return this.config == other.config && this.open == other.open;
  }
  toDOM(view) {
    if (this.config.markerDOM)
      return this.config.markerDOM(this.open);
    let span = document.createElement("span");
    span.textContent = this.open ? this.config.openText : this.config.closedText;
    span.title = view.state.phrase(this.open ? "Fold line" : "Unfold line");
    return span;
  }
}
function foldGutter(config2 = {}) {
  let fullConfig = { ...foldGutterDefaults, ...config2 };
  let canFold = new FoldMarker(fullConfig, true), canUnfold = new FoldMarker(fullConfig, false);
  let markers = ViewPlugin.fromClass(class {
    constructor(view) {
      this.from = view.viewport.from;
      this.markers = this.buildMarkers(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged || update.startState.facet(language) != update.state.facet(language) || update.startState.field(foldState, false) != update.state.field(foldState, false) || syntaxTree(update.startState) != syntaxTree(update.state) || fullConfig.foldingChanged(update))
        this.markers = this.buildMarkers(update.view);
    }
    buildMarkers(view) {
      let builder = new RangeSetBuilder();
      for (let line of view.viewportLineBlocks) {
        let mark = findFold(view.state, line.from, line.to) ? canUnfold : foldable(view.state, line.from, line.to) ? canFold : null;
        if (mark)
          builder.add(line.from, line.from, mark);
      }
      return builder.finish();
    }
  });
  let { domEventHandlers } = fullConfig;
  return [
    markers,
    gutter({
      class: "cm-foldGutter",
      markers(view) {
        var _a2;
        return ((_a2 = view.plugin(markers)) === null || _a2 === void 0 ? void 0 : _a2.markers) || RangeSet.empty;
      },
      initialSpacer() {
        return new FoldMarker(fullConfig, false);
      },
      domEventHandlers: {
        ...domEventHandlers,
        click: (view, line, event) => {
          if (domEventHandlers.click && domEventHandlers.click(view, line, event))
            return true;
          let folded = findFold(view.state, line.from, line.to);
          if (folded) {
            view.dispatch({ effects: unfoldEffect.of(folded) });
            return true;
          }
          let range = foldable(view.state, line.from, line.to);
          if (range) {
            view.dispatch({ effects: foldEffect.of(range) });
            return true;
          }
          return false;
        }
      }
    }),
    codeFolding()
  ];
}
const baseTheme$1$1 = /* @__PURE__ */ EditorView.baseTheme({
  ".cm-foldPlaceholder": {
    backgroundColor: "#eee",
    border: "1px solid #ddd",
    color: "#888",
    borderRadius: ".2em",
    margin: "0 1px",
    padding: "0 1px",
    cursor: "pointer"
  },
  ".cm-foldGutter span": {
    padding: "0 1px",
    cursor: "pointer"
  }
});
class HighlightStyle {
  constructor(specs, options) {
    this.specs = specs;
    let modSpec;
    function def(spec) {
      let cls = StyleModule.newName();
      (modSpec || (modSpec = /* @__PURE__ */ Object.create(null)))["." + cls] = spec;
      return cls;
    }
    const all = typeof options.all == "string" ? options.all : options.all ? def(options.all) : void 0;
    const scopeOpt = options.scope;
    this.scope = scopeOpt instanceof Language ? (type) => type.prop(languageDataProp) == scopeOpt.data : scopeOpt ? (type) => type == scopeOpt : void 0;
    this.style = tagHighlighter(specs.map((style) => ({
      tag: style.tag,
      class: style.class || def(Object.assign({}, style, { tag: null }))
    })), {
      all
    }).style;
    this.module = modSpec ? new StyleModule(modSpec) : null;
    this.themeType = options.themeType;
  }
  /**
  Create a highlighter style that associates the given styles to
  the given tags. The specs must be objects that hold a style tag
  or array of tags in their `tag` property, and either a single
  `class` property providing a static CSS class (for highlighter
  that rely on external styling), or a
  [`style-mod`](https://code.haverbeke.berlin/marijn/style-mod#documentation)-style
  set of CSS properties (which define the styling for those tags).
  
  The CSS rules created for a highlighter will be emitted in the
  order of the spec's properties. That means that for elements that
  have multiple tags associated with them, styles defined further
  down in the list will have a higher CSS precedence than styles
  defined earlier.
  */
  static define(specs, options) {
    return new HighlightStyle(specs, options || {});
  }
}
const highlighterFacet = /* @__PURE__ */ Facet.define();
const fallbackHighlighter = /* @__PURE__ */ Facet.define({
  combine(values) {
    return values.length ? [values[0]] : null;
  }
});
function getHighlighters(state2) {
  let main = state2.facet(highlighterFacet);
  return main.length ? main : state2.facet(fallbackHighlighter);
}
function syntaxHighlighting(highlighter, options) {
  let ext = [treeHighlighter], themeType;
  if (highlighter instanceof HighlightStyle) {
    if (highlighter.module)
      ext.push(EditorView.styleModule.of(highlighter.module));
    themeType = highlighter.themeType;
  }
  if (options === null || options === void 0 ? void 0 : options.fallback)
    ext.push(fallbackHighlighter.of(highlighter));
  else if (themeType)
    ext.push(highlighterFacet.computeN([EditorView.darkTheme], (state2) => {
      return state2.facet(EditorView.darkTheme) == (themeType == "dark") ? [highlighter] : [];
    }));
  else
    ext.push(highlighterFacet.of(highlighter));
  return ext;
}
class TreeHighlighter {
  constructor(view) {
    this.markCache = /* @__PURE__ */ Object.create(null);
    this.tree = syntaxTree(view.state);
    this.decorations = this.buildDeco(view, getHighlighters(view.state));
    this.decoratedTo = view.viewport.to;
  }
  update(update) {
    let tree = syntaxTree(update.state), highlighters = getHighlighters(update.state);
    let styleChange = highlighters != getHighlighters(update.startState);
    let { viewport } = update.view, decoratedToMapped = update.changes.mapPos(this.decoratedTo, 1);
    if (tree.length < viewport.to && !styleChange && tree.type == this.tree.type && decoratedToMapped >= viewport.to) {
      this.decorations = this.decorations.map(update.changes);
      this.decoratedTo = decoratedToMapped;
    } else if (tree != this.tree || update.viewportChanged || styleChange) {
      this.tree = tree;
      this.decorations = this.buildDeco(update.view, highlighters);
      this.decoratedTo = viewport.to;
    }
  }
  buildDeco(view, highlighters) {
    if (!highlighters || !this.tree.length)
      return Decoration.none;
    let builder = new RangeSetBuilder();
    for (let { from, to } of view.visibleRanges) {
      highlightTree(this.tree, highlighters, (from2, to2, style) => {
        builder.add(from2, to2, this.markCache[style] || (this.markCache[style] = Decoration.mark({ class: style })));
      }, from, to);
    }
    return builder.finish();
  }
}
const treeHighlighter = /* @__PURE__ */ Prec.high(/* @__PURE__ */ ViewPlugin.fromClass(TreeHighlighter, {
  decorations: (v) => v.decorations
}));
const defaultHighlightStyle = /* @__PURE__ */ HighlightStyle.define([
  {
    tag: tags.meta,
    color: "#404740"
  },
  {
    tag: tags.link,
    textDecoration: "underline"
  },
  {
    tag: tags.heading,
    textDecoration: "underline",
    fontWeight: "bold"
  },
  {
    tag: tags.emphasis,
    fontStyle: "italic"
  },
  {
    tag: tags.strong,
    fontWeight: "bold"
  },
  {
    tag: tags.strikethrough,
    textDecoration: "line-through"
  },
  {
    tag: tags.keyword,
    color: "#708"
  },
  {
    tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
    color: "#219"
  },
  {
    tag: [tags.literal, tags.inserted],
    color: "#164"
  },
  {
    tag: [tags.string, tags.deleted],
    color: "#a11"
  },
  {
    tag: [tags.regexp, tags.escape, /* @__PURE__ */ tags.special(tags.string)],
    color: "#e40"
  },
  {
    tag: /* @__PURE__ */ tags.definition(tags.variableName),
    color: "#00f"
  },
  {
    tag: /* @__PURE__ */ tags.local(tags.variableName),
    color: "#30a"
  },
  {
    tag: [tags.typeName, tags.namespace],
    color: "#085"
  },
  {
    tag: tags.className,
    color: "#167"
  },
  {
    tag: [/* @__PURE__ */ tags.special(tags.variableName), tags.macroName],
    color: "#256"
  },
  {
    tag: /* @__PURE__ */ tags.definition(tags.propertyName),
    color: "#00c"
  },
  {
    tag: tags.comment,
    color: "#940"
  },
  {
    tag: tags.invalid,
    color: "#f00"
  }
]);
const baseTheme$3 = /* @__PURE__ */ EditorView.baseTheme({
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "#328c8252" },
  "&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "#bb555544" }
});
const DefaultScanDist = 1e4, DefaultBrackets = "()[]{}";
const bracketMatchingConfig = /* @__PURE__ */ Facet.define({
  combine(configs) {
    return combineConfig(configs, {
      afterCursor: true,
      brackets: DefaultBrackets,
      maxScanDistance: DefaultScanDist,
      renderMatch: defaultRenderMatch
    });
  }
});
const matchingMark = /* @__PURE__ */ Decoration.mark({ class: "cm-matchingBracket" }), nonmatchingMark = /* @__PURE__ */ Decoration.mark({ class: "cm-nonmatchingBracket" });
function defaultRenderMatch(match) {
  let decorations2 = [];
  let mark = match.matched ? matchingMark : nonmatchingMark;
  decorations2.push(mark.range(match.start.from, match.start.to));
  if (match.end)
    decorations2.push(mark.range(match.end.from, match.end.to));
  return decorations2;
}
function bracketDeco(state2) {
  let decorations2 = [];
  let config2 = state2.facet(bracketMatchingConfig);
  for (let range of state2.selection.ranges) {
    if (!range.empty)
      continue;
    let match = matchBrackets(state2, range.head, -1, config2) || range.head > 0 && matchBrackets(state2, range.head - 1, 1, config2) || config2.afterCursor && (matchBrackets(state2, range.head, 1, config2) || range.head < state2.doc.length && matchBrackets(state2, range.head + 1, -1, config2));
    if (match)
      decorations2 = decorations2.concat(config2.renderMatch(match, state2));
  }
  return Decoration.set(decorations2, true);
}
const bracketMatcher = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.paused = false;
    this.decorations = bracketDeco(view.state);
  }
  update(update) {
    if (update.docChanged || update.selectionSet || this.paused) {
      if (update.view.composing) {
        this.decorations = this.decorations.map(update.changes);
        this.paused = true;
      } else {
        this.decorations = bracketDeco(update.state);
        this.paused = false;
      }
    }
  }
}, {
  decorations: (v) => v.decorations
});
const bracketMatchingUnique = [
  bracketMatcher,
  baseTheme$3
];
function bracketMatching(config2 = {}) {
  return [bracketMatchingConfig.of(config2), bracketMatchingUnique];
}
const bracketMatchingHandle = /* @__PURE__ */ new NodeProp();
function matchingNodes(node, dir, brackets) {
  let byProp = node.prop(dir < 0 ? NodeProp.openedBy : NodeProp.closedBy);
  if (byProp)
    return byProp;
  if (node.name.length == 1) {
    let index = brackets.indexOf(node.name);
    if (index > -1 && index % 2 == (dir < 0 ? 1 : 0))
      return [brackets[index + dir]];
  }
  return null;
}
function findHandle(node) {
  let hasHandle = node.type.prop(bracketMatchingHandle);
  return hasHandle ? hasHandle(node.node) : node;
}
function matchBrackets(state2, pos, dir, config2 = {}) {
  let maxScanDistance = config2.maxScanDistance || DefaultScanDist, brackets = config2.brackets || DefaultBrackets;
  let tree = syntaxTree(state2), node = tree.resolveInner(pos, dir);
  for (let cur2 = node; cur2; cur2 = cur2.parent) {
    let matches = matchingNodes(cur2.type, dir, brackets);
    if (matches && cur2.from < cur2.to) {
      let handle = findHandle(cur2);
      if (handle && (dir > 0 ? pos >= handle.from && pos < handle.to : pos > handle.from && pos <= handle.to))
        return matchMarkedBrackets(state2, pos, dir, cur2, handle, matches, brackets);
    }
  }
  return matchPlainBrackets(state2, pos, dir, tree, node.type, maxScanDistance, brackets);
}
function matchMarkedBrackets(_state, _pos, dir, token, handle, matching, brackets) {
  let parent = token.parent, firstToken = { from: handle.from, to: handle.to };
  let depth = 0, cursor2 = parent === null || parent === void 0 ? void 0 : parent.cursor();
  if (cursor2 && (dir < 0 ? cursor2.childBefore(token.from) : cursor2.childAfter(token.to)))
    do {
      if (dir < 0 ? cursor2.to <= token.from : cursor2.from >= token.to) {
        if (depth == 0 && matching.indexOf(cursor2.type.name) > -1 && cursor2.from < cursor2.to) {
          let endHandle = findHandle(cursor2);
          return { start: firstToken, end: endHandle ? { from: endHandle.from, to: endHandle.to } : void 0, matched: true };
        } else if (matchingNodes(cursor2.type, dir, brackets)) {
          depth++;
        } else if (matchingNodes(cursor2.type, -dir, brackets)) {
          if (depth == 0) {
            let endHandle = findHandle(cursor2);
            return {
              start: firstToken,
              end: endHandle && endHandle.from < endHandle.to ? { from: endHandle.from, to: endHandle.to } : void 0,
              matched: false
            };
          }
          depth--;
        }
      }
    } while (dir < 0 ? cursor2.prevSibling() : cursor2.nextSibling());
  return { start: firstToken, matched: false };
}
function matchPlainBrackets(state2, pos, dir, tree, tokenType, maxScanDistance, brackets) {
  if (dir < 0 ? !pos : pos == state2.doc.length)
    return null;
  let startCh = dir < 0 ? state2.sliceDoc(pos - 1, pos) : state2.sliceDoc(pos, pos + 1);
  let bracket2 = brackets.indexOf(startCh);
  if (bracket2 < 0 || bracket2 % 2 == 0 != dir > 0)
    return null;
  let startToken = { from: dir < 0 ? pos - 1 : pos, to: dir > 0 ? pos + 1 : pos };
  let iter = state2.doc.iterRange(pos, dir > 0 ? state2.doc.length : 0), depth = 0;
  for (let distance = 0; !iter.next().done && distance <= maxScanDistance; ) {
    let text = iter.value;
    if (dir < 0)
      distance += text.length;
    let basePos = pos + distance * dir;
    for (let pos2 = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos2 != end; pos2 += dir) {
      let found = brackets.indexOf(text[pos2]);
      if (found < 0 || tree.resolveInner(basePos + pos2, 1).type != tokenType)
        continue;
      if (found % 2 == 0 == dir > 0) {
        depth++;
      } else if (depth == 1) {
        return { start: startToken, end: { from: basePos + pos2, to: basePos + pos2 + 1 }, matched: found >> 1 == bracket2 >> 1 };
      } else {
        depth--;
      }
    }
    if (dir > 0)
      distance += text.length;
  }
  return iter.done ? { start: startToken, matched: false } : null;
}
const noTokens = /* @__PURE__ */ Object.create(null);
const typeArray = [NodeType.none];
const warned = [];
const byTag = /* @__PURE__ */ Object.create(null);
const defaultTable = /* @__PURE__ */ Object.create(null);
for (let [legacyName, name2] of [
  ["variable", "variableName"],
  ["variable-2", "variableName.special"],
  ["string-2", "string.special"],
  ["def", "variableName.definition"],
  ["tag", "tagName"],
  ["attribute", "attributeName"],
  ["type", "typeName"],
  ["builtin", "variableName.standard"],
  ["qualifier", "modifier"],
  ["error", "invalid"],
  ["header", "heading"],
  ["property", "propertyName"]
])
  defaultTable[legacyName] = /* @__PURE__ */ createTokenType(noTokens, name2);
function warnForPart(part, msg) {
  if (warned.indexOf(part) > -1)
    return;
  warned.push(part);
  console.warn(msg);
}
function createTokenType(extra, tagStr) {
  let tags$1 = [];
  for (let name3 of tagStr.split(" ")) {
    let found = [];
    for (let part of name3.split(".")) {
      let value = extra[part] || tags[part];
      if (!value) {
        warnForPart(part, `Unknown highlighting tag ${part}`);
      } else if (typeof value == "function") {
        if (!found.length)
          warnForPart(part, `Modifier ${part} used at start of tag`);
        else
          found = found.map(value);
      } else {
        if (found.length)
          warnForPart(part, `Tag ${part} used as modifier`);
        else
          found = Array.isArray(value) ? value : [value];
      }
    }
    for (let tag of found)
      tags$1.push(tag);
  }
  if (!tags$1.length)
    return 0;
  let name2 = tagStr.replace(/ /g, "_"), key = name2 + " " + tags$1.map((t2) => t2.id);
  let known = byTag[key];
  if (known)
    return known.id;
  let type = byTag[key] = NodeType.define({
    id: typeArray.length,
    name: name2,
    props: [styleTags({ [name2]: tags$1 })]
  });
  typeArray.push(type);
  return type.id;
}
({
  rtl: /* @__PURE__ */ Decoration.mark({ class: "cm-iso", inclusive: true, attributes: { dir: "rtl" }, bidiIsolate: Direction.RTL }),
  ltr: /* @__PURE__ */ Decoration.mark({ class: "cm-iso", inclusive: true, attributes: { dir: "ltr" }, bidiIsolate: Direction.LTR })
});
const toggleComment = (target) => {
  let { state: state2 } = target, line = state2.doc.lineAt(state2.selection.main.from), config2 = getConfig(target.state, line.from);
  return config2.line ? toggleLineComment(target) : config2.block ? toggleBlockCommentByLine(target) : false;
};
function command(f, option) {
  return ({ state: state2, dispatch }) => {
    if (state2.readOnly)
      return false;
    let tr = f(option, state2);
    if (!tr)
      return false;
    dispatch(state2.update(tr));
    return true;
  };
}
const toggleLineComment = /* @__PURE__ */ command(
  changeLineComment,
  0
  /* CommentOption.Toggle */
);
const toggleBlockComment = /* @__PURE__ */ command(
  changeBlockComment,
  0
  /* CommentOption.Toggle */
);
const toggleBlockCommentByLine = /* @__PURE__ */ command(
  (o, s) => changeBlockComment(o, s, selectedLineRanges(s)),
  0
  /* CommentOption.Toggle */
);
function getConfig(state2, pos) {
  let data = state2.languageDataAt("commentTokens", pos, 1);
  return data.length ? data[0] : {};
}
const SearchMargin = 50;
function findBlockComment(state2, { open: open2, close }, from, to) {
  let textBefore = state2.sliceDoc(from - SearchMargin, from);
  let textAfter = state2.sliceDoc(to, to + SearchMargin);
  let spaceBefore = /\s*$/.exec(textBefore)[0].length, spaceAfter = /^\s*/.exec(textAfter)[0].length;
  let beforeOff = textBefore.length - spaceBefore;
  if (textBefore.slice(beforeOff - open2.length, beforeOff) == open2 && textAfter.slice(spaceAfter, spaceAfter + close.length) == close) {
    return {
      open: { pos: from - spaceBefore, margin: spaceBefore && 1 },
      close: { pos: to + spaceAfter, margin: spaceAfter && 1 }
    };
  }
  let startText, endText;
  if (to - from <= 2 * SearchMargin) {
    startText = endText = state2.sliceDoc(from, to);
  } else {
    startText = state2.sliceDoc(from, from + SearchMargin);
    endText = state2.sliceDoc(to - SearchMargin, to);
  }
  let startSpace = /^\s*/.exec(startText)[0].length, endSpace = /\s*$/.exec(endText)[0].length;
  let endOff = endText.length - endSpace - close.length;
  if (startText.slice(startSpace, startSpace + open2.length) == open2 && endText.slice(endOff, endOff + close.length) == close) {
    return {
      open: {
        pos: from + startSpace + open2.length,
        margin: /\s/.test(startText.charAt(startSpace + open2.length)) ? 1 : 0
      },
      close: {
        pos: to - endSpace - close.length,
        margin: /\s/.test(endText.charAt(endOff - 1)) ? 1 : 0
      }
    };
  }
  return null;
}
function selectedLineRanges(state2) {
  let ranges = [];
  for (let r of state2.selection.ranges) {
    let fromLine = state2.doc.lineAt(r.from);
    let toLine = r.to <= fromLine.to ? fromLine : state2.doc.lineAt(r.to);
    if (toLine.from > fromLine.from && toLine.from == r.to)
      toLine = r.to == fromLine.to + 1 ? fromLine : state2.doc.lineAt(r.to - 1);
    let last2 = ranges.length - 1;
    if (last2 >= 0 && ranges[last2].to > fromLine.from)
      ranges[last2].to = toLine.to;
    else
      ranges.push({ from: fromLine.from + /^\s*/.exec(fromLine.text)[0].length, to: toLine.to });
  }
  return ranges;
}
function changeBlockComment(option, state2, ranges = state2.selection.ranges) {
  let tokens = ranges.map((r) => getConfig(state2, r.from).block);
  if (!tokens.every((c) => c))
    return null;
  let comments = ranges.map((r, i2) => findBlockComment(state2, tokens[i2], r.from, r.to));
  if (option != 2 && !comments.every((c) => c)) {
    return { changes: state2.changes(ranges.map((range, i2) => {
      if (comments[i2])
        return [];
      return [{ from: range.from, insert: tokens[i2].open + " " }, { from: range.to, insert: " " + tokens[i2].close }];
    })) };
  } else if (option != 1 && comments.some((c) => c)) {
    let changes = [];
    for (let i2 = 0, comment2; i2 < comments.length; i2++)
      if (comment2 = comments[i2]) {
        let token = tokens[i2], { open: open2, close } = comment2;
        changes.push({ from: open2.pos - token.open.length, to: open2.pos + open2.margin }, { from: close.pos - close.margin, to: close.pos + token.close.length });
      }
    return { changes };
  }
  return null;
}
function changeLineComment(option, state2, ranges = state2.selection.ranges) {
  let lines = [];
  let prevLine = -1;
  ranges: for (let { from, to } of ranges) {
    let startI = lines.length, minIndent = 1e9, token;
    for (let pos = from; pos <= to; ) {
      let line = state2.doc.lineAt(pos);
      if (token == void 0) {
        token = getConfig(state2, line.from).line;
        if (!token)
          continue ranges;
      }
      if (line.from > prevLine && (from == to || to > line.from)) {
        prevLine = line.from;
        let indent = /^\s*/.exec(line.text)[0].length;
        let empty2 = indent == line.length;
        let comment2 = line.text.slice(indent, indent + token.length) == token ? indent : -1;
        if (indent < line.text.length && indent < minIndent)
          minIndent = indent;
        lines.push({ line, comment: comment2, token, indent, empty: empty2, single: false });
      }
      pos = line.to + 1;
    }
    if (minIndent < 1e9) {
      for (let i2 = startI; i2 < lines.length; i2++)
        if (lines[i2].indent < lines[i2].line.text.length)
          lines[i2].indent = minIndent;
    }
    if (lines.length == startI + 1)
      lines[startI].single = true;
  }
  if (option != 2 && lines.some((l) => l.comment < 0 && (!l.empty || l.single))) {
    let changes = [];
    for (let { line, token, indent, empty: empty2, single } of lines)
      if (single || !empty2)
        changes.push({ from: line.from + indent, insert: token + " " });
    let changeSet = state2.changes(changes);
    return { changes: changeSet, selection: state2.selection.map(changeSet, 1) };
  } else if (option != 1 && lines.some((l) => l.comment >= 0)) {
    let changes = [];
    for (let { line, comment: comment2, token } of lines)
      if (comment2 >= 0) {
        let from = line.from + comment2, to = from + token.length;
        if (line.text[to - line.from] == " ")
          to++;
        changes.push({ from, to });
      }
    return { changes };
  }
  return null;
}
const fromHistory = /* @__PURE__ */ Annotation.define();
const isolateHistory = /* @__PURE__ */ Annotation.define();
const invertedEffects = /* @__PURE__ */ Facet.define();
const historyConfig = /* @__PURE__ */ Facet.define({
  combine(configs) {
    return combineConfig(configs, {
      minDepth: 100,
      newGroupDelay: 500,
      joinToEvent: (_t, isAdjacent2) => isAdjacent2
    }, {
      minDepth: Math.max,
      newGroupDelay: Math.min,
      joinToEvent: (a, b) => (tr, adj) => a(tr, adj) || b(tr, adj)
    });
  }
});
const historyField_ = /* @__PURE__ */ StateField.define({
  create() {
    return HistoryState.empty;
  },
  update(state2, tr) {
    let config2 = tr.state.facet(historyConfig);
    let fromHist = tr.annotation(fromHistory);
    if (fromHist) {
      let item = HistEvent.fromTransaction(tr, fromHist.selection), from = fromHist.side;
      let other = from == 0 ? state2.undone : state2.done;
      if (item)
        other = updateBranch(other, other.length, config2.minDepth, item);
      else
        other = addSelection(other, tr.startState.selection);
      return new HistoryState(from == 0 ? fromHist.rest : other, from == 0 ? other : fromHist.rest);
    }
    let isolate = tr.annotation(isolateHistory);
    if (isolate == "full" || isolate == "before")
      state2 = state2.isolate();
    if (tr.annotation(Transaction.addToHistory) === false)
      return !tr.changes.empty ? state2.addMapping(tr.changes.desc) : state2;
    let event = HistEvent.fromTransaction(tr);
    let time = tr.annotation(Transaction.time), userEvent = tr.annotation(Transaction.userEvent);
    if (event)
      state2 = state2.addChanges(event, time, userEvent, config2, tr);
    else if (tr.selection)
      state2 = state2.addSelection(tr.startState.selection, time, userEvent, config2.newGroupDelay);
    if (isolate == "full" || isolate == "after")
      state2 = state2.isolate();
    return state2;
  },
  toJSON(value) {
    return { done: value.done.map((e) => e.toJSON()), undone: value.undone.map((e) => e.toJSON()) };
  },
  fromJSON(json2) {
    return new HistoryState(json2.done.map(HistEvent.fromJSON), json2.undone.map(HistEvent.fromJSON));
  }
});
function history(config2 = {}) {
  return [
    historyField_,
    historyConfig.of(config2),
    EditorView.domEventHandlers({
      beforeinput(e, view) {
        let command2 = e.inputType == "historyUndo" ? undo : e.inputType == "historyRedo" ? redo : null;
        if (!command2)
          return false;
        e.preventDefault();
        return command2(view);
      }
    })
  ];
}
function cmd(side, selection2) {
  return function({ state: state2, dispatch }) {
    if (!selection2 && state2.readOnly)
      return false;
    let historyState = state2.field(historyField_, false);
    if (!historyState)
      return false;
    let tr = historyState.pop(side, state2, selection2);
    if (!tr)
      return false;
    dispatch(tr);
    return true;
  };
}
const undo = /* @__PURE__ */ cmd(0, false);
const redo = /* @__PURE__ */ cmd(1, false);
const undoSelection = /* @__PURE__ */ cmd(0, true);
const redoSelection = /* @__PURE__ */ cmd(1, true);
class HistEvent {
  constructor(changes, effects, mapped, startSelection, selectionsAfter) {
    this.changes = changes;
    this.effects = effects;
    this.mapped = mapped;
    this.startSelection = startSelection;
    this.selectionsAfter = selectionsAfter;
  }
  setSelAfter(after) {
    return new HistEvent(this.changes, this.effects, this.mapped, this.startSelection, after);
  }
  toJSON() {
    var _a2, _b, _c;
    return {
      changes: (_a2 = this.changes) === null || _a2 === void 0 ? void 0 : _a2.toJSON(),
      mapped: (_b = this.mapped) === null || _b === void 0 ? void 0 : _b.toJSON(),
      startSelection: (_c = this.startSelection) === null || _c === void 0 ? void 0 : _c.toJSON(),
      selectionsAfter: this.selectionsAfter.map((s) => s.toJSON())
    };
  }
  static fromJSON(json2) {
    return new HistEvent(json2.changes && ChangeSet.fromJSON(json2.changes), [], json2.mapped && ChangeDesc.fromJSON(json2.mapped), json2.startSelection && EditorSelection.fromJSON(json2.startSelection), json2.selectionsAfter.map(EditorSelection.fromJSON));
  }
  // This does not check `addToHistory` and such, it assumes the
  // transaction needs to be converted to an item. Returns null when
  // there are no changes or effects in the transaction.
  static fromTransaction(tr, selection2) {
    let effects = none$1;
    for (let invert of tr.startState.facet(invertedEffects)) {
      let result = invert(tr);
      if (result.length)
        effects = effects.concat(result);
    }
    if (!effects.length && tr.changes.empty)
      return null;
    return new HistEvent(tr.changes.invert(tr.startState.doc), effects, void 0, selection2 || tr.startState.selection, none$1);
  }
  static selection(selections) {
    return new HistEvent(void 0, none$1, void 0, void 0, selections);
  }
}
function updateBranch(branch, to, maxLen, newEvent) {
  let start = to + 1 > maxLen + 20 ? to - maxLen - 1 : 0;
  let newBranch = branch.slice(start, to);
  newBranch.push(newEvent);
  return newBranch;
}
function isAdjacent(a, b) {
  let ranges = [], isAdjacent2 = false;
  a.iterChangedRanges((f, t2) => ranges.push(f, t2));
  b.iterChangedRanges((_f, _t, f, t2) => {
    for (let i2 = 0; i2 < ranges.length; ) {
      let from = ranges[i2++], to = ranges[i2++];
      if (t2 >= from && f <= to)
        isAdjacent2 = true;
    }
  });
  return isAdjacent2;
}
function eqSelectionShape(a, b) {
  return a.ranges.length == b.ranges.length && a.ranges.filter((r, i2) => r.empty != b.ranges[i2].empty).length === 0;
}
function conc(a, b) {
  return !a.length ? b : !b.length ? a : a.concat(b);
}
const none$1 = [];
const MaxSelectionsPerEvent = 200;
function addSelection(branch, selection2) {
  if (!branch.length) {
    return [HistEvent.selection([selection2])];
  } else {
    let lastEvent = branch[branch.length - 1];
    let sels = lastEvent.selectionsAfter.slice(Math.max(0, lastEvent.selectionsAfter.length - MaxSelectionsPerEvent));
    if (sels.length && sels[sels.length - 1].eq(selection2))
      return branch;
    sels.push(selection2);
    return updateBranch(branch, branch.length - 1, 1e9, lastEvent.setSelAfter(sels));
  }
}
function popSelection(branch) {
  let last2 = branch[branch.length - 1];
  let newBranch = branch.slice();
  newBranch[branch.length - 1] = last2.setSelAfter(last2.selectionsAfter.slice(0, last2.selectionsAfter.length - 1));
  return newBranch;
}
function addMappingToBranch(branch, mapping) {
  if (!branch.length)
    return branch;
  let length = branch.length, selections = none$1;
  while (length) {
    let event = mapEvent(branch[length - 1], mapping, selections);
    if (event.changes && !event.changes.empty || event.effects.length) {
      let result = branch.slice(0, length);
      result[length - 1] = event;
      return result;
    } else {
      mapping = event.mapped;
      length--;
      selections = event.selectionsAfter;
    }
  }
  return selections.length ? [HistEvent.selection(selections)] : none$1;
}
function mapEvent(event, mapping, extraSelections) {
  let selections = conc(event.selectionsAfter.length ? event.selectionsAfter.map((s) => s.map(mapping)) : none$1, extraSelections);
  if (!event.changes)
    return HistEvent.selection(selections);
  let mappedChanges = event.changes.map(mapping), before = mapping.mapDesc(event.changes, true);
  let fullMapping = event.mapped ? event.mapped.composeDesc(before) : before;
  return new HistEvent(mappedChanges, StateEffect.mapEffects(event.effects, mapping), fullMapping, event.startSelection.map(before), selections);
}
const joinableUserEvent = /^(input\.type|delete)($|\.)/;
class HistoryState {
  constructor(done, undone, prevTime = 0, prevUserEvent = void 0) {
    this.done = done;
    this.undone = undone;
    this.prevTime = prevTime;
    this.prevUserEvent = prevUserEvent;
  }
  isolate() {
    return this.prevTime ? new HistoryState(this.done, this.undone) : this;
  }
  addChanges(event, time, userEvent, config2, tr) {
    let done = this.done, lastEvent = done[done.length - 1];
    if (lastEvent && lastEvent.changes && !lastEvent.changes.empty && event.changes && (!userEvent || joinableUserEvent.test(userEvent)) && (!lastEvent.selectionsAfter.length && time - this.prevTime < config2.newGroupDelay && config2.joinToEvent(tr, isAdjacent(lastEvent.changes, event.changes)) || // For compose (but not compose.start) events, always join with previous event
    userEvent == "input.type.compose")) {
      done = updateBranch(done, done.length - 1, config2.minDepth, new HistEvent(event.changes.compose(lastEvent.changes), conc(StateEffect.mapEffects(event.effects, lastEvent.changes), lastEvent.effects), lastEvent.mapped, lastEvent.startSelection, none$1));
    } else {
      done = updateBranch(done, done.length, config2.minDepth, event);
    }
    return new HistoryState(done, none$1, time, userEvent);
  }
  addSelection(selection2, time, userEvent, newGroupDelay) {
    let last2 = this.done.length ? this.done[this.done.length - 1].selectionsAfter : none$1;
    if (last2.length > 0 && time - this.prevTime < newGroupDelay && userEvent == this.prevUserEvent && userEvent && /^select($|\.)/.test(userEvent) && eqSelectionShape(last2[last2.length - 1], selection2))
      return this;
    return new HistoryState(addSelection(this.done, selection2), this.undone, time, userEvent);
  }
  addMapping(mapping) {
    return new HistoryState(addMappingToBranch(this.done, mapping), addMappingToBranch(this.undone, mapping), this.prevTime, this.prevUserEvent);
  }
  pop(side, state2, onlySelection) {
    let branch = side == 0 ? this.done : this.undone;
    if (branch.length == 0)
      return null;
    let event = branch[branch.length - 1], selection2 = event.selectionsAfter[0] || (event.startSelection ? event.startSelection.map(event.changes.invertedDesc, 1) : state2.selection);
    if (onlySelection && event.selectionsAfter.length) {
      return state2.update({
        selection: event.selectionsAfter[event.selectionsAfter.length - 1],
        annotations: fromHistory.of({ side, rest: popSelection(branch), selection: selection2 }),
        userEvent: side == 0 ? "select.undo" : "select.redo",
        scrollIntoView: true
      });
    } else if (!event.changes) {
      return null;
    } else {
      let rest = branch.length == 1 ? none$1 : branch.slice(0, branch.length - 1);
      if (event.mapped)
        rest = addMappingToBranch(rest, event.mapped);
      return state2.update({
        changes: event.changes,
        selection: event.startSelection,
        effects: event.effects,
        annotations: fromHistory.of({ side, rest, selection: selection2 }),
        filter: false,
        userEvent: side == 0 ? "undo" : "redo",
        scrollIntoView: true
      });
    }
  }
}
HistoryState.empty = /* @__PURE__ */ new HistoryState(none$1, none$1);
const historyKeymap = [
  { key: "Mod-z", run: undo, preventDefault: true },
  { key: "Mod-y", mac: "Mod-Shift-z", run: redo, preventDefault: true },
  { linux: "Ctrl-Shift-z", run: redo, preventDefault: true },
  { key: "Mod-u", run: undoSelection, preventDefault: true },
  { key: "Alt-u", mac: "Mod-Shift-u", run: redoSelection, preventDefault: true }
];
function updateSel(sel, by) {
  return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
}
function setSel(state2, selection2) {
  return state2.update({ selection: selection2, scrollIntoView: true, userEvent: "select" });
}
function moveSel({ state: state2, dispatch }, how) {
  let selection2 = updateSel(state2.selection, how);
  if (selection2.eq(state2.selection, true))
    return false;
  dispatch(setSel(state2, selection2));
  return true;
}
function rangeEnd(range, forward) {
  return EditorSelection.cursor(forward ? range.to : range.from);
}
function cursorByChar(view, forward) {
  return moveSel(view, (range) => range.empty ? view.moveByChar(range, forward) : rangeEnd(range, forward));
}
function ltrAtCursor(view) {
  return view.textDirectionAt(view.state.selection.main.head) == Direction.LTR;
}
const cursorCharLeft = (view) => cursorByChar(view, !ltrAtCursor(view));
const cursorCharRight = (view) => cursorByChar(view, ltrAtCursor(view));
function cursorByGroup(view, forward) {
  return moveSel(view, (range) => range.empty ? view.moveByGroup(range, forward) : rangeEnd(range, forward));
}
const cursorGroupLeft = (view) => cursorByGroup(view, !ltrAtCursor(view));
const cursorGroupRight = (view) => cursorByGroup(view, ltrAtCursor(view));
function interestingNode(state2, node, bracketProp) {
  if (node.type.prop(bracketProp))
    return true;
  let len = node.to - node.from;
  return len && (len > 2 || /[^\s,.;:]/.test(state2.sliceDoc(node.from, node.to))) || node.firstChild;
}
function moveBySyntax(state2, start, forward) {
  let pos = syntaxTree(state2).resolveInner(start.head);
  let bracketProp = forward ? NodeProp.closedBy : NodeProp.openedBy;
  for (let at = start.head; ; ) {
    let next = forward ? pos.childAfter(at) : pos.childBefore(at);
    if (!next)
      break;
    if (interestingNode(state2, next, bracketProp))
      pos = next;
    else
      at = forward ? next.to : next.from;
  }
  let bracket2 = pos.type.prop(bracketProp), match, newPos;
  if (bracket2 && (match = forward ? matchBrackets(state2, pos.from, 1) : matchBrackets(state2, pos.to, -1)) && match.matched)
    newPos = forward ? match.end.to : match.end.from;
  else
    newPos = forward ? pos.to : pos.from;
  return EditorSelection.cursor(newPos, forward ? -1 : 1);
}
const cursorSyntaxLeft = (view) => moveSel(view, (range) => moveBySyntax(view.state, range, !ltrAtCursor(view)));
const cursorSyntaxRight = (view) => moveSel(view, (range) => moveBySyntax(view.state, range, ltrAtCursor(view)));
function cursorByLine(view, forward) {
  return moveSel(view, (range) => {
    if (!range.empty)
      return rangeEnd(range, forward);
    let moved = view.moveVertically(range, forward);
    return moved.head != range.head ? moved : view.moveToLineBoundary(range, forward);
  });
}
const cursorLineUp = (view) => cursorByLine(view, false);
const cursorLineDown = (view) => cursorByLine(view, true);
function pageInfo(view) {
  let selfScroll = view.scrollDOM.clientHeight < view.scrollDOM.scrollHeight - 2;
  let marginTop = 0, marginBottom = 0, height;
  if (selfScroll) {
    for (let source of view.state.facet(EditorView.scrollMargins)) {
      let margins = source(view);
      if (margins === null || margins === void 0 ? void 0 : margins.top)
        marginTop = Math.max(margins === null || margins === void 0 ? void 0 : margins.top, marginTop);
      if (margins === null || margins === void 0 ? void 0 : margins.bottom)
        marginBottom = Math.max(margins === null || margins === void 0 ? void 0 : margins.bottom, marginBottom);
    }
    height = view.scrollDOM.clientHeight - marginTop - marginBottom;
  } else {
    height = (view.dom.ownerDocument.defaultView || window).innerHeight;
  }
  return {
    marginTop,
    marginBottom,
    selfScroll,
    height: Math.max(view.defaultLineHeight, height - 5)
  };
}
function cursorByPage(view, forward) {
  let page = pageInfo(view);
  let { state: state2 } = view, selection2 = updateSel(state2.selection, (range) => {
    return range.empty ? view.moveVertically(range, forward, page.height) : rangeEnd(range, forward);
  });
  if (selection2.eq(state2.selection))
    return false;
  let effect;
  if (page.selfScroll) {
    let startPos = view.coordsAtPos(state2.selection.main.head);
    let scrollRect = view.scrollDOM.getBoundingClientRect();
    let scrollTop = scrollRect.top + page.marginTop, scrollBottom = scrollRect.bottom - page.marginBottom;
    if (startPos && startPos.top > scrollTop && startPos.bottom < scrollBottom)
      effect = EditorView.scrollIntoView(selection2.main.head, { y: "start", yMargin: startPos.top - scrollTop });
  }
  view.dispatch(setSel(state2, selection2), { effects: effect });
  return true;
}
const cursorPageUp = (view) => cursorByPage(view, false);
const cursorPageDown = (view) => cursorByPage(view, true);
function moveByLineBoundary(view, start, forward) {
  let line = view.lineBlockAt(start.head), moved = view.moveToLineBoundary(start, forward);
  if (moved.head == start.head && moved.head != (forward ? line.to : line.from))
    moved = view.moveToLineBoundary(start, forward, false);
  if (!forward && moved.head == line.from && line.length) {
    let space = /^\s*/.exec(view.state.sliceDoc(line.from, Math.min(line.from + 100, line.to)))[0].length;
    if (space && start.head != line.from + space)
      moved = EditorSelection.cursor(line.from + space);
  }
  return moved;
}
const cursorLineBoundaryForward = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, true));
const cursorLineBoundaryBackward = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, false));
const cursorLineBoundaryLeft = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, !ltrAtCursor(view)));
const cursorLineBoundaryRight = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, ltrAtCursor(view)));
const cursorLineStart = (view) => moveSel(view, (range) => view.moveToLineBoundary(range, false, false));
const cursorLineEnd = (view) => moveSel(view, (range) => view.moveToLineBoundary(range, true, false));
function toMatchingBracket(state2, dispatch, extend) {
  let found = false, selection2 = updateSel(state2.selection, (range) => {
    let matching = matchBrackets(state2, range.head, -1) || matchBrackets(state2, range.head, 1) || range.head > 0 && matchBrackets(state2, range.head - 1, 1) || range.head < state2.doc.length && matchBrackets(state2, range.head + 1, -1);
    if (!matching || !matching.end)
      return range;
    found = true;
    let head = matching.start.from == range.head ? matching.end.to : matching.end.from;
    return EditorSelection.cursor(head);
  });
  if (!found)
    return false;
  dispatch(setSel(state2, selection2));
  return true;
}
const cursorMatchingBracket = ({ state: state2, dispatch }) => toMatchingBracket(state2, dispatch);
function extendSel(target, forward, how) {
  let selection2 = updateSel(target.state.selection, (range) => {
    if (range.undirectional && range.head >= range.anchor != forward)
      range = EditorSelection.range(range.head, range.anchor);
    let head = how(range);
    return EditorSelection.range(range.anchor, head.head, head.goalColumn, head.bidiLevel || void 0, head.assoc);
  });
  if (selection2.eq(target.state.selection))
    return false;
  target.dispatch(setSel(target.state, selection2));
  return true;
}
function selectByChar(view, forward) {
  return extendSel(view, forward, (range) => view.moveByChar(range, forward));
}
const selectCharLeft = (view) => selectByChar(view, !ltrAtCursor(view));
const selectCharRight = (view) => selectByChar(view, ltrAtCursor(view));
function selectByGroup(view, forward) {
  return extendSel(view, forward, (range) => view.moveByGroup(range, forward));
}
const selectGroupLeft = (view) => selectByGroup(view, !ltrAtCursor(view));
const selectGroupRight = (view) => selectByGroup(view, ltrAtCursor(view));
const selectSyntaxLeft = (view) => {
  let forward = !ltrAtCursor(view);
  return extendSel(view, forward, (range) => moveBySyntax(view.state, range, forward));
};
const selectSyntaxRight = (view) => {
  let forward = ltrAtCursor(view);
  return extendSel(view, forward, (range) => moveBySyntax(view.state, range, forward));
};
function selectByLine(view, forward) {
  return extendSel(view, forward, (range) => view.moveVertically(range, forward));
}
const selectLineUp = (view) => selectByLine(view, false);
const selectLineDown = (view) => selectByLine(view, true);
function selectByPage(view, forward) {
  return extendSel(view, forward, (range) => view.moveVertically(range, forward, pageInfo(view).height));
}
const selectPageUp = (view) => selectByPage(view, false);
const selectPageDown = (view) => selectByPage(view, true);
const selectLineBoundaryForward = (view) => extendSel(view, true, (range) => moveByLineBoundary(view, range, true));
const selectLineBoundaryBackward = (view) => extendSel(view, false, (range) => moveByLineBoundary(view, range, false));
const selectLineBoundaryLeft = (view) => {
  let forward = !ltrAtCursor(view);
  return extendSel(view, forward, (range) => moveByLineBoundary(view, range, forward));
};
const selectLineBoundaryRight = (view) => {
  let forward = ltrAtCursor(view);
  return extendSel(view, forward, (range) => moveByLineBoundary(view, range, forward));
};
const selectLineStart = (view) => extendSel(view, false, (range) => EditorSelection.cursor(view.lineBlockAt(range.head).from));
const selectLineEnd = (view) => extendSel(view, true, (range) => EditorSelection.cursor(view.lineBlockAt(range.head).to));
const cursorDocStart = ({ state: state2, dispatch }) => {
  dispatch(setSel(state2, { anchor: 0 }));
  return true;
};
const cursorDocEnd = ({ state: state2, dispatch }) => {
  dispatch(setSel(state2, { anchor: state2.doc.length }));
  return true;
};
const selectDocStart = ({ state: state2, dispatch }) => {
  dispatch(setSel(state2, { anchor: state2.selection.main.anchor, head: 0 }));
  return true;
};
const selectDocEnd = ({ state: state2, dispatch }) => {
  dispatch(setSel(state2, { anchor: state2.selection.main.anchor, head: state2.doc.length }));
  return true;
};
const selectAll = ({ state: state2, dispatch }) => {
  dispatch(state2.update({ selection: { anchor: 0, head: state2.doc.length }, userEvent: "select" }));
  return true;
};
const selectLine = ({ state: state2, dispatch }) => {
  let ranges = selectedLineBlocks(state2).map(({ from, to }) => EditorSelection.undirectionalRange(from, Math.min(to + 1, state2.doc.length)));
  dispatch(state2.update({ selection: EditorSelection.create(ranges), userEvent: "select" }));
  return true;
};
const selectParentSyntax = ({ state: state2, dispatch }) => {
  let selection2 = updateSel(state2.selection, (range) => {
    let tree = syntaxTree(state2), stack = tree.resolveStack(range.from, 1);
    if (range.empty) {
      let stackBefore = tree.resolveStack(range.from, -1);
      if (stackBefore.node.from >= stack.node.from && stackBefore.node.to <= stack.node.to)
        stack = stackBefore;
    }
    for (let cur2 = stack; cur2; cur2 = cur2.next) {
      let { node } = cur2;
      if ((node.from < range.from && node.to >= range.to || node.to > range.to && node.from <= range.from) && cur2.next)
        return EditorSelection.undirectionalRange(node.from, node.to);
    }
    return range;
  });
  if (selection2.eq(state2.selection))
    return false;
  dispatch(setSel(state2, selection2));
  return true;
};
function addCursorVertically(view, forward) {
  let { state: state2 } = view, sel = state2.selection, ranges = state2.selection.ranges.slice();
  for (let range of state2.selection.ranges) {
    let line = state2.doc.lineAt(range.head);
    if (forward ? line.to < view.state.doc.length : line.from > 0)
      for (let cur2 = range; ; ) {
        let next = view.moveVertically(cur2, forward);
        if (next.head < line.from || next.head > line.to) {
          if (!ranges.some((r) => r.head == next.head))
            ranges.push(next);
          break;
        } else if (next.head == cur2.head) {
          break;
        } else {
          cur2 = next;
        }
      }
  }
  if (ranges.length == sel.ranges.length)
    return false;
  view.dispatch(setSel(state2, EditorSelection.create(ranges, ranges.length - 1)));
  return true;
}
const addCursorAbove = (view) => addCursorVertically(view, false);
const addCursorBelow = (view) => addCursorVertically(view, true);
const simplifySelection = ({ state: state2, dispatch }) => {
  let cur2 = state2.selection, selection2 = null;
  if (cur2.ranges.length > 1)
    selection2 = EditorSelection.create([cur2.main]);
  else if (!cur2.main.empty)
    selection2 = EditorSelection.create([EditorSelection.cursor(cur2.main.head)]);
  if (!selection2)
    return false;
  dispatch(setSel(state2, selection2));
  return true;
};
function deleteBy(target, by) {
  if (target.state.readOnly)
    return false;
  let event = "delete.selection", { state: state2 } = target;
  let changes = state2.changeByRange((range) => {
    let { from, to } = range;
    if (from == to) {
      let towards = by(range);
      if (towards < from) {
        event = "delete.backward";
        towards = skipAtomic(target, towards, false);
      } else if (towards > from) {
        event = "delete.forward";
        towards = skipAtomic(target, towards, true);
      }
      from = Math.min(from, towards);
      to = Math.max(to, towards);
    } else {
      from = skipAtomic(target, from, false);
      to = skipAtomic(target, to, true);
    }
    return from == to ? { range } : { changes: { from, to }, range: EditorSelection.cursor(from, from < range.head ? -1 : 1) };
  });
  if (changes.changes.empty)
    return false;
  target.dispatch(state2.update(changes, {
    scrollIntoView: true,
    userEvent: event,
    effects: event == "delete.selection" ? EditorView.announce.of(state2.phrase("Selection deleted")) : void 0
  }));
  return true;
}
function skipAtomic(target, pos, forward) {
  if (target instanceof EditorView)
    for (let ranges of target.state.facet(EditorView.atomicRanges).map((f) => f(target)))
      ranges.between(pos, pos, (from, to) => {
        if (from < pos && to > pos)
          pos = forward ? to : from;
      });
  return pos;
}
const deleteByChar = (target, forward, byIndentUnit) => deleteBy(target, (range) => {
  let pos = range.from, { state: state2 } = target, line = state2.doc.lineAt(pos), before, targetPos;
  if (byIndentUnit && !forward && pos > line.from && pos < line.from + 200 && !/[^ \t]/.test(before = line.text.slice(0, pos - line.from))) {
    if (before[before.length - 1] == "	")
      return pos - 1;
    let col = countColumn(before, state2.tabSize), drop = col % getIndentUnit(state2) || getIndentUnit(state2);
    for (let i2 = 0; i2 < drop && before[before.length - 1 - i2] == " "; i2++)
      pos--;
    targetPos = pos;
  } else {
    targetPos = findClusterBreak(line.text, pos - line.from, forward, forward) + line.from;
    if (targetPos == pos && line.number != (forward ? state2.doc.lines : 1))
      targetPos += forward ? 1 : -1;
    else if (!forward && /[\ufe00-\ufe0f]/.test(line.text.slice(targetPos - line.from, pos - line.from)))
      targetPos = findClusterBreak(line.text, targetPos - line.from, false, false) + line.from;
  }
  return targetPos;
});
const deleteCharBackward = (view) => deleteByChar(view, false, true);
const deleteCharForward = (view) => deleteByChar(view, true, false);
const deleteByGroup = (target, forward) => deleteBy(target, (range) => {
  let pos = range.head, { state: state2 } = target, line = state2.doc.lineAt(pos);
  let categorize = state2.charCategorizer(pos);
  for (let cat = null; ; ) {
    if (pos == (forward ? line.to : line.from)) {
      if (pos == range.head && line.number != (forward ? state2.doc.lines : 1))
        pos += forward ? 1 : -1;
      break;
    }
    let next = findClusterBreak(line.text, pos - line.from, forward) + line.from;
    let nextChar2 = line.text.slice(Math.min(pos, next) - line.from, Math.max(pos, next) - line.from);
    let nextCat = categorize(nextChar2);
    if (cat != null && nextCat != cat)
      break;
    if (nextChar2 != " " || pos != range.head)
      cat = nextCat;
    pos = next;
  }
  return pos;
});
const deleteGroupBackward = (target) => deleteByGroup(target, false);
const deleteGroupForward = (target) => deleteByGroup(target, true);
const deleteToLineEnd = (view) => deleteBy(view, (range) => {
  let lineEnd = view.lineBlockAt(range.head).to;
  return range.head < lineEnd ? lineEnd : Math.min(view.state.doc.length, range.head + 1);
});
const deleteLineBoundaryBackward = (view) => deleteBy(view, (range) => {
  let lineStart = view.moveToLineBoundary(range, false).head;
  return range.head > lineStart ? lineStart : Math.max(0, range.head - 1);
});
const deleteLineBoundaryForward = (view) => deleteBy(view, (range) => {
  let lineStart = view.moveToLineBoundary(range, true).head;
  return range.head < lineStart ? lineStart : Math.min(view.state.doc.length, range.head + 1);
});
const splitLine = ({ state: state2, dispatch }) => {
  if (state2.readOnly)
    return false;
  let changes = state2.changeByRange((range) => {
    return {
      changes: { from: range.from, to: range.to, insert: Text.of(["", ""]) },
      range: EditorSelection.cursor(range.from)
    };
  });
  dispatch(state2.update(changes, { scrollIntoView: true, userEvent: "input" }));
  return true;
};
const transposeChars = ({ state: state2, dispatch }) => {
  if (state2.readOnly)
    return false;
  let changes = state2.changeByRange((range) => {
    if (!range.empty || range.from == 0 || range.from == state2.doc.length)
      return { range };
    let pos = range.from, line = state2.doc.lineAt(pos);
    let from = pos == line.from ? pos - 1 : findClusterBreak(line.text, pos - line.from, false) + line.from;
    let to = pos == line.to ? pos + 1 : findClusterBreak(line.text, pos - line.from, true) + line.from;
    return {
      changes: { from, to, insert: state2.doc.slice(pos, to).append(state2.doc.slice(from, pos)) },
      range: EditorSelection.cursor(to)
    };
  });
  if (changes.changes.empty)
    return false;
  dispatch(state2.update(changes, { scrollIntoView: true, userEvent: "move.character" }));
  return true;
};
function selectedLineBlocks(state2) {
  let blocks = [], upto = -1;
  for (let range of state2.selection.ranges) {
    let startLine = state2.doc.lineAt(range.from), endLine = state2.doc.lineAt(range.to);
    if (!range.empty && range.to == endLine.from)
      endLine = state2.doc.lineAt(range.to - 1);
    if (upto >= startLine.number) {
      let prev = blocks[blocks.length - 1];
      prev.to = endLine.to;
      prev.ranges.push(range);
    } else {
      blocks.push({ from: startLine.from, to: endLine.to, ranges: [range] });
    }
    upto = endLine.number + 1;
  }
  return blocks;
}
function moveLine(state2, dispatch, forward) {
  if (state2.readOnly)
    return false;
  let changes = [], ranges = [];
  for (let block of selectedLineBlocks(state2)) {
    if (forward ? block.to == state2.doc.length : block.from == 0)
      continue;
    let nextLine = state2.doc.lineAt(forward ? block.to + 1 : block.from - 1);
    let size = nextLine.length + 1;
    if (forward) {
      changes.push({ from: block.to, to: nextLine.to }, { from: block.from, insert: nextLine.text + state2.lineBreak });
      for (let r of block.ranges)
        ranges.push(EditorSelection.range(Math.min(state2.doc.length, r.anchor + size), Math.min(state2.doc.length, r.head + size)));
    } else {
      changes.push({ from: nextLine.from, to: block.from }, { from: block.to, insert: state2.lineBreak + nextLine.text });
      for (let r of block.ranges)
        ranges.push(EditorSelection.range(r.anchor - size, r.head - size));
    }
  }
  if (!changes.length)
    return false;
  dispatch(state2.update({
    changes,
    scrollIntoView: true,
    selection: EditorSelection.create(ranges, state2.selection.mainIndex),
    userEvent: "move.line"
  }));
  return true;
}
const moveLineUp = ({ state: state2, dispatch }) => moveLine(state2, dispatch, false);
const moveLineDown = ({ state: state2, dispatch }) => moveLine(state2, dispatch, true);
function copyLine(state2, dispatch, forward) {
  if (state2.readOnly)
    return false;
  let changes = [];
  for (let block of selectedLineBlocks(state2)) {
    if (forward)
      changes.push({ from: block.from, insert: state2.doc.slice(block.from, block.to) + state2.lineBreak });
    else
      changes.push({ from: block.to, insert: state2.lineBreak + state2.doc.slice(block.from, block.to) });
  }
  let changeSet = state2.changes(changes);
  dispatch(state2.update({
    changes: changeSet,
    selection: state2.selection.map(changeSet, forward ? 1 : -1),
    scrollIntoView: true,
    userEvent: "input.copyline"
  }));
  return true;
}
const copyLineUp = ({ state: state2, dispatch }) => copyLine(state2, dispatch, false);
const copyLineDown = ({ state: state2, dispatch }) => copyLine(state2, dispatch, true);
const deleteLine = (view) => {
  if (view.state.readOnly)
    return false;
  let { state: state2 } = view, changes = state2.changes(selectedLineBlocks(state2).map(({ from, to }) => {
    if (from > 0)
      from--;
    else if (to < state2.doc.length)
      to++;
    return { from, to };
  }));
  let selection2 = updateSel(state2.selection, (range) => {
    let dist2 = void 0;
    if (view.lineWrapping) {
      let block = view.lineBlockAt(range.head), pos = view.coordsAtPos(range.head, range.assoc || 1);
      if (pos)
        dist2 = block.bottom + view.documentTop - pos.bottom + view.defaultLineHeight / 2;
    }
    return view.moveVertically(range, true, dist2);
  }).map(changes);
  view.dispatch({ changes, selection: selection2, scrollIntoView: true, userEvent: "delete.line" });
  return true;
};
function isBetweenBrackets(state2, pos) {
  if (/\(\)|\[\]|\{\}/.test(state2.sliceDoc(pos - 1, pos + 1)))
    return { from: pos, to: pos };
  let context = syntaxTree(state2).resolveInner(pos);
  let before = context.childBefore(pos), after = context.childAfter(pos), closedBy;
  if (before && after && before.to <= pos && after.from >= pos && (closedBy = before.type.prop(NodeProp.closedBy)) && closedBy.indexOf(after.name) > -1 && state2.doc.lineAt(before.to).from == state2.doc.lineAt(after.from).from && !/\S/.test(state2.sliceDoc(before.to, after.from)))
    return { from: before.to, to: after.from };
  return null;
}
const insertNewlineAndIndent = /* @__PURE__ */ newlineAndIndent(false);
const insertBlankLine = /* @__PURE__ */ newlineAndIndent(true);
function newlineAndIndent(atEof) {
  return ({ state: state2, dispatch }) => {
    if (state2.readOnly)
      return false;
    let changes = state2.changeByRange((range) => {
      let { from, to } = range, line = state2.doc.lineAt(from);
      let explode = !atEof && from == to && isBetweenBrackets(state2, from);
      if (atEof)
        from = to = (to <= line.to ? line : state2.doc.lineAt(to)).to;
      let cx = new IndentContext(state2, { simulateBreak: from, simulateDoubleBreak: !!explode });
      let indent = getIndentation(cx, from);
      if (indent == null)
        indent = countColumn(/^\s*/.exec(state2.doc.lineAt(from).text)[0], state2.tabSize);
      while (to < line.to && /\s/.test(line.text[to - line.from]))
        to++;
      if (explode)
        ({ from, to } = explode);
      else if (from > line.from && from < line.from + 100 && !/\S/.test(line.text.slice(0, from)))
        from = line.from;
      let insert2 = ["", indentString(state2, indent)];
      if (explode)
        insert2.push(indentString(state2, cx.lineIndent(line.from, -1)));
      return {
        changes: { from, to, insert: Text.of(insert2) },
        range: EditorSelection.cursor(from + 1 + insert2[1].length)
      };
    });
    dispatch(state2.update(changes, { scrollIntoView: true, userEvent: "input" }));
    return true;
  };
}
function changeBySelectedLine(state2, f) {
  let atLine = -1;
  return state2.changeByRange((range) => {
    let changes = [];
    for (let pos = range.from; pos <= range.to; ) {
      let line = state2.doc.lineAt(pos);
      if (line.number > atLine && (range.empty || range.to > line.from)) {
        f(line, changes, range);
        atLine = line.number;
      }
      pos = line.to + 1;
    }
    let changeSet = state2.changes(changes);
    return {
      changes,
      range: EditorSelection.range(changeSet.mapPos(range.anchor, 1), changeSet.mapPos(range.head, 1))
    };
  });
}
const indentSelection = ({ state: state2, dispatch }) => {
  if (state2.readOnly)
    return false;
  let updated = /* @__PURE__ */ Object.create(null);
  let context = new IndentContext(state2, { overrideIndentation: (start) => {
    let found = updated[start];
    return found == null ? -1 : found;
  } });
  let changes = changeBySelectedLine(state2, (line, changes2, range) => {
    let indent = getIndentation(context, line.from);
    if (indent == null)
      return;
    if (!/\S/.test(line.text))
      indent = 0;
    let cur2 = /^\s*/.exec(line.text)[0];
    let norm = indentString(state2, indent);
    if (cur2 != norm || range.from < line.from + cur2.length) {
      updated[line.from] = indent;
      changes2.push({ from: line.from, to: line.from + cur2.length, insert: norm });
    }
  });
  if (!changes.changes.empty)
    dispatch(state2.update(changes, { userEvent: "indent" }));
  return true;
};
const indentMore = ({ state: state2, dispatch }) => {
  if (state2.readOnly)
    return false;
  dispatch(state2.update(changeBySelectedLine(state2, (line, changes) => {
    changes.push({ from: line.from, insert: state2.facet(indentUnit) });
  }), { userEvent: "input.indent" }));
  return true;
};
const indentLess = ({ state: state2, dispatch }) => {
  if (state2.readOnly)
    return false;
  dispatch(state2.update(changeBySelectedLine(state2, (line, changes) => {
    let space = /^\s*/.exec(line.text)[0];
    if (!space)
      return;
    let col = countColumn(space, state2.tabSize), keep = 0;
    let insert2 = indentString(state2, Math.max(0, col - getIndentUnit(state2)));
    while (keep < space.length && keep < insert2.length && space.charCodeAt(keep) == insert2.charCodeAt(keep))
      keep++;
    changes.push({ from: line.from + keep, to: line.from + space.length, insert: insert2.slice(keep) });
  }), { userEvent: "delete.dedent" }));
  return true;
};
const toggleTabFocusMode = (view) => {
  view.setTabFocusMode();
  return true;
};
const emacsStyleKeymap = [
  { key: "Ctrl-b", run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
  { key: "Ctrl-f", run: cursorCharRight, shift: selectCharRight },
  { key: "Ctrl-p", run: cursorLineUp, shift: selectLineUp },
  { key: "Ctrl-n", run: cursorLineDown, shift: selectLineDown },
  { key: "Ctrl-a", run: cursorLineStart, shift: selectLineStart },
  { key: "Ctrl-e", run: cursorLineEnd, shift: selectLineEnd },
  { key: "Ctrl-d", run: deleteCharForward },
  { key: "Ctrl-h", run: deleteCharBackward },
  { key: "Ctrl-k", run: deleteToLineEnd },
  { key: "Ctrl-Alt-h", run: deleteGroupBackward },
  { key: "Ctrl-o", run: splitLine },
  { key: "Ctrl-t", run: transposeChars },
  { key: "Ctrl-v", run: cursorPageDown }
];
const standardKeymap = /* @__PURE__ */ [
  { key: "ArrowLeft", run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
  { key: "Mod-ArrowLeft", mac: "Alt-ArrowLeft", run: cursorGroupLeft, shift: selectGroupLeft, preventDefault: true },
  { mac: "Cmd-ArrowLeft", run: cursorLineBoundaryLeft, shift: selectLineBoundaryLeft, preventDefault: true },
  { key: "ArrowRight", run: cursorCharRight, shift: selectCharRight, preventDefault: true },
  { key: "Mod-ArrowRight", mac: "Alt-ArrowRight", run: cursorGroupRight, shift: selectGroupRight, preventDefault: true },
  { mac: "Cmd-ArrowRight", run: cursorLineBoundaryRight, shift: selectLineBoundaryRight, preventDefault: true },
  { key: "ArrowUp", run: cursorLineUp, shift: selectLineUp, preventDefault: true },
  { mac: "Cmd-ArrowUp", run: cursorDocStart, shift: selectDocStart },
  { mac: "Ctrl-ArrowUp", run: cursorPageUp, shift: selectPageUp },
  { key: "ArrowDown", run: cursorLineDown, shift: selectLineDown, preventDefault: true },
  { mac: "Cmd-ArrowDown", run: cursorDocEnd, shift: selectDocEnd },
  { mac: "Ctrl-ArrowDown", run: cursorPageDown, shift: selectPageDown },
  { key: "PageUp", run: cursorPageUp, shift: selectPageUp },
  { key: "PageDown", run: cursorPageDown, shift: selectPageDown },
  { key: "Home", run: cursorLineBoundaryBackward, shift: selectLineBoundaryBackward, preventDefault: true },
  { key: "Mod-Home", run: cursorDocStart, shift: selectDocStart },
  { key: "End", run: cursorLineBoundaryForward, shift: selectLineBoundaryForward, preventDefault: true },
  { key: "Mod-End", run: cursorDocEnd, shift: selectDocEnd },
  { key: "Enter", run: insertNewlineAndIndent, shift: insertNewlineAndIndent },
  { key: "Mod-a", run: selectAll },
  { key: "Backspace", run: deleteCharBackward, shift: deleteCharBackward, preventDefault: true },
  { key: "Delete", run: deleteCharForward, preventDefault: true },
  { key: "Mod-Backspace", mac: "Alt-Backspace", run: deleteGroupBackward, preventDefault: true },
  { key: "Mod-Delete", mac: "Alt-Delete", run: deleteGroupForward, preventDefault: true },
  { mac: "Mod-Backspace", run: deleteLineBoundaryBackward, preventDefault: true },
  { mac: "Mod-Delete", run: deleteLineBoundaryForward, preventDefault: true }
].concat(/* @__PURE__ */ emacsStyleKeymap.map((b) => ({ mac: b.key, run: b.run, shift: b.shift })));
const defaultKeymap = /* @__PURE__ */ [
  { key: "Alt-ArrowLeft", mac: "Ctrl-ArrowLeft", run: cursorSyntaxLeft, shift: selectSyntaxLeft },
  { key: "Alt-ArrowRight", mac: "Ctrl-ArrowRight", run: cursorSyntaxRight, shift: selectSyntaxRight },
  { key: "Alt-ArrowUp", run: moveLineUp },
  { key: "Shift-Alt-ArrowUp", run: copyLineUp },
  { key: "Alt-ArrowDown", run: moveLineDown },
  { key: "Shift-Alt-ArrowDown", run: copyLineDown },
  { key: "Mod-Alt-ArrowUp", run: addCursorAbove },
  { key: "Mod-Alt-ArrowDown", run: addCursorBelow },
  { key: "Escape", run: simplifySelection },
  { key: "Mod-Enter", run: insertBlankLine },
  { key: "Alt-l", mac: "Ctrl-l", run: selectLine },
  { key: "Mod-i", run: selectParentSyntax, preventDefault: true },
  { key: "Mod-[", run: indentLess },
  { key: "Mod-]", run: indentMore },
  { key: "Mod-Alt-\\", run: indentSelection },
  { key: "Shift-Mod-k", run: deleteLine },
  { key: "Shift-Mod-\\", run: cursorMatchingBracket },
  { key: "Mod-/", run: toggleComment },
  { key: "Alt-A", mac: "Ctrl-A", run: toggleBlockComment },
  { key: "Ctrl-m", mac: "Shift-Alt-m", run: toggleTabFocusMode }
].concat(standardKeymap);
const basicNormalize = typeof String.prototype.normalize == "function" ? (x) => x.normalize("NFKD") : (x) => x;
class SearchCursor {
  /**
  Create a text cursor. The query is the search string, `from` to
  `to` provides the region to search.
  
  When `normalize` is given, it will be called, on both the query
  string and the content it is matched against, before comparing.
  You can, for example, create a case-insensitive search by
  passing `s => s.toLowerCase()`.
  
  Text is always normalized with
  [`.normalize("NFKD")`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
  (when supported).
  */
  constructor(text, query, from = 0, to = text.length, normalize, test) {
    this.test = test;
    this.value = { from: 0, to: 0, precise: false };
    this.done = false;
    this.matches = [];
    this.buffer = "";
    this.bufferPos = 0;
    this.iter = text.iterRange(from, to);
    this.bufferStart = from;
    this.normalize = normalize ? (x) => normalize(basicNormalize(x)) : basicNormalize;
    this.query = this.normalize(query);
  }
  peek() {
    if (this.bufferPos == this.buffer.length) {
      this.bufferStart += this.buffer.length;
      this.iter.next();
      if (this.iter.done)
        return -1;
      this.bufferPos = 0;
      this.buffer = this.iter.value;
    }
    return codePointAt(this.buffer, this.bufferPos);
  }
  /**
  Look for the next match. Updates the iterator's
  [`value`](https://codemirror.net/6/docs/ref/#search.SearchCursor.value) and
  [`done`](https://codemirror.net/6/docs/ref/#search.SearchCursor.done) properties. Should be called
  at least once before using the cursor.
  */
  next() {
    while (this.matches.length)
      this.matches.pop();
    return this.nextOverlapping();
  }
  /**
  The `next` method will ignore matches that partially overlap a
  previous match. This method behaves like `next`, but includes
  such matches.
  */
  nextOverlapping() {
    for (; ; ) {
      let next = this.peek();
      if (next < 0) {
        this.done = true;
        return this;
      }
      let str = fromCodePoint(next), start = this.bufferStart + this.bufferPos;
      this.bufferPos += codePointSize(next);
      let norm = this.normalize(str);
      if (norm.length)
        for (let i2 = 0, pos = start, posPrecise = true; ; i2++) {
          let code2 = norm.charCodeAt(i2);
          let match = this.match(code2, pos, posPrecise, this.bufferPos + this.bufferStart, i2 == norm.length - 1);
          if (match) {
            this.value = match;
            return this;
          }
          if (i2 == norm.length - 1)
            break;
          if (posPrecise && i2 < str.length && str.charCodeAt(i2) == code2)
            pos++;
          else
            posPrecise = false;
        }
    }
  }
  match(code2, pos, posPrecise, end, endPrecise) {
    let match = null;
    for (let i2 = 0; i2 < this.matches.length; ) {
      let partial = this.matches[i2], keep = false;
      if (this.query.charCodeAt(partial.index) == code2) {
        if (partial.index == this.query.length - 1) {
          match = { from: partial.from, to: end, precise: endPrecise && partial.precise };
        } else {
          partial.index++;
          keep = true;
        }
      }
      if (keep)
        i2++;
      else
        this.matches.splice(i2, 1);
    }
    if (this.query.charCodeAt(0) == code2) {
      if (this.query.length == 1)
        match = { from: pos, to: end, precise: posPrecise && endPrecise };
      else
        this.matches.push({ from: pos, index: 1, precise: posPrecise });
    }
    if (match && this.test && !this.test(match.from, match.to, this.buffer, this.bufferStart))
      match = null;
    return match;
  }
}
if (typeof Symbol != "undefined")
  SearchCursor.prototype[Symbol.iterator] = function() {
    return this;
  };
const empty = { from: -1, to: -1, match: /* @__PURE__ */ /.*/.exec(""), precise: true };
const baseFlags = "gm" + (/x/.unicode == null ? "" : "u");
class RegExpCursor {
  /**
  Create a cursor that will search the given range in the given
  document. `query` should be the raw pattern (as you'd pass it to
  `new RegExp`).
  */
  constructor(text, query, options, from = 0, to = text.length) {
    this.text = text;
    this.to = to;
    this.curLine = "";
    this.done = false;
    this.value = empty;
    if (/\\[sWDnr]|\n|\r|\[\^/.test(query))
      return new MultilineRegExpCursor(text, query, options, from, to);
    this.re = new RegExp(query, baseFlags + ((options === null || options === void 0 ? void 0 : options.ignoreCase) ? "i" : ""));
    this.test = options === null || options === void 0 ? void 0 : options.test;
    this.iter = text.iter();
    let startLine = text.lineAt(from);
    this.curLineStart = startLine.from;
    this.matchPos = toCharEnd(text, from);
    this.getLine(this.curLineStart);
  }
  getLine(skip) {
    this.iter.next(skip);
    if (this.iter.lineBreak) {
      this.curLine = "";
    } else {
      this.curLine = this.iter.value;
      if (this.curLineStart + this.curLine.length > this.to)
        this.curLine = this.curLine.slice(0, this.to - this.curLineStart);
      this.iter.next();
    }
  }
  nextLine() {
    this.curLineStart = this.curLineStart + this.curLine.length + 1;
    if (this.curLineStart > this.to)
      this.curLine = "";
    else
      this.getLine(0);
  }
  /**
  Move to the next match, if there is one.
  */
  next() {
    for (let off = this.matchPos - this.curLineStart; ; ) {
      this.re.lastIndex = off;
      let match = this.matchPos <= this.to && this.re.exec(this.curLine);
      if (match) {
        let from = this.curLineStart + match.index, to = from + match[0].length;
        this.matchPos = toCharEnd(this.text, to + (from == to ? 1 : 0));
        if (from == this.curLineStart + this.curLine.length)
          this.nextLine();
        if ((from < to || from > this.value.to) && (!this.test || this.test(from, to, match))) {
          this.value = { from, to, precise: true, match };
          return this;
        }
        off = this.matchPos - this.curLineStart;
      } else if (this.curLineStart + this.curLine.length < this.to) {
        this.nextLine();
        off = 0;
      } else {
        this.done = true;
        return this;
      }
    }
  }
}
const flattened = /* @__PURE__ */ new WeakMap();
class FlattenedDoc {
  constructor(from, text) {
    this.from = from;
    this.text = text;
  }
  get to() {
    return this.from + this.text.length;
  }
  static get(doc2, from, to) {
    let cached = flattened.get(doc2);
    if (!cached || cached.from >= to || cached.to <= from) {
      let flat = new FlattenedDoc(from, doc2.sliceString(from, to));
      flattened.set(doc2, flat);
      return flat;
    }
    if (cached.from == from && cached.to == to)
      return cached;
    let { text, from: cachedFrom } = cached;
    if (cachedFrom > from) {
      text = doc2.sliceString(from, cachedFrom) + text;
      cachedFrom = from;
    }
    if (cached.to < to)
      text += doc2.sliceString(cached.to, to);
    flattened.set(doc2, new FlattenedDoc(cachedFrom, text));
    return new FlattenedDoc(from, text.slice(from - cachedFrom, to - cachedFrom));
  }
}
class MultilineRegExpCursor {
  constructor(text, query, options, from, to) {
    this.text = text;
    this.to = to;
    this.done = false;
    this.value = empty;
    this.matchPos = toCharEnd(text, from);
    this.re = new RegExp(query, baseFlags + ((options === null || options === void 0 ? void 0 : options.ignoreCase) ? "i" : ""));
    this.test = options === null || options === void 0 ? void 0 : options.test;
    this.flat = FlattenedDoc.get(text, from, this.chunkEnd(
      from + 5e3
      /* Chunk.Base */
    ));
  }
  chunkEnd(pos) {
    return pos >= this.to ? this.to : this.text.lineAt(pos).to;
  }
  next() {
    for (; ; ) {
      let off = this.re.lastIndex = this.matchPos - this.flat.from;
      let match = this.re.exec(this.flat.text);
      if (match && !match[0] && match.index == off) {
        this.re.lastIndex = off + 1;
        match = this.re.exec(this.flat.text);
      }
      if (match) {
        let from = this.flat.from + match.index, to = from + match[0].length;
        if ((this.flat.to >= this.to || match.index + match[0].length <= this.flat.text.length - 10) && (!this.test || this.test(from, to, match))) {
          this.value = { from, to, precise: true, match };
          this.matchPos = toCharEnd(this.text, to + (from == to ? 1 : 0));
          return this;
        }
      }
      if (this.flat.to == this.to) {
        this.done = true;
        return this;
      }
      this.flat = FlattenedDoc.get(this.text, this.flat.from, this.chunkEnd(this.flat.from + this.flat.text.length * 2));
    }
  }
}
if (typeof Symbol != "undefined") {
  RegExpCursor.prototype[Symbol.iterator] = MultilineRegExpCursor.prototype[Symbol.iterator] = function() {
    return this;
  };
}
function validRegExp(source) {
  try {
    new RegExp(source, baseFlags);
    return true;
  } catch (_a2) {
    return false;
  }
}
function toCharEnd(text, pos) {
  if (pos >= text.length)
    return pos;
  let line = text.lineAt(pos), next;
  while (pos < line.to && (next = line.text.charCodeAt(pos - line.from)) >= 56320 && next < 57344)
    pos++;
  return pos;
}
const gotoLine = (view) => {
  let open2 = getDialog(view, "cm-goto-line");
  if (open2) {
    let field = open2.dom.querySelector("input[type=text]");
    if (field)
      field.select();
    return true;
  }
  let { state: state2 } = view;
  let line = String(state2.doc.lineAt(view.state.selection.main.head).number);
  let { close, result } = showDialog(view, {
    class: "cm-goto-line",
    label: state2.phrase("Go to line"),
    input: { type: "text", name: "line", value: line },
    focus: true,
    submitLabel: state2.phrase("go")
  });
  result.then((form) => {
    let match = form && /^([+-])?(\d+)?(:\d+)?(%)?$/.exec(form.elements["line"].value);
    if (!match) {
      view.dispatch({ effects: close });
      return;
    }
    let startLine = state2.doc.lineAt(state2.selection.main.head);
    let [, sign, ln, cl, percent] = match;
    let col = cl ? +cl.slice(1) : 0;
    let line2 = ln ? +ln : startLine.number;
    if (ln && percent) {
      let pc = line2 / 100;
      if (sign)
        pc = pc * (sign == "-" ? -1 : 1) + startLine.number / state2.doc.lines;
      line2 = Math.round(state2.doc.lines * pc);
    } else if (ln && sign) {
      line2 = line2 * (sign == "-" ? -1 : 1) + startLine.number;
    }
    let docLine = state2.doc.line(Math.max(1, Math.min(state2.doc.lines, line2)));
    let selection2 = EditorSelection.cursor(docLine.from + Math.max(0, Math.min(col, docLine.length)));
    view.dispatch({
      effects: [close, EditorView.scrollIntoView(selection2.from, { y: "center" })],
      selection: selection2
    });
  });
  return true;
};
const defaultHighlightOptions = {
  highlightWordAroundCursor: false,
  minSelectionLength: 1,
  maxMatches: 100,
  wholeWords: false
};
const highlightConfig = /* @__PURE__ */ Facet.define({
  combine(options) {
    return combineConfig(options, defaultHighlightOptions, {
      highlightWordAroundCursor: (a, b) => a || b,
      minSelectionLength: Math.min,
      maxMatches: Math.min
    });
  }
});
function highlightSelectionMatches(options) {
  let ext = [defaultTheme, matchHighlighter];
  return ext;
}
const matchDeco = /* @__PURE__ */ Decoration.mark({ class: "cm-selectionMatch" });
const mainMatchDeco = /* @__PURE__ */ Decoration.mark({ class: "cm-selectionMatch cm-selectionMatch-main" });
function insideWordBoundaries(check, state2, from, to) {
  return (from == 0 || check(state2.sliceDoc(from - 1, from)) != CharCategory.Word) && (to == state2.doc.length || check(state2.sliceDoc(to, to + 1)) != CharCategory.Word);
}
function insideWord(check, state2, from, to) {
  return check(state2.sliceDoc(from, from + 1)) == CharCategory.Word && check(state2.sliceDoc(to - 1, to)) == CharCategory.Word;
}
const matchHighlighter = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.getDeco(view);
  }
  update(update) {
    if (update.selectionSet || update.docChanged || update.viewportChanged)
      this.decorations = this.getDeco(update.view);
  }
  getDeco(view) {
    let conf = view.state.facet(highlightConfig);
    let { state: state2 } = view, sel = state2.selection;
    if (sel.ranges.length > 1)
      return Decoration.none;
    let range = sel.main, query, check = null;
    if (range.empty) {
      if (!conf.highlightWordAroundCursor)
        return Decoration.none;
      let word = state2.wordAt(range.head);
      if (!word)
        return Decoration.none;
      check = state2.charCategorizer(range.head);
      query = state2.sliceDoc(word.from, word.to);
    } else {
      let len = range.to - range.from;
      if (len < conf.minSelectionLength || len > 200)
        return Decoration.none;
      if (conf.wholeWords) {
        query = state2.sliceDoc(range.from, range.to);
        check = state2.charCategorizer(range.head);
        if (!(insideWordBoundaries(check, state2, range.from, range.to) && insideWord(check, state2, range.from, range.to)))
          return Decoration.none;
      } else {
        query = state2.sliceDoc(range.from, range.to);
        if (!query)
          return Decoration.none;
      }
    }
    let deco = [];
    for (let part of view.visibleRanges) {
      let cursor2 = new SearchCursor(state2.doc, query, part.from, part.to);
      while (!cursor2.next().done) {
        let { from, to } = cursor2.value;
        if (!check || insideWordBoundaries(check, state2, from, to)) {
          if (range.empty && from <= range.from && to >= range.to)
            deco.push(mainMatchDeco.range(from, to));
          else if (from >= range.to || to <= range.from)
            deco.push(matchDeco.range(from, to));
          if (deco.length > conf.maxMatches)
            return Decoration.none;
        }
      }
    }
    return Decoration.set(deco);
  }
}, {
  decorations: (v) => v.decorations
});
const defaultTheme = /* @__PURE__ */ EditorView.baseTheme({
  ".cm-selectionMatch": { backgroundColor: "#99ff7780" },
  ".cm-searchMatch .cm-selectionMatch": { backgroundColor: "transparent" }
});
const selectWord = ({ state: state2, dispatch }) => {
  let { selection: selection2 } = state2;
  let newSel = EditorSelection.create(selection2.ranges.map((range) => state2.wordAt(range.head) || EditorSelection.cursor(range.head)), selection2.mainIndex);
  if (newSel.eq(selection2))
    return false;
  dispatch(state2.update({ selection: newSel }));
  return true;
};
function findNextOccurrence(state2, query) {
  let { main, ranges } = state2.selection;
  let word = state2.wordAt(main.head), fullWord = word && word.from == main.from && word.to == main.to;
  for (let cycled = false, cursor2 = new SearchCursor(state2.doc, query, ranges[ranges.length - 1].to); ; ) {
    cursor2.next();
    if (cursor2.done) {
      if (cycled)
        return null;
      cursor2 = new SearchCursor(state2.doc, query, 0, Math.max(0, ranges[ranges.length - 1].from - 1));
      cycled = true;
    } else {
      if (cycled && ranges.some((r) => r.from == cursor2.value.from))
        continue;
      if (fullWord) {
        let word2 = state2.wordAt(cursor2.value.from);
        if (!word2 || word2.from != cursor2.value.from || word2.to != cursor2.value.to)
          continue;
      }
      return cursor2.value;
    }
  }
}
const selectNextOccurrence = ({ state: state2, dispatch }) => {
  let { ranges } = state2.selection;
  if (ranges.some((sel) => sel.from === sel.to))
    return selectWord({ state: state2, dispatch });
  let searchedText = state2.sliceDoc(ranges[0].from, ranges[0].to);
  if (state2.selection.ranges.some((r) => state2.sliceDoc(r.from, r.to) != searchedText))
    return false;
  let range = findNextOccurrence(state2, searchedText);
  if (!range)
    return false;
  dispatch(state2.update({
    selection: state2.selection.addRange(EditorSelection.range(range.from, range.to), false),
    effects: EditorView.scrollIntoView(range.to)
  }));
  return true;
};
const searchConfigFacet = /* @__PURE__ */ Facet.define({
  combine(configs) {
    return combineConfig(configs, {
      top: false,
      caseSensitive: false,
      literal: false,
      regexp: false,
      wholeWord: false,
      createPanel: (view) => new SearchPanel(view),
      scrollToMatch: (range) => EditorView.scrollIntoView(range)
    });
  }
});
class SearchQuery {
  /**
  Create a query object.
  */
  constructor(config2) {
    this.search = config2.search;
    this.caseSensitive = !!config2.caseSensitive;
    this.literal = !!config2.literal;
    this.regexp = !!config2.regexp;
    this.replace = config2.replace || "";
    this.valid = !!this.search && (!this.regexp || validRegExp(this.search));
    this.unquoted = this.unquote(this.search);
    this.wholeWord = !!config2.wholeWord;
    this.test = config2.test;
  }
  /**
  @internal
  */
  unquote(text) {
    return this.literal ? text : text.replace(/\\([nrt\\])/g, (_, ch) => ch == "n" ? "\n" : ch == "r" ? "\r" : ch == "t" ? "	" : "\\");
  }
  /**
  Compare this query to another query.
  */
  eq(other) {
    return this.search == other.search && this.replace == other.replace && this.caseSensitive == other.caseSensitive && this.regexp == other.regexp && this.wholeWord == other.wholeWord && this.test == other.test;
  }
  /**
  @internal
  */
  create() {
    return this.regexp ? new RegExpQuery(this) : new StringQuery(this);
  }
  /**
  Get a search cursor for this query, searching through the given
  range in the given state.
  */
  getCursor(state2, from = 0, to) {
    let st = state2.doc ? state2 : EditorState.create({ doc: state2 });
    if (to == null)
      to = st.doc.length;
    return this.regexp ? regexpCursor(this, st, from, to) : stringCursor(this, st, from, to);
  }
}
class QueryType {
  constructor(spec) {
    this.spec = spec;
  }
}
function wrapStringTest(test, state2, inner) {
  return (from, to, buffer, bufferPos) => {
    if (inner && !inner(from, to, buffer, bufferPos))
      return false;
    let match = from >= bufferPos && to <= bufferPos + buffer.length ? buffer.slice(from - bufferPos, to - bufferPos) : state2.doc.sliceString(from, to);
    return test(match, state2, from, to);
  };
}
function stringCursor(spec, state2, from, to) {
  let test;
  if (spec.wholeWord)
    test = stringWordTest(state2.doc, state2.charCategorizer(state2.selection.main.head));
  if (spec.test)
    test = wrapStringTest(spec.test, state2, test);
  return new SearchCursor(state2.doc, spec.unquoted, from, to, spec.caseSensitive ? void 0 : (x) => x.toLowerCase(), test);
}
function stringWordTest(doc2, categorizer) {
  return (from, to, buf, bufPos) => {
    if (bufPos > from || bufPos + buf.length < to) {
      bufPos = Math.max(0, from - 2);
      buf = doc2.sliceString(bufPos, Math.min(doc2.length, to + 2));
    }
    return (categorizer(charBefore(buf, from - bufPos)) != CharCategory.Word || categorizer(charAfter(buf, from - bufPos)) != CharCategory.Word) && (categorizer(charAfter(buf, to - bufPos)) != CharCategory.Word || categorizer(charBefore(buf, to - bufPos)) != CharCategory.Word);
  };
}
class StringQuery extends QueryType {
  constructor(spec) {
    super(spec);
  }
  nextMatch(state2, curFrom, curTo) {
    let cursor2 = stringCursor(this.spec, state2, curTo, state2.doc.length).nextOverlapping();
    if (cursor2.done) {
      let end = Math.min(state2.doc.length, curFrom + this.spec.unquoted.length);
      cursor2 = stringCursor(this.spec, state2, 0, end).nextOverlapping();
    }
    return cursor2.done || cursor2.value.from == curFrom && cursor2.value.to == curTo ? null : cursor2.value;
  }
  // Searching in reverse is, rather than implementing an inverted search
  // cursor, done by scanning chunk after chunk forward.
  prevMatchInRange(state2, from, to) {
    for (let pos = to; ; ) {
      let start = Math.max(from, pos - 1e4 - this.spec.unquoted.length);
      let cursor2 = stringCursor(this.spec, state2, start, pos), range = null;
      while (!cursor2.nextOverlapping().done)
        range = cursor2.value;
      if (range)
        return range;
      if (start == from)
        return null;
      pos -= 1e4;
    }
  }
  prevMatch(state2, curFrom, curTo) {
    let found = this.prevMatchInRange(state2, 0, curFrom);
    if (!found)
      found = this.prevMatchInRange(state2, Math.max(0, curTo - this.spec.unquoted.length), state2.doc.length);
    return found && (found.from != curFrom || found.to != curTo) ? found : null;
  }
  getReplacement(_result) {
    return this.spec.unquote(this.spec.replace);
  }
  matchAll(state2, limit) {
    let cursor2 = stringCursor(this.spec, state2, 0, state2.doc.length), ranges = [];
    while (!cursor2.next().done) {
      if (ranges.length >= limit)
        return null;
      ranges.push(cursor2.value);
    }
    return ranges;
  }
  highlight(state2, from, to, add2) {
    let cursor2 = stringCursor(this.spec, state2, Math.max(0, from - this.spec.unquoted.length), Math.min(to + this.spec.unquoted.length, state2.doc.length));
    while (!cursor2.next().done)
      add2(cursor2.value.from, cursor2.value.to);
  }
}
function wrapRegexpTest(test, state2, inner) {
  return (from, to, match) => {
    return (!inner || inner(from, to, match)) && test(match[0], state2, from, to);
  };
}
function regexpCursor(spec, state2, from, to) {
  let test;
  if (spec.wholeWord)
    test = regexpWordTest(state2.charCategorizer(state2.selection.main.head));
  if (spec.test)
    test = wrapRegexpTest(spec.test, state2, test);
  return new RegExpCursor(state2.doc, spec.search, { ignoreCase: !spec.caseSensitive, test }, from, to);
}
function charBefore(str, index) {
  return str.slice(findClusterBreak(str, index, false), index);
}
function charAfter(str, index) {
  return str.slice(index, findClusterBreak(str, index));
}
function regexpWordTest(categorizer) {
  return (_from, _to, match) => !match[0].length || (categorizer(charBefore(match.input, match.index)) != CharCategory.Word || categorizer(charAfter(match.input, match.index)) != CharCategory.Word) && (categorizer(charAfter(match.input, match.index + match[0].length)) != CharCategory.Word || categorizer(charBefore(match.input, match.index + match[0].length)) != CharCategory.Word);
}
class RegExpQuery extends QueryType {
  nextMatch(state2, curFrom, curTo) {
    let cursor2 = regexpCursor(this.spec, state2, curTo, state2.doc.length).next();
    if (cursor2.done)
      cursor2 = regexpCursor(this.spec, state2, 0, curFrom).next();
    return cursor2.done ? null : cursor2.value;
  }
  prevMatchInRange(state2, from, to) {
    for (let size = 1; ; size++) {
      let start = Math.max(
        from,
        to - size * 1e4
        /* FindPrev.ChunkSize */
      );
      let cursor2 = regexpCursor(this.spec, state2, start, to), range = null;
      while (!cursor2.next().done)
        range = cursor2.value;
      if (range && (start == from || range.from > start + 10))
        return range;
      if (start == from)
        return null;
    }
  }
  prevMatch(state2, curFrom, curTo) {
    return this.prevMatchInRange(state2, 0, curFrom) || this.prevMatchInRange(state2, curTo, state2.doc.length);
  }
  getReplacement(result) {
    return this.spec.unquote(this.spec.replace).replace(/\$([$&]|\d+)/g, (m, i2) => {
      if (i2 == "&")
        return result.match[0];
      if (i2 == "$")
        return "$";
      for (let l = i2.length; l > 0; l--) {
        let n = +i2.slice(0, l);
        if (n > 0 && n < result.match.length)
          return result.match[n] + i2.slice(l);
      }
      return m;
    });
  }
  matchAll(state2, limit) {
    let cursor2 = regexpCursor(this.spec, state2, 0, state2.doc.length), ranges = [];
    while (!cursor2.next().done) {
      if (ranges.length >= limit)
        return null;
      ranges.push(cursor2.value);
    }
    return ranges;
  }
  highlight(state2, from, to, add2) {
    let cursor2 = regexpCursor(this.spec, state2, Math.max(
      0,
      from - 250
      /* RegExp.HighlightMargin */
    ), Math.min(to + 250, state2.doc.length));
    while (!cursor2.next().done)
      add2(cursor2.value.from, cursor2.value.to);
  }
}
const setSearchQuery = /* @__PURE__ */ StateEffect.define();
const togglePanel$1 = /* @__PURE__ */ StateEffect.define();
const searchState = /* @__PURE__ */ StateField.define({
  create(state2) {
    return new SearchState(defaultQuery(state2).create(), null);
  },
  update(value, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setSearchQuery))
        value = new SearchState(effect.value.create(), value.panel);
      else if (effect.is(togglePanel$1))
        value = new SearchState(value.query, effect.value ? createSearchPanel : null);
    }
    return value;
  },
  provide: (f) => showPanel.from(f, (val) => val.panel)
});
class SearchState {
  constructor(query, panel) {
    this.query = query;
    this.panel = panel;
  }
}
const matchMark = /* @__PURE__ */ Decoration.mark({ class: "cm-searchMatch" }), selectedMatchMark = /* @__PURE__ */ Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });
const searchHighlighter = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.decorations = this.highlight(view.state.field(searchState));
  }
  update(update) {
    let state2 = update.state.field(searchState);
    if (state2 != update.startState.field(searchState) || update.docChanged || update.selectionSet || update.viewportChanged)
      this.decorations = this.highlight(state2);
  }
  highlight({ query, panel }) {
    if (!panel || !query.spec.valid)
      return Decoration.none;
    let { view } = this;
    let builder = new RangeSetBuilder();
    for (let i2 = 0, ranges = view.visibleRanges, l = ranges.length; i2 < l; i2++) {
      let { from, to } = ranges[i2];
      while (i2 < l - 1 && to > ranges[i2 + 1].from - 2 * 250)
        to = ranges[++i2].to;
      query.highlight(view.state, from, to, (from2, to2) => {
        let selected = view.state.selection.ranges.some((r) => r.from == from2 && r.to == to2);
        builder.add(from2, to2, selected ? selectedMatchMark : matchMark);
      });
    }
    return builder.finish();
  }
}, {
  decorations: (v) => v.decorations
});
function searchCommand(f) {
  return (view) => {
    let state2 = view.state.field(searchState, false);
    return state2 && state2.query.spec.valid ? f(view, state2) : openSearchPanel(view);
  };
}
const findNext = /* @__PURE__ */ searchCommand((view, { query }) => {
  let { to } = view.state.selection.main;
  let next = query.nextMatch(view.state, to, to);
  if (!next)
    return false;
  let selection2 = EditorSelection.single(next.from, next.to);
  let config2 = view.state.facet(searchConfigFacet);
  view.dispatch({
    selection: selection2,
    effects: [announceMatch(view, next), config2.scrollToMatch(selection2.main, view)],
    userEvent: "select.search"
  });
  selectSearchInput(view);
  return true;
});
const findPrevious = /* @__PURE__ */ searchCommand((view, { query }) => {
  let { state: state2 } = view, { from } = state2.selection.main;
  let prev = query.prevMatch(state2, from, from);
  if (!prev)
    return false;
  let selection2 = EditorSelection.single(prev.from, prev.to);
  let config2 = view.state.facet(searchConfigFacet);
  view.dispatch({
    selection: selection2,
    effects: [announceMatch(view, prev), config2.scrollToMatch(selection2.main, view)],
    userEvent: "select.search"
  });
  selectSearchInput(view);
  return true;
});
const selectMatches = /* @__PURE__ */ searchCommand((view, { query }) => {
  let ranges = query.matchAll(view.state, 1e3);
  if (!ranges || !ranges.length)
    return false;
  view.dispatch({
    selection: EditorSelection.create(ranges.map((r) => EditorSelection.range(r.from, r.to))),
    userEvent: "select.search.matches"
  });
  return true;
});
const selectSelectionMatches = ({ state: state2, dispatch }) => {
  let sel = state2.selection;
  if (sel.ranges.length > 1 || sel.main.empty)
    return false;
  let { from, to } = sel.main;
  let ranges = [], main = 0;
  for (let cur2 = new SearchCursor(state2.doc, state2.sliceDoc(from, to)); !cur2.next().done; ) {
    if (ranges.length > 1e3)
      return false;
    if (cur2.value.from == from)
      main = ranges.length;
    ranges.push(EditorSelection.range(cur2.value.from, cur2.value.to));
  }
  dispatch(state2.update({
    selection: EditorSelection.create(ranges, main),
    userEvent: "select.search.matches"
  }));
  return true;
};
const replaceNext = /* @__PURE__ */ searchCommand((view, { query }) => {
  let { state: state2 } = view, { from, to } = state2.selection.main;
  if (state2.readOnly)
    return false;
  let match = query.nextMatch(state2, from, from);
  if (!match)
    return false;
  let next = match;
  let changes = [], selection2, replacement;
  let effects = [];
  if (!next.precise) {
    next = query.nextMatch(state2, next.from, next.to);
  } else if (next.from == from && next.to == to) {
    replacement = state2.toText(query.getReplacement(next));
    changes.push({ from: next.from, to: next.to, insert: replacement });
    next = query.nextMatch(state2, next.from, next.to);
    effects.push(EditorView.announce.of(state2.phrase("replaced match on line $", state2.doc.lineAt(from).number) + "."));
  }
  let changeSet = view.state.changes(changes);
  if (next) {
    selection2 = EditorSelection.single(next.from, next.to).map(changeSet);
    effects.push(announceMatch(view, next));
    effects.push(state2.facet(searchConfigFacet).scrollToMatch(selection2.main, view));
  }
  view.dispatch({
    changes: changeSet,
    selection: selection2,
    effects,
    userEvent: "input.replace"
  });
  return true;
});
const replaceAll = /* @__PURE__ */ searchCommand((view, { query }) => {
  if (view.state.readOnly)
    return false;
  let changes = [];
  for (let match of query.matchAll(view.state, 1e9)) {
    let { from, to, precise } = match;
    if (precise)
      changes.push({ from, to, insert: query.getReplacement(match) });
  }
  if (!changes.length)
    return false;
  let announceText = view.state.phrase("replaced $ matches", changes.length) + ".";
  view.dispatch({
    changes,
    effects: EditorView.announce.of(announceText),
    userEvent: "input.replace.all"
  });
  return true;
});
function createSearchPanel(view) {
  return view.state.facet(searchConfigFacet).createPanel(view);
}
function defaultQuery(state2, fallback) {
  var _a2, _b, _c, _d, _e;
  let sel = state2.selection.main;
  let selText = sel.empty || sel.to > sel.from + 100 ? "" : state2.sliceDoc(sel.from, sel.to);
  if (fallback && !selText)
    return fallback;
  let config2 = state2.facet(searchConfigFacet);
  return new SearchQuery({
    search: ((_a2 = fallback === null || fallback === void 0 ? void 0 : fallback.literal) !== null && _a2 !== void 0 ? _a2 : config2.literal) ? selText : selText.replace(/\n/g, "\\n"),
    caseSensitive: (_b = fallback === null || fallback === void 0 ? void 0 : fallback.caseSensitive) !== null && _b !== void 0 ? _b : config2.caseSensitive,
    literal: (_c = fallback === null || fallback === void 0 ? void 0 : fallback.literal) !== null && _c !== void 0 ? _c : config2.literal,
    regexp: (_d = fallback === null || fallback === void 0 ? void 0 : fallback.regexp) !== null && _d !== void 0 ? _d : config2.regexp,
    wholeWord: (_e = fallback === null || fallback === void 0 ? void 0 : fallback.wholeWord) !== null && _e !== void 0 ? _e : config2.wholeWord
  });
}
function getSearchInput(view) {
  let panel = getPanel(view, createSearchPanel);
  return panel && panel.dom.querySelector("[main-field]");
}
function selectSearchInput(view) {
  let input = getSearchInput(view);
  if (input && input == view.root.activeElement)
    input.select();
}
const openSearchPanel = (view) => {
  let state2 = view.state.field(searchState, false);
  if (state2 && state2.panel) {
    let searchInput = getSearchInput(view);
    if (searchInput && searchInput != view.root.activeElement) {
      let query = defaultQuery(view.state, state2.query.spec);
      if (query.valid)
        view.dispatch({ effects: setSearchQuery.of(query) });
      searchInput.focus();
      searchInput.select();
    }
  } else {
    view.dispatch({ effects: [
      togglePanel$1.of(true),
      state2 ? setSearchQuery.of(defaultQuery(view.state, state2.query.spec)) : StateEffect.appendConfig.of(searchExtensions)
    ] });
  }
  return true;
};
const closeSearchPanel = (view) => {
  let state2 = view.state.field(searchState, false);
  if (!state2 || !state2.panel)
    return false;
  let panel = getPanel(view, createSearchPanel);
  if (panel && panel.dom.contains(view.root.activeElement))
    view.focus();
  view.dispatch({ effects: togglePanel$1.of(false) });
  return true;
};
const searchKeymap = [
  { key: "Mod-f", run: openSearchPanel, scope: "editor search-panel" },
  { key: "F3", run: findNext, shift: findPrevious, scope: "editor search-panel", preventDefault: true },
  { key: "Mod-g", run: findNext, shift: findPrevious, scope: "editor search-panel", preventDefault: true },
  { key: "Escape", run: closeSearchPanel, scope: "editor search-panel" },
  { key: "Mod-Shift-l", run: selectSelectionMatches },
  { key: "Mod-Alt-g", run: gotoLine },
  { key: "Mod-d", run: selectNextOccurrence, preventDefault: true }
];
class SearchPanel {
  constructor(view) {
    this.view = view;
    let query = this.query = view.state.field(searchState).query.spec;
    this.commit = this.commit.bind(this);
    this.searchField = crelt("input", {
      value: query.search,
      placeholder: phrase(view, "Find"),
      "aria-label": phrase(view, "Find"),
      class: "cm-textfield",
      name: "search",
      form: "",
      "main-field": "true",
      onchange: this.commit,
      onkeyup: this.commit
    });
    this.replaceField = crelt("input", {
      value: query.replace,
      placeholder: phrase(view, "Replace"),
      "aria-label": phrase(view, "Replace"),
      class: "cm-textfield",
      name: "replace",
      form: "",
      onchange: this.commit,
      onkeyup: this.commit
    });
    this.caseField = crelt("input", {
      type: "checkbox",
      name: "case",
      form: "",
      checked: query.caseSensitive,
      onchange: this.commit
    });
    this.reField = crelt("input", {
      type: "checkbox",
      name: "re",
      form: "",
      checked: query.regexp,
      onchange: this.commit
    });
    this.wordField = crelt("input", {
      type: "checkbox",
      name: "word",
      form: "",
      checked: query.wholeWord,
      onchange: this.commit
    });
    function button(name2, onclick, content2) {
      return crelt("button", { class: "cm-button", name: name2, onclick, type: "button" }, content2);
    }
    this.dom = crelt("div", { onkeydown: (e) => this.keydown(e), class: "cm-search" }, [
      this.searchField,
      button("next", () => findNext(view), [phrase(view, "next")]),
      button("prev", () => findPrevious(view), [phrase(view, "previous")]),
      button("select", () => selectMatches(view), [phrase(view, "all")]),
      crelt("label", null, [this.caseField, phrase(view, "match case")]),
      crelt("label", null, [this.reField, phrase(view, "regexp")]),
      crelt("label", null, [this.wordField, phrase(view, "by word")]),
      ...view.state.readOnly ? [] : [
        crelt("br"),
        this.replaceField,
        button("replace", () => replaceNext(view), [phrase(view, "replace")]),
        button("replaceAll", () => replaceAll(view), [phrase(view, "replace all")])
      ],
      crelt("button", {
        name: "close",
        onclick: () => closeSearchPanel(view),
        "aria-label": phrase(view, "close"),
        type: "button"
      }, ["×"])
    ]);
  }
  commit() {
    let query = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: this.caseField.checked,
      regexp: this.reField.checked,
      wholeWord: this.wordField.checked,
      replace: this.replaceField.value
    });
    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
    }
  }
  keydown(e) {
    if (runScopeHandlers(this.view, e, "search-panel")) {
      e.preventDefault();
    } else if (e.keyCode == 13 && e.target == this.searchField) {
      e.preventDefault();
      (e.shiftKey ? findPrevious : findNext)(this.view);
    } else if (e.keyCode == 13 && e.target == this.replaceField) {
      e.preventDefault();
      replaceNext(this.view);
    }
  }
  update(update) {
    for (let tr of update.transactions)
      for (let effect of tr.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query))
          this.setQuery(effect.value);
      }
  }
  setQuery(query) {
    this.query = query;
    this.searchField.value = query.search;
    this.replaceField.value = query.replace;
    this.caseField.checked = query.caseSensitive;
    this.reField.checked = query.regexp;
    this.wordField.checked = query.wholeWord;
  }
  mount() {
    this.searchField.select();
  }
  get pos() {
    return 80;
  }
  get top() {
    return this.view.state.facet(searchConfigFacet).top;
  }
}
function phrase(view, phrase2) {
  return view.state.phrase(phrase2);
}
const AnnounceMargin = 30;
const Break = /[\s\.,:;?!]/;
function announceMatch(view, { from, to }) {
  let line = view.state.doc.lineAt(from), lineEnd = view.state.doc.lineAt(to).to;
  let start = Math.max(line.from, from - AnnounceMargin), end = Math.min(lineEnd, to + AnnounceMargin);
  let text = view.state.sliceDoc(start, end);
  if (start != line.from) {
    for (let i2 = 0; i2 < AnnounceMargin; i2++)
      if (!Break.test(text[i2 + 1]) && Break.test(text[i2])) {
        text = text.slice(i2);
        break;
      }
  }
  if (end != lineEnd) {
    for (let i2 = text.length - 1; i2 > text.length - AnnounceMargin; i2--)
      if (!Break.test(text[i2 - 1]) && Break.test(text[i2])) {
        text = text.slice(0, i2);
        break;
      }
  }
  return EditorView.announce.of(`${view.state.phrase("current match")}. ${text} ${view.state.phrase("on line")} ${line.number}.`);
}
const baseTheme$2 = /* @__PURE__ */ EditorView.baseTheme({
  ".cm-panel.cm-search": {
    padding: "2px 6px 4px",
    position: "relative",
    "& [name=close]": {
      position: "absolute",
      top: "0",
      right: "4px",
      backgroundColor: "inherit",
      border: "none",
      font: "inherit",
      padding: 0,
      margin: 0
    },
    "& input, & button, & label": {
      margin: ".2em .6em .2em 0"
    },
    "& input[type=checkbox]": {
      marginRight: ".2em"
    },
    "& label": {
      fontSize: "80%",
      whiteSpace: "pre"
    }
  },
  "&light .cm-searchMatch": { backgroundColor: "#ffff0054" },
  "&dark .cm-searchMatch": { backgroundColor: "#00ffff8a" },
  "&light .cm-searchMatch-selected": { backgroundColor: "#ff6a0054" },
  "&dark .cm-searchMatch-selected": { backgroundColor: "#ff00ff8a" }
});
const searchExtensions = [
  searchState,
  /* @__PURE__ */ Prec.low(searchHighlighter),
  baseTheme$2
];
class CompletionContext {
  /**
  Create a new completion context. (Mostly useful for testing
  completion sources—in the editor, the extension will create
  these for you.)
  */
  constructor(state2, pos, explicit, view) {
    this.state = state2;
    this.pos = pos;
    this.explicit = explicit;
    this.view = view;
    this.abortListeners = [];
    this.abortOnDocChange = false;
  }
  /**
  Get the extent, content, and (if there is a token) type of the
  token before `this.pos`.
  */
  tokenBefore(types2) {
    let token = syntaxTree(this.state).resolveInner(this.pos, -1);
    while (token && types2.indexOf(token.name) < 0)
      token = token.parent;
    return token ? {
      from: token.from,
      to: this.pos,
      text: this.state.sliceDoc(token.from, this.pos),
      type: token.type
    } : null;
  }
  /**
  Get the match of the given expression directly before the
  cursor.
  */
  matchBefore(expr) {
    let line = this.state.doc.lineAt(this.pos);
    let start = Math.max(line.from, this.pos - 250);
    let str = line.text.slice(start - line.from, this.pos - line.from);
    let found = str.search(ensureAnchor(expr, false));
    return found < 0 ? null : { from: start + found, to: this.pos, text: str.slice(found) };
  }
  /**
  Yields true when the query has been aborted. Can be useful in
  asynchronous queries to avoid doing work that will be ignored.
  */
  get aborted() {
    return this.abortListeners == null;
  }
  /**
  Allows you to register abort handlers, which will be called when
  the query is
  [aborted](https://codemirror.net/6/docs/ref/#autocomplete.CompletionContext.aborted).
  
  By default, running queries will not be aborted for regular
  typing or backspacing, on the assumption that they are likely to
  return a result with a
  [`validFor`](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult.validFor) field that
  allows the result to be used after all. Passing `onDocChange:
  true` will cause this query to be aborted for any document
  change.
  */
  addEventListener(type, listener, options) {
    if (type == "abort" && this.abortListeners) {
      this.abortListeners.push(listener);
      if (options && options.onDocChange)
        this.abortOnDocChange = true;
    }
  }
}
function toSet(chars) {
  let flat = Object.keys(chars).join("");
  let words = /\w/.test(flat);
  if (words)
    flat = flat.replace(/\w/g, "");
  return `[${words ? "\\w" : ""}${flat.replace(/[^\w\s]/g, "\\$&")}]`;
}
function prefixMatch(options) {
  let first = /* @__PURE__ */ Object.create(null), rest = /* @__PURE__ */ Object.create(null);
  for (let { label } of options) {
    first[label[0]] = true;
    for (let i2 = 1; i2 < label.length; i2++)
      rest[label[i2]] = true;
  }
  let source = toSet(first) + toSet(rest) + "*$";
  return [new RegExp("^" + source), new RegExp(source)];
}
function completeFromList(list) {
  let options = list.map((o) => typeof o == "string" ? { label: o } : o);
  let [validFor, match] = options.every((o) => /^\w+$/.test(o.label)) ? [/\w*$/, /\w+$/] : prefixMatch(options);
  return (context) => {
    let token = context.matchBefore(match);
    return token || context.explicit ? { from: token ? token.from : context.pos, options, validFor } : null;
  };
}
class Option {
  constructor(completion, source, match, score2) {
    this.completion = completion;
    this.source = source;
    this.match = match;
    this.score = score2;
  }
}
function cur(state2) {
  return state2.selection.main.from;
}
function ensureAnchor(expr, start) {
  var _a2;
  let { source } = expr;
  let addStart = start && source[0] != "^", addEnd = source[source.length - 1] != "$";
  if (!addStart && !addEnd)
    return expr;
  return new RegExp(`${addStart ? "^" : ""}(?:${source})${addEnd ? "$" : ""}`, (_a2 = expr.flags) !== null && _a2 !== void 0 ? _a2 : expr.ignoreCase ? "i" : "");
}
const pickedCompletion = /* @__PURE__ */ Annotation.define();
function insertCompletionText(state2, text, from, to) {
  let { main } = state2.selection, fromOff = from - main.from, toOff = to - main.from;
  return {
    ...state2.changeByRange((range) => {
      if (range != main && from != to && state2.sliceDoc(range.from + fromOff, range.from + toOff) != state2.sliceDoc(from, to))
        return { range };
      let lines = state2.toText(text);
      return {
        changes: { from: range.from + fromOff, to: to == main.from ? range.to : range.from + toOff, insert: lines },
        range: EditorSelection.cursor(range.from + fromOff + lines.length)
      };
    }),
    scrollIntoView: true,
    userEvent: "input.complete"
  };
}
const SourceCache = /* @__PURE__ */ new WeakMap();
function asSource(source) {
  if (!Array.isArray(source))
    return source;
  let known = SourceCache.get(source);
  if (!known)
    SourceCache.set(source, known = completeFromList(source));
  return known;
}
const startCompletionEffect = /* @__PURE__ */ StateEffect.define();
const closeCompletionEffect = /* @__PURE__ */ StateEffect.define();
class FuzzyMatcher {
  constructor(pattern) {
    this.pattern = pattern;
    this.chars = [];
    this.folded = [];
    this.any = [];
    this.precise = [];
    this.byWord = [];
    this.score = 0;
    this.matched = [];
    for (let p = 0; p < pattern.length; ) {
      let char = codePointAt(pattern, p), size = codePointSize(char);
      this.chars.push(char);
      let part = pattern.slice(p, p + size), upper = part.toUpperCase();
      this.folded.push(codePointAt(upper == part ? part.toLowerCase() : upper, 0));
      p += size;
    }
    this.astral = pattern.length != this.chars.length;
  }
  ret(score2, matched) {
    this.score = score2;
    this.matched = matched;
    return this;
  }
  // Matches a given word (completion) against the pattern (input).
  // Will return a boolean indicating whether there was a match and,
  // on success, set `this.score` to the score, `this.matched` to an
  // array of `from, to` pairs indicating the matched parts of `word`.
  //
  // The score is a number that is more negative the worse the match
  // is. See `Penalty` above.
  match(word) {
    if (this.pattern.length == 0)
      return this.ret(-100, []);
    if (word.length < this.pattern.length)
      return null;
    let { chars, folded, any, precise, byWord } = this;
    if (chars.length == 1) {
      let first = codePointAt(word, 0), firstSize = codePointSize(first);
      let score2 = firstSize == word.length ? 0 : -100;
      if (first == chars[0]) ;
      else if (first == folded[0])
        score2 += -200;
      else
        return null;
      return this.ret(score2, [0, firstSize]);
    }
    let direct = word.indexOf(this.pattern);
    if (direct == 0)
      return this.ret(word.length == this.pattern.length ? 0 : -100, [0, this.pattern.length]);
    let len = chars.length, anyTo = 0;
    if (direct < 0) {
      for (let i2 = 0, e = Math.min(word.length, 200); i2 < e && anyTo < len; ) {
        let next = codePointAt(word, i2);
        if (next == chars[anyTo] || next == folded[anyTo])
          any[anyTo++] = i2;
        i2 += codePointSize(next);
      }
      if (anyTo < len)
        return null;
    }
    let preciseTo = 0;
    let byWordTo = 0, byWordFolded = false;
    let adjacentTo = 0, adjacentStart = -1, adjacentEnd = -1;
    let hasLower = /[a-z]/.test(word), wordAdjacent = true;
    for (let i2 = 0, e = Math.min(word.length, 200), prevType = 0; i2 < e && byWordTo < len; ) {
      let next = codePointAt(word, i2);
      if (direct < 0) {
        if (preciseTo < len && next == chars[preciseTo])
          precise[preciseTo++] = i2;
        if (adjacentTo < len) {
          if (next == chars[adjacentTo] || next == folded[adjacentTo]) {
            if (adjacentTo == 0)
              adjacentStart = i2;
            adjacentEnd = i2 + 1;
            adjacentTo++;
          } else {
            adjacentTo = 0;
          }
        }
      }
      let ch, type = next < 255 ? next >= 48 && next <= 57 || next >= 97 && next <= 122 ? 2 : next >= 65 && next <= 90 ? 1 : 0 : (ch = fromCodePoint(next)) != ch.toLowerCase() ? 1 : ch != ch.toUpperCase() ? 2 : 0;
      if (!i2 || type == 1 && hasLower || prevType == 0 && type != 0) {
        if (chars[byWordTo] == next || folded[byWordTo] == next && (byWordFolded = true))
          byWord[byWordTo++] = i2;
        else if (byWord.length)
          wordAdjacent = false;
      }
      prevType = type;
      i2 += codePointSize(next);
    }
    if (byWordTo == len && byWord[0] == 0 && wordAdjacent)
      return this.result(-100 + (byWordFolded ? -200 : 0), byWord, word);
    if (adjacentTo == len && adjacentStart == 0)
      return this.ret(-200 - word.length + (adjacentEnd == word.length ? 0 : -100), [0, adjacentEnd]);
    if (direct > -1)
      return this.ret(-700 - word.length, [direct, direct + this.pattern.length]);
    if (adjacentTo == len)
      return this.ret(-200 + -700 - word.length, [adjacentStart, adjacentEnd]);
    if (byWordTo == len)
      return this.result(-100 + (byWordFolded ? -200 : 0) + -700 + (wordAdjacent ? 0 : -1100), byWord, word);
    return chars.length == 2 ? null : this.result((any[0] ? -700 : 0) + -200 + -1100, any, word);
  }
  result(score2, positions, word) {
    let result = [], i2 = 0;
    for (let pos of positions) {
      let to = pos + (this.astral ? codePointSize(codePointAt(word, pos)) : 1);
      if (i2 && result[i2 - 1] == pos)
        result[i2 - 1] = to;
      else {
        result[i2++] = pos;
        result[i2++] = to;
      }
    }
    return this.ret(score2 - word.length, result);
  }
}
class StrictMatcher {
  constructor(pattern) {
    this.pattern = pattern;
    this.matched = [];
    this.score = 0;
    this.folded = pattern.toLowerCase();
  }
  match(word) {
    if (word.length < this.pattern.length)
      return null;
    let start = word.slice(0, this.pattern.length);
    let match = start == this.pattern ? 0 : start.toLowerCase() == this.folded ? -200 : null;
    if (match == null)
      return null;
    this.matched = [0, start.length];
    this.score = match + (word.length == this.pattern.length ? 0 : -100);
    return this;
  }
}
const completionConfig = /* @__PURE__ */ Facet.define({
  combine(configs) {
    return combineConfig(configs, {
      activateOnTyping: true,
      activateOnCompletion: () => false,
      activateOnTypingDelay: 100,
      selectOnOpen: true,
      override: null,
      closeOnBlur: true,
      maxRenderedOptions: 100,
      defaultKeymap: true,
      tooltipClass: () => "",
      optionClass: () => "",
      aboveCursor: false,
      icons: true,
      addToOptions: [],
      positionInfo: defaultPositionInfo,
      filterStrict: false,
      compareCompletions: (a, b) => (a.sortText || a.label).localeCompare(b.sortText || b.label),
      interactionDelay: 75,
      updateSyncTime: 100
    }, {
      defaultKeymap: (a, b) => a && b,
      closeOnBlur: (a, b) => a && b,
      icons: (a, b) => a && b,
      tooltipClass: (a, b) => (c) => joinClass(a(c), b(c)),
      optionClass: (a, b) => (c) => joinClass(a(c), b(c)),
      addToOptions: (a, b) => a.concat(b),
      filterStrict: (a, b) => a || b
    });
  }
});
function joinClass(a, b) {
  return a ? b ? a + " " + b : a : b;
}
function defaultPositionInfo(view, list, option, info, space, tooltip) {
  let rtl = view.textDirection == Direction.RTL, left = rtl, narrow = false;
  let side = "top", offset, maxWidth;
  let spaceLeft = list.left - space.left, spaceRight = space.right - list.right;
  let infoWidth = info.right - info.left, infoHeight = info.bottom - info.top;
  if (left && spaceLeft < Math.min(infoWidth, spaceRight))
    left = false;
  else if (!left && spaceRight < Math.min(infoWidth, spaceLeft))
    left = true;
  if (infoWidth <= (left ? spaceLeft : spaceRight)) {
    offset = Math.max(space.top, Math.min(option.top, space.bottom - infoHeight)) - list.top;
    maxWidth = Math.min(400, left ? spaceLeft : spaceRight);
  } else {
    narrow = true;
    maxWidth = Math.min(
      400,
      (rtl ? list.right : space.right - list.left) - 30
      /* Info.Margin */
    );
    let spaceBelow = space.bottom - list.bottom;
    if (spaceBelow >= infoHeight || spaceBelow > list.top) {
      offset = option.bottom - list.top;
    } else {
      side = "bottom";
      offset = list.bottom - option.top;
    }
  }
  let scaleY = (list.bottom - list.top) / tooltip.offsetHeight;
  let scaleX = (list.right - list.left) / tooltip.offsetWidth;
  return {
    style: `${side}: ${offset / scaleY}px; max-width: ${maxWidth / scaleX}px`,
    class: "cm-completionInfo-" + (narrow ? rtl ? "left-narrow" : "right-narrow" : left ? "left" : "right")
  };
}
const setSelectedEffect = /* @__PURE__ */ StateEffect.define();
function optionContent(config2) {
  let content2 = config2.addToOptions.slice();
  if (config2.icons)
    content2.push({
      render(completion) {
        let icon = document.createElement("div");
        icon.classList.add("cm-completionIcon");
        if (completion.type)
          icon.classList.add(...completion.type.split(/\s+/g).map((cls) => "cm-completionIcon-" + cls));
        icon.setAttribute("aria-hidden", "true");
        return icon;
      },
      position: 20
    });
  content2.push({
    render(completion, _s, _v, match) {
      let labelElt = document.createElement("span");
      labelElt.className = "cm-completionLabel";
      let label = completion.displayLabel || completion.label, off = 0;
      for (let j = 0; j < match.length; ) {
        let from = match[j++], to = match[j++];
        if (from > off)
          labelElt.appendChild(document.createTextNode(label.slice(off, from)));
        let span = labelElt.appendChild(document.createElement("span"));
        span.appendChild(document.createTextNode(label.slice(from, to)));
        span.className = "cm-completionMatchedText";
        off = to;
      }
      if (off < label.length)
        labelElt.appendChild(document.createTextNode(label.slice(off)));
      return labelElt;
    },
    position: 50
  }, {
    render(completion) {
      if (!completion.detail)
        return null;
      let detailElt = document.createElement("span");
      detailElt.className = "cm-completionDetail";
      detailElt.textContent = completion.detail;
      return detailElt;
    },
    position: 80
  });
  return content2.sort((a, b) => a.position - b.position).map((a) => a.render);
}
function rangeAroundSelected(total, selected, max) {
  if (total <= max)
    return { from: 0, to: total };
  if (selected < 0)
    selected = 0;
  if (selected <= total >> 1) {
    let off2 = Math.floor(selected / max);
    return { from: off2 * max, to: (off2 + 1) * max };
  }
  let off = Math.ceil((total - selected) / max);
  return { from: total - off * max, to: total - (off - 1) * max };
}
class CompletionTooltip {
  constructor(view, stateField, applyCompletion2) {
    this.view = view;
    this.stateField = stateField;
    this.applyCompletion = applyCompletion2;
    this.info = null;
    this.infoDestroy = null;
    this.placeInfoReq = {
      read: () => this.measureInfo(),
      write: (pos) => this.placeInfo(pos),
      key: this
    };
    this.space = null;
    this.currentClass = "";
    let cState = view.state.field(stateField);
    let { options, selected } = cState.open;
    let config2 = view.state.facet(completionConfig);
    this.optionContent = optionContent(config2);
    this.optionClass = config2.optionClass;
    this.tooltipClass = config2.tooltipClass;
    this.range = rangeAroundSelected(options.length, selected, config2.maxRenderedOptions);
    this.dom = document.createElement("div");
    this.dom.className = "cm-tooltip-autocomplete";
    this.updateTooltipClass(view.state);
    this.dom.addEventListener("mousedown", (e) => {
      let { options: options2 } = view.state.field(stateField).open;
      for (let dom = e.target, match; dom && dom != this.dom; dom = dom.parentNode) {
        if (dom.nodeName == "LI" && (match = /-(\d+)$/.exec(dom.id)) && +match[1] < options2.length) {
          this.applyCompletion(view, options2[+match[1]]);
          e.preventDefault();
          return;
        }
      }
      if (e.target == this.list) {
        let move = this.list.classList.contains("cm-completionListIncompleteTop") && e.clientY < this.list.firstChild.getBoundingClientRect().top ? this.range.from - 1 : this.list.classList.contains("cm-completionListIncompleteBottom") && e.clientY > this.list.lastChild.getBoundingClientRect().bottom ? this.range.to : null;
        if (move != null) {
          view.dispatch({ effects: setSelectedEffect.of(move) });
          e.preventDefault();
        }
      }
    });
    this.dom.addEventListener("focusout", (e) => {
      let state2 = view.state.field(this.stateField, false);
      if (state2 && state2.tooltip && view.state.facet(completionConfig).closeOnBlur && e.relatedTarget != view.contentDOM)
        view.dispatch({ effects: closeCompletionEffect.of(null) });
    });
    this.showOptions(options, cState.id);
  }
  mount() {
    this.updateSel();
  }
  showOptions(options, id) {
    if (this.list)
      this.list.remove();
    this.list = this.dom.appendChild(this.createListBox(options, id, this.range));
    this.list.addEventListener("scroll", () => {
      if (this.info)
        this.view.requestMeasure(this.placeInfoReq);
    });
  }
  update(update) {
    var _a2;
    let cState = update.state.field(this.stateField);
    let prevState = update.startState.field(this.stateField);
    this.updateTooltipClass(update.state);
    if (cState != prevState) {
      let { options, selected, disabled } = cState.open;
      if (!prevState.open || prevState.open.options != options) {
        this.range = rangeAroundSelected(options.length, selected, update.state.facet(completionConfig).maxRenderedOptions);
        this.showOptions(options, cState.id);
      }
      this.updateSel();
      if (disabled != ((_a2 = prevState.open) === null || _a2 === void 0 ? void 0 : _a2.disabled))
        this.dom.classList.toggle("cm-tooltip-autocomplete-disabled", !!disabled);
    }
  }
  updateTooltipClass(state2) {
    let cls = this.tooltipClass(state2);
    if (cls != this.currentClass) {
      for (let c of this.currentClass.split(" "))
        if (c)
          this.dom.classList.remove(c);
      for (let c of cls.split(" "))
        if (c)
          this.dom.classList.add(c);
      this.currentClass = cls;
    }
  }
  positioned(space) {
    this.space = space;
    if (this.info)
      this.view.requestMeasure(this.placeInfoReq);
  }
  updateSel() {
    let cState = this.view.state.field(this.stateField), open2 = cState.open;
    if (open2.selected > -1 && open2.selected < this.range.from || open2.selected >= this.range.to) {
      this.range = rangeAroundSelected(open2.options.length, open2.selected, this.view.state.facet(completionConfig).maxRenderedOptions);
      this.showOptions(open2.options, cState.id);
    }
    let newSel = this.updateSelectedOption(open2.selected);
    if (newSel) {
      this.destroyInfo();
      let { completion } = open2.options[open2.selected];
      let { info } = completion;
      if (!info)
        return;
      let infoResult = typeof info === "string" ? document.createTextNode(info) : info(completion);
      if (!infoResult)
        return;
      if ("then" in infoResult) {
        infoResult.then((obj) => {
          if (obj && this.view.state.field(this.stateField, false) == cState)
            this.addInfoPane(obj, completion);
        }).catch((e) => logException(this.view.state, e, "completion info"));
      } else {
        this.addInfoPane(infoResult, completion);
        newSel.setAttribute("aria-describedby", this.info.id);
      }
    }
  }
  addInfoPane(content2, completion) {
    this.destroyInfo();
    let wrap = this.info = document.createElement("div");
    wrap.className = "cm-tooltip cm-completionInfo";
    wrap.id = "cm-completionInfo-" + Math.floor(Math.random() * 65535).toString(16);
    if (content2.nodeType != null) {
      wrap.appendChild(content2);
      this.infoDestroy = null;
    } else {
      let { dom, destroy } = content2;
      wrap.appendChild(dom);
      this.infoDestroy = destroy || null;
    }
    this.dom.appendChild(wrap);
    this.view.requestMeasure(this.placeInfoReq);
  }
  updateSelectedOption(selected) {
    let set = null;
    for (let opt = this.list.firstChild, i2 = this.range.from; opt; opt = opt.nextSibling, i2++) {
      if (opt.nodeName != "LI" || !opt.id) {
        i2--;
      } else if (i2 == selected) {
        if (!opt.hasAttribute("aria-selected")) {
          opt.setAttribute("aria-selected", "true");
          set = opt;
        }
      } else {
        if (opt.hasAttribute("aria-selected")) {
          opt.removeAttribute("aria-selected");
          opt.removeAttribute("aria-describedby");
        }
      }
    }
    if (set)
      scrollIntoView(this.list, set);
    return set;
  }
  measureInfo() {
    let sel = this.dom.querySelector("[aria-selected]");
    if (!sel || !this.info)
      return null;
    let listRect = this.dom.getBoundingClientRect();
    let infoRect = this.info.getBoundingClientRect();
    let selRect = sel.getBoundingClientRect();
    let space = this.space;
    if (!space) {
      let docElt = this.dom.ownerDocument.documentElement;
      space = { left: 0, top: 0, right: docElt.clientWidth, bottom: docElt.clientHeight };
    }
    if (selRect.top > Math.min(space.bottom, listRect.bottom) - 10 || selRect.bottom < Math.max(space.top, listRect.top) + 10)
      return null;
    return this.view.state.facet(completionConfig).positionInfo(this.view, listRect, selRect, infoRect, space, this.dom);
  }
  placeInfo(pos) {
    if (this.info) {
      if (pos) {
        if (pos.style)
          this.info.style.cssText = pos.style;
        this.info.className = "cm-tooltip cm-completionInfo " + (pos.class || "");
      } else {
        this.info.style.cssText = "top: -1e6px";
      }
    }
  }
  createListBox(options, id, range) {
    const ul = document.createElement("ul");
    ul.id = id;
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-expanded", "true");
    ul.setAttribute("aria-label", this.view.state.phrase("Completions"));
    ul.addEventListener("mousedown", (e) => {
      if (e.target == ul)
        e.preventDefault();
    });
    let curSection = null;
    for (let i2 = range.from; i2 < range.to; i2++) {
      let { completion, match } = options[i2], { section } = completion;
      if (section) {
        let name2 = typeof section == "string" ? section : section.name;
        if (name2 != curSection && (i2 > range.from || range.from == 0)) {
          curSection = name2;
          if (typeof section != "string" && section.header) {
            ul.appendChild(section.header(section));
          } else {
            let header = ul.appendChild(document.createElement("completion-section"));
            header.textContent = name2;
          }
        }
      }
      const li = ul.appendChild(document.createElement("li"));
      li.id = id + "-" + i2;
      li.setAttribute("role", "option");
      let cls = this.optionClass(completion);
      if (cls)
        li.className = cls;
      for (let source of this.optionContent) {
        let node = source(completion, this.view.state, this.view, match);
        if (node)
          li.appendChild(node);
      }
    }
    if (range.from)
      ul.classList.add("cm-completionListIncompleteTop");
    if (range.to < options.length)
      ul.classList.add("cm-completionListIncompleteBottom");
    return ul;
  }
  destroyInfo() {
    if (this.info) {
      if (this.infoDestroy)
        this.infoDestroy();
      this.info.remove();
      this.info = null;
    }
  }
  destroy() {
    this.destroyInfo();
  }
}
function completionTooltip(stateField, applyCompletion2) {
  return (view) => new CompletionTooltip(view, stateField, applyCompletion2);
}
function scrollIntoView(container, element) {
  let parent = container.getBoundingClientRect();
  let self = element.getBoundingClientRect();
  let scaleY = parent.height / container.offsetHeight;
  if (self.top < parent.top)
    container.scrollTop -= (parent.top - self.top) / scaleY;
  else if (self.bottom > parent.bottom)
    container.scrollTop += (self.bottom - parent.bottom) / scaleY;
}
function score(option) {
  return (option.boost || 0) * 100 + (option.apply ? 10 : 0) + (option.info ? 5 : 0) + (option.type ? 1 : 0);
}
function sortOptions(active, state2) {
  let options = [];
  let sections = null, dynamicSectionScore = null;
  let addOption = (option) => {
    options.push(option);
    let { section } = option.completion;
    if (section) {
      if (!sections)
        sections = [];
      let name2 = typeof section == "string" ? section : section.name;
      if (!sections.some((s) => s.name == name2))
        sections.push(typeof section == "string" ? { name: name2 } : section);
    }
  };
  let conf = state2.facet(completionConfig);
  for (let a of active)
    if (a.hasResult()) {
      let getMatch = a.result.getMatch;
      if (a.result.filter === false) {
        for (let option of a.result.options) {
          addOption(new Option(option, a.source, getMatch ? getMatch(option) : [], 1e9 - options.length));
        }
      } else {
        let pattern = state2.sliceDoc(a.from, a.to), match;
        let matcher = conf.filterStrict ? new StrictMatcher(pattern) : new FuzzyMatcher(pattern);
        for (let option of a.result.options)
          if (match = matcher.match(option.label)) {
            let matched = !option.displayLabel ? match.matched : getMatch ? getMatch(option, match.matched) : [];
            let score2 = match.score + (option.boost || 0);
            addOption(new Option(option, a.source, matched, score2));
            if (typeof option.section == "object" && option.section.rank === "dynamic") {
              let { name: name2 } = option.section;
              if (!dynamicSectionScore)
                dynamicSectionScore = /* @__PURE__ */ Object.create(null);
              dynamicSectionScore[name2] = Math.max(score2, dynamicSectionScore[name2] || -1e9);
            }
          }
      }
    }
  if (sections) {
    let sectionOrder = /* @__PURE__ */ Object.create(null), pos = 0;
    let cmp = (a, b) => {
      return (a.rank === "dynamic" && b.rank === "dynamic" ? dynamicSectionScore[b.name] - dynamicSectionScore[a.name] : 0) || (typeof a.rank == "number" ? a.rank : 1e9) - (typeof b.rank == "number" ? b.rank : 1e9) || (a.name < b.name ? -1 : 1);
    };
    for (let s of sections.sort(cmp)) {
      pos -= 1e5;
      sectionOrder[s.name] = pos;
    }
    for (let option of options) {
      let { section } = option.completion;
      if (section)
        option.score += sectionOrder[typeof section == "string" ? section : section.name];
    }
  }
  let result = [], prev = null;
  let compare2 = conf.compareCompletions;
  for (let opt of options.sort((a, b) => b.score - a.score || compare2(a.completion, b.completion))) {
    let cur2 = opt.completion;
    if (!prev || prev.label != cur2.label || prev.detail != cur2.detail || prev.type != null && cur2.type != null && prev.type != cur2.type || prev.apply != cur2.apply || prev.boost != cur2.boost)
      result.push(opt);
    else if (score(opt.completion) > score(prev))
      result[result.length - 1] = opt;
    prev = opt.completion;
  }
  return result;
}
class CompletionDialog {
  constructor(options, attrs, tooltip, timestamp, selected, disabled) {
    this.options = options;
    this.attrs = attrs;
    this.tooltip = tooltip;
    this.timestamp = timestamp;
    this.selected = selected;
    this.disabled = disabled;
  }
  setSelected(selected, id) {
    return selected == this.selected || selected >= this.options.length ? this : new CompletionDialog(this.options, makeAttrs(id, selected), this.tooltip, this.timestamp, selected, this.disabled);
  }
  static build(active, state2, id, prev, conf, didSetActive) {
    if (prev && !didSetActive && active.some((s) => s.isPending))
      return prev.setDisabled();
    let options = sortOptions(active, state2);
    if (!options.length)
      return prev && active.some((a) => a.isPending) ? prev.setDisabled() : null;
    let selected = state2.facet(completionConfig).selectOnOpen ? 0 : -1;
    if (prev && prev.selected != selected && prev.selected != -1) {
      let selectedValue = prev.options[prev.selected].completion;
      for (let i2 = 0; i2 < options.length; i2++)
        if (options[i2].completion == selectedValue) {
          selected = i2;
          break;
        }
    }
    return new CompletionDialog(options, makeAttrs(id, selected), {
      pos: active.reduce((a, b) => b.hasResult() ? Math.min(a, b.from) : a, 1e8),
      create: createTooltip,
      above: conf.aboveCursor
    }, prev ? prev.timestamp : Date.now(), selected, false);
  }
  map(changes) {
    return new CompletionDialog(this.options, this.attrs, { ...this.tooltip, pos: changes.mapPos(this.tooltip.pos) }, this.timestamp, this.selected, this.disabled);
  }
  setDisabled() {
    return new CompletionDialog(this.options, this.attrs, this.tooltip, this.timestamp, this.selected, true);
  }
}
class CompletionState {
  constructor(active, id, open2) {
    this.active = active;
    this.id = id;
    this.open = open2;
  }
  static start() {
    return new CompletionState(none, "cm-ac-" + Math.floor(Math.random() * 2e6).toString(36), null);
  }
  update(tr) {
    let { state: state2 } = tr, conf = state2.facet(completionConfig);
    let sources = conf.override || state2.languageDataAt("autocomplete", cur(state2)).map(asSource);
    let active = sources.map((source) => {
      let value = this.active.find((s) => s.source == source) || new ActiveSource(
        source,
        this.active.some(
          (a) => a.state != 0
          /* State.Inactive */
        ) ? 1 : 0
        /* State.Inactive */
      );
      return value.update(tr, conf);
    });
    if (active.length == this.active.length && active.every((a, i2) => a == this.active[i2]))
      active = this.active;
    let open2 = this.open, didSet = tr.effects.some((e) => e.is(setActiveEffect));
    if (open2 && tr.docChanged)
      open2 = open2.map(tr.changes);
    if (tr.selection || active.some((a) => a.hasResult() && tr.changes.touchesRange(a.from, a.to)) || !sameResults(active, this.active) || didSet)
      open2 = CompletionDialog.build(active, state2, this.id, open2, conf, didSet);
    else if (open2 && open2.disabled && !active.some((a) => a.isPending))
      open2 = null;
    if (!open2 && active.every((a) => !a.isPending) && active.some((a) => a.hasResult()))
      active = active.map((a) => a.hasResult() ? new ActiveSource(
        a.source,
        0
        /* State.Inactive */
      ) : a);
    for (let effect of tr.effects)
      if (effect.is(setSelectedEffect))
        open2 = open2 && open2.setSelected(effect.value, this.id);
    return active == this.active && open2 == this.open ? this : new CompletionState(active, this.id, open2);
  }
  get tooltip() {
    return this.open ? this.open.tooltip : null;
  }
  get attrs() {
    return this.open ? this.open.attrs : this.active.length ? baseAttrs : noAttrs;
  }
}
function sameResults(a, b) {
  if (a == b)
    return true;
  for (let iA = 0, iB = 0; ; ) {
    while (iA < a.length && !a[iA].hasResult())
      iA++;
    while (iB < b.length && !b[iB].hasResult())
      iB++;
    let endA = iA == a.length, endB = iB == b.length;
    if (endA || endB)
      return endA == endB;
    if (a[iA++].result != b[iB++].result)
      return false;
  }
}
const baseAttrs = {
  "aria-autocomplete": "list"
};
const noAttrs = {};
function makeAttrs(id, selected) {
  let result = {
    "aria-autocomplete": "list",
    "aria-haspopup": "listbox",
    "aria-controls": id
  };
  if (selected > -1)
    result["aria-activedescendant"] = id + "-" + selected;
  return result;
}
const none = [];
function getUpdateType(tr, conf) {
  if (tr.isUserEvent("input.complete")) {
    let completion = tr.annotation(pickedCompletion);
    if (completion && conf.activateOnCompletion(completion))
      return 4 | 8;
  }
  let typing = tr.isUserEvent("input.type");
  return typing && conf.activateOnTyping ? 4 | 1 : typing ? 1 : tr.isUserEvent("delete.backward") ? 2 : tr.selection ? 8 : tr.docChanged ? 16 : 0;
}
class ActiveSource {
  constructor(source, state2, explicit = false) {
    this.source = source;
    this.state = state2;
    this.explicit = explicit;
  }
  hasResult() {
    return false;
  }
  get isPending() {
    return this.state == 1;
  }
  update(tr, conf) {
    let type = getUpdateType(tr, conf), value = this;
    if (type & 8 || type & 16 && this.touches(tr))
      value = new ActiveSource(
        value.source,
        0
        /* State.Inactive */
      );
    if (type & 4 && value.state == 0)
      value = new ActiveSource(
        this.source,
        1
        /* State.Pending */
      );
    value = value.updateFor(tr, type);
    for (let effect of tr.effects) {
      if (effect.is(startCompletionEffect))
        value = new ActiveSource(value.source, 1, effect.value);
      else if (effect.is(closeCompletionEffect))
        value = new ActiveSource(
          value.source,
          0
          /* State.Inactive */
        );
      else if (effect.is(setActiveEffect)) {
        for (let active of effect.value)
          if (active.source == value.source)
            value = active;
      }
    }
    return value;
  }
  updateFor(tr, type) {
    return this.map(tr.changes);
  }
  map(changes) {
    return this;
  }
  touches(tr) {
    return tr.changes.touchesRange(cur(tr.state));
  }
}
class ActiveResult extends ActiveSource {
  constructor(source, explicit, limit, result, from, to) {
    super(source, 3, explicit);
    this.limit = limit;
    this.result = result;
    this.from = from;
    this.to = to;
  }
  hasResult() {
    return true;
  }
  updateFor(tr, type) {
    var _a2;
    if (!(type & 3))
      return this.map(tr.changes);
    let result = this.result;
    if (result.map && !tr.changes.empty)
      result = result.map(result, tr.changes);
    let from = tr.changes.mapPos(this.from), to = tr.changes.mapPos(this.to, 1);
    let pos = cur(tr.state);
    if (pos > to || !result || type & 2 && (cur(tr.startState) == this.from || pos < this.limit))
      return new ActiveSource(
        this.source,
        type & 4 ? 1 : 0
        /* State.Inactive */
      );
    let limit = tr.changes.mapPos(this.limit);
    if (checkValid(result.validFor, tr.state, from, to))
      return new ActiveResult(this.source, this.explicit, limit, result, from, to);
    if (result.update && (result = result.update(result, from, to, new CompletionContext(tr.state, pos, false))))
      return new ActiveResult(this.source, this.explicit, limit, result, result.from, (_a2 = result.to) !== null && _a2 !== void 0 ? _a2 : cur(tr.state));
    return new ActiveSource(this.source, 1, this.explicit);
  }
  map(mapping) {
    if (mapping.empty)
      return this;
    let result = this.result.map ? this.result.map(this.result, mapping) : this.result;
    if (!result)
      return new ActiveSource(
        this.source,
        0
        /* State.Inactive */
      );
    return new ActiveResult(this.source, this.explicit, mapping.mapPos(this.limit), result, mapping.mapPos(this.from), mapping.mapPos(this.to, 1));
  }
  touches(tr) {
    return tr.changes.touchesRange(this.from, this.to);
  }
}
function checkValid(validFor, state2, from, to) {
  if (!validFor)
    return false;
  let text = state2.sliceDoc(from, to);
  return typeof validFor == "function" ? validFor(text, from, to, state2) : ensureAnchor(validFor, true).test(text);
}
const setActiveEffect = /* @__PURE__ */ StateEffect.define({
  map(sources, mapping) {
    return sources.map((s) => s.map(mapping));
  }
});
const completionState = /* @__PURE__ */ StateField.define({
  create() {
    return CompletionState.start();
  },
  update(value, tr) {
    return value.update(tr);
  },
  provide: (f) => [
    showTooltip.from(f, (val) => val.tooltip),
    EditorView.contentAttributes.from(f, (state2) => state2.attrs)
  ]
});
function applyCompletion(view, option) {
  const apply = option.completion.apply || option.completion.label;
  let result = view.state.field(completionState).active.find((a) => a.source == option.source);
  if (!(result instanceof ActiveResult))
    return false;
  if (typeof apply == "string")
    view.dispatch({
      ...insertCompletionText(view.state, apply, result.from, result.to),
      annotations: pickedCompletion.of(option.completion)
    });
  else
    apply(view, option.completion, result.from, result.to);
  return true;
}
const createTooltip = /* @__PURE__ */ completionTooltip(completionState, applyCompletion);
function moveCompletionSelection(forward, by = "option") {
  return (view) => {
    let cState = view.state.field(completionState, false);
    if (!cState || !cState.open || cState.open.disabled || Date.now() - cState.open.timestamp < view.state.facet(completionConfig).interactionDelay)
      return false;
    let step = 1, tooltip;
    if (by == "page" && (tooltip = getTooltip(view, cState.open.tooltip)))
      step = Math.max(2, Math.floor(tooltip.dom.offsetHeight / tooltip.dom.querySelector("li").offsetHeight) - 1);
    let { length } = cState.open.options;
    let selected = cState.open.selected > -1 ? cState.open.selected + step * (forward ? 1 : -1) : forward ? 0 : length - 1;
    if (selected < 0)
      selected = by == "page" ? 0 : length - 1;
    else if (selected >= length)
      selected = by == "page" ? length - 1 : 0;
    view.dispatch({ effects: setSelectedEffect.of(selected) });
    return true;
  };
}
const acceptCompletion = (view) => {
  let cState = view.state.field(completionState, false);
  if (view.state.readOnly || !cState || !cState.open || cState.open.selected < 0 || cState.open.disabled || Date.now() - cState.open.timestamp < view.state.facet(completionConfig).interactionDelay)
    return false;
  return applyCompletion(view, cState.open.options[cState.open.selected]);
};
const startCompletion = (view) => {
  let cState = view.state.field(completionState, false);
  if (!cState)
    return false;
  view.dispatch({ effects: startCompletionEffect.of(true) });
  return true;
};
const closeCompletion = (view) => {
  let cState = view.state.field(completionState, false);
  if (!cState || !cState.active.some(
    (a) => a.state != 0
    /* State.Inactive */
  ))
    return false;
  view.dispatch({ effects: closeCompletionEffect.of(null) });
  return true;
};
class RunningQuery {
  constructor(active, context) {
    this.active = active;
    this.context = context;
    this.time = Date.now();
    this.updates = [];
    this.done = void 0;
  }
}
const MaxUpdateCount = 50, MinAbortTime = 1e3;
const completionPlugin = /* @__PURE__ */ ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.debounceUpdate = -1;
    this.running = [];
    this.debounceAccept = -1;
    this.pendingStart = false;
    this.composing = 0;
    for (let active of view.state.field(completionState).active)
      if (active.isPending)
        this.startQuery(active);
  }
  update(update) {
    let cState = update.state.field(completionState);
    let conf = update.state.facet(completionConfig);
    if (!update.selectionSet && !update.docChanged && update.startState.field(completionState) == cState)
      return;
    let doesReset = update.transactions.some((tr) => {
      let type = getUpdateType(tr, conf);
      return type & 8 || (tr.selection || tr.docChanged) && !(type & 3);
    });
    for (let i2 = 0; i2 < this.running.length; i2++) {
      let query = this.running[i2];
      if (doesReset || query.context.abortOnDocChange && update.docChanged || query.updates.length + update.transactions.length > MaxUpdateCount && Date.now() - query.time > MinAbortTime) {
        for (let handler of query.context.abortListeners) {
          try {
            handler();
          } catch (e) {
            logException(this.view.state, e);
          }
        }
        query.context.abortListeners = null;
        this.running.splice(i2--, 1);
      } else {
        query.updates.push(...update.transactions);
      }
    }
    if (this.debounceUpdate > -1)
      clearTimeout(this.debounceUpdate);
    if (update.transactions.some((tr) => tr.effects.some((e) => e.is(startCompletionEffect))))
      this.pendingStart = true;
    let delay = this.pendingStart ? 50 : conf.activateOnTypingDelay;
    this.debounceUpdate = cState.active.some((a) => a.isPending && !this.running.some((q) => q.active.source == a.source)) ? setTimeout(() => this.startUpdate(), delay) : -1;
    if (this.composing != 0)
      for (let tr of update.transactions) {
        if (tr.isUserEvent("input.type"))
          this.composing = 2;
        else if (this.composing == 2 && tr.selection)
          this.composing = 3;
      }
  }
  startUpdate() {
    this.debounceUpdate = -1;
    this.pendingStart = false;
    let { state: state2 } = this.view, cState = state2.field(completionState);
    for (let active of cState.active) {
      if (active.isPending && !this.running.some((r) => r.active.source == active.source))
        this.startQuery(active);
    }
    if (this.running.length && cState.open && cState.open.disabled)
      this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(completionConfig).updateSyncTime);
  }
  startQuery(active) {
    let { state: state2 } = this.view, pos = cur(state2);
    let context = new CompletionContext(state2, pos, active.explicit, this.view);
    let pending = new RunningQuery(active, context);
    this.running.push(pending);
    Promise.resolve(active.source(context)).then((result) => {
      if (!pending.context.aborted) {
        pending.done = result || null;
        this.scheduleAccept();
      }
    }, (err) => {
      this.view.dispatch({ effects: closeCompletionEffect.of(null) });
      logException(this.view.state, err);
    });
  }
  scheduleAccept() {
    if (this.running.every((q) => q.done !== void 0))
      this.accept();
    else if (this.debounceAccept < 0)
      this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(completionConfig).updateSyncTime);
  }
  // For each finished query in this.running, try to create a result
  // or, if appropriate, restart the query.
  accept() {
    var _a2;
    if (this.debounceAccept > -1)
      clearTimeout(this.debounceAccept);
    this.debounceAccept = -1;
    let updated = [];
    let conf = this.view.state.facet(completionConfig), cState = this.view.state.field(completionState);
    for (let i2 = 0; i2 < this.running.length; i2++) {
      let query = this.running[i2];
      if (query.done === void 0)
        continue;
      this.running.splice(i2--, 1);
      if (query.done) {
        let pos = cur(query.updates.length ? query.updates[0].startState : this.view.state);
        let limit = Math.min(pos, query.done.from + (query.active.explicit ? 0 : 1));
        let active = new ActiveResult(query.active.source, query.active.explicit, limit, query.done, query.done.from, (_a2 = query.done.to) !== null && _a2 !== void 0 ? _a2 : pos);
        for (let tr of query.updates)
          active = active.update(tr, conf);
        if (active.hasResult()) {
          updated.push(active);
          continue;
        }
      }
      let current = cState.active.find((a) => a.source == query.active.source);
      if (current && current.isPending) {
        if (query.done == null) {
          let active = new ActiveSource(
            query.active.source,
            0
            /* State.Inactive */
          );
          for (let tr of query.updates)
            active = active.update(tr, conf);
          if (!active.isPending)
            updated.push(active);
        } else {
          this.startQuery(current);
        }
      }
    }
    if (updated.length || cState.open && cState.open.disabled)
      this.view.dispatch({ effects: setActiveEffect.of(updated) });
  }
}, {
  eventHandlers: {
    blur(event) {
      let state2 = this.view.state.field(completionState, false);
      if (state2 && state2.tooltip && this.view.state.facet(completionConfig).closeOnBlur) {
        let dialog = state2.open && getTooltip(this.view, state2.open.tooltip);
        if (!dialog || !dialog.dom.contains(event.relatedTarget))
          setTimeout(() => this.view.dispatch({ effects: closeCompletionEffect.of(null) }), 10);
      }
    },
    compositionstart() {
      this.composing = 1;
    },
    compositionend() {
      if (this.composing == 3) {
        setTimeout(() => this.view.dispatch({ effects: startCompletionEffect.of(false) }), 20);
      }
      this.composing = 0;
    }
  }
});
const windows = typeof navigator == "object" && /* @__PURE__ */ /Win/.test(navigator.platform);
const commitCharacters = /* @__PURE__ */ Prec.highest(/* @__PURE__ */ EditorView.domEventHandlers({
  keydown(event, view) {
    let field = view.state.field(completionState, false);
    if (!field || !field.open || field.open.disabled || field.open.selected < 0 || !event.key || event.key.length > 1 || event.ctrlKey && !(windows && event.altKey) || event.metaKey)
      return false;
    let option = field.open.options[field.open.selected];
    let result = field.active.find((a) => a.source == option.source);
    let commitChars = option.completion.commitCharacters || result.result.commitCharacters;
    if (commitChars && commitChars.indexOf(event.key) > -1)
      applyCompletion(view, option);
    return false;
  }
}));
const baseTheme$1 = /* @__PURE__ */ EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: "monospace",
      whiteSpace: "nowrap",
      overflow: "hidden auto",
      maxWidth_fallback: "700px",
      maxWidth: "min(700px, 95vw)",
      minWidth: "250px",
      maxHeight: "10em",
      height: "100%",
      listStyle: "none",
      margin: 0,
      padding: 0,
      "& > li, & > completion-section": {
        padding: "1px 3px",
        lineHeight: 1.2
      },
      "& > li": {
        overflowX: "hidden",
        textOverflow: "ellipsis",
        cursor: "pointer"
      },
      "& > completion-section": {
        display: "list-item",
        borderBottom: "1px solid silver",
        paddingLeft: "0.5em",
        opacity: 0.7
      }
    }
  },
  "&light .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#17c",
    color: "white"
  },
  "&light .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
    background: "#777"
  },
  "&dark .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#347",
    color: "white"
  },
  "&dark .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
    background: "#444"
  },
  ".cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after": {
    content: '"···"',
    opacity: 0.5,
    display: "block",
    textAlign: "center",
    cursor: "pointer"
  },
  ".cm-tooltip.cm-completionInfo": {
    position: "absolute",
    padding: "3px 9px",
    width: "max-content",
    maxWidth: `${400}px`,
    boxSizing: "border-box",
    whiteSpace: "pre-line"
  },
  ".cm-completionInfo.cm-completionInfo-left": { right: "100%" },
  ".cm-completionInfo.cm-completionInfo-right": { left: "100%" },
  ".cm-completionInfo.cm-completionInfo-left-narrow": { right: `${30}px` },
  ".cm-completionInfo.cm-completionInfo-right-narrow": { left: `${30}px` },
  "&light .cm-snippetField": { backgroundColor: "#00000022" },
  "&dark .cm-snippetField": { backgroundColor: "#ffffff22" },
  ".cm-snippetFieldPosition": {
    verticalAlign: "text-top",
    width: 0,
    height: "1.15em",
    display: "inline-block",
    margin: "0 -0.7px -.7em",
    borderLeft: "1.4px dotted #888"
  },
  ".cm-completionMatchedText": {
    textDecoration: "underline"
  },
  ".cm-completionDetail": {
    marginLeft: "0.5em",
    fontStyle: "italic"
  },
  ".cm-completionIcon": {
    fontSize: "90%",
    width: ".8em",
    display: "inline-block",
    textAlign: "center",
    paddingRight: ".6em",
    opacity: "0.6",
    boxSizing: "content-box"
  },
  ".cm-completionIcon-function, .cm-completionIcon-method": {
    "&:after": { content: "'ƒ'" }
  },
  ".cm-completionIcon-class": {
    "&:after": { content: "'○'" }
  },
  ".cm-completionIcon-interface": {
    "&:after": { content: "'◌'" }
  },
  ".cm-completionIcon-variable": {
    "&:after": { content: "'𝑥'" }
  },
  ".cm-completionIcon-constant": {
    "&:after": { content: "'𝐶'" }
  },
  ".cm-completionIcon-type": {
    "&:after": { content: "'𝑡'" }
  },
  ".cm-completionIcon-enum": {
    "&:after": { content: "'∪'" }
  },
  ".cm-completionIcon-property": {
    "&:after": { content: "'□'" }
  },
  ".cm-completionIcon-keyword": {
    "&:after": { content: "'🔑︎'" }
    // Disable emoji rendering
  },
  ".cm-completionIcon-namespace": {
    "&:after": { content: "'▢'" }
  },
  ".cm-completionIcon-text": {
    "&:after": { content: "'abc'", fontSize: "50%", verticalAlign: "middle" }
  }
});
const defaults = {
  brackets: ["(", "[", "{", "'", '"'],
  before: ")]}:;>",
  stringPrefixes: []
};
const closeBracketEffect = /* @__PURE__ */ StateEffect.define({
  map(value, mapping) {
    let mapped = mapping.mapPos(value, -1, MapMode.TrackAfter);
    return mapped == null ? void 0 : mapped;
  }
});
const closedBracket = /* @__PURE__ */ new class extends RangeValue {
}();
closedBracket.startSide = 1;
closedBracket.endSide = -1;
const bracketState = /* @__PURE__ */ StateField.define({
  create() {
    return RangeSet.empty;
  },
  update(value, tr) {
    value = value.map(tr.changes);
    if (tr.selection) {
      let line = tr.state.doc.lineAt(tr.selection.main.head);
      value = value.update({ filter: (from) => from >= line.from && from <= line.to });
    }
    for (let effect of tr.effects)
      if (effect.is(closeBracketEffect))
        value = value.update({ add: [closedBracket.range(effect.value, effect.value + 1)] });
    return value;
  }
});
function closeBrackets() {
  return [inputHandler, bracketState];
}
const definedClosing = "()[]{}<>«»»«［］｛｝";
function closing(ch) {
  for (let i2 = 0; i2 < definedClosing.length; i2 += 2)
    if (definedClosing.charCodeAt(i2) == ch)
      return definedClosing.charAt(i2 + 1);
  return fromCodePoint(ch < 128 ? ch : ch + 1);
}
function config(state2, pos) {
  return state2.languageDataAt("closeBrackets", pos)[0] || defaults;
}
const android = typeof navigator == "object" && /* @__PURE__ */ /Android\b/.test(navigator.userAgent);
const inputHandler = /* @__PURE__ */ EditorView.inputHandler.of((view, from, to, insert2) => {
  if ((android ? view.composing : view.compositionStarted) || view.state.readOnly)
    return false;
  let sel = view.state.selection.main;
  if (insert2.length > 2 || insert2.length == 2 && codePointSize(codePointAt(insert2, 0)) == 1 || from != sel.from || to != sel.to)
    return false;
  let tr = insertBracket(view.state, insert2);
  if (!tr)
    return false;
  view.dispatch(tr);
  return true;
});
const deleteBracketPair = ({ state: state2, dispatch }) => {
  if (state2.readOnly)
    return false;
  let conf = config(state2, state2.selection.main.head);
  let tokens = conf.brackets || defaults.brackets;
  let dont = null, changes = state2.changeByRange((range) => {
    if (range.empty) {
      let before = prevChar(state2.doc, range.head);
      for (let token of tokens) {
        if (token == before && nextChar(state2.doc, range.head) == closing(codePointAt(token, 0)))
          return {
            changes: { from: range.head - token.length, to: range.head + token.length },
            range: EditorSelection.cursor(range.head - token.length)
          };
      }
    }
    return { range: dont = range };
  });
  if (!dont)
    dispatch(state2.update(changes, { scrollIntoView: true, userEvent: "delete.backward" }));
  return !dont;
};
const closeBracketsKeymap = [
  { key: "Backspace", run: deleteBracketPair }
];
function insertBracket(state2, bracket2) {
  let conf = config(state2, state2.selection.main.head);
  let tokens = conf.brackets || defaults.brackets;
  for (let tok of tokens) {
    let closed = closing(codePointAt(tok, 0));
    if (bracket2 == tok)
      return closed == tok ? handleSame(state2, tok, tokens.indexOf(tok + tok + tok) > -1, conf) : handleOpen(state2, tok, closed, conf.before || defaults.before);
    if (bracket2 == closed && closedBracketAt(state2, state2.selection.main.from))
      return handleClose(state2, tok, closed);
  }
  return null;
}
function closedBracketAt(state2, pos) {
  let found = false;
  state2.field(bracketState).between(0, state2.doc.length, (from) => {
    if (from == pos)
      found = true;
  });
  return found;
}
function nextChar(doc2, pos) {
  let next = doc2.sliceString(pos, pos + 2);
  return next.slice(0, codePointSize(codePointAt(next, 0)));
}
function prevChar(doc2, pos) {
  let prev = doc2.sliceString(pos - 2, pos);
  return codePointSize(codePointAt(prev, 0)) == prev.length ? prev : prev.slice(1);
}
function handleOpen(state2, open2, close, closeBefore) {
  let dont = null, changes = state2.changeByRange((range) => {
    if (!range.empty)
      return {
        changes: [{ insert: open2, from: range.from }, { insert: close, from: range.to }],
        effects: closeBracketEffect.of(range.to + open2.length),
        range: EditorSelection.range(range.anchor + open2.length, range.head + open2.length)
      };
    let next = nextChar(state2.doc, range.head);
    if (!next || /\s/.test(next) || closeBefore.indexOf(next) > -1)
      return {
        changes: { insert: open2 + close, from: range.head },
        effects: closeBracketEffect.of(range.head + open2.length),
        range: EditorSelection.cursor(range.head + open2.length)
      };
    return { range: dont = range };
  });
  return dont ? null : state2.update(changes, {
    scrollIntoView: true,
    userEvent: "input.type"
  });
}
function handleClose(state2, _open, close) {
  let dont = null, changes = state2.changeByRange((range) => {
    if (range.empty && nextChar(state2.doc, range.head) == close)
      return {
        changes: { from: range.head, to: range.head + close.length, insert: close },
        range: EditorSelection.cursor(range.head + close.length)
      };
    return dont = { range };
  });
  return dont ? null : state2.update(changes, {
    scrollIntoView: true,
    userEvent: "input.type"
  });
}
function handleSame(state2, token, allowTriple, config2) {
  let stringPrefixes = config2.stringPrefixes || defaults.stringPrefixes;
  let dont = null, changes = state2.changeByRange((range) => {
    if (!range.empty)
      return {
        changes: [{ insert: token, from: range.from }, { insert: token, from: range.to }],
        effects: closeBracketEffect.of(range.to + token.length),
        range: EditorSelection.range(range.anchor + token.length, range.head + token.length)
      };
    let pos = range.head, next = nextChar(state2.doc, pos), start;
    if (next == token) {
      if (nodeStart(state2, pos)) {
        return {
          changes: { insert: token + token, from: pos },
          effects: closeBracketEffect.of(pos + token.length),
          range: EditorSelection.cursor(pos + token.length)
        };
      } else if (closedBracketAt(state2, pos)) {
        let isTriple = allowTriple && state2.sliceDoc(pos, pos + token.length * 3) == token + token + token;
        let content2 = isTriple ? token + token + token : token;
        return {
          changes: { from: pos, to: pos + content2.length, insert: content2 },
          range: EditorSelection.cursor(pos + content2.length)
        };
      }
    } else if (allowTriple && state2.sliceDoc(pos - 2 * token.length, pos) == token + token && (start = canStartStringAt(state2, pos - 2 * token.length, stringPrefixes)) > -1 && nodeStart(state2, start)) {
      return {
        changes: { insert: token + token + token + token, from: pos },
        effects: closeBracketEffect.of(pos + token.length),
        range: EditorSelection.cursor(pos + token.length)
      };
    } else if (state2.charCategorizer(pos)(next) != CharCategory.Word) {
      if (canStartStringAt(state2, pos, stringPrefixes) > -1 && !probablyInString(state2, pos, token, stringPrefixes))
        return {
          changes: { insert: token + token, from: pos },
          effects: closeBracketEffect.of(pos + token.length),
          range: EditorSelection.cursor(pos + token.length)
        };
    }
    return { range: dont = range };
  });
  return dont ? null : state2.update(changes, {
    scrollIntoView: true,
    userEvent: "input.type"
  });
}
function nodeStart(state2, pos) {
  let tree = syntaxTree(state2).resolveInner(pos + 1);
  return tree.parent && tree.from == pos;
}
function probablyInString(state2, pos, quoteToken, prefixes) {
  let node = syntaxTree(state2).resolveInner(pos, -1);
  let maxPrefix = prefixes.reduce((m, p) => Math.max(m, p.length), 0);
  for (let i2 = 0; i2 < 5; i2++) {
    let start = state2.sliceDoc(node.from, Math.min(node.to, node.from + quoteToken.length + maxPrefix));
    let quotePos = start.indexOf(quoteToken);
    if (!quotePos || quotePos > -1 && prefixes.indexOf(start.slice(0, quotePos)) > -1) {
      let first = node.firstChild;
      while (first && first.from == node.from && first.to - first.from > quoteToken.length + quotePos) {
        if (state2.sliceDoc(first.to - quoteToken.length, first.to) == quoteToken)
          return false;
        first = first.firstChild;
      }
      return true;
    }
    let parent = node.to == pos && node.parent;
    if (!parent)
      break;
    node = parent;
  }
  return false;
}
function canStartStringAt(state2, pos, prefixes) {
  let charCat = state2.charCategorizer(pos);
  if (charCat(state2.sliceDoc(pos - 1, pos)) != CharCategory.Word)
    return pos;
  for (let prefix of prefixes) {
    let start = pos - prefix.length;
    if (state2.sliceDoc(start, pos) == prefix && charCat(state2.sliceDoc(start - 1, start)) != CharCategory.Word)
      return start;
  }
  return -1;
}
function autocompletion(config2 = {}) {
  return [
    commitCharacters,
    completionState,
    completionConfig.of(config2),
    completionPlugin,
    completionKeymapExt,
    baseTheme$1
  ];
}
const completionKeymap = [
  { key: "Ctrl-Space", run: startCompletion },
  { mac: "Alt-`", run: startCompletion },
  { mac: "Alt-i", run: startCompletion },
  { key: "Escape", run: closeCompletion },
  { key: "ArrowDown", run: /* @__PURE__ */ moveCompletionSelection(true) },
  { key: "ArrowUp", run: /* @__PURE__ */ moveCompletionSelection(false) },
  { key: "PageDown", run: /* @__PURE__ */ moveCompletionSelection(true, "page") },
  { key: "PageUp", run: /* @__PURE__ */ moveCompletionSelection(false, "page") },
  { key: "Enter", run: acceptCompletion }
];
const completionKeymapExt = /* @__PURE__ */ Prec.highest(/* @__PURE__ */ keymap.computeN([completionConfig], (state2) => state2.facet(completionConfig).defaultKeymap ? [completionKeymap] : []));
class SelectedDiagnostic {
  constructor(from, to, diagnostic) {
    this.from = from;
    this.to = to;
    this.diagnostic = diagnostic;
  }
}
class LintState {
  constructor(diagnostics, panel, selected) {
    this.diagnostics = diagnostics;
    this.panel = panel;
    this.selected = selected;
  }
  static init(diagnostics, panel, state2) {
    let diagnosticFilter = state2.facet(lintConfig).markerFilter;
    if (diagnosticFilter)
      diagnostics = diagnosticFilter(diagnostics, state2);
    let sorted = diagnostics.slice().sort((a, b) => a.from - b.from || a.to - b.to);
    let deco = new RangeSetBuilder(), active = [], pos = 0;
    let scan = state2.doc.iter(), scanPos = 0, docLen = state2.doc.length;
    for (let i2 = 0; ; ) {
      let next = i2 == sorted.length ? null : sorted[i2];
      if (!next && !active.length)
        break;
      let from, to;
      if (active.length) {
        from = pos;
        to = active.reduce((p, d) => Math.min(p, d.to), next && next.from > from ? next.from : 1e8);
      } else {
        from = next.from;
        if (from > docLen)
          break;
        to = next.to;
        active.push(next);
        i2++;
      }
      while (i2 < sorted.length) {
        let next2 = sorted[i2];
        if (next2.from == from && (next2.to > next2.from || next2.to == from)) {
          active.push(next2);
          i2++;
          to = Math.min(next2.to, to);
        } else {
          to = Math.min(next2.from, to);
          break;
        }
      }
      to = Math.min(to, docLen);
      let widget = false;
      if (active.some((d) => d.from == from && (d.to == to || to == docLen))) {
        widget = from == to;
        if (!widget && to - from < 10) {
          let behind = from - (scanPos + scan.value.length);
          if (behind > 0) {
            scan.next(behind);
            scanPos = from;
          }
          for (let check = from; ; ) {
            if (check >= to) {
              widget = true;
              break;
            }
            if (!scan.lineBreak && scanPos + scan.value.length > check)
              break;
            check = scanPos + scan.value.length;
            scanPos += scan.value.length;
            scan.next();
          }
        }
      }
      let sev = maxSeverity(active);
      if (widget) {
        deco.add(from, from, Decoration.widget({
          widget: new DiagnosticWidget(sev),
          diagnostics: active.slice()
        }));
      } else {
        let markClass = active.reduce((c, d) => d.markClass ? c + " " + d.markClass : c, "");
        deco.add(from, to, Decoration.mark({
          class: "cm-lintRange cm-lintRange-" + sev + markClass,
          diagnostics: active.slice(),
          inclusiveEnd: active.some((a) => a.to > to)
        }));
      }
      pos = to;
      if (pos == docLen)
        break;
      for (let i3 = 0; i3 < active.length; i3++)
        if (active[i3].to <= pos)
          active.splice(i3--, 1);
    }
    let set = deco.finish();
    return new LintState(set, panel, findDiagnostic(set));
  }
}
function findDiagnostic(diagnostics, diagnostic = null, after = 0) {
  let found = null;
  diagnostics.between(after, 1e9, (from, to, { spec }) => {
    if (diagnostic && spec.diagnostics.indexOf(diagnostic) < 0)
      return;
    if (!found)
      found = new SelectedDiagnostic(from, to, diagnostic || spec.diagnostics[0]);
    else if (spec.diagnostics.indexOf(found.diagnostic) < 0)
      return false;
    else
      found = new SelectedDiagnostic(found.from, to, found.diagnostic);
  });
  return found;
}
function hideTooltip(tr, tooltip) {
  let from = tooltip.pos, to = tooltip.end || from;
  let result = tr.state.facet(lintConfig).hideOn(tr, from, to);
  if (result != null)
    return result;
  let line = tr.startState.doc.lineAt(tooltip.pos);
  return !!(tr.effects.some((e) => e.is(setDiagnosticsEffect)) || tr.changes.touchesRange(line.from, Math.max(line.to, to)));
}
function maybeEnableLint(state2, effects) {
  return state2.field(lintState, false) ? effects : effects.concat(StateEffect.appendConfig.of(lintExtensions));
}
const setDiagnosticsEffect = /* @__PURE__ */ StateEffect.define();
const togglePanel = /* @__PURE__ */ StateEffect.define();
const movePanelSelection = /* @__PURE__ */ StateEffect.define();
const lintState = /* @__PURE__ */ StateField.define({
  create() {
    return new LintState(Decoration.none, null, null);
  },
  update(value, tr) {
    if (tr.docChanged && value.diagnostics.size) {
      let mapped = value.diagnostics.map(tr.changes), selected = null, panel = value.panel;
      if (value.selected) {
        let selPos = tr.changes.mapPos(value.selected.from, 1);
        selected = findDiagnostic(mapped, value.selected.diagnostic, selPos) || findDiagnostic(mapped, null, selPos);
      }
      if (!mapped.size && panel && tr.state.facet(lintConfig).autoPanel)
        panel = null;
      value = new LintState(mapped, panel, selected);
    }
    for (let effect of tr.effects) {
      if (effect.is(setDiagnosticsEffect)) {
        let panel = !tr.state.facet(lintConfig).autoPanel ? value.panel : effect.value.length ? LintPanel.open : null;
        value = LintState.init(effect.value, panel, tr.state);
      } else if (effect.is(togglePanel)) {
        value = new LintState(value.diagnostics, effect.value ? LintPanel.open : null, value.selected);
      } else if (effect.is(movePanelSelection)) {
        value = new LintState(value.diagnostics, value.panel, effect.value);
      }
    }
    return value;
  },
  provide: (f) => [
    showPanel.from(f, (val) => val.panel),
    EditorView.decorations.from(f, (s) => s.diagnostics)
  ]
});
const activeMark = /* @__PURE__ */ Decoration.mark({ class: "cm-lintRange cm-lintRange-active" });
function lintTooltip(view, pos, side) {
  let { diagnostics } = view.state.field(lintState);
  let found, start = -1, end = -1;
  diagnostics.between(pos - (side < 0 ? 1 : 0), pos + (side > 0 ? 1 : 0), (from, to, { spec }) => {
    if (pos >= from && pos <= to && (from == to || (pos > from || side > 0) && (pos < to || side < 0))) {
      found = spec.diagnostics;
      start = from;
      end = to;
      return false;
    }
  });
  let diagnosticFilter = view.state.facet(lintConfig).tooltipFilter;
  if (found && diagnosticFilter)
    found = diagnosticFilter(found, view.state);
  if (!found)
    return null;
  return {
    pos: start,
    end,
    above: true,
    create() {
      return { dom: diagnosticsTooltip(view, found) };
    }
  };
}
function diagnosticsTooltip(view, diagnostics) {
  return crelt("ul", { class: "cm-tooltip-lint" }, diagnostics.map((d) => renderDiagnostic(view, d, false)));
}
const openLintPanel = (view) => {
  let field = view.state.field(lintState, false);
  if (!field || !field.panel)
    view.dispatch({ effects: maybeEnableLint(view.state, [togglePanel.of(true)]) });
  let panel = getPanel(view, LintPanel.open);
  if (panel)
    panel.dom.querySelector(".cm-panel-lint ul").focus();
  return true;
};
const closeLintPanel = (view) => {
  let field = view.state.field(lintState, false);
  if (!field || !field.panel)
    return false;
  view.dispatch({ effects: togglePanel.of(false) });
  return true;
};
const nextDiagnostic = (view) => {
  let field = view.state.field(lintState, false);
  if (!field)
    return false;
  let sel = view.state.selection.main, next = findDiagnostic(field.diagnostics, null, sel.to + 1);
  if (!next) {
    next = findDiagnostic(field.diagnostics, null, 0);
    if (!next || next.from == sel.from && next.to == sel.to)
      return false;
  }
  view.dispatch({ selection: { anchor: next.from, head: next.to }, scrollIntoView: true });
  activateHover(view, next.from, 1, {
    tooltip: lintHover,
    until: (tr) => tr.docChanged || tr.newSelection.main.head < next.from || tr.newSelection.main.head > next.to
  });
  return true;
};
const lintKeymap = [
  { key: "Mod-Shift-m", run: openLintPanel, preventDefault: true },
  { key: "F8", run: nextDiagnostic }
];
const lintConfig = /* @__PURE__ */ Facet.define({
  combine(input) {
    return {
      sources: input.map((i2) => i2.source).filter((x) => x != null),
      ...combineConfig(input.map((i2) => i2.config), {
        delay: 750,
        markerFilter: null,
        tooltipFilter: null,
        needsRefresh: null,
        hideOn: () => null
      }, {
        delay: Math.max,
        markerFilter: combineFilter,
        tooltipFilter: combineFilter,
        needsRefresh: (a, b) => !a ? b : !b ? a : (u) => a(u) || b(u),
        hideOn: (a, b) => !a ? b : !b ? a : (t2, x, y) => a(t2, x, y) || b(t2, x, y),
        autoPanel: (a, b) => a || b
      })
    };
  }
});
function combineFilter(a, b) {
  return !a ? b : !b ? a : (d, s) => b(a(d, s), s);
}
function assignKeys(actions) {
  let assigned = [];
  if (actions)
    actions: for (let { name: name2 } of actions) {
      for (let i2 = 0; i2 < name2.length; i2++) {
        let ch = name2[i2];
        if (/[a-zA-Z]/.test(ch) && !assigned.some((c) => c.toLowerCase() == ch.toLowerCase())) {
          assigned.push(ch);
          continue actions;
        }
      }
      assigned.push("");
    }
  return assigned;
}
function renderDiagnostic(view, diagnostic, inPanel) {
  var _a2;
  let keys2 = inPanel ? assignKeys(diagnostic.actions) : [];
  return crelt("li", { class: "cm-diagnostic cm-diagnostic-" + diagnostic.severity }, crelt("span", { class: "cm-diagnosticText" }, diagnostic.renderMessage ? diagnostic.renderMessage(view) : diagnostic.message), (_a2 = diagnostic.actions) === null || _a2 === void 0 ? void 0 : _a2.map((action, i2) => {
    let fired = false, click = (e) => {
      e.preventDefault();
      if (fired)
        return;
      fired = true;
      let found = findDiagnostic(view.state.field(lintState).diagnostics, diagnostic);
      if (found)
        action.apply(view, found.from, found.to);
    };
    let { name: name2 } = action, keyIndex = keys2[i2] ? name2.indexOf(keys2[i2]) : -1;
    let nameElt = keyIndex < 0 ? name2 : [
      name2.slice(0, keyIndex),
      crelt("u", name2.slice(keyIndex, keyIndex + 1)),
      name2.slice(keyIndex + 1)
    ];
    let markClass = action.markClass ? " " + action.markClass : "";
    return crelt("button", {
      type: "button",
      class: "cm-diagnosticAction" + markClass,
      onclick: click,
      onmousedown: click,
      "aria-label": ` Action: ${name2}${keyIndex < 0 ? "" : ` (access key "${keys2[i2]})"`}.`
    }, nameElt);
  }), diagnostic.source && crelt("div", { class: "cm-diagnosticSource" }, diagnostic.source));
}
class DiagnosticWidget extends WidgetType {
  constructor(sev) {
    super();
    this.sev = sev;
  }
  eq(other) {
    return other.sev == this.sev;
  }
  toDOM() {
    return crelt("span", { class: "cm-lintPoint cm-lintPoint-" + this.sev });
  }
}
class PanelItem {
  constructor(view, diagnostic) {
    this.diagnostic = diagnostic;
    this.id = "item_" + Math.floor(Math.random() * 4294967295).toString(16);
    this.dom = renderDiagnostic(view, diagnostic, true);
    this.dom.id = this.id;
    this.dom.setAttribute("role", "option");
  }
}
class LintPanel {
  constructor(view) {
    this.view = view;
    this.items = [];
    let onkeydown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey)
        return;
      if (event.keyCode == 27) {
        closeLintPanel(this.view);
        this.view.focus();
      } else if (event.keyCode == 38 || event.keyCode == 33) {
        this.moveSelection((this.selectedIndex - 1 + this.items.length) % this.items.length);
      } else if (event.keyCode == 40 || event.keyCode == 34) {
        this.moveSelection((this.selectedIndex + 1) % this.items.length);
      } else if (event.keyCode == 36) {
        this.moveSelection(0);
      } else if (event.keyCode == 35) {
        this.moveSelection(this.items.length - 1);
      } else if (event.keyCode == 13) {
        this.view.focus();
      } else if (event.keyCode >= 65 && event.keyCode <= 90 && this.selectedIndex >= 0) {
        let { diagnostic } = this.items[this.selectedIndex], keys2 = assignKeys(diagnostic.actions);
        for (let i2 = 0; i2 < keys2.length; i2++)
          if (keys2[i2].toUpperCase().charCodeAt(0) == event.keyCode) {
            let found = findDiagnostic(this.view.state.field(lintState).diagnostics, diagnostic);
            if (found)
              diagnostic.actions[i2].apply(view, found.from, found.to);
          }
      } else {
        return;
      }
      event.preventDefault();
    };
    let onclick = (event) => {
      for (let i2 = 0; i2 < this.items.length; i2++) {
        if (this.items[i2].dom.contains(event.target))
          this.moveSelection(i2);
      }
    };
    this.list = crelt("ul", {
      tabIndex: 0,
      role: "listbox",
      "aria-label": this.view.state.phrase("Diagnostics"),
      onkeydown,
      onclick
    });
    this.dom = crelt("div", { class: "cm-panel-lint" }, this.list, crelt("button", {
      type: "button",
      name: "close",
      "aria-label": this.view.state.phrase("close"),
      onclick: () => closeLintPanel(this.view)
    }, "×"));
    this.update();
  }
  get selectedIndex() {
    let selected = this.view.state.field(lintState).selected;
    if (!selected)
      return -1;
    for (let i2 = 0; i2 < this.items.length; i2++)
      if (this.items[i2].diagnostic == selected.diagnostic)
        return i2;
    return -1;
  }
  update() {
    let { diagnostics, selected } = this.view.state.field(lintState);
    let i2 = 0, needsSync = false, newSelectedItem = null;
    let seen = /* @__PURE__ */ new Set();
    diagnostics.between(0, this.view.state.doc.length, (_start, _end, { spec }) => {
      for (let diagnostic of spec.diagnostics) {
        if (seen.has(diagnostic))
          continue;
        seen.add(diagnostic);
        let found = -1, item;
        for (let j = i2; j < this.items.length; j++)
          if (this.items[j].diagnostic == diagnostic) {
            found = j;
            break;
          }
        if (found < 0) {
          item = new PanelItem(this.view, diagnostic);
          this.items.splice(i2, 0, item);
          needsSync = true;
        } else {
          item = this.items[found];
          if (found > i2) {
            this.items.splice(i2, found - i2);
            needsSync = true;
          }
        }
        if (selected && item.diagnostic == selected.diagnostic) {
          if (!item.dom.hasAttribute("aria-selected")) {
            item.dom.setAttribute("aria-selected", "true");
            newSelectedItem = item;
          }
        } else if (item.dom.hasAttribute("aria-selected")) {
          item.dom.removeAttribute("aria-selected");
        }
        i2++;
      }
    });
    while (i2 < this.items.length && !(this.items.length == 1 && this.items[0].diagnostic.from < 0)) {
      needsSync = true;
      this.items.pop();
    }
    if (this.items.length == 0) {
      this.items.push(new PanelItem(this.view, {
        from: -1,
        to: -1,
        severity: "info",
        message: this.view.state.phrase("No diagnostics")
      }));
      needsSync = true;
    }
    if (newSelectedItem) {
      this.list.setAttribute("aria-activedescendant", newSelectedItem.id);
      this.view.requestMeasure({
        key: this,
        read: () => ({ sel: newSelectedItem.dom.getBoundingClientRect(), panel: this.list.getBoundingClientRect() }),
        write: ({ sel, panel }) => {
          let scaleY = panel.height / this.list.offsetHeight;
          if (sel.top < panel.top)
            this.list.scrollTop -= (panel.top - sel.top) / scaleY;
          else if (sel.bottom > panel.bottom)
            this.list.scrollTop += (sel.bottom - panel.bottom) / scaleY;
        }
      });
    } else if (this.selectedIndex < 0) {
      this.list.removeAttribute("aria-activedescendant");
    }
    if (needsSync)
      this.sync();
  }
  sync() {
    let domPos = this.list.firstChild;
    function rm2() {
      let prev = domPos;
      domPos = prev.nextSibling;
      prev.remove();
    }
    for (let item of this.items) {
      if (item.dom.parentNode == this.list) {
        while (domPos != item.dom)
          rm2();
        domPos = item.dom.nextSibling;
      } else {
        this.list.insertBefore(item.dom, domPos);
      }
    }
    while (domPos)
      rm2();
  }
  moveSelection(selectedIndex) {
    if (this.selectedIndex < 0)
      return;
    let field = this.view.state.field(lintState);
    let selection2 = findDiagnostic(field.diagnostics, this.items[selectedIndex].diagnostic);
    if (!selection2)
      return;
    this.view.dispatch({
      selection: { anchor: selection2.from, head: selection2.to },
      scrollIntoView: true,
      effects: movePanelSelection.of(selection2)
    });
  }
  static open(view) {
    return new LintPanel(view);
  }
}
function svg(content2, attrs = `viewBox="0 0 40 40"`) {
  return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${encodeURIComponent(content2)}</svg>')`;
}
function underline(color) {
  return svg(`<path d="m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0" stroke="${color}" fill="none" stroke-width=".7"/>`, `width="6" height="3"`);
}
const baseTheme = /* @__PURE__ */ EditorView.baseTheme({
  ".cm-diagnostic": {
    padding: "3px 6px 3px 8px",
    marginLeft: "-1px",
    display: "block",
    whiteSpace: "pre-wrap"
  },
  ".cm-diagnostic-error": { borderLeft: "5px solid #d11" },
  ".cm-diagnostic-warning": { borderLeft: "5px solid orange" },
  ".cm-diagnostic-info": { borderLeft: "5px solid #999" },
  ".cm-diagnostic-hint": { borderLeft: "5px solid #66d" },
  ".cm-diagnosticAction": {
    font: "inherit",
    border: "none",
    padding: "2px 4px",
    backgroundColor: "#444",
    color: "white",
    borderRadius: "3px",
    marginLeft: "8px",
    cursor: "pointer"
  },
  ".cm-diagnosticSource": {
    fontSize: "70%",
    opacity: 0.7
  },
  ".cm-lintRange": {
    backgroundPosition: "left bottom",
    backgroundRepeat: "repeat-x",
    paddingBottom: "0.7px"
  },
  ".cm-lintRange-error": { backgroundImage: /* @__PURE__ */ underline("#f11") },
  ".cm-lintRange-warning": { backgroundImage: /* @__PURE__ */ underline("orange") },
  ".cm-lintRange-info": { backgroundImage: /* @__PURE__ */ underline("#999") },
  ".cm-lintRange-hint": { backgroundImage: /* @__PURE__ */ underline("#66d") },
  ".cm-lintRange-active": { backgroundColor: "#ffdd9980" },
  ".cm-tooltip-lint": {
    padding: 0,
    margin: 0
  },
  ".cm-lintPoint": {
    position: "relative",
    "&:after": {
      content: '""',
      position: "absolute",
      bottom: 0,
      left: "-2px",
      borderLeft: "3px solid transparent",
      borderRight: "3px solid transparent",
      borderBottom: "4px solid #d11"
    }
  },
  ".cm-lintPoint-warning": {
    "&:after": { borderBottomColor: "orange" }
  },
  ".cm-lintPoint-info": {
    "&:after": { borderBottomColor: "#999" }
  },
  ".cm-lintPoint-hint": {
    "&:after": { borderBottomColor: "#66d" }
  },
  ".cm-panel.cm-panel-lint": {
    position: "relative",
    "& ul": {
      maxHeight: "100px",
      overflowY: "auto",
      "& [aria-selected]": {
        backgroundColor: "#ddd",
        "& u": { textDecoration: "underline" }
      },
      "&:focus [aria-selected]": {
        background_fallback: "#bdf",
        backgroundColor: "Highlight",
        color_fallback: "white",
        color: "HighlightText"
      },
      "& u": { textDecoration: "none" },
      padding: 0,
      margin: 0
    },
    "& [name=close]": {
      position: "absolute",
      top: "0",
      right: "2px",
      background: "inherit",
      border: "none",
      font: "inherit",
      padding: 0,
      margin: 0
    }
  },
  "&dark .cm-lintRange-active": { backgroundColor: "#86714a80" },
  "&dark .cm-panel.cm-panel-lint ul": {
    "& [aria-selected]": {
      backgroundColor: "#2e343e"
    }
  }
});
function severityWeight(sev) {
  return sev == "error" ? 4 : sev == "warning" ? 3 : sev == "info" ? 2 : 1;
}
function maxSeverity(diagnostics) {
  let sev = "hint", weight = 1;
  for (let d of diagnostics) {
    let w = severityWeight(d.severity);
    if (w > weight) {
      weight = w;
      sev = d.severity;
    }
  }
  return sev;
}
const lintHover = /* @__PURE__ */ hoverTooltip(lintTooltip, { hideOn: hideTooltip });
const lintExtensions = [
  lintState,
  /* @__PURE__ */ EditorView.decorations.compute([lintState], (state2) => {
    let { selected, panel } = state2.field(lintState);
    return !selected || !panel || selected.from == selected.to ? Decoration.none : Decoration.set([
      activeMark.range(selected.from, selected.to)
    ]);
  }),
  lintHover,
  baseTheme
];
const basicSetup = /* @__PURE__ */ (() => [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
])();
var define_process_env_default = {};
class Stack {
  /**
  @internal
  */
  constructor(p, stack, state2, reducePos, pos, score2, buffer, bufferBase, curContext, lookAhead = 0, parent) {
    this.p = p;
    this.stack = stack;
    this.state = state2;
    this.reducePos = reducePos;
    this.pos = pos;
    this.score = score2;
    this.buffer = buffer;
    this.bufferBase = bufferBase;
    this.curContext = curContext;
    this.lookAhead = lookAhead;
    this.parent = parent;
  }
  /**
  @internal
  */
  toString() {
    return `[${this.stack.filter((_, i2) => i2 % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
  }
  // Start an empty stack
  /**
  @internal
  */
  static start(p, state2, pos = 0) {
    let cx = p.parser.context;
    return new Stack(p, [], state2, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
  }
  /**
  The stack's current [context](#lr.ContextTracker) value, if
  any. Its type will depend on the context tracker's type
  parameter, or it will be `null` if there is no context
  tracker.
  */
  get context() {
    return this.curContext ? this.curContext.context : null;
  }
  // Push a state onto the stack, tracking its start position as well
  // as the buffer base at that point.
  /**
  @internal
  */
  pushState(state2, start) {
    this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
    this.state = state2;
  }
  // Apply a reduce action
  /**
  @internal
  */
  reduce(action) {
    var _a2;
    let depth = action >> 19, type = action & 65535;
    let { parser: parser2 } = this.p;
    let lookaheadRecord = this.reducePos < this.pos - 25 && this.setLookAhead(this.pos);
    let dPrec = parser2.dynamicPrecedence(type);
    if (dPrec)
      this.score += dPrec;
    if (depth == 0) {
      if (type < parser2.minRepeatTerm && this.reducePos < this.pos)
        this.reducePos = this.pos;
      this.pushState(parser2.getGoto(this.state, type, true), this.reducePos);
      if (type < parser2.minRepeatTerm)
        this.storeNode(type, this.reducePos, this.reducePos, lookaheadRecord ? 8 : 4, true);
      this.reduceContext(type, this.reducePos);
      return;
    }
    let base2 = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
    let start = base2 ? this.stack[base2 - 2] : this.p.ranges[0].from;
    if (type < parser2.minRepeatTerm && start == this.reducePos && this.reducePos < this.pos)
      this.reducePos = this.pos;
    let size = this.reducePos - start;
    if (size >= 2e3 && !((_a2 = this.p.parser.nodeSet.types[type]) === null || _a2 === void 0 ? void 0 : _a2.isAnonymous)) {
      if (start == this.p.lastBigReductionStart) {
        this.p.bigReductionCount++;
        this.p.lastBigReductionSize = size;
      } else if (this.p.lastBigReductionSize < size) {
        this.p.bigReductionCount = 1;
        this.p.lastBigReductionStart = start;
        this.p.lastBigReductionSize = size;
      }
    }
    let bufferBase = base2 ? this.stack[base2 - 1] : 0, count = this.bufferBase + this.buffer.length - bufferBase;
    if (type < parser2.minRepeatTerm || action & 131072) {
      let pos = parser2.stateFlag(
        this.state,
        1
        /* StateFlag.Skipped */
      ) ? this.pos : this.reducePos;
      this.storeNode(type, start, pos, count + 4, true);
    }
    if (action & 262144) {
      this.state = this.stack[base2];
    } else {
      let baseStateID = this.stack[base2 - 3];
      this.state = parser2.getGoto(baseStateID, type, true);
    }
    while (this.stack.length > base2)
      this.stack.pop();
    this.reduceContext(type, start);
  }
  // Shift a value into the buffer
  /**
  @internal
  */
  storeNode(term, start, end, size = 4, mustSink = false) {
    if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
      let top2 = this.buffer.length;
      if (top2 > 0 && this.buffer[top2 - 4] == 0 && this.buffer[top2 - 1] > -1) {
        if (start == end)
          return;
        if (this.buffer[top2 - 2] >= start) {
          this.buffer[top2 - 2] = end;
          return;
        }
      }
    }
    if (!mustSink || this.pos == end) {
      this.buffer.push(term, start, end, size);
    } else {
      let index = this.buffer.length;
      if (index > 0 && (this.buffer[index - 4] != 0 || this.buffer[index - 1] < 0)) {
        let mustMove = false;
        for (let scan = index; scan > 0 && this.buffer[scan - 2] > end; scan -= 4) {
          if (this.buffer[scan - 1] >= 0) {
            mustMove = true;
            break;
          }
        }
        if (mustMove)
          while (index > 0 && this.buffer[index - 2] > end) {
            this.buffer[index] = this.buffer[index - 4];
            this.buffer[index + 1] = this.buffer[index - 3];
            this.buffer[index + 2] = this.buffer[index - 2];
            this.buffer[index + 3] = this.buffer[index - 1];
            index -= 4;
            if (size > 4)
              size -= 4;
          }
      }
      this.buffer[index] = term;
      this.buffer[index + 1] = start;
      this.buffer[index + 2] = end;
      this.buffer[index + 3] = size;
    }
  }
  // Apply a shift action
  /**
  @internal
  */
  shift(action, type, start, end) {
    if (action & 131072) {
      this.pushState(action & 65535, this.pos);
    } else if ((action & 262144) == 0) {
      let nextState = action, { parser: parser2 } = this.p;
      this.pos = end;
      let skipped = parser2.stateFlag(
        nextState,
        1
        /* StateFlag.Skipped */
      );
      if (!skipped && (end > start || type <= parser2.maxNode))
        this.reducePos = end;
      this.pushState(nextState, skipped ? start : Math.min(start, this.reducePos));
      this.shiftContext(type, start);
      if (type <= parser2.maxNode)
        this.buffer.push(type, start, end, 4);
    } else {
      this.pos = end;
      this.shiftContext(type, start);
      if (type <= this.p.parser.maxNode)
        this.buffer.push(type, start, end, 4);
    }
  }
  // Apply an action
  /**
  @internal
  */
  apply(action, next, nextStart, nextEnd) {
    if (action & 65536)
      this.reduce(action);
    else
      this.shift(action, next, nextStart, nextEnd);
  }
  // Add a prebuilt (reused) node into the buffer.
  /**
  @internal
  */
  useNode(value, next, start) {
    let index = this.p.reused.length - 1;
    if (index < 0 || this.p.reused[index] != value) {
      this.p.reused.push(value);
      index++;
    }
    let end = this.reducePos = this.pos = start + value.length;
    this.pushState(next, start);
    this.buffer.push(
      index,
      start,
      end,
      -1
      /* size == -1 means this is a reused value */
    );
    if (this.curContext)
      this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
  }
  // Split the stack. Due to the buffer sharing and the fact
  // that `this.stack` tends to stay quite shallow, this isn't very
  // expensive.
  /**
  @internal
  */
  split() {
    let parent = this;
    let off = parent.buffer.length;
    if (off && parent.buffer[off - 4] == 0)
      off -= 4;
    while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
      off -= 4;
    let buffer = parent.buffer.slice(off), base2 = parent.bufferBase + off;
    while (parent && base2 == parent.bufferBase)
      parent = parent.parent;
    return new Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base2, this.curContext, this.lookAhead, parent);
  }
  // Try to recover from an error by 'deleting' (ignoring) one token.
  /**
  @internal
  */
  recoverByDelete(next, nextEnd) {
    let isNode = next <= this.p.parser.maxNode;
    if (isNode)
      this.storeNode(next, this.pos, nextEnd, 4);
    this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
    this.pos = this.reducePos = nextEnd;
    this.score -= 190;
  }
  /**
  Check if the given term would be able to be shifted (optionally
  after some reductions) on this stack. This can be useful for
  external tokenizers that want to make sure they only provide a
  given token when it applies.
  */
  canShift(term) {
    for (let sim = new SimulatedStack(this); ; ) {
      let action = this.p.parser.stateSlot(
        sim.state,
        4
        /* ParseState.DefaultReduce */
      ) || this.p.parser.hasAction(sim.state, term);
      if (action == 0)
        return false;
      if ((action & 65536) == 0)
        return true;
      sim.reduce(action);
    }
  }
  // Apply up to Recover.MaxNext recovery actions that conceptually
  // inserts some missing token or rule.
  /**
  @internal
  */
  recoverByInsert(next) {
    if (this.stack.length >= 300)
      return [];
    let nextStates = this.p.parser.nextStates(this.state);
    if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
      let best = [];
      for (let i2 = 0, s; i2 < nextStates.length; i2 += 2) {
        if ((s = nextStates[i2 + 1]) != this.state && this.p.parser.hasAction(s, next))
          best.push(nextStates[i2], s);
      }
      if (this.stack.length < 120)
        for (let i2 = 0; best.length < 4 << 1 && i2 < nextStates.length; i2 += 2) {
          let s = nextStates[i2 + 1];
          if (!best.some((v, i22) => i22 & 1 && v == s))
            best.push(nextStates[i2], s);
        }
      nextStates = best;
    }
    let result = [];
    for (let i2 = 0; i2 < nextStates.length && result.length < 4; i2 += 2) {
      let s = nextStates[i2 + 1];
      if (s == this.state)
        continue;
      let stack = this.split();
      stack.pushState(s, this.pos);
      stack.storeNode(0, stack.pos, stack.pos, 4, true);
      stack.shiftContext(nextStates[i2], this.pos);
      stack.reducePos = this.pos;
      stack.score -= 200;
      result.push(stack);
    }
    return result;
  }
  // Force a reduce, if possible. Return false if that can't
  // be done.
  /**
  @internal
  */
  forceReduce() {
    let { parser: parser2 } = this.p;
    let reduce = parser2.stateSlot(
      this.state,
      5
      /* ParseState.ForcedReduce */
    );
    if ((reduce & 65536) == 0)
      return false;
    if (!parser2.validAction(this.state, reduce)) {
      let depth = reduce >> 19, term = reduce & 65535;
      let target = this.stack.length - depth * 3;
      if (target < 0 || parser2.getGoto(this.stack[target], term, false) < 0) {
        let backup = this.findForcedReduction();
        if (backup == null)
          return false;
        reduce = backup;
      }
      this.storeNode(0, this.pos, this.pos, 4, true);
      this.score -= 100;
    }
    this.reducePos = this.pos;
    this.reduce(reduce);
    return true;
  }
  /**
  Try to scan through the automaton to find some kind of reduction
  that can be applied. Used when the regular ForcedReduce field
  isn't a valid action. @internal
  */
  findForcedReduction() {
    let { parser: parser2 } = this.p, seen = [];
    let explore = (state2, depth) => {
      if (seen.includes(state2))
        return;
      seen.push(state2);
      return parser2.allActions(state2, (action) => {
        if (action & (262144 | 131072)) ;
        else if (action & 65536) {
          let rDepth = (action >> 19) - depth;
          if (rDepth > 1) {
            let term = action & 65535, target = this.stack.length - rDepth * 3;
            if (target >= 0 && parser2.getGoto(this.stack[target], term, false) >= 0)
              return rDepth << 19 | 65536 | term;
          }
        } else {
          let found = explore(action, depth + 1);
          if (found != null)
            return found;
        }
      });
    };
    return explore(this.state, 0);
  }
  /**
  @internal
  */
  forceAll() {
    while (!this.p.parser.stateFlag(
      this.state,
      2
      /* StateFlag.Accepting */
    )) {
      if (!this.forceReduce()) {
        this.storeNode(0, this.pos, this.pos, 4, true);
        break;
      }
    }
    return this;
  }
  /**
  Check whether this state has no further actions (assumed to be a direct descendant of the
  top state, since any other states must be able to continue
  somehow). @internal
  */
  get deadEnd() {
    if (this.stack.length != 3)
      return false;
    let { parser: parser2 } = this.p;
    return parser2.data[parser2.stateSlot(
      this.state,
      1
      /* ParseState.Actions */
    )] == 65535 && !parser2.stateSlot(
      this.state,
      4
      /* ParseState.DefaultReduce */
    );
  }
  /**
  Restart the stack (put it back in its start state). Only safe
  when this.stack.length == 3 (state is directly below the top
  state). @internal
  */
  restart() {
    this.storeNode(0, this.pos, this.pos, 4, true);
    this.state = this.stack[0];
    this.stack.length = 0;
  }
  /**
  @internal
  */
  sameState(other) {
    if (this.state != other.state || this.stack.length != other.stack.length)
      return false;
    for (let i2 = 0; i2 < this.stack.length; i2 += 3)
      if (this.stack[i2] != other.stack[i2])
        return false;
    return true;
  }
  /**
  Get the parser used by this stack.
  */
  get parser() {
    return this.p.parser;
  }
  /**
  Test whether a given dialect (by numeric ID, as exported from
  the terms file) is enabled.
  */
  dialectEnabled(dialectID) {
    return this.p.parser.dialect.flags[dialectID];
  }
  shiftContext(term, start) {
    if (this.curContext)
      this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start)));
  }
  reduceContext(term, start) {
    if (this.curContext)
      this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start)));
  }
  /**
  @internal
  */
  emitContext() {
    let last2 = this.buffer.length - 1;
    if (last2 < 0 || this.buffer[last2] != -3)
      this.storeNode(this.curContext.hash, this.reducePos, this.reducePos, -3, true);
  }
  /**
  @internal
  */
  emitLookAhead() {
    let last2 = this.buffer.length - 1;
    if (last2 < 0 || this.buffer[last2] != -4)
      this.buffer.push(this.lookAhead, this.pos, this.pos, -4);
  }
  updateContext(context) {
    if (context != this.curContext.context) {
      let newCx = new StackContext(this.curContext.tracker, context);
      if (newCx.hash != this.curContext.hash)
        this.emitContext();
      this.curContext = newCx;
    }
  }
  /**
  @internal
  */
  setLookAhead(lookAhead) {
    if (lookAhead <= this.lookAhead)
      return false;
    this.emitLookAhead();
    this.lookAhead = lookAhead;
    return true;
  }
  /**
  @internal
  */
  close() {
    if (this.curContext && this.curContext.tracker.strict)
      this.emitContext();
    if (this.lookAhead > 0)
      this.emitLookAhead();
  }
}
class StackContext {
  constructor(tracker, context) {
    this.tracker = tracker;
    this.context = context;
    this.hash = tracker.strict ? tracker.hash(context) : 0;
  }
}
class SimulatedStack {
  constructor(start) {
    this.start = start;
    this.state = start.state;
    this.stack = start.stack;
    this.base = this.stack.length;
  }
  reduce(action) {
    let term = action & 65535, depth = action >> 19;
    if (depth == 0) {
      if (this.stack == this.start.stack)
        this.stack = this.stack.slice();
      this.stack.push(this.state, 0, 0);
      this.base += 3;
    } else {
      this.base -= (depth - 1) * 3;
    }
    let goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
    this.state = goto;
  }
}
class StackBufferCursor {
  constructor(stack, pos, index) {
    this.stack = stack;
    this.pos = pos;
    this.index = index;
    this.buffer = stack.buffer;
    if (this.index == 0)
      this.maybeNext();
  }
  static create(stack, pos = stack.bufferBase + stack.buffer.length) {
    return new StackBufferCursor(stack, pos, pos - stack.bufferBase);
  }
  maybeNext() {
    let next = this.stack.parent;
    if (next != null) {
      this.index = this.stack.bufferBase - next.bufferBase;
      this.stack = next;
      this.buffer = next.buffer;
    }
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  next() {
    this.index -= 4;
    this.pos -= 4;
    if (this.index == 0)
      this.maybeNext();
  }
  fork() {
    return new StackBufferCursor(this.stack, this.pos, this.index);
  }
}
function decodeArray(input, Type = Uint16Array) {
  if (typeof input != "string")
    return input;
  let array = null;
  for (let pos = 0, out = 0; pos < input.length; ) {
    let value = 0;
    for (; ; ) {
      let next = input.charCodeAt(pos++), stop = false;
      if (next == 126) {
        value = 65535;
        break;
      }
      if (next >= 92)
        next--;
      if (next >= 34)
        next--;
      let digit = next - 32;
      if (digit >= 46) {
        digit -= 46;
        stop = true;
      }
      value += digit;
      if (stop)
        break;
      value *= 46;
    }
    if (array)
      array[out++] = value;
    else
      array = new Type(value);
  }
  return array;
}
class CachedToken {
  constructor() {
    this.start = -1;
    this.value = -1;
    this.end = -1;
    this.extended = -1;
    this.lookAhead = 0;
    this.mask = 0;
    this.context = 0;
  }
}
const nullToken = new CachedToken();
class InputStream {
  /**
  @internal
  */
  constructor(input, ranges) {
    this.input = input;
    this.ranges = ranges;
    this.chunk = "";
    this.chunkOff = 0;
    this.chunk2 = "";
    this.chunk2Pos = 0;
    this.next = -1;
    this.token = nullToken;
    this.rangeIndex = 0;
    this.pos = this.chunkPos = ranges[0].from;
    this.range = ranges[0];
    this.end = ranges[ranges.length - 1].to;
    this.readNext();
  }
  /**
  @internal
  */
  resolveOffset(offset, assoc) {
    let range = this.range, index = this.rangeIndex;
    let pos = this.pos + offset;
    while (pos < range.from) {
      if (!index)
        return null;
      let next = this.ranges[--index];
      pos -= range.from - next.to;
      range = next;
    }
    while (assoc < 0 ? pos > range.to : pos >= range.to) {
      if (index == this.ranges.length - 1)
        return null;
      let next = this.ranges[++index];
      pos += next.from - range.to;
      range = next;
    }
    return pos;
  }
  /**
  @internal
  */
  clipPos(pos) {
    if (pos >= this.range.from && pos < this.range.to)
      return pos;
    for (let range of this.ranges)
      if (range.to > pos)
        return Math.max(pos, range.from);
    return this.end;
  }
  /**
  Look at a code unit near the stream position. `.peek(0)` equals
  `.next`, `.peek(-1)` gives you the previous character, and so
  on.
  
  Note that looking around during tokenizing creates dependencies
  on potentially far-away content, which may reduce the
  effectiveness incremental parsing—when looking forward—or even
  cause invalid reparses when looking backward more than 25 code
  units, since the library does not track lookbehind.
  */
  peek(offset) {
    let idx = this.chunkOff + offset, pos, result;
    if (idx >= 0 && idx < this.chunk.length) {
      pos = this.pos + offset;
      result = this.chunk.charCodeAt(idx);
    } else {
      let resolved = this.resolveOffset(offset, 1);
      if (resolved == null)
        return -1;
      pos = resolved;
      if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
        result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
      } else {
        let i2 = this.rangeIndex, range = this.range;
        while (range.to <= pos)
          range = this.ranges[++i2];
        this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
        if (pos + this.chunk2.length > range.to)
          this.chunk2 = this.chunk2.slice(0, range.to - pos);
        result = this.chunk2.charCodeAt(0);
      }
    }
    if (pos >= this.token.lookAhead)
      this.token.lookAhead = pos + 1;
    return result;
  }
  /**
  Accept a token. By default, the end of the token is set to the
  current stream position, but you can pass an offset (relative to
  the stream position) to change that.
  */
  acceptToken(token, endOffset = 0) {
    let end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
    if (end == null || end < this.token.start)
      throw new RangeError("Token end out of bounds");
    this.token.value = token;
    this.token.end = end;
  }
  /**
  Accept a token ending at a specific given position.
  */
  acceptTokenTo(token, endPos) {
    this.token.value = token;
    this.token.end = endPos;
  }
  getChunk() {
    if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
      let { chunk, chunkPos } = this;
      this.chunk = this.chunk2;
      this.chunkPos = this.chunk2Pos;
      this.chunk2 = chunk;
      this.chunk2Pos = chunkPos;
      this.chunkOff = this.pos - this.chunkPos;
    } else {
      this.chunk2 = this.chunk;
      this.chunk2Pos = this.chunkPos;
      let nextChunk = this.input.chunk(this.pos);
      let end = this.pos + nextChunk.length;
      this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
      this.chunkPos = this.pos;
      this.chunkOff = 0;
    }
  }
  readNext() {
    if (this.chunkOff >= this.chunk.length) {
      this.getChunk();
      if (this.chunkOff == this.chunk.length)
        return this.next = -1;
    }
    return this.next = this.chunk.charCodeAt(this.chunkOff);
  }
  /**
  Move the stream forward N (defaults to 1) code units. Returns
  the new value of [`next`](#lr.InputStream.next).
  */
  advance(n = 1) {
    this.chunkOff += n;
    while (this.pos + n >= this.range.to) {
      if (this.rangeIndex == this.ranges.length - 1)
        return this.setDone();
      n -= this.range.to - this.pos;
      this.range = this.ranges[++this.rangeIndex];
      this.pos = this.range.from;
    }
    this.pos += n;
    if (this.pos >= this.token.lookAhead)
      this.token.lookAhead = this.pos + 1;
    return this.readNext();
  }
  setDone() {
    this.pos = this.chunkPos = this.end;
    this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
    this.chunk = "";
    return this.next = -1;
  }
  /**
  @internal
  */
  reset(pos, token) {
    if (token) {
      this.token = token;
      token.start = pos;
      token.lookAhead = pos + 1;
      token.value = token.extended = -1;
    } else {
      this.token = nullToken;
    }
    if (this.pos != pos) {
      this.pos = pos;
      if (pos == this.end) {
        this.setDone();
        return this;
      }
      while (pos < this.range.from)
        this.range = this.ranges[--this.rangeIndex];
      while (pos >= this.range.to)
        this.range = this.ranges[++this.rangeIndex];
      if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
        this.chunkOff = pos - this.chunkPos;
      } else {
        this.chunk = "";
        this.chunkOff = 0;
      }
      this.readNext();
    }
    return this;
  }
  /**
  @internal
  */
  read(from, to) {
    if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length)
      return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
    if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length)
      return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
    if (from >= this.range.from && to <= this.range.to)
      return this.input.read(from, to);
    let result = "";
    for (let r of this.ranges) {
      if (r.from >= to)
        break;
      if (r.to > from)
        result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
    }
    return result;
  }
}
class TokenGroup {
  constructor(data, id2) {
    this.data = data;
    this.id = id2;
  }
  token(input, stack) {
    let { parser: parser2 } = stack.p;
    readToken(this.data, input, stack, this.id, parser2.data, parser2.tokenPrecTable);
  }
}
TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
function readToken(data, input, stack, group, precTable, precOffset) {
  let state2 = 0, groupMask = 1 << group, { dialect } = stack.p.parser;
  scan: for (; ; ) {
    if ((groupMask & data[state2]) == 0)
      break;
    let accEnd = data[state2 + 1];
    for (let i2 = state2 + 3; i2 < accEnd; i2 += 2)
      if ((data[i2 + 1] & groupMask) > 0) {
        let term = data[i2];
        if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || overrides(term, input.token.value, precTable, precOffset))) {
          input.acceptToken(term);
          break;
        }
      }
    let next = input.next, low = 0, high = data[state2 + 2];
    if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535) {
      state2 = data[accEnd + high * 3 - 1];
      continue scan;
    }
    for (; low < high; ) {
      let mid = low + high >> 1;
      let index = accEnd + mid + (mid << 1);
      let from = data[index], to = data[index + 1] || 65536;
      if (next < from)
        high = mid;
      else if (next >= to)
        low = mid + 1;
      else {
        state2 = data[index + 2];
        input.advance();
        continue scan;
      }
    }
    break;
  }
}
function findOffset(data, start, term) {
  for (let i2 = start, next; (next = data[i2]) != 65535; i2++)
    if (next == term)
      return i2 - start;
  return -1;
}
function overrides(token, prev, tableData, tableOffset) {
  let iPrev = findOffset(tableData, tableOffset, prev);
  return iPrev < 0 || findOffset(tableData, tableOffset, token) < iPrev;
}
const verbose = typeof process != "undefined" && define_process_env_default && /\bparse\b/.test(define_process_env_default.LOG);
let stackIDs = null;
function cutAt(tree, pos, side) {
  let cursor2 = tree.cursor(IterMode.IncludeAnonymous);
  cursor2.moveTo(pos);
  for (; ; ) {
    if (!(side < 0 ? cursor2.childBefore(pos) : cursor2.childAfter(pos)))
      for (; ; ) {
        if ((side < 0 ? cursor2.to < pos : cursor2.from > pos) && !cursor2.type.isError)
          return side < 0 ? Math.max(0, Math.min(
            cursor2.to - 1,
            pos - 25
            /* Lookahead.Margin */
          )) : Math.min(tree.length, Math.max(
            cursor2.from + 1,
            pos + 25
            /* Lookahead.Margin */
          ));
        if (side < 0 ? cursor2.prevSibling() : cursor2.nextSibling())
          break;
        if (!cursor2.parent())
          return side < 0 ? 0 : tree.length;
      }
  }
}
class FragmentCursor {
  constructor(fragments, minRepeat) {
    this.fragments = fragments;
    this.minRepeat = minRepeat;
    this.i = 0;
    this.fragment = null;
    this.safeFrom = -1;
    this.safeTo = -1;
    this.trees = [];
    this.start = [];
    this.index = [];
    this.lastRepeat = null;
    this.lastRepeatPos = -1;
    this.nextFragment();
  }
  nextFragment() {
    let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
    if (fr) {
      this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
      this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
      while (this.trees.length) {
        this.trees.pop();
        this.start.pop();
        this.index.pop();
      }
      this.trees.push(fr.tree);
      this.start.push(-fr.offset);
      this.index.push(0);
      this.nextStart = this.safeFrom;
    } else {
      this.nextStart = 1e9;
    }
  }
  // `pos` must be >= any previously given `pos` for this cursor
  nodeAt(pos) {
    if (pos < this.nextStart)
      return null;
    while (this.fragment && this.safeTo <= pos)
      this.nextFragment();
    if (!this.fragment)
      return null;
    for (; ; ) {
      let last2 = this.trees.length - 1;
      if (last2 < 0) {
        this.nextFragment();
        return null;
      }
      let top2 = this.trees[last2], index = this.index[last2];
      if (index == top2.children.length) {
        this.trees.pop();
        this.start.pop();
        this.index.pop();
        continue;
      }
      let next = top2.children[index];
      let start = this.start[last2] + top2.positions[index];
      if (start > pos) {
        this.nextStart = start;
        return null;
      }
      if (next instanceof Tree) {
        let storeRepeat = start > this.lastRepeatPos && next.type.id >= this.minRepeat;
        if (start == pos || storeRepeat) {
          let end = start + next.length, lookahead;
          if (start >= this.safeFrom && end <= this.safeTo && (!(lookahead = next.prop(NodeProp.lookAhead)) || end + lookahead < this.fragment.to)) {
            if (storeRepeat) {
              this.lastRepeat = next;
              this.lastRepeatPos = start;
            }
            if (start == pos)
              return next;
          } else if (start == pos) {
            return null;
          }
        }
        this.index[last2]++;
        if (start + next.length >= Math.max(this.safeFrom, pos)) {
          this.trees.push(next);
          this.start.push(start);
          this.index.push(0);
        }
      } else {
        this.index[last2]++;
        this.nextStart = start + next.length;
      }
    }
  }
}
class TokenCache {
  constructor(parser2, stream) {
    this.stream = stream;
    this.tokens = [];
    this.mainToken = null;
    this.actions = [];
    this.tokens = parser2.tokenizers.map((_) => new CachedToken());
  }
  getActions(stack) {
    let actionIndex = 0;
    let main = null;
    let { parser: parser2 } = stack.p, { tokenizers } = parser2;
    let mask = parser2.stateSlot(
      stack.state,
      3
      /* ParseState.TokenizerMask */
    );
    let context = stack.curContext ? stack.curContext.hash : 0;
    let lookAhead = 0;
    for (let i2 = 0; i2 < tokenizers.length; i2++) {
      if ((1 << i2 & mask) == 0)
        continue;
      let tokenizer = tokenizers[i2], token = this.tokens[i2];
      if (main && !tokenizer.fallback)
        continue;
      if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
        this.updateCachedToken(token, tokenizer, stack);
        token.mask = mask;
        token.context = context;
      }
      if (token.lookAhead > token.end + 25)
        lookAhead = Math.max(token.lookAhead, lookAhead);
      if (token.value != 0) {
        let startIndex = actionIndex;
        if (token.extended > -1)
          actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
        actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
        if (!tokenizer.extend) {
          main = token;
          if (actionIndex > startIndex)
            break;
        }
      }
    }
    while (this.actions.length > actionIndex)
      this.actions.pop();
    if (lookAhead)
      stack.setLookAhead(lookAhead);
    if (!main && stack.pos == this.stream.end) {
      main = new CachedToken();
      main.value = stack.p.parser.eofTerm;
      main.start = main.end = stack.pos;
      actionIndex = this.addActions(stack, main.value, main.end, actionIndex);
    }
    this.mainToken = main;
    return this.actions;
  }
  getMainToken(stack) {
    if (this.mainToken)
      return this.mainToken;
    let main = new CachedToken(), { pos, p } = stack;
    main.start = pos;
    main.end = Math.min(pos + 1, p.stream.end);
    main.value = pos == p.stream.end ? p.parser.eofTerm : 0;
    return main;
  }
  updateCachedToken(token, tokenizer, stack) {
    let start = this.stream.clipPos(stack.pos);
    tokenizer.token(this.stream.reset(start, token), stack);
    if (token.value > -1) {
      let { parser: parser2 } = stack.p;
      for (let i2 = 0; i2 < parser2.specialized.length; i2++)
        if (parser2.specialized[i2] == token.value) {
          let result = parser2.specializers[i2](this.stream.read(token.start, token.end), stack);
          if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
            if ((result & 1) == 0)
              token.value = result >> 1;
            else
              token.extended = result >> 1;
            break;
          }
        }
    } else {
      token.value = 0;
      token.end = this.stream.clipPos(start + 1);
    }
  }
  putAction(action, token, end, index) {
    for (let i2 = 0; i2 < index; i2 += 3)
      if (this.actions[i2] == action)
        return index;
    this.actions[index++] = action;
    this.actions[index++] = token;
    this.actions[index++] = end;
    return index;
  }
  addActions(stack, token, end, index) {
    let { state: state2 } = stack, { parser: parser2 } = stack.p, { data } = parser2;
    for (let set = 0; set < 2; set++) {
      for (let i2 = parser2.stateSlot(
        state2,
        set ? 2 : 1
        /* ParseState.Actions */
      ); ; i2 += 3) {
        if (data[i2] == 65535) {
          if (data[i2 + 1] == 1) {
            i2 = pair(data, i2 + 2);
          } else {
            if (index == 0 && data[i2 + 1] == 2)
              index = this.putAction(pair(data, i2 + 2), token, end, index);
            break;
          }
        }
        if (data[i2] == token)
          index = this.putAction(pair(data, i2 + 1), token, end, index);
      }
    }
    return index;
  }
}
class Parse {
  constructor(parser2, input, fragments, ranges) {
    this.parser = parser2;
    this.input = input;
    this.ranges = ranges;
    this.recovering = 0;
    this.nextStackID = 9812;
    this.minStackPos = 0;
    this.reused = [];
    this.stoppedAt = null;
    this.lastBigReductionStart = -1;
    this.lastBigReductionSize = 0;
    this.bigReductionCount = 0;
    this.stream = new InputStream(input, ranges);
    this.tokens = new TokenCache(parser2, this.stream);
    this.topTerm = parser2.top[1];
    let { from } = ranges[0];
    this.stacks = [Stack.start(this, parser2.top[0], from)];
    this.fragments = fragments.length && this.stream.end - from > parser2.bufferLength * 4 ? new FragmentCursor(fragments, parser2.minRepeatTerm) : null;
  }
  get parsedPos() {
    return this.minStackPos;
  }
  // Move the parser forward. This will process all parse stacks at
  // `this.pos` and try to advance them to a further position. If no
  // stack for such a position is found, it'll start error-recovery.
  //
  // When the parse is finished, this will return a syntax tree. When
  // not, it returns `null`.
  advance() {
    let stacks = this.stacks, pos = this.minStackPos;
    let newStacks = this.stacks = [];
    let stopped, stoppedTokens;
    if (this.bigReductionCount > 300 && stacks.length == 1) {
      let [s] = stacks;
      while (s.forceReduce() && s.stack.length && s.stack[s.stack.length - 2] >= this.lastBigReductionStart) {
      }
      this.bigReductionCount = this.lastBigReductionSize = 0;
    }
    for (let i2 = 0; i2 < stacks.length; i2++) {
      let stack = stacks[i2];
      for (; ; ) {
        this.tokens.mainToken = null;
        if (stack.pos > pos) {
          newStacks.push(stack);
        } else if (this.advanceStack(stack, newStacks, stacks)) {
          continue;
        } else {
          if (!stopped) {
            stopped = [];
            stoppedTokens = [];
          }
          stopped.push(stack);
          let tok = this.tokens.getMainToken(stack);
          stoppedTokens.push(tok.value, tok.end);
        }
        break;
      }
    }
    if (!newStacks.length) {
      let finished = stopped && findFinished(stopped);
      if (finished) {
        if (verbose)
          console.log("Finish with " + this.stackID(finished));
        return this.stackToTree(finished);
      }
      if (this.parser.strict) {
        if (verbose && stopped)
          console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
        throw new SyntaxError("No parse at " + pos);
      }
      if (!this.recovering)
        this.recovering = 5;
    }
    if (this.recovering && stopped) {
      let finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
      if (finished) {
        if (verbose)
          console.log("Force-finish " + this.stackID(finished));
        return this.stackToTree(finished.forceAll());
      }
    }
    if (this.recovering) {
      let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
      if (newStacks.length > maxRemaining) {
        newStacks.sort((a, b) => b.score - a.score);
        while (newStacks.length > maxRemaining)
          newStacks.pop();
      }
      if (newStacks.some((s) => s.reducePos > pos))
        this.recovering--;
    } else if (newStacks.length > 1) {
      outer: for (let i2 = 0; i2 < newStacks.length - 1; i2++) {
        let stack = newStacks[i2];
        for (let j = i2 + 1; j < newStacks.length; j++) {
          let other = newStacks[j];
          if (stack.sameState(other) || stack.buffer.length > 500 && other.buffer.length > 500) {
            if ((stack.score - other.score || stack.buffer.length - other.buffer.length) > 0) {
              newStacks.splice(j--, 1);
            } else {
              newStacks.splice(i2--, 1);
              continue outer;
            }
          }
        }
      }
      if (newStacks.length > 12) {
        newStacks.sort((a, b) => b.score - a.score);
        newStacks.splice(
          12,
          newStacks.length - 12
          /* Rec.MaxStackCount */
        );
      }
    }
    this.minStackPos = newStacks[0].pos;
    for (let i2 = 1; i2 < newStacks.length; i2++)
      if (newStacks[i2].pos < this.minStackPos)
        this.minStackPos = newStacks[i2].pos;
    return null;
  }
  stopAt(pos) {
    if (this.stoppedAt != null && this.stoppedAt < pos)
      throw new RangeError("Can't move stoppedAt forward");
    this.stoppedAt = pos;
  }
  // See if a given tree, or a descendant right at its start, can be
  // reused in the given stack.
  tryReuse(stack, start, tree, repeatOnly) {
    if (!tree)
      return null;
    let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
    for (; tree; ) {
      let match = this.parser.nodeSet.types[tree.type.id] != tree.type ? -1 : this.parser.getGoto(stack.state, tree.type.id);
      if (match > -1 && tree.length && (!strictCx || (tree.prop(NodeProp.contextHash) || 0) == cxHash)) {
        stack.useNode(tree, match, start);
        return tree;
      }
      if (tree.children.length == 0 || tree.positions[0] > 0)
        break;
      let inner = tree.children[0];
      if (inner instanceof Tree && (!repeatOnly || inner.type.id >= this.parser.minRepeatTerm))
        tree = inner;
      else
        break;
    }
    return null;
  }
  // Returns an updated version of the given stack, or null if the
  // stack can't advance normally. When `split` and `stacks` are
  // given, stacks split off by ambiguous operations will be pushed to
  // `split`, or added to `stacks` if they move `pos` forward.
  advanceStack(stack, stacks, split) {
    let start = stack.pos, { parser: parser2 } = this;
    let base2 = verbose ? this.stackID(stack) + " -> " : "";
    if (this.stoppedAt != null && start > this.stoppedAt)
      return stack.forceReduce() ? stack : null;
    if (this.fragments) {
      let reused = stack.reducePos < start && stack.buffer.length && stack.buffer[stack.buffer.length - 2] <= stack.reducePos && this.fragments.lastRepeatPos == stack.reducePos && this.tryReuse(stack, stack.reducePos, this.fragments.lastRepeat, true) || this.tryReuse(stack, start, this.fragments.nodeAt(start), false);
      if (reused) {
        if (verbose)
          console.log(base2 + this.stackID(stack) + ` (via reuse of ${parser2.getName(reused.type.id)})`);
        return true;
      }
    }
    let defaultReduce = parser2.stateSlot(
      stack.state,
      4
      /* ParseState.DefaultReduce */
    );
    if (defaultReduce > 0) {
      stack.reduce(defaultReduce);
      if (verbose)
        console.log(base2 + this.stackID(stack) + ` (via always-reduce ${parser2.getName(
          defaultReduce & 65535
          /* Action.ValueMask */
        )})`);
      return true;
    }
    if (stack.stack.length >= 8400) {
      while (stack.stack.length > 6e3 && stack.forceReduce()) {
      }
    }
    let actions = this.tokens.getActions(stack);
    for (let i2 = 0; i2 < actions.length; ) {
      let action = actions[i2++], term = actions[i2++], end = actions[i2++];
      let last2 = i2 == actions.length || !split;
      let localStack = last2 ? stack : stack.split();
      let main = this.tokens.mainToken;
      localStack.apply(action, term, main ? main.start : localStack.pos, end);
      if (verbose)
        console.log(base2 + this.stackID(localStack) + ` (via ${(action & 65536) == 0 ? "shift" : `reduce of ${parser2.getName(
          action & 65535
          /* Action.ValueMask */
        )}`} for ${parser2.getName(term)} @ ${start}${localStack == stack ? "" : ", split"})`);
      if (last2)
        return true;
      else if (localStack.pos > start)
        stacks.push(localStack);
      else
        split.push(localStack);
    }
    return false;
  }
  // Advance a given stack forward as far as it will go. Returns the
  // (possibly updated) stack if it got stuck, or null if it moved
  // forward and was given to `pushStackDedup`.
  advanceFully(stack, newStacks) {
    let pos = stack.pos;
    for (; ; ) {
      if (!this.advanceStack(stack, null, null))
        return false;
      if (stack.pos > pos) {
        pushStackDedup(stack, newStacks);
        return true;
      }
    }
  }
  runRecovery(stacks, tokens, newStacks) {
    let finished = null, restarted = false;
    for (let i2 = 0; i2 < stacks.length; i2++) {
      let stack = stacks[i2], token = tokens[i2 << 1], tokenEnd = tokens[(i2 << 1) + 1];
      let base2 = verbose ? this.stackID(stack) + " -> " : "";
      if (stack.deadEnd) {
        if (restarted)
          continue;
        restarted = true;
        stack.restart();
        if (verbose)
          console.log(base2 + this.stackID(stack) + " (restarted)");
        let done = this.advanceFully(stack, newStacks);
        if (done)
          continue;
      }
      let force = stack.split(), forceBase = base2;
      for (let j = 0; j < 10 && force.forceReduce(); j++) {
        if (verbose)
          console.log(forceBase + this.stackID(force) + " (via force-reduce)");
        let done = this.advanceFully(force, newStacks);
        if (done)
          break;
        if (verbose)
          forceBase = this.stackID(force) + " -> ";
      }
      for (let insert2 of stack.recoverByInsert(token)) {
        if (verbose)
          console.log(base2 + this.stackID(insert2) + " (via recover-insert)");
        this.advanceFully(insert2, newStacks);
      }
      if (this.stream.end > stack.pos) {
        if (tokenEnd == stack.pos) {
          tokenEnd++;
          token = 0;
        }
        stack.recoverByDelete(token, tokenEnd);
        if (verbose)
          console.log(base2 + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token)})`);
        pushStackDedup(stack, newStacks);
      } else if (!finished || finished.score < force.score) {
        finished = force;
      }
    }
    return finished;
  }
  // Convert the stack's buffer to a syntax tree.
  stackToTree(stack) {
    stack.close();
    return Tree.build({
      buffer: StackBufferCursor.create(stack),
      nodeSet: this.parser.nodeSet,
      topID: this.topTerm,
      maxBufferLength: this.parser.bufferLength,
      reused: this.reused,
      start: this.ranges[0].from,
      length: stack.pos - this.ranges[0].from,
      minRepeatType: this.parser.minRepeatTerm
    });
  }
  stackID(stack) {
    let id2 = (stackIDs || (stackIDs = /* @__PURE__ */ new WeakMap())).get(stack);
    if (!id2)
      stackIDs.set(stack, id2 = String.fromCodePoint(this.nextStackID++));
    return id2 + stack;
  }
}
function pushStackDedup(stack, newStacks) {
  for (let i2 = 0; i2 < newStacks.length; i2++) {
    let other = newStacks[i2];
    if (other.pos == stack.pos && other.sameState(stack)) {
      if (newStacks[i2].score < stack.score)
        newStacks[i2] = stack;
      return;
    }
  }
  newStacks.push(stack);
}
class Dialect {
  constructor(source, flags, disabled) {
    this.source = source;
    this.flags = flags;
    this.disabled = disabled;
  }
  allows(term) {
    return !this.disabled || this.disabled[term] == 0;
  }
}
class LRParser extends Parser {
  /**
  @internal
  */
  constructor(spec) {
    super();
    this.wrappers = [];
    if (spec.version != 14)
      throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14})`);
    let nodeNames = spec.nodeNames.split(" ");
    this.minRepeatTerm = nodeNames.length;
    for (let i2 = 0; i2 < spec.repeatNodeCount; i2++)
      nodeNames.push("");
    let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
    let nodeProps = [];
    for (let i2 = 0; i2 < nodeNames.length; i2++)
      nodeProps.push([]);
    function setProp(nodeID, prop, value) {
      nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
    }
    if (spec.nodeProps)
      for (let propSpec of spec.nodeProps) {
        let prop = propSpec[0];
        if (typeof prop == "string")
          prop = NodeProp[prop];
        for (let i2 = 1; i2 < propSpec.length; ) {
          let next = propSpec[i2++];
          if (next >= 0) {
            setProp(next, prop, propSpec[i2++]);
          } else {
            let value = propSpec[i2 + -next];
            for (let j = -next; j > 0; j--)
              setProp(propSpec[i2++], prop, value);
            i2++;
          }
        }
      }
    this.nodeSet = new NodeSet(nodeNames.map((name2, i2) => NodeType.define({
      name: i2 >= this.minRepeatTerm ? void 0 : name2,
      id: i2,
      props: nodeProps[i2],
      top: topTerms.indexOf(i2) > -1,
      error: i2 == 0,
      skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i2) > -1
    })));
    if (spec.propSources)
      this.nodeSet = this.nodeSet.extend(...spec.propSources);
    this.strict = false;
    this.bufferLength = DefaultBufferLength;
    let tokenArray = decodeArray(spec.tokenData);
    this.context = spec.context;
    this.specializerSpecs = spec.specialized || [];
    this.specialized = new Uint16Array(this.specializerSpecs.length);
    for (let i2 = 0; i2 < this.specializerSpecs.length; i2++)
      this.specialized[i2] = this.specializerSpecs[i2].term;
    this.specializers = this.specializerSpecs.map(getSpecializer);
    this.states = decodeArray(spec.states, Uint32Array);
    this.data = decodeArray(spec.stateData);
    this.goto = decodeArray(spec.goto);
    this.maxTerm = spec.maxTerm;
    this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
    this.topRules = spec.topRules;
    this.dialects = spec.dialects || {};
    this.dynamicPrecedences = spec.dynamicPrecedences || null;
    this.tokenPrecTable = spec.tokenPrec;
    this.termNames = spec.termNames || null;
    this.maxNode = this.nodeSet.types.length - 1;
    this.dialect = this.parseDialect();
    this.top = this.topRules[Object.keys(this.topRules)[0]];
  }
  createParse(input, fragments, ranges) {
    let parse = new Parse(this, input, fragments, ranges);
    for (let w of this.wrappers)
      parse = w(parse, input, fragments, ranges);
    return parse;
  }
  /**
  Get a goto table entry @internal
  */
  getGoto(state2, term, loose = false) {
    let table = this.goto;
    if (term >= table[0])
      return -1;
    for (let pos = table[term + 1]; ; ) {
      let groupTag = table[pos++], last2 = groupTag & 1;
      let target = table[pos++];
      if (last2 && loose)
        return target;
      for (let end = pos + (groupTag >> 1); pos < end; pos++)
        if (table[pos] == state2)
          return target;
      if (last2)
        return -1;
    }
  }
  /**
  Check if this state has an action for a given terminal @internal
  */
  hasAction(state2, terminal) {
    let data = this.data;
    for (let set = 0; set < 2; set++) {
      for (let i2 = this.stateSlot(
        state2,
        set ? 2 : 1
        /* ParseState.Actions */
      ), next; ; i2 += 3) {
        if ((next = data[i2]) == 65535) {
          if (data[i2 + 1] == 1)
            next = data[i2 = pair(data, i2 + 2)];
          else if (data[i2 + 1] == 2)
            return pair(data, i2 + 2);
          else
            break;
        }
        if (next == terminal || next == 0)
          return pair(data, i2 + 1);
      }
    }
    return 0;
  }
  /**
  @internal
  */
  stateSlot(state2, slot) {
    return this.states[state2 * 6 + slot];
  }
  /**
  @internal
  */
  stateFlag(state2, flag) {
    return (this.stateSlot(
      state2,
      0
      /* ParseState.Flags */
    ) & flag) > 0;
  }
  /**
  @internal
  */
  validAction(state2, action) {
    return !!this.allActions(state2, (a) => a == action ? true : null);
  }
  /**
  @internal
  */
  allActions(state2, action) {
    let deflt = this.stateSlot(
      state2,
      4
      /* ParseState.DefaultReduce */
    );
    let result = deflt ? action(deflt) : void 0;
    for (let i2 = this.stateSlot(
      state2,
      1
      /* ParseState.Actions */
    ); result == null; i2 += 3) {
      if (this.data[i2] == 65535) {
        if (this.data[i2 + 1] == 1)
          i2 = pair(this.data, i2 + 2);
        else
          break;
      }
      result = action(pair(this.data, i2 + 1));
    }
    return result;
  }
  /**
  Get the states that can follow this one through shift actions or
  goto jumps. @internal
  */
  nextStates(state2) {
    let result = [];
    for (let i2 = this.stateSlot(
      state2,
      1
      /* ParseState.Actions */
    ); ; i2 += 3) {
      if (this.data[i2] == 65535) {
        if (this.data[i2 + 1] == 1)
          i2 = pair(this.data, i2 + 2);
        else
          break;
      }
      if ((this.data[i2 + 2] & 65536 >> 16) == 0) {
        let value = this.data[i2 + 1];
        if (!result.some((v, i22) => i22 & 1 && v == value))
          result.push(this.data[i2], value);
      }
    }
    return result;
  }
  /**
  Configure the parser. Returns a new parser instance that has the
  given settings modified. Settings not provided in `config` are
  kept from the original parser.
  */
  configure(config2) {
    let copy = Object.assign(Object.create(LRParser.prototype), this);
    if (config2.props)
      copy.nodeSet = this.nodeSet.extend(...config2.props);
    if (config2.top) {
      let info = this.topRules[config2.top];
      if (!info)
        throw new RangeError(`Invalid top rule name ${config2.top}`);
      copy.top = info;
    }
    if (config2.tokenizers)
      copy.tokenizers = this.tokenizers.map((t2) => {
        let found = config2.tokenizers.find((r) => r.from == t2);
        return found ? found.to : t2;
      });
    if (config2.specializers) {
      copy.specializers = this.specializers.slice();
      copy.specializerSpecs = this.specializerSpecs.map((s, i2) => {
        let found = config2.specializers.find((r) => r.from == s.external);
        if (!found)
          return s;
        let spec = Object.assign(Object.assign({}, s), { external: found.to });
        copy.specializers[i2] = getSpecializer(spec);
        return spec;
      });
    }
    if (config2.contextTracker)
      copy.context = config2.contextTracker;
    if (config2.dialect)
      copy.dialect = this.parseDialect(config2.dialect);
    if (config2.strict != null)
      copy.strict = config2.strict;
    if (config2.wrap)
      copy.wrappers = copy.wrappers.concat(config2.wrap);
    if (config2.bufferLength != null)
      copy.bufferLength = config2.bufferLength;
    return copy;
  }
  /**
  Tells you whether any [parse wrappers](#lr.ParserConfig.wrap)
  are registered for this parser.
  */
  hasWrappers() {
    return this.wrappers.length > 0;
  }
  /**
  Returns the name associated with a given term. This will only
  work for all terms when the parser was generated with the
  `--names` option. By default, only the names of tagged terms are
  stored.
  */
  getName(term) {
    return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
  }
  /**
  The eof term id is always allocated directly after the node
  types. @internal
  */
  get eofTerm() {
    return this.maxNode + 1;
  }
  /**
  The type of top node produced by the parser.
  */
  get topNode() {
    return this.nodeSet.types[this.top[1]];
  }
  /**
  @internal
  */
  dynamicPrecedence(term) {
    let prec2 = this.dynamicPrecedences;
    return prec2 == null ? 0 : prec2[term] || 0;
  }
  /**
  @internal
  */
  parseDialect(dialect) {
    let values = Object.keys(this.dialects), flags = values.map(() => false);
    if (dialect)
      for (let part of dialect.split(" ")) {
        let id2 = values.indexOf(part);
        if (id2 >= 0)
          flags[id2] = true;
      }
    let disabled = null;
    for (let i2 = 0; i2 < values.length; i2++)
      if (!flags[i2]) {
        for (let j = this.dialects[values[i2]], id2; (id2 = this.data[j++]) != 65535; )
          (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id2] = 1;
      }
    return new Dialect(dialect, flags, disabled);
  }
  /**
  Used by the output of the parser generator. Not available to
  user code. @hide
  */
  static deserialize(spec) {
    return new LRParser(spec);
  }
}
function pair(data, off) {
  return data[off] | data[off + 1] << 16;
}
function findFinished(stacks) {
  let best = null;
  for (let stack of stacks) {
    let stopped = stack.p.stoppedAt;
    if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(
      stack.state,
      2
      /* StateFlag.Accepting */
    ) && (!best || best.score < stack.score))
      best = stack;
  }
  return best;
}
function getSpecializer(spec) {
  if (spec.external) {
    let mask = spec.extend ? 1 : 0;
    return (value, stack) => spec.external(value, stack) << 1 | mask;
  }
  return spec.get;
}
const javaHighlighting = styleTags({
  null: tags.null,
  instanceof: tags.operatorKeyword,
  this: tags.self,
  "new super assert open to with void": tags.keyword,
  "class interface extends implements enum var": tags.definitionKeyword,
  "module package import": tags.moduleKeyword,
  "switch while for if else case default do break continue return try catch finally throw": tags.controlKeyword,
  ["requires exports opens uses provides public private protected static transitive abstract final strictfp synchronized native transient volatile throws"]: tags.modifier,
  IntegerLiteral: tags.integer,
  FloatingPointLiteral: tags.float,
  "StringLiteral TextBlock": tags.string,
  CharacterLiteral: tags.character,
  LineComment: tags.lineComment,
  BlockComment: tags.blockComment,
  BooleanLiteral: tags.bool,
  PrimitiveType: tags.standard(tags.typeName),
  TypeName: tags.typeName,
  Identifier: tags.variableName,
  "MethodName/Identifier": tags.function(tags.variableName),
  Definition: tags.definition(tags.variableName),
  ArithOp: tags.arithmeticOperator,
  LogicOp: tags.logicOperator,
  BitOp: tags.bitwiseOperator,
  CompareOp: tags.compareOperator,
  AssignOp: tags.definitionOperator,
  UpdateOp: tags.updateOperator,
  Asterisk: tags.punctuation,
  Label: tags.labelName,
  "( )": tags.paren,
  "[ ]": tags.squareBracket,
  "{ }": tags.brace,
  ".": tags.derefOperator,
  ", ;": tags.separator
});
const spec_identifier = { __proto__: null, void: 34, byte: 36, short: 36, int: 36, long: 36, char: 36, float: 36, double: 36, boolean: 36, extends: 50, super: 52, this: 64, public: 70, protected: 72, private: 74, abstract: 76, static: 78, final: 80, strictfp: 82, default: 84, synchronized: 86, native: 88, transient: 90, volatile: 92, sealed: 95, non: 97, instanceof: 140, true: 158, false: 158, null: 166, class: 170, new: 176, throws: 196, implements: 204, permits: 211, record: 215, interface: 226, enum: 236, open: 289, module: 291, requires: 296, transitive: 298, exports: 300, to: 302, opens: 304, uses: 306, provides: 308, with: 310, package: 314, import: 318, if: 330, else: 332, while: 336, for: 340, var: 347, assert: 354, switch: 358, case: 366, throw: 370, do: 374, break: 378, continue: 382, return: 386, try: 392, catch: 396, finally: 404 };
const parser$1 = LRParser.deserialize({
  version: 14,
  states: "#5QQ]QPOOQ%QQPOOO(wQQO'#HlO+OQQO'#CbOOQO'#Cb'#CbO+VQPO'#CaOOQO'#Co'#CoO,{QPO'#DOO-iQQO'#HvOOQO'#Hv'#HvO0^QQO'#HqO0eQQO'#HqOOQO'#Hq'#HqOOQO'#Hp'#HpOOQO'#Hz'#HzO0lQPO'#GwO2`QPO'#DOO2gQPO'#CkO4vQPO'#DfO4}QPO'#CiO6ZQQO'#FsO6bQPO'#DyO7rOSO'#EQOOQO'#IW'#IWO+VQPO'#EzO8iQPO'#EzOOQO'#EV'#EVO:QQQO'#ITO<OQQO'#FUO<iQPO'#FTO<nQPO'#FVOOQO'#IV'#IVO6bQPO'#FYOOQO'#IT'#ITOOQO'#Ho'#HoOOQO'#Hh'#HhOOQO'#Gt'#GtOOQO'#Hg'#HgO<sQPO'#FtOOQO'#Hf'#HfOOQO'#Gs'#GsQ]QPOOO<xQWO'#H{O>nQPO'#HzO>uQPO'#EcO>uQPO'#EjO>uQPO'#EuO>uQPO'#EpO>}QPO'#I[O?cQQO'#FRO+VQPO'#C`O?kQPO'#C`O+VQPO'#FnO?pQPO'#FpO@OQPO'#FvO@OQPO'#FyO>uQPO'#GOO@TQPO'#F{O6bQPO'#GSO6bQPO'#G[O@OQPO'#GUO]QPO'#G^O@YQPO'#G`O@eQPO'#GbO@pQPO'#GdO@wQPO'#GgOAeQQO'#CjOBTQQO'#CjOB_QPO'#I`OCzQPO'#DOODbQPO'#E]OBbQPO'#E^OESQPO'#I`OEeQPO'#E]OEmQPO'#IhOErQPO'#FOOOQO'#I^'#I^OOQO'#G}'#G}Q%QQPOOOGhQPO'#HzOOQO'#Hl'#HlOHZQQO,58{OOQO'#Hj'#HjOOQO'#Hr'#HrOJtQPO,59_OLSQPO,59jOOQO-E:r-E:rO+VQPO,58zOLyQPO,58zO+VQPO,5<YOOQO'#Cj'#CjOMOQPO'#CzOMTQPO'#CzOOQO'#Gv'#GvONTQQO,59dO! xQPO'#H}O!!SQPO'#D`O!!bQPO'#I_O!!jQPO,5<jO!!oQPO,5:nO!#YQPO'#CrOOQO,59],59]O!#aQPO,59[O!#lQPO,5=cOOQO-E:u-E:uO!%`QQO'#HlO!'bQQO'#CbO!)dQPO'#DOO!*YQQO'#HvO!*jQPO'#C}O!*xQPO'#HyO!+QQPO,59VO!+VQPO,59VO!+mQPO'#IRO!+xQPO,5:PO!+}QQO,5:pO!,UQPO,5;wOOQO,5:Q,5:QO!,aQPO,5:QO!,hQPO,59TOOQO'#Dj'#DjOOQO'#Dm'#DmO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:RO6bQPO,5:bOOQO,5:e,5:eOOQO,5<_,5<_O!,oQPO,5:_O6bQPO,5;xO!-SQPO'#CsO!-eQQO'#HvOOOO'#G{'#G{O!-sOSO,5:lOOQO,5:l,5:lO!-{QPO,5;fOB_QPO,5<jO+VQPO,5;fO>uQPO,5:}O>uQPO,5;UO>uQPO,5;aO>uQPO,5;[O>uQPO,5<jO!.cQPO,5:qO6bQPO,5;nO!.jQPO,5;qO!.xQPO'#EXOOQO,5;o,5;oO!/PQQO,5;tO]QPO,5<`OOQO-E:q-E:qO!0mQPO,5>gO6bQPO'#EUO@zQPO,5=QO!0rQPO,5:}O!1TQPO,5;UO!1]QPO,5;aO!1eQPO,5;[O!-SQPO,5>vO!1sQPO,5>vO!-SQPO,5>vO!2OQPO,5;mO!2aQQO,58zO!2iQQO,5<YO!2qQQO,5<[O+VQPO,5<[O+VQPO,5<[O]QPO,5<bO]QPO,5<eO!2yQPO'#F}O]QPO,5<gO]QPO,5<lO!4PQQO,5<nO!4ZQQO,5<vO!4bQPO,5<pO!4gQPO,5<xOOQO'#Fu'#FuOOQO,5<z,5<zO!4lQPO,5<zOOQO,5<|,5<|O!4qQPO,5<|O!4vQQO,5=OOOQO,5=O,5=OO!4}QPO'#GpO!6TQPO,5=RO@zQPO,5=ZO!:_QPO,59dO!:oQPO'#H}O!:vQPO,5:vO!:{QPO,5>zOB_QPO,5:vO!;WQPO,5:wOErQPO,5;jO!;`QPO'#E_OBbQPO'#E_O!;kQPO'#IaO!;sQPO,5:xOB_QPO,5>zO!-SQPO,5>zOEmQPO,5?SOOQO,5:w,5:wO!+VQPO'#CkOOQO,5?S,5?SO!?pQPO'#FPOOQO,5;j,5;jO!?wQPO,5;jO!-SQPO'#EaOOQO-E:{-E:{OOQO,5;i,5;iO+VQPO,58}O!?|QPO'#ChOOQO1G.k1G.kO!2aQQO1G.fO+VQPO1G.fO!@WQQO1G1tOOQO,59f,59fO!@`QPO,59fOOQO-E:t-E:tO!@eQPO,5>iO!@|QPO,59zO>uQPO'#HOO!ATQPO,5>yOOQO1G2U1G2UOOQO1G0Y1G0YO!AnQPO'#CsO!B^QPO'#HvO!BkQPO'#CtO!ByQPO'#HuO!CRQPO,59^OOQO1G.v1G.vO!#aQPO1G.vO!CiQPO,59_O!CvQQO'#HlO!DXQQO'#CbO!DjQPO,59yOOQO,59i,59iO>uQPO,59yOOQO,59W,59WO!DuQQO,59WO!DzQPO,59iO!,oQPO'#GyO!E]QPO,5>eOOQO1G.q1G.qO!EeQPO'#C}O!EvQPO1G.qO>uQPO'#GzO!E{QPO,5>mOOQO1G/k1G/kOOQO1G0[1G0[O!-SQPO'#HPO!FTQPO1G1cO6bQPO1G1cOOQO1G/l1G/lO!F]QQO1G.oOOQO1G.o1G.oO!HZQQO1G/mO!IxQQO1G/mO!KgQQO1G/mO!KnQQO1G/mO!KuQQO1G/mO!MdQQO1G/mO!MkQQO1G/mO# YQQO1G/mO# aQQO1G/mO# kQQO1G/mO# rQQO1G/|O!)dQPO'#DOO# yQQO'#HvO!*jQPO'#DuOOQO1G/y1G/yO##`QQO1G1dOOOO-E:y-E:yOOQO1G0W1G0WO##vQPO'#E{OOQO1G1Q1G1QO#$jQPO1G2UO!-{QPO1G1QO!0rQPO1G0iO!1TQPO1G0pO!1]QPO1G0{O!1eQPO1G0vOOQO1G0]1G0]O#$oQQO1G1XO<iQPO1G1ZO+VQPO1G1ZO>}QPO'#I[OOQO1G1X1G1XO#&iQQO1G1XO#&qQQO1G1YOOQO1G1]1G1]O#&xQPO1G1]O#'TQQO'#I]O#'bQPO,5:sOOQO1G1z1G1zOOQO1G4R1G4ROOQO1G2l1G2lO#'gQPO'#EYO!-SQPO'#EdO!-SQPO'#EeO!-SQPO'#EhOOQO1G0i1G0iO#'nQPO1G0iO#'sQPO1G0iO#'{QPO1G0iO#(WQPO1G0iO#(fQPO'#ElO#(|QPO1G0pO#)UQPO1G0pO#)ZQPO'#EwOOQO1G0{1G0{O#)nQPO1G0{O#)sQPO'#EsO!-SQPO'#ErOOQO1G0v1G0vO#*pQPO1G0vO#*uQPO1G0vO#*}QPO1G0vO!1sQPO1G4bO#+YQPO'#FXO#+aQPO'#FXOOQO'#HX'#HXO#+iQQO1G1^O#-fQQO1G4bO!-SQPO1G4bO<iQPO1G4bO#/`QQO1G1XO#/vQPO'#FdOOQO1G.f1G.fOOQO1G1t1G1tO#/}QPO1G1vOOQO1G1v1G1vO#0YQQO1G1vO#0bQQO1G1vO#0jQPO1G1|OOQO1G2P1G2PO-iQQO,5<mO#4nQPO,5<mO#5PQPO,5<iO#5WQPO,5<iOOQO1G2R1G2ROOQO1G2W1G2WOOQO1G2Y1G2YO6bQPO1G2YOOQO1G2b1G2bO#9TQPO'#GWOOQO1G2[1G2[O@OQPO1G2dOOQO1G2f1G2fOOQO1G2h1G2hOOQO1G2j1G2jO#9[QQO'#HlO#9uQQO'#CbO-iQQO'#HvO#:`QQOOO#:|QQO'#FUO#:kQQO'#IVO!*jQPO'#GqO#;TQPO,5=[OOQO'#H`'#H`O#;]QPO1G2mO#?gQPO'#GiO@zQPO'#GmOOQO1G2m1G2mO#?lQPO1G2uO#CvQPO,5>|OOQO1G0b1G0bOOQO1G4f1G4fO#DXQPO1G0bOOQO1G0c1G0cOOQO1G1U1G1UO!?wQPO1G1UOOQO,5:y,5:yO!-SQPO'#E`O#D^QPO,5:yOBbQPO'#HQO#DiQPO,5>{OOQO1G0d1G0dOEmQPO'#IbO#DqQPO1G4fOB_QPO1G4fOOQO1G4n1G4nO!)tQPO'#C}O!)dQPO'#DOOOQO,5;k,5;kO#D|QPO,5;kO#ETQPO,5;kO#E[QQO'#ITO#EcQQO'#IVO#EjQQO'#FQO#EuQPO'#FQO#E}QPO'#IcOOQO,5:{,5:{OOQO1G.i1G.iO#F]QQO'#HnO#FmQQO'#FUO#HTQPO'#F`OOQO'#Hn'#HnO#H_QPO'#HnO#H|QPO'#IkO#IUQPO,59SOOQO7+$Q7+$QO!2aQQO7+$QOOQO7+'`7+'`OOQO1G/Q1G/QO#IZQPO'#DdO#IeQQO'#IPOOQO'#IP'#IPOOQO1G/f1G/fOOQO,5=j,5=jOOQO-E:|-E:|O#IuQWO,58{O#I|QPO,59`OOQO,59`,59`O!-SQPO'#HxO!!tQPO'#GuO#J[QPO,5>aOOQO1G.x1G.xOOQO7+$b7+$bOOQO1G.r1G.rO#JdQQO1G.rO>uQPO1G/eOOQO1G/e1G/eO#JiQPO1G.rO#JnQPO1G/eOOQO1G/T1G/TOOQO,5=e,5=eOOQO-E:w-E:wOOQO7+$]7+$]OOQO,5=f,5=fOOQO-E:x-E:xOOQO,5=k,5=kOOQO-E:}-E:}O6bQPO7+&}O#JyQQO7+&}O6bQPO7+%hO#LgQQO,59_OOQO,5:a,5:aOB_QPO,5:aO#MvQPO'#EtO#NUQPO'#EtOOQO'#HW'#HWO#NpQPO,5;gOOQO,5;g,5;gOOQO7+'p7+'pOOQO7+&l7+&lOOQO7+&T7+&TO#'nQPO7+&TO#'sQPO7+&TO#'{QPO7+&TO#(WQPO7+&TO#(|QPO7+&[O#)UQPO7+&[OOQO7+&g7+&gO#)nQPO7+&gOOQO7+&b7+&bO#*pQPO7+&bO#*uQPO7+&bO#*}QPO7+&bOOQO7+&u7+&uOOQO'#FU'#FUO<iQPO7+&uO!-SQPO,5>vO<iQPO,5>vO$ dQPO7+&sO$ rQPO7+&wOOQO7+&t7+&tOOQO7+&w7+&wO6bQPO'#G|O$!QQPO,5>wOOQO1G0_1G0_O$!]QPO,5:tOOQO,5:t,5:tOOQO,5;O,5;OOOQO'#Eg'#EgOOQO,5;P,5;POOQO,5;S,5;SO$!dQPO'#EmO!*jQPO'#EmO$!uQPO'#IdO$!}QPO,5;WO$#SQPO'#EnOOQO7+&[7+&[O$#ZQPO7+&[O$#`QPO'#ExO>uQPO'#ExO$#qQPO'#IfO$#|QPO,5;cOB_QPO'#I`O!-SQPO'#I`O$$UQPO'#E]OOQO'#HU'#HUO$$]QPO,5;_OOQO,5;_,5;_OOQO,5;^,5;^O$%YQQO7+&xO$'VQQO7+)|O$)PQQO,5;sOOQO,5;s,5;sO$)WQPO,5;sOOQO-E;V-E;VOOQO7+&x7+&xOOQO7+)|7+)|O<iQPO7+)|OOQO'#H['#H[O$)_QPO,5<OOOQO,5<O,5<OO$)fQPO'#FeO+VQPO'#FeO+VQPO'#FeO+VQPO'#FeO$)tQPO7+'bOOQO7+'b7+'bO$)yQPO7+'bO]QPO7+'hO$*UQPO1G2XOB_QPO1G2XO$*dQQO1G2TO!.xQPO1G2TO$*kQPO1G2TO$*rQQO7+'tO$*yQPO'#H_OOQO'#H_'#H_O$+RQPO,5<rOOQO,5<r,5<rO$+YQPO'#HzO$+dQPO'#GYO$,tQPO7+(OO$,yQPO,5=]OB_QPO,5=]O$-OQPO1G2vO$.XQPO1G2vOOQO1G2v1G2vOOQO-E;^-E;^OOQO7+(X7+(XO!,oQPO'#GkO@zQPO,5=TOOQO,5=X,5=XO$.aQPO7+(aOOQO7+(a7+(aO$2kQPO1G4hOOQO7+%|7+%|OOQO7+&p7+&pO$2|QPO,5:zOOQO1G0e1G0eOOQO,5=l,5=lOOQO-E;O-E;OOOQO7+*Q7+*QO$3XQPO7+*QO!CWQPO,59WOOQO1G1V1G1VO$3dQPO1G1VO$3dQPO1G1VO$3kQPO,5:qO$3rQPO,5;lO<iQPO,5;lO!-SQPO'#HRO$3wQPO,5>}O$4VQPO,5;{O$4^QPO'#IjO$4fQPO,5;zO+VQPO'#HZO$4kQPO,5?VOOQO1G.n1G.nOOQO<<Gl<<GlO$4sQPO'#IQO$4{QPO,5:OOOQO1G.z1G.zOOQO,5>d,5>dOOQO,5=a,5=aOOQO-E:s-E:sO$5QQPO7+$^OOQO7+%P7+%POOQO7+$^7+$^O>uQPO7+%PO$5VQQO<<JiO$7tQQO<<ISOOQO1G/{1G/{O$8sQPO'#HlO$8zQPO'#CbO$9RQPO,5;`O$9WQPO,5;hO#MvQPO,5;`OOQO-E;U-E;UOOQO1G1R1G1ROOQO<<Io<<IoO#'nQPO<<IoO#'sQPO<<IoO#'{QPO<<IoOOQO<<Iv<<IvO$#ZQPO<<IvO#(|QPO<<IvOOQO<<JR<<JROOQO<<I|<<I|O#*pQPO<<I|O#*uQPO<<I|OOQO<<Ja<<JaO$9]QQO<<J_OOQO<<J_<<J_O<iQPO<<JaO+VQPO<<JaOOQO<<Jc<<JcO$;VQPO<<JcO$;bQQO,5=hOOQO-E:z-E:zOOQO1G0`1G0`O$;oQPO,5;XO>uQPO,5;XOOQO,5;X,5;XO$;zQPO,5;XO!,oQPO'#HSO$<]QPO,5?OOOQO1G0r1G0rODbQPO'#E]O$<eQPO'#EoOOQO'#Ie'#IeOOQO'#HT'#HTO$<mQPO,5;YOOQO,5;Y,5;YOOQO,5;d,5;dO$<tQPO,5;dO$=SQPO,5;dO$=eQPO'#HVO$={QPO,5?QO$>WQPO'#EyOOQO1G0}1G0}O$>_QPO1G0}OB_QPO,5;`OOQO-E;S-E;SOOQO1G0y1G0yOOQO<<Jd<<JdOOQO<<Mh<<MhOOQO1G1_1G1_O$>dQQO1G1_O$>kQQO<<MhOOQO-E;Y-E;YOOQO1G1j1G1jO$@eQQO,5<POOQO'#H]'#H]O$)fQPO,5<POOQO'#Il'#IlO$@mQQO,5<PO$AOQQO,5<POOQO<<J|<<J|O$AWQPO<<J|OOQO<<KS<<KSO6bQPO7+'sO$A]QPO7+'sO!.xQPO7+'oO$AkQPO7+'oO$ApQQO7+'oOOQO<<K`<<K`O$AwQPO,5<sOOQO,5=y,5=yOOQO-E;]-E;]OOQO1G2^1G2^O$CYQQO'#IoOOQO,5<t,5<tOOQO<<Kj<<KjO6bQPO1G2wO$CgQPO1G2wOOQO,5=|,5=|OOQO7+(b7+(bO$ClQPO7+(bOOQO-E;`-E;`O$EZQWO'#HqO$DuQWO'#HqO$EbQPO'#GlO>uQPO,5=VO!*jQPO,5=VOOQO1G2o1G2oOOQO<<K{<<K{O$EsQPO1G0fOOQO<<Ml<<MlOOQO7+&q7+&qO$FOQPO7+&qO$FVQPO1G1ZO$FbQQO1G1WOOQO1G1W1G1WO$FmQPO1G1WOOQO,5=m,5=mOOQO-E;P-E;POOQO1G1g1G1gO$FrQPO'#HYO$GPQPO,5?UOOQO1G1f1G1fO$GXQPO'#FaOOQO,5=u,5=uOOQO-E;X-E;XO$G^QPO'#GxO$GkQPO,5>lOOQO1G/j1G/jOOQO<<Gx<<GxOOQO<<Hk<<HkOOQO1G0z1G0zO$GsQPO1G1SO$GxQPO1G0zO$G}QPO1G1SOOQOAN?ZAN?ZO#'nQPOAN?ZO#'sQPOAN?ZOOQOAN?bAN?bO$#ZQPOAN?bOOQOAN?hAN?hO#*pQPOAN?hOOQOAN?{AN?{O<iQPOAN?{OOQOAN?}AN?}O>uQPO1G0sOOQO1G0s1G0sO$HSQPO1G0sOOQO,5=n,5=nOOQO-E;Q-E;QO$<eQPO,5;ZOOQO,5;Z,5;ZOOQO-E;R-E;ROOQO1G0t1G0tOOQO1G1O1G1OO$H_QPO1G1OOOQO,5=q,5=qOOQO-E;T-E;TO$HmQPO,5;eOOQO7+&i7+&iOOQO7+&y7+&yOOQOANCSANCSOOQO1G1k1G1kO$HtQQO1G1kOOQO-E;Z-E;ZO$H|QQO'#ImO$HwQPO1G1kO$@sQPO1G1kO+VQPO1G1kOOQOAN@hAN@hO$IXQQO<<K_O6bQPO<<K_O$I`QPO<<KZOOQO<<KZ<<KZO!.xQPO<<KZOOQO1G2_1G2_O$IeQPO,5?ZO$IpQQO7+(cO6bQPO7+(cOOQO<<K|<<K|P!4}QPO'#HbO!-SQPO'#HaO$IzQPO,5=WO$JVQPO1G2qO>uQPO1G2qOOQO<<J]<<J]O<iQPO7+&rO$J[QPO7+&rOOQO7+&r7+&rOOQO,5=t,5=tOOQO-E;W-E;WOOQO,5=d,5=dOOQO-E:v-E:vO$JaQPO7+&nOOQO7+&f7+&fO$JoQPO7+&nOOQOG24uG24uO#'nQPOG24uOOQOG24|G24|OOQOG25SG25SOOQOG25gG25gOOQO7+&_7+&_O>uQPO7+&_OOQO1G0u1G0uOOQO7+&j7+&jOOQO7+'V7+'VO+VQPO'#H^O$JtQPO,5?XO$J|QPO7+'VO$KRQQO'#InOOQOAN@yAN@yO$K^QQOAN@yOOQOAN@uAN@uO$KeQPOAN@uO$KjQQO<<K}O$KtQPO,5={O!-SQPO,5={OOQO-E;_-E;_OOQO7+(]7+(]O$LVQPO7+(]O$L[QPO<<J^OOQO<<J^<<J^O$LaQPO<<JYOOQO<<JY<<JYO$4VQPO<<JYO$LaQPO<<JYOOQOLD*aLD*aOOQO<<Iy<<IyO$LoQQO,5=xOOQO-E;[-E;[OOQO<<Jq<<JqO$LzQPO,5?YOOQOG26eG26eOOQOG26aG26aO$MSQPO1G3gOOQO<<Kw<<KwOOQOAN?xAN?xOOQOAN?tAN?tO$4VQPOAN?tO$MeQPOAN?tO$MjQPOAN?tO$MxQPOG25`OOQOG25`G25`O$4VQPOG25`OOQOLD*zLD*zO$M}QPOLD*zOOQO!$'Nf!$'NfO+VQPO'#CaO$NSQQO'#HlO$NgQQO'#HlO%!gQQO'#CbO%!zQQO'#CbO%$zQPO,59TO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5:RO$+dQPO,5;xO$+dQPO1G1cO%%RQQO1G.oO%&mQQO1G/mO%(RQQO1G/mO%)gQQO1G/mO%)nQQO1G/mO%)uQQO1G/mO%+ZQQO1G/mO%+bQQO1G/mO%,vQQO1G/mO%,}QQO1G/mO%-UQPO'#DOO%-iQQO1G1dO$+dQPO7+&}O$+dQPO7+%hO$+dQPO'#G|O%.wQQO<<ISO%/[QQO,5=hO%/iQPO'#CiO$+dQPO'#DyO$+dQPO'#FYO%/nQPO,5;wO%/yQPO1G1cO%0RQQO1G/|O2gQPO'#CkO6bQPO,5:b",
  stateData: "%0d~OPOSQOS&XOS~OZaOa[Ob[Oj!ROpoOs^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{{O|^O}^O!O^O!P^O!QzO!VbO!dpO!neO!ogO!pgO!qgO!rgO!sgO!ugO!w|O!z!QO!}wO#_}O#e!PO#j!OO#}pO$OpO$U!TO$V!SO$c!UO$e!VO$k!WO$n!XO$p!ZO$s!YO$w![O$y!^O%P!]O%R!_O%T!`O%V!aO%X!bO%[!cO&]TO&_RO&aQO&|fO'ZhO~Oa[Ob[Os^Ot^Ou^Ov^Ow!qOx^Oy^Oz^O{^O|^O}^O!O^O!P^O!QzO!VbO!w|O!}!nO#_}O#e!PO#j!OO&]TO&_!dO&a!eO&h!iO'ZhO~OWcXW&`XZ&`XocXo&`X!T&`X![&`X!]&`X!_&`X!`&`X!b&`X!c&`X!d&`X!e&`X!f&`X!h&`X!k&`X!n&`X!}&`X$R&`X&]cX&_cX&acX&g&`X&hcX&h&`X&v^X&x&`X']cX']&`X~O!l$iX~P&wOWUXW&fXZUXoUXo&fX!TUX![UX!]UX!_UX!`UX!bUX!cUX!dUX!eUX!fUX!hUX!kUX!nUX!}UX$RUX&]&fX&_&fX&a&fX&gUX&hUX&h&fX&v^X&xUX']UX']&fX~O!l$iX~P)OO&_SO&a!rO~Os^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{^O|^O}^O!O^O!P^O!QzOarXbrX!wrX#_rX#erX#jrX$srX&_rX&arX'ZrX~Oa[Ob[O$U!zO$V!yO$c!{O&]TO&_!uO&aUO~P+_OW#VOo!}O&]TO&_!|O&a!|O']&jX~OW#YOo&eX&]&eX&_&eX&a&eX']&eXY&eXp&eX&r&eX&x&eXZ&eXk&eX&g&eX!T&eX![&eX!]&eX!_&eX!`&eX!b&eX!c&eX!d&eX!e&eX!f&eX!h&eX!k&eX!n&eX!}&eX$R&eX!V&eX#Y&eX#]&eX!l&eXm&eX!U&eX&v&eX~O&h#WO~P-}O&h&eX~P-}O&]TOa%kXb%kXs%kXt%kXu%kXv%kXw%kXx%kXy%kXz%kX{%kX|%kX}%kX!O%kX!P%kX!Q%kX!w%kX#_%kX#e%kX#j%kX$s%kX&_%kX&a%kX'Z%kX&h%kX~O&hrX~P+_OZaOa[Ob[Oj!ROpoOs^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{^O|^O}^O!O^O!P^O!QzO!dpO!neO!ogO!pgO!qgO!rgO!sgO!ugO!z!QO#}pO$OpO&]TO&_#^O&a#]O&|fOY&mP~O!U#iO~P]O&v#kO~O!T#|O![#nO!]#oO!_#pO!`#qO!b#sO!c#tO!d#uO!e#vO!f#wO!h#{O!k#xO!n#yO$R#|O&g#lO&h#lO&x#mO~O!}#zO~P5SOZaOa[Ob[Oj!ROpoO!dpO!neO!ogO!pgO!qgO!rgO!sgO!ugO!z!QO#}pO$OpO&]TO&_2uO&a2sO&|fO~O&{$RO&}$PO~Oa[Ob[O!w$VO#_$WO#e$YO#j$XO&_!uO&aUO'Z$UO~O$s$ZO~P7zOo$]O']$^O!T&wX![&wX!]&wX!_&wX!`&wX!b&wX!c&wX!d&wX!e&wX!f&wX!h&wX!k&wX!n&wX!}&wX$R&wX&g&wX&h&wX&x&wX~OW$[OY&wX!l&wXm&wXk&wX!U&wX&v&wX~P8pOW&yXo&yX!T&yX![&yX!]&yX!_&yX!`&yX!b&yX!c&yX!d&yX!e&yX!f&yX!h&yX!k&yX!n&yX!}&yX$R&yX&g&yX&h&yX&x&yX']&yX~OZ#xXY&yX!l&yXm&yXk&yX!U&yX&v&yX~P:kOZ$_O~O']$^O~O!l$bO~O&p$dO~Oa&nXb&nXs&nXt&nXu&nXv&nXw&nXx&nXy&nXz&nX{&nX|&nX}&nX!O&nX!P&nX!Q&nX!w&nX#_&nX#e&nX#j&nX$s&nX&]&nX&_&nX&a&nX'Z&nX~OZ$eO~P<}O&_!|O&a!|O~Oa[Ob[O&]TO&_!uO&aUO&h#WO~OW$nO']$^O~O$V!yO~Ow$sO$V$rO&_SO&a!rO~OZ$eO~OZ$vO~O!}%OO&_$}O&a$}O~O!}%QO&_$}O&a$}O~O!}%TO~P6bOZ%UO!VbO~OW&fXo&fX&]&fX&_&fX&a&fX&h&fX~OZ^X!V^X~PAPOWcXocX&]cX&_cX&acX&hcX~OZ^X!V^X~PAoOo!}O&]TO&_!|O&a!|O~Os^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{^O|^O}^O!O^O!P^O!QzO&]TOarXbrX&_rX&arX~O!wrX#_rX#erX#jrX&hrX'ZrX~PBmOa[Ob[O!w$VO#_$WO#e$YO#j$XO&_!dO&a!eO&h!iO'Z$UO~Oa[Ob[O&]TO&_!dO&a!eO~O!VbO!}%gO~OZ%hO~O!V%jO#U%mO~Oa&nXb&nXs&nXt&nXu&nXv&nXw&nXx&nXy&nXz&nX{&nX|&nX}&nX!O&nX!P&nX!Q&nX!w&nX#_&nX#e&nX#j&nX&]&nX&_&nX&a&nX'Z&nX~O!VbO&h&nX~PEzOW%pOZ%qOaTabTa&]Ta&_Ta&aTa~OsTatTauTavTawTaxTayTazTa{Ta|Ta}Ta!OTa!PTa!QTa!wTa#_Ta#eTa#jTa$UTa$VTa$cTa$sTa'ZTa&hTaoTa&rTaYTakTa!UTa!}Ta~PGrOo!}O&]TOkga&ggaYga&xga!}ga~O']ga!Vga#Yga#]ga~PJ]Os^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{^O|^O}^O!O^O!P^O!QzO~Oarabra!wra#_ra#era#jra$sra&_ra&ara'Zra&hra~PKUO$V%tO~Om%vO~Oo%wO&]TO~Oo!}O&]la&_la&ala']laYlapla&rla&xla!}la&glakla~OWla!Tla![la!]la!_la!`la!bla!cla!dla!ela!fla!hla!kla!nla$Rla&hla!llamla!Ula&vla~PM]Oo!}O&]TOk&qX!T&qX!}&qX~OY&qX!l&qX~P! gO!T%zOk!SX!}!SXY!SX~Ok%{O!}'RX~O!}%}O~O!w&OO~Oa[Ob[O&]2rO&_!uO&aUO&k&RO~O&g&iP~P!!tO&]TO&_!uO&aUO~O&]TOa%kab%kas%kat%kau%kav%kaw%kax%kay%kaz%ka{%ka|%ka}%ka!O%ka!P%ka!Q%ka!w%ka#_%ka#e%ka#j%ka$s%ka&_%ka&a%ka'Z%ka&h%ka~OW&`XY^XYcXY&`XZ&`Xk^Xo&`XpcX!T&`X![&`X!]&`X!_&`X!`&`X!b&`X!c&`X!d&`X!e&`X!f&`X!h&`X!k&`X!n&`X$R&`X&g&`X&h&`X&rcX&v^X&xcX&x&`X']cX']&`X~PAoOWUXYUXY^XY&fXZUXk^XoUXp&fX!TUX![UX!]UX!_UX!`UX!bUX!cUX!dUX!eUX!fUX!hUX!kUX!nUX$RUX&gUX&hUX&r&fX&v^X&xUX&x&fX']UX']&fX~PAPOa[Ob[O&_!uO&aUO~PBmOo!}Op&^O&]TO&_&YO&a&XO&r&]O~OW#VOY&jX&x&jX']&jX~P!)tOa[Ob[O&_!uO&aUO~Ok&aOY&mX~OY&cO~Oa[Ob[O&]TO&_!uO&aUOY&mP~PKUOk&fO&v#kOY&uX~OY&hO~OY&iO~P5SOY&lO&x&jO']$^O~O!U&mO~P]O!VbO~P6bOa[Ob[O&]TO&_!uO&aUO~PKUOa[Ob[O&]TO&_!uO&aUO~OW#VOo!}O&]TO']&jX~O&{'RO&}$PO~O!V'SO~Op'aO!z'`O&_SO&a!rO&h#WO~Oj'bO~P!.QO!z'dO&_SO&a!rO&h#WO~OY'PP~P6bO!n#yO!T#|a![#|a!]#|a!_#|a!`#|a!b#|a!c#|a!d#|a!e#|a!f#|a!h#|a!k#|a!}#|a$R#|a&g#|a&h#|a&x#|aY#|a!l#|am#|ak#|a!U#|a&v#|a~O!P'iO~Oi'lO!V'kO#Y'mO#]'nO&h!iO~OZ'tO&h!iO~O!V'wO#Y'mO~Oi'{O!V'zO#]'nO&h!iO~OZ$_Oo(RO&]TO~Oj(YOp'aO&_SO&a!rO&h#WO~OW%pO!V(ZO~OW%pO!}(]O~OW(^O!}(_O~Os^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{^O|^O}^O!O^O!P^O!QzO$s!YO!}'PP~P6bO!l(kO!}(jO~P5SO!}(lO~P5SO!V(mO~O$n(oO~O!}(pO~O!}(qO~O!}(rO~P5SOZ$eOa[Ob[Oj!ROpoO!ogO!pgO!qgO!rgO!sgO!ugO!z!QO&]TO&_(tO&a(sO&|fO~PKUO%^(}O%b)OOZ%Zaa%Zab%Zaj%Zap%Zas%Zat%Zau%Zav%Zaw%Zax%Zay%Zaz%Za{%Za|%Za}%Za!O%Za!P%Za!Q%Za!V%Za!d%Za!n%Za!o%Za!p%Za!q%Za!r%Za!s%Za!u%Za!w%Za!z%Za!}%Za#_%Za#e%Za#j%Za#}%Za$O%Za$U%Za$V%Za$c%Za$e%Za$k%Za$n%Za$p%Za$s%Za$w%Za$y%Za%P%Za%R%Za%T%Za%V%Za%X%Za%[%Za&V%Za&]%Za&_%Za&a%Za&|%Za'Z%Za!U%Za$l%Za&h%Za$}%Za~O!Vla#Yla#]la'dla~PM]OZ%hO~P! gO!})SO~O#U%mO!V'Sa!}'Sa~O!VbO!})VO~Oi)ZOk#RX&g#RX~Ok)]O&g'TX~O&g)_O~OZaOa[Ob[Oj)kOp)jOs^Ot^Ou^Ov^Ow^Ox^Oy^Oz^O{{O|^O}^O!O^O!P^O!QzO!VbO!dpO!neO!ogO!pgO!qgO!rgO!sgO!ugO!w|O!z!QO!}wO#_}O#e!PO#j!OO#}pO$OpO$U!TO$V!SO$c!UO$e!VO$k!WO$n!XO$p!ZO$s!YO$w![O$y!^O%P!]O%R!_O%T!`O%V!aO%X!bO%[!cO&]TO&_RO&aQO&h#WO&|fO'ZhO~O!U)fO~P!;xO!V%jO~O!V)rOY'_P~P6bOW%pO!})yO~Om)zO~Oo!}O&]TOk&qa!T&qa!}&qaY&qa!l&qa~O!V){O~P6bOk%{O!}'Ra~Oa[Ob[O&]2rO&_!uO&aUO~O&k*SO~P!A]Oo!}O&]TOk&jX&g&jXY&jX&x&jX!}&jX~O!V&jX#Y&jX#]&jX~P!AuOi*UOj*UOkhX&ghX~Ok*VO&g&iX~O&g*XO~Oo!}Op*ZO&]TO&_SO&a!rO~OYga&xga']ga~P!CWOW&`XY^Xk^Xo^X&]^X~OWUXY^Xk^Xo^X&]^X~Oo%wO&]TO&r*]O~OW*_O~Oo!}O&]TO&_!|O&a!|O&r*]O~Ok&aOY&ma~Oo!}O&]TO&_!|O&a!|O&r&]O~OY*dO~Ok&fOY&ua~OY*iO&x&jO~O!}]iY]i!l]im]ik]i!U]i~P5SO!]#oO!d#uO!e#vO!f#wO!h#{O!n#yO&g#lO&h#lO!T!Zi!_!Zi!`!Zi!b!Zi!c!Zi!k!Zi!}!Zi$R!Zi&x!ZiY!Zi!l!Zim!Zik!Zi!U!Zi~O![!Zi~P!FsO!d#uO!e#vO!n#yO!T!Zi![!Zi!]!Zi!_!Zi!`!Zi!b!Zi!c!Zi!h!Zi!k!Zi!}!Zi$R!Zi&g!Zi&h!Zi&x!ZiY!Zi!l!Zim!Zik!Zi!U!Zi~O!f#wO~P!HbO![#nO!]#oO!b#sO!c#tO!d#uO!e#vO!f#wO!h#{O!n#yO&g#lO&h#lO&x#mO!T!Zi!`!Zi!k!Zi!}!Zi$R!ZiY!Zi!l!Zim!Zik!Zi!U!Zi~O!_!Zi~P!JPO!_#pO~P!JPO![#nO~P!FsO![#nO!]#oO!d#uO!e#vO!f#wO!h#{O!n#yO&g#lO&h#lO&x#mO!T!Zi!_!Zi!`!Zi!b!Zi!k!Zi!}!Zi$R!ZiY!Zi!l!Zim!Zik!Zi!U!Zi~O!c#tO~P!K|O!c!Zi~P!K|O!n#yO!T!Zi![!Zi!]!Zi!_!Zi!`!Zi!b!Zi!c!Zi!d!Zi!f!Zi!h!Zi!k!Zi!}!Zi$R!Zi&g!Zi&h!Zi&x!ZiY!Zi!l!Zim!Zik!Zi!U!Zi~O!e#vO~P!MrO!e!Zi&v!Zi~P!MrO!f!Zi~P!HbO!l*kO~P5SO&_!|O&a!|O!T&jX![&jX!]&jX!_&jX!`&jX!b&jX!c&jX!d&jX!e&jX!f&jX!h&jX!k&jX!n&jX$R&jX&h&jX!l&jXm&jX!U&jX&v&jX~P!AuO!}$QiY$Qi!l$Qim$Qik$Qi!U$Qi~P5SOa[Ob[O!U*sO!w|O#_}O#e!PO&]TO&_!uO&aUO'ZhO~PKUO!}*tO~OW#uiZ#xXo#ui!T#ui![#ui!]#ui!_#ui!`#ui!b#ui!c#ui!d#ui!e#ui!f#ui!h#ui!k#ui!n#ui!}#ui$R#ui&g#ui&h#ui&x#ui']#uiY#ui!l#uim#uik#ui!U#ui&v#ui~OW+YO']+ZO~Om+[O~P5SO!z+]O&_SO&a!rO~Ok+^OY'PX!}'PX~P5SOY+`O~O!U+bO~P%QO!V'kO~O!V'kO#]'nO~O!V'kO#Y'mO#]'nO~Oi'lO!V'kO#Y'mO#]'nO~Oa[Ob[O&]TO&_!uO&aUOY'WP~PKUO!V+kO#Y'mO~OZ'tO~O&]TO&_!|O&a!|O!U'YP!}'YP~PKUO!V'wO~Oa[Ob[O!U+wO!w|O!}+uO#_}O#e!PO#j!OO&]TO&_!uO&aUO&h!iO'ZhO~PKUO!V'zO~O!V'zO#]'nO~Oi'{O!V'zO#]'nO~Om+|O~P6bOo+}O&]TO~Oo(RO!V){O&]TOW#zi!T#zi![#zi!]#zi!_#zi!`#zi!b#zi!c#zi!d#zi!e#zi!f#zi!h#zi!k#zi!n#zi!}#zi$R#zi&g#zi&h#zi&x#zi']#ziY#zi!l#zim#zik#zi!U#zi&v#zi~O!V'kOW'Oio'Oi!T'Oi!['Oi!]'Oi!_'Oi!`'Oi!b'Oi!c'Oi!d'Oi!e'Oi!f'Oi!h'Oi!k'Oi!n'Oi!}'Oi$R'Oi&g'Oi&h'Oi&x'Oi']'OiY'Oi!l'Oim'Oik'Oi!U'Oi&v'Oi~OW+YO~O$Y,VO$[,WO$^,WO$_,XO$`,YO~O!U,UO~P#/eO$f,ZO&_SO&a!rO~OW%pO!},[O~OW,]O!},[O~O$l,^OZ$jia$jib$jij$jip$jis$jit$jiu$jiv$jiw$jix$jiy$jiz$ji{$ji|$ji}$ji!O$ji!P$ji!Q$ji!V$ji!d$ji!n$ji!o$ji!p$ji!q$ji!r$ji!s$ji!u$ji!w$ji!z$ji!}$ji#_$ji#e$ji#j$ji#}$ji$O$ji$U$ji$V$ji$c$ji$e$ji$k$ji$n$ji$p$ji$s$ji$w$ji$y$ji%P$ji%R$ji%T$ji%V$ji%X$ji%[$ji&V$ji&]$ji&_$ji&a$ji&|$ji'Z$ji!U$ji&h$ji$}$ji~Oa[Ob[O$s$ZO&_!uO&aUO~O!},bO~P6bO!},cO~OZaOa[Ob[Oj!ROpoOs^Ot^Ou^Ov^Ow^Ox^Oy^Oz,iO{{O|^O}^O!O^O!P^O!QzO!VbO!dpO!neO!ogO!pgO!qgO!rgO!sgO!ugO!w|O!z!QO!}wO#_}O#e!PO#j!OO#}pO$OpO$U!TO$V!SO$c!UO$e!VO$k!WO$n!XO$p!ZO$s!YO$w![O$y!^O$},jO%P!]O%R!_O%T!`O%V!aO%X!bO%[!cO&]TO&_RO&aQO&|fO'ZhO~O!U,hO~P#5]OW&`XY&`XZ&`Xo&`X!}&`X']cX']&`X~PAoOWUXYUXZUXoUX!}UX']UX']&fX~PAPOW$[Oo$]O']$^O~OW&yXY%eXo&yX!}%eX']&yX~OZ#xX~P#:kOY,pO!},nO~O%^(}O%b)OOZ%Zia%Zib%Zij%Zip%Zis%Zit%Ziu%Ziv%Ziw%Zix%Ziy%Ziz%Zi{%Zi|%Zi}%Zi!O%Zi!P%Zi!Q%Zi!V%Zi!d%Zi!n%Zi!o%Zi!p%Zi!q%Zi!r%Zi!s%Zi!u%Zi!w%Zi!z%Zi!}%Zi#_%Zi#e%Zi#j%Zi#}%Zi$O%Zi$U%Zi$V%Zi$c%Zi$e%Zi$k%Zi$n%Zi$p%Zi$s%Zi$w%Zi$y%Zi%P%Zi%R%Zi%T%Zi%V%Zi%X%Zi%[%Zi&V%Zi&]%Zi&_%Zi&a%Zi&|%Zi'Z%Zi!U%Zi$l%Zi&h%Zi$}%Zi~OZ,sO~O%^(}O%b)OOZ%cia%cib%cij%cip%cis%cit%ciu%civ%ciw%cix%ciy%ciz%ci{%ci|%ci}%ci!O%ci!P%ci!Q%ci!V%ci!d%ci!n%ci!o%ci!p%ci!q%ci!r%ci!s%ci!u%ci!w%ci!z%ci!}%ci#_%ci#e%ci#j%ci#}%ci$O%ci$U%ci$V%ci$c%ci$e%ci$k%ci$n%ci$p%ci$s%ci$w%ci$y%ci%P%ci%R%ci%T%ci%V%ci%X%ci%[%ci&V%ci&]%ci&_%ci&a%ci&|%ci'Z%ci!U%ci$l%ci&h%ci$}%ci~Oo!}O&]TO!V'Ua!}'Ua#U'Ua~O!},yO~Oi)ZOk#Ra&g#Ra~Ok)]O&g'Ta~O#U%mO!V'Si!}'Si~O!U-SO~P]O!U-SO~P!;xOW-VO~P8pOZ$_O~P:kOW$nOZ$_O']$^O~Oj-XOp-XO~Ok-YO!V'VX#]'VX!}'VX~OY&bXk&bX!U&bX!}&bX~P5SO!T-[OW&yXY&yXZ#xXo&yX![&yX!]&yX!_&yX!`&yX!b&yX!c&yX!d&yX!e&yX!f&yX!h&yX!k&yX!n&yX$R&yX&g&yX&h&yX&x&yX']&yX~O!V)rO!U'^P~P6bOY&bXa%hXb%hX&]%hX&_%hX&a%hXk&bX!U&bX!}&bX~Ok-_OY'_X~OY-aO~O!V){O!U&tP~P6bOk&sX!}&sX!U&sXY&sX~P5SO&kTa~PGrOi*UOj*UOkha&gha~Ok*VO&g&ia~OW-iO~Op-kO~Oo%wO&]TO&r-lO~O!n#yO!T$Pq![$Pq!]$Pq!_$Pq!`$Pq!b$Pq!c$Pq!d$Pq!e$Pq!f$Pq!h$Pq!k$Pq!}$Pq$R$Pq&g$Pq&h$Pq&x$PqY$Pq!l$Pqm$Pqk$Pq!U$Pq&v$Pq~O!Tga![ga!]ga!_ga!`ga!bga!cga!dga!ega!fga!hga!kga!nga$Rga&hga!lgamga!Uga&vga~PJ]Oo!}O&]TO&_-qO&a-pO~Oa[Ob[O!w$VO#_$WO#e$YO&_!uO&aUO'Z$UO~Oa[Ob[O!U-vO!w|O#_}O#e!PO&]TO&_!uO&aUO'ZhO~PKUOp.UO&_SO&a!rO&h#WO~O!z.XO&_SO&a!rO&h#WO~Ok+^OY'Pa!}'Pa~O!U.]O~P%QOo!}O&]TO&_!|O&a!|O&r._O~Ok.bOY'WX~OY.dO~O!U.jO~P%QO!V+kO~OZ$_O!V'kOk#lX!U#lX!}#lX~Ok.nO!U'YX!}'YX~O!U.qO!}.pO~O&h!iO~P7zOa[Ob[O!U.uO!w|O!}+uO#_}O#e!PO#j!OO&]TO&_!uO&aUO&h!iO'ZhO~PKUOo(RO!V){O&]TOW#zq!T#zq![#zq!]#zq!_#zq!`#zq!b#zq!c#zq!d#zq!e#zq!f#zq!h#zq!k#zq!n#zq!}#zq$R#zq&g#zq&h#zq&x#zq']#zqY#zq!l#zqm#zqk#zq!U#zq&v#zq~O!V'kOW'Oqo'Oq!T'Oq!['Oq!]'Oq!_'Oq!`'Oq!b'Oq!c'Oq!d'Oq!e'Oq!f'Oq!h'Oq!k'Oq!n'Oq!}'Oq$R'Oq&g'Oq&h'Oq&x'Oq']'OqY'Oq!l'Oqm'Oqk'Oq!U'Oq&v'Oq~Om.xO~P5SOm.xO~P6bO!U.|O~P#/eOw/QO$Z/QO&_SO&a!rO~O!}/TO~O$f/UO&_SO&a!rO~O!T%zO!l/WOk!SX!}!SX~O!}/YO~P5SO!}/YO~P6bO!}/]O~P5SO!l/_O&v/^O~O!U/aO~P#5]O!l$|X&v$|X~P<}OZ3mOa[Ob[Oj!ROpoO!d3iO!n3hO!ogO!pgO!qgO!rgO!sgO!ugO!z!QO#}3iO$O3iO&]TO&_2vO&a2tO&|fO~O!}/dO~O!T/eO~OY/hOZ$eOa[Ob[Oj!ROpoO!ogO!pgO!qgO!rgO!sgO!ugO!z!QO&]TO&_(tO&a(sO&|fO~PKUOY/hO!}/iO~O%^(}O%b)OOZ%cqa%cqb%cqj%cqp%cqs%cqt%cqu%cqv%cqw%cqx%cqy%cqz%cq{%cq|%cq}%cq!O%cq!P%cq!Q%cq!V%cq!d%cq!n%cq!o%cq!p%cq!q%cq!r%cq!s%cq!u%cq!w%cq!z%cq!}%cq#_%cq#e%cq#j%cq#}%cq$O%cq$U%cq$V%cq$c%cq$e%cq$k%cq$n%cq$p%cq$s%cq$w%cq$y%cq%P%cq%R%cq%T%cq%V%cq%X%cq%[%cq&V%cq&]%cq&_%cq&a%cq&|%cq'Z%cq!U%cq$l%cq&h%cq$}%cq~Oo!}O&]TO!V'Ui!}'Ui#U'Ui~O&x&jOk#Sa&g#Sa~O#U%mO!V'Sq!}'Sq~O!U/tO~P]Oj/wO~P!.QO!}/xO~Ok-YO!V'Va#]'Va!}'Va~O!V)rO~P6bOk/}O!U'^X~O!U0PO~Ok-_OY'_a~Ok0TO!U&tX~O!U0VO~Op0WO~O!n#yO!T$Py![$Py!]$Py!_$Py!`$Py!b$Py!c$Py!d$Py!e$Py!f$Py!h$Py!k$Py!}$Py$R$Py&g$Py&h$Py&x$PyY$Py!l$Pym$Pyk$Py!U$Py&v$Py~O![#nO!]#oO!_#pO!`#qO!b#sO!c#tO!d#uO!e#vO!f#wO!h#{O!k#xO!n#yO&g#lO&h#lO&x#mO~O!T!jy!}!jy$R!jyY!jy!l!jym!jyk!jy!U!jy~P$6sOk^Xo^X!T^X!}^X&]^X~OZ&`X~P$8bOZUX~P$8bO!}0YO~OZ0ZO~OW#uyZ#xXo#uy!T#uy![#uy!]#uy!_#uy!`#uy!b#uy!c#uy!d#uy!e#uy!f#uy!h#uy!k#uy!n#uy!}#uy$R#uy&g#uy&h#uy&x#uy']#uyY#uy!l#uym#uyk#uy!U#uy&v#uy~O!z0gO&_SO&a!rO~OY%pak%pa!}%pa~P5SOo%wO&]TO&r0hO~Oo!}O&]TO&_!|O&a!|O&r0hO~Ok.bOY'Wa~OZ%hO!VbO~O!U0pO~P%QO!V'kOk#la!U#la!}#la~OZ$_O!V'kOk#la!U#la!}#la~O&]TO&_!|O&a!|Ok%yX!U%yX!}%yX~PKUOk.nO!U'Ya!}'Ya~O!U#mX~P%QO!U0vO~Om0wO~P5SO!V'kOW'Oyo'Oy!T'Oy!['Oy!]'Oy!_'Oy!`'Oy!b'Oy!c'Oy!d'Oy!e'Oy!f'Oy!h'Oy!k'Oy!n'Oy!}'Oy$R'Oy&g'Oy&h'Oy&x'Oy']'OyY'Oy!l'Oym'Oyk'Oy!U'Oy&v'Oy~OW%pO!}0yO~OW%pO$]1OO&_SO&a!rO!}'aP~OW%pO$a1PO~O!}1QO~O!T%zO!l1SOk!SX!}!SX~OY1UO~O!}1VO~P5SO!VbO%P!]O~P6bO!T3SO![2xO!]2yO!_2zO!`2{O!b2}O!c3OO!d3PO!e3QO!f3RO!h#{O!k3nO!n#yO$R3SO&g#lO&h#lO&x#mO~Ok3dO!l'cX&v'cX~P$BRO!T1ZO~OY1[OZ$eOa[Ob[Oj!ROpoO!ogO!pgO!qgO!rgO!sgO!ugO!z!QO&]TO&_(tO&a(sO&|fO~PKUOW#YOo&eX&]&eX&_&eX&a&eX'd&eX~O&h#WO~P$DuOo!}O&]TO'd1^O&_%`X&a%`X~O&x&jOk#Si&g#Si~O!U1bO~P]Oj1cO&_SO&a!rO~OW+YOZ$_O']+ZO~O!}1eO~O!V)rOk%|X!U%|X~P6bOk/}O!U'^a~O!T-[O~O!V){Ok%lX!U%lX~P6bOk0TO!U&ta~OY1jO~O!}1kO~OZ1lO~Oo%wO&]TO&r1sO~O!V'kOk#li!U#li!}#li~O!U#ma~P%QOW%pO!}1vO~OW%pOk1wO!}'aX~OY1{O~P5SOY1}O~Ok3dO!l'ca&v'ca~OY%eq!}%eq~P5SO'd1^O&_%`a&a%`a~OY2TO~O!}2WO~Oo!}Oz2ZO!}2YO&]TO~OY2[O~Ok1wO!}'aa~O!}2aO~OW%pOk1wO!}'bX~OY2cO~P5SOY2dO~OY%ey!}%ey~P5SOo!}O&]TO&_&Ta&a&Ta'd&Ta~OY2fO~O!}2gO~Oo!}Oz2iO!}2hO&]TO~OW%pOk&Qa!}&Qa~Ok1wO!}'ba~Oo!}O&]TO&_&Ti&a&Ti'd&Ti~O!}2mO~Oo!}Oz2nO!}2mO&]TO~O!}2oO~O!}2qO~O!l&`XY&`Xm&`Xk&`X!U&`X~P&wOWcXW&`XZ&`Xk&`XocXo&`X!T&`X![&`X!]&`X!_&`X!`&`X!b&`X!c&`X!d&`X!e&`X!f&`X!h&`X!k&`X!l&`X!n&`X$R&`X&]cX&g&`X&hcX&h&`X&v^X&v&`X&x&`X']cX']&`X~O!lUXYUXmUXkUX!UUX~P)OOWUXW&fXZUXkUXoUXo&fX!TUX![UX!]UX!_UX!`UX!bUX!cUX!dUX!eUX!fUX!hUX!kUX!lUX!nUX$RUX&]&fX&gUX&hUX&h&fX&vUX&v^X&xUX']UX']&fX~O!VbO~P$+dOk]i!l]i&v]i~P$BRO!]2yO!d3PO!e3QO!f3RO!h#{O!n#yO&g#lO&h#lOk!Zi!T!Zi!_!Zi!`!Zi!b!Zi!c!Zi!k!Zi!l!Zi$R!Zi&v!Zi&x!Zi~O![!Zi~P%%`O!d3PO!e3QO!n#yOk!Zi!T!Zi![!Zi!]!Zi!_!Zi!`!Zi!b!Zi!c!Zi!h!Zi!k!Zi!l!Zi$R!Zi&g!Zi&h!Zi&v!Zi&x!Zi~O!f3RO~P%&tO![2xO!]2yO!b2}O!c3OO!d3PO!e3QO!f3RO!h#{O!n#yO&g#lO&h#lO&x#mOk!Zi!T!Zi!`!Zi!k!Zi!l!Zi$R!Zi&v!Zi~O!_!Zi~P%(YO!_2zO~P%(YO![2xO~P%%`O![2xO!]2yO!d3PO!e3QO!f3RO!h#{O!n#yO&g#lO&h#lO&x#mOk!Zi!T!Zi!_!Zi!`!Zi!b!Zi!k!Zi!l!Zi$R!Zi&v!Zi~O!c3OO~P%)|O!c!Zi~P%)|O!e3QO!n#yOk!Zi!T!Zi![!Zi!]!Zi!_!Zi!`!Zi!b!Zi!c!Zi!f!Zi!h!Zi!k!Zi!l!Zi$R!Zi&g!Zi&h!Zi&v!Zi&x!Zi~O!d!Zi~P%+iO!f!Zi~P%&tOa[Ob[O&_!uO&aUO$srX~PBmOk$Qi!l$Qi&v$Qi~P$BRO![2xO!]2yO!_2zO!`2{O!b2}O!c3OO!d3PO!e3QO!f3RO!h#{O!k3nO!n#yO&g#lO&h#lO&x#mO~Ok!jy!T!jy!l!jy$R!jy&v!jy~P%-vOk%pa!l%pa&v%pa~P$BRO&v2wO~OY3TO&x&jO']$^O~OY3bO&x&jO~O!l3cO~P5SO!pQ!oP!e&X&_&|!s~",
  goto: "#Fl'dPPPP'e'z,`0UP'zPP0k0o2o7U9dPP9i=S@gCzDhFxPPPGOPJZPPKXKbPPPPPPPPPPPPPPKXL{PPPMgMr! t!#[PP!%[PP!&ZPPPPP!#[P!'U!#[PP!#[PPPPPP!'XP!)]P!+a!)]P!-t!.sP!/t!0O!0^!1R!1X!1_P!1n!2g!2qP!3a!3jP!1nP!4`!4j!4p!5O!1nP!5S!5^!2_!5sP!6h!6r!6x!1n!6{!7R!/t!/t!7V!7a!7g!)]!)]!9m!)]!)]!<Q!#[PP!#[0oP!<W!<aPP!<g!<pPPPPPPPP'eP'ePP!<t!=^!=s!=^PP!=^P!=^P!>`!>cP!=^!>{!=^P!=^P!?O!?R!?VP!<tP!=^P!=^P!=^P!=^P!=^!=^P!?ZP!?a!?d!?jP!=^!?v!?yP!@R!@i!E{!FR!G]!Hl!Hr!Hx!IO!IU!I`!In!It!JS!JY!J`!Jf!Jl!Jr!Jx!KO!KY!K`!Kf!Kl!Kr!K|!LS!L^!LdPPP!Lj!=^!MaP##wP#%OP#(O#(e#,o#1Y#4uPP#8Y#8]P#;T#;Z#;c#<nP#=yP#>{#?U#?XP0oP#?]!)]PPP#Ae#Cm#C|#DY#Dr#ET#EW#Ed#El#Eo#EsP#EvP#FU#FX#F[#F`#Ff#FiwuOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/u)usOPVW_abepy!Q![!]!_!b!f!g!i!j!p!v#O#R#W#Y#Z#_#`#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$O$T$]$_$b$e$k$l$m$t$u$v$w$x%U%Y%]%a%d%e%h%j%m%q%y%z&P&Q&V&W&Z&`&a&d&j&l&{&|'S'`'k'l'm'n't'w'z'{(Q(R(S(U(W(d(f(k(m(u)R)Z)])b)d)e)g)h)r){*U*V*`*i*k*l*n*o*r+W+^+a+g+k+r+s+v+y+},^,`,b,c,g,j,m,n,s,x-R-T-U-Y-[-t.^.a.b.i.n.p.s/W/Y/^/e/i/m/u/}0T0j0u1S1V1Z1]1^1j2Q2R2X2Z2[2e2i2k2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3n$xlOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nv!tT!S!U!V!y!{$r$s%t,V,W,X,Y/P/R1O1P1w2rQ$ShS&_#`)dQ'V$UU']$[$n-VQ'd$^W(w%U,n/i1]U)o%p(^,]Q)q%qS*[&W-RU+U'_.W/vQ+]'eQ-s*oQ.T+YQ.X+ZQ0Q-_Q0]-tR0g.Yw!tT!S!U!V!y!{$r$s%t,V,W,X,Y/P/R1O1P1w2rT%r!s*R${rOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3n$OcObepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n3n^!lP!h!p'k+a.p0u|#RW!Y#`$T$Z%{&]&`&d(d(u)d*]*o+g,`,m-l-t.a/n1aS#ea3mQ$g|Q$h}Q$i!OQ$j!PW%Y!f%]+r.sS%`!i)]Q%f!jQ'W$VQ'X$WQ'Y$XQ'Z$YQ)[%aS)`%d)bQ*e&fQ*m&|S+n'w.nQ-o*nS.f+k.iQ.m+oQ0i._Q0m.eQ1r0hQ2^1sw3g,j2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i$ScOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n3m3nU%i!l.f0mS)R%Y)`Q)c%fw3g,j2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3iV#da%h3m'fYOPVabeipy!Q![!]!_!b!h!j!p#W#_#a#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$]$_$b$e$k$m$t$u$v$w$x%U%e%h%j%m%q%z&P&a&j&l&{&}'S'`'k'l'm'n't'z'{(R(W(e(f(k(m(y)Z)e)g)h)r){*U*V*i*k*p*r+W+^+a+h+k+s+t+v+},^,b,c,g,j,n-T-U-Y-[.b.e.i.p/W/Y/^/e/i/u/}0T0u1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3nQ&U#YQ*Y&VX/k,s/o1^2R'fYOPVabeipy!Q![!]!_!b!h!j!p#W#_#a#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$]$_$b$e$k$m$t$u$v$w$x%U%e%h%j%m%q%z&P&a&j&l&{&}'S'`'k'l'm'n't'z'{(R(W(e(f(k(m(y)Z)e)g)h)r){*U*V*i*k*p*r+W+^+a+h+k+s+t+v+},^,b,c,g,j,n-T-U-Y-[.b.e.i.p/W/Y/^/e/i/u/}0T0u1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3nX/k,s/o1^2R'fZOPVabeipy!Q![!]!_!b!h!j!p#W#_#a#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$]$_$b$e$k$m$t$u$v$w$x%U%e%h%j%m%q%z&P&a&j&l&{&}'S'`'k'l'm'n't'z'{(R(W(e(f(k(m(y)Z)e)g)h)r){*U*V*i*k*p*r+W+^+a+h+k+s+t+v+},^,b,c,g,j,n-T-U-Y-[.b.e.i.p/W/Y/^/e/i/u/}0T0u1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3nX/l,s/o1^2RS#XY/kS$m!Q'`S'_$[$nQ'e$^S)l%j)hQ.W+YQ.Y+ZR/v-V%mXOabepy![!]!_!b#W#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|$]$_$b$e$t$u$v$w$x%U%j%m%q%z&j&l'l'm'n'{(R(f(k(m)Z)g)h)r){*U*V*i*k+^+},^,b,c,g,j,n-T-U-Y-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nQ&S#WR-g*V'c]OPVabeipy![!]!_!b!h!j!p#W#_#a#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$]$_$b$e$t$u$v$w$x%U%e%h%j%m%q%z&P&a&j&l&{&}'S'k'l'm'n't'z'{(R(e(f(k(m(y)Z)e)g)h)r){*U*V*i*k*p*r+^+a+h+k+s+t+v+},^,b,c,g,j,n,s-T-U-Y-[.b.e.i.p/W/Y/^/e/i/o/u/}0T0u1S1V1Z1]1^2R2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3n!w#PW!f!v#Q#R#`$O$T%X%Y%]%d%y&Q&W&`&d&|(d(u)R)b)d*l*n*o+g+r,`,m,x-R-t.a.s/m1j2Q2X2[2e2kW#ba#d%h3mR*b&aviOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/u[!hP!p'k+a.p0uY#aa#d%h&a3mQ&}#{Q(e$vW(y%U,n/i1]S*p'S*rS+h't.bS+o'w.nS+t'z+vS.e+k.iR/o,sh#TW!Y!f$T$Z%](d*o+r,`-t.sQ*P%{Q*^&]Q-j*]R0X-lU)}%z){0TQ,P(UR.v+y$ScOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n3m3nw3g,j2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3ivwOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/u`!nP!p'k+a+k.i.p0uQ%V!cQ%g!kQ%o!qS&o#k2wQ'j$fQ)Q%WQ)V%^Q,u)OQ/p,tQ0n.fQ1W/^R1t0m${qOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3n!^#od#g$y$z%S&n&p&r&s&t&u&v&z'P'c'f)p)|+{,a,d-n.Z.y/[1R1Y1|2P3lg2y/b3U3V3X3Y3Z3[3]3a3e3f!Y#rd#g$y$z%S&n&r&s&u&v&z'P'c'f)p)|+{,a,d-n.Z.y/[1R1Y1|2P3lc2|/b3U3X3Y3[3]3a3e3fR'O#{%TgOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%U%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j,n-T-U-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3n%ToOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%U%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j,n-T-U-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3n%SoOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%U%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j,n-T-U-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nQ$f{Q$t!WQ$u!XQ${!^R,k(oQ$`mS(V$l+XQ+T'^S+z(Q(XS-W)j)kQ.S+VQ.l+nQ.z,RQ/y-XQ0e.VQ0r.mQ1d/wQ1q0fR2V1cQ'o$gY*v'W'p'q'r'sQ,Q(VW-w*w*x*y*zQ.k+nQ.w+zU0^-x-y-zS0q.l.mQ0x.zS1m0_0`Q1u0rR2]1na!nP!p'k+a+k.i.p0u`!nP!p'k+a+k.i.p0uT+u'z+vd!jP!h!p'k+a+k.e.i.p0uQ's$gQ'v$hQ(P$jQ*z'WQ*|'XQ+S'ZV+s'z+t+vQ%b!iR,})]Q)Y%`R,|)[Q%l!mQ)T%[Q)X%_Q-P)aR/s-QvuOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/u`!nP!p'k+a+k.i.p0uS*q'S*rT+u'z+vQ'r$gS*y'W'sR-z*zQ'q$gQ'y$iU*x'W'r'sQ+O'YQ+m'uS-y*y*zQ-|*{Q0`-zR0b-}Q+e'mQ+f'nR+x'{Q'p$gQ'}$jW*w'W'q'r'sU+Q'Z(O(PU-x*x*y*zS.Q+R+SS0_-y-zQ0d.RR1n0`Q'u$hS*{'X'vR-}*|Q+i'tR0k.bQ+l'uS-{*{+mS0a-|-}R1o0bT.g+k.iQ(O$jS+R'Z(PR.R+SQ'|$jW+P'Z'}(O(PU.P+Q+R+SS0c.Q.RR1p0dvuOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/u`!nP!p'k+a+k.i.p0uT+u'z+vQ'x$iS*}'Y'yR.O+OQ+p'wR0s.nR.r+qQ'T$SR*u'VT*q'S*rQ%k!mS)W%_%lR,z)XQ)g%jR-U)h$zoOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nX(x%U,n/i1]%SmOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%U%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j,n-T-U-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nU'^$[$n-VS+V'_/vQ.V+YR0f.WX(T$l(Q(U+y_)s%q)r-[/}2Z2i2nQ)u%qR0R-_Q([$oQ)w%sR-b)xT,S(Z,TvwOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/uR1W/^wwOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/uvvOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/uQ%P!`R%R!aR$w!ZvwOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/uR(f$vR$x!ZR(n${T,f(m,gT,e(m,gX({%V(|)Q,vR,t(}Q/n,sR1a/oQ)P%VQ,r(|Q,w)QR/q,vR%W!cQ(z%UV/g,n/i1]QyOQ#jbY$cy#j)h-T/uQ)h%jQ-T)gR/u-UvVOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/uv!gP!p#d&a'S'k't'w'z*r+a+k+v,s.b.i.n.p0u|!xV!g#O#Z#_#}$k%a%e&P&V&Z&{(S(W)e*`+W.^0j2R3`!f#OW!f!v#R$O$T%Y%]%d%y&Q&W&|(d(u)R)b*l*n*o+r,`,m,x-R-t.s/m1j2Q2X2[2e2kQ#Z_S#_a3m$`#}ep![!]!b#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$e%m%q%z&j&l'l'm'n'{(R(f(k)Z)r){*U*i*k+^+},b,c,j-Y-[/W/Y/^/e/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3nQ$k!QS%a!i)]S%e!j+sS&P#W*VQ&V#YU&Z#`&d)dQ&{#{W(S$l(Q(U+yQ(W$mQ)e%hQ*`&`Q+W'`Q.^+gQ0j.aQ2R1^Z3`$v%U,n/i1]Q*W&SR-h*W^#QW#`$O&|(d(u*l!Q%X!f!v$T%]%d&Q&W&`&d)b)d*n*o+g+r,`,m-R-t.a.s/m2Q2e[%x#Q%X%y,x2X2kS%y#R%YQ,x)RQ2X1jR2k2[#Q`OPaby!_!p#d#j#{$b$t$u$v$w$x%U%h%j&a'S'k't'w'z(m)g)h*r+a+k+v,^,g,n,s-T-U.b.i.n.p/i/u0u1]3m[!wV!g#_&{)e3`T#[`!wQ0U-cR1i0UQ&b#bR*c&bQ&g#eR*f&gQ$QfR'Q$QQ+_'fS.[+_1XR1X/bQ!pPU%n!p+a0uQ+a'kR0u.pQ%|#TR*Q%|Q&k#hU*h&k/r3kQ/r,{R3k3jQ)^%bR-O)^Q-Z)mR/{-ZQ.c+iR0l.cQ.i+kR0o.iQ+v'zR.t+vQ.o+pR0t.oQ*r'SR-u*rQ(U$lQ+y(QT,O(U+yQ0O-]R1g0OQ-`)uR0S-`Q,T(ZR.{,TQ/P,VR0{/PQ1x0|S2`1x2bR2b1zQ,g(mR/`,gQ(|%VS,q(|,vR,v)QQ1_/mR2S1_Q,o(zR/j,odxOby#j%j)g)h-T-U/uQ$|!_Q'h$bQ(b$tQ(c$uQ(h$wQ(i$xS,f(m,gR/V,^)ftOPVW_abepy!Q![!]!_!b!f!g!i!j!p!v#O#R#W#Y#Z#_#`#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$O$T$]$_$b$e$k$l$m$t$u$v$w$x%U%Y%]%a%d%e%h%j%m%y%z&P&Q&V&W&Z&`&a&d&j&l&{&|'S'`'k'l'm'n't'w'z'{(Q(R(S(U(W(d(f(k(m(u)R)Z)])b)d)e)g)h){*U*V*`*i*k*l*n*o*r+W+^+a+g+k+r+s+v+y+},^,`,b,c,g,j,m,n,s,x-R-T-U-Y-t.^.a.b.i.n.p.s/W/Y/^/e/i/m/u0T0j0u1S1V1Z1]1^1j2Q2R2X2[2e2k2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3n_)t%q)r-[/}2Z2i2nQ!sTQ$o!SQ$p!UQ$q!VQ%s!yQ%u!{Q(`$rQ(a$sQ)x%tQ*R2rS.},V,XQ/R,WQ/S,YQ0z/PS0|/R1OQ1z1PR2_1w&{SOTabehpy!S!U!V![!]!_!b!y!{#`#j#k#n#o#p#q#r#s#t#u#v#w#x#|$U$[$]$^$_$b$e$n$r$s$t$u$v$w$x%U%j%p%q%t%z&W&l'_'e(R(^(f(k(m)d)g)h)r){*i*k*o+Y+Z+^+},V,W,X,Y,],^,b,c,g,j,n-R-T-U-V-[-_-t.W.Y/P/R/W/Y/^/e/i/u/v/}0T1O1P1S1V1Z1]1w2Z2i2n2r2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nQ)v%qQ-])rQ/|-[Q1f/}Q2j2ZQ2l2iR2p2nxdOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/^/uU#ga$e3mS#ye3hS$ap3iQ$y![Q$z!]Q%S!bQ&n#kQ&p#nQ&q#oQ&r#pQ&s#qQ&t#rQ&u#sQ&v#tQ&w#uS&x#v3QQ&y#wQ&z#xQ'P#|Q'c$]Y'f$_$v,b/Y1V^)p%q)r-[/}2Z2i2nU)|%z){0TS*j&l3TQ+{(RQ,a(fQ,d(kS-m*i3bQ-n*kQ.Z+^Q.y+}Q/[,cQ/b,jQ1R/WQ1Y/eQ1|1SQ2P1ZQ3U2wQ3V2xQ3W2yQ3X2zQ3Y2{Q3Z2|Q3[2}Q3]3OQ3^3PQ3_3RQ3a3SQ3e3cQ3f3dR3l3nvWOby!_#j$b$t$u$w$x%j(m)g)h,^,g-T-U/u`!fP!p'k+a+k.i.p0uW!vV#}&P3`S#`a3m#|$Oep![!]!b#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$e%q%z&l(R(f(k)r){*i*k+^+},b,c,j-[/W/Y/^/e/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3nQ$TiS%]!h.eS%d!j+sf&Q#W%m&j'l'm'n'{)Z*U*V-YQ&W#_Q&`#aS&d#d&aQ&|#{Q(d$vW(u%U,n/i1]Q)b%eQ)d%hQ*l&{Q*n&}S*o'S*rS+g't.bS+r'z+vQ,`(eQ,m(yQ-R)eQ-t*pQ.a+hQ.s+tS/m,s/oQ2Q1^R2e2R'b]OPVabeipy![!]!_!b!h!j!p#W#_#a#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$]$_$b$e$t$u$v$w$x%U%e%h%j%m%q%z&P&a&j&l&{&}'S'k'l'm'n't'z'{(R(e(f(k(m(y)Z)e)g)h)r){*U*V*i*k*p*r+^+a+h+k+s+t+v+},^,b,c,g,j,n,s-T-U-Y-[.b.e.i.p/W/Y/^/e/i/o/u/}0T0u1S1V1Z1]1^2R2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3nQ$l!QQ(Q$kS(X$m+WQ+X'`R,R(W'sUOPVabeipy!Q![!]!_!b!h!j!p#W#Y#_#a#d#j#k#n#o#p#q#r#s#t#u#v#w#x#{#|#}$]$_$b$e$k$m$t$u$v$w$x%U%e%h%j%m%q%z&P&V&a&j&l&{&}'S'`'k'l'm'n't'z'{(R(W(e(f(k(m(y)Z)e)g)h)r){*U*V*i*k*p*r+W+^+a+h+k+s+t+v+},^,b,c,g,j,n,s-T-U-Y-[.b.e.i.p/W/Y/^/e/i/o/u/}0T0u1S1V1Z1]1^2R2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3`3b3c3d3h3i3m3nR&T#W%OnObepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%U%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j,n-T-U-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3nQ#haQ&S#WQ'O#{W)m%m'm'n'{Q*g&jQ+c'lQ,{)ZQ-f*UQ-g*VQ/z-YR3j3mQ*T&RR-e*SU#ca%h3mR&e#d#c_OPV`aby!_!g!p!w#_#d#j#{$b$t$u$v$w$x%U%h%j&a&{'S'k't'w'z(m)e)g)h*r+a+k+v,^,g,n,s-T-U.b.i.n.p/i/u0u1]3`3m#c^OPV`aby!_!g!p!w#_#d#j#{$b$t$u$v$w$x%U%h%j&a&{'S'k't'w'z(m)e)g)h*r+a+k+v,^,g,n,s-T-U.b.i.n.p/i/u0u1]3`3ml#SW!Y!f$T$Z%]%{&]*]*o+r-l-t.sU&[#`&d)dQ*a&`Q,_(dQ,l(uQ.`+gQ/X,`Q/f,mQ0i.aQ1`/nR2U1aQ*O%zQ-c){R1h0TR-d){T#fa3m$vkOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%q%z&l(R(f(k(m)g)r){*i*k+^+},^,b,c,g,j-T-U-[/W/Y/^/e/u/}0T1S1V1Z2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nW(v%U,n/i1]T)i%j)h%SjOabepy![!]!_!b#j#k#n#o#p#q#r#s#t#u#v#w#x#|$]$_$b$e$t$u$v$w$x%U%j%q%z&l(R(f(k(m)g)h)r){*i*k+^+},^,b,c,g,j,n-T-U-[/W/Y/^/e/i/u/}0T1S1V1Z1]2Z2i2n2w2x2y2z2{2|2}3O3P3Q3R3S3T3b3c3d3h3i3m3nT'[$[-VQ'g$_Q(g$vQ/Z,bQ1T/YR2O1V[!oP!p'k+a.p0uT.g+k.iU#UW!Y(dQ%Z!fU'U$T$Z,`Q)U%]S-r*o+rT0[-t.sd!kP!p'k'z+a+k+v.i.p0uV%^!h+t.eR%c!iW%[!f%]+r.sQ)a%dR-Q)bQ)n%mV+d'm'n'{R+j'tT.h+k.iR+q'w`!mP!p'k+a+k.i.p0uT%_!h.eR-^)rR)v%qT/O,V/PQ0}/RR1y1OR1y1PR/c,j",
  nodeNames: "⚠ LineComment BlockComment Program ModuleDeclaration MarkerAnnotation Identifier ScopedIdentifier . Annotation ) ( AnnotationArgumentList LambdaExpression Definition FormalParameters ReceiverParameter void PrimitiveType TypeName ScopedTypeName GenericType TypeArguments AnnotatedType Wildcard extends super , ArrayType ] Dimension [ this FormalParameter Modifiers public protected private abstract static final strictfp default synchronized native transient volatile sealed non SpreadParameter VariableDeclarator AssignOp } { ArrayInitializer InferredParameters Block BinaryExpression CompareOp CompareOp CompareOp LogicOp LogicOp BitOp BitOp BitOp ArithOp ArithOp BitOp InstanceofExpression instanceof TypePattern TernaryExpression LogicOp : UpdateExpression UpdateOp IntegerLiteral FloatingPointLiteral BooleanLiteral CharacterLiteral StringLiteral TextBlock null ClassLiteral class ParenthesizedExpression ObjectCreationExpression new ArgumentList ClassBody ; FieldDeclaration MethodDeclaration TypeParameters TypeParameter TypeBound Throws throws ClassDeclaration Superclass SuperInterfaces implements InterfaceTypeList Permits permits RecordDeclaration record RecordHeader RecordComponent RecordBody CompactConstructorDeclaration InterfaceDeclaration interface ExtendsInterfaces InterfaceBody ConstantDeclaration EnumDeclaration enum EnumBody EnumConstant EnumBodyDeclarations AnnotationTypeDeclaration AnnotationTypeBody AnnotationTypeElementDeclaration StaticInitializer ConstructorDeclaration ConstructorBody ExplicitConstructorInvocation FieldAccess ArrayAccess MethodInvocation MethodName MethodReference ArrayCreationExpression Dimension UnaryExpression LogicOp BitOp CastExpression AssignmentExpression AssignOp ElementValueArrayInitializer ElementValuePair open module ModuleBody ModuleDirective requires transitive exports to opens uses provides with PackageDeclaration package ImportDeclaration import Asterisk ExpressionStatement LabeledStatement Label IfStatement if else WhileStatement while ForStatement for ForSpec LocalVariableDeclaration var EnhancedForStatement ForSpec AssertStatement assert SwitchStatement switch SwitchBlock SwitchRule SwitchLabel case ThrowStatement throw DoStatement do BreakStatement break ContinueStatement continue ReturnStatement return SynchronizedStatement TryStatement try CatchClause catch CatchFormalParameter CatchType FinallyClause finally TryWithResourcesStatement ResourceSpecification Resource ClassContent",
  maxTerm: 296,
  nodeProps: [
    ["isolate", -4, 1, 2, 80, 81, ""],
    ["group", -27, 4, 56, 91, 99, 106, 112, 117, 122, 156, 158, 161, 162, 164, 167, 169, 172, 174, 176, 178, 184, 186, 188, 190, 192, 194, 195, 203, "Statement", -25, 6, 13, 32, 57, 69, 72, 75, 77, 78, 79, 80, 81, 82, 83, 84, 86, 87, 129, 130, 131, 133, 134, 136, 139, 140, "Expression", -7, 17, 18, 19, 20, 21, 23, 28, "Type"],
    ["openedBy", 10, "(", 52, "{"],
    ["closedBy", 11, ")", 53, "}"]
  ],
  propSources: [javaHighlighting],
  skippedNodes: [0, 1, 2],
  repeatNodeCount: 30,
  tokenData: "#$g_R!_OX%QXY'fYZ)bZ^'f^p%Qpq'fqr*|rs,^st%Qtu2zuv4avw5qwx7Xxy?pyz@^z{@z{|Ap|}CW}!OCt!O!PEa!P!QNZ!Q!R!+P!R![!.k![!]!;T!]!^!<e!^!_!=R!_!`!?Y!`!a!?|!a!b!Aj!b!c!BY!c!}!IU!}#O!Jk#O#P%Q#P#Q!KX#Q#R!Ku#R#S2z#S#T%Q#T#o2z#o#p!Li#p#q!MV#q#r!No#r#s# ]#s#y%Q#y#z'f#z$f%Q$f$g'f$g#BY2z#BY#BZ# y#BZ$IS2z$IS$I_# y$I_$I|2z$I|$JO# y$JO$JT2z$JT$JU# y$JU$KV2z$KV$KW# y$KW&FU2z&FU&FV# y&FV;'S2z;'S;=`4Z<%lO2zS%VV&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QS%qO&}SS%tVOY&ZYZ%lZr&Zrs&ys;'S&Z;'S;=`'`<%lO&ZS&^VOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QS&vP;=`<%l%QS&|UOY&ZYZ%lZr&Zs;'S&Z;'S;=`'`<%lO&ZS'cP;=`<%l&Z_'mk&}S&XZOX%QXY'fYZ)bZ^'f^p%Qpq'fqr%Qrs%qs#y%Q#y#z'f#z$f%Q$f$g'f$g#BY%Q#BY#BZ'f#BZ$IS%Q$IS$I_'f$I_$I|%Q$I|$JO'f$JO$JT%Q$JT$JU'f$JU$KV%Q$KV$KW'f$KW&FU%Q&FU&FV'f&FV;'S%Q;'S;=`&s<%lO%Q_)iY&}S&XZX^*Xpq*X#y#z*X$f$g*X#BY#BZ*X$IS$I_*X$I|$JO*X$JT$JU*X$KV$KW*X&FU&FV*XZ*^Y&XZX^*Xpq*X#y#z*X$f$g*X#BY#BZ*X$IS$I_*X$I|$JO*X$JT$JU*X$KV$KW*X&FU&FV*XV+TX#}P&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`+p!`;'S%Q;'S;=`&s<%lO%QU+wV![Q&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QT,aXOY,|YZ%lZr,|rs1as#O,|#O#P0k#P;'S,|;'S;=`1Z<%lO,|T-PXOY-lYZ%lZr-lrs.^s#O-l#O#P.x#P;'S-l;'S;=`1T<%lO-lT-qX&}SOY-lYZ%lZr-lrs.^s#O-l#O#P.x#P;'S-l;'S;=`1T<%lO-lT.cV!sPOY&ZYZ%lZr&Zrs&ys;'S&Z;'S;=`'`<%lO&ZT.}V&}SOY-lYZ%lZr-lrs/ds;'S-l;'S;=`1T<%lO-lT/gXOY,|YZ%lZr,|rs0Ss#O,|#O#P0k#P;'S,|;'S;=`1Z<%lO,|T0XU!sPOY&ZYZ%lZr&Zs;'S&Z;'S;=`'`<%lO&ZT0nVOY-lYZ%lZr-lrs/ds;'S-l;'S;=`1T<%lO-lT1WP;=`<%l-lT1^P;=`<%l,|T1fV!sPOY&ZYZ%lZr&Zrs1{s;'S&Z;'S;=`'`<%lO&ZT2QS&{SXY2^YZ2m]^2rpq2^P2aSXY2^YZ2m]^2rpq2^P2rO&|PP2wP&|PYZ2m_3Rb&}S&_ZOY%QYZ%lZr%Qrs%qst%Qtu2zu!Q%Q!Q![2z![!c%Q!c!}2z!}#R%Q#R#S2z#S#T%Q#T#o2z#o$g%Q$g;'S2z;'S;=`4Z<%lO2z_4^P;=`<%l2zU4hX&}S!eQOY%QYZ%lZr%Qrs%qs!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%QU5[V$RQ&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QV5xZ&xR&}SOY%QYZ%lZr%Qrs%qsv%Qvw6kw!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%QU6rV!_Q&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QT7^Z&}SOY8PYZ%lZr8Prs9_sw8Pwx%Qx#O8P#O#P:i#P;'S8P;'S;=`?j<%lO8PT8UX&}SOY%QYZ%lZr%Qrs%qsw%Qwx8qx;'S%Q;'S;=`&s<%lO%QT8xV!rP&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QT9bXOY&ZYZ%lZr&Zrs&ysw&Zwx9}x;'S&Z;'S;=`'`<%lO&ZT:SV!rPOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QT:nZ&}SOY;aYZ%lZr;ars<Xsw;awx8Px#O;a#O#P8P#P;'S;a;'S;=`=s<%lO;aT;fZ&}SOY;aYZ%lZr;ars<Xsw;awx8qx#O;a#O#P%Q#P;'S;a;'S;=`=s<%lO;aT<[ZOY<}YZ%lZr<}rs=ysw<}wx9}x#O<}#O#P&Z#P;'S<};'S;=`?d<%lO<}T=QZOY;aYZ%lZr;ars<Xsw;awx8qx#O;a#O#P%Q#P;'S;a;'S;=`=s<%lO;aT=vP;=`<%l;aT=|ZOY<}YZ%lZr<}rs>osw<}wx9}x#O<}#O#P&Z#P;'S<};'S;=`?d<%lO<}P>rVOY>oZw>owx?Xx#O>o#P;'S>o;'S;=`?^<%lO>oP?^O!rPP?aP;=`<%l>oT?gP;=`<%l<}T?mP;=`<%l8P_?wVZZ&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QV@eVYR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QVATX$fP&}S!eQOY%QYZ%lZr%Qrs%qs!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%QVAwZ!dR&}SOY%QYZ%lZr%Qrs%qs{%Q{|Bj|!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%QVBqV!nR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QVC_VkR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_C}[&pW!dR&}SOY%QYZ%lZr%Qrs%qs}%Q}!OBj!O!_%Q!_!`5T!`!aDs!a;'S%Q;'S;=`&s<%lO%QVDzV&vR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_EhZWY&}SOY%QYZ%lZr%Qrs%qs!O%Q!O!PFZ!P!Q%Q!Q![Gi![;'S%Q;'S;=`&s<%lO%QVF`X&}SOY%QYZ%lZr%Qrs%qs!O%Q!O!PF{!P;'S%Q;'S;=`&s<%lO%QVGSV&rR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QTGpc&}S!pPOY%QYZ%lZr%Qrs%qs!Q%Q!Q![Gi![!f%Q!f!gH{!g!hIi!h!iH{!i#R%Q#R#SMc#S#W%Q#W#XH{#X#YIi#Y#ZH{#Z;'S%Q;'S;=`&s<%lO%QTISV&}S!pPOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QTIn]&}SOY%QYZ%lZr%Qrs%qs{%Q{|Jg|}%Q}!OJg!O!Q%Q!Q![KX![;'S%Q;'S;=`&s<%lO%QTJlX&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![KX![;'S%Q;'S;=`&s<%lO%QTK`c&}S!pPOY%QYZ%lZr%Qrs%qs!Q%Q!Q![KX![!f%Q!f!gH{!g!h%Q!h!iH{!i#R%Q#R#SLk#S#W%Q#W#XH{#X#Y%Q#Y#ZH{#Z;'S%Q;'S;=`&s<%lO%QTLpZ&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![KX![#R%Q#R#SLk#S;'S%Q;'S;=`&s<%lO%QTMhZ&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![Gi![#R%Q#R#SMc#S;'S%Q;'S;=`&s<%lO%Q_Nb]&}S!eQOY%QYZ%lZr%Qrs%qsz%Qz{! Z{!P%Q!P!Q!'|!Q!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%Q_! `X&}SOY! ZYZ! {Zr! Zrs!#hsz! Zz{!$v{;'S! Z;'S;=`!&[<%lO! Z_!!QT&}SOz!!az{!!s{;'S!!a;'S;=`!#b<%lO!!aZ!!dTOz!!az{!!s{;'S!!a;'S;=`!#b<%lO!!aZ!!vVOz!!az{!!s{!P!!a!P!Q!#]!Q;'S!!a;'S;=`!#b<%lO!!aZ!#bOQZZ!#eP;=`<%l!!a_!#kXOY!$WYZ! {Zr!$Wrs!&bsz!$Wz{!'Q{;'S!$W;'S;=`!'v<%lO!$W_!$ZXOY! ZYZ! {Zr! Zrs!#hsz! Zz{!$v{;'S! Z;'S;=`!&[<%lO! Z_!${Z&}SOY! ZYZ! {Zr! Zrs!#hsz! Zz{!$v{!P! Z!P!Q!%n!Q;'S! Z;'S;=`!&[<%lO! Z_!%uV&}SQZOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_!&_P;=`<%l! Z_!&eXOY!$WYZ! {Zr!$Wrs!!asz!$Wz{!'Q{;'S!$W;'S;=`!'v<%lO!$W_!'TZOY! ZYZ! {Zr! Zrs!#hsz! Zz{!$v{!P! Z!P!Q!%n!Q;'S! Z;'S;=`!&[<%lO! Z_!'yP;=`<%l!$W_!(TV&}SPZOY!'|YZ%lZr!'|rs!(js;'S!'|;'S;=`!)p<%lO!'|_!(oVPZOY!)UYZ%lZr!)Urs!)vs;'S!)U;'S;=`!*y<%lO!)U_!)ZVPZOY!'|YZ%lZr!'|rs!(js;'S!'|;'S;=`!)p<%lO!'|_!)sP;=`<%l!'|_!){VPZOY!)UYZ%lZr!)Urs!*bs;'S!)U;'S;=`!*y<%lO!)UZ!*gSPZOY!*bZ;'S!*b;'S;=`!*s<%lO!*bZ!*vP;=`<%l!*b_!*|P;=`<%l!)UT!+Wq&}S!oPOY%QYZ%lZr%Qrs%qs!O%Q!O!P!-_!P!Q%Q!Q![!.k![!d%Q!d!e!1u!e!f%Q!f!gH{!g!hIi!h!iH{!i!n%Q!n!o!0a!o!z%Q!z!{!3s!{#R%Q#R#S!0}#S#U%Q#U#V!1u#V#W%Q#W#XH{#X#YIi#Y#ZH{#Z#`%Q#`#a!0a#a#l%Q#l#m!3s#m;'S%Q;'S;=`&s<%lO%QT!-fa&}S!pPOY%QYZ%lZr%Qrs%qs!Q%Q!Q![Gi![!f%Q!f!gH{!g!hIi!h!iH{!i#W%Q#W#XH{#X#YIi#Y#ZH{#Z;'S%Q;'S;=`&s<%lO%QT!.ri&}S!oPOY%QYZ%lZr%Qrs%qs!O%Q!O!P!-_!P!Q%Q!Q![!.k![!f%Q!f!gH{!g!hIi!h!iH{!i!n%Q!n!o!0a!o#R%Q#R#S!0}#S#W%Q#W#XH{#X#YIi#Y#ZH{#Z#`%Q#`#a!0a#a;'S%Q;'S;=`&s<%lO%QT!0hV&}S!oPOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QT!1SZ&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![!.k![#R%Q#R#S!0}#S;'S%Q;'S;=`&s<%lO%QT!1zY&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q!R!2j!R!S!2j!S;'S%Q;'S;=`&s<%lO%QT!2q`&}S!oPOY%QYZ%lZr%Qrs%qs!Q%Q!Q!R!2j!R!S!2j!S!n%Q!n!o!0a!o#R%Q#R#S!1u#S#`%Q#`#a!0a#a;'S%Q;'S;=`&s<%lO%QT!3x_&}SOY%QYZ%lZr%Qrs%qs!O%Q!O!P!4w!P!Q%Q!Q![!7V![!c%Q!c!i!7V!i#T%Q#T#Z!7V#Z;'S%Q;'S;=`&s<%lO%QT!4|]&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![!5u![!c%Q!c!i!5u!i#T%Q#T#Z!5u#Z;'S%Q;'S;=`&s<%lO%QT!5zc&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![!5u![!c%Q!c!i!5u!i!r%Q!r!sIi!s#R%Q#R#S!4w#S#T%Q#T#Z!5u#Z#d%Q#d#eIi#e;'S%Q;'S;=`&s<%lO%QT!7^i&}S!oPOY%QYZ%lZr%Qrs%qs!O%Q!O!P!8{!P!Q%Q!Q![!7V![!c%Q!c!i!7V!i!n%Q!n!o!0a!o!r%Q!r!sIi!s#R%Q#R#S!:V#S#T%Q#T#Z!7V#Z#`%Q#`#a!0a#a#d%Q#d#eIi#e;'S%Q;'S;=`&s<%lO%QT!9Qa&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![!5u![!c%Q!c!i!5u!i!r%Q!r!sIi!s#T%Q#T#Z!5u#Z#d%Q#d#eIi#e;'S%Q;'S;=`&s<%lO%QT!:[]&}SOY%QYZ%lZr%Qrs%qs!Q%Q!Q![!7V![!c%Q!c!i!7V!i#T%Q#T#Z!7V#Z;'S%Q;'S;=`&s<%lO%QV!;[X!lR&}SOY%QYZ%lZr%Qrs%qs![%Q![!]!;w!];'S%Q;'S;=`&s<%lO%QV!<OV']R&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QV!<lV!}R&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_!=YY&hZ&}SOY%QYZ%lZr%Qrs%qs!^%Q!^!_!=x!_!`!>l!`;'S%Q;'S;=`&s<%lO%QU!>PX!fQ&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%QU!>sV!]Q&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QV!?aX!TR&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`+p!`;'S%Q;'S;=`&s<%lO%QV!@TY&gR&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`!>l!`!a!@s!a;'S%Q;'S;=`&s<%lO%QU!@zY!fQ&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`5T!`!a!=x!a;'S%Q;'S;=`&s<%lO%Q_!AsV&kX!kQ&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_!BaX&]Z&}SOY%QYZ%lZr%Qrs%qs#]%Q#]#^!B|#^;'S%Q;'S;=`&s<%lO%QV!CRX&}SOY%QYZ%lZr%Qrs%qs#b%Q#b#c!Cn#c;'S%Q;'S;=`&s<%lO%QV!CsX&}SOY%QYZ%lZr%Qrs%qs#h%Q#h#i!D`#i;'S%Q;'S;=`&s<%lO%QV!DeX&}SOY%QYZ%lZr%Qrs%qs#X%Q#X#Y!EQ#Y;'S%Q;'S;=`&s<%lO%QV!EVX&}SOY%QYZ%lZr%Qrs%qs#f%Q#f#g!Er#g;'S%Q;'S;=`&s<%lO%QV!EwX&}SOY%QYZ%lZr%Qrs%qs#Y%Q#Y#Z!Fd#Z;'S%Q;'S;=`&s<%lO%QV!FiX&}SOY%QYZ%lZr%Qrs%qs#T%Q#T#U!GU#U;'S%Q;'S;=`&s<%lO%QV!GZX&}SOY%QYZ%lZr%Qrs%qs#V%Q#V#W!Gv#W;'S%Q;'S;=`&s<%lO%QV!G{X&}SOY%QYZ%lZr%Qrs%qs#X%Q#X#Y!Hh#Y;'S%Q;'S;=`&s<%lO%QV!HoV'ZR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_!I]b&aZ&}SOY%QYZ%lZr%Qrs%qst%Qtu!IUu!Q%Q!Q![!IU![!c%Q!c!}!IU!}#R%Q#R#S!IU#S#T%Q#T#o!IU#o$g%Q$g;'S!IU;'S;=`!Je<%lO!IU_!JhP;=`<%l!IU_!JrVoZ&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QV!K`VmR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QU!K|X!cQ&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`5T!`;'S%Q;'S;=`&s<%lO%QV!LpV!VR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_!M`Z'dX!bQ&}SOY%QYZ%lZr%Qrs%qs!_%Q!_!`5T!`#p%Q#p#q!NR#q;'S%Q;'S;=`&s<%lO%QU!NYV!`Q&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QV!NvV!UR&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%QT# dV$OP&}SOY%QYZ%lZr%Qrs%qs;'S%Q;'S;=`&s<%lO%Q_#!Su&}S&XZ&_ZOX%QXY'fYZ)bZ^'f^p%Qpq'fqr%Qrs%qst%Qtu2zu!Q%Q!Q![2z![!c%Q!c!}2z!}#R%Q#R#S2z#S#T%Q#T#o2z#o#y%Q#y#z'f#z$f%Q$f$g'f$g#BY2z#BY#BZ# y#BZ$IS2z$IS$I_# y$I_$I|2z$I|$JO# y$JO$JT2z$JT$JU# y$JU$KV2z$KV$KW# y$KW&FU2z&FU&FV# y&FV;'S2z;'S;=`4Z<%lO2z",
  tokenizers: [0, 1, 2, 3],
  topRules: { "Program": [0, 3], "ClassContent": [1, 206] },
  dynamicPrecedences: { "21": 1, "246": -1, "252": -1 },
  specialized: [{ term: 245, get: (value) => spec_identifier[value] || -1 }],
  tokenPrec: 9164
});
const javaLanguage = /* @__PURE__ */ LRLanguage.define({
  name: "java",
  parser: /* @__PURE__ */ parser$1.configure({
    props: [
      /* @__PURE__ */ indentNodeProp.add({
        IfStatement: /* @__PURE__ */ continuedIndent({ except: /^\s*({|else\b)/ }),
        TryStatement: /* @__PURE__ */ continuedIndent({ except: /^\s*({|catch|finally)\b/ }),
        LabeledStatement: flatIndent,
        SwitchBlock: (context) => {
          let after = context.textAfter, closed = /^\s*\}/.test(after), isCase = /^\s*(case|default)\b/.test(after);
          return context.baseIndent + (closed ? 0 : isCase ? 1 : 2) * context.unit;
        },
        Block: /* @__PURE__ */ delimitedIndent({ closing: "}" }),
        BlockComment: () => null,
        Statement: /* @__PURE__ */ continuedIndent({ except: /^{/ })
      }),
      /* @__PURE__ */ foldNodeProp.add({
        ["Block SwitchBlock ClassBody ElementValueArrayInitializer ModuleBody EnumBody ConstructorBody InterfaceBody ArrayInitializer"]: foldInside,
        BlockComment(tree) {
          return { from: tree.from + 2, to: tree.to - 2 };
        }
      })
    ]
  }),
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    indentOnInput: /^\s*(?:case |default:|\{|\})$/
  }
});
function java() {
  return new LanguageSupport(javaLanguage);
}
const jsonHighlighting = styleTags({
  String: tags.string,
  Number: tags.number,
  "True False": tags.bool,
  PropertyName: tags.propertyName,
  Null: tags.null,
  ", :": tags.separator,
  "[ ]": tags.squareBracket,
  "{ }": tags.brace
});
const parser = LRParser.deserialize({
  version: 14,
  states: "$bOVQPOOOOQO'#Cb'#CbOnQPO'#CeOvQPO'#ClOOQO'#Cr'#CrQOQPOOOOQO'#Cg'#CgO}QPO'#CfO!SQPO'#CtOOQO,59P,59PO![QPO,59PO!aQPO'#CuOOQO,59W,59WO!iQPO,59WOVQPO,59QOqQPO'#CmO!nQPO,59`OOQO1G.k1G.kOVQPO'#CnO!vQPO,59aOOQO1G.r1G.rOOQO1G.l1G.lOOQO,59X,59XOOQO-E6k-E6kOOQO,59Y,59YOOQO-E6l-E6l",
  stateData: "#O~OeOS~OQSORSOSSOTSOWQO_ROgPO~OVXOgUO~O^[O~PVO[^O~O]_OVhX~OVaO~O]bO^iX~O^dO~O]_OVha~O]bO^ia~O",
  goto: "!kjPPPPPPkPPkqwPPPPk{!RPPP!XP!e!hXSOR^bQWQRf_TVQ_Q`WRg`QcZRicQTOQZRQe^RhbRYQR]R",
  nodeNames: "⚠ JsonText True False Null Number String } { Object Property PropertyName : , ] [ Array",
  maxTerm: 25,
  nodeProps: [
    ["isolate", -2, 6, 11, ""],
    ["openedBy", 7, "{", 14, "["],
    ["closedBy", 8, "}", 15, "]"]
  ],
  propSources: [jsonHighlighting],
  skippedNodes: [0],
  repeatNodeCount: 2,
  tokenData: "(|~RaXY!WYZ!W]^!Wpq!Wrs!]|}$u}!O$z!Q!R%T!R![&c![!]&t!}#O&y#P#Q'O#Y#Z'T#b#c'r#h#i(Z#o#p(r#q#r(w~!]Oe~~!`Wpq!]qr!]rs!xs#O!]#O#P!}#P;'S!];'S;=`$o<%lO!]~!}Og~~#QXrs!]!P!Q!]#O#P!]#U#V!]#Y#Z!]#b#c!]#f#g!]#h#i!]#i#j#m~#pR!Q![#y!c!i#y#T#Z#y~#|R!Q![$V!c!i$V#T#Z$V~$YR!Q![$c!c!i$c#T#Z$c~$fR!Q![!]!c!i!]#T#Z!]~$rP;=`<%l!]~$zO]~~$}Q!Q!R%T!R![&c~%YRT~!O!P%c!g!h%w#X#Y%w~%fP!Q![%i~%nRT~!Q![%i!g!h%w#X#Y%w~%zR{|&T}!O&T!Q![&Z~&WP!Q![&Z~&`PT~!Q![&Z~&hST~!O!P%c!Q![&c!g!h%w#X#Y%w~&yO[~~'OO_~~'TO^~~'WP#T#U'Z~'^P#`#a'a~'dP#g#h'g~'jP#X#Y'm~'rOR~~'uP#i#j'x~'{P#`#a(O~(RP#`#a(U~(ZOS~~(^P#f#g(a~(dP#i#j(g~(jP#X#Y(m~(rOQ~~(wOW~~(|OV~",
  tokenizers: [0],
  topRules: { "JsonText": [0, 1] },
  tokenPrec: 0
});
const jsonLanguage = /* @__PURE__ */ LRLanguage.define({
  name: "json",
  parser: /* @__PURE__ */ parser.configure({
    props: [
      /* @__PURE__ */ indentNodeProp.add({
        Object: /* @__PURE__ */ continuedIndent({ except: /^\s*\}/ }),
        Array: /* @__PURE__ */ continuedIndent({ except: /^\s*\]/ })
      }),
      /* @__PURE__ */ foldNodeProp.add({
        "Object Array": foldInside
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["[", "{", '"'] },
    indentOnInput: /^\s*[\}\]]$/
  }
});
function json() {
  return new LanguageSupport(jsonLanguage);
}
const chalky = "#e5c07b", coral = "#e06c75", cyan = "#56b6c2", invalid = "#ffffff", ivory = "#abb2bf", stone = "#7d8799", malibu = "#61afef", sage = "#98c379", whiskey = "#d19a66", violet = "#c678dd", darkBackground = "#21252b", highlightBackground = "#2c313a", background = "#282c34", tooltipBackground = "#353a42", selection = "#3E4451", cursor = "#528bff";
const oneDarkTheme = /* @__PURE__ */ EditorView.theme({
  "&": {
    color: ivory,
    backgroundColor: background
  },
  ".cm-content": {
    caretColor: cursor
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
  ".cm-panels": { backgroundColor: darkBackground, color: ivory },
  ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
  ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },
  ".cm-searchMatch": {
    backgroundColor: "#72a1ff59",
    outline: "1px solid #457dff"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#6199ff2f"
  },
  ".cm-activeLine": { backgroundColor: "#6699ff0b" },
  ".cm-selectionMatch": { backgroundColor: "#aafe661a" },
  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "#bad0f847"
  },
  ".cm-gutters": {
    backgroundColor: background,
    color: stone,
    border: "none"
  },
  ".cm-activeLineGutter": {
    backgroundColor: highlightBackground
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "#ddd"
  },
  ".cm-tooltip": {
    border: "none",
    backgroundColor: tooltipBackground
  },
  ".cm-tooltip .cm-tooltip-arrow:before": {
    borderTopColor: "transparent",
    borderBottomColor: "transparent"
  },
  ".cm-tooltip .cm-tooltip-arrow:after": {
    borderTopColor: tooltipBackground,
    borderBottomColor: tooltipBackground
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: highlightBackground,
      color: ivory
    }
  }
}, { dark: true });
const oneDarkHighlightStyle = /* @__PURE__ */ HighlightStyle.define([
  {
    tag: tags.keyword,
    color: violet
  },
  {
    tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
    color: coral
  },
  {
    tag: [/* @__PURE__ */ tags.function(tags.variableName), tags.labelName],
    color: malibu
  },
  {
    tag: [tags.color, /* @__PURE__ */ tags.constant(tags.name), /* @__PURE__ */ tags.standard(tags.name)],
    color: whiskey
  },
  {
    tag: [/* @__PURE__ */ tags.definition(tags.name), tags.separator],
    color: ivory
  },
  {
    tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
    color: chalky
  },
  {
    tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, /* @__PURE__ */ tags.special(tags.string)],
    color: cyan
  },
  {
    tag: [tags.meta, tags.comment],
    color: stone
  },
  {
    tag: tags.strong,
    fontWeight: "bold"
  },
  {
    tag: tags.emphasis,
    fontStyle: "italic"
  },
  {
    tag: tags.strikethrough,
    textDecoration: "line-through"
  },
  {
    tag: tags.link,
    color: stone,
    textDecoration: "underline"
  },
  {
    tag: tags.heading,
    fontWeight: "bold",
    color: coral
  },
  {
    tag: [tags.atom, tags.bool, /* @__PURE__ */ tags.special(tags.variableName)],
    color: whiskey
  },
  {
    tag: [tags.processingInstruction, tags.string, tags.inserted],
    color: sage
  },
  {
    tag: tags.invalid,
    color: invalid
  }
]);
const oneDark = [oneDarkTheme, /* @__PURE__ */ syntaxHighlighting(oneDarkHighlightStyle)];
const $ = (id) => document.getElementById(id);
const GRADLE_SETTINGS_KEY = "javaide.gradle.settings";
function loadGradleSettings() {
  const defaults2 = {
    logLevel: "",
    stacktrace: false,
    offline: false,
    warnings: false,
    extra: ""
  };
  try {
    const stored = JSON.parse(localStorage.getItem(GRADLE_SETTINGS_KEY) || "{}");
    return {
      logLevel: stored.logLevel === "--info" || stored.logLevel === "--debug" ? stored.logLevel : "",
      stacktrace: Boolean(stored.stacktrace),
      offline: Boolean(stored.offline),
      warnings: Boolean(stored.warnings),
      extra: typeof stored.extra === "string" ? stored.extra : ""
    };
  } catch {
    return defaults2;
  }
}
const state = {
  root: "",
  files: [],
  collapsed: /* @__PURE__ */ new Set(),
  docs: /* @__PURE__ */ new Map(),
  active: null,
  gradle: null,
  gradleActive: null,
  gradleSettings: loadGradleSettings(),
  ai: {
    connected: false,
    sessions: [],
    session: null,
    streaming: null,
    parts: /* @__PURE__ */ new Map()
  }
};
let editor = null;
let busyCount = 0;
function setBusy(label) {
  busyCount += 1;
  $("busy").classList.remove("hidden");
  $("busy").textContent = label || "working…";
  $("status-text").textContent = label || "Working…";
}
function clearBusy() {
  busyCount = Math.max(0, busyCount - 1);
  if (busyCount === 0) {
    $("busy").classList.add("hidden");
    $("status-text").textContent = "Ready";
  }
}
async function call(command2, args) {
  try {
    return await invoke(command2, args);
  } catch (error) {
    showError(String(error));
    throw error;
  }
}
function showError(message) {
  $("status-text").textContent = message;
  $("statusbar").classList.add("error");
  setTimeout(() => $("statusbar").classList.remove("error"), 6e3);
}
function setStatus(message) {
  $("status-text").textContent = message;
}
function join(root, relative) {
  return `${root.replace(/\/$/, "")}/${relative}`;
}
function languageFor(path) {
  if (path.endsWith(".java")) return java();
  if (path.endsWith(".json")) return json();
  return [];
}
function editorExtensions(path) {
  return [
    basicSetup,
    oneDark,
    languageFor(path),
    keymap.of([
      {
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          saveActive();
          return true;
        }
      }
    ]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || !state.active) return;
      const doc2 = state.docs.get(state.active);
      if (!doc2) return;
      doc2.content = update.state.doc.toString();
      if (!doc2.dirty) {
        doc2.dirty = true;
        renderTabs();
      }
      updateStatusRight();
    })
  ];
}
function createEditor() {
  editor = new EditorView({
    state: EditorState.create({ doc: "" }),
    parent: $("editor")
  });
}
function showActiveDocument() {
  const doc2 = state.active ? state.docs.get(state.active) : null;
  if (!doc2) {
    $("welcome").classList.remove("hidden");
    $("editor").classList.add("hidden");
    editor.setState(EditorState.create({ doc: "" }));
    updateStatusRight();
    return;
  }
  $("welcome").classList.add("hidden");
  $("editor").classList.remove("hidden");
  editor.setState(
    EditorState.create({ doc: doc2.content, extensions: editorExtensions(doc2.path) })
  );
  updateStatusRight();
}
async function openFile(entry) {
  if (entry.isDir) return;
  const path = join(state.root, entry.path);
  if (state.docs.has(path)) {
    state.active = path;
    renderTabs();
    renderTree();
    showActiveDocument();
    return;
  }
  setBusy(`Opening ${entry.name}…`);
  try {
    const content2 = await call("read_file", { path });
    state.docs.set(path, { path, name: entry.name, content: content2, dirty: false });
    state.active = path;
    renderTabs();
    renderTree();
    showActiveDocument();
    setStatus(`Opened ${entry.name}`);
  } finally {
    clearBusy();
  }
}
function closeFile(path, event) {
  event.stopPropagation();
  const doc2 = state.docs.get(path);
  if (doc2?.dirty && !confirm(`${doc2.name} has unsaved changes. Close it?`)) return;
  state.docs.delete(path);
  if (state.active === path) {
    state.active = [...state.docs.keys()].pop() || null;
  }
  renderTabs();
  showActiveDocument();
}
function renderTabs() {
  const tabs = $("tabs");
  tabs.replaceChildren();
  for (const [path, doc2] of state.docs) {
    const tab = document.createElement("div");
    tab.className = `tab${path === state.active ? " active" : ""}`;
    tab.title = path;
    tab.addEventListener("click", () => {
      state.active = path;
      renderTabs();
      renderTree();
      showActiveDocument();
    });
    const name2 = document.createElement("span");
    name2.textContent = doc2.name;
    tab.appendChild(name2);
    if (doc2.dirty) {
      const dot = document.createElement("span");
      dot.className = "dirty";
      tab.appendChild(dot);
    }
    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "×";
    close.addEventListener("click", (event) => closeFile(path, event));
    tab.appendChild(close);
    tabs.appendChild(tab);
  }
}
async function saveActive() {
  if (!state.active) return;
  const doc2 = state.docs.get(state.active);
  if (!doc2) return;
  try {
    await call("write_file", { path: doc2.path, content: doc2.content });
    doc2.dirty = false;
    renderTabs();
    setStatus(`Saved ${doc2.name}`);
  } catch {
  }
}
function updateStatusRight() {
  const parts = [];
  if (state.active) {
    const doc2 = state.docs.get(state.active);
    if (doc2) parts.push(`${doc2.name}${doc2.dirty ? " •" : ""}`);
  }
  if (state.gradle) parts.push(`Gradle ${state.gradle.gradleVersion}`);
  if (state.ai.connected) parts.push("OpenCode ready");
  $("status-right").textContent = parts.join("   ");
}
async function openWorkspace(path) {
  setBusy("Opening workspace…");
  try {
    const view = await call("open_workspace", { path });
    state.root = view.root;
    state.files = view.files;
    state.collapsed = new Set(
      view.files.filter((entry) => entry.isDir).map((entry) => entry.path)
    );
    state.docs.clear();
    state.active = null;
    state.gradle = null;
    setGradleActive(null);
    $("workspace-path").textContent = view.root;
    $("workspace-path").title = view.root;
    $("gradle-log").textContent = "";
    $("gradle-tests").replaceChildren();
    renderTree();
    renderTabs();
    showActiveDocument();
    renderGradle();
    setStatus(`Workspace: ${view.root}`);
    updateStatusRight();
  } finally {
    clearBusy();
  }
}
function renderTree() {
  const tree = $("file-tree");
  tree.replaceChildren();
  for (const entry of state.files) {
    if (isHiddenByCollapse(entry)) continue;
    const row = document.createElement("div");
    row.className = `tree-row${entry.isDir ? " dir" : ""}`;
    if (!entry.isDir && state.active === join(state.root, entry.path)) {
      row.classList.add("active");
    }
    row.style.paddingLeft = `${8 + entry.depth * 12}px`;
    const icon = document.createElement("span");
    icon.className = "tree-icon";
    if (entry.isDir) {
      icon.textContent = state.collapsed.has(entry.path) ? "▸" : "▾";
    } else {
      icon.textContent = iconFor(entry.name);
    }
    const name2 = document.createElement("span");
    name2.className = "tree-name";
    name2.textContent = entry.name;
    row.append(icon, name2);
    row.addEventListener("click", () => {
      if (entry.isDir) {
        if (state.collapsed.has(entry.path)) state.collapsed.delete(entry.path);
        else state.collapsed.add(entry.path);
        renderTree();
      } else {
        openFile(entry);
      }
    });
    tree.appendChild(row);
  }
}
function iconFor(name2) {
  if (name2.endsWith(".java")) return "☕";
  if (name2.endsWith(".gradle") || name2.endsWith(".kts")) return "⚙";
  if (name2.endsWith(".json")) return "{}";
  if (name2.endsWith(".md")) return "M";
  return "·";
}
function isHiddenByCollapse(entry) {
  for (const dir of state.collapsed) {
    if (entry.path.startsWith(`${dir}/`)) return true;
  }
  return false;
}
function appendGradleLog(line) {
  const log = $("gradle-log");
  log.textContent += `${line}
`;
  log.scrollTop = log.scrollHeight;
}
function saveGradleSettings() {
  try {
    localStorage.setItem(GRADLE_SETTINGS_KEY, JSON.stringify(state.gradleSettings));
  } catch {
  }
}
function renderGradleSettings() {
  const settings = state.gradleSettings;
  $("gradle-log-level").value = settings.logLevel;
  $("gradle-opt-stacktrace").checked = settings.stacktrace;
  $("gradle-opt-offline").checked = settings.offline;
  $("gradle-opt-warnings").checked = settings.warnings;
  $("gradle-extra-args").value = settings.extra;
}
function readGradleSettings() {
  state.gradleSettings = {
    logLevel: $("gradle-log-level").value,
    stacktrace: $("gradle-opt-stacktrace").checked,
    offline: $("gradle-opt-offline").checked,
    warnings: $("gradle-opt-warnings").checked,
    extra: $("gradle-extra-args").value
  };
  saveGradleSettings();
}
function splitGradleArguments(text) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}
function gradleArguments() {
  const settings = state.gradleSettings;
  const args = [];
  if (settings.logLevel) args.push(settings.logLevel);
  if (settings.stacktrace) args.push("--stacktrace");
  if (settings.offline) args.push("--offline");
  if (settings.warnings) args.push("--warning-mode", "all");
  args.push(...splitGradleArguments(settings.extra));
  return args;
}
function isCancellation(error) {
  return /cancel/i.test(String(error));
}
function setGradleActive(active) {
  state.gradleActive = active;
  const running = Boolean(active);
  $("gradle-stop").disabled = !running;
  $("gradle-sync").disabled = running;
  $("gradle-list-tests").disabled = running;
  for (const button of document.querySelectorAll("#gradle-tests button")) {
    button.disabled = running;
  }
  $("gradle-stop").title = running ? `Stop ${active.kind || "Gradle operation"}: ${active.label || ""}`.trim() : "Stop the running Gradle operation";
  renderGradle();
}
async function withGradle(label, kind, body) {
  if (state.gradleActive) {
    setStatus("Gradle is already running");
    return;
  }
  setGradleActive({ label, kind });
  setBusy(label);
  try {
    await body();
  } finally {
    setGradleActive(null);
    clearBusy();
  }
}
function renderGradle() {
  const projects = $("gradle-projects");
  projects.replaceChildren();
  const snapshot = state.gradle;
  if (!snapshot) {
    $("gradle-summary").textContent = "Not synced. Press ⟳ to sync.";
    updateStatusRight();
    return;
  }
  $("gradle-summary").textContent = `Gradle ${snapshot.gradleVersion} · ${snapshot.projects.length} project(s) · ${snapshot.problems.length} problem(s)`;
  for (const project of snapshot.projects) {
    const header = document.createElement("div");
    header.className = "gradle-project";
    header.textContent = project.path === ":" ? project.name : `${project.path}`;
    projects.appendChild(header);
    const tasks = [...project.tasks].sort(
      (a, b) => (a.group || "~").localeCompare(b.group || "~") || a.name.localeCompare(b.name)
    );
    for (const task of tasks) {
      const row = document.createElement("div");
      row.className = `gradle-task${state.gradleActive ? " disabled" : ""}`;
      row.title = task.description || task.path;
      const name2 = document.createElement("span");
      name2.className = "gradle-task-name";
      name2.textContent = task.name;
      row.appendChild(name2);
      if (task.isTest) {
        const badge = document.createElement("span");
        badge.className = "gradle-task-badge test";
        badge.textContent = "test";
        row.appendChild(badge);
      } else if (task.isRun) {
        const badge = document.createElement("span");
        badge.className = "gradle-task-badge";
        badge.textContent = "run";
        row.appendChild(badge);
      }
      row.addEventListener("click", () => {
        if (!state.gradleActive) runGradleTask(task);
      });
      projects.appendChild(row);
    }
  }
  updateStatusRight();
}
async function gradleSync() {
  await withGradle("Syncing Gradle…", "sync", async () => {
    const args = gradleArguments();
    appendGradleLog(`Syncing ${state.root}…`);
    if (args.length) appendGradleLog(`  Gradle args: ${args.join(" ")}`);
    try {
      const snapshot = await call("gradle_sync", { arguments: args });
      state.gradle = snapshot;
      renderGradle();
      appendGradleLog(
        `Synced Gradle ${snapshot.gradleVersion} (${snapshot.projects.length} projects)`
      );
      setStatus("Gradle sync complete");
    } catch (error) {
      if (isCancellation(error)) {
        appendGradleLog("Sync cancelled.");
        setStatus("Gradle sync cancelled");
      } else {
        appendGradleLog(`Sync failed: ${error}`);
      }
    }
  });
}
async function runGradleTask(task) {
  await withGradle(`Running ${task.path}…`, "task", async () => {
    const args = gradleArguments();
    appendGradleLog(`> ${task.path}`);
    if (args.length) appendGradleLog(`  Gradle args: ${args.join(" ")}`);
    try {
      const result = await call("gradle_run_task", { task: task.path, arguments: args });
      for (const outcome of result.taskOutcomes) {
        appendGradleLog(`  ${outcome.outcome.padEnd(12)} ${outcome.taskPath}`);
      }
      if (result.stdout) appendGradleLog(result.stdout.trimEnd());
      if (result.stderr) appendGradleLog(result.stderr.trimEnd());
      for (const failure of result.failures) appendGradleLog(`FAILURE: ${failure}`);
      if (result.cancelled) {
        appendGradleLog(`  CANCELLED after ${result.durationMs} ms`);
        setStatus(`${task.path} cancelled`);
      } else {
        setStatus(
          `${task.path} ${result.failed ? "failed" : "finished"} in ${result.durationMs} ms`
        );
      }
    } catch (error) {
      if (isCancellation(error)) {
        appendGradleLog(`Run cancelled: ${error}`);
        setStatus(`${task.path} cancelled`);
      } else {
        appendGradleLog(`Run failed: ${error}`);
      }
    }
  });
}
async function discoverTests() {
  const container = $("gradle-tests");
  await withGradle("Discovering tests…", "test discovery", async () => {
    const args = gradleArguments();
    container.replaceChildren();
    if (args.length) appendGradleLog(`Test discovery args: ${args.join(" ")}`);
    try {
      const listing = await call("gradle_list_tests", { arguments: args });
      if (!listing.tests.length) {
        container.textContent = "No compiled tests found.";
        return;
      }
      for (const testClass of listing.tests) {
        const row = document.createElement("div");
        row.className = "test-class";
        const label = document.createElement("span");
        label.textContent = testClass.className;
        label.title = `${testClass.methods.length} method(s)`;
        const button = document.createElement("button");
        button.className = "text-button";
        button.textContent = "Run";
        button.addEventListener("click", () => {
          if (!state.gradleActive) runTests(testClass.className);
        });
        row.append(label, button);
        container.appendChild(row);
      }
      setStatus(`Discovered ${listing.tests.length} test class(es)`);
    } catch (error) {
      if (isCancellation(error)) {
        container.textContent = "Discovery cancelled.";
        setStatus("Test discovery cancelled");
      } else {
        container.textContent = `Discovery failed: ${error}`;
      }
    }
  });
}
async function runTests(className) {
  await withGradle(`Running ${className || "tests"}…`, "test run", async () => {
    const args = gradleArguments();
    appendGradleLog(`> test ${className || "(all)"}`);
    if (args.length) appendGradleLog(`  Gradle args: ${args.join(" ")}`);
    try {
      const result = await call("gradle_run_tests", {
        className: className || null,
        arguments: args
      });
      const tests = result.tests.filter((test) => test.atomic);
      for (const test of tests) {
        appendGradleLog(
          `  ${test.state.padEnd(10)} ${test.className || "?"}.${test.methodName || test.name} (${test.durationMs} ms)`
        );
      }
      if (!tests.length) {
        appendGradleLog(`  no test events (failed=${result.failed})`);
      }
      for (const failure of result.failures) appendGradleLog(`FAILURE: ${failure}`);
      if (result.stdout) appendGradleLog(result.stdout.trimEnd());
      if (result.cancelled) {
        appendGradleLog(`  CANCELLED after ${result.durationMs} ms`);
        setStatus("Tests cancelled");
      } else {
        setStatus(`Tests ${result.failed ? "failed" : "finished"} in ${result.durationMs} ms`);
      }
    } catch (error) {
      if (isCancellation(error)) {
        appendGradleLog(`Test run cancelled: ${error}`);
        setStatus("Tests cancelled");
      } else {
        appendGradleLog(`Test run failed: ${error}`);
      }
    }
  });
}
async function stopGradle() {
  if (!state.gradleActive) return;
  const label = state.gradleActive.label || "Gradle operation";
  $("gradle-stop").disabled = true;
  appendGradleLog(`Cancelling ${label}…`);
  setStatus("Cancelling Gradle…");
  try {
    const result = await call("gradle_cancel");
    if (result.cancelled) {
      appendGradleLog(`  cancellation requested (${result.requestId})`);
    } else {
      appendGradleLog(`  ${result.requestId} already finished`);
      setStatus("Gradle operation already finished");
    }
  } catch (error) {
    appendGradleLog(`Cancel failed: ${error}`);
    if (state.gradleActive) $("gradle-stop").disabled = false;
  }
}
function aiAppend(role, text, kind = "") {
  const messages = $("ai-messages");
  const element = document.createElement("div");
  element.className = `ai-message ${kind}`.trim();
  if (role) {
    const label = document.createElement("span");
    label.className = "role";
    label.textContent = role;
    element.appendChild(label);
  }
  element.appendChild(document.createTextNode(text.slice(0, 4e3)));
  messages.appendChild(element);
  while (messages.childElementCount > 250) messages.firstElementChild.remove();
  messages.scrollTop = messages.scrollHeight;
  return element;
}
function aiReset() {
  $("ai-messages").replaceChildren();
  state.ai.streaming = null;
  state.ai.parts.clear();
}
async function aiConnect() {
  setBusy("Connecting to OpenCode…");
  try {
    const info = await call("opencode_connect");
    state.ai.connected = true;
    $("ai-status").textContent = `OpenCode ${info.version} · pid ${info.pid} · ${info.url}`;
    await aiRefreshSessions();
    updateStatusRight();
    setStatus("OpenCode connected");
  } catch (error) {
    $("ai-status").textContent = `Not connected: ${error}`;
  } finally {
    clearBusy();
  }
}
async function aiRefreshSessions() {
  if (!state.ai.connected) return;
  try {
    const sessions = await call("opencode_sessions");
    state.ai.sessions = sessions;
    const container = $("ai-sessions");
    container.replaceChildren();
    for (const session of sessions) {
      const row = document.createElement("div");
      row.className = `ai-session${session.id === state.ai.session ? " active" : ""}`;
      row.textContent = session.title || session.id;
      row.title = session.id;
      row.addEventListener("click", () => aiSelectSession(session));
      container.appendChild(row);
    }
  } catch (error) {
    $("ai-status").textContent = `Session list failed: ${error}`;
  }
}
async function aiNewSession() {
  if (!state.ai.connected) await aiConnect();
  if (!state.ai.connected) return;
  setBusy("Creating session…");
  try {
    const session = await call("opencode_create_session");
    state.ai.session = session.id;
    aiReset();
    aiAppend("assistant", "New session ready.");
    await aiRefreshSessions();
    setStatus(`OpenCode session ${session.id}`);
  } catch (error) {
    aiAppend("error", String(error), "error");
  } finally {
    clearBusy();
  }
}
async function aiSelectSession(session) {
  state.ai.session = session.id;
  aiReset();
  renderAiSessions();
  try {
    const context = await call("opencode_context", { sessionId: session.id });
    for (const message of context) {
      const role = message?.role || message?.info?.role || "assistant";
      const text = collectText(message);
      if (text) aiAppend(role, text, role === "user" ? "user" : "");
    }
    if (!context.length) aiAppend("assistant", "No messages yet.");
  } catch (error) {
    aiAppend("error", String(error), "error");
  }
}
function renderAiSessions() {
  const container = $("ai-sessions");
  container.replaceChildren();
  for (const session of state.ai.sessions) {
    const row = document.createElement("div");
    row.className = `ai-session${session.id === state.ai.session ? " active" : ""}`;
    row.textContent = session.title || session.id;
    row.title = session.id;
    row.addEventListener("click", () => aiSelectSession(session));
    container.appendChild(row);
  }
}
function collectText(value, depth = 0) {
  if (depth > 8 || value == null) return "";
  if (typeof value === "string") return "";
  if (Array.isArray(value)) {
    return value.map((item) => collectText(item, depth + 1)).filter(Boolean).join("\n");
  }
  if (typeof value !== "object") return "";
  if (typeof value.text === "string" && (value.type === "text" || value.type === void 0)) {
    return value.text;
  }
  const candidates = [];
  for (const key of ["parts", "content", "message", "info", "data", "properties"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && (key === "content" || key === "text")) {
      candidates.push(candidate);
    } else if (candidate) {
      candidates.push(collectText(candidate, depth + 1));
    }
  }
  return candidates.filter(Boolean).join("\n");
}
async function aiSend() {
  const input = $("ai-input");
  const text = input.value.trim();
  if (!text) return;
  if (!state.ai.connected) await aiConnect();
  if (!state.ai.connected) return;
  if (!state.ai.session) await aiNewSession();
  if (!state.ai.session) return;
  input.value = "";
  aiAppend("you", text, "user");
  state.ai.streaming = aiAppend("assistant", "");
  state.ai.parts.clear();
  try {
    await call("opencode_prompt", { sessionId: state.ai.session, text });
    setStatus("Prompt sent");
  } catch (error) {
    aiAppend("error", String(error), "error");
  }
}
function handleAiEvent(payload) {
  if (!payload || typeof payload.name !== "string") return;
  if (!state.ai.session) return;
  const name2 = payload.name;
  const data = payload.data || {};
  const sessionId = data.sessionID || data.properties?.sessionID || data.data?.sessionID || data.info?.sessionID || null;
  if (sessionId && sessionId !== state.ai.session) return;
  if (name2 === "session.idle") {
    setStatus("OpenCode idle");
    if (state.ai.session) refreshSessionContext(state.ai.session);
    return;
  }
  if (name2 === "session.error" || name2.endsWith(".error")) {
    aiAppend("error", collectText(data) || name2, "error");
    return;
  }
  const part = data.properties?.part || data.part || data.data?.part;
  if (part && typeof part.text === "string") {
    const key = part.id || part.messageID || "text";
    const previous = state.ai.parts.get(key) || "";
    let delta2 = part.text;
    if (part.text.startsWith(previous)) delta2 = part.text.slice(previous.length);
    state.ai.parts.set(key, part.text);
    if (delta2) {
      if (!state.ai.streaming) state.ai.streaming = aiAppend("assistant", "");
      state.ai.streaming.appendChild(document.createTextNode(delta2));
      const messages = $("ai-messages");
      messages.scrollTop = messages.scrollHeight;
    }
    return;
  }
  const delta = data.delta || data.properties?.delta || data.data?.delta;
  if (typeof delta === "string" && delta) {
    if (!state.ai.streaming) state.ai.streaming = aiAppend("assistant", "");
    state.ai.streaming.appendChild(document.createTextNode(delta));
    return;
  }
  if (name2.includes("tool") || name2.includes("permission")) {
    const summary = (collectText(data) || JSON.stringify(data)).slice(0, 500);
    aiAppend(name2, summary, "tool");
  }
}
async function refreshSessionContext(sessionId) {
  try {
    const context = await call("opencode_context", { sessionId });
    if (sessionId !== state.ai.session) return;
    const text = context.map((message) => collectText(message)).filter(Boolean).join("\n");
    if (text && state.ai.streaming && !state.ai.streaming.textContent.trim()) {
      state.ai.streaming.textContent = text;
    }
  } catch {
  }
}
async function aiStop() {
  if (!state.ai.session) return;
  try {
    await call("opencode_interrupt", { sessionId: state.ai.session });
    setStatus("Interrupt requested");
  } catch (error) {
    aiAppend("error", String(error), "error");
  }
}
function bindPanels() {
  for (const button of document.querySelectorAll(".activity-button")) {
    button.addEventListener("click", () => {
      for (const other of document.querySelectorAll(".activity-button")) {
        other.classList.toggle("active", other === button);
      }
      for (const panel of document.querySelectorAll(".panel")) panel.classList.add("hidden");
      $(`panel-${button.dataset.panel}`).classList.remove("hidden");
    });
  }
}
async function boot() {
  createEditor();
  bindPanels();
  $("open-folder").addEventListener("click", async () => {
    const directory = await open({ directory: true, multiple: false, title: "Open workspace" });
    if (directory) await openWorkspace(directory);
  });
  $("refresh-files").addEventListener("click", async () => {
    if (state.root) await openWorkspace(state.root);
  });
  $("gradle-sync").addEventListener("click", gradleSync);
  $("gradle-stop").addEventListener("click", stopGradle);
  $("gradle-settings-toggle").addEventListener("click", () => {
    $("gradle-settings").classList.toggle("hidden");
  });
  for (const id of [
    "gradle-log-level",
    "gradle-opt-stacktrace",
    "gradle-opt-offline",
    "gradle-opt-warnings"
  ]) {
    $(id).addEventListener("change", readGradleSettings);
  }
  $("gradle-extra-args").addEventListener("input", readGradleSettings);
  renderGradleSettings();
  $("gradle-list-tests").addEventListener("click", discoverTests);
  $("gradle-clear").addEventListener("click", () => $("gradle-log").textContent = "");
  $("ai-connect").addEventListener("click", aiConnect);
  $("ai-refresh").addEventListener("click", aiRefreshSessions);
  $("ai-new-session").addEventListener("click", aiNewSession);
  $("ai-send").addEventListener("click", aiSend);
  $("ai-stop").addEventListener("click", aiStop);
  $("ai-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      aiSend();
    }
  });
  await listen("opencode://event", (event) => handleAiEvent(event.payload));
  try {
    const root = await call("default_workspace");
    await openWorkspace(root);
  } catch (error) {
    setStatus(`No default workspace: ${error}`);
  }
  updateStatusRight();
  aiConnect().catch(() => {
  });
}
boot();
//# sourceMappingURL=index-BkwTbTtA.js.map
