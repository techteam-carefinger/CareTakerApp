import React, {useCallback, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';

type PendingApprovalScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'PendingApproval'
>;

export function PendingApprovalScreen({
  navigation,
}: PendingApprovalScreenProps) {
  const [name, setName] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const openDashboard = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Home'}],
    });
  }, [navigation]);

  const checkApproval = useCallback(
    async (silent = false) => {
      setIsChecking(true);
      try {
        const user = await authService.me();
        setName(user.name?.trim() ?? '');
        if (user.isApproved) {
          openDashboard();
        } else if (!silent) {
          Alert.alert(
            'Still under review',
            'Your provider account is not approved yet. Dashboard details will open after approval.',
          );
        }
      } catch (error) {
        if (!silent) {
          const message =
            error instanceof Error
              ? error.message
              : 'Could not check approval status. Please try again.';
          Alert.alert('Check failed', message);
        }
      } finally {
        setIsChecking(false);
      }
    },
    [openDashboard],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const stored = await storage.getUser();
        if (!cancelled && stored?.name) {
          setName(stored.name.trim());
        }
        if (!cancelled) {
          await checkApproval(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [checkApproval]),
  );

  const onLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await authService.logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.hello} allowFontScaling={false}>
          {name ? `Hello, ${name}` : 'Hello'}
        </Text>
        <Text style={styles.title} allowFontScaling={false}>
          Waiting for approval
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          Your signup is complete. Earnings, bookings, and Go Online will
          appear on the dashboard only after your provider account is approved.
        </Text>
        <View style={styles.actions}>
          <CustomButton
            title="Check approval status"
            onPress={() => void checkApproval(false)}
            loading={isChecking}
            style={styles.primaryButton}
          />
          <Pressable onPress={onLogout} disabled={isChecking} hitSlop={8}>
            <Text style={styles.logoutText} allowFontScaling={false}>
              Logout
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E7F3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: {
    marginTop: 22,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  title: {
    marginTop: 6,
    fontFamily: FONTS.bold,
    fontSize: 26,
    lineHeight: 34,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 32,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  logoutText: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
