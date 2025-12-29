import AsyncStorage from '@react-native-async-storage/async-storage';
import { dumpToLocalFile } from '../storage/fileStorage';
import * as Application from 'expo-application';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const AUTH_TOKEN_ENV = process.env.EXPO_PUBLIC_API_TOKEN || '';
const PROFILE_ID_ENV = process.env.EXPO_PUBLIC_PATIENT_PROFILE_ID || '';
const DEVICE_ID_ENV = process.env.EXPO_PUBLIC_DEVICE_ID || '';

async function getStoredValue(key: string, fallback: string) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value || fallback;
  } catch (_err) {
    return fallback;
  }
}

async function getAuthToken() {
  return getStoredValue('healthSyncAuthToken', AUTH_TOKEN_ENV);
}

async function getPatientProfileId() {
  return getStoredValue('healthSyncPatientProfileId', PROFILE_ID_ENV);
}

async function getDeviceId() {
  // Try to get from storage first
  const storedDeviceId = await getStoredValue('healthSyncDeviceId', '');
  if (storedDeviceId) {
    return storedDeviceId;
  }

  // If not in storage, get from device and store it
  let deviceId: string | null = null;

  if (Application.getIosIdForVendorAsync) {
    deviceId = await Application.getIosIdForVendorAsync();
  } else if (Application.getAndroidId) {
    deviceId = Application.getAndroidId();
  }

  // Fall back to env variable if device ID couldn't be retrieved
  const finalDeviceId = deviceId || DEVICE_ID_ENV;

  // Store it for future use
  if (finalDeviceId) {
    try {
      await AsyncStorage.setItem('healthSyncDeviceId', finalDeviceId);
    } catch (err) {
      console.log('[sync] failed to store device ID:', err);
    }
  }

  return finalDeviceId;
}

export async function pushVitals(payload: any): Promise<boolean> {
  try {
    const authToken = await getAuthToken();
    const patientProfileId = payload.patientProfileId || await getPatientProfileId();
    const deviceId = payload.deviceId || await getDeviceId();

    if (!authToken || !patientProfileId) {
      console.log('[sync] missing auth token or patientProfileId; skipping server sync');
      return false;
    }

    const body = {
      ...payload,
      patientProfileId,
      deviceId,
    };

    const res = await fetch(`${BASE_URL}/api/vitals/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return true;
    }

    const errorBody = await res.text().catch(() => '');
    console.log('[sync] server unavailable, saving to local file fallback', res.status, errorBody);
    await dumpToLocalFile(body);
    return false;
  } catch (err) {
    console.log('[sync] network error, saving to local file fallback');
    await dumpToLocalFile(payload);
    return false;
  }
}