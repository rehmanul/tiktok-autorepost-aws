import { request as undiciRequest } from 'undici';
import { TikTokClient, TikTokFeedRequest, TikTokFeedResponse, TikTokVideo } from './types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const DEFAULT_ENDPOINT_PATH = '/api/tiktok';
const DEFAULT_TIMEOUT_MS = normalizeInteger(
  process.env.TIKTOK_SOURCE_SERVICE_TIMEOUT_MS ?? process.env.HTTP_FETCH_TIMEOUT_MS,
  12_000
);
const DEFAULT_MAX_RETRIES = Math.max(
  normalizeInteger(process.env.TIKTOK_SOURCE_SERVICE_MAX_RETRIES ?? process.env.HTTP_MAX_RETRIES, 3),
  0
);
const DEFAULT_MAX_POSTS = clampInteger(normalizeInteger(process.env.TIKTOK_SOURCE_SERVICE_MAX_POSTS, 500), 1, 500);
const DEFAULT_MEDIA_VALIDATION_TIMEOUT_MS = normalizeInteger(process.env.TIKTOK_MEDIA_VALIDATION_TIMEOUT_MS, 8_000);
const DEFAULT_MEDIA_VALIDATION_MAX_RETRIES = Math.max(
  normalizeInteger(process.env.TIKTOK_MEDIA_VALIDATION_MAX_RETRIES, 1),
  0
);
const MAX_UPSTREAM_PER_PAGE = 100;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5_000;

type JsonRecord = Record<string, unknown>;

type RejectReason =
  | 'invalid_item_shape'
  | 'missing_video_id'
  | 'missing_epoch_time_posted'
  | 'missing_media_candidate'
  | 'duplicate_video_id'
  | 'no_retrievable_media_url';

type MediaValidationFailureReason =
  | 'invalid_url'
  | 'http_status'
  | 'non_media_response'
  | 'timeout'
  | 'network_error'
  | 'unexpected_error';

interface CandidateUrl {
  kind: 'download' | 'playback';
  field: string;
  url: string;
}

interface CoreVideo {
  videoId: string;
  url: string;
  description: string;
  epochTimePosted: number;
  likes?: number;
  views?: number;
  comments?: number;
  shares?: number;
  thumbnailUrl?: string;
  durationSeconds?: number;
  candidates: CandidateUrl[];
}

interface AdapterDiagnostics {
  inputCount: number;
  acceptedCount: number;
  rejectedCount: number;
  filteredByStartEpoch: number;
  filteredByEndEpoch: number;
  mediaValidationAttempted: number;
  mediaValidationFailures: number;
  rejectedByReason: Record<RejectReason, number>;
  mediaValidationFailuresByReason: Record<MediaValidationFailureReason, number>;
}

interface UpstreamPageBundle {
  items: unknown[];
  pagesFetched: number;
  upstreamPerPage: number;
  upstreamMeta: JsonRecord;
}

interface MediaValidationOutcome {
  ok: boolean;
  reason?: MediaValidationFailureReason;
}

export interface TikTokServiceClientOptions {
  serviceBaseUrl?: string;
  endpointPath?: string;
  userAgent?: string;
  timeoutMs?: number;
  maxRetries?: number;
  maxPosts?: number;
  mediaValidationTimeoutMs?: number;
  mediaValidationMaxRetries?: number;
}

export class TikTokServiceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TikTokServiceConfigError';
  }
}

export class TikTokServiceRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'TikTokServiceRequestError';
  }
}

class RetryableError extends Error {
  constructor(message: string, readonly retryCause?: unknown) {
    super(message);
    this.name = 'RetryableError';
  }
}

class MediaValidationFailureError extends Error {
  constructor(readonly reason: MediaValidationFailureReason, message: string) {
    super(message);
    this.name = 'MediaValidationFailureError';
  }
}

export class TikTokServiceClient implements TikTokClient {
  private readonly endpointUrl: URL;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxPosts: number;
  private readonly mediaValidationTimeoutMs: number;
  private readonly mediaValidationMaxRetries: number;

