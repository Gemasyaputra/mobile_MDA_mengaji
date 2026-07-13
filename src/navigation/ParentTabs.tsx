import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ParentDashboard from '../screens/ParentDashboard';
import ParentProgressScreen from '../screens/ParentProgressScreen';
import ParentKabarScreen from '../screens/ParentKabarScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Ringkasan: 'home',
  Progres: 'stats-chart',
  Kabar: 'megaphone',
};

export default function ParentTabs({ route }: any) {
  const { slug } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[tabRoute.name] : (`${TAB_ICONS[tabRoute.name]}-outline` as any)}
            size={size}
            color={color}
          />
        ),
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 62,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Ringkasan" component={ParentDashboard} initialParams={{ slug }} />
      <Tab.Screen name="Progres" component={ParentProgressScreen} initialParams={{ slug }} />
      <Tab.Screen name="Kabar" component={ParentKabarScreen} />
    </Tab.Navigator>
  );
}
