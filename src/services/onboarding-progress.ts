import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `onboarding_complete_${userId}`;

export async function markOnboardingCompleteLocal(userId: string): Promise<void> {
  await AsyncStorage.setItem(key(userId), new Date().toISOString());
}

export async function isOnboardingCompleteLocal(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(key(userId));
  return Boolean(v);
}

export async function clearOnboardingCompleteLocal(userId: string): Promise<void> {
  await AsyncStorage.removeItem(key(userId));
}