  constructor(options: TikTokServiceClientOptions = {}) {
    const serviceBaseUrl = (options.serviceBaseUrl ?? process.env.TIKTOK_SOURCE_SERVICE_URL ?? '').trim();
    if (!serviceBaseUrl) {
      throw new TikTokServiceConfigError('TIKTOK_SOURCE_SERVICE_URL is required for TikTok source service integration');
    }

    let parsedServiceUrl: URL;
    try {
      parsedServiceUrl = new URL(serviceBaseUrl);
    } catch {
      throw new TikTokServiceConfigError(`Invalid TIKTOK_SOURCE_SERVICE_URL value: "${serviceBaseUrl}"`);
    }

    if (parsedServiceUrl.protocol !== 'http:' && parsedServiceUrl.protocol !== 'https:') {
      throw new TikTokServiceConfigError('TIKTOK_SOURCE_SERVICE_URL must use http or https protocol');
    }

    const endpointPath = options.endpointPath ?? DEFAULT_ENDPOINT_PATH;
    this.endpointUrl = new URL(normalizeEndpointPath(endpointPath), parsedServiceUrl);
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = clampInteger(normalizeInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS), 1_000, 120_000);
    this.maxRetries = Math.max(normalizeInteger(options.maxRetries, DEFAULT_MAX_RETRIES), 0);
    this.maxPosts = clampInteger(normalizeInteger(options.maxPosts, DEFAULT_MAX_POSTS), 1, 500);
    this.mediaValidationTimeoutMs = clampInteger(
      normalizeInteger(options.mediaValidationTimeoutMs, DEFAULT_MEDIA_VALIDATION_TIMEOUT_MS),
      1_000,
      120_000
    );
    this.mediaValidationMaxRetries = Math.max(
      normalizeInteger(options.mediaValidationMaxRetries, DEFAULT_MEDIA_VALIDATION_MAX_RETRIES),
      0
    );
  }

  async fetchUserFeed(request: TikTokFeedRequest): Promise<TikTokFeedResponse> {
    const username = sanitizeUsername(request.username);
    if (!username) {
      throw new TikTokServiceRequestError('TikTok username is required');
    }

    const page = Math.max(normalizeInteger(request.page, 1), 1);
    const perPage = clampInteger(normalizeInteger(request.perPage, 50), 1, 100);
    const startEpoch = normalizeEpochBoundary(request.startEpoch, 'startEpoch');
    const endEpoch = normalizeEpochBoundary(request.endEpoch, 'endEpoch');

    if (startEpoch !== undefined && endEpoch !== undefined && startEpoch > endEpoch) {
      throw new TikTokServiceRequestError('startEpoch must be less than or equal to endEpoch');
    }

    const mediaCookies = normalizeCookieHeader(request.cookies);
    const upstream = await this.fetchUpstreamPages(username, perPage);

    const diagnostics: AdapterDiagnostics = {
      inputCount: upstream.items.length,
      acceptedCount: 0,
      rejectedCount: 0,
      filteredByStartEpoch: 0,
      filteredByEndEpoch: 0,
      mediaValidationAttempted: 0,
      mediaValidationFailures: 0,
      rejectedByReason: createRejectedByReasonCounter(),
      mediaValidationFailuresByReason: createMediaValidationFailureCounter()
    };

    const normalizedVideos: TikTokVideo[] = [];
    const seenVideoIds = new Set<string>();

    for (const item of upstream.items) {
      const normalized = this.normalizeCoreVideo(item, username);
      if (!normalized.ok) {
        incrementRejectReason(diagnostics, normalized.reason);
        continue;
      }

      if (seenVideoIds.has(normalized.video.videoId)) {
        incrementRejectReason(diagnostics, 'duplicate_video_id');
        continue;
      }
      seenVideoIds.add(normalized.video.videoId);

      if (startEpoch !== undefined && normalized.video.epochTimePosted < startEpoch) {
        diagnostics.filteredByStartEpoch += 1;
        continue;
      }

      if (endEpoch !== undefined && normalized.video.epochTimePosted > endEpoch) {
        diagnostics.filteredByEndEpoch += 1;
        continue;
      }

      const selectedMedia = await this.selectMediaCandidate(
        normalized.video.candidates,
        mediaCookies,
        diagnostics
      );

      if (!selectedMedia) {
        incrementRejectReason(diagnostics, 'no_retrievable_media_url');
        continue;
      }

      normalizedVideos.push({
        videoId: normalized.video.videoId,
        url: normalized.video.url,
        description: normalized.video.description,
        epochTimePosted: normalized.video.epochTimePosted,
        likes: normalized.video.likes,
        views: normalized.video.views,
        comments: normalized.video.comments,
        shares: normalized.video.shares,
        downloadUrl: selectedMedia.kind === 'download' ? selectedMedia.url : undefined,
        playbackUrl: selectedMedia.kind === 'playback' ? selectedMedia.url : undefined,
        thumbnailUrl: normalized.video.thumbnailUrl,
        durationSeconds: normalized.video.durationSeconds
      });
      diagnostics.acceptedCount += 1;
    }

    normalizedVideos.sort((a, b) => b.epochTimePosted - a.epochTimePosted);

    const totalPosts = normalizedVideos.length;
    const startIndex = (page - 1) * perPage;
    const videos = normalizedVideos.slice(startIndex, startIndex + perPage);

    return {
      meta: {
        source: 'git1-service',
        username,
        page,
        perPage,
        totalPosts,
        startEpoch: startEpoch ?? null,
        endEpoch: endEpoch ?? null,
        upstream: {
          endpoint: this.endpointUrl.toString(),
          pagesFetched: upstream.pagesFetched,
          upstreamPerPage: upstream.upstreamPerPage,
          maxPosts: this.maxPosts,
          meta: upstream.upstreamMeta
        },
        diagnostics
      },
      videos
    };
  }

  private async fetchUpstreamPages(username: string, requestedPerPage: number): Promise<UpstreamPageBundle> {
    const upstreamPerPage = clampInteger(Math.max(requestedPerPage, 50), 1, MAX_UPSTREAM_PER_PAGE);
    const maxPageRequests = Math.max(1, Math.ceil(this.maxPosts / upstreamPerPage));

    const items: unknown[] = [];
    let pagesFetched = 0;
    let upstreamMeta: JsonRecord = {};
    let declaredTotalPages: number | undefined;

    for (let page = 1; page <= maxPageRequests; page += 1) {
      const payload = await this.fetchUpstreamPage(username, page, upstreamPerPage);
      const pageItems = extractVideoArray(payload);
      if (!pageItems) {
        throw new TikTokServiceRequestError('Git1 /api/tiktok response missing video array (expected data/videos/itemList)');
      }

      const meta = asRecord(payload.meta) ?? {};
      if (pagesFetched === 0) {
        upstreamMeta = meta;
      }

      const totalPages = parseOptionalInteger(meta.total_pages ?? meta.totalPages);
      if (totalPages !== undefined && totalPages > 0) {
        declaredTotalPages = totalPages;
      }

      pagesFetched += 1;
      if (!pageItems.length) {
        break;
      }

      items.push(...pageItems);

      if (items.length >= this.maxPosts) {
        break;
      }

      if (declaredTotalPages !== undefined && page >= declaredTotalPages) {
        break;
      }
    }

    return {
      items: items.slice(0, this.maxPosts),
      pagesFetched,
      upstreamPerPage,
      upstreamMeta
    };
  }

  private async fetchUpstreamPage(username: string, page: number, perPage: number): Promise<JsonRecord> {
    const url = new URL(this.endpointUrl);
    url.searchParams.set('username', username);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per-page', String(perPage));
    url.searchParams.set('count', String(this.maxPosts));
    url.searchParams.set('max', String(this.maxPosts));

    return this.withRetries(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await undiciRequest(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'user-agent': this.userAgent
          },
          signal: controller.signal
        });

        if (response.statusCode === 429 || response.statusCode >= 500) {
          const body = await safeReadText(response.body);
          throw new RetryableError(
            `Git1 /api/tiktok temporary failure with status ${response.statusCode}`,
            new TikTokServiceRequestError(
              `Git1 /api/tiktok temporary failure with status ${response.statusCode}`,
              response.statusCode,
              body
            )
          );
        }

        if (response.statusCode >= 400) {
          const body = await safeReadText(response.body);
          throw new TikTokServiceRequestError(
            `Git1 /api/tiktok failed with status ${response.statusCode}`,
            response.statusCode,
            body
          );
        }

        const payload = await response.body.json();
        if (!asRecord(payload)) {
          throw new TikTokServiceRequestError('Git1 /api/tiktok returned non-object JSON');
        }

        const normalizedPayload = payload as JsonRecord;
        const status = readString(normalizedPayload.status);
        if (status && status.toLowerCase() === 'error') {
          throw new TikTokServiceRequestError(
            readString(normalizedPayload.error) ??
              readString(normalizedPayload.details) ??
              'Git1 /api/tiktok returned an error status'
          );
        }

        return normalizedPayload;
      } catch (error) {
        if (error instanceof TikTokServiceRequestError) {
          throw error;
        }
        if (isAbortError(error)) {
          throw new RetryableError('Git1 /api/tiktok request timed out', error);
        }
        if (isTransientNetworkError(error)) {
          throw new RetryableError('Git1 /api/tiktok transient network error', error);
        }
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        clearTimeout(timeout);
      }
    }, this.maxRetries);
  }

  private normalizeCoreVideo(
    item: unknown,
    fallbackUsername: string
  ):
    | {
        ok: true;
        video: CoreVideo;
      }
    | {
        ok: false;
        reason: RejectReason;
      } {
    const raw = asRecord(item);
    if (!raw) {
      return { ok: false, reason: 'invalid_item_shape' };
    }

    const videoRecord = asRecord(raw.video);
    const statsRecord = asRecord(raw.stats) ?? asRecord(raw.statistics);
    const authorRecord = asRecord(raw.author);

    const videoId =
      readString(raw.video_id) ??
      readString(raw.videoId) ??
      readString(raw.id) ??
      readString(raw.aweme_id) ??
      readString(raw.awemeId) ??
      readString(raw.itemId) ??
      readString(videoRecord?.id);

    if (!videoId) {
      return { ok: false, reason: 'missing_video_id' };
    }

    const epochTimePosted = parseEpochSeconds(
      raw.epoch_time_posted ??
        raw.epochTimePosted ??
        raw.createTime ??
        raw.create_time ??
        raw.create_time_ms ??
        raw.created_at ??
        raw.createdAt
    );

    if (epochTimePosted === null) {
      return { ok: false, reason: 'missing_epoch_time_posted' };
    }

    const authorUsername =
      readString(authorRecord?.username) ??
      readString(authorRecord?.uniqueId) ??
      readString(authorRecord?.unique_id) ??
      fallbackUsername;

    const canonicalUsername = sanitizeUsername(authorUsername) || fallbackUsername;

    const permalink =
      normalizeHttpUrl(
        readString(raw.url) ??
          readString(raw.permalink) ??
          readString(raw.share_url) ??
          readString(raw.shareUrl)
      ) ?? `https://www.tiktok.com/@${canonicalUsername}/video/${videoId}`;

    const candidates = collectMediaCandidates(raw, videoRecord);
    if (!candidates.length) {
      return { ok: false, reason: 'missing_media_candidate' };
    }

    return {
      ok: true,
      video: {
        videoId,
        url: permalink,
        description:
          readString(raw.description) ??
          readString(raw.desc) ??
          readString(raw.title) ??
          readString(raw.video_description) ??
          '',
        epochTimePosted,
        likes: parseOptionalInteger(raw.likes ?? statsRecord?.likes ?? statsRecord?.diggCount ?? statsRecord?.digg_count),
        views: parseOptionalInteger(raw.views ?? statsRecord?.plays ?? statsRecord?.playCount ?? statsRecord?.play_count),
        comments: parseOptionalInteger(
          raw.comments ?? statsRecord?.comments ?? statsRecord?.commentCount ?? statsRecord?.comment_count
        ),
        shares: parseOptionalInteger(raw.shares ?? statsRecord?.shares ?? statsRecord?.shareCount ?? statsRecord?.share_count),
        thumbnailUrl:
          normalizeHttpUrl(
            readString(raw.thumbnailUrl) ??
              readString(raw.thumbnail_url) ??
              readString(raw.thumbnail) ??
              readString(raw.cover_image) ??
              readString(raw.cover) ??
              readString(videoRecord?.cover) ??
              readString(videoRecord?.coverUrl) ??
              readString(videoRecord?.dynamicCover)
          ) ?? undefined,
        durationSeconds: parseOptionalInteger(
          raw.durationSeconds ?? raw.duration ?? videoRecord?.duration ?? videoRecord?.durationSecond
        ),
        candidates
      }
    };
  }

  private async selectMediaCandidate(
    candidates: CandidateUrl[],
    cookies: string | undefined,
    diagnostics: AdapterDiagnostics
  ): Promise<CandidateUrl | null> {
    for (const candidate of candidates) {
      diagnostics.mediaValidationAttempted += 1;

      const validation = await this.validateMediaCandidate(candidate.url, cookies);
      if (validation.ok) {
        return candidate;
      }

      diagnostics.mediaValidationFailures += 1;
      diagnostics.mediaValidationFailuresByReason[validation.reason ?? 'unexpected_error'] += 1;
    }

    return null;
  }

  private async validateMediaCandidate(url: string, cookies?: string): Promise<MediaValidationOutcome> {
    const normalizedUrl = normalizeHttpUrl(url);
    if (!normalizedUrl) {
      return { ok: false, reason: 'invalid_url' };
    }

    const headCheck = await this.probeMediaUrl(normalizedUrl, 'HEAD', cookies);
    if (headCheck.ok) {
      return headCheck;
    }

    if (headCheck.reason === 'invalid_url') {
      return headCheck;
    }

    const getCheck = await this.probeMediaUrl(normalizedUrl, 'GET', cookies, {
      range: 'bytes=0-2047'
    });
    if (getCheck.ok) {
      return getCheck;
    }

    return {
      ok: false,
      reason: getCheck.reason ?? headCheck.reason ?? 'unexpected_error'
    };
  }

  private async probeMediaUrl(
    url: string,
    method: 'HEAD' | 'GET',
    cookies?: string,
    extraHeaders?: Record<string, string>
  ): Promise<MediaValidationOutcome> {
    try {
      await this.withRetries(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.mediaValidationTimeoutMs);

        try {
          const headers: Record<string, string> = {
            accept: '*/*',
            'user-agent': this.userAgent,
            ...extraHeaders
          };
          if (cookies) {
            headers.cookie = cookies;
          }

          const response = await undiciRequest(url, {
            method,
            headers,
            signal: controller.signal,
            maxRedirections: 4
          });

          const contentType = readHeader(response.headers, 'content-type');
          const contentRange = readHeader(response.headers, 'content-range');
          const contentDisposition = readHeader(response.headers, 'content-disposition');

          if (response.statusCode === 429 || response.statusCode >= 500) {
            throw new RetryableError(
              `Media validation received retryable status ${response.statusCode}`,
              new MediaValidationFailureError(
                'http_status',
                `Media validation received retryable status ${response.statusCode}`
              )
            );
          }

          if (response.statusCode >= 400) {
            await safeDrainBody(response.body);
            throw new MediaValidationFailureError(
              'http_status',
              `Media validation received HTTP ${response.statusCode}`
            );
          }

          await safeDrainBody(response.body);

          if (!isLikelyMediaResponse(url, contentType, contentRange, contentDisposition)) {
            throw new MediaValidationFailureError('non_media_response', 'URL did not return a recognizable media response');
          }
        } catch (error) {
          if (error instanceof MediaValidationFailureError) {
            throw error;
          }

          if (isAbortError(error)) {
            throw new RetryableError(
              'Media validation request timed out',
              new MediaValidationFailureError('timeout', 'Media validation request timed out')
            );
          }

          if (isTransientNetworkError(error)) {
            throw new RetryableError(
              'Media validation transient network error',
              new MediaValidationFailureError('network_error', 'Media validation transient network error')
            );
          }

          throw error instanceof Error ? error : new Error(String(error));
        } finally {
          clearTimeout(timeout);
        }
      }, this.mediaValidationMaxRetries);

      return { ok: true };
    } catch (error) {
      if (error instanceof MediaValidationFailureError) {
        return {
          ok: false,
          reason: error.reason
        };
      }

      return {
        ok: false,
        reason: 'unexpected_error'
      };
    }
  }

  private async withRetries<T>(operation: () => Promise<T>, retries: number): Promise<T> {
    let attempts = 0;
    let delayMs = BASE_RETRY_DELAY_MS;

    for (;;) {
      try {
        return await operation();
      } catch (error) {
        const isRetryable = error instanceof RetryableError;
        if (!isRetryable || attempts >= retries) {
          if (error instanceof RetryableError && error.retryCause instanceof Error) {
            throw error.retryCause;
          }
          throw error instanceof Error ? error : new Error(String(error));
        }

        attempts += 1;
        await delay(Math.min(delayMs, MAX_RETRY_DELAY_MS));
        delayMs *= 2;
      }
    }
  }
}

