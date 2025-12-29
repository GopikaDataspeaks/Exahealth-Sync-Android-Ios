import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import {
  aggregateRecord,
  aggregateGroupByDuration,
  type AggregationGroupResult,
  type AggregateResultRecordType,
  type TimeRangeFilter,
  readRecords,
  getSdkStatus,
  getGrantedPermissions,
  initialize,
  requestPermission as requestHealthConnectPermission,
  SdkAvailabilityStatus,
  type Permission as HealthConnectPermission,
} from 'react-native-health-connect';

type SupportedPlatform = 'android' | 'ios';

export type VitalMetrics = {
  platform: SupportedPlatform;
  steps?: number;
  averageHeartRate?: number;
  calories?: number;
  distanceKm?: number;
  sleepMinutes?: number;
  activeMinutes?: number;
  weightKg?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodGlucoseMgPerDl?: number;
  bodyTemperatureC?: number;
  oxygenSaturationPercent?: number;
  respiratoryRate?: number;
};

export type PermissionResult = {
  granted: boolean;
  platform: SupportedPlatform;
  details: string[];
  grantedPermissions?: HealthConnectPermission[];
};

export type DailyMetrics = {
  date: string; // yyyy-mm-dd
  steps?: number;
  averageHeartRate?: number;
  calories?: number;
  distanceKm?: number;
  sleepMinutes?: number;
   sleepAwakeMinutes?: number;
   sleepRemMinutes?: number;
   sleepCoreMinutes?: number;
   sleepDeepMinutes?: number;
  activeMinutes?: number;
  weightKg?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
   minSystolic?: number;
   maxSystolic?: number;
   minDiastolic?: number;
   maxDiastolic?: number;
   minHeartRate?: number;
   maxHeartRate?: number;
  bloodGlucoseMgPerDl?: number;
  bodyTemperatureC?: number;
  oxygenSaturationPercent?: number;
  respiratoryRate?: number;
};

export type HourlyMetric = {
  date: string; // yyyy-mm-dd
  hour: number; // 0-23
  metricType: string;
  value: number;
  unit?: string;
  source?: string;
};

export type SleepSession = {
  startTime: string;
  endTime: string;
  stage?: string;
  durationMinutes?: number;
  source?: string;
};

export type VitalsRangeResult = {
  platform: SupportedPlatform;
  summary: VitalMetrics;
  daily: DailyMetrics[];
  hourly?: HourlyMetric[];
  sleepSessions?: SleepSession[];
};

const DAY_RANGE_HOURS = 24;

const healthConnectPermissions: HealthConnectPermission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'write', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BloodPressure' },
  { accessType: 'read', recordType: 'BloodGlucose' },
  { accessType: 'read', recordType: 'BodyTemperature' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'RespiratoryRate' },
];

// Reads we need to collect metrics; write permissions are optional.
const requiredHealthConnectReads: HealthConnectPermission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
];

function permissionKey(permission: HealthConnectPermission) {
  return `${permission.recordType}:${permission.accessType}`;
}

async function ensureHealthConnectPermissions(): Promise<PermissionResult> {
  const sdkStatus = await getSdkStatus();
  console.log('[health] Health Connect sdkStatus', sdkStatus);
  if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return {
      granted: false,
      platform: 'android',
      details: [
        'Health Connect is not available or needs an update. Install or update Health Connect from Google Play.',
      ],
    };
  }

  await initialize();
  console.log('[health] Health Connect initialized');

  const alreadyGranted = await getGrantedPermissions();
  const missing = healthConnectPermissions.filter(
    permission =>
      !alreadyGranted.some(
        granted => permissionKey(granted) === permissionKey(permission),
      ),
  );

  const newlyGranted =
    missing.length > 0
      ? await requestHealthConnectPermission(missing)
      : [];

  const grantedAccess = [...alreadyGranted, ...newlyGranted].filter(
    (value, index, self) =>
      index ===
      self.findIndex(item => permissionKey(item) === permissionKey(value)),
  );
  const grantedKeys = new Set(grantedAccess.map(permissionKey));
  const requiredKeys = requiredHealthConnectReads.map(permissionKey);
  const allRequiredGranted = requiredKeys.every(key => grantedKeys.has(key));

  console.log('[health] Health Connect permissions', {
    alreadyGranted,
    requested: missing,
    newlyGranted,
    allRequiredGranted,
  });

  return {
    granted: allRequiredGranted,
    platform: 'android',
    details: grantedAccess.map(
      permission => `${permission.recordType} (${permission.accessType})`,
    ),
    grantedPermissions: grantedAccess,
  };
}

const appleHealthPermissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
      AppleHealthKit.Constants.Permissions.BloodPressureSystolic,
      AppleHealthKit.Constants.Permissions.BloodPressureDiastolic,
      AppleHealthKit.Constants.Permissions.BloodGlucose,
      AppleHealthKit.Constants.Permissions.BodyTemperature,
      AppleHealthKit.Constants.Permissions.OxygenSaturation,
      AppleHealthKit.Constants.Permissions.RespiratoryRate,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.Weight,
    ],
  },
};

const timeRange = () => {
  const now = new Date();
  const startDate = startOfDay(now);
  const endDate = endOfDay(now);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
};

export async function requestPlatformPermissions(): Promise<PermissionResult> {
  console.log('[health] requestPlatformPermissions start', { platform: Platform.OS });
  if (Platform.OS === 'android') {
    return ensureHealthConnectPermissions();
  }

  return new Promise(resolve => {
    console.log('[health] HealthKit init start');
    if (!AppleHealthKit || !AppleHealthKit.initHealthKit) {
      console.log('[health] AppleHealthKit native module not found');
      resolve({
        granted: false,
        platform: 'ios',
        details: ['Native module not available'],
      });
      return;
    }

    try {
      AppleHealthKit.initHealthKit(appleHealthPermissions, error => {
        if (error) {
          console.log('[health] HealthKit init error', error);
          resolve({
            granted: false,
            platform: 'ios',
            details: [String(error)],
          });
          return;
        }
        console.log('[health] HealthKit init success');
        resolve({
          granted: true,
          platform: 'ios',
          details: ['Permissions granted or already authorized'],
        });
      });
    } catch (e) {
      console.log('[health] HealthKit fatal init error', e);
      resolve({
        granted: false,
        platform: 'ios',
        details: [String(e)],
      });
    }
  });
}

