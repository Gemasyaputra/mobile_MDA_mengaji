import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Mengimpor layar-layar kita
import DevLoginScreen from './src/screens/DevLoginScreen';
import ParentTabs from './src/navigation/ParentTabs';
import TeacherHome from './src/screens/TeacherHome';
import TeacherAttendanceScreen from './src/screens/TeacherAttendanceScreen';
import TeacherInputNgajiScreen from './src/screens/TeacherInputNgajiScreen';
import TeacherInputHafalanScreen from './src/screens/TeacherInputHafalanScreen';
import ParentQRLoginScreen from './src/screens/ParentQRLoginScreen';
import ParentHistoryScreen from './src/screens/ParentHistoryScreen';
import ParentKabarDetailScreen from './src/screens/ParentKabarDetailScreen';
import TeacherSantriListScreen from './src/screens/TeacherSantriListScreen';
import TeacherSantriDetailScreen from './src/screens/TeacherSantriDetailScreen';
import TeacherKabarScreen from './src/screens/TeacherKabarScreen';
import TeacherKabarFormScreen from './src/screens/TeacherKabarFormScreen';
import TeacherActivityLogScreen from './src/screens/TeacherActivityLogScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="DevLogin">
        <Stack.Screen 
          name="DevLogin" 
          component={DevLoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentTabs"
          component={ParentTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TeacherHome" 
          component={TeacherHome} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="TeacherAttendance" 
          component={TeacherAttendanceScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="TeacherInputNgaji" 
          component={TeacherInputNgajiScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="TeacherInputHafalan" 
          component={TeacherInputHafalanScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="ParentQRLogin"
          component={ParentQRLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentHistory"
          component={ParentHistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentKabarDetail"
          component={ParentKabarDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeacherSantriList"
          component={TeacherSantriListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeacherSantriDetail"
          component={TeacherSantriDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeacherKabar"
          component={TeacherKabarScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeacherKabarForm"
          component={TeacherKabarFormScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeacherActivityLog"
          component={TeacherActivityLogScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
