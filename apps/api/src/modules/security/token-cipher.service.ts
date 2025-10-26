import { Injectable } from '@nestjs/common';
import { createTokenCipher, TokenCipher } from '@autorepost/common';

@Injectable()
export class TokenCipherService {
  private readonly cipher: TokenCipher;

  constructor() {
    const base64Key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!base64Key) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be set to encrypt OAuth tokens');
    }

    this.cipher = createTokenCipher(base64Key);
  }

  encrypt(value: string): string {
    return this.cipher.encrypt(value);
  }

  decrypt(payload: string): string {
    return this.cipher.decrypt(payload);
  }
}