export async function syncVitals(): Promise<VitalMetrics> {
  console.log('[health] syncVitals start', { platform: Platform.OS });
  if (Platform.OS === 'android') {
    return syncHealthConnect();
  }

  return syncAppleHealth();
}

export async function syncVitalsRange(
  start: string,
  end: string,
): Promise<VitalsRangeResult> {
  const useHourlyGranularity = true;

  if (Platform.OS === 'android') {
    return syncHealthConnectRange(start, end, useHourlyGranularity);
  }

  return syncAppleHealthRange(start, end, useHourlyGranularity);
}

async function syncHealthConnect(): Promise<VitalMetrics> {
  const permissionResult = await ensureHealthConnectPermissions();
  if (!permissionResult.granted) {
    throw new Error(
      'Health Connect permission not granted. Please approve the permission dialog.',
    );
  }

  const grantedPermissions = permissionResult.grantedPermissions ?? [];
  const hasWeightAccess = grantedPermissions.some(
    p => p.recordType === 'Weight' && p.accessType === 'read',
  );

  const { start, end } = timeRange();
  const timeRangeFilter = { startTime: start, endTime: end, operator: 'between' as const };
  console.log('[health] Health Connect aggregate start', timeRangeFilter);

  const [steps, heart, calories, distance, sleep, active] = await Promise.all([
    safeAggregateRecord('Steps', timeRangeFilter),
    safeAggregateRecord('HeartRate', timeRangeFilter),
    safeAggregateRecord('TotalCaloriesBurned', timeRangeFilter),
    safeAggregateRecord('Distance', timeRangeFilter),
    safeAggregateRecord('SleepSession', timeRangeFilter),
    safeAggregateRecord('ExerciseSession', timeRangeFilter),
  ]);
  const bpRecords = await safeReadRecords('BloodPressure', timeRangeFilter);
  const [glucoseAvg, tempAvg, oxyAvg, respAvg] = await Promise.all([
    averageInstantRecord('BloodGlucose' as any, timeRangeFilter, record => record.level.value),
    averageInstantRecord('BodyTemperature' as any, timeRangeFilter, record => record.temperature.value),
    averageInstantRecord('OxygenSaturation' as any, timeRangeFilter, record => record.percentage),
    averageInstantRecord('RespiratoryRate' as any, timeRangeFilter, record => record.rate),
  ]);
  const weight = hasWeightAccess
    ? await safeAggregateRecord('Weight' as any, timeRangeFilter)
    : undefined;

  console.log('[health] Health Connect aggregate results', {
    steps,
    heart,
    calories,
    distance,
    sleep,
    active,
    weight,
    bpRecords,
  });

  return {
    platform: 'android',
    steps: (steps as any)?.count ?? (steps as any)?.COUNT_TOTAL ?? 0,
    averageHeartRate: (heart as any)?.avg ?? (heart as any)?.BPM_AVG ?? 0,
    calories: (calories as any)?.energy?.inKilocalories ?? (calories as any)?.ENERGY_TOTAL?.inKilocalories ?? 0,
    distanceKm: (distance as any)?.distance?.inKilometers ?? (distance as any)?.DISTANCE?.inKilometers ?? 0,
    sleepMinutes: (sleep as any)?.duration?.inMinutes ?? ((sleep as any)?.SLEEP_DURATION_TOTAL ? Math.round((sleep as any).SLEEP_DURATION_TOTAL / 60) : 0),
    activeMinutes: (active as any)?.duration?.inMinutes ?? ((active as any)?.EXERCISE_DURATION_TOTAL?.inSeconds ? Math.round((active as any).EXERCISE_DURATION_TOTAL.inSeconds / 60) : 0),
    weightKg: (weight as any)?.weight?.inKilograms ?? (weight as any)?.WEIGHT_AVG?.inKilograms ?? 0,
    bloodPressureSystolic: averageBP(bpRecords, 'systolic') ?? 0,
    bloodPressureDiastolic: averageBP(bpRecords, 'diastolic') ?? 0,
    bloodGlucoseMgPerDl: glucoseAvg ?? 0,
    bodyTemperatureC: tempAvg ?? 0,
    oxygenSaturationPercent: oxyAvg ?? 0,
    respiratoryRate: respAvg ?? 0,
  };
}

