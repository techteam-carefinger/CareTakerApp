import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {TakerTabBar} from '../components/home/TakerTabBar';
import {COLORS, FONTS} from '../constants';
import {jobService, storage} from '../services';
import {EarningsData} from '../types';

const EMPTY_EARNINGS: EarningsData = {
  today: 0,
  week: 0,
  month: 0,
  total: 0,
  jobsToday: 0,
  minutesToday: 0,
};

const formatMoney = (value: number) => `₹${value.toFixed(0)}`;

export function EarningsScreen() {
  const [earnings, setEarnings] = useState<EarningsData>(EMPTY_EARNINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await jobService.getEarnings();
      setEarnings(data);
    } catch {
      const user = await storage.getUser();
      setEarnings({
        ...EMPTY_EARNINGS,
        today: user?.todayEarnings ?? 0,
        total: user?.totalEarnings ?? 0,
      });
      setErrorMessage('Showing cached earnings until the server responds.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <Text style={styles.title} allowFontScaling={false}>
          Earnings
        </Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel} allowFontScaling={false}>
                Today
              </Text>
              <Text style={styles.heroValue} allowFontScaling={false}>
                {formatMoney(earnings.today)}
              </Text>
              <Text style={styles.heroMeta} allowFontScaling={false}>
                {earnings.jobsToday} jobs • {earnings.minutesToday} min
              </Text>
            </View>
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This week</Text>
                <Text style={styles.statValue}>{formatMoney(earnings.week)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This month</Text>
                <Text style={styles.statValue}>{formatMoney(earnings.month)}</Text>
              </View>
              <View style={[styles.statCard, styles.statWide]}>
                <Text style={styles.statLabel}>Lifetime</Text>
                <Text style={styles.statValue}>{formatMoney(earnings.total)}</Text>
              </View>
            </View>
            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}
          </>
        )}
        <TakerTabBar active="Earnings" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#111827',
    marginBottom: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: '#ECF8FA',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#4B5563',
  },
  heroValue: {
    marginTop: 6,
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: COLORS.primary,
  },
  heroMeta: {
    marginTop: 6,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
  },
  statWide: {
    width: '100%',
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  statValue: {
    marginTop: 8,
    fontFamily: FONTS.semiBold,
    fontSize: 22,
    color: '#111827',
  },
  error: {
    marginTop: 16,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
});
