import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    if (projectId) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
            privateKey: this.configService
              .get<string>('FIREBASE_PRIVATE_KEY', '')
              .replace(/\\n/g, '\n'),
          }),
        });
        this.initialized = true;
        this.logger.log('Firebase Admin SDK initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK', error);
      }
    } else {
      this.logger.warn(
        'FIREBASE_PROJECT_ID not set — Firebase phone auth disabled',
      );
    }
  }

  async verifyIdToken(
    idToken: string,
  ): Promise<{ phoneNumber: string; uid: string }> {
    if (!this.initialized) {
      throw new UnauthorizedException(
        'Firebase is not configured on this server',
      );
    }

    try {
      const startTime = Date.now();
      this.logger.log('[PERF] Firebase Admin SDK verifyIdToken START');

      const decoded = await admin.auth().verifyIdToken(idToken);

      this.logger.log(
        `[PERF] Firebase Admin SDK verifyIdToken took ${Date.now() - startTime}ms`,
      );

      if (!decoded.phone_number) {
        throw new UnauthorizedException(
          'Firebase token does not contain a phone number',
        );
      }
      return { phoneNumber: decoded.phone_number, uid: decoded.uid };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Firebase token verification failed', error);
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
