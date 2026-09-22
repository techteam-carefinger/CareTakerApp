import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {
  ApiError,
  complaintCategoryLabel,
  complaintService,
  complaintStatusColor,
  complaintStatusLabel,
  formatComplaintDate,
  jobService,
  storage,
} from '../services';
import {Complaint} from '../types';
import {toActiveJobParams} from '../utils/jobNav';
import {redirectIfUnauthorized} from '../utils/redirectUnauthorized';

type Props = NativeStackScreenProps<RootStackParamList, 'ComplaintDetail'>;

export function ComplaintDetailScreen({navigation, route}: Props) {
  const {complaintId, initialComplaint} = route.params;
  const seededComplaint =
    initialComplaint?.complaintId === complaintId ? initialComplaint : null;
  const [complaint, setComplaint] = useState<Complaint | null>(seededComplaint);
  const hasComplaint = useRef(Boolean(seededComplaint));
  const [isLoading, setIsLoading] = useState(!seededComplaint);
  const [errorMessage, setErrorMessage] = useState('');
  const [canOpenBooking, setCanOpenBooking] = useState(false);

  const loadComplaint = useCallback(async () => {
    if (!hasComplaint.current) {
      setIsLoading(true);
    }
    setErrorMessage('');
    try {
      const data = await complaintService.get(complaintId);
      hasComplaint.current = true;
      setComplaint(data);
      if (!data.bookingId) {
        setCanOpenBooking(false);
        return;
      }
      let job = await storage.getCurrentJob();
      if (!job || job.bookingId !== data.bookingId) {
        try {
          job = await jobService.getCurrentJob();
        } catch {
          job = null;
        }
      }
      setCanOpenBooking(
        Boolean(job && job.bookingId === data.bookingId && toActiveJobParams(job)),
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not load this complaint.';
      if (await redirectIfUnauthorized(error, navigation)) {
        setErrorMessage(message);
        return;
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [complaintId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void loadComplaint();
    }, [loadComplaint]),
  );

  const openBooking = async () => {
    if (!complaint?.bookingId) {
      return;
    }
    let job = await storage.getCurrentJob();
    if (!job || job.bookingId !== complaint.bookingId) {
      try {
        job = await jobService.getCurrentJob();
      } catch {
        job = null;
      }
    }
    if (!job || job.bookingId !== complaint.bookingId) {
      return;
    }
    const params = toActiveJobParams(job);
    if (!params) {
      return;
    }
    navigation.navigate('ActiveJob', params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Complaint
          </Text>
        </View>

        {isLoading && !complaint ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : errorMessage && !complaint ? (
          <View style={styles.center}>
            <Text style={styles.error} allowFontScaling={false}>
              {errorMessage}
            </Text>
            <Pressable style={styles.retry} onPress={() => void loadComplaint()}>
              <Text style={styles.retryText} allowFontScaling={false}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : complaint ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.subject} allowFontScaling={false}>
              {complaint.subject}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.category} allowFontScaling={false}>
                {complaintCategoryLabel(complaint.category)}
              </Text>
              <View
                style={[
                  styles.badge,
                  {backgroundColor: `${complaintStatusColor(complaint.status)}22`},
                ]}>
                <Text
                  style={[
                    styles.badgeText,
                    {color: complaintStatusColor(complaint.status)},
                  ]}
                  allowFontScaling={false}>
                  {complaintStatusLabel(complaint.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel} allowFontScaling={false}>
              Description
            </Text>
            <Text style={styles.body} allowFontScaling={false}>
              {complaint.description}
            </Text>

            <Text style={styles.sectionLabel} allowFontScaling={false}>
              Created
            </Text>
            <Text style={styles.body} allowFontScaling={false}>
              {formatComplaintDate(complaint.createdAt) || 'Date unavailable'}
            </Text>

            {complaint.adminNote.trim() ? (
              <>
                <Text style={styles.sectionLabel} allowFontScaling={false}>
                  Admin reply
                </Text>
                <Text style={styles.body} allowFontScaling={false}>
                  {complaint.adminNote.trim()}
                </Text>
              </>
            ) : null}

            {complaint.status === 'resolved' ? (
              <>
                <Text style={styles.sectionLabel} allowFontScaling={false}>
                  Resolved
                </Text>
                <Text style={styles.body} allowFontScaling={false}>
                  {formatComplaintDate(complaint.resolvedAt) || 'Date unavailable'}
                </Text>
              </>
            ) : null}

            {complaint.bookingId ? (
              <>
                <Text style={styles.sectionLabel} allowFontScaling={false}>
                  Booking
                </Text>
                {canOpenBooking ? (
                  <Pressable onPress={() => void openBooking()}>
                    <Text style={styles.bookingLink} allowFontScaling={false}>
                      {complaint.bookingId}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.body} allowFontScaling={false}>
                    {complaint.bookingId}
                  </Text>
                )}
              </>
            ) : null}

            {errorMessage ? (
              <Text style={styles.inlineError} allowFontScaling={false}>
                {errorMessage}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  subject: {
    marginTop: 8,
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#111827',
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  category: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#4B5563',
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
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#6B7280',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
  },
  bookingLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  error: {
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
  inlineError: {
    marginTop: 20,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.error,
  },
});
