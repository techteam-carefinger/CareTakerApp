import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {LoginScreen} from '../screens/LoginScreen';
import {OtpVerificationScreen} from '../screens/OtpVerificationScreen';
import {ProfileSetupScreen} from '../screens/ProfileSetupScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {EarningsScreen} from '../screens/EarningsScreen';
import {JobHistoryScreen} from '../screens/JobHistoryScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {ProfileDetailsScreen} from '../screens/ProfileDetailsScreen';
import {EditProfileFieldScreen} from '../screens/EditProfileFieldScreen';
import {ActiveJobScreen} from '../screens/ActiveJobScreen';
import {ServiceCompleteScreen} from '../screens/ServiceCompleteScreen';
import {
  PrivacyPolicyScreen,
  TermsAndConditionsScreen,
} from '../screens/TermsAndConditionsScreen';
import {COLORS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, RestoredSession} from '../services';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const [session, setSession] = useState<RestoredSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const restored = await authService.restoreSession();
      if (!cancelled) {
        setSession(restored);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <View style={styles.bootScreen}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{headerShown: false}}
          initialRouteName={session.route}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            initialParams={{
              phoneNumber:
                session.route === 'ProfileSetup' ? session.phoneNumber : '',
            }}
          />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />
          <Stack.Screen name="JobHistory" component={JobHistoryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
          <Stack.Screen name="EditProfileField" component={EditProfileFieldScreen} />
          <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
          <Stack.Screen name="ServiceComplete" component={ServiceCompleteScreen} />
          <Stack.Screen
            name="TermsAndConditions"
            component={TermsAndConditionsScreen}
          />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});

export default App;
