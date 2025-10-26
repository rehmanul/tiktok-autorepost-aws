import { request as undiciRequest } from 'undici';
import pRetry, { AbortError, FailedAttemptError } from 'p-retry';
import { TikTokClient, TikTokFeedRequest, TikTokFeedResponse, TikTokVideo } from './types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT_MS = normalizeInteger(process.env.HTTP_FETCH_TIMEOUT_MS, 12_000);
const DEFAULT_MAX_RETRIES = Math.max(normalizeInteger(process.env.HTTP_MAX_RETRIES, 3), 1);
const DEFAULT_PAGE_SIZE = clampInteger(normalizeInteger(process.env.TIKTOK_ITEM_LIST_PAGE_SIZE, 30), 1, 35);
const DEFAULT_MAX_PAGES = Math.max(normalizeInteger(process.env.TIKTOK_ITEM_LIST_MAX_PAGES, 40), 1);
const DEFAULT_BUFFER_PAGES = Math.max(normalizeInteger(process.env.TIKTOK_ITEM_LIST_BUFFER_PAGES, 2), 0);

export interface TikTokHttpClientOptions {
  userAgent?: string;
  timeoutMs?: number;
  maxRetries?: number;
  defaultCookies?: string;
}

interface ItemListResult {
  items: any[];
  hasMore: boolean;
  cursor: string | null;
}

export class TikTokHttpClient implements TikTokClient {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly userAgent: string;
  private readonly defaultCookies?: string;

  constructor(options: TikTokHttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.defaultCookies = options.defaultCookies ?? resolveCookieFromEnv();
  }

  async fetchUserFeed(request: TikTokFeedRequest): Promise<TikTokFeedResponse> {
    const username = request.username.trim();
    if (!username) {
      throw new Error('TikTok username is required');
    }

    const page = request.page && request.page > 0 ? request.page : 1;
    const perPage = request.perPage && request.perPage > 0 ? request.perPage : DEFAULT_PAGE_SIZE;
    const targetItems = page * perPage + DEFAULT_BUFFER_PAGES * perPage;

    const cookies = this.buildCookieHeader(request.cookies);

    const profile = await this.fetchUserProfile(username, cookies);
    if (!profile?.secUid) {
      throw new Error(`Unable to resolve TikTok account metadata for @${username}`);
    }

    const aggregate: any[] = [];
    const seen = new Set<string>();
    let cursor: string | null = '0';
    let iterations = 0;

    while (iterations < DEFAULT_MAX_PAGES && aggregate.length < targetItems && cursor) {
      const result = await this.fetchItemList(
        {
          secUid: profile.secUid,
          userId: profile.userId,
          uniqueId: profile.uniqueId,
          cursor,
          count: clampInteger(perPage, 1, 100)
        },
        cookies
      );

      for (const item of result.items) {
        const identifier = normalizeVideoId(item);
        if (!identifier || seen.has(identifier)) {
          continue;
        }
        seen.add(identifier);
        aggregate.push(item);
      }

      cursor = result.hasMore ? result.cursor : null;
      iterations += 1;
    }

    const filtered = aggregate
      .map((item) => this.normalizeVideo(item, username))
      .filter((video): video is TikTokVideo => Boolean(video));

    const constrained = filtered.filter((video) => {
      if (typeof request.startEpoch === 'number' && video.epochTimePosted < request.startEpoch) {
        return false;
      }
      if (typeof request.endEpoch === 'number' && video.epochTimePosted > request.endEpoch) {
        return false;
      }
      return true;
    });

    constrained.sort((a, b) => b.epochTimePosted - a.epochTimePosted);

    const totalPosts = constrained.length;
    const startIndex = (page - 1) * perPage;
    const videos = constrained.slice(startIndex, startIndex + perPage);

    return {
      meta: {
        username,
        page,
        perPage,
        totalPosts,
        fetchedBatches: iterations,
        profile
      },
      videos
    };
  }

  private async fetchUserProfile(username: string, cookies?: string) {
    const searchParams = new URLSearchParams({
      aid: '1988',
      uniqueId: username
    });

    const response = await this.requestJson(`https://www.tiktok.com/api/user/detail/?${searchParams.toString()}`, {
      headers: this.buildHeaders(cookies)
    });

    const user = response?.user || response?.userInfo?.user;
    if (!user) {
      return null;
    }

    return {
      secUid: user.secUid ?? user.sec_uid ?? null,
      userId: user.id ?? user.userId ?? user.user_id ?? null,
      avatarThumb: user.avatarThumb,
      followerCount: user.followerCount,
      uniqueId: user.uniqueId ?? user.unique_id ?? username
    };
  }

