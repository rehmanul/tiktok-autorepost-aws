export declare const SERVICE_NAME = "autorepost-dash";
export declare const QUEUES: {
    readonly TIKTOK_MONITORING: "tiktok-monitoring";
    readonly REPOST_DISPATCH: "repost-dispatch";
    readonly TOKEN_REFRESH: "token-refresh";
};
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export declare function assertDefined<T>(value: T | undefined | null, message: string): T;
export interface TokenCipher {
    encrypt(value: string): string;
    decrypt(payload: string): string;
}
export declare function createTokenCipher(base64Key: string): TokenCipher;
//# sourceMappingURL=index.d.ts.map