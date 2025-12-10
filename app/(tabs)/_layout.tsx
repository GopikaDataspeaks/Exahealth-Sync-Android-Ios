import {Tabs} from 'expo-router';
import React from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialIcons, Ionicons} from '@expo/vector-icons';

const TabIcon = ({
  focused,
  render,
  title,
}: {
  focused: boolean;
  render: React.ReactNode;
  title: string;
}) => (
  <View style={{flex: 1, marginTop: 6, alignItems: 'center'}}>
    {render}
    <Text
      style={{
        color: focused ? '#22c55e' : '#94a3b8',
        fontWeight: focused ? '700' : '500',
        fontSize: 12,
        marginTop: 4,
      }}>
      {title}
    </Text>
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          position: 'absolute',
          borderTopColor: '#1f2937',
          borderTopWidth: 0.5,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
          zIndex: 100,
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              title="Home"
              render={<MaterialIcons name="home-filled" size={24} color={focused ? '#22c55e' : '#94a3b8'} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vitals"
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              title="Vitals"
              render={<Ionicons name="fitness" size={24} color={focused ? '#22c55e' : '#94a3b8'} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              title="Settings"
              render={<MaterialIcons name="settings" size={24} color={focused ? '#22c55e' : '#94a3b8'} />}
            />
          ),
        }}
      />
    </Tabs>
  );
}
