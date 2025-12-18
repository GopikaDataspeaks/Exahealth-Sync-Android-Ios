import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { computeRange } from '../../src/health/rangeUtils';
import { useHealthStore } from '../../src/state/healthStore';
import { Button, Card } from '../../src/ui/Primitives';
import { useFocusEffect } from '@react-navigation/native';

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
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; suffix?: string }
> = {
  steps: { label: 'Steps', icon: 'walk' },
  calories: { label: 'Calories', icon: 'fire', suffix: 'kcal' },
  distance: { label: 'Distance', icon: 'map-marker-distance', suffix: 'km' },
  sleep: { label: 'Sleep', icon: 'sleep', suffix: 'hrs' },
  active: { label: 'Active minutes', icon: 'run', suffix: 'min' },
  heart: { label: 'Heart rate', icon: 'heart-pulse', suffix: 'bpm' },
  bp: { label: 'Blood pressure', icon: 'heart', suffix: 'mmHg' },
  glucose: { label: 'Blood glucose', icon: 'water', suffix: 'mg/dL' },
  temperature: { label: 'Body temp', icon: 'thermometer', suffix: '°C' },
  oxygen: { label: 'Oxygen saturation', icon: 'heart-plus', suffix: '%' },
  respiratory: { label: 'Respiratory rate', icon: 'lungs', suffix: 'rpm' },
  weight: { label: 'Weight', icon: 'weight-kilogram', suffix: 'kg' },
};

export default function VitalsScreen() {
  const router = useRouter();
  const metrics = useHealthStore(s => s.metrics);
  const syncing = useHealthStore(s => s.syncing);
  const syncRange = useHealthStore(s => s.syncRange);
  const permissionGranted = useHealthStore(s => s.permissionResult?.granted === true);

  // Debug logging
  console.log('[VitalsScreen] Metrics:', JSON.stringify(metrics, null, 2));
  console.log('[VitalsScreen] Permission granted:', permissionGranted);
  console.log('[VitalsScreen] Syncing:', syncing);

  useFocusEffect(
    React.useCallback(() => {
      console.log('[VitalsScreen] useFocusEffect triggered - syncing today data');
      const { start, end } = computeRange('today');
      syncRange('today', start, end);
    }, [syncRange]),
  );

  const cards = (
    [
      'steps',
      'calories',
      'distance',
      'sleep',
      'active',
      'heart',
      'bp',
      'glucose',
      'temperature',
      'oxygen',
      'respiratory',
      'weight',
    ] as MetricKey[]
  ).map(
    key => {
      const config = metricConfig[key];
      let value = '--';
      const m = metrics;
      if (m) {
        switch (key) {
          case 'steps':
            value = m.steps != null ? m.steps.toLocaleString() : '--';
            break;
          case 'calories':
            value =
              m.calories != null ? `${m.calories.toFixed(0)} ${config.suffix}` : '--';
            break;
          case 'distance':
            value =
              m.distanceKm != null ? `${m.distanceKm.toFixed(2)} ${config.suffix}` : '--';
            break;
          case 'sleep':
            value =
              m.sleepMinutes != null
                ? `${(m.sleepMinutes / 60).toFixed(1)} ${config.suffix}`
                : '--';
            break;
          case 'active':
            value =
              m.activeMinutes != null ? `${m.activeMinutes} ${config.suffix}` : '--';
            break;
          case 'heart':
            value =
              m.averageHeartRate != null
                ? `${m.averageHeartRate.toFixed(0)} ${config.suffix}`
                : '--';
            break;
          case 'bp':
            value =
              m.bloodPressureSystolic != null && m.bloodPressureDiastolic != null
                ? `${m.bloodPressureSystolic.toFixed(0)}/${m.bloodPressureDiastolic.toFixed(0)}`
                : '--';
            break;
          case 'glucose':
            value =
              m.bloodGlucoseMgPerDl != null
                ? `${m.bloodGlucoseMgPerDl.toFixed(0)} ${config.suffix}`
                : '--';
            break;
          case 'temperature':
            value =
              m.bodyTemperatureC != null
                ? `${m.bodyTemperatureC.toFixed(1)} ${config.suffix}`
                : '--';
            break;
          case 'oxygen':
            value =
              m.oxygenSaturationPercent != null
                ? `${m.oxygenSaturationPercent.toFixed(0)} ${config.suffix}`
                : '--';
            break;
          case 'respiratory':
            value =
              m.respiratoryRate != null
                ? `${m.respiratoryRate.toFixed(0)} ${config.suffix}`
                : '--';
            break;
          case 'weight':
            value =
              m.weightKg != null ? `${m.weightKg.toFixed(1)} ${config.suffix}` : '--';
            break;
          default:
            value = '--';
        }
      }
      return { ...config, key, value };
    },
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} >
      <StatusBar style="light" backgroundColor="#0f172a" />
      <ScrollView
        style={{ backgroundColor: '#0b1224' }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
        <Card title="Vitals overview">
          <Text style={{ color: '#cbd5e1', marginBottom: 12 }}>
            Tap a card to view today’s value and chart by week, month, or custom range.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <Button
              label={syncing ? 'Syncing...' : 'Sync latest'}
              onPress={() => {
                const { start, end } = computeRange('today');
                syncRange('today', start, end);
              }}
              disabled={syncing}
              variant="secondary"
              loading={syncing}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {cards.map(card => (
              <TouchableOpacity
                key={card.key}
                style={{
                  width: '47%',
                  backgroundColor: '#0f172a',
                  borderRadius: 12,
                  padding: 12,
                  borderColor: '#1f2937',
                  borderWidth: 1,
                  gap: 6,
                }}
                onPress={() => router.push(`/vital/${card.key}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={20}
                    color="#22c55e"
                  />
                  <Text style={{ color: '#e2e8f0', fontWeight: '700' }}>
                    {card.label}
                  </Text>
                </View>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Latest</Text>
                <Text style={{ color: '#e2e8f0', fontSize: 20, fontWeight: '800' }}>
                  {card.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
