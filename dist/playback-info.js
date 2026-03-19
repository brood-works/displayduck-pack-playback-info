const P = /* @__PURE__ */ new Map(), R = (e) => String(e ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"), W = (e) => {
  const t = P.get(e);
  if (t)
    return t;
  const a = e.replace(/\bthis\b/g, "__item"), i = new Function("scope", `with (scope) { return (${a}); }`);
  return P.set(e, i), i;
}, f = (e, t) => {
  try {
    return W(e)(t);
  } catch {
    return "";
  }
}, g = (e, t = 0, a) => {
  const i = [];
  let r = t;
  for (; r < e.length; ) {
    const n = e.indexOf("{{", r);
    if (n === -1)
      return i.push({ type: "text", value: e.slice(r) }), { nodes: i, index: e.length };
    n > r && i.push({ type: "text", value: e.slice(r, n) });
    const o = e.indexOf("}}", n + 2);
    if (o === -1)
      return i.push({ type: "text", value: e.slice(n) }), { nodes: i, index: e.length };
    const s = e.slice(n + 2, o).trim();
    if (r = o + 2, s === "/if" || s === "/each") {
      if (a === s)
        return { nodes: i, index: r };
      i.push({ type: "text", value: `{{${s}}}` });
      continue;
    }
    if (s.startsWith("#if ")) {
      const l = g(e, r, "/if");
      i.push({
        type: "if",
        condition: s.slice(4).trim(),
        children: l.nodes
      }), r = l.index;
      continue;
    }
    if (s.startsWith("#each ")) {
      const l = g(e, r, "/each");
      i.push({
        type: "each",
        source: s.slice(6).trim(),
        children: l.nodes
      }), r = l.index;
      continue;
    }
    i.push({ type: "expr", value: s });
  }
  return { nodes: i, index: r };
}, b = (e, t) => {
  let a = "";
  for (const i of e) {
    if (i.type === "text") {
      a += i.value;
      continue;
    }
    if (i.type === "expr") {
      a += R(f(i.value, t));
      continue;
    }
    if (i.type === "if") {
      f(i.condition, t) && (a += b(i.children, t));
      continue;
    }
    const r = f(i.source, t);
    if (Array.isArray(r))
      for (const n of r) {
        const o = Object.create(t);
        o.__item = n, a += b(i.children, o);
      }
  }
  return a;
}, D = (e) => {
  const t = g(e).nodes;
  return (a) => b(t, a);
};
function z(e, t = !1) {
  return window.__TAURI_INTERNALS__.transformCallback(e, t);
}
async function w(e, t = {}, a) {
  return window.__TAURI_INTERNALS__.invoke(e, t, a);
}
function N(e, t = "asset") {
  return window.__TAURI_INTERNALS__.convertFileSrc(e, t);
}
var x;
(function(e) {
  e.WINDOW_RESIZED = "tauri://resize", e.WINDOW_MOVED = "tauri://move", e.WINDOW_CLOSE_REQUESTED = "tauri://close-requested", e.WINDOW_DESTROYED = "tauri://destroyed", e.WINDOW_FOCUS = "tauri://focus", e.WINDOW_BLUR = "tauri://blur", e.WINDOW_SCALE_FACTOR_CHANGED = "tauri://scale-change", e.WINDOW_THEME_CHANGED = "tauri://theme-changed", e.WINDOW_CREATED = "tauri://window-created", e.WEBVIEW_CREATED = "tauri://webview-created", e.DRAG_ENTER = "tauri://drag-enter", e.DRAG_OVER = "tauri://drag-over", e.DRAG_DROP = "tauri://drag-drop", e.DRAG_LEAVE = "tauri://drag-leave";
})(x || (x = {}));
async function O(e, t) {
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(e, t), await w("plugin:event|unlisten", {
    event: e,
    eventId: t
  });
}
async function E(e, t, a) {
  var i;
  const r = (i = void 0) !== null && i !== void 0 ? i : { kind: "Any" };
  return w("plugin:event|listen", {
    event: e,
    target: r,
    handler: z(t)
  }).then((n) => async () => O(e, n));
}
const C = (e) => {
  if (typeof e != "function")
    return !1;
  const t = e;
  return t._isSignal === !0 && typeof t.set == "function" && typeof t.subscribe == "function";
}, S = (e) => {
  let t = e;
  const a = /* @__PURE__ */ new Set(), i = (() => t);
  return i._isSignal = !0, i.set = (r) => {
    t = r;
    for (const n of a)
      n(t);
  }, i.update = (r) => {
    i.set(r(t));
  }, i.subscribe = (r) => (a.add(r), () => a.delete(r)), i;
}, U = (e, t) => {
  const a = [];
  for (const i of Object.keys(e)) {
    const r = e[i];
    C(r) && a.push(r.subscribe(() => t()));
  }
  return () => {
    for (const i of a)
      i();
  };
}, H = (e, t) => new Proxy(
  { payload: t },
  {
    get(a, i) {
      if (typeof i != "string")
        return;
      if (i in a)
        return a[i];
      const r = e[i];
      return typeof r == "function" ? r.bind(e) : r;
    },
    has(a, i) {
      return typeof i != "string" ? !1 : i in a || i in e;
    }
  }
), $ = ["src", "href", "poster"], F = "{{pack-install-path}}/", A = "{{ASSETS}}", j = (e) => {
  const t = e.trim();
  return t.length === 0 || t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("file:") || t.startsWith("asset:") || t.startsWith("mailto:") || t.startsWith("tel:") || t.startsWith("javascript:") || t.startsWith("//") || t.startsWith("/") || t.startsWith("#");
}, B = (e) => {
  const t = e.trim();
  if (!t)
    return null;
  if (!j(t))
    return t.replace(/^\.\/+/, "").replace(/^\/+/, "");
  if (t.startsWith("http://") || t.startsWith("https://"))
    try {
      const a = new URL(t);
      if (a.origin === window.location.origin)
        return `${a.pathname}${a.search}${a.hash}`.replace(/^\/+/, "");
    } catch {
      return null;
    }
  return null;
}, q = (e, t) => {
  const a = e.replaceAll("\\", "/").replace(/\/+$/, ""), i = `${a}/${t.trim()}`, r = i.split("/"), n = [];
  for (const o of r) {
    if (!o || o === ".") {
      n.length === 0 && i.startsWith("/") && n.push("");
      continue;
    }
    if (o === "..") {
      (n.length > 1 || n.length === 1 && n[0] !== "") && n.pop();
      continue;
    }
    n.push(o);
  }
  return n.join("/") || a;
}, y = (e, t) => {
  const a = B(t);
  if (!e || !a)
    return t;
  try {
    return N(q(e, a));
  } catch {
    return t;
  }
}, V = (e) => {
  const t = e.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!t)
    return "";
  try {
    return N(t);
  } catch {
    return t;
  }
}, G = (e, t) => e.split(",").map((a) => {
  const i = a.trim();
  if (!i)
    return i;
  const [r, n] = i.split(/\s+/, 2), o = y(t, r);
  return n ? `${o} ${n}` : o;
}).join(", "), K = (e, t) => e.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (a, i, r) => {
  const n = y(t, r);
  return n === r ? a : `url("${n}")`;
}), v = (e, t) => {
  for (const r of $) {
    const n = e.getAttribute(r);
    if (!n)
      continue;
    const o = y(t, n);
    o !== n && e.setAttribute(r, o);
  }
  const a = e.getAttribute("srcset");
  if (a) {
    const r = G(a, t);
    r !== a && e.setAttribute("srcset", r);
  }
  const i = e.getAttribute("style");
  if (i) {
    const r = K(i, t);
    r !== i && e.setAttribute("style", r);
  }
}, I = (e, t) => {
  if (t) {
    e instanceof Element && v(e, t);
    for (const a of Array.from(e.querySelectorAll("*")))
      v(a, t);
  }
}, M = (e, t) => {
  if (!t)
    return e;
  let a = e;
  const i = V(t);
  return i && a.includes(A) && (a = a.replaceAll(A, i)), a.includes(F) ? a.replace(/\{\{pack-install-path\}\}\/([^"')\s]+)/g, (r, n) => y(t, n)) : a;
}, Y = (e, t) => class {
  constructor({
    mount: i,
    payload: r,
    setLoading: n
  }) {
    this.cleanups = [], this.widgetDirectory = "", this.mount = i, this.payload = r ?? {}, this.setLoading = typeof n == "function" ? n : (() => {
    }), this.assetObserver = new MutationObserver((o) => {
      if (this.widgetDirectory)
        for (const s of o) {
          if (s.type === "attributes" && s.target instanceof Element) {
            v(s.target, this.widgetDirectory);
            continue;
          }
          for (const l of Array.from(s.addedNodes))
            l instanceof Element && I(l, this.widgetDirectory);
        }
    }), this.logic = new e({
      mount: i,
      payload: this.payload,
      setLoading: (o) => this.setLoading(!!o),
      on: (o, s, l) => this.on(o, s, l)
    }), this.cleanupSignalSubscriptions = U(this.logic, () => this.render()), this.assetObserver.observe(this.mount, {
      subtree: !0,
      childList: !0,
      attributes: !0,
      attributeFilter: ["src", "href", "poster", "srcset", "style"]
    });
  }
  onInit() {
    this.render(), this.logic.onInit?.();
  }
  onUpdate(i) {
    this.payload = i ?? {}, this.logic.onUpdate?.(this.payload), this.render();
  }
  onDestroy() {
    for (this.cleanupSignalSubscriptions(); this.cleanups.length > 0; )
      this.cleanups.pop()?.();
    this.assetObserver.disconnect(), this.logic.onDestroy?.(), this.mount.innerHTML = "";
  }
  render() {
    const i = H(this.logic, this.payload);
    this.widgetDirectory = String(
      this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
    ).trim();
    const r = M(t.template, this.widgetDirectory), n = M(t.styles, this.widgetDirectory), s = D(r)(i);
    this.mount.innerHTML = `<style>${n}</style>${s}`, this.mount.setAttribute("data-displayduck-render-empty", s.trim().length === 0 ? "true" : "false"), I(this.mount, this.widgetDirectory), this.logic.afterRender?.();
  }
  on(i, r, n) {
    const o = (l) => {
      const c = l.target?.closest(r);
      !c || !this.mount.contains(c) || n(l, c);
    };
    this.mount.addEventListener(i, o);
    const s = () => this.mount.removeEventListener(i, o);
    return this.cleanups.push(s), s;
  }
};
var d;
(function(e) {
  e.Playing = "playing", e.Paused = "paused", e.Stopped = "stopped";
})(d || (d = {}));
var k;
(function(e) {
  e.None = "none", e.Track = "track", e.List = "list";
})(k || (k = {}));
var T;
(function(e) {
  e.Play = "play", e.Pause = "pause", e.PlayPause = "playPause", e.Stop = "stop", e.Next = "next", e.Previous = "previous", e.FastForward = "fastForward", e.Rewind = "rewind", e.SeekTo = "seekTo", e.SetPosition = "setPosition", e.SetPlaybackRate = "setPlaybackRate";
})(T || (T = {}));
const J = "system-now-playing-updated", Q = async () => {
  const e = await w("controller_get_system_now_playing");
  return _(e);
}, Z = async (e) => E(J, (t) => {
  e(_(t.payload));
}), _ = (e) => {
  if (!e)
    return {
      metadata: null,
      playback: null
    };
  const t = Number.isFinite(e.duration) ? e.duration ?? void 0 : void 0, a = X(e.status), i = {
    title: e.title,
    artist: typeof e.artist == "string" ? e.artist : void 0,
    album: typeof e.album == "string" ? e.album : void 0,
    artworkUrl: typeof e.artworkUrl == "string" ? e.artworkUrl : void 0,
    artworkData: typeof e.artworkData == "string" ? e.artworkData : void 0,
    duration: t
  }, r = Number.isFinite(e.playbackRate) && e.playbackRate != null ? e.playbackRate : a === d.Playing ? 1 : 0, n = !Number.isFinite(t) || (t ?? 0) <= 0, o = e.canSeek === !1, s = e.isLivestream === !0, l = /(chrome|msedge|firefox|brave|opera|vivaldi|arc)/i.test(e.app ?? ""), u = /\blive\b|🔴|\[live\]|\(live\)/i.test(e.title ?? ""), c = (t ?? 0) >= 10800, h = l && a === d.Playing && (u || c);
  return {
    app: typeof e.app == "string" ? e.app : void 0,
    metadata: i,
    playback: {
      status: a,
      position: Number.isFinite(e.elapsedTime) && e.elapsedTime != null ? e.elapsedTime : 0,
      shuffle: !1,
      repeatMode: k.None,
      playbackRate: r,
      isLivestream: s || n || o || h,
      canNext: e.canNext ?? void 0,
      canPrevious: e.canPrevious ?? void 0,
      canPlay: e.canPlay ?? void 0,
      canPause: e.canPause ?? void 0,
      canSeek: e.canSeek ?? void 0
    }
  };
}, X = (e) => {
  switch ((e ?? "").toLowerCase()) {
    case "playing":
      return d.Playing;
    case "stopped":
      return d.Stopped;
    default:
      return d.Paused;
  }
}, m = () => ({
  metadata: null,
  playback: null
}), p = (e) => ({
  app: e.app,
  metadata: e.metadata ? { ...e.metadata } : null,
  playback: e.playback ? { ...e.playback } : null
});
let tt = class {
  constructor(t) {
    this.ctx = t, this.currentMedia = m(), this.unsubscribeNowPlaying = null, this.resizeObserver = null, this.tickerId = null, this.animationTimeoutId = null, this.inactiveHideTimerId = null, this.pendingInactiveMedia = null, this.lastNowPlayingKey = "", this.lastTickAt = 0, this.playbackAnchorAtMs = 0, this.playbackAnchorPosition = 0, this.lastMonotonicPosition = 0, this.pendingNowPlayingAnimation = !1, this.inactiveHideDelayMs = 5e3, this.verticalLayoutTolerancePx = 2, this.mediaState = S(m()), this.playerStyleClassState = S("horizontal-player"), this.payload = t.payload ?? {};
  }
  onInit() {
    this.attachResizeObserver(), this.startProgressTicker(), this.initializeMedia();
  }
  onUpdate(t) {
    this.payload = t ?? {}, this.scheduleLayoutRefresh();
  }
  afterRender() {
    this.updateProgressElement(), this.applyNowPlayingAnimation(), this.checkTextOverflow(), this.scheduleLayoutRefresh();
  }
  onDestroy() {
    this.unsubscribeNowPlaying && (this.unsubscribeNowPlaying(), this.unsubscribeNowPlaying = null), this.resizeObserver && (this.resizeObserver.disconnect(), this.resizeObserver = null), this.tickerId && (clearInterval(this.tickerId), this.tickerId = null), this.animationTimeoutId && (clearTimeout(this.animationTimeoutId), this.animationTimeoutId = null), this.inactiveHideTimerId && (clearTimeout(this.inactiveHideTimerId), this.inactiveHideTimerId = null);
  }
  showWidget() {
    return !this.autoHide() || this.hasMetadata();
  }
  playerClass() {
    return `playback-info ${this.playerStyleClass()}${this.rightAlign() ? " align-right" : ""}`;
  }
  playerStyleClass() {
    return this.playerStyleClassState();
  }
  hideCover() {
    return this.booleanConfig("hideCover", !1);
  }
  hasMetadata() {
    return !!this.media().metadata;
  }
  artistText() {
    return this.media().metadata?.artist?.trim() || "";
  }
  titleText() {
    return this.media().metadata?.title?.trim() || "";
  }
  albumText() {
    return this.media().metadata?.album?.trim() || "";
  }
  artworkSource() {
    const t = this.media().metadata;
    if (!t)
      return "";
    const a = t.artworkData?.trim() ?? "";
    return a ? a.startsWith("data:") ? a : `data:image/jpeg;base64,${a}` : t.artworkUrl?.trim() ?? "";
  }
  showLiveIndicator() {
    return !!this.media().playback?.isLivestream;
  }
  showHorizontalTrack() {
    return this.hasMetadata() && !this.showLiveIndicator() && this.playerStyleClass() === "horizontal-player";
  }
  showVerticalTrack() {
    return this.hasMetadata() && !this.showLiveIndicator() && this.playerStyleClass() === "vertical-player";
  }
  progressPercent() {
    const t = this.currentMedia.metadata?.duration ?? 0, a = this.currentMedia.playback?.position ?? 0;
    if (!Number.isFinite(t) || t <= 0)
      return 0;
    const i = a / t * 100;
    return Math.max(0, Math.min(100, Math.round(i * 100) / 100));
  }
  media() {
    return this.mediaState();
  }
  autoHide() {
    return this.booleanConfig("autoHide", !1);
  }
  rightAlign() {
    return this.booleanConfig("rightAlign", !1);
  }
  scrollText() {
    return this.booleanConfig("scrollText", !1);
  }
  orientation() {
    const t = String(this.config("orientation", "auto")).trim().toLowerCase();
    return t === "horizontal" || t === "vertical" ? t : "auto";
  }
  config(t, a) {
    return (this.payload.config ?? {})[t] ?? a;
  }
  booleanConfig(t, a) {
    return this.config(t, a) === !0;
  }
  async initializeMedia() {
    try {
      this.applyMedia(await Q()), this.unsubscribeNowPlaying = await Z((t) => {
        this.applyMedia(t);
      });
    } catch (t) {
      console.error("Failed to initialize Playback Info widget", t);
    }
  }
  applyMedia(t) {
    if (!t.metadata) {
      this.scheduleInactiveHide(t);
      return;
    }
    this.inactiveHideTimerId && (clearTimeout(this.inactiveHideTimerId), this.inactiveHideTimerId = null), this.pendingInactiveMedia = null;
    const a = this.buildNowPlayingKey(t), i = a !== this.lastNowPlayingKey;
    i && (this.lastNowPlayingKey = a, a && (this.pendingNowPlayingAnimation = !0));
    const r = performance.now(), n = this.currentMedia.playback, o = t.playback;
    if (o) {
      const s = Number.isFinite(o.position) ? o.position : 0, u = this.derivedPosition(r, this.currentMedia) ?? n?.position ?? 0, c = o.status === "playing" && (o.playbackRate ?? 0) > 0;
      let h = s;
      c && !i && (h = Math.max(u, s)), t = {
        ...t,
        playback: {
          ...o,
          position: h
        }
      }, this.playbackAnchorAtMs = r, this.playbackAnchorPosition = h, this.lastMonotonicPosition = i ? h : Math.max(this.lastMonotonicPosition, h);
    } else
      this.playbackAnchorAtMs = r, this.playbackAnchorPosition = 0, this.lastMonotonicPosition = 0;
    this.currentMedia = p(t), this.syncMediaState();
  }
  scheduleInactiveHide(t) {
    if (this.pendingInactiveMedia = t, !this.currentMedia.metadata) {
      this.currentMedia = p(t), this.syncMediaState();
      return;
    }
    this.inactiveHideTimerId || (this.inactiveHideTimerId = setTimeout(() => {
      this.inactiveHideTimerId = null, this.lastNowPlayingKey = "", this.playbackAnchorAtMs = performance.now(), this.playbackAnchorPosition = 0, this.lastMonotonicPosition = 0, this.currentMedia = p(this.pendingInactiveMedia ?? m()), this.pendingInactiveMedia = null, this.syncMediaState();
    }, this.inactiveHideDelayMs));
  }
  startProgressTicker(t = 250) {
    this.lastTickAt = performance.now(), this.tickerId = setInterval(() => {
      const a = performance.now(), i = (a - this.lastTickAt) / 1e3;
      this.lastTickAt = a, this.tickProgress(i);
    }, t);
  }
  tickProgress(t) {
    if (t <= 0)
      return;
    const a = this.currentMedia.playback;
    if (!a || a.status !== "playing" || (a.playbackRate ?? 0) <= 0)
      return;
    const i = this.derivedPosition(performance.now(), this.currentMedia);
    if (i == null)
      return;
    const r = this.currentMedia.metadata?.duration ?? 0, n = Number.isFinite(r) && r > 0 ? Math.min(r, i) : i;
    if (Math.abs(n - a.position) < 0.05)
      return;
    const o = Math.max(this.lastMonotonicPosition, n);
    this.lastMonotonicPosition = o, this.currentMedia = {
      ...this.currentMedia,
      playback: {
        ...a,
        position: o
      }
    }, this.updateProgressElement();
  }
  derivedPosition(t, a) {
    const i = a.playback;
    if (!i)
      return null;
    const r = i.playbackRate ?? 0;
    if (r <= 0)
      return i.position ?? 0;
    if (this.playbackAnchorAtMs <= 0)
      return this.playbackAnchorAtMs = t, this.playbackAnchorPosition = i.position ?? 0, this.lastMonotonicPosition = this.playbackAnchorPosition, this.playbackAnchorPosition;
    const n = (t - this.playbackAnchorAtMs) / 1e3;
    return !Number.isFinite(n) || n < 0 ? i.position ?? 0 : (this.playbackAnchorPosition ?? 0) + n * r;
  }
  buildNowPlayingKey(t) {
    const a = t.metadata;
    return a ? [
      a.title ?? "",
      a.artist ?? "",
      a.album ?? "",
      a.artworkUrl ?? "",
      a.artworkData ?? ""
    ].join("|") : "";
  }
  attachResizeObserver() {
    if (typeof ResizeObserver > "u") {
      this.scheduleLayoutRefresh();
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleLayoutRefresh();
    }), this.resizeObserver.observe(this.ctx.mount);
  }
  scheduleLayoutRefresh() {
    requestAnimationFrame(() => {
      this.updatePlayerSize(), this.checkTextOverflow(), this.updateProgressElement();
    });
  }
  updatePlayerSize() {
    const t = this.ctx.mount.getBoundingClientRect(), a = Math.round(t.width), i = Math.round(t.height), r = this.resolvePlayerStyleClass(a, i);
    this.playerStyleClassState() !== r && this.playerStyleClassState.set(r);
  }
  resolvePlayerStyleClass(t, a) {
    const i = this.orientation();
    return i === "horizontal" ? "horizontal-player" : i === "vertical" ? "vertical-player" : t - a > this.verticalLayoutTolerancePx ? "horizontal-player" : "vertical-player";
  }
  applyNowPlayingAnimation() {
    if (!this.pendingNowPlayingAnimation)
      return;
    const t = this.ctx.mount.querySelector('[data-role="now-playing"]');
    t && (this.pendingNowPlayingAnimation = !1, t.classList.remove("now-playing-change"), t.getBoundingClientRect(), t.classList.add("now-playing-change"), this.animationTimeoutId && clearTimeout(this.animationTimeoutId), this.animationTimeoutId = setTimeout(() => {
      t.classList.remove("now-playing-change"), this.animationTimeoutId = null;
    }, 420));
  }
  checkTextOverflow() {
    this.updateOverflowState('[data-role="artist"]'), this.updateOverflowState('[data-role="title"]');
  }
  updateOverflowState(t) {
    const a = this.ctx.mount.querySelector(t);
    if (!a)
      return;
    const i = a.querySelector("span"), n = this.scrollText() && a.scrollWidth > a.clientWidth;
    if (a.classList.toggle("scrolling", n), !!i) {
      if (n) {
        i.style.setProperty("--scroll-amount", `${a.clientWidth - a.scrollWidth}px`);
        return;
      }
      i.style.removeProperty("--scroll-amount");
    }
  }
  updateProgressElement() {
    const t = this.ctx.mount.querySelector('[data-role="progress"]');
    t && (t.style.width = `${this.progressPercent()}%`);
  }
  syncMediaState() {
    const t = this.mediaState();
    this.isRenderableMediaEqual(t, this.currentMedia) || this.mediaState.set(p(this.currentMedia));
  }
  isRenderableMediaEqual(t, a) {
    const i = t.metadata, r = a.metadata;
    return !i && !r ? !0 : !i || !r ? !1 : (t.app ?? "") === (a.app ?? "") && i.title === r.title && (i.artist ?? "") === (r.artist ?? "") && (i.album ?? "") === (r.album ?? "") && (i.artworkUrl ?? "") === (r.artworkUrl ?? "") && (i.artworkData ?? "") === (r.artworkData ?? "") && (i.duration ?? 0) === (r.duration ?? 0) && !!t.playback?.isLivestream == !!a.playback?.isLivestream;
  }
};
const et = `{{#if showWidget()}}
  <div class="{{ playerClass() }}">
    <div data-role="now-playing" class="now-playing">
      {{#if !hideCover()}}
        <div class="cover-shell">
          {{#if artworkSource()}}
            <div class="backdrop">
              <img src="{{ artworkSource() }}" alt="Album Cover">
            </div>
          {{/if}}
          <div class="cover">
            {{#if artworkSource()}}
              <img class="cover-image" src="{{ artworkSource() }}" alt="Album Cover">
            {{/if}}
            {{#if !artworkSource()}}
              <div class="no-cover">
                <i class="lni lnis-volume-high"></i>
              </div>
            {{/if}}
          </div>
        </div>
      {{/if}}

      <div class="details">
        {{#if hasMetadata()}}
          <div data-role="artist" class="artist">
            <span>{{ artistText() }}</span>
          </div>
          <div data-role="title" class="title">
            <span>{{ titleText() }}</span>
          </div>
          <div class="album">{{ albumText() }}</div>

          {{#if showLiveIndicator()}}
            <div class="live">Live <span></span></div>
          {{/if}}

          {{#if showHorizontalTrack()}}
            <div class="track inline-track">
              <div data-role="progress" class="progress" style="width: {{ progressPercent() }}%;"></div>
            </div>
          {{/if}}
        {{/if}}

        {{#if !hasMetadata()}}
          <div class="title no-metadata"><span>Nothing playing</span></div>
        {{/if}}
      </div>
    </div>

    {{#if showVerticalTrack()}}
      <div class="track block-track">
        <div data-role="progress" class="progress" style="width: {{ progressPercent() }}%;"></div>
      </div>
    {{/if}}
  </div>
{{/if}}
`, it = ".playback-info{display:flex;flex-direction:column;justify-content:center;width:100%;height:100%;color:var(--color-text);overflow:hidden;font-size:clamp(.9rem,var(--host-height, 240px) / 9,1.4rem)}.playback-info .now-playing{display:flex;align-items:center;gap:.1em;width:100%;min-height:0}.playback-info .cover-shell{--cover-size: min(28cqw, calc(var(--host-height, 240px) / 2.5));--cover-blur-padding: clamp(1rem, calc(var(--host-height, 240px) / 9.5), 1.5rem);--cover-glow-room: clamp(.55rem, calc(var(--host-height, 240px) / 16), .9rem);--cover-room-block: calc(var(--cover-blur-padding) + var(--cover-glow-room));--cover-room-inline-start: var(--cover-room-block);--cover-room-inline-end: var(--cover-room-block);--cover-shell-width: min( 100%, calc(var(--cover-size) + var(--cover-room-inline-start) + var(--cover-room-inline-end)) );position:relative;flex:0 0 auto;width:var(--cover-shell-width);height:min(100%,var(--cover-size) + var(--cover-room-block) * 2);box-sizing:border-box;isolation:isolate}.playback-info .cover{position:relative;display:flex;width:calc(100% - var(--cover-room-inline-start) - var(--cover-room-inline-end));height:calc(100% - var(--cover-room-block) * 2);margin-block:var(--cover-room-block);margin-inline-start:var(--cover-room-inline-start);margin-inline-end:var(--cover-room-inline-end);min-width:0;min-height:0;aspect-ratio:1/1;background:rgb(from var(--color-primary) r g b/.12);border-radius:.6em;overflow:hidden;box-sizing:border-box;z-index:2}.playback-info .backdrop{position:absolute;top:var(--cover-room-block);left:var(--cover-room-inline-start);width:calc(100% - var(--cover-room-inline-start) - var(--cover-room-inline-end));height:calc(100% - var(--cover-room-block) * 2);z-index:1;opacity:.92;filter:blur(.65em) saturate(2.1) brightness(1.16);pointer-events:none}.playback-info .backdrop img,.playback-info .cover-image{width:100%;height:100%;border-radius:.6em;object-fit:cover;display:block;box-sizing:border-box}.playback-info .cover-image{border:.18em solid rgb(from var(--color-text) r g b/.14);box-shadow:0 .8em 1.8em #00000038}.playback-info .backdrop img{transform:scale(1.02)}.playback-info .no-cover{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:.6em;background:radial-gradient(circle at top,rgb(from var(--color-primary) r g b/.35),transparent 65%),linear-gradient(135deg,rgb(from var(--color-primary) r g b/.28),rgb(from var(--color-primary) r g b/.58));border:.18em solid rgb(from var(--color-text) r g b/.14);box-shadow:0 .8em 1.8em #0000002e;box-sizing:border-box}.playback-info .no-cover i{font-size:clamp(2rem,var(--host-width, 320px) / 8,3.4rem);opacity:.92}.playback-info .details{display:flex;flex:1 1 0;min-width:0;flex-direction:column;justify-content:center;text-shadow:0 .08em .18em rgba(0,0,0,.3)}.playback-info .artist,.playback-info .title,.playback-info .album,.playback-info .live{width:100%;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-transform:uppercase;line-height:1.05}.playback-info .artist,.playback-info .title{text-overflow:clip}.playback-info .artist span,.playback-info .title span{display:inline-block;opacity:1}.playback-info .artist.scrolling span,.playback-info .title.scrolling span{white-space:nowrap;animation:playback-scroll-fade 10s linear infinite;animation-delay:2s;animation-fill-mode:both;will-change:transform,opacity}.playback-info .artist{opacity:.8;font-size:1.1em;font-weight:300}.playback-info .title{font-size:1.28em;font-weight:700;margin-top:.06em}.playback-info .title.no-metadata{white-space:wrap}.playback-info .album{margin-top:.14em;opacity:.48;font-size:.82em;font-weight:300}.playback-info .live{display:flex;align-items:center;gap:.45em;margin-top:.5em;color:#ff7070;font-size:.82em;font-weight:700}.playback-info .live span{display:inline-block;width:.7em;height:.7em;border-radius:999px;background:currentColor;animation:playback-pulse .75s ease-out infinite alternate}.playback-info .track{width:100%;height:.55em;border-radius:999px;overflow:hidden;background:rgb(from var(--color-primary) r g b/.22)}.playback-info .inline-track,.playback-info .block-track{margin-top:.8em}.playback-info .progress{height:100%;background:linear-gradient(90deg,rgb(from var(--color-primary) r g b/.82),var(--color-primary));transition:width .22s linear}.playback-info.align-right .details{text-align:right;align-items:flex-end}.playback-info.align-right .live{justify-content:flex-end}.playback-info.horizontal-player .now-playing{flex-direction:row;justify-content:center}.playback-info.horizontal-player .details{flex:0 1 auto;width:min(32rem,100% - var(--cover-shell-width) - .1em);max-width:calc(100% - var(--cover-shell-width) - .1em)}.playback-info.horizontal-player .cover-shell{--cover-room-inline-start: calc(var(--cover-room-block) * 1.15);--cover-room-inline-end: calc(var(--cover-room-block) * .45)}.playback-info.horizontal-player.align-right .cover-shell{--cover-room-inline-start: calc(var(--cover-room-block) * .45);--cover-room-inline-end: calc(var(--cover-room-block) * 1.15)}.playback-info.horizontal-player.align-right .now-playing{flex-direction:row-reverse}.playback-info.vertical-player{align-items:center}.playback-info.vertical-player .now-playing{flex-direction:column;justify-content:center;text-align:center}.playback-info.vertical-player .cover-shell{--cover-size: min(44cqw, calc(var(--host-height, 240px) / 2.25))}.playback-info.vertical-player .details{width:100%;align-items:center;text-align:center}.playback-info.vertical-player .artist,.playback-info.vertical-player .title,.playback-info.vertical-player .album,.playback-info.vertical-player .live{text-align:center}.playback-info.vertical-player .live{justify-content:center}.playback-info.vertical-player.align-right .details,.playback-info.vertical-player.align-right .artist,.playback-info.vertical-player.align-right .title,.playback-info.vertical-player.align-right .album,.playback-info.vertical-player.align-right .live{text-align:center}.playback-info.vertical-player.align-right .live{justify-content:center}.playback-info .now-playing.now-playing-change{animation:playback-pop-in .42s ease-out}@keyframes playback-scroll-fade{0%,10%{transform:translate(0);opacity:1}70%,80%{transform:translate(var(--scroll-amount, -100px));opacity:1}85%{transform:translate(var(--scroll-amount, -100px));opacity:0}85.01%{transform:translate(0);opacity:0}to{transform:translate(0);opacity:1}}@keyframes playback-pulse{0%{opacity:.55;transform:scale(.86)}to{opacity:1;transform:scale(1)}}@keyframes playback-pop-in{0%{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}", L = Y(tt, { template: et, styles: it }), at = L, ot = { DisplayDuckWidget: L, Widget: at };
export {
  L as DisplayDuckWidget,
  at as Widget,
  ot as default
};
