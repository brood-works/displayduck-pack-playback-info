import { signal, type WidgetContext, type WidgetPayload } from '@displayduck/base';
import {
  getSystemNowPlaying,
  subscribeToSystemNowPlaying,
  type SystemNowPlayingMedia,
} from '@displayduck/media';

type PlayerStyleClass = 'horizontal-player' | 'vertical-player';
type Orientation = 'auto' | 'horizontal' | 'vertical';

const createEmptyMedia = (): SystemNowPlayingMedia => ({
  metadata: null,
  playback: null,
});

const cloneMedia = (media: SystemNowPlayingMedia): SystemNowPlayingMedia => ({
  app: media.app,
  metadata: media.metadata ? { ...media.metadata } : null,
  playback: media.playback ? { ...media.playback } : null,
});

export class DisplayDuckWidget {
  private payload: WidgetPayload;
  private currentMedia = createEmptyMedia();
  private unsubscribeNowPlaying: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private tickerId: ReturnType<typeof setInterval> | null = null;
  private animationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private inactiveHideTimerId: ReturnType<typeof setTimeout> | null = null;
  private pendingInactiveMedia: SystemNowPlayingMedia | null = null;
  private lastNowPlayingKey = '';
  private lastTickAt = 0;
  private playbackAnchorAtMs = 0;
  private playbackAnchorPosition = 0;
  private lastMonotonicPosition = 0;
  private pendingNowPlayingAnimation = false;
  private readonly inactiveHideDelayMs = 5000;
  private readonly verticalLayoutTolerancePx = 2;
  private readonly mediaState = signal<SystemNowPlayingMedia>(createEmptyMedia());
  private readonly playerStyleClassState = signal<PlayerStyleClass>('horizontal-player');

  public constructor(private readonly ctx: WidgetContext) {
    this.payload = ctx.payload ?? {};
  }

  public onInit(): void {
    this.attachResizeObserver();
    this.startProgressTicker();
    void this.initializeMedia();
  }

  public onUpdate(payload: WidgetPayload): void {
    this.payload = payload ?? {};
    this.scheduleLayoutRefresh();
  }

  public afterRender(): void {
    this.updateProgressElement();
    this.applyNowPlayingAnimation();
    this.checkTextOverflow();
    this.scheduleLayoutRefresh();
  }

