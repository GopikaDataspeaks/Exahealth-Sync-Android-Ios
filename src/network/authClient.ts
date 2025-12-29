import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

type AuthResponse = {
  token: string;
  accountId: string;
  profileId: string | null;
};

async function saveAuth(response: AuthResponse) {
  await AsyncStorage.setItem('healthSyncAuthToken', response.token);
  await AsyncStorage.setItem('healthSyncAccountId', response.accountId);
  if (response.profileId) {
    await AsyncStorage.setItem('healthSyncPatientProfileId', response.profileId);
  }
}

export async function sendOtp(phoneNumber: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to send OTP');
  }
  return res.json();
}

export async function verifyOtp(phoneNumber: string, otp: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, otp }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'OTP verification failed');
  }
  const payload = (await res.json()) as AuthResponse;
  await saveAuth(payload);
  return payload;
}

export async function emailLogin(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/auth/email-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Email login failed');
  }
  const payload = (await res.json()) as AuthResponse;
  await saveAuth(payload);
  return payload;
}

export async function clearAuth() {
  await AsyncStorage.multiRemove([
    'healthSyncAuthToken',
    'healthSyncAccountId',
    'healthSyncPatientProfileId',
  ]);
}