function collectMediaCandidates(raw: JsonRecord, videoRecord: JsonRecord | null): CandidateUrl[] {
  const candidates: CandidateUrl[] = [];
  const seen = new Set<string>();

  const pushCandidate = (kind: 'download' | 'playback', field: string, value: unknown) => {
    const urls = extractUrlCandidates(value)
      .map((entry) => normalizeHttpUrl(entry))
      .filter((entry): entry is string => Boolean(entry));

    for (const url of urls) {
      if (seen.has(url)) {
        continue;
      }

      seen.add(url);
      candidates.push({
        kind,
        field,
        url
      });
    }
  };

  pushCandidate('download', 'download_url', raw.download_url);
  pushCandidate('download', 'downloadUrl', raw.downloadUrl);

  if (videoRecord) {
    pushCandidate('download', 'video.downloadAddr', videoRecord.downloadAddr);
    pushCandidate('download', 'video.download_addr', videoRecord.download_addr);
    pushCandidate('download', 'video.downloadUrl', videoRecord.downloadUrl);
    pushCandidate(
      'download',
      'video.download.url_list',
      asRecord(videoRecord.download)?.url_list
    );

    const bitRateList = Array.isArray(videoRecord.bitRate)
      ? videoRecord.bitRate
      : Array.isArray(videoRecord.bit_rate)
        ? videoRecord.bit_rate
        : [];

    for (const bitRateEntry of bitRateList) {
      const entry = asRecord(bitRateEntry);
      if (!entry) {
        continue;
      }

      pushCandidate('playback', 'video.bitRate.PlayAddr', entry.PlayAddr ?? entry.playAddr ?? entry.play_addr);
      pushCandidate('playback', 'video.bitRate.UrlList', entry.UrlList ?? entry.urlList ?? entry.url_list);
    }
  }

  pushCandidate('playback', 'video_url', raw.video_url);
  pushCandidate('playback', 'videoUrl', raw.videoUrl);
  pushCandidate('playback', 'playbackUrl', raw.playbackUrl);
  pushCandidate('playback', 'play_url', raw.play_url);
  pushCandidate('playback', 'play', raw.play);

  if (videoRecord) {
    pushCandidate('playback', 'video.playAddr', videoRecord.playAddr);
    pushCandidate('playback', 'video.play_addr', videoRecord.play_addr);
    pushCandidate('playback', 'video.playUrl', videoRecord.playUrl);
    pushCandidate(
      'playback',
      'video.play.url_list',
      asRecord(videoRecord.play)?.url_list
    );
  }

  return candidates;
}

