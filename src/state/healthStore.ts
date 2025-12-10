import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PermissionResult,
  requestPlatformPermissions,
  syncVitalsRange,
  VitalMetrics,
} from '../health/healthService';
import type {RangeKey} from '../health/rangeUtils';

export type DailyRow = {
  date: string;
  steps?: number;
  calories?: number;
  distanceKm?: number;
  sleepMinutes?: number;
  activeMinutes?: number;
  averageHeartRate?: number;
  weightKg?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodGlucoseMgPerDl?: number;
  bodyTemperatureC?: number;
  oxygenSaturationPercent?: number;
  respiratoryRate?: number;
};

type HealthState = {
  permissionResult: PermissionResult | null;
  metrics: VitalMetrics | null;
  daily: DailyRow[];
  syncing: boolean;
  error: string | null;
  initialSynced: boolean;
  requestPermissions: () => Promise<void>;
  syncRange: (rangeKey: RangeKey, customStart?: string, customEnd?: string) => Promise<void>;
  setError: (v: string | null) => void;
  setInitialSynced: (v: boolean) => void;
};

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      permissionResult: null,
      metrics: null,
      daily: [],
      syncing: false,
      error: null,
      initialSynced: false,
      setError: v => set({error: v}),
      setInitialSynced: v => set({initialSynced: v}),
      requestPermissions: async () => {
        try {
          const result = await requestPlatformPermissions();
          set({permissionResult: result});
          if (!result.granted) {
            set({error: 'Health permissions are required to sync vitals.'});
          } else {
            set({error: null});
          }
        } catch (err) {
          set({error: 'Permission request failed. Check device availability.'});
        }
      },
      syncRange: async (rangeKey, customStart, customEnd) => {
        const {syncing} = get();
        if (syncing) return;
        set({syncing: true, error: null});
        try {
          let {permissionResult} = get();
          if (!permissionResult?.granted) {
            await get().requestPermissions();
            permissionResult = get().permissionResult;
          }

          const {computeRange} = await import('../health/rangeUtils');
          const {start, end} = computeRange(rangeKey, customStart, customEnd);
          const result = await syncVitalsRange(start, end);
          console.log('[ui] sync latest success', {
            rangeKey,
            start,
            end,
            summary: result.summary,
            dailyCount: result.daily.length,
          });
          set({
            metrics: result.summary,
            daily: result.daily.map(d => ({
              date: d.date,
              steps: d.steps,
              calories: d.calories,
              distanceKm: d.distanceKm,
              sleepMinutes: d.sleepMinutes,
              activeMinutes: d.activeMinutes,
              averageHeartRate: d.averageHeartRate,
              weightKg: d.weightKg,
              bloodPressureSystolic: d.bloodPressureSystolic,
              bloodPressureDiastolic: d.bloodPressureDiastolic,
              bloodGlucoseMgPerDl: d.bloodGlucoseMgPerDl,
              bodyTemperatureC: d.bodyTemperatureC,
              oxygenSaturationPercent: d.oxygenSaturationPercent,
              respiratoryRate: d.respiratoryRate,
            })),
          });
        } catch (err) {
          console.log('[ui] sync latest failed', err);
          set({error: 'Sync failed. Ensure permissions are granted and try again.'});
        } finally {
          set({syncing: false});
        }
      },
    }),
    {
      name: 'health-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        permissionResult: state.permissionResult,
        // Do not persist metrics/daily to avoid stale data after range changes
      }),
    },
  ),
);