  public onDestroy(): void {
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

  public showWidget(): boolean {
    return !this.autoHide() || this.hasMetadata();
  }

  public playerClass(): string {
    return `playback-info ${this.playerStyleClass()}${this.rightAlign() ? ' align-right' : ''}`;
  }

  public playerStyleClass(): PlayerStyleClass {
    return this.playerStyleClassState();
  }

  public hideCover(): boolean {
    return this.booleanConfig('hideCover', false);
  }

  public hasMetadata(): boolean {
    return Boolean(this.media().metadata);
  }

  public artistText(): string {
    return this.media().metadata?.artist?.trim() || '';
  }

  public titleText(): string {
    return this.media().metadata?.title?.trim() || '';
  }

  public albumText(): string {
    return this.media().metadata?.album?.trim() || '';
  }

  public artworkSource(): string {
    const metadata = this.media().metadata;
    if (!metadata) {
      return '';
    }

    const artworkData = metadata.artworkData?.trim() ?? '';
    if (artworkData) {
      return artworkData.startsWith('data:')
        ? artworkData
        : `data:image/jpeg;base64,${artworkData}`;
    }

    return metadata.artworkUrl?.trim() ?? '';
  }

  public showLiveIndicator(): boolean {
    return Boolean(this.media().playback?.isLivestream);
  }

  public showHorizontalTrack(): boolean {
    return this.hasMetadata()
      && !this.showLiveIndicator()
      && this.playerStyleClass() === 'horizontal-player';
  }

  public showVerticalTrack(): boolean {
    return this.hasMetadata()
      && !this.showLiveIndicator()
      && this.playerStyleClass() === 'vertical-player';
  }

  public progressPercent(): number {
    const duration = this.currentMedia.metadata?.duration ?? 0;
    const position = this.currentMedia.playback?.position ?? 0;

    if (!Number.isFinite(duration) || duration <= 0) {
      return 0;
    }

    const rawPercent = (position / duration) * 100;
    return Math.max(0, Math.min(100, Math.round(rawPercent * 100) / 100));
  }

  private media(): SystemNowPlayingMedia {
    return this.mediaState();
  }

  private autoHide(): boolean {
    return this.booleanConfig('autoHide', false);
  }

  private rightAlign(): boolean {
    return this.booleanConfig('rightAlign', false);
  }

  private scrollText(): boolean {
    return this.booleanConfig('scrollText', false);
  }

  private orientation(): Orientation {
    const value = String(this.config('orientation', 'auto')).trim().toLowerCase();
    return value === 'horizontal' || value === 'vertical' ? value : 'auto';
  }

  private config<T>(key: string, fallback: T): T {
    const config = (this.payload as { config?: Record<string, unknown> }).config ?? {};
    return (config[key] as T | undefined) ?? fallback;
  }

  private booleanConfig(key: string, fallback: boolean): boolean {
    const value = this.config<boolean>(key, fallback);
    return value === true;
  }

  private async initializeMedia(): Promise<void> {
    try {
      this.applyMedia(await getSystemNowPlaying());
      this.unsubscribeNowPlaying = await subscribeToSystemNowPlaying((media) => {
        this.applyMedia(media);
      });
    } catch (error) {
      console.error('Failed to initialize Playback Info widget', error);
    }
  }

  private applyMedia(media: SystemNowPlayingMedia): void {
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
      const isPlaying = nextPlayback.status === 'playing' && (nextPlayback.playbackRate ?? 0) > 0;

      let acceptedPos = incomingPos;
      if (isPlaying && !nowPlayingChanged) {
        acceptedPos = Math.max(currentPos, incomingPos);
      }

      media = {
        ...media,
        playback: {
          ...nextPlayback,
          position: acceptedPos,
        },
      };

      this.playbackAnchorAtMs = nowMs;
      this.playbackAnchorPosition = acceptedPos;
      this.lastMonotonicPosition = nowPlayingChanged
        ? acceptedPos
        : Math.max(this.lastMonotonicPosition, acceptedPos);
    } else {
      this.playbackAnchorAtMs = nowMs;
      this.playbackAnchorPosition = 0;
      this.lastMonotonicPosition = 0;
    }

    this.currentMedia = cloneMedia(media);
    this.syncMediaState();
  }