function extractUrlCandidates(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractUrlCandidates(entry, depth + 1));
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const nestedCandidates: unknown[] = [
    record.url,
    record.uri,
    record.href,
    record.src,
    record.play,
    record.PlayAddr,
    record.playAddr,
    record.play_addr,
    record.playUrl,
    record.downloadAddr,
    record.download_addr,
    record.downloadUrl,
    record.urlList,
    record.url_list,
    record.playUrlList,
    record.play_url_list,
    record.downloadUrlList,
    record.download_url_list
  ];

  return nestedCandidates.flatMap((entry) => extractUrlCandidates(entry, depth + 1));
}

function isLikelyMediaResponse(
  url: string,
  contentType?: string,
  contentRange?: string,
  contentDisposition?: string
): boolean {
  const normalizedContentType = (contentType ?? '').toLowerCase();

  if (normalizedContentType.startsWith('video/')) {
    return true;
  }

  if (normalizedContentType.includes('application/octet-stream')) {
    return true;
  }

  if (contentRange) {
    return true;
  }

  const normalizedDisposition = (contentDisposition ?? '').toLowerCase();
  if (/\.mp4|\.mov|\.m4v|\.webm/.test(normalizedDisposition)) {
    return true;
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return ['.mp4', '.mov', '.m4v', '.webm'].some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
}

function extractVideoArray(payload: JsonRecord): unknown[] | null {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.videos)) {
    return payload.videos;
  }

  if (Array.isArray(payload.itemList)) {
    return payload.itemList;
  }

  const nestedData = asRecord(payload.data);
  if (nestedData) {
    if (Array.isArray(nestedData.data)) {
      return nestedData.data;
    }
    if (Array.isArray(nestedData.videos)) {
      return nestedData.videos;
    }
    if (Array.isArray(nestedData.itemList)) {
      return nestedData.itemList;
    }
  }

  return null;
}

