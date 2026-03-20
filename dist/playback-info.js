const expressionCache = /* @__PURE__ */ new Map();
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const compileExpression = (expression) => {
  const cached = expressionCache.get(expression);
  if (cached) {
    return cached;
  }
  const transformed = expression.replace(/\bthis\b/g, "__item");
  const fn = new Function("scope", `with (scope) { return (${transformed}); }`);
  expressionCache.set(expression, fn);
  return fn;
};
const evaluate = (expression, scope) => {
  try {
    return compileExpression(expression)(scope);
  } catch {
    return "";
  }
};
const parseNodes = (template2, from = 0, stopAt) => {
  const nodes = [];
  let index = from;
  while (index < template2.length) {
    const start = template2.indexOf("{{", index);
    if (start === -1) {
      nodes.push({ type: "text", value: template2.slice(index) });
      return { nodes, index: template2.length };
    }
    if (start > index) {
      nodes.push({ type: "text", value: template2.slice(index, start) });
    }
    const close = template2.indexOf("}}", start + 2);
    if (close === -1) {
      nodes.push({ type: "text", value: template2.slice(start) });
      return { nodes, index: template2.length };
    }
    const token = template2.slice(start + 2, close).trim();
    index = close + 2;
    if (token === "/if" || token === "/each") {
      if (stopAt === token) {
        return { nodes, index };
      }
      nodes.push({ type: "text", value: `{{${token}}}` });
      continue;
    }
    if (token.startsWith("#if ")) {
      const child = parseNodes(template2, index, "/if");
      nodes.push({
        type: "if",
        condition: token.slice(4).trim(),
        children: child.nodes
      });
      index = child.index;
      continue;
    }
    if (token.startsWith("#each ")) {
      const child = parseNodes(template2, index, "/each");
      nodes.push({
        type: "each",
        source: token.slice(6).trim(),
        children: child.nodes
      });
      index = child.index;
      continue;
    }
    nodes.push({ type: "expr", value: token });
  }
  return { nodes, index };
};
const renderNodes = (nodes, scope) => {
  let output = "";
  for (const node of nodes) {
    if (node.type === "text") {
      output += node.value;
      continue;
    }
    if (node.type === "expr") {
      output += escapeHtml(evaluate(node.value, scope));
      continue;
    }
    if (node.type === "if") {
      if (Boolean(evaluate(node.condition, scope))) {
        output += renderNodes(node.children, scope);
      }
      continue;
    }
    const items = evaluate(node.source, scope);
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      const childScope = Object.create(scope);
      childScope.__item = item;
      output += renderNodes(node.children, childScope);
    }
  }
  return output;
};
const createTemplateRenderer = (template2) => {
  const parsed = parseNodes(template2).nodes;
  return (scope) => renderNodes(parsed, scope);
};
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function transformCallback(callback, once = false) {
  return window.__TAURI_INTERNALS__.transformCallback(callback, once);
}
async function invoke(cmd, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
}
function convertFileSrc(filePath, protocol = "asset") {
  return window.__TAURI_INTERNALS__.convertFileSrc(filePath, protocol);
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
  var _a;
  const target = (_a = void 0) !== null && _a !== void 0 ? _a : { kind: "Any" };
  return invoke("plugin:event|listen", {
    event,
    target,
    handler: transformCallback(handler)
  }).then((eventId) => {
    return async () => _unlisten(event, eventId);
  });
}
const isSignal = (value) => {
  if (typeof value !== "function") {
    return false;
  }
  const candidate = value;
  return candidate._isSignal === true && typeof candidate.set === "function" && typeof candidate.subscribe === "function";
};
const signal = (initialValue) => {
  let current = initialValue;
  const subscribers = /* @__PURE__ */ new Set();
  const read = (() => current);
  read._isSignal = true;
  read.set = (value) => {
    current = value;
    for (const subscriber of subscribers) {
      subscriber(current);
    }
  };
  read.update = (updater) => {
    read.set(updater(current));
  };
  read.subscribe = (subscriber) => {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };
  return read;
};
const bindSignals = (source, onChange) => {
  const unsubscribers = [];
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (isSignal(value)) {
      unsubscribers.push(value.subscribe(() => onChange()));
    }
  }
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
};
const createScope = (instance, payload) => {
  return new Proxy(
    { payload },
    {
      get(target, property) {
        if (typeof property !== "string") {
          return void 0;
        }
        if (property in target) {
          return target[property];
        }
        const value = instance[property];
        if (typeof value === "function") {
          return value.bind(instance);
        }
        return value;
      },
      has(target, property) {
        if (typeof property !== "string") {
          return false;
        }
        return property in target || property in instance;
      }
    }
  );
};
const RELATIVE_URL_ATTRIBUTES = ["src", "href", "poster"];
const PACK_INSTALL_PATH_PLACEHOLDER = "{{pack-install-path}}/";
const ASSETS_PLACEHOLDER = "{{ASSETS}}";
const isExternalAssetUrl = (value) => {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("file:") || trimmed.startsWith("asset:") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith("javascript:") || trimmed.startsWith("//") || trimmed.startsWith("/") || trimmed.startsWith("#");
};
const extractWidgetRelativePath = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!isExternalAssetUrl(trimmed)) {
    return trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (url.origin === window.location.origin) {
        return `${url.pathname}${url.search}${url.hash}`.replace(/^\/+/, "");
      }
    } catch {
      return null;
    }
  }
  return null;
};
const normalizeJoinedAssetPath = (widgetDirectory, relativePath) => {
  const normalizedBase = widgetDirectory.replaceAll("\\", "/").replace(/\/+$/, "");
  const combined = `${normalizedBase}/${relativePath.trim()}`;
  const segments = combined.split("/");
  const resolved = [];
  for (const segment of segments) {
    if (!segment || segment === ".") {
      if (resolved.length === 0 && combined.startsWith("/")) {
        resolved.push("");
      }
      continue;
    }
    if (segment === "..") {
      if (resolved.length > 1 || resolved.length === 1 && resolved[0] !== "") {
        resolved.pop();
      }
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/") || normalizedBase;
};
const resolveAssetUrl = (widgetDirectory, value) => {
  const relativePath = extractWidgetRelativePath(value);
  if (!widgetDirectory || !relativePath) {
    return value;
  }
  try {
    return convertFileSrc(normalizeJoinedAssetPath(widgetDirectory, relativePath));
  } catch {
    return value;
  }
};
const resolveAssetsBaseUrl = (widgetDirectory) => {
  const normalizedDirectory = widgetDirectory.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!normalizedDirectory) {
    return "";
  }
  try {
    return convertFileSrc(normalizedDirectory);
  } catch {
    return normalizedDirectory;
  }
};
const rewriteSrcset = (value, widgetDirectory) => {
  return value.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return trimmed;
    }
    const [url, descriptor] = trimmed.split(/\s+/, 2);
    const nextUrl = resolveAssetUrl(widgetDirectory, url);
    return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
  }).join(", ");
};
const rewriteInlineStyleUrls = (value, widgetDirectory) => {
  return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, urlValue) => {
    const nextUrl = resolveAssetUrl(widgetDirectory, urlValue);
    if (nextUrl === urlValue) {
      return full;
    }
    return `url("${nextUrl}")`;
  });
};
const rewriteElementAssetUrls = (element, widgetDirectory) => {
  for (const attribute of RELATIVE_URL_ATTRIBUTES) {
    const currentValue = element.getAttribute(attribute);
    if (!currentValue) {
      continue;
    }
    const nextValue = resolveAssetUrl(widgetDirectory, currentValue);
    if (nextValue !== currentValue) {
      element.setAttribute(attribute, nextValue);
    }
  }
  const currentSrcset = element.getAttribute("srcset");
  if (currentSrcset) {
    const nextSrcset = rewriteSrcset(currentSrcset, widgetDirectory);
    if (nextSrcset !== currentSrcset) {
      element.setAttribute("srcset", nextSrcset);
    }
  }
  const currentStyle = element.getAttribute("style");
  if (currentStyle) {
    const nextStyle = rewriteInlineStyleUrls(currentStyle, widgetDirectory);
    if (nextStyle !== currentStyle) {
      element.setAttribute("style", nextStyle);
    }
  }
};
const rewriteTreeAssetUrls = (root, widgetDirectory) => {
  if (!widgetDirectory) {
    return;
  }
  if (root instanceof Element) {
    rewriteElementAssetUrls(root, widgetDirectory);
  }
  for (const element of Array.from(root.querySelectorAll("*"))) {
    rewriteElementAssetUrls(element, widgetDirectory);
  }
};
const rewriteInstallPathPlaceholders = (input, widgetDirectory) => {
  if (!widgetDirectory) {
    return input;
  }
  let output = input;
  const assetsBaseUrl = resolveAssetsBaseUrl(widgetDirectory);
  if (assetsBaseUrl && output.includes(ASSETS_PLACEHOLDER)) {
    output = output.replaceAll(ASSETS_PLACEHOLDER, assetsBaseUrl);
  }
  if (!output.includes(PACK_INSTALL_PATH_PLACEHOLDER)) {
    return output;
  }
  return output.replace(/\{\{pack-install-path\}\}\/([^"')\s]+)/g, (full, relativePath) => {
    return resolveAssetUrl(widgetDirectory, relativePath);
  });
};
const createWidgetClass = (WidgetImpl, options) => {
  return class RuntimeWidget {
    constructor({
      mount,
      payload,
      setLoading
    }) {
      this.cleanups = [];
      this.widgetDirectory = "";
      this.mount = mount;
      this.payload = payload ?? {};
      this.setLoading = typeof setLoading === "function" ? setLoading : (() => {
      });
      this.assetObserver = new MutationObserver((mutations) => {
        if (!this.widgetDirectory) {
          return;
        }
        for (const mutation of mutations) {
          if (mutation.type === "attributes" && mutation.target instanceof Element) {
            rewriteElementAssetUrls(mutation.target, this.widgetDirectory);
            continue;
          }
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof Element) {
              rewriteTreeAssetUrls(node, this.widgetDirectory);
            }
          }
        }
      });
      this.logic = new WidgetImpl({
        mount,
        payload: this.payload,
        setLoading: (loading) => this.setLoading(Boolean(loading)),
        on: (eventName, selector, handler) => this.on(eventName, selector, handler)
      });
      this.cleanupSignalSubscriptions = bindSignals(this.logic, () => this.render());
      this.assetObserver.observe(this.mount, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src", "href", "poster", "srcset", "style"]
      });
    }
    onInit() {
      this.render();
      this.logic.onInit?.();
    }
    onUpdate(payload) {
      this.payload = payload ?? {};
      this.logic.onUpdate?.(this.payload);
      this.render();
    }
    onDestroy() {
      this.cleanupSignalSubscriptions();
      while (this.cleanups.length > 0) {
        const cleanup = this.cleanups.pop();
        cleanup?.();
      }
      this.assetObserver.disconnect();
      this.logic.onDestroy?.();
      this.mount.innerHTML = "";
    }
    render() {
      const scope = createScope(this.logic, this.payload);
      this.widgetDirectory = String(
        this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
      ).trim();
      const finalTemplate = rewriteInstallPathPlaceholders(options.template, this.widgetDirectory);
      const finalStyles = rewriteInstallPathPlaceholders(options.styles, this.widgetDirectory);
      const renderTemplate = createTemplateRenderer(finalTemplate);
      const html = renderTemplate(scope);
      this.mount.innerHTML = `<style>${finalStyles}</style>${html}`;
      this.mount.setAttribute("data-displayduck-render-empty", html.trim().length === 0 ? "true" : "false");
      rewriteTreeAssetUrls(this.mount, this.widgetDirectory);
      this.logic.afterRender?.();
    }
    on(eventName, selector, handler) {
      const listener = (event) => {
        const target = event.target;
        const matched = target?.closest(selector);
        if (!matched || !this.mount.contains(matched)) {
          return;
        }
        handler(event, matched);
      };
      this.mount.addEventListener(eventName, listener);
      const cleanup = () => this.mount.removeEventListener(eventName, listener);
      this.cleanups.push(cleanup);
      return cleanup;
    }
  };
};
var PlaybackStatus;
(function(PlaybackStatus2) {
  PlaybackStatus2["Playing"] = "playing";
  PlaybackStatus2["Paused"] = "paused";
  PlaybackStatus2["Stopped"] = "stopped";
})(PlaybackStatus || (PlaybackStatus = {}));
var RepeatMode;
(function(RepeatMode2) {
  RepeatMode2["None"] = "none";
  RepeatMode2["Track"] = "track";
  RepeatMode2["List"] = "list";
})(RepeatMode || (RepeatMode = {}));
var MediaControlEventType;
(function(MediaControlEventType2) {
  MediaControlEventType2["Play"] = "play";
  MediaControlEventType2["Pause"] = "pause";
  MediaControlEventType2["PlayPause"] = "playPause";
  MediaControlEventType2["Stop"] = "stop";
  MediaControlEventType2["Next"] = "next";
  MediaControlEventType2["Previous"] = "previous";
  MediaControlEventType2["FastForward"] = "fastForward";
  MediaControlEventType2["Rewind"] = "rewind";
  MediaControlEventType2["SeekTo"] = "seekTo";
  MediaControlEventType2["SetPosition"] = "setPosition";
  MediaControlEventType2["SetPlaybackRate"] = "setPlaybackRate";
})(MediaControlEventType || (MediaControlEventType = {}));
const NOW_PLAYING_EVENT = "system-now-playing-updated";
const getSystemNowPlaying = async () => {
  const payload = await invoke("controller_get_system_now_playing");
  return normalizeSystemNowPlaying(payload);
};
const subscribeToSystemNowPlaying = async (handler) => {
  return listen(NOW_PLAYING_EVENT, (event) => {
    handler(normalizeSystemNowPlaying(event.payload));
  });
};
const normalizeSystemNowPlaying = (input) => {
  if (!input) {
    return {
      metadata: null,
      playback: null
    };
  }
  const duration = Number.isFinite(input.duration) ? input.duration ?? void 0 : void 0;
  const status = mapPlaybackStatus(input.status);
  const metadata = {
    title: input.title,
    artist: typeof input.artist === "string" ? input.artist : void 0,
    album: typeof input.album === "string" ? input.album : void 0,
    artworkUrl: typeof input.artworkUrl === "string" ? input.artworkUrl : void 0,
    artworkData: typeof input.artworkData === "string" ? input.artworkData : void 0,
    duration
  };
  const playbackRate = Number.isFinite(input.playbackRate) && input.playbackRate != null ? input.playbackRate : status === PlaybackStatus.Playing ? 1 : 0;
  const hasNoTrackLength = !Number.isFinite(duration) || (duration ?? 0) <= 0;
  const cannotSeek = input.canSeek === false;
  const hasLivestreamHint = input.isLivestream === true;
  const isBrowserSource = /(chrome|msedge|firefox|brave|opera|vivaldi|arc)/i.test(input.app ?? "");
  const hasLiveMarker = /\blive\b|🔴|\[live\]|\(live\)/i.test(input.title ?? "");
  const hasVeryLongDuration = (duration ?? 0) >= 3 * 60 * 60;
  const likelyBrowserLivestream = isBrowserSource && status === PlaybackStatus.Playing && (hasLiveMarker || hasVeryLongDuration);
  return {
    app: typeof input.app === "string" ? input.app : void 0,
    metadata,
    playback: {
      status,
      position: Number.isFinite(input.elapsedTime) && input.elapsedTime != null ? input.elapsedTime : 0,
      shuffle: false,
      repeatMode: RepeatMode.None,
      playbackRate,
      isLivestream: hasLivestreamHint || hasNoTrackLength || cannotSeek || likelyBrowserLivestream,
      canNext: input.canNext ?? void 0,
      canPrevious: input.canPrevious ?? void 0,
      canPlay: input.canPlay ?? void 0,
      canPause: input.canPause ?? void 0,
      canSeek: input.canSeek ?? void 0
    }
  };
};
const mapPlaybackStatus = (status) => {
  switch ((status ?? "").toLowerCase()) {
    case "playing":
      return PlaybackStatus.Playing;
    case "stopped":
      return PlaybackStatus.Stopped;
    case "paused":
    default:
      return PlaybackStatus.Paused;
  }
};
const createEmptyMedia = () => ({
  metadata: null,
  playback: null
});
const cloneMedia = (media) => ({
  app: media.app,
  metadata: media.metadata ? { ...media.metadata } : null,
  playback: media.playback ? { ...media.playback } : null
});
let DisplayDuckWidget$1 = class DisplayDuckWidget {
  constructor(ctx) {
    this.ctx = ctx;
    this.currentMedia = createEmptyMedia();
    this.unsubscribeNowPlaying = null;
    this.resizeObserver = null;
    this.tickerId = null;
    this.animationTimeoutId = null;
    this.inactiveHideTimerId = null;
    this.pendingInactiveMedia = null;
    this.lastNowPlayingKey = "";
    this.lastTickAt = 0;
    this.playbackAnchorAtMs = 0;
    this.playbackAnchorPosition = 0;
    this.lastMonotonicPosition = 0;
    this.pendingNowPlayingAnimation = false;
    this.inactiveHideDelayMs = 5e3;
    this.verticalLayoutTolerancePx = 2;
    this.mediaState = signal(createEmptyMedia());
    this.playerStyleClassState = signal("horizontal-player");
    this.payload = ctx.payload ?? {};
  }
  onInit() {
    this.attachResizeObserver();
    this.startProgressTicker();
    void this.initializeMedia();
  }
  onUpdate(payload) {
    this.payload = payload ?? {};
    this.scheduleLayoutRefresh();
  }
  afterRender() {
    this.updateProgressElement();
    this.applyNowPlayingAnimation();
    this.checkTextOverflow();
    this.scheduleLayoutRefresh();
  }
  onDestroy() {
    if (this.unsubscribeNowPlaying) {
      this.unsubscribeNowPlaying();
      this.unsubscribeNowPlaying = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.tickerId) {
      clearInterval(this.tickerId);
      this.tickerId = null;
    }
    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId);
      this.animationTimeoutId = null;
    }
    if (this.inactiveHideTimerId) {
      clearTimeout(this.inactiveHideTimerId);
      this.inactiveHideTimerId = null;
    }
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
    return this.booleanConfig("hideCover", false);
  }
  hasMetadata() {
    return Boolean(this.media().metadata);
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
    const metadata = this.media().metadata;
    if (!metadata) {
      return "";
    }
    const artworkData = metadata.artworkData?.trim() ?? "";
    if (artworkData) {
      return artworkData.startsWith("data:") ? artworkData : `data:image/jpeg;base64,${artworkData}`;
    }
    return metadata.artworkUrl?.trim() ?? "";
  }
  showLiveIndicator() {
    return Boolean(this.media().playback?.isLivestream);
  }
  showHorizontalTrack() {
    return this.hasMetadata() && !this.showLiveIndicator() && this.playerStyleClass() === "horizontal-player";
  }
  showVerticalTrack() {
    return this.hasMetadata() && !this.showLiveIndicator() && this.playerStyleClass() === "vertical-player";
  }
  progressPercent() {
    const duration = this.currentMedia.metadata?.duration ?? 0;
    const position = this.currentMedia.playback?.position ?? 0;
    if (!Number.isFinite(duration) || duration <= 0) {
      return 0;
    }
    const rawPercent = position / duration * 100;
    return Math.max(0, Math.min(100, Math.round(rawPercent * 100) / 100));
  }
  showShadows() {
    return this.booleanConfig("shadow", false);
  }
  media() {
    return this.mediaState();
  }
  autoHide() {
    return this.booleanConfig("autoHide", false);
  }
  rightAlign() {
    return this.booleanConfig("rightAlign", false);
  }
  scrollText() {
    return this.booleanConfig("scrollText", false);
  }
  orientation() {
    const value = String(this.config("orientation", "auto")).trim().toLowerCase();
    return value === "horizontal" || value === "vertical" ? value : "auto";
  }
  config(key, fallback) {
    const config = this.payload.config ?? {};
    return config[key] ?? fallback;
  }
  booleanConfig(key, fallback) {
    const value = this.config(key, fallback);
    return value === true;
  }
  async initializeMedia() {
    try {
      this.applyMedia(await getSystemNowPlaying());
      this.unsubscribeNowPlaying = await subscribeToSystemNowPlaying((media) => {
        this.applyMedia(media);
      });
    } catch (error) {
      console.error("Failed to initialize Playback Info widget", error);
    }
  }
  applyMedia(media) {
    if (!media.metadata) {
      this.scheduleInactiveHide(media);
      return;
    }
    if (this.inactiveHideTimerId) {
      clearTimeout(this.inactiveHideTimerId);
      this.inactiveHideTimerId = null;
    }
    this.pendingInactiveMedia = null;
    const nowPlayingKey = this.buildNowPlayingKey(media);
    const nowPlayingChanged = nowPlayingKey !== this.lastNowPlayingKey;
    if (nowPlayingChanged) {
      this.lastNowPlayingKey = nowPlayingKey;
      if (nowPlayingKey) {
        this.pendingNowPlayingAnimation = true;
      }
    }
    const nowMs = performance.now();
    const currentPlayback = this.currentMedia.playback;
    const nextPlayback = media.playback;
    if (nextPlayback) {
      const incomingPos = Number.isFinite(nextPlayback.position) ? nextPlayback.position : 0;
      const currentDerived = this.derivedPosition(nowMs, this.currentMedia);
      const currentPos = currentDerived ?? (currentPlayback?.position ?? 0);
      const isPlaying = nextPlayback.status === "playing" && (nextPlayback.playbackRate ?? 0) > 0;
      let acceptedPos = incomingPos;
      if (isPlaying && !nowPlayingChanged) {
        acceptedPos = Math.max(currentPos, incomingPos);
      }
      media = {
        ...media,
        playback: {
          ...nextPlayback,
          position: acceptedPos
        }
      };
      this.playbackAnchorAtMs = nowMs;
      this.playbackAnchorPosition = acceptedPos;
      this.lastMonotonicPosition = nowPlayingChanged ? acceptedPos : Math.max(this.lastMonotonicPosition, acceptedPos);
    } else {
      this.playbackAnchorAtMs = nowMs;
      this.playbackAnchorPosition = 0;
      this.lastMonotonicPosition = 0;
    }
    this.currentMedia = cloneMedia(media);
    this.syncMediaState();
  }
  scheduleInactiveHide(media) {
    this.pendingInactiveMedia = media;
    if (!this.currentMedia.metadata) {
      this.currentMedia = cloneMedia(media);
      this.syncMediaState();
      return;
    }
    if (this.inactiveHideTimerId) {
      return;
    }
    this.inactiveHideTimerId = setTimeout(() => {
      this.inactiveHideTimerId = null;
      this.lastNowPlayingKey = "";
      this.playbackAnchorAtMs = performance.now();
      this.playbackAnchorPosition = 0;
      this.lastMonotonicPosition = 0;
      this.currentMedia = cloneMedia(this.pendingInactiveMedia ?? createEmptyMedia());
      this.pendingInactiveMedia = null;
      this.syncMediaState();
    }, this.inactiveHideDelayMs);
  }
  startProgressTicker(intervalMs = 250) {
    this.lastTickAt = performance.now();
    this.tickerId = setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - this.lastTickAt) / 1e3;
      this.lastTickAt = now;
      this.tickProgress(deltaSeconds);
    }, intervalMs);
  }
  tickProgress(deltaSeconds) {
    if (deltaSeconds <= 0) {
      return;
    }
    const playback = this.currentMedia.playback;
    if (!playback || playback.status !== "playing" || (playback.playbackRate ?? 0) <= 0) {
      return;
    }
    const nextPosition = this.derivedPosition(performance.now(), this.currentMedia);
    if (nextPosition == null) {
      return;
    }
    const duration = this.currentMedia.metadata?.duration ?? 0;
    const clampedPosition = Number.isFinite(duration) && duration > 0 ? Math.min(duration, nextPosition) : nextPosition;
    if (Math.abs(clampedPosition - playback.position) < 0.05) {
      return;
    }
    const monotonic = Math.max(this.lastMonotonicPosition, clampedPosition);
    this.lastMonotonicPosition = monotonic;
    this.currentMedia = {
      ...this.currentMedia,
      playback: {
        ...playback,
        position: monotonic
      }
    };
    this.updateProgressElement();
  }
  derivedPosition(nowMs, media) {
    const playback = media.playback;
    if (!playback) {
      return null;
    }
    const rate = playback.playbackRate ?? 0;
    if (rate <= 0) {
      return playback.position ?? 0;
    }
    if (this.playbackAnchorAtMs <= 0) {
      this.playbackAnchorAtMs = nowMs;
      this.playbackAnchorPosition = playback.position ?? 0;
      this.lastMonotonicPosition = this.playbackAnchorPosition;
      return this.playbackAnchorPosition;
    }
    const deltaSeconds = (nowMs - this.playbackAnchorAtMs) / 1e3;
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return playback.position ?? 0;
    }
    return (this.playbackAnchorPosition ?? 0) + deltaSeconds * rate;
  }
  buildNowPlayingKey(media) {
    const metadata = media.metadata;
    if (!metadata) {
      return "";
    }
    return [
      metadata.title ?? "",
      metadata.artist ?? "",
      metadata.album ?? "",
      metadata.artworkUrl ?? "",
      metadata.artworkData ?? ""
    ].join("|");
  }
  attachResizeObserver() {
    if (typeof ResizeObserver === "undefined") {
      this.scheduleLayoutRefresh();
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleLayoutRefresh();
    });
    this.resizeObserver.observe(this.ctx.mount);
  }
  scheduleLayoutRefresh() {
    requestAnimationFrame(() => {
      this.updatePlayerSize();
      this.checkTextOverflow();
      this.updateProgressElement();
    });
  }
  updatePlayerSize() {
    const rect = this.ctx.mount.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const nextClass = this.resolvePlayerStyleClass(width, height);
    if (this.playerStyleClassState() !== nextClass) {
      this.playerStyleClassState.set(nextClass);
    }
  }
  resolvePlayerStyleClass(width, height) {
    const orientation = this.orientation();
    if (orientation === "horizontal") {
      return "horizontal-player";
    }
    if (orientation === "vertical") {
      return "vertical-player";
    }
    return width - height > this.verticalLayoutTolerancePx ? "horizontal-player" : "vertical-player";
  }
  applyNowPlayingAnimation() {
    if (!this.pendingNowPlayingAnimation) {
      return;
    }
    const element = this.ctx.mount.querySelector('[data-role="now-playing"]');
    if (!element) {
      return;
    }
    this.pendingNowPlayingAnimation = false;
    element.classList.remove("now-playing-change");
    void element.getBoundingClientRect();
    element.classList.add("now-playing-change");
    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId);
    }
    this.animationTimeoutId = setTimeout(() => {
      element.classList.remove("now-playing-change");
      this.animationTimeoutId = null;
    }, 420);
  }
  checkTextOverflow() {
    this.updateOverflowState('[data-role="artist"]');
    this.updateOverflowState('[data-role="title"]');
  }
  updateOverflowState(selector) {
    const element = this.ctx.mount.querySelector(selector);
    if (!element) {
      return;
    }
    const child = element.querySelector("span");
    const enableScrolling = this.scrollText();
    const isOverflowing = enableScrolling && element.scrollWidth > element.clientWidth;
    element.classList.toggle("scrolling", isOverflowing);
    if (!child) {
      return;
    }
    if (isOverflowing) {
      child.style.setProperty("--scroll-amount", `${element.clientWidth - element.scrollWidth}px`);
      return;
    }
    child.style.removeProperty("--scroll-amount");
  }
  updateProgressElement() {
    const progress = this.ctx.mount.querySelector('[data-role="progress"]');
    if (!progress) {
      return;
    }
    progress.style.width = `${this.progressPercent()}%`;
  }
  syncMediaState() {
    const currentState = this.mediaState();
    if (this.isRenderableMediaEqual(currentState, this.currentMedia)) {
      return;
    }
    this.mediaState.set(cloneMedia(this.currentMedia));
  }
  isRenderableMediaEqual(left, right) {
    const leftMetadata = left.metadata;
    const rightMetadata = right.metadata;
    if (!leftMetadata && !rightMetadata) {
      return true;
    }
    if (!leftMetadata || !rightMetadata) {
      return false;
    }
    return (left.app ?? "") === (right.app ?? "") && leftMetadata.title === rightMetadata.title && (leftMetadata.artist ?? "") === (rightMetadata.artist ?? "") && (leftMetadata.album ?? "") === (rightMetadata.album ?? "") && (leftMetadata.artworkUrl ?? "") === (rightMetadata.artworkUrl ?? "") && (leftMetadata.artworkData ?? "") === (rightMetadata.artworkData ?? "") && (leftMetadata.duration ?? 0) === (rightMetadata.duration ?? 0) && Boolean(left.playback?.isLivestream) === Boolean(right.playback?.isLivestream);
  }
};
const template = '{{#if showWidget()}}\n  <div class="{{ playerClass() }}">\n    <div data-role="now-playing" class="now-playing">\n      {{#if !hideCover() && artworkSource() }}\n        <div class="cover-shell">\n          <div class="backdrop">\n            <img src="{{ artworkSource() }}" alt="Album Cover">\n          </div>\n          <div class="cover">\n            <img class="cover-image" src="{{ artworkSource() }}" alt="Album Cover">\n          </div>\n        </div>\n      {{/if}}\n\n      <div class="details  {{#if showShadows()}}shadows{{/if}}">\n        {{#if hasMetadata()}}\n          <div data-role="artist" class="artist">\n            <span>{{ artistText() }}</span>\n          </div>\n          <div data-role="title" class="title">\n            <span>{{ titleText() }}</span>\n          </div>\n          <div class="album">{{ albumText() }}</div>\n\n          {{#if showLiveIndicator()}}\n            <div class="live">Live <span></span></div>\n          {{/if}}\n\n          {{#if showHorizontalTrack()}}\n            <div class="track inline-track">\n              <div data-role="progress" class="progress" style="width: {{ progressPercent() }}%;"></div>\n            </div>\n          {{/if}}\n        {{/if}}\n\n        {{#if !hasMetadata()}}\n          <div class="title no-metadata"><span>Nothing playing</span></div>\n        {{/if}}\n      </div>\n    </div>\n\n    {{#if showVerticalTrack()}}\n      <div class="track block-track">\n        <div data-role="progress" class="progress" style="width: {{ progressPercent() }}%;"></div>\n      </div>\n    {{/if}}\n  </div>\n{{/if}}\n';
const styles = ".playback-info {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  width: 100%;\n  height: 100%;\n  color: var(--color-text);\n  overflow: hidden;\n  font-size: clamp(0.9rem, var(--host-height, 240px) / 9, 1.4rem);\n}\n.playback-info .now-playing {\n  display: flex;\n  align-items: center;\n  gap: 0.1em;\n  width: 100%;\n  min-height: 0;\n}\n.playback-info .cover-shell {\n  --cover-size: min(28cqw, calc(var(--host-height, 240px) / 2.5));\n  --cover-blur-padding: clamp(1rem, calc(var(--host-height, 240px) / 9.5), 1.5rem);\n  --cover-glow-room: clamp(0.55rem, calc(var(--host-height, 240px) / 16), 0.9rem);\n  --cover-room-block: calc(var(--cover-blur-padding) + var(--cover-glow-room));\n  --cover-room-inline-start: var(--cover-room-block);\n  --cover-room-inline-end: var(--cover-room-block);\n  --cover-shell-width: min(\n    100%,\n    calc(var(--cover-size) + var(--cover-room-inline-start) + var(--cover-room-inline-end))\n  );\n  position: relative;\n  flex: 0 0 auto;\n  width: var(--cover-shell-width);\n  height: min(100%, var(--cover-size) + var(--cover-room-block) * 2);\n  box-sizing: border-box;\n  isolation: isolate;\n}\n.playback-info .cover {\n  position: relative;\n  display: flex;\n  width: calc(100% - var(--cover-room-inline-start) - var(--cover-room-inline-end));\n  height: calc(100% - var(--cover-room-block) * 2);\n  margin-block: var(--cover-room-block);\n  margin-inline-start: var(--cover-room-inline-start);\n  margin-inline-end: var(--cover-room-inline-end);\n  min-width: 0;\n  min-height: 0;\n  aspect-ratio: 1/1;\n  background: rgb(from var(--color-primary) r g b/0.12);\n  border-radius: 0.6em;\n  overflow: hidden;\n  box-sizing: border-box;\n  z-index: 2;\n}\n.playback-info .backdrop {\n  position: absolute;\n  top: var(--cover-room-block);\n  left: var(--cover-room-inline-start);\n  width: calc(100% - var(--cover-room-inline-start) - var(--cover-room-inline-end));\n  height: calc(100% - var(--cover-room-block) * 2);\n  z-index: 1;\n  opacity: 0.92;\n  filter: blur(0.65em) saturate(2.1) brightness(1.16);\n  pointer-events: none;\n}\n.playback-info .backdrop img,\n.playback-info .cover-image {\n  width: 100%;\n  height: 100%;\n  border-radius: 0.6em;\n  object-fit: cover;\n  display: block;\n  box-sizing: border-box;\n}\n.playback-info .cover-image {\n  border: 0.18em solid rgb(from var(--color-text) r g b/0.14);\n  box-shadow: 0 0.8em 1.8em rgba(0, 0, 0, 0.22);\n}\n.playback-info .backdrop img {\n  transform: scale(1.02);\n}\n.playback-info .no-cover {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  height: 100%;\n  border-radius: 0.6em;\n  background: radial-gradient(circle at top, rgb(from var(--color-primary) r g b/0.35), transparent 65%), linear-gradient(135deg, rgb(from var(--color-primary) r g b/0.28), rgb(from var(--color-primary) r g b/0.58));\n  border: 0.18em solid rgb(from var(--color-text) r g b/0.14);\n  box-shadow: 0 0.8em 1.8em rgba(0, 0, 0, 0.18);\n  box-sizing: border-box;\n}\n.playback-info .no-cover i {\n  font-size: clamp(2rem, var(--host-width, 320px) / 8, 3.4rem);\n  opacity: 0.92;\n}\n.playback-info .details {\n  display: flex;\n  flex: 1 1 0;\n  min-width: 0;\n  flex-direction: column;\n  justify-content: center;\n}\n.playback-info .details.shadows {\n  filter: drop-shadow(-1px 1px 1px #000000);\n}\n.playback-info .artist,\n.playback-info .title,\n.playback-info .album,\n.playback-info .live {\n  width: 100%;\n  min-width: 0;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  text-transform: uppercase;\n  line-height: 1.05;\n}\n.playback-info .artist,\n.playback-info .title {\n  text-overflow: clip;\n}\n.playback-info .artist span,\n.playback-info .title span {\n  display: inline-block;\n  opacity: 1;\n}\n.playback-info .artist.scrolling span,\n.playback-info .title.scrolling span {\n  white-space: nowrap;\n  animation: playback-scroll-fade 10s linear infinite;\n  animation-delay: 2s;\n  animation-fill-mode: both;\n  will-change: transform, opacity;\n}\n.playback-info .artist {\n  opacity: 0.8;\n  font-size: 1.1em;\n  font-weight: 300;\n}\n.playback-info .title {\n  font-size: 1.28em;\n  font-weight: 700;\n  margin-top: 0.06em;\n}\n.playback-info .title.no-metadata {\n  white-space: wrap;\n}\n.playback-info .album {\n  margin-top: 0.14em;\n  opacity: 0.48;\n  font-size: 0.82em;\n  font-weight: 300;\n}\n.playback-info .live {\n  display: flex;\n  align-items: center;\n  gap: 0.45em;\n  margin-top: 0.5em;\n  color: rgb(255, 112, 112);\n  font-size: 0.82em;\n  font-weight: 700;\n}\n.playback-info .live span {\n  display: inline-block;\n  width: 0.7em;\n  height: 0.7em;\n  border-radius: 999px;\n  background: currentColor;\n  animation: playback-pulse 0.75s ease-out infinite alternate;\n}\n.playback-info .track {\n  width: 100%;\n  height: 0.55em;\n  border-radius: 0.15em;\n  overflow: hidden;\n  background: rgb(from var(--color-primary) calc(r * 2) calc(g * 2) calc(b * 2));\n}\n.playback-info .inline-track {\n  margin-top: 0.8em;\n}\n.playback-info .block-track {\n  margin-top: 0.8em;\n}\n.playback-info .progress {\n  height: 100%;\n  background: linear-gradient(90deg, rgb(from var(--color-primary) r g b/0.82), var(--color-primary));\n  transition: width 0.22s linear;\n}\n.playback-info.align-right .details {\n  text-align: right;\n  align-items: flex-end;\n}\n.playback-info.align-right .live {\n  justify-content: flex-end;\n}\n.playback-info.horizontal-player .now-playing {\n  flex-direction: row;\n  justify-content: center;\n}\n.playback-info.horizontal-player .details {\n  flex: 1 1 auto;\n  width: min(32rem, 100% - var(--cover-shell-width) - 0.1em);\n  max-width: calc(100% - var(--cover-shell-width) - 0.1em);\n}\n.playback-info.horizontal-player .cover-shell {\n  --cover-room-inline-start: calc(var(--cover-room-block) * 1.15);\n  --cover-room-inline-end: calc(var(--cover-room-block) * 0.45);\n}\n.playback-info.horizontal-player.align-right .cover-shell {\n  --cover-room-inline-start: calc(var(--cover-room-block) * 0.45);\n  --cover-room-inline-end: calc(var(--cover-room-block) * 1.15);\n}\n.playback-info.horizontal-player.align-right .now-playing {\n  flex-direction: row-reverse;\n}\n.playback-info.vertical-player {\n  align-items: center;\n}\n.playback-info.vertical-player .now-playing {\n  flex-direction: column;\n  justify-content: center;\n  text-align: center;\n}\n.playback-info.vertical-player .cover-shell {\n  --cover-size: min(44cqw, calc(var(--host-height, 240px) / 2.25));\n}\n.playback-info.vertical-player .details {\n  width: 100%;\n  align-items: center;\n  text-align: center;\n}\n.playback-info.vertical-player .artist,\n.playback-info.vertical-player .title,\n.playback-info.vertical-player .album,\n.playback-info.vertical-player .live {\n  text-align: center;\n}\n.playback-info.vertical-player .live {\n  justify-content: center;\n}\n.playback-info.vertical-player.align-right .details,\n.playback-info.vertical-player.align-right .artist,\n.playback-info.vertical-player.align-right .title,\n.playback-info.vertical-player.align-right .album,\n.playback-info.vertical-player.align-right .live {\n  text-align: center;\n}\n.playback-info.vertical-player.align-right .live {\n  justify-content: center;\n}\n\n.playback-info .now-playing.now-playing-change {\n  animation: playback-pop-in 0.42s ease-out;\n}\n\n@keyframes playback-scroll-fade {\n  0%, 10% {\n    transform: translateX(0);\n    opacity: 1;\n  }\n  70%, 80% {\n    transform: translateX(var(--scroll-amount, -100px));\n    opacity: 1;\n  }\n  85% {\n    transform: translateX(var(--scroll-amount, -100px));\n    opacity: 0;\n  }\n  85.01% {\n    transform: translateX(0);\n    opacity: 0;\n  }\n  100% {\n    transform: translateX(0);\n    opacity: 1;\n  }\n}\n@keyframes playback-pulse {\n  from {\n    opacity: 0.55;\n    transform: scale(0.86);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n@keyframes playback-pop-in {\n  0% {\n    opacity: 0;\n    transform: scale(0.96);\n  }\n  100% {\n    opacity: 1;\n    transform: scale(1);\n  }\n}";
const DisplayDuckWidget2 = createWidgetClass(DisplayDuckWidget$1, { template, styles });
const Widget = DisplayDuckWidget2;
const displayduckPackPlaybackInfo_playbackInfo_entry = { DisplayDuckWidget: DisplayDuckWidget2, Widget };
export {
  DisplayDuckWidget2 as DisplayDuckWidget,
  Widget,
  displayduckPackPlaybackInfo_playbackInfo_entry as default
};
//# sourceMappingURL=playback-info.js.map
