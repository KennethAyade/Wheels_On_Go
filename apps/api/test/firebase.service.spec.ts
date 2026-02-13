import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../src/auth/firebase.service';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
  };
  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn().mockReturnValue({}),
    },
    auth: jest.fn(() => mockAuth),
  };
});

describe('FirebaseService', () => {
  describe('when Firebase is configured', () => {
    let service: FirebaseService;

    beforeEach(() => {
      jest.clearAllMocks();
      const config = new ConfigService({
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_CLIENT_EMAIL: 'test@test.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nMOCK\\n-----END PRIVATE KEY-----',
      });
      service = new FirebaseService(config);
    });

    it('initializes Firebase Admin SDK', () => {
      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it('verifies a valid ID token and returns phone number', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({
        uid: 'firebase-uid-1',
        phone_number: '+639171234567',
      });

      const result = await service.verifyIdToken('valid-token');

      expect(result.phoneNumber).toBe('+639171234567');
      expect(result.uid).toBe('firebase-uid-1');
    });

    it('throws UnauthorizedException when token has no phone number', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({
        uid: 'firebase-uid-2',
        // no phone_number
      });

      await expect(service.verifyIdToken('token-no-phone')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token verification fails', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockRejectedValue(
        new Error('Token expired'),
      );

      await expect(service.verifyIdToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('when Firebase is NOT configured', () => {
    let service: FirebaseService;

    beforeEach(() => {
      jest.clearAllMocks();
      const config = new ConfigService({
        // No FIREBASE_PROJECT_ID
      });
      service = new FirebaseService(config);
    });

    it('does not initialize Firebase Admin SDK', () => {
      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when trying to verify token', async () => {
      await expect(service.verifyIdToken('any-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
