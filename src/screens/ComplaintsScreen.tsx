import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {
  ApiError,
  COMPLAINT_STATUS_OPTIONS,
  complaintCategoryLabel,
  complaintService,
  complaintStatusColor,
  complaintStatusLabel,
  formatComplaintDate,
} from '../services';
import {Complaint, ComplaintStatus} from '../types';
import {redirectIfUnauthorized} from '../utils/redirectUnauthorized';

type Props = NativeStackScreenProps<RootStackParamList, 'Complaints'>;
type StatusFilter = ComplaintStatus | 'all';

export function ComplaintsScreen({navigation}: Props) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const requestSeq = useRef(0);

  const loadComplaints = useCallback(
    async (mode: 'initial' | 'refresh', filter: StatusFilter) => {
      const seq = ++requestSeq.current;
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage('');
      try {
        const data = await complaintService.list(
          filter === 'all' ? undefined : filter,
        );
        if (seq !== requestSeq.current) {
          return;
        }
        setComplaints(data);
      } catch (error) {
        if (seq !== requestSeq.current) {
          return;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : 'Could not load your complaints.';
        if (await redirectIfUnauthorized(error, navigation)) {
          setErrorMessage(message);
          return;
        }
        setErrorMessage(message);
        if (mode === 'initial') {
          setComplaints([]);
        }
      } finally {
        if (seq === requestSeq.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      void loadComplaints('initial', statusFilter);
    }, [loadComplaints, statusFilter]),
  );

  const renderItem = ({item}: {item: Complaint}) => {
    const statusColor = complaintStatusColor(item.status);
    return (
      <Pressable
        style={styles.row}
        onPress={() =>
          navigation.navigate('ComplaintDetail', {complaintId: item.complaintId})
        }>
        <View style={styles.rowBody}>
          <Text style={styles.subject} allowFontScaling={false} numberOfLines={2}>
            {item.subject || 'Complaint'}
          </Text>
          <Text style={styles.meta} allowFontScaling={false}>
            {complaintCategoryLabel(item.category)}
          </Text>
          <Text style={styles.meta} allowFontScaling={false}>
            {formatComplaintDate(item.createdAt) || 'Date unavailable'}
          </Text>
        </View>
        <View style={styles.rowEnd}>
          <View style={[styles.badge, {backgroundColor: `${statusColor}22`}]}>
            <Text style={[styles.badgeText, {color: statusColor}]} allowFontScaling={false}>
              {complaintStatusLabel(item.status)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            My Complaints
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {COMPLAINT_STATUS_OPTIONS.map(option => {
            const selected = option.value === statusFilter;
            return (
              <Pressable
                key={option.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setStatusFilter(option.value)}>
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                  allowFontScaling={false}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={complaints}
            keyExtractor={item => item.complaintId}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.list,
              complaints.length === 0 && styles.listEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void loadComplaints('refresh', statusFilter)}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListHeaderComponent={
              errorMessage && complaints.length > 0 ? (
                <Text style={styles.listError} allowFontScaling={false}>
                  {errorMessage}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.empty} allowFontScaling={false}>
                  {errorMessage || 'You have not raised any complaint.'}
                </Text>
                {errorMessage ? (
                  <Pressable
                    style={styles.retry}
                    onPress={() => void loadComplaints('initial', statusFilter)}>
                    <Text style={styles.retryText} allowFontScaling={false}>
                      Try again
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <CustomButton
            title="Raise Complaint"
            onPress={() => navigation.navigate('RaiseComplaint')}
          />
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#111827',
    marginLeft: 4,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listError: {
    marginTop: 8,
    marginBottom: 4,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.error,
  },
  listEmpty: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  empty: {
    textAlign: 'center',
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  retry: {
    marginTop: 14,
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  rowBody: {
    flex: 1,
  },
  subject: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  meta: {
    marginTop: 3,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  rowEnd: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
});
