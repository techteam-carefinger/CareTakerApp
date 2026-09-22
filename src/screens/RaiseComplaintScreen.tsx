import React, {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CustomButton, CustomInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {
  ApiError,
  COMPLAINT_CATEGORY_OPTIONS,
  complaintService,
} from '../services';
import {ComplaintCategory} from '../types';
import {redirectIfUnauthorized} from '../utils/redirectUnauthorized';

type Props = NativeStackScreenProps<RootStackParamList, 'RaiseComplaint'>;

const SUBJECT_MAX = 150;
const DESCRIPTION_MAX = 2000;

export function RaiseComplaintScreen({navigation, route}: Props) {
  const bookingId = route.params?.bookingId?.trim() || '';
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectError, setSubjectError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const onSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    const nextSubjectError = trimmedSubject ? '' : 'Subject is required';
    const nextDescriptionError = trimmedDescription
      ? ''
      : 'Description is required';
    setSubjectError(nextSubjectError);
    setDescriptionError(nextDescriptionError);
    if (nextSubjectError || nextDescriptionError || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await complaintService.create({
        subject: trimmedSubject,
        description: trimmedDescription,
        category,
        bookingId: bookingId || undefined,
      });
      Alert.alert('Complaint registered successfully', undefined, [
        {
          text: 'OK',
          onPress: () => {
            if (created?.complaintId) {
              navigation.replace('ComplaintDetail', {
                complaintId: created.complaintId,
                initialComplaint: created,
              });
              return;
            }
            navigation.replace('Complaints');
          },
        },
      ]);
    } catch (error) {
      if (await redirectIfUnauthorized(error, navigation)) {
        return;
      }
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong.';
      Alert.alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={isSubmitting}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Raise Complaint
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.label} allowFontScaling={false}>
            Subject
          </Text>
          <CustomInput
            value={subject}
            onChangeText={text => {
              setSubject(text);
              if (subjectError) {
                setSubjectError('');
              }
            }}
            placeholder="Subject"
            maxLength={SUBJECT_MAX}
            autoCapitalize="sentences"
            editable={!isSubmitting}
            error={subjectError || undefined}
          />

          <Text style={styles.label} allowFontScaling={false}>
            Category
          </Text>
          <View style={styles.categories}>
            {COMPLAINT_CATEGORY_OPTIONS.map(option => {
              const selected = option.value === category;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  disabled={isSubmitting}
                  onPress={() => setCategory(option.value)}>
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                    allowFontScaling={false}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label} allowFontScaling={false}>
            Description
          </Text>
          <CustomInput
            value={description}
            onChangeText={text => {
              setDescription(text);
              if (descriptionError) {
                setDescriptionError('');
              }
            }}
            placeholder="Describe your complaint"
            maxLength={DESCRIPTION_MAX}
            autoCapitalize="sentences"
            multiline
            editable={!isSubmitting}
            error={descriptionError || undefined}
            style={styles.description}
          />

          {bookingId ? (
            <View style={styles.bookingBlock}>
              <Text style={styles.label} allowFontScaling={false}>
                Booking
              </Text>
              <Text style={styles.bookingValue} allowFontScaling={false}>
                {bookingId}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <CustomButton
              title="Submit complaint"
              onPress={() => void onSubmit()}
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  label: {
    marginBottom: 8,
    marginTop: 16,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#111827',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 14,
    color: '#111827',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  description: {
    height: 160,
  },
  bookingBlock: {
    marginTop: 4,
  },
  bookingValue: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#4B5563',
  },
  footer: {
    marginTop: 24,
  },
});