  private async fetchItemList(
    params: {
      secUid: string;
      userId: string;
      uniqueId: string;
      cursor: string;
      count: number;
    },
    cookies?: string
  ): Promise<ItemListResult> {
    const searchParams = new URLSearchParams({
      aid: '1988',
      secUid: params.secUid,
      userId: params.userId,
      uniqueId: params.uniqueId,
      cursor: params.cursor,
      count: params.count.toString()
    });
    searchParams.set('cookie_enabled', 'true');
    searchParams.set('device_platform', 'web_pc');

    const payload = await this.requestJson(
      `https://www.tiktok.com/api/post/item_list/?${searchParams.toString()}`,
      {
        headers: this.buildHeaders(cookies)
      }
    );

    const itemList = Array.isArray(payload?.itemList) ? payload.itemList : [];
    return {
      items: itemList,
      hasMore: Boolean(payload?.hasMore),
      cursor: payload?.cursor ?? null
    };
  }

  private normalizeVideo(raw: any, username: string): TikTokVideo | null {
    const videoId = normalizeVideoId(raw);
    if (!videoId) {
      return null;
    }

    const stats = raw?.stats || raw?.statistics || {};
    const video = raw?.video || {};

    const createTime =
      typeof raw?.createTime === 'number'
        ? raw.createTime
        : typeof raw?.create_time === 'number'
          ? raw.create_time
          : typeof raw?.create_time_ms === 'number'
            ? Math.floor(raw.create_time_ms / 1000)
            : null;

    const duration =
      typeof video?.duration === 'number'
        ? video.duration
        : typeof video?.durationSecond === 'number'
          ? video.durationSecond
          : undefined;

    return {
      videoId,
      url: `https://www.tiktok.com/@${username}/video/${videoId}`,
      description: raw?.desc ?? raw?.description ?? '',
      epochTimePosted: createTime ?? 0,
      likes: stats.diggCount ?? stats.digg_count,
      views: stats.playCount ?? stats.play_count,
      comments: stats.commentCount ?? stats.comment_count,
      shares: stats.shareCount ?? stats.share_count,
      downloadUrl:
        video?.downloadAddr ??
        video?.download_addr ??
        video?.bitRate?.find?.((entry: any) => entry?.PlayAddr)?.PlayAddr ??
        undefined,
      playbackUrl: video?.playAddr ?? video?.play_addr ?? undefined,
      thumbnailUrl: video?.cover ?? video?.coverUrl ?? video?.dynamicCover ?? undefined,
      durationSeconds: duration
    };
  }

  private buildHeaders(cookies?: string) {
    const headers: Record<string, string> = {
      'user-agent': this.userAgent,
      accept: 'application/json, text/plain, */*',
      'sec-ch-ua-platform': '"Windows"'
    };

    const normalizedCookie = this.buildCookieHeader(cookies);
    if (normalizedCookie) {
      headers.cookie = normalizedCookie;
    }

    return headers;
  }

  private buildCookieHeader(cookies?: string) {
    const parts: string[] = [];

    if (this.defaultCookies) {
      parts.push(this.defaultCookies.trim());
    }

    if (cookies && cookies.trim()) {
      parts.push(cookies.trim());
    }

    const sessionId = process.env.TIKTOK_SESSION_ID;
    if (sessionId && !parts.some((part) => part.includes('sessionid='))) {
      parts.push(`sessionid=${sessionId.trim()}`);
    }

    const webId = process.env.TIKTOK_WEBID;
    if (webId && !parts.some((part) => part.includes('tt_webid='))) {
      parts.push(`tt_webid=${webId.trim()}`);
    }

    const joined = parts.join('; ').trim();
    return joined.length ? joined : undefined;
  }

  private async requestJson(url: string, options: { headers?: Record<string, string> }): Promise<any> {
    const attempt = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await undiciRequest(url, {
          method: 'GET',
          headers: options.headers,
          signal: controller.signal
        });

        if (response.statusCode === 204) {
          return null;
        }

        if (response.statusCode === 429) {
          throw new RetryableError('TikTok returned HTTP 429 Too Many Requests');
        }

        if (response.statusCode >= 500) {
          throw new RetryableError(`TikTok returned ${response.statusCode}`);
        }

        if (response.statusCode >= 400) {
          throw new Error(`TikTok request failed with status ${response.statusCode}`);
        }

        const payload = await response.body.json();
        return payload;
      } catch (error) {
        if (error instanceof RetryableError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new RetryableError('TikTok request timed out');
        }
        if (error instanceof Error && /ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(error.message)) {
          throw new RetryableError(error.message);
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    };

    return pRetry(attempt, {
      retries: this.maxRetries,
      factor: 2,
      minTimeout: 500,
      maxTimeout: 5_000,
      onFailedAttempt: (error: FailedAttemptError) => {
        if (!(error instanceof AbortError)) {
          console.warn(`TikTok request attempt ${error.attemptNumber} failed: ${error.message}`);
        }
      }
    });
  }
}

class RetryableError extends Error {}

function normalizeVideoId(item: any): string | null {
  return (
    item?.id ??
    item?.aweme_id ??
    item?.awemeId ??
    item?.itemId ??
    item?.video?.id ??
    item?.awemeInfo?.awemeId ??
    null
  );
}

function normalizeInteger(value: string | number | undefined | null, fallback: number) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveCookieFromEnv() {
  if (process.env.TIKTOK_COOKIE && process.env.TIKTOK_COOKIE.trim()) {
    return process.env.TIKTOK_COOKIE.trim();
  }
  return undefined;
}
