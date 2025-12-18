import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHealthStore } from '../../src/state/healthStore';
import { Button, Card, Tag } from '../../src/ui/Primitives';
import { getSyncDataFilePath, readSyncDataDump } from '../../src/storage/fileStorage';
import * as FileSystem from 'expo-file-system/legacy';

export default function SettingsScreen() {
  const permissionResult = useHealthStore(s => s.permissionResult);
  const requestPermissions = useHealthStore(s => s.requestPermissions);
  const syncing = useHealthStore(s => s.syncing);
  const syncRange = useHealthStore(s => s.syncRange);
  const flushQueue = useHealthStore(s => s.flushQueue);
  const permissionGranted = permissionResult?.granted === true;

  const handleTestFileDump = async () => {
    const path = await getSyncDataFilePath();
    const data = await readSyncDataDump();
    alert(`File Path:\n${path}\n\nEntries: ${data.length}`);
  };

  const clearDump = async () => {
    const path = await getSyncDataFilePath();
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
      alert('Local dump cleared');
    } catch (e) {
      alert('Failed to clear dump');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0b1224' }}
        contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card title="Permissions">
          <Text style={{ color: '#cbd5e1', marginBottom: 8 }}>
            {permissionGranted
              ? 'Permissions granted. You can sync data.'
              : 'Waiting for permission. Tap the request button below.'}
          </Text>
          {permissionResult?.details?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {permissionResult.details.map(detail => (
                <Tag key={detail} label={detail} />
              ))}
            </View>
          ) : null}
          <View style={{ height: 12 }} />
          <Button label="Request Permissions" onPress={requestPermissions} variant="primary" />
        </Card>

        <Card title="Actions">
          <Button
            label={syncing ? 'Syncing...' : 'Sync latest'}
            onPress={() => {
              const end = new Date();
              const start = new Date();
              syncRange('today', start.toISOString(), end.toISOString());
            }}
            disabled={!permissionGranted || syncing}
            variant="secondary"
            loading={syncing}
          />
          <View style={{ height: 12 }} />
          <Button
            label="Push queued data to server"
            onPress={flushQueue}
            variant="secondary"
          />
        </Card>

        <Card title="Local Storage (Debug)">
          <Text style={{ color: '#cbd5e1', marginBottom: 8 }}>
            Since the server is currently unavailable, data is being saved to a local JSON file on the device.
          </Text>
          <Button
            label="Check Local Dump File"
            onPress={handleTestFileDump}
            variant="secondary"
          />
          <View style={{ height: 12 }} />
          <Button
            label="Clear Local Dump"
            onPress={clearDump}
            variant="secondary"
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
