import { ConfigService } from '@nestjs/config';
import { StorageService } from '../src/storage/storage.service';

// Mock @aws-sdk/client-s3
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'PutObject' })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'GetObject' })),
    __mockSend: mockSend,
  };
});

// Mock @aws-sdk/s3-request-presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/test'),
}));

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = new ConfigService({
      STORAGE_BUCKET: 'test-bucket',
      STORAGE_REGION: 'auto',
      STORAGE_ENDPOINT: 'https://r2.example.com',
      STORAGE_FORCE_PATH_STYLE: 'true',
      AWS_ACCESS_KEY_ID: 'test-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
    });
    service = new StorageService(config);
  });

  describe('getUploadUrl()', () => {
    it('generates presigned PUT URL with correct bucket and key', async () => {
      const url = await service.getUploadUrl({
        key: 'drivers/profile-1/photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(url).toBe('https://presigned-url.example.com/test');
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'drivers/profile-1/photo.jpg',
        }),
      );
    });

    it('includes ContentType in PutObjectCommand', async () => {
      await service.getUploadUrl({
        key: 'test/file.pdf',
        contentType: 'application/pdf',
      });

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ContentType: 'application/pdf',
        }),
      );
    });

    it('defaults expiresIn to 900 seconds', async () => {
      await service.getUploadUrl({
        key: 'test/file.jpg',
        contentType: 'image/jpeg',
      });

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 },
      );
    });
  });

  describe('getDownloadUrl()', () => {
    it('generates presigned GET URL with custom expiry', async () => {
      const url = await service.getDownloadUrl('test/file.jpg', 3600);

      expect(url).toBe('https://presigned-url.example.com/test');
      expect(GetObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'test/file.jpg',
        }),
      );
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });
  });

  describe('getObjectBytes()', () => {
    it('fetches object and returns Uint8Array buffer', async () => {
      const { __mockSend } = require('@aws-sdk/client-s3');
      const testData = Buffer.from('test-image-data');
      __mockSend.mockResolvedValue({
        Body: (async function* () {
          yield testData;
        })(),
      });

      const result = await service.getObjectBytes('test/file.jpg');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(result).toString()).toBe('test-image-data');
      expect(GetObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'test/file.jpg',
        }),
      );
    });
  });
});
