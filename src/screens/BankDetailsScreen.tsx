import React, {useEffect, useState} from 'react';
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
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton, CustomInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';

type BankDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'BankDetails'
>;

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function BankDetailsScreen({navigation, route}: BankDetailsScreenProps) {
  const {phoneNumber} = route.params;

  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = await storage.getLocalProfile();
      if (cancelled || !local) {
        return;
      }
      setAccountHolderName(local.accountHolderName ?? '');
      setBankName(local.bankName ?? '');
      setAccountNumber(local.accountNumber ?? '');
      setIfscCode(local.ifscCode ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedHolderName = accountHolderName.trim();
  const trimmedBankName = bankName.trim();
  const trimmedAccountNumber = accountNumber.trim();
  const trimmedIfsc = ifscCode.trim().toUpperCase();

  const holderNameError =
    accountHolderName.length === 0
      ? undefined
      : trimmedHolderName.length < 3
        ? 'Enter the account holder name'
        : undefined;
  const bankNameError =
    bankName.length === 0
      ? undefined
      : trimmedBankName.length < 3
        ? 'Enter a valid bank name'
        : undefined;
  const accountNumberError =
    accountNumber.length === 0
      ? undefined
      : trimmedAccountNumber.length < 9 || trimmedAccountNumber.length > 18
        ? 'Enter a valid account number'
        : undefined;
  const ifscError =
    ifscCode.length === 0
      ? undefined
      : IFSC_REGEX.test(trimmedIfsc)
        ? undefined
        : 'Enter a valid IFSC code';

  const isSignUpDisabled =
    trimmedHolderName.length < 3 ||
    trimmedBankName.length < 3 ||
    trimmedAccountNumber.length < 9 ||
    trimmedAccountNumber.length > 18 ||
    !IFSC_REGEX.test(trimmedIfsc) ||
    isSaving;

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('RegistrationDocuments', {phoneNumber});
  };

  const onSignUp = async () => {
    if (isSignUpDisabled) {
      return;
    }

    setIsSaving(true);
    try {
      const user = await authService.updateProfile({
        accountHolderName: trimmedHolderName,
        bankName: trimmedBankName,
        accountNumber: trimmedAccountNumber,
        ifscCode: trimmedIfsc,
      });
      await storage.setLocalProfile({
        ...(await storage.getLocalProfile()),
        accountHolderName: trimmedHolderName,
        bankName: trimmedBankName,
        accountNumber: trimmedAccountNumber,
        ifscCode: trimmedIfsc,
        registrationStep: 'done',
      });
      const synced = await authService.syncDashboard();
      const nextUser = synced ?? user;
      navigation.reset({
        index: 0,
        routes: [{name: nextUser.isApproved ? 'Home' : 'PendingApproval'}],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your bank details. Please try again.';
      Alert.alert('Sign up failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </Pressable>

          <View style={styles.iconCircle}>
            <Ionicons name="card-outline" size={34} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Bank Details</Text>
          <Text style={styles.subtitle}>
            Add your payout account to receive earnings from care services.
          </Text>

          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="Account Holder Name"
              autoCapitalize="words"
              error={holderNameError}
            />
          </View>
          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={bankName}
              onChangeText={setBankName}
              placeholder="Bank Name"
              autoCapitalize="words"
              error={bankNameError}
            />
          </View>
          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={accountNumber}
              onChangeText={value =>
                setAccountNumber(value.replace(/\D/g, '').slice(0, 18))
              }
              placeholder="Account Number"
              keyboardType="number-pad"
              maxLength={18}
              error={accountNumberError}
            />
          </View>
          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={ifscCode}
              onChangeText={value =>
                setIfscCode(value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11).toUpperCase())
              }
              placeholder="IFSC Code (e.g. HDFC0001234)"
              autoCapitalize="characters"
              maxLength={11}
              error={ifscError}
            />
          </View>

          <View style={styles.buttonWrap}>
            <CustomButton
              title="Sign Up"
              onPress={onSignUp}
              disabled={isSignUpDisabled}
              loading={isSaving}
              style={styles.signUpButton}
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
    backgroundColor: COLORS.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E7F3F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    paddingHorizontal: 18,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  fieldGap: {
    marginTop: 12,
  },
  buttonWrap: {
    marginTop: 'auto',
    paddingTop: 28,
  },
  signUpButton: {
    borderRadius: 999,
    backgroundColor: '#8EB6C8',
  },
});
