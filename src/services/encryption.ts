/**
 * Encryption Service
 * 
 * Handles encryption/decryption of journal text.
 * 
 * PRIVACY RULES:
 * - Journal text is encrypted before storage
 * - Encryption keys are stored in Expo SecureStore (native) or AsyncStorage (web)
 * - Journal text is NEVER decrypted for analysis
 * - Only decrypted when user explicitly views their own entry
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENCRYPTION_KEY_PREFIX = 'encryption_key_';

/**
 * Generate a new encryption key
 * In production, use a proper encryption library like expo-crypto
 */
async function generateEncryptionKey(): Promise<string> {
  // For now, generate a simple key
  // In production, use proper cryptographic key generation
  const key = `key_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  return key;
}

/**
 * Get or create encryption key for user
 */
export async function getEncryptionKey(userId: string): Promise<string> {
  const keyId = `${ENCRYPTION_KEY_PREFIX}${userId}`;
  
  try {
    let key: string | null = null;
    
    if (Platform.OS === 'web') {
      key = await AsyncStorage.getItem(keyId);
    } else {
      key = await SecureStore.getItemAsync(keyId);
    }
    
    if (!key) {
      // Generate new key
      key = await generateEncryptionKey();
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(keyId, key);
      } else {
        await SecureStore.setItemAsync(keyId, key);
      }
    }
    
    return key;
  } catch (error) {
    console.error('Failed to get encryption key:', error);
    throw error;
  }
}

/**
 * Simple base64 encode (cross-platform)
 */
function base64Encode(str: string): string {
  if (Platform.OS === 'web') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  // For React Native, use a simple implementation
  // In production, use a proper base64 library or expo-crypto
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += i + 1 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    output += i + 2 < str.length ? chars.charAt(bitmap & 63) : '=';
  }
  return output;
}

/**
 * Simple base64 decode (cross-platform)
 */
function base64Decode(str: string): string {
  if (Platform.OS === 'web') {
    return decodeURIComponent(escape(atob(str)));
  }
  // For React Native, use a simple implementation
  // In production, use a proper base64 library or expo-crypto
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  for (let i = 0; i < str.length; i += 4) {
    const enc1 = chars.indexOf(str.charAt(i));
    const enc2 = chars.indexOf(str.charAt(i + 1));
    const enc3 = chars.indexOf(str.charAt(i + 2));
    const enc4 = chars.indexOf(str.charAt(i + 3));
    const bitmap = (enc1 << 18) | (enc2 << 12) | ((enc3 & 63) << 6) | (enc4 & 63);
    if (enc3 !== 64) output += String.fromCharCode((bitmap >> 16) & 255);
    if (enc4 !== 64) output += String.fromCharCode((bitmap >> 8) & 255);
    output += String.fromCharCode(bitmap & 255);
  }
  return output;
}

/**
 * Encrypt journal text
 * 
 * NOTE: This is a placeholder implementation.
 * In production, use proper encryption (AES-256-GCM) via expo-crypto or similar.
 */
export async function encryptJournalText(
  text: string,
  userId: string
): Promise<{ encrypted: string; keyId: string }> {
  const key = await getEncryptionKey(userId);
  const keyId = `${ENCRYPTION_KEY_PREFIX}${userId}`;
  
  // Placeholder: In production, use proper encryption
  // For now, base64 encode (NOT secure, just for structure)
  const encrypted = base64Encode(text);
  
  return { encrypted, keyId };
}

/**
 * Decrypt journal text
 * 
 * NOTE: Only call this when user explicitly views their own entry.
 * Never decrypt for analysis or insights.
 */
export async function decryptJournalText(
  encrypted: string,
  userId: string
): Promise<string> {
  const key = await getEncryptionKey(userId);
  
  // Placeholder: In production, use proper decryption
  // For now, base64 decode (NOT secure, just for structure)
  const decrypted = base64Decode(encrypted);
  
  return decrypted;
}
