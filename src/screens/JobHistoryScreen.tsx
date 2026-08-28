import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {TakerTabBar} from '../components/home/TakerTabBar';
import {COLORS, FONTS} from '../constants';
import {ApiError, jobService} from '../services';
import {JobHistoryItem} from '../types';

const getJobId = (item: JobHistoryItem) => item.bookingId ?? item._id ?? '';
const getAmount = (item: JobHistoryItem) =>
  item.earnings ?? item.amount ?? item.price ?? item.totalAmount ?? 0;
const getDate = (item: JobHistoryItem) =>
  item.createdAt ?? item.bookingDate ?? item.date ?? '';

const formatLocationTitle = (address?: string, customerName?: string) => {
  if (customerName?.trim()) {
    return customerName;
  }
  if (!address?.trim()) {
    return 'Care Service';
  }
  return address.split(',')[0]?.trim() || address;
};

const formatDateTime = (value: string) => {
  if (!value) {
    return 'Date unavailable';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
  return `${datePart} • ${timePart}`;
};

const formatStatus = (status?: string) => {
  if (!status?.trim()) {
    return 'Unknown';
  }
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function JobHistoryScreen() {
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const history = await jobService.getJobHistory();
      setJobs(history.jobs);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not load your job history.';
      setErrorMessage(message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const renderItem = ({item}: {item: JobHistoryItem}) => {
    const amount = getAmount(item);
    return (
      <Pressable style={styles.historyRow}>
        <View style={styles.historyIconWrap}>
          <Ionicons name="medkit-outline" size={22} color="#111827" />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle} allowFontScaling={false} numberOfLines={1}>
            {formatLocationTitle(item.address, item.customerName)}
          </Text>
          <Text style={styles.historyMeta} allowFontScaling={false}>
            {formatDateTime(getDate(item))}
          </Text>
          <Text style={styles.historyMeta} allowFontScaling={false}>
            ₹{amount.toFixed(1)} • {formatStatus(item.status)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <Text style={styles.title} allowFontScaling={false}>
          My Jobs
        </Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item, index) => getJobId(item) || `job-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {errorMessage || 'No completed jobs yet. Go online to start receiving requests.'}
              </Text>
            }
          />
        )}
        <TakerTabBar active="Jobs" />
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
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  historyMeta: {
    marginTop: 3,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
});
