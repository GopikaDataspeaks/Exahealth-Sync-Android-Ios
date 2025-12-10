import React from 'react';
import {ScrollView, StatusBar, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHealthStore} from '../../src/state/healthStore';
import {Button, Card, Tag} from '../../src/ui/Primitives';

export default function SettingsScreen() {
  const permissionResult = useHealthStore(s => s.permissionResult);
  const requestPermissions = useHealthStore(s => s.requestPermissions);
  const syncing = useHealthStore(s => s.syncing);
  const syncRange = useHealthStore(s => s.syncRange);
  const permissionGranted = permissionResult?.granted === true;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0f172a'}}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        style={{flex: 1, backgroundColor: '#0b1224'}}
        contentContainerStyle={{padding: 16, gap: 12}}>
        <Card title="Permissions">
          <Text style={{color: '#cbd5e1', marginBottom: 8}}>
            {permissionGranted
              ? 'Permissions granted. You can sync data.'
              : 'Waiting for permission. Tap the request button below.'}
          </Text>
          {permissionResult?.details?.length ? (
            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
              {permissionResult.details.map(detail => (
                <Tag key={detail} label={detail} />
              ))}
            </View>
          ) : null}
          <View style={{height: 12}} />
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
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
