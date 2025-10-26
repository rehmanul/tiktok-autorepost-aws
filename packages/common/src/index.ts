import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const SERVICE_NAME = 'autorepost-dash';

export const QUEUES = {
  TIKTOK_MONITORING: 'tiktok-monitoring',
  REPOST_DISPATCH: 'repost-dispatch',
  TOKEN_REFRESH: 'token-refresh'
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export function assertDefined<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
}

export interface TokenCipher {
  encrypt(value: string): string;
  decrypt(payload: string): string;
}

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function createTokenCipher(base64Key: string): TokenCipher {
  if (!base64Key) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be provided to encrypt/decrypt OAuth tokens');
  }

  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be a base64-encoded ${KEY_LENGTH}-byte buffer; received ${key.length} bytes`
    );
  }

  return {
    encrypt(value: string): string {
      const iv = cryptoRandomBytes(IV_LENGTH);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
    },
    decrypt(payload: string): string {
      const buffer = Buffer.from(payload, 'base64');
      if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Encrypted payload is too short');
      }
      const iv = buffer.subarray(0, IV_LENGTH);
      const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf8');
    }
  };
}

function cryptoRandomBytes(size: number): Buffer {
  return randomBytes(size);
}