function incrementRejectReason(diagnostics: AdapterDiagnostics, reason: RejectReason) {
  diagnostics.rejectedByReason[reason] += 1;
  diagnostics.rejectedCount += 1;
}

function createRejectedByReasonCounter(): Record<RejectReason, number> {
  return {
    invalid_item_shape: 0,
    missing_video_id: 0,
    missing_epoch_time_posted: 0,
    missing_media_candidate: 0,
    duplicate_video_id: 0,
    no_retrievable_media_url: 0
  };
}

function createMediaValidationFailureCounter(): Record<MediaValidationFailureReason, number> {
  return {
    invalid_url: 0,
    http_status: 0,
    non_media_response: 0,
    timeout: 0,
    network_error: 0,
    unexpected_error: 0
  };
}

function normalizeEndpointPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return DEFAULT_ENDPOINT_PATH;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function sanitizeUsername(username: string): string {
  return username.trim().replace(/^@/, '');
}

function normalizeCookieHeader(cookies?: string): string | undefined {
  const value = cookies?.trim();
  return value ? value : undefined;
}

function normalizeEpochBoundary(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const epoch = parseEpochSeconds(value);
  if (epoch === null) {
    throw new TikTokServiceRequestError(`${fieldName} must be a valid unix epoch timestamp`);
  }

  return epoch;
}

function parseEpochSeconds(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) {
      return null;
    }
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return parseEpochSeconds(numeric);
    }

    const parsedDate = Date.parse(trimmed);
    if (!Number.isNaN(parsedDate)) {
      return Math.floor(parsedDate / 1000);
    }
  }

  return null;
}

function parseOptionalInteger(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, Math.floor(parsed));
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return undefined;
}

function normalizeHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedInput = value.trim().replace(/\\u0026/g, '&');
  if (!normalizedInput) {
    return undefined;
  }

  const withProtocol = normalizedInput.startsWith('//') ? `https:${normalizedInput}` : normalizedInput;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return null;
}

function readHeader(headers: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeInteger(value: string | number | undefined | null, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function safeReadText(body: { text: () => Promise<string> }): Promise<string> {
  try {
    return await body.text();
  } catch {
    return '';
  }
}

async function safeDrainBody(body: { arrayBuffer: () => Promise<ArrayBuffer> }): Promise<void> {
  try {
    await body.arrayBuffer();
  } catch {
    // Ignore drain failures while validating media URLs.
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|UND_ERR_CONNECT_TIMEOUT/i.test(error.message);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
