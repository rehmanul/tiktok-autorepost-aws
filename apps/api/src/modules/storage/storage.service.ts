import { PutObjectCommand, S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface UploadParams {
  bucket?: string;
  keyPrefix?: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;

  constructor() {
    const region = process.env.S3_REGION ?? 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    this.bucket = process.env.S3_BUCKET ?? 'autorepost-media';

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: process.env.S3_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
          }
        : undefined
    });
  }

  async upload(params: UploadParams): Promise<{ bucket: string; key: string }> {
    const bucket = params.bucket ?? this.bucket;
    const key = `${params.keyPrefix ?? ''}${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata
    });

    try {
      await this.client.send(command);
      return { bucket, key };
    } catch (error) {
      this.logger.error('Failed to upload object to S3', error as Error);
      if (error instanceof S3ServiceException) {
        throw new InternalServerErrorException(
          `Object storage error (${error.$metadata.httpStatusCode ?? 'unknown'})`
        );
      }
      throw new InternalServerErrorException('Object storage error');
    }
  }
}
