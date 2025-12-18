import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <Stack screenOptions={{
                headerShown: false,
                presentation: 'card', // Force card presentation to avoid sheet-related crashes
            }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="vital/[metric]" />
            </Stack>
        </SafeAreaProvider>
    );
}