async function syncHealthConnectRange(
  start: string,
  end: string,
  useHourlyGranularity: boolean,
): Promise<VitalsRangeResult> {
  const permissionResult = await ensureHealthConnectPermissions();
  if (!permissionResult.granted) {
    throw new Error(
      'Health Connect permission not granted. Please approve the permission dialog.',
    );
  }

  const grantedPermissions = permissionResult.grantedPermissions ?? [];
  const hasWeightAccess = grantedPermissions.some(
    p => p.recordType === 'Weight' && p.accessType === 'read',
  );

  const timeRangeFilter = { startTime: start, endTime: end, operator: 'between' as const };
  const timeRangeSlicer = { duration: 'DAYS' as const, length: 1 };
  const timeRangeSlicerHourly = { duration: 'HOURS' as const, length: 1 };
  console.log('[health] Health Connect range aggregate', timeRangeFilter);

  const [steps, heart, calories, distance, sleep, active] = await Promise.all([
    safeAggregateRecord('Steps', timeRangeFilter),
    safeAggregateRecord('HeartRate', timeRangeFilter),
    safeAggregateRecord('TotalCaloriesBurned', timeRangeFilter),
    safeAggregateRecord('Distance', timeRangeFilter),
    safeAggregateRecord('SleepSession', timeRangeFilter),
    safeAggregateRecord('ExerciseSession', timeRangeFilter),
  ]);
  const weight = hasWeightAccess
    ? await safeAggregateRecord('Weight', timeRangeFilter)
    : undefined;
  const [glucoseRecords, tempRecords, oxyRecords, respRecords] = await Promise.all([
    safeReadRecords('BloodGlucose', timeRangeFilter),
    safeReadRecords('BodyTemperature', timeRangeFilter),
    safeReadRecords('OxygenSaturation', timeRangeFilter),
    safeReadRecords('RespiratoryRate', timeRangeFilter),
  ]);
  const bpRecords = await safeReadRecords('BloodPressure', timeRangeFilter);

  const [stepsByDay, heartByDay, caloriesByDay, distanceByDay, sleepByDay, activeByDay, weightByDay] =
    await Promise.all([
      safeAggregateGroupByDuration({
        recordType: 'Steps',
        timeRangeFilter,
        timeRangeSlicer,
      }),
      safeAggregateGroupByDuration({
        recordType: 'HeartRate',
        timeRangeFilter,
        timeRangeSlicer,
      }),
      safeAggregateGroupByDuration({
        recordType: 'TotalCaloriesBurned',
        timeRangeFilter,
        timeRangeSlicer,
      }),
      safeAggregateGroupByDuration({
        recordType: 'Distance',
        timeRangeFilter,
        timeRangeSlicer,
      }),
      safeAggregateGroupByDuration({
        recordType: 'SleepSession',
        timeRangeFilter,
        timeRangeSlicer,
      }),
      safeAggregateGroupByDuration({
        recordType: 'ExerciseSession',
        timeRangeFilter,
        timeRangeSlicer,
      }),
      safeAggregateGroupByDuration({
        recordType: 'Weight',
        timeRangeFilter,
        timeRangeSlicer,
      }),
    ]);

  const [stepsByHour, heartByHour, caloriesByHour, distanceByHour, activeByHour] =
    useHourlyGranularity
      ? await Promise.all([
        safeAggregateGroupByDuration({
          recordType: 'Steps',
          timeRangeFilter,
          timeRangeSlicer: timeRangeSlicerHourly,
        }),
        safeAggregateGroupByDuration({
          recordType: 'HeartRate',
          timeRangeFilter,
          timeRangeSlicer: timeRangeSlicerHourly,
        }),
        safeAggregateGroupByDuration({
          recordType: 'TotalCaloriesBurned',
          timeRangeFilter,
          timeRangeSlicer: timeRangeSlicerHourly,
        }),
        safeAggregateGroupByDuration({
          recordType: 'Distance',
          timeRangeFilter,
          timeRangeSlicer: timeRangeSlicerHourly,
        }),
        safeAggregateGroupByDuration({
          recordType: 'ExerciseSession',
          timeRangeFilter,
          timeRangeSlicer: timeRangeSlicerHourly,
        }),
      ])
      : [[], [], [], [], []];

  const dailyMap: Record<string, DailyMetrics> = {};
  const getKey = (iso: string) => iso.slice(0, 10);

  stepsByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].steps = bucket.result.COUNT_TOTAL ?? 0;
  });

  heartByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].averageHeartRate = bucket.result.BPM_AVG ?? 0;
  });

  caloriesByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].calories = bucket.result.ENERGY_TOTAL?.inKilocalories ?? 0;
  });

  distanceByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].distanceKm = bucket.result.DISTANCE?.inKilometers ?? 0;
  });

  sleepByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].sleepMinutes =
      bucket.result.SLEEP_DURATION_TOTAL != null
        ? Math.round(bucket.result.SLEEP_DURATION_TOTAL / 60)
        : 0;
  });

  activeByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].activeMinutes =
      bucket.result.EXERCISE_DURATION_TOTAL?.inSeconds != null
        ? Math.round(bucket.result.EXERCISE_DURATION_TOTAL.inSeconds / 60)
        : 0;
  });

  bucketBPRecords(bpRecords, dailyMap);
  bucketInstantRecords(glucoseRecords, dailyMap, rec => rec.level.value, 'bloodGlucoseMgPerDl');
  bucketInstantRecords(tempRecords, dailyMap, rec => rec.temperature.value, 'bodyTemperatureC');
  bucketInstantRecords(oxyRecords, dailyMap, rec => rec.percentage, 'oxygenSaturationPercent');
  bucketInstantRecords(respRecords, dailyMap, rec => rec.rate, 'respiratoryRate');
  weightByDay.forEach(bucket => {
    const key = getKey(bucket.startTime);
    dailyMap[key] = dailyMap[key] || { date: key };
    dailyMap[key].weightKg = bucket.result.WEIGHT_AVG?.inKilograms ?? dailyMap[key].weightKg;
  });

  const daily = fillMissingDays(timeRangeFilter.startTime, timeRangeFilter.endTime, dailyMap);

  const hourly: HourlyMetric[] = [];
  const toDateHour = (iso: string) => {
    const d = new Date(iso);
    return { date: d.toISOString().slice(0, 10), hour: d.getHours() };
  };

  stepsByHour.forEach(bucket => {
    const { date, hour } = toDateHour(bucket.startTime);
    hourly.push({
      date,
      hour,
      metricType: 'steps',
      value: bucket.result.COUNT_TOTAL ?? 0,
      unit: 'count',
      source: 'health_connect',
    });
  });

  heartByHour.forEach(bucket => {
    const { date, hour } = toDateHour(bucket.startTime);
    hourly.push({
      date,
      hour,
      metricType: 'heart_rate',
      value: bucket.result.BPM_AVG ?? 0,
      unit: 'bpm',
      source: 'health_connect',
    });
  });

  caloriesByHour.forEach(bucket => {
    const { date, hour } = toDateHour(bucket.startTime);
    hourly.push({
      date,
      hour,
      metricType: 'calories',
      value: bucket.result.ENERGY_TOTAL?.inKilocalories ?? 0,
      unit: 'kcal',
      source: 'health_connect',
    });
  });

  distanceByHour.forEach(bucket => {
    const { date, hour } = toDateHour(bucket.startTime);
    hourly.push({
      date,
      hour,
      metricType: 'distance',
      value: bucket.result.DISTANCE?.inKilometers ?? 0,
      unit: 'km',
      source: 'health_connect',
    });
  });

  activeByHour.forEach(bucket => {
    const { date, hour } = toDateHour(bucket.startTime);
    hourly.push({
      date,
      hour,
      metricType: 'active_minutes',
      value: bucket.result.EXERCISE_DURATION_TOTAL?.inSeconds
        ? Math.round(bucket.result.EXERCISE_DURATION_TOTAL.inSeconds / 60)
        : 0,
      unit: 'min',
      source: 'health_connect',
    });
  });

  const summary: VitalMetrics = {
    platform: 'android',
    steps: steps?.COUNT_TOTAL ?? 0,
    averageHeartRate: heart?.BPM_AVG ?? 0,
    calories: calories?.ENERGY_TOTAL?.inKilocalories ?? 0,
    distanceKm: distance?.DISTANCE?.inKilometers ?? 0,
    sleepMinutes:
      sleep?.SLEEP_DURATION_TOTAL != null
        ? Math.round(sleep.SLEEP_DURATION_TOTAL / 60)
        : 0,
    activeMinutes:
      active?.EXERCISE_DURATION_TOTAL?.inSeconds != null
        ? Math.round(active.EXERCISE_DURATION_TOTAL.inSeconds / 60)
        : 0,
    weightKg: weight?.WEIGHT_AVG?.inKilograms ?? 0,
    bloodPressureSystolic: averageBP(bpRecords, 'systolic') ?? 0,
    bloodPressureDiastolic: averageBP(bpRecords, 'diastolic') ?? 0,
    bloodGlucoseMgPerDl: averageFromDaily(daily, 'bloodGlucoseMgPerDl') ?? 0,
    bodyTemperatureC: averageFromDaily(daily, 'bodyTemperatureC') ?? 0,
    oxygenSaturationPercent: averageFromDaily(daily, 'oxygenSaturationPercent') ?? 0,
    respiratoryRate: averageFromDaily(daily, 'respiratoryRate') ?? 0,
  };

  return { platform: 'android', summary, daily, hourly };
}

