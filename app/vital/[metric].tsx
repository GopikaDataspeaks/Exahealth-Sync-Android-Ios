import DateTimePicker from '@react-native-community/datetimepicker';
import {useLocalSearchParams, useRouter} from 'expo-router';
import React, {useEffect, useMemo, useState} from 'react';
import {Platform, ScrollView, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import {computeRange, RangeKey, todayKey} from '../../src/health/rangeUtils';
import {useHealthStore} from '../../src/state/healthStore';
import {Button, Card} from '../../src/ui/Primitives';

type MetricKey =
  | 'steps'
  | 'calories'
  | 'distance'
  | 'sleep'
  | 'active'
  | 'heart'
  | 'bp'
  | 'glucose'
  | 'temperature'
  | 'oxygen'
  | 'respiratory'
  | 'weight';

const metricConfig: Record<
  MetricKey,
  {label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; suffix?: string}
> = {
  steps: {label: 'Steps', icon: 'walk'},
  calories: {label: 'Calories', icon: 'fire', suffix: 'kcal'},
  distance: {label: 'Distance', icon: 'map-marker-distance', suffix: 'm'},
  sleep: {label: 'Sleep', icon: 'sleep', suffix: 'min'},
  active: {label: 'Active minutes', icon: 'run', suffix: 'min'},
  heart: {label: 'Heart rate', icon: 'heart-pulse', suffix: 'bpm'},
  bp: {label: 'Blood pressure', icon: 'heart', suffix: 'mmHg'},
  glucose: {label: 'Blood glucose', icon: 'water', suffix: 'mg/dL'},
  temperature: {label: 'Body temp', icon: 'thermometer', suffix: '°C'},
  oxygen: {label: 'Oxygen saturation', icon: 'heart-plus', suffix: '%'},
  respiratory: {label: 'Respiratory rate', icon: 'lungs', suffix: 'rpm'},
  weight: {label: 'Weight', icon: 'weight-kilogram', suffix: 'kg'},
};

export default function MetricDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{metric: MetricKey}>();
  const metric = (params.metric as MetricKey) || 'steps';
  const config = metricConfig[metric];
  const daily = useHealthStore(s => s.daily);
  const metrics = useHealthStore(s => s.metrics);
  const syncing = useHealthStore(s => s.syncing);
  const syncRange = useHealthStore(s => s.syncRange);

  const [rangeKey, setRangeKey] = useState<RangeKey>('7d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    const {start, end} = computeRange(rangeKey, customStart, customEnd);
    if (rangeKey === 'custom' && (!customStart || !customEnd)) {
      return;
    }
    // ensure today sync when entering
    syncRange(rangeKey, customStart, customEnd);
  }, [rangeKey, customStart, customEnd, syncRange]);

  const today = todayKey();
  const todayEntry = daily.find(d => d.date === today);

  const chartData = useMemo(
    () =>
      daily.map(d => {
        switch (metric) {
          case 'calories':
            return {label: d.date, value: d.calories ?? 0};
          case 'distance':
            return {label: d.date, value: (d.distanceKm ?? 0) * 1000};
          case 'sleep':
            return {label: d.date, value: d.sleepMinutes ?? 0};
          case 'active':
            return {label: d.date, value: d.activeMinutes ?? 0};
          case 'heart':
            return {label: d.date, value: d.averageHeartRate ?? 0};
          case 'bp':
            return {label: d.date, value: d.bloodPressureSystolic ?? 0};
          case 'glucose':
            return {label: d.date, value: d.bloodGlucoseMgPerDl ?? 0};
          case 'temperature':
            return {label: d.date, value: d.bodyTemperatureC ?? 0};
          case 'oxygen':
            return {label: d.date, value: d.oxygenSaturationPercent ?? 0};
          case 'respiratory':
            return {label: d.date, value: d.respiratoryRate ?? 0};
          case 'weight':
            return {label: d.date, value: d.weightKg ?? 0};
          default:
            return {label: d.date, value: d.steps ?? 0};
        }
      }),
    [daily, metric],
  );

  const todayValue = useMemo(() => {
    const entry = todayEntry;
    if (!entry) return '--';
    switch (metric) {
      case 'calories':
        return entry.calories != null ? `${entry.calories.toFixed(0)} kcal` : '--';
      case 'distance':
        return entry.distanceKm != null ? `${entry.distanceKm.toFixed(2)} km` : '--';
      case 'sleep':
        return entry.sleepMinutes != null ? `${entry.sleepMinutes} min` : '--';
      case 'active':
        return entry.activeMinutes != null ? `${entry.activeMinutes} min` : '--';
      case 'heart':
        return entry.averageHeartRate != null
          ? `${entry.averageHeartRate.toFixed(0)} bpm`
          : '--';
      case 'bp':
        return entry.bloodPressureSystolic != null && entry.bloodPressureDiastolic != null
          ? `${entry.bloodPressureSystolic.toFixed(0)}/${entry.bloodPressureDiastolic.toFixed(0)} mmHg`
          : '--';
      case 'glucose':
        return entry.bloodGlucoseMgPerDl != null
          ? `${entry.bloodGlucoseMgPerDl.toFixed(0)} mg/dL`
          : '--';
      case 'temperature':
        return entry.bodyTemperatureC != null
          ? `${entry.bodyTemperatureC.toFixed(1)} °C`
          : '--';
      case 'oxygen':
        return entry.oxygenSaturationPercent != null
          ? `${entry.oxygenSaturationPercent.toFixed(0)} %`
          : '--';
      case 'respiratory':
        return entry.respiratoryRate != null
          ? `${entry.respiratoryRate.toFixed(0)} rpm`
          : '--';
      case 'weight':
        return entry.weightKg != null ? `${entry.weightKg.toFixed(1)} kg` : '--';
      default:
        return entry.steps != null ? entry.steps.toLocaleString() : '--';
    }
  }, [todayEntry, metric]);

  const summaryValue = useMemo(() => {
    if (!metrics) return '--';
    switch (metric) {
      case 'calories':
        return metrics.calories != null ? `${metrics.calories.toFixed(0)} kcal` : '--';
      case 'distance':
        return metrics.distanceKm != null ? `${metrics.distanceKm.toFixed(2)} km` : '--';
      case 'sleep':
        return metrics.sleepMinutes != null
          ? `${metrics.sleepMinutes} min`
          : '--';
      case 'active':
        return metrics.activeMinutes != null ? `${metrics.activeMinutes} min` : '--';
      case 'heart':
        return metrics.averageHeartRate != null
          ? `${metrics.averageHeartRate.toFixed(0)} bpm`
          : '--';
      case 'bp':
        return metrics.bloodPressureSystolic != null && metrics.bloodPressureDiastolic != null
          ? `${metrics.bloodPressureSystolic.toFixed(0)}/${metrics.bloodPressureDiastolic.toFixed(0)} mmHg`
          : '--';
      case 'glucose':
        return metrics.bloodGlucoseMgPerDl != null
          ? `${metrics.bloodGlucoseMgPerDl.toFixed(0)} mg/dL`
          : '--';
      case 'temperature':
        return metrics.bodyTemperatureC != null
          ? `${metrics.bodyTemperatureC.toFixed(1)} °C`
          : '--';
      case 'oxygen':
        return metrics.oxygenSaturationPercent != null
          ? `${metrics.oxygenSaturationPercent.toFixed(0)} %`
          : '--';
      case 'respiratory':
        return metrics.respiratoryRate != null
          ? `${metrics.respiratoryRate.toFixed(0)} rpm`
          : '--';
      case 'weight':
        return metrics.weightKg != null ? `${metrics.weightKg.toFixed(1)} kg` : '--';
      default:
        return metrics.steps != null ? metrics.steps.toLocaleString() : '--';
    }
  }, [metrics, metric]);

  const handleDateChange = (which: 'start' | 'end', date?: Date) => {
    if (!date) return;
    const iso = date.toISOString().slice(0, 10);
    if (which === 'start') setCustomStart(iso);
    if (which === 'end') setCustomEnd(iso);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0f172a'}}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
       <TouchableOpacity 
        onPress={() => router.back()} 
        style={{
          flexDirection: 'row', 
          alignItems: 'center', 
          paddingHorizontal: 16, 
          paddingVertical: 12,
          gap: 8
        }}>
        <MaterialIcons name='arrow-back' size={24} color='white'/>
        <Text style={{color: 'white', fontSize: 16}}>Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={{flex: 1, backgroundColor: '#0b1224'}}
        contentContainerStyle={{padding: 16, gap: 12}}>
        <Card title={`${config.label}`}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <MaterialCommunityIcons name={config.icon} size={26} color="#22c55e" />
            <Text style={{color: '#e2e8f0', fontSize: 24, fontWeight: '800'}}>
              {todayValue}
            </Text>
          </View>
          <Text style={{color: '#94a3b8'}}>Today</Text>
          <Text style={{color: '#94a3b8', marginTop: 6}}>Range total: {summaryValue}</Text>
        </Card>

        <Card title="Range">
          <View style={{flexDirection: 'row', gap: 8}}>
            {[
              {key: '7d', label: 'This week'},
              {key: '30d', label: 'This month'},
              {key: 'custom', label: 'Custom'},
            ].map(btn => (
              <TouchableOpacity
                key={btn.key}
                onPress={() => setRangeKey(btn.key as RangeKey)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: rangeKey === btn.key ? '#22c55e' : '#1f2937',
                }}>
                <Text
                  style={{
                    color: rangeKey === btn.key ? '#0f172a' : '#cbd5f5',
                    fontWeight: '700',
                  }}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {rangeKey === 'custom' ? (
            <View style={{marginTop: 10, gap: 10}}>
              <DateRow
                label="Start"
                value={customStart || 'Select date'}
                onPress={() => setShowStartPicker(true)}
              />
              <DateRow
                label="End"
                value={customEnd || 'Select date'}
                onPress={() => setShowEndPicker(true)}
              />
              {(showStartPicker || showEndPicker) && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_, selectedDate) => {
                    if (showStartPicker) {
                      handleDateChange('start', selectedDate || new Date());
                      setShowStartPicker(false);
                    } else if (showEndPicker) {
                      handleDateChange('end', selectedDate || new Date());
                      setShowEndPicker(false);
                    }
                  }}
                />
              )}
              <Button
                label={syncing ? 'Syncing...' : 'Apply Custom Range'}
                onPress={() => {
                  if (customStart && customEnd) {
                    const start = new Date(customStart).toISOString();
                    const end = new Date(customEnd).toISOString();
                    syncRange({start, end});
                  }
                }}
                disabled={syncing || !customStart || !customEnd}
                loading={syncing}
              />
            </View>
          ) : null}
        </Card>

        <Card title="Trend">
          <ChartSection
            data={chartData}
            suffix={config.suffix}
            metricLabel={config.label}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function DateRow({label, value, onPress}: {label: string; value: string; onPress: () => void}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#0f172a',
        borderColor: '#1f2937',
        borderWidth: 1,
        padding: 12,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
      <Text style={{color: '#cbd5e1'}}>{label}</Text>
      <Text style={{color: '#e2e8f0', fontWeight: '700'}}>{value}</Text>
    </TouchableOpacity>
  );
}

function ChartSection({
  data,
  suffix,
  metricLabel,
}: {
  data: {label: string; value: number}[];
  suffix?: string;
  metricLabel: string;
}) {
  const max = data.reduce((m, d) => (d.value > m ? d.value : m), 0);
  const displayData = data; // show entire range for week/month
  const barHeight = (value: number) => (max > 0 ? Math.max((value / max) * 120, 4) : 4);

  return (
    <View style={{gap: 12}}>
      <Text style={{color: '#94a3b8'}}>Trend ({displayData.length} days)</Text>
      {displayData.length === 0 ? (
        <Text style={{color: '#cbd5e1'}}>No data in range.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 10, paddingVertical: 6}}>
          {displayData.map(d => {
            const label = formatDateLabel(d.label);
            return (
              <View
                key={d.label}
                style={{
                  width: 36,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}>
                <View
                  style={{
                    width: 24,
                    height: barHeight(d.value),
                    backgroundColor: '#60a5fa',
                    borderRadius: 6,
                  }}
                />
                <Text style={{color: '#94a3b8', fontSize: 10, marginTop: 4}} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={{color: '#cbd5e1', fontSize: 10}}>
                  {d.value.toFixed(0)}
                  {suffix ? '' : ''}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}
