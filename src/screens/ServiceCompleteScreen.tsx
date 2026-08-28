import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceComplete'>;

const DEFAULT_RATE = 1.49;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function ServiceCompleteScreen({navigation, route}: Props) {
  const {
    minutes,
    ratePerMinute = DEFAULT_RATE,
    earnings,
    customerName = 'Patient',
  } = route.params;
  const billedMinutes = Math.max(1, Math.round(minutes));

  const amount = useMemo(() => {
    if (typeof earnings === 'number') {
      return roundMoney(earnings);
    }
    return roundMoney(billedMinutes * ratePerMinute);
  }, [billedMinutes, earnings, ratePerMinute]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
        </View>
        <Text style={styles.title} allowFontScaling={false}>
          Service complete
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          You finished care for {customerName}.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Minutes served</Text>
            <Text style={styles.value}>{billedMinutes} min</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rate</Text>
            <Text style={styles.value}>₹{ratePerMinute}/min</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Your earnings</Text>
            <Text style={styles.totalValue}>₹{amount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <CustomButton title="Back to Home" onPress={() => navigation.replace('Home')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    marginTop: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#6B7280',
  },
  value: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  totalValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
});