async function syncAppleHealth(): Promise<VitalMetrics> {
  const { start, end } = timeRange();
  console.log('[health] HealthKit aggregate start', { start, end });

  const steps = await promisifyHealthArray(cb =>
    AppleHealthKit.getDailyStepCountSamples(
      { startDate: start, endDate: end },
      cb,
    ),
  );

  const heartRates = await promisifyHealthArray(cb =>
    AppleHealthKit.getHeartRateSamples({ startDate: start, endDate: end }, cb),
  );

  const calories = await promisifyHealthArray(cb =>
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: start,
        endDate: end,
        unit: AppleHealthKit.Constants.Units.kilocalorie,
      },
      cb,
    ),
  );

  const distances = await promisifyHealthArray(cb =>
    AppleHealthKit.getDailyDistanceWalkingRunningSamples(
      {
        startDate: start,
        endDate: end,
        unit: AppleHealthKit.Constants.Units.meter,
      },
      cb,
    ),
  );

  const sleeps = await promisifyHealthArray(cb =>
    AppleHealthKit.getSleepSamples({ startDate: start, endDate: end }, cb),
  );

  const exerciseTimes = await promisifyHealthArray(cb =>
    AppleHealthKit.getAppleExerciseTime(
      {
        startDate: start,
        endDate: end,
        unit: AppleHealthKit.Constants.Units.minute,
      },
      cb,
    ),
  );

  const weight = await promisifyHealthValue(cb =>
    AppleHealthKit.getLatestWeight(
      { unit: 'pound' as any }, // HealthKit returns weight in pounds by default
      cb,
    ),
  );

  // Fetch additional vitals
  const bloodPressureSamples: any[] = await new Promise(resolve => {
    AppleHealthKit.getBloodPressureSamples({ startDate: start, endDate: end }, (err: string, results: any) => {
      if (err) {
        resolve([]);
        return;
      }
      resolve(results || []);
    });
  });

  const bloodGlucoseSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getBloodGlucoseSamples(
      { startDate: start, endDate: end, unit: 'mgPerdL' as any },
      cb,
    ),
  );

  const bodyTempSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getBodyTemperatureSamples(
      { startDate: start, endDate: end, unit: 'celsius' as any },
      cb,
    ),
  );

  const oxygenSaturationSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getOxygenSaturationSamples({ startDate: start, endDate: end }, cb),
  );

  const respiratoryRateSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getRespiratoryRateSamples({ startDate: start, endDate: end }, cb),
  );

  const totalSteps = steps.reduce((acc, item) => acc + (item.value ?? 0), 0);

  const avgHeartRate =
    heartRates.length === 0
      ? undefined
      : Math.round(
        heartRates.reduce((acc, item) => acc + (item.value ?? 0), 0) /
        heartRates.length,
      );

  const totalCalories = calories.reduce(
    (acc, item) => acc + (item.value ?? 0),
    0,
  );

  const totalDistance = distances.reduce(
    (acc, item) => acc + (item.value ?? 0),
    0,
  );

  const totalSleepMinutes = sleeps.reduce((acc, item) => {
    const startDate = new Date(item.startDate).getTime();
    const endDate = new Date(item.endDate).getTime();
    return acc + Math.round((endDate - startDate) / 1000 / 60);
  }, 0);

  const totalActiveMinutes = exerciseTimes.reduce(
    (acc, item) => acc + (item.value ?? 0),
    0,
  );

  // Calculate averages for additional vitals
  const avgBPSystolic = bloodPressureSamples.length > 0
    ? bloodPressureSamples.reduce((acc: number, item: any) => acc + (item.bloodPressureSystolicValue ?? 0), 0) / bloodPressureSamples.length
    : undefined;

  const avgBPDiastolic = bloodPressureSamples.length > 0
    ? bloodPressureSamples.reduce((acc: number, item: any) => acc + (item.bloodPressureDiastolicValue ?? 0), 0) / bloodPressureSamples.length
    : undefined;

  const avgBloodGlucose = bloodGlucoseSamples.length > 0
    ? bloodGlucoseSamples.reduce((acc, item) => acc + (item.value ?? 0), 0) / bloodGlucoseSamples.length
    : undefined;

  const avgBodyTemp = bodyTempSamples.length > 0
    ? bodyTempSamples.reduce((acc, item) => acc + (item.value ?? 0), 0) / bodyTempSamples.length
    : undefined;

  const avgOxygenSaturation = oxygenSaturationSamples.length > 0
    ? oxygenSaturationSamples.reduce((acc, item) => acc + (item.value ?? 0), 0) / oxygenSaturationSamples.length
    : undefined;

  const avgRespiratoryRate = respiratoryRateSamples.length > 0
    ? respiratoryRateSamples.reduce((acc, item) => acc + (item.value ?? 0), 0) / respiratoryRateSamples.length
    : undefined;

  // Convert weight from pounds to kg (1 pound = 0.453592 kg)
  const weightInKg = weight?.value ? weight.value * 0.453592 : undefined;

  return {
    platform: 'ios',
    steps: totalSteps,
    averageHeartRate: avgHeartRate,
    calories: totalCalories,
    distanceKm: totalDistance / 1000,
    sleepMinutes: totalSleepMinutes,
    activeMinutes: totalActiveMinutes,
    weightKg: weightInKg,
    bloodPressureSystolic: avgBPSystolic,
    bloodPressureDiastolic: avgBPDiastolic,
    bloodGlucoseMgPerDl: avgBloodGlucose,
    bodyTemperatureC: avgBodyTemp,
    oxygenSaturationPercent: avgOxygenSaturation,
    respiratoryRate: avgRespiratoryRate,
  };
}

