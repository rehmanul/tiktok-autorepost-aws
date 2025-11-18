import { TikTokClient, TikTokFeedRequest, TikTokFeedResponse } from './types';
export interface TikTokHttpClientOptions {
    userAgent?: string;
    timeoutMs?: number;
    maxRetries?: number;
    defaultCookies?: string;
}
export declare class TikTokHttpClient implements TikTokClient {
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly userAgent;
    private readonly defaultCookies?;
    constructor(options?: TikTokHttpClientOptions);
    fetchUserFeed(request: TikTokFeedRequest): Promise<TikTokFeedResponse>;
    private fetchUserProfile;
    private fetchItemList;
    private normalizeVideo;
    private buildHeaders;
    private buildCookieHeader;
    private requestJson;
}
//# sourceMappingURL=http-client.d.ts.map