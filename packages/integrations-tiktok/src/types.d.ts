export interface TikTokVideo {
    videoId: string;
    url: string;
    description: string;
    epochTimePosted: number;
    likes?: number;
    views?: number;
    comments?: number;
    shares?: number;
    downloadUrl?: string;
    playbackUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
}
export interface TikTokFeedRequest {
    username: string;
    page?: number;
    perPage?: number;
    startEpoch?: number;
    endEpoch?: number;
    cookies?: string;
}
export interface TikTokFeedResponse {
    meta: Record<string, unknown>;
    videos: TikTokVideo[];
}
export interface TikTokClient {
    fetchUserFeed(request: TikTokFeedRequest): Promise<TikTokFeedResponse>;
}
//# sourceMappingURL=types.d.ts.map