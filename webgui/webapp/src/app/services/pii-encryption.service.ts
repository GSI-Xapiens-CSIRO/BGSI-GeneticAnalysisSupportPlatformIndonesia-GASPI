import { Injectable } from '@angular/core';
import { Auth, Hub } from 'aws-amplify';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

export interface PIIKeys {
  primary_key: string;
  secondary_key: string;
  salt: string;
  version: string;
}

@Injectable({
  providedIn: 'root',
})
export class PIIEncryptionService {
  private cachedSecret: PIIKeys | null = null;
  private secretsClient: SecretsManagerClient | null = null;
  private secretName: string;
  private region: string;

  constructor() {
    // Set from environment or configuration
    this.secretName = environment.pii_encryption_secret_name;
    this.region = environment.auth.region;
  }

  /**
   * Create Secrets Manager client with credentials from Amplify
   */
  private async getSecretsClient(): Promise<SecretsManagerClient> {
    if (this.secretsClient) {
      return this.secretsClient;
    }

    try {
      const creds = await Auth.currentCredentials();

      if (!creds) {
        throw new Error('No valid AWS credentials found');
      }

      this.secretsClient = new SecretsManagerClient({
        region: this.region,
        credentials: {
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
          sessionToken: creds.sessionToken,
        },
      });

      return this.secretsClient;
    } catch (error) {
      throw new Error('Failed to create AWS client');
    }
  }

  /**
   * Fetch encryption keys directly from AWS Secrets Manager
   */
  private async getPIIKeys(): Promise<PIIKeys> {
    if (this.cachedSecret) {
      return this.cachedSecret;
    }

    try {
      const client = await this.getSecretsClient();

      const command = new GetSecretValueCommand({
        SecretId: this.secretName,
      });

      const response = await client.send(command);

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secretData = JSON.parse(response.SecretString);

      // Decode base64 to get hex string
      const hexPrimary = atob(secretData.primary_key);
      const hexSecondary = atob(secretData.secondary_key);
      const hexSalt = atob(secretData.salt);

      this.cachedSecret = {
        primary_key: hexPrimary,
        secondary_key: hexSecondary,
        salt: hexSalt,
        version: secretData.version,
      };

      console.log(
        'Fetched PII keys from AWS Secrets Manager:',
        this.cachedSecret,
      );

      return this.cachedSecret;
    } catch (error) {
      console.error('Error fetching secret from AWS:', error);
      throw error;
    }
  }

  /**
   * Decrypt PII payload
   */
  async decryptPIIPayload(encryptedData: string): Promise<any> {
    if (!encryptedData) {
      throw new Error('No encrypted PII data provided');
    }

    const keys = await this.getPIIKeys();

    try {
      return this.decryptWithKey(encryptedData, keys.primary_key);
    } catch (primaryError) {
      try {
        return this.decryptWithKey(encryptedData, keys.secondary_key);
      } catch (secondaryError) {
        throw new Error(
          'PII decryption failed with both keys - data may be corrupted or keys rotated',
        );
      }
    }
  }

  /**
   * Decrypt with specific key
   */
  private decryptWithKey(encryptedData: string, keyHex: string): any {
    try {
      // Convert hex key to WordArray
      const key = CryptoJS.enc.Hex.parse(keyHex);

      // Decode base64
      const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);

      // Extract IV (first 16 bytes) and content
      const iv = CryptoJS.lib.WordArray.create(
        encryptedBytes.words.slice(0, 4),
      );
      const encryptedContent = CryptoJS.lib.WordArray.create(
        encryptedBytes.words.slice(4),
        encryptedBytes.sigBytes - 16,
      );
      debugger;
      if (iv.sigBytes !== 16) {
        throw new Error('Invalid IV length');
      }

      // Decrypt using AES-CBC
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encryptedContent } as any,
        key,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        },
      );

      // Convert back to JSON
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Encrypt PII data
   */
  async encryptPIIData(
    piiData: any,
    useSecondary: boolean = false,
  ): Promise<string> {
    const keys = await this.getPIIKeys();
    const keyHex = useSecondary ? keys.secondary_key : keys.primary_key;

    // Convert hex key to WordArray
    const key = CryptoJS.enc.Hex.parse(keyHex);

    // Convert to JSON string
    const jsonString = JSON.stringify(piiData);

    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt using AES-CBC
    const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Combine IV + encrypted content
    const combined = iv.clone();
    combined.concat(encrypted.ciphertext);

    // Encode to base64
    return CryptoJS.enc.Base64.stringify(combined);
  }

  /**
   * Clear cached secrets (useful for key rotation)
   */
  clearCache(): void {
    this.cachedSecret = null;
    this.secretsClient = null;
  }
}