  private scheduleInactiveHide(media: SystemNowPlayingMedia): void {
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
      this.lastNowPlayingKey = '';
      this.playbackAnchorAtMs = performance.now();
      this.playbackAnchorPosition = 0;
      this.lastMonotonicPosition = 0;
      this.currentMedia = cloneMedia(this.pendingInactiveMedia ?? createEmptyMedia());
      this.pendingInactiveMedia = null;
      this.syncMediaState();
    }, this.inactiveHideDelayMs);
  }

  private startProgressTicker(intervalMs = 250): void {
    this.lastTickAt = performance.now();
    this.tickerId = setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - this.lastTickAt) / 1000;
      this.lastTickAt = now;
      this.tickProgress(deltaSeconds);
    }, intervalMs);
  }

  private tickProgress(deltaSeconds: number): void {
    if (deltaSeconds <= 0) {
      return;
    }

    const playback = this.currentMedia.playback;
    if (!playback || playback.status !== 'playing' || (playback.playbackRate ?? 0) <= 0) {
      return;
    }

    const nextPosition = this.derivedPosition(performance.now(), this.currentMedia);
    if (nextPosition == null) {
      return;
    }

    const duration = this.currentMedia.metadata?.duration ?? 0;
    const clampedPosition =
      Number.isFinite(duration) && duration > 0 ? Math.min(duration, nextPosition) : nextPosition;

    if (Math.abs(clampedPosition - playback.position) < 0.05) {
      return;
    }

    const monotonic = Math.max(this.lastMonotonicPosition, clampedPosition);
    this.lastMonotonicPosition = monotonic;
    this.currentMedia = {
      ...this.currentMedia,
      playback: {
        ...playback,
        position: monotonic,
      },
    };
    this.updateProgressElement();
  }

  private derivedPosition(nowMs: number, media: SystemNowPlayingMedia): number | null {
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

    const deltaSeconds = (nowMs - this.playbackAnchorAtMs) / 1000;
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return playback.position ?? 0;
    }

    return (this.playbackAnchorPosition ?? 0) + deltaSeconds * rate;
  }

  private buildNowPlayingKey(media: SystemNowPlayingMedia): string {
    const metadata = media.metadata;
    if (!metadata) {
      return '';
    }

    return [
      metadata.title ?? '',
      metadata.artist ?? '',
      metadata.album ?? '',
      metadata.artworkUrl ?? '',
      metadata.artworkData ?? '',
    ].join('|');
  }

  private attachResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      this.scheduleLayoutRefresh();
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleLayoutRefresh();
    });
    this.resizeObserver.observe(this.ctx.mount);
  }

  private scheduleLayoutRefresh(): void {
    requestAnimationFrame(() => {
      this.updatePlayerSize();
      this.checkTextOverflow();
      this.updateProgressElement();
    });
  }

  private updatePlayerSize(): void {
    const rect = this.ctx.mount.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const nextClass = this.resolvePlayerStyleClass(width, height);

    if (this.playerStyleClassState() !== nextClass) {
      this.playerStyleClassState.set(nextClass);
    }
  }

  private resolvePlayerStyleClass(width: number, height: number): PlayerStyleClass {
    const orientation = this.orientation();
    if (orientation === 'horizontal') {
      return 'horizontal-player';
    }
    if (orientation === 'vertical') {
      return 'vertical-player';
    }

    return width - height > this.verticalLayoutTolerancePx
      ? 'horizontal-player'
      : 'vertical-player';
  }

  private applyNowPlayingAnimation(): void {
    if (!this.pendingNowPlayingAnimation) {
      return;
    }

    const element = this.ctx.mount.querySelector('[data-role="now-playing"]') as HTMLElement | null;
    if (!element) {
      return;
    }

    this.pendingNowPlayingAnimation = false;
    element.classList.remove('now-playing-change');
    void element.getBoundingClientRect();
    element.classList.add('now-playing-change');

    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId);
    }
    this.animationTimeoutId = setTimeout(() => {
      element.classList.remove('now-playing-change');
      this.animationTimeoutId = null;
    }, 420);
  }

  private checkTextOverflow(): void {
    this.updateOverflowState('[data-role="artist"]');
    this.updateOverflowState('[data-role="title"]');
  }

  private updateOverflowState(selector: string): void {
    const element = this.ctx.mount.querySelector(selector) as HTMLElement | null;
    if (!element) {
      return;
    }

    const child = element.querySelector('span') as HTMLElement | null;
    const enableScrolling = this.scrollText();
    const isOverflowing = enableScrolling && element.scrollWidth > element.clientWidth;

    element.classList.toggle('scrolling', isOverflowing);
    if (!child) {
      return;
    }

    if (isOverflowing) {
      child.style.setProperty('--scroll-amount', `${element.clientWidth - element.scrollWidth}px`);
      return;
    }

    child.style.removeProperty('--scroll-amount');
  }

  private updateProgressElement(): void {
    const progress = this.ctx.mount.querySelector('[data-role="progress"]') as HTMLElement | null;
    if (!progress) {
      return;
    }

    progress.style.width = `${this.progressPercent()}%`;
  }

  private syncMediaState(): void {
    const currentState = this.mediaState();
    if (this.isRenderableMediaEqual(currentState, this.currentMedia)) {
      return;
    }

    this.mediaState.set(cloneMedia(this.currentMedia));
  }

  private isRenderableMediaEqual(
    left: SystemNowPlayingMedia,
    right: SystemNowPlayingMedia
  ): boolean {
    const leftMetadata = left.metadata;
    const rightMetadata = right.metadata;

    if (!leftMetadata && !rightMetadata) {
      return true;
    }

    if (!leftMetadata || !rightMetadata) {
      return false;
    }

    return (
      (left.app ?? '') === (right.app ?? '')
      && leftMetadata.title === rightMetadata.title
      && (leftMetadata.artist ?? '') === (rightMetadata.artist ?? '')
      && (leftMetadata.album ?? '') === (rightMetadata.album ?? '')
      && (leftMetadata.artworkUrl ?? '') === (rightMetadata.artworkUrl ?? '')
      && (leftMetadata.artworkData ?? '') === (rightMetadata.artworkData ?? '')
      && (leftMetadata.duration ?? 0) === (rightMetadata.duration ?? 0)
      && Boolean(left.playback?.isLivestream) === Boolean(right.playback?.isLivestream)
    );
  }
}
