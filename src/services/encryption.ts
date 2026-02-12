/** Journal text encryption/decryption. Keys in SecureStore (native) or AsyncStorage (web). */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENCRYPTION_KEY_PREFIX = 'encryption_key_';

async function generateEncryptionKey(): Promise<string> {
  return `key_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

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

function base64Encode(str: string): string {
  if (Platform.OS === 'web') {
    return btoa(unescape(encodeURIComponent(str)));
  }
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

function base64Decode(str: string): string {
  if (Platform.OS === 'web') {
    return decodeURIComponent(escape(atob(str)));
  }
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

export async function encryptJournalText(
  text: string,
  userId: string
): Promise<{ encrypted: string; keyId: string }> {
  await getEncryptionKey(userId);
  const keyId = `${ENCRYPTION_KEY_PREFIX}${userId}`;
  return { encrypted: base64Encode(text), keyId };
}

export async function decryptJournalText(encrypted: string, userId: string): Promise<string> {
  if (encrypted == null || String(encrypted).trim() === '') return '';
  await getEncryptionKey(userId);
  try {
    return base64Decode(String(encrypted));
  } catch {
    return '';
  }
}