async function syncAppleHealthRange(
  start: string,
  end: string,
  useHourlyGranularity: boolean = false, // true for "today", false for week/month
): Promise<VitalsRangeResult> {
  console.log('[health] HealthKit range aggregate start', { start, end, useHourlyGranularity });

  // Note: HealthKit's getDailyStepCountSamples returns DAILY aggregates, not hourly
  // Even for "today", it will return a single data point for the entire day
  // To get hourly data, we would need to fetch raw samples and group them manually

  const steps = await promisifyHealthArray(cb =>
    AppleHealthKit.getDailyStepCountSamples(
      { startDate: start, endDate: end },
      cb,
    ),
  );

  console.log('[health] Steps samples received:', steps.length, steps);

  const heartRates = await promisifyHealthArray(cb =>
    AppleHealthKit.getHeartRateSamples({ startDate: start, endDate: end }, cb),
  );

  const calories = await promisifyHealthArray(cb =>
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: start,
        endDate: end,
        unit: AppleHealthKit.Constants.Units.kilocalorie,
      },
      cb,
    ),
  );

  const distances = await promisifyHealthArray(cb =>
    AppleHealthKit.getDailyDistanceWalkingRunningSamples(
      {
        startDate: start,
        endDate: end,
        unit: AppleHealthKit.Constants.Units.meter,
      },
      cb,
    ),
  );

  const sleeps = await promisifyHealthArray(cb =>
    AppleHealthKit.getSleepSamples({ startDate: start, endDate: end }, cb),
  );

  const activeMinutes = await promisifyHealthArray(cb =>
    AppleHealthKit.getAppleExerciseTime(
      {
        startDate: start,
        endDate: end,
        unit: AppleHealthKit.Constants.Units.minute,
      },
      cb,
    ),
  );

  const weight = await promisifyHealthValue(cb =>
    AppleHealthKit.getLatestWeight(
      { unit: 'pound' as any },
      cb,
    ),
  );

  // Fetch additional vitals for the range
  const bpSamples = await promisifyHealthArray(cb => {
    AppleHealthKit.getBloodPressureSamples({ startDate: start, endDate: end }, cb);
  });

  const glucoseSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getBloodGlucoseSamples(
      { startDate: start, endDate: end, unit: 'mgPerdL' as any },
      cb,
    ),
  );

  const tempSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getBodyTemperatureSamples(
      { startDate: start, endDate: end, unit: 'celsius' as any },
      cb,
    ),
  );

  const oxygenSamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getOxygenSaturationSamples({ startDate: start, endDate: end }, cb),
  );

  const respiratorySamples = await promisifyHealthArray(cb =>
    AppleHealthKit.getRespiratoryRateSamples({ startDate: start, endDate: end }, cb),
  );

  const dailyMap: Record<string, DailyMetrics> = {};
  const add = (key: string) => (dailyMap[key] = dailyMap[key] || { date: key });

  // Conditional grouping: hourly for "today", daily for week/month
  const dateKey = (iso: string) => {
    if (useHourlyGranularity) {
      // Group by hour: "2025-12-18T16:00:00"
      const d = new Date(iso);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:00:00`;
    } else {
      // Group by day: "2025-12-18"
      return iso.slice(0, 10);
    }
  };

  steps.forEach(s => {
    const key = dateKey(s.startDate);
    const entry = add(key);
    entry.steps = (entry.steps ?? 0) + (s.value ?? 0);
  });

  heartRates.forEach(hr => {
    const key = dateKey(hr.startDate);
    const entry = add(key);
    if (!entry.averageHeartRate) {
      entry.averageHeartRate = 0;
      (entry as any).hrCount = 0;
      (entry as any).minHeartRate = hr.value;
      (entry as any).maxHeartRate = hr.value;
    }
    entry.averageHeartRate = entry.averageHeartRate + (hr.value ?? 0);
    (entry as any).hrCount = ((entry as any).hrCount ?? 0) + 1;
    (entry as any).minHeartRate = Math.min((entry as any).minHeartRate, hr.value);
    (entry as any).maxHeartRate = Math.max((entry as any).maxHeartRate, hr.value);
  });

  calories.forEach(c => {
    const key = dateKey(c.startDate);
    const entry = add(key);
    entry.calories = (entry.calories ?? 0) + (c.value ?? 0);
  });

  distances.forEach(d => {
    const key = dateKey(d.startDate);
    const entry = add(key);
    // distance is in meters, store as km
    entry.distanceKm = (entry.distanceKm ?? 0) + (d.value ?? 0) / 1000;
  });

  sleeps.forEach(s => {
    const key = dateKey(s.startDate);
    const entry = add(key);
    const startMs = new Date(s.startDate).getTime();
    const endMs = new Date(s.endDate).getTime();
    const minutes = Math.round((endMs - startMs) / 1000 / 60);
    entry.sleepMinutes = (entry.sleepMinutes ?? 0) + minutes;
    const stage = (s as any).value;
    if (stage) {
      const normalized = String(stage).toUpperCase();
      if (normalized.includes('AWAKE')) {
        entry.sleepAwakeMinutes = (entry.sleepAwakeMinutes ?? 0) + minutes;
      } else if (normalized.includes('REM')) {
        entry.sleepRemMinutes = (entry.sleepRemMinutes ?? 0) + minutes;
      } else if (normalized.includes('CORE') || normalized.includes('ASLEEP') || normalized.includes('LIGHT')) {
        entry.sleepCoreMinutes = (entry.sleepCoreMinutes ?? 0) + minutes;
      } else if (normalized.includes('DEEP')) {
        entry.sleepDeepMinutes = (entry.sleepDeepMinutes ?? 0) + minutes;
      }
    }
  });

  activeMinutes.forEach((e: any) => {
    const key = dateKey(e.startDate);
    const entry = add(key);
    entry.activeMinutes = (entry.activeMinutes ?? 0) + (e.value ?? 0);
  });

  // Process blood pressure samples
  bpSamples.forEach((bp: any) => {
    const key = dateKey(bp.startDate);
    const entry = add(key);
    entry.bloodPressureSystolic = bp.bloodPressureSystolicValue;
    entry.bloodPressureDiastolic = bp.bloodPressureDiastolicValue;

    // Track Systolic range
    entry.minSystolic = entry.minSystolic != null
      ? Math.min(entry.minSystolic, bp.bloodPressureSystolicValue)
      : bp.bloodPressureSystolicValue;
    entry.maxSystolic = entry.maxSystolic != null
      ? Math.max(entry.maxSystolic, bp.bloodPressureSystolicValue)
      : bp.bloodPressureSystolicValue;

    // Track Diastolic range
    entry.minDiastolic = entry.minDiastolic != null
      ? Math.min(entry.minDiastolic, bp.bloodPressureDiastolicValue)
      : bp.bloodPressureDiastolicValue;
    entry.maxDiastolic = entry.maxDiastolic != null
      ? Math.max(entry.maxDiastolic, bp.bloodPressureDiastolicValue)
      : bp.bloodPressureDiastolicValue;
  });

  // Process blood glucose samples
  glucoseSamples.forEach((bg: any) => {
    const key = dateKey(bg.startDate);
    const entry = add(key);
    entry.bloodGlucoseMgPerDl = bg.value;
  });

  // Process body temperature samples
  tempSamples.forEach((temp: any) => {
    const key = dateKey(temp.startDate);
    const entry = add(key);
    entry.bodyTemperatureC = temp.value;
  });

  // Process oxygen saturation samples
  oxygenSamples.forEach((oxy: any) => {
    const key = dateKey(oxy.startDate);
    const entry = add(key);
    entry.oxygenSaturationPercent = oxy.value;
  });

  // Process respiratory rate samples
  respiratorySamples.forEach((resp: any) => {
    const key = dateKey(resp.startDate);
    const entry = add(key);
    entry.respiratoryRate = resp.value;
  });

  // finalize heart rate averages
  Object.values(dailyMap).forEach(entry => {
    const hrCount = (entry as any).hrCount ?? 0;
    if (hrCount > 0 && entry.averageHeartRate != null) {
      entry.averageHeartRate = Math.round(entry.averageHeartRate / hrCount);
    }
    delete (entry as any).hrCount;
  });

  let daily: DailyMetrics[] = [];
  if (useHourlyGranularity) {
    const dailyRollup: Record<string, DailyMetrics & { hrCount?: number }> = {};
    Object.values(dailyMap).forEach(entry => {
      const date = entry.date.slice(0, 10);
      const target = dailyRollup[date] || { date };

      target.steps = (target.steps ?? 0) + (entry.steps ?? 0);
      target.calories = (target.calories ?? 0) + (entry.calories ?? 0);
      target.distanceKm = (target.distanceKm ?? 0) + (entry.distanceKm ?? 0);
      target.sleepMinutes = (target.sleepMinutes ?? 0) + (entry.sleepMinutes ?? 0);
      target.sleepAwakeMinutes = (target.sleepAwakeMinutes ?? 0) + (entry.sleepAwakeMinutes ?? 0);
      target.sleepRemMinutes = (target.sleepRemMinutes ?? 0) + (entry.sleepRemMinutes ?? 0);
      target.sleepCoreMinutes = (target.sleepCoreMinutes ?? 0) + (entry.sleepCoreMinutes ?? 0);
      target.sleepDeepMinutes = (target.sleepDeepMinutes ?? 0) + (entry.sleepDeepMinutes ?? 0);
      target.activeMinutes = (target.activeMinutes ?? 0) + (entry.activeMinutes ?? 0);
      target.weightKg = target.weightKg ?? entry.weightKg;

      if (entry.averageHeartRate != null) {
        target.averageHeartRate = (target.averageHeartRate ?? 0) + entry.averageHeartRate;
        target.hrCount = (target.hrCount ?? 0) + 1;
      }

      if (entry.minHeartRate != null) {
        target.minHeartRate = target.minHeartRate != null
          ? Math.min(target.minHeartRate, entry.minHeartRate)
          : entry.minHeartRate;
      }
      if (entry.maxHeartRate != null) {
        target.maxHeartRate = target.maxHeartRate != null
          ? Math.max(target.maxHeartRate, entry.maxHeartRate)
          : entry.maxHeartRate;
      }

      target.bloodPressureSystolic = target.bloodPressureSystolic ?? entry.bloodPressureSystolic;
      target.bloodPressureDiastolic = target.bloodPressureDiastolic ?? entry.bloodPressureDiastolic;
      target.minSystolic = target.minSystolic ?? entry.minSystolic;
      target.maxSystolic = target.maxSystolic ?? entry.maxSystolic;
      target.minDiastolic = target.minDiastolic ?? entry.minDiastolic;
      target.maxDiastolic = target.maxDiastolic ?? entry.maxDiastolic;

      target.bloodGlucoseMgPerDl = target.bloodGlucoseMgPerDl ?? entry.bloodGlucoseMgPerDl;
      target.bodyTemperatureC = target.bodyTemperatureC ?? entry.bodyTemperatureC;
      target.oxygenSaturationPercent = target.oxygenSaturationPercent ?? entry.oxygenSaturationPercent;
      target.respiratoryRate = target.respiratoryRate ?? entry.respiratoryRate;

      dailyRollup[date] = target;
    });

    daily = Object.values(dailyRollup).map(entry => {
      if (entry.hrCount && entry.averageHeartRate != null) {
        entry.averageHeartRate = Math.round(entry.averageHeartRate / entry.hrCount);
      }
      delete (entry as any).hrCount;
      return entry;
    }).sort((a, b) => a.date.localeCompare(b.date));
  } else {
    daily = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  const hourly: HourlyMetric[] = [];
  if (useHourlyGranularity) {
    Object.values(dailyMap).forEach(entry => {
      const hourDate = entry.date;
      const date = hourDate.slice(0, 10);
      const hour = Number(hourDate.slice(11, 13));
      if (!Number.isInteger(hour)) return;

      const pushIfNumber = (metricType: string, value?: number, unit?: string) => {
        if (value == null) return;
        hourly.push({
          date,
          hour,
          metricType,
          value,
          unit,
          source: 'apple_health',
        });
      };

      pushIfNumber('steps', entry.steps, 'count');
      pushIfNumber('heart_rate', entry.averageHeartRate, 'bpm');
      pushIfNumber('calories', entry.calories, 'kcal');
      pushIfNumber('distance', entry.distanceKm, 'km');
      pushIfNumber('sleep_minutes', entry.sleepMinutes, 'min');
      pushIfNumber('active_minutes', entry.activeMinutes, 'min');
      pushIfNumber('bp_systolic', entry.bloodPressureSystolic, 'mmHg');
      pushIfNumber('bp_diastolic', entry.bloodPressureDiastolic, 'mmHg');
      pushIfNumber('blood_glucose', entry.bloodGlucoseMgPerDl, 'mg/dL');
      pushIfNumber('body_temp', entry.bodyTemperatureC, 'C');
      pushIfNumber('oxygen_sat', entry.oxygenSaturationPercent, '%');
      pushIfNumber('respiratory_rate', entry.respiratoryRate, 'breaths/min');
    });
  }

  const sleepSessions: SleepSession[] = sleeps.map((s: any) => {
    const start = s.startDate;
    const end = s.endDate;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const durationMinutes = Number.isFinite(startMs) && Number.isFinite(endMs)
      ? Math.round((endMs - startMs) / 1000 / 60)
      : undefined;
    return {
      startTime: start,
      endTime: end,
      stage: s.value ? String(s.value).toLowerCase() : undefined,
      durationMinutes,
      source: 'apple_health',
    };
  });

  // Convert weight from pounds to kg
  const weightInKg = weight?.value ? weight.value * 0.453592 : undefined;

  const summary = daily.reduce<VitalMetrics>(
    (acc, entry) => ({
      ...acc,
      steps: (acc.steps ?? 0) + (entry.steps ?? 0),
      averageHeartRate: acc.averageHeartRate ?? entry.averageHeartRate,
      calories: (acc.calories ?? 0) + (entry.calories ?? 0),
      distanceKm: (acc.distanceKm ?? 0) + (entry.distanceKm ?? 0),
      sleepMinutes: (acc.sleepMinutes ?? 0) + (entry.sleepMinutes ?? 0),
      activeMinutes: (acc.activeMinutes ?? 0) + (entry.activeMinutes ?? 0),
      weightKg: acc.weightKg ?? entry.weightKg ?? weightInKg,
      bloodPressureSystolic: acc.bloodPressureSystolic ?? entry.bloodPressureSystolic,
      bloodPressureDiastolic: acc.bloodPressureDiastolic ?? entry.bloodPressureDiastolic,
      bloodGlucoseMgPerDl: acc.bloodGlucoseMgPerDl ?? entry.bloodGlucoseMgPerDl,
      bodyTemperatureC: acc.bodyTemperatureC ?? entry.bodyTemperatureC,
      oxygenSaturationPercent: acc.oxygenSaturationPercent ?? entry.oxygenSaturationPercent,
      respiratoryRate: acc.respiratoryRate ?? entry.respiratoryRate,
    }),
    { platform: 'ios' },
  );

  return { platform: 'ios', summary, daily, hourly, sleepSessions };
}

async function safeAggregateRecord<T extends AggregateResultRecordType>(
  recordType: T,
  timeRangeFilter: TimeRangeFilter,
) {
  try {
    return await aggregateRecord({ recordType, timeRangeFilter });
  } catch (err) {
    console.log('[health] aggregateRecord error', { recordType, err });
    return undefined;
  }
}

async function safeAggregateGroupByDuration<T extends AggregateResultRecordType>(
  request: {
    recordType: T;
    timeRangeFilter: TimeRangeFilter;
    timeRangeSlicer: { duration: 'DAYS' | 'HOURS'; length: number };
  },
): Promise<AggregationGroupResult<T>[]> {
  try {
    return await aggregateGroupByDuration(request);
  } catch (err) {
    console.log('[health] aggregateGroupByDuration error', { recordType: request.recordType, err });
    return [];
  }
}

async function safeReadRecords<
  T extends 'BloodGlucose' | 'BodyTemperature' | 'OxygenSaturation' | 'RespiratoryRate' | 'BloodPressure',
>(
  recordType: T,
  timeRangeFilter: TimeRangeFilter,
) {
  try {
    const res = await readRecords(recordType as any, { timeRangeFilter });
    return res.records as any[];
  } catch (err) {
    console.log('[health] readRecords error', { recordType, err });
    return [];
  }
}

function bucketInstantRecords<T extends { startTime?: string; time?: string }>(
  records: T[],
  dailyMap: Record<string, DailyMetrics>,
  getValue: (r: T) => number | undefined,
  field:
    | 'bloodGlucoseMgPerDl'
    | 'bodyTemperatureC'
    | 'oxygenSaturationPercent'
    | 'respiratoryRate',
) {
  const sums: Record<string, { sum: number; count: number }> = {};
  records.forEach(rec => {
    const ts = rec.startTime || (rec as any).time;
    if (!ts) return;
    const key = ts.slice(0, 10);
    const value = getValue(rec);
    if (value == null) return;
    sums[key] = sums[key] || { sum: 0, count: 0 };
    sums[key].sum += value;
    sums[key].count += 1;
  });

  Object.entries(sums).forEach(([key, agg]) => {
    const avg = agg.count > 0 ? agg.sum / agg.count : undefined;
    if (avg == null) return;
    dailyMap[key] = dailyMap[key] || { date: key };
    (dailyMap[key] as any)[field] = avg;
  });
}

function averageFromDaily(daily: DailyMetrics[], field: keyof DailyMetrics) {
  const values = daily
    .map(d => d[field] as number | undefined)
    .filter(v => v != null) as number[];
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function bucketBPRecords(
  records: {
    startTime?: string;
    time?: string;
    systolic: { inMillimetersOfMercury: number };
    diastolic: { inMillimetersOfMercury: number };
  }[],
  dailyMap: Record<string, DailyMetrics>,
) {
  records.forEach(rec => {
    const ts = rec.startTime || (rec as any).time;
    if (!ts) return;
    const key = ts.slice(0, 10);
    dailyMap[key] = dailyMap[key] || { date: key };
    const entry = dailyMap[key];
    const sys = rec.systolic.inMillimetersOfMercury;
    const dia = rec.diastolic.inMillimetersOfMercury;
    entry.bloodPressureSystolic = sys;
    entry.bloodPressureDiastolic = dia;
    entry.minSystolic = entry.minSystolic != null ? Math.min(entry.minSystolic, sys) : sys;
    entry.maxSystolic = entry.maxSystolic != null ? Math.max(entry.maxSystolic, sys) : sys;
    entry.minDiastolic = entry.minDiastolic != null ? Math.min(entry.minDiastolic, dia) : dia;
    entry.maxDiastolic = entry.maxDiastolic != null ? Math.max(entry.maxDiastolic, dia) : dia;
  });
}

async function averageInstantRecord<T extends AggregateResultRecordType>(
  recordType: T,
  timeRangeFilter: any,
  getValue: (record: any) => number,
): Promise<number | undefined> {
  try {
    const records = await safeReadRecords(recordType, timeRangeFilter);
    if (!records || records.length === 0) return undefined;
    const sum = records.reduce((acc, rec) => acc + getValue(rec), 0);
    return sum / records.length;
  } catch (err) {
    console.log(`[health] Error averaging ${recordType}`, err);
    return undefined;
  }
}

function averageBP(
  records: any[],
  type: 'systolic' | 'diastolic',
) {
  const values = records
    .map(r => r[type]?.inMillimetersOfMercury)
    .filter(v => v !== undefined && v !== null);
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function fillMissingDays(
  startIso: string,
  endIso: string,
  dailyMap: Record<string, DailyMetrics>,
) {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const days: DailyMetrics[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    const existing = dailyMap[key];
    days.push(
      existing ?? {
        date: key,
        steps: 0,
        calories: 0,
        distanceKm: 0,
        sleepMinutes: 0,
        activeMinutes: 0,
      },
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function promisifyHealthArray(
  executor: (
    callback: (err: string, results: HealthValue[]) => void,
  ) => void,
): Promise<HealthValue[]> {
  return new Promise(resolve => {
    executor((err, results = []) => {
      if (err) {
        resolve([]);
        return;
      }

      resolve(results);
    });
  });
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function promisifyHealthValue(
  executor: (
    callback: (err: string, results: HealthValue) => void,
  ) => void,
): Promise<HealthValue | undefined> {
  return new Promise(resolve => {
    executor((err, result) => {
      if (err) {
        resolve(undefined);
        return;
      }

      resolve(result);
    });
  });
}
