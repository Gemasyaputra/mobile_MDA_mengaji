import * as React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

// Mengimpor layar-layar kita
import DevLoginScreen from './src/screens/DevLoginScreen';
import ParentTabs from './src/navigation/ParentTabs';
import TeacherHome from './src/screens/TeacherHome';
import TeacherAttendanceScreen from './src/screens/TeacherAttendanceScreen';
import TeacherInputNgajiScreen from './src/screens/TeacherInputNgajiScreen';
import TeacherInputHafalanScreen from './src/screens/TeacherInputHafalanScreen';
import TeacherInputIbadahScreen from './src/screens/TeacherInputIbadahScreen';
import ParentQRLoginScreen from './src/screens/ParentQRLoginScreen';
import ParentHistoryScreen from './src/screens/ParentHistoryScreen';
import KabarDetailScreen from './src/screens/KabarDetailScreen';
import ParentInputSalatScreen from './src/screens/ParentInputSalatScreen';
import ParentBankMateriScreen from './src/screens/ParentBankMateriScreen';
import ParentMateriDetailScreen from './src/screens/ParentMateriDetailScreen';
import TeacherSantriListScreen from './src/screens/TeacherSantriListScreen';
import TeacherSantriDetailScreen from './src/screens/TeacherSantriDetailScreen';
import TeacherKabarScreen from './src/screens/TeacherKabarScreen';
import TeacherKabarFormScreen from './src/screens/TeacherKabarFormScreen';
import TeacherActivityLogScreen from './src/screens/TeacherActivityLogScreen';
import TeacherProfileScreen from './src/screens/TeacherProfileScreen';
import { AlertProvider } from './src/components/CustomAlert';

const Stack = createNativeStackNavigator();

// Deep link mdamengaji://kabar/<id> (mis. dibuka lewat tombol "Buka di Aplikasi" pada
// halaman web publik kabar) langsung ke halaman detail kabar, tanpa perlu login dulu.
const linking: LinkingOptions<any> = {
  prefixes: [Linking.createURL('/'), 'mdamengaji://'],
  config: {
    screens: {
      KabarDetail: 'kabar/:id',
    },
  },
};

export default function App() {
  return (
    <AlertProvider>
    <NavigationContainer linking={linking}>
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
          name="TeacherInputIbadah"
          component={TeacherInputIbadahScreen}
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
          name="KabarDetail"
          component={KabarDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentInputSalat"
          component={ParentInputSalatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentBankMateri"
          component={ParentBankMateriScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentMateriDetail"
          component={ParentMateriDetailScreen}
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
        <Stack.Screen
          name="TeacherProfile"
          component={TeacherProfileScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </AlertProvider>
  );
}
