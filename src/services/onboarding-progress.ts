import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `onboarding_complete_${userId}`;

export async function markOnboardingCompleteLocal(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), new Date().toISOString());
  } catch (err) {
    console.warn('[Onboarding] Local cache write failed:', err);
  }
}

export async function isOnboardingCompleteLocal(userId: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(key(userId));
    return Boolean(v);
  } catch (err) {
    console.warn('[Onboarding] Local cache read failed:', err);
    return false;
  }
}

export async function clearOnboardingCompleteLocal(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}
