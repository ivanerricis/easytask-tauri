// Layout checker executed inside the page (browser.execute with a string). Returns a list of issues.
(function () {
  var W = window.innerWidth, H = window.innerHeight
  var issues = []
  function desc(el) {
    var s = el.tagName.toLowerCase()
    if (el.getAttribute("role")) s += "[role=" + el.getAttribute("role") + "]"
    if (el.getAttribute("data-slot")) s += "[slot=" + el.getAttribute("data-slot") + "]"
    var al = el.getAttribute("aria-label")
    if (al) s += "[aria=" + al.slice(0, 40) + "]"
    var c = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 6).join(".") : ""
    if (c) s += "." + c
    var tx = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)
    if (tx) s += ' "' + tx + '"'
    return s
  }
  function r(el) { var b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) } }
  function rendered(el) {
    if (!el.getClientRects().length) return false
    var cs = getComputedStyle(el)
    return cs.visibility !== "hidden" && cs.display !== "none"
  }
  // rect of the element clipped by the ancestors that hide overflow
  function visibleRect(el) {
    var b = el.getBoundingClientRect()
    var L = Math.max(b.left, 0), T = Math.max(b.top, 0), R = Math.min(b.right, W), B = Math.min(b.bottom, H)
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var cs = getComputedStyle(p)
      if (cs.position === "fixed") break
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        var pb = p.getBoundingClientRect()
        if (cs.overflowX !== "visible") { L = Math.max(L, pb.left); R = Math.min(R, pb.right) }
        if (cs.overflowY !== "visible") { T = Math.max(T, pb.top); B = Math.min(B, pb.bottom) }
      }
    }
    return { w: Math.max(0, R - L), h: Math.max(0, B - T), l: L, t: T, r: R, b: B }
  }
  // overlay layers
  var overlaySel = '[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper],[data-slot="popover-content"],[data-slot="sheet-content"]'
  var overlays = Array.prototype.slice.call(document.querySelectorAll(overlaySel)).filter(function (e) {
    return rendered(e) && !e.closest('[aria-hidden="true"]')
  })
  // keep outermost only
  overlays = overlays.filter(function (e) { return !overlays.some(function (o) { return o !== e && o.contains(e) }) })
  var scope = overlays.length ? overlays : [document.body]
  var scopeEls = []
  scope.forEach(function (s) { scopeEls.push(s); Array.prototype.forEach.call(s.querySelectorAll("*"), function (e) { scopeEls.push(e) }) })

  // 0. document scroll
  var de = document.documentElement
  if (de.scrollWidth > W + 1) issues.push({ kind: "page-hscroll", el: "html", info: "scrollWidth " + de.scrollWidth + " > " + W })
  if (de.scrollHeight > H + 1 && document.body.scrollHeight > H + 1) issues.push({ kind: "page-vscroll", el: "html", info: "scrollHeight " + de.scrollHeight + " > " + H })

  // 1. overlays outside the viewport
  overlays.forEach(function (o) {
    var inner = o
    if (o.hasAttribute("data-radix-popper-content-wrapper") && o.firstElementChild) inner = o.firstElementChild
    var b = r(inner)
    if (b.l < -1 || b.t < -1 || b.r > W + 1 || b.b > H + 1) issues.push({ kind: "outside-viewport", el: desc(inner), rect: b, info: "viewport " + W + "x" + H })
  })

  // 2. horizontal overflow (inside overlays or the main containers)
  var containers = overlays.length ? scopeEls : Array.prototype.slice.call(document.querySelectorAll("main,aside,nav,header,[role=tabpanel],[data-testid=sidebar-panel],#root,body,#root > *"))
  containers.forEach(function (e) {
    if (!rendered(e) || e.closest(".sr-only")) return
    var cs = getComputedStyle(e)
    if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) {
      var kind = cs.overflowX === "auto" || cs.overflowX === "scroll" ? "hscroller" : (cs.overflowX === "hidden" || cs.overflowX === "clip") ? "overflow-hidden-x" : "overflow-visible-x"
      if (kind === "overflow-hidden-x" && cs.textOverflow === "ellipsis") return
      issues.push({ kind: kind, el: desc(e), info: "scrollWidth " + e.scrollWidth + " > clientWidth " + e.clientWidth })
    }
  })

  // 3. text clipped without ellipsis (document wide or overlay)
  scopeEls.forEach(function (e) {
    if (!rendered(e) || e.closest(".sr-only")) return
    var cs = getComputedStyle(e)
    if ((cs.overflowX === "hidden" || cs.overflowX === "clip") && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) {
      var ell = cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== ""
      var hasText = (e.textContent || "").trim().length > 0 || e.value
      var tip = e.getAttribute("title") || e.getAttribute("aria-label") || (e.closest("[title]") != null)
      if (hasText && !ell) issues.push({ kind: "text-clipped", el: desc(e), info: "scrollWidth " + e.scrollWidth + " > " + e.clientWidth + (tip ? " (has title/aria)" : " (no title)") })
    }
    if ((cs.overflowY === "hidden" || cs.overflowY === "clip") && e.scrollHeight > e.clientHeight + 1 && e.clientHeight > 0 && (e.textContent || "").trim().length > 0 && cs.display !== "inline") {
      var lc = cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== ""
      if (!lc && e.tagName !== "TEXTAREA" && e.tagName !== "HTML" && e.tagName !== "BODY") issues.push({ kind: "text-clipped-y", el: desc(e), info: "scrollHeight " + e.scrollHeight + " > " + e.clientHeight })
    }
  })
  // ellipsized text that has no tooltip (informational)
  scopeEls.forEach(function (e) {
    if (!rendered(e)) return
    var cs = getComputedStyle(e)
    if (cs.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1) {
      var tip = e.getAttribute("title") || e.closest("[title]") || e.closest("[aria-label]") || e.closest("[data-state]")
      if (!tip) issues.push({ kind: "ellipsis-no-tooltip", el: desc(e), info: "scrollWidth " + e.scrollWidth + " > " + e.clientWidth })
    }
  })

  // 4. dialog controls hidden / clipped (footer buttons etc.)
  overlays.forEach(function (o) {
    Array.prototype.forEach.call(o.querySelectorAll("button,a[href],input,textarea,select,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=option]"), function (b) {
      if (!rendered(b) || /^(option|menuitem|tab)$/.test(b.getAttribute("role") || "")) return
      var bb = b.getBoundingClientRect()
      if (bb.width < 1 || bb.height < 1) return
      var v = visibleRect(b)
      var full = bb.width * bb.height
      var part = v.w * v.h
      if (part < full * 0.95) {
        var ratio = Math.round(100 * part / full)
        issues.push({ kind: part < full * 0.5 ? "control-hidden" : "control-partly-clipped", el: desc(b), rect: r(b), info: ratio + "% visible (scroll-hidden or outside the viewport)" })
      }
    })
  })

  // 5. overlapping interactive elements
  var inter = scopeEls.filter(function (e) {
    return e.matches && e.matches('button,a[href],input:not([type=hidden]),textarea,select,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=combobox]') && rendered(e)
  }).map(function (e) { return { e: e, v: visibleRect(e), b: e.getBoundingClientRect() } }).filter(function (x) {
    if (x.v.w <= 0 || x.v.h <= 0) return false
    var cx = (x.v.l + x.v.r) / 2, cy = (x.v.t + x.v.b) / 2
    var top = document.elementFromPoint(cx, cy)
    if (!top || !(x.e.contains(top) || top.contains(x.e))) return false
    return true
  }).filter(function (x) { return x.v.w > 0 && x.v.h > 0 && x.b.width >= 1 && x.b.height >= 1 && getComputedStyle(x.e).opacity !== "0" && !x.e.closest(".sr-only") })
  var seen = 0
  for (var i = 0; i < inter.length && seen < 25; i++) {
    for (var j = i + 1; j < inter.length && seen < 25; j++) {
      var a = inter[i], c = inter[j]
      if (a.e.contains(c.e) || c.e.contains(a.e)) continue
      var w = Math.min(a.v.r, c.v.r) - Math.max(a.v.l, c.v.l)
      var h = Math.min(a.v.b, c.v.b) - Math.max(a.v.t, c.v.t)
      var small = Math.min(a.b.width * a.b.height, c.b.width * c.b.height)
      var contained = w * h >= 0.9 * small
      if (w > 2 && h > 2 && !(contained && (a.e.className + c.e.className).indexOf("inset-0") >= 0)) { seen++; issues.push({ kind: "overlap", el: desc(a.e) + "  <->  " + desc(c.e), info: Math.round(w) + "x" + Math.round(h) + " px", rect: r(a.e) }) }
    }
  }

  // 6. zero size / invisible focusable
  var foc = 'button,a[href],input:not([type=hidden]),textarea,select,[tabindex]:not([tabindex="-1"]),[role=button],[role=menuitem],[role=tab],[role=checkbox]'
  scopeEls.forEach(function (e) {
    if (!e.matches || !e.matches(foc) || e.disabled || e.closest(".sr-only") || e.closest("[inert]") || e.closest('[aria-hidden="true"]')) return
    var cs = getComputedStyle(e)
    if (cs.display === "none") return
    var b = e.getBoundingClientRect()
    if (cs.visibility === "hidden") { issues.push({ kind: "focusable-visibility-hidden", el: desc(e) }); return }
    if (e.getClientRects().length && (b.width < 1 || b.height < 1) && !(e.tagName === "INPUT" && (e.type === "checkbox" || e.type === "file"))) issues.push({ kind: "focusable-zero-size", el: desc(e), rect: r(e) })
  })

  // de-duplicate
  var uniq = {}, out = []
  issues.forEach(function (i) { var k = i.kind + "|" + i.el + "|" + (i.info || ""); if (!uniq[k]) { uniq[k] = 1; out.push(i) } })
  return { viewport: W + "x" + H, overlays: overlays.map(desc), issues: out.slice(0, 120) }
})()
