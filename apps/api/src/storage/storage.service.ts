import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('STORAGE_BUCKET') ?? '';

    const config: S3ClientConfig = {
      region: this.configService.get<string>('STORAGE_REGION'),
      endpoint: this.configService.get<string>('STORAGE_ENDPOINT') || undefined,
      forcePathStyle: this.configService.get<string>('STORAGE_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    };

    this.client = new S3Client(config);
  }

  async getUploadUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<string> {
    if (!this.bucket) {
      throw new Error('Storage bucket not configured');
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresIn ?? 900,
    });
  }

  async getDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    if (!this.bucket) {
      throw new Error('Storage bucket not configured');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObjectBytes(key: string): Promise<Uint8Array> {
    if (!this.bucket) {
      throw new Error('Storage bucket not configured');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    const chunks: Uint8Array[] = [];

    if (!response.Body) {
      return new Uint8Array();
    }

    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  public urlForKey(key: string) {
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.configService.get('STORAGE_REGION')}.amazonaws.com/${key}`;
  }
}
