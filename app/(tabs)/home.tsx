import { Link } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeRange } from '../../src/health/rangeUtils';
import { useHealthStore } from '../../src/state/healthStore';
import { Card } from '../../src/ui/Primitives';

export default function HomeScreen() {
  const permissionResult = useHealthStore(s => s.permissionResult);
  const syncRange = useHealthStore(s => s.syncRange);
  const syncing = useHealthStore(s => s.syncing);
  const initialSynced = useHealthStore(s => s.initialSynced);
  const setInitialSynced = useHealthStore(s => s.setInitialSynced);

  useEffect(() => {
    if (permissionResult?.granted && !initialSynced && !syncing) {
      const { start, end } = computeRange('today');
      setInitialSynced(true);
      syncRange('today', start, end);
    }
  }, [permissionResult, initialSynced, syncing, syncRange, setInitialSynced]);

  const permissionGranted = permissionResult?.granted === true;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0b1224' }}
        contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View
          style={{
            backgroundColor: '#0f172a',
            padding: 20,
            borderRadius: 16,
            borderColor: '#1f2937',
            borderWidth: 1,
          }}>
          <Text style={{ color: '#cbd5f5', fontSize: 12 }}>Health Connect</Text>
          <Text
            style={{ color: '#e2e8f0', fontSize: 26, fontWeight: '800', marginTop: 6 }}>
            Health Sync Hub
          </Text>
          <Text style={{ color: '#94a3b8', marginTop: 6, lineHeight: 20 }}>
            View your vitals in the Vitals tab. Manage permissions and sync from Settings. Data is
            stored locally so it persists across refreshes.
          </Text>
          <Text style={{ color: '#94a3b8', marginTop: 8 }}>
            Platform detected: {permissionGranted ? 'Ready' : 'Awaiting permission'}.
          </Text>
        </View>

        <Card title="Quick Links">
          <View style={{ gap: 12 }}>
            <Link href="/(tabs)/vitals" style={{ color: '#38bdf8', fontWeight: '700' }}>
              Go to Vitals
            </Link>
            <Link href="/(tabs)/settings" style={{ color: '#38bdf8', fontWeight: '700' }}>
              Manage Permissions
            </Link>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
