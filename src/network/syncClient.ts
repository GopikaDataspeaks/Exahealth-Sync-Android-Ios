import { dumpToLocalFile } from '../storage/fileStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function pushVitals(payload: any): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return true;
    }

    console.log('[sync] server unavailable, saving to local file fallback', res.status);
    return await dumpToLocalFile(payload);
  } catch (err) {
    console.log('[sync] network error, saving to local file fallback');
    return await dumpToLocalFile(payload);
  }
}
