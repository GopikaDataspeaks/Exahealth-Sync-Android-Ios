import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('healthSyncAuthToken');
        const profileId = await AsyncStorage.getItem('healthSyncPatientProfileId');
        setIsAuthenticated(Boolean(token && profileId));
      } finally {
        setReady(true);
      }
    };
    checkAuth();
  }, []);

  if (!ready) return null;

  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/login'} />;
}
