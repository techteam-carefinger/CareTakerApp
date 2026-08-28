import React, {useMemo, useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton, CustomInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService} from '../services';

const LOGO = require('../../assets/logo.png');

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({navigation}: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isValidPhone = phone.length === 10;
  const showError = phone.length > 0 && phone.length < 10;
  const errorText = showError ? 'Enter valid 10-digit mobile number' : undefined;

  const isLoginDisabled = !isValidPhone || isSending;

  const onChangePhone = (text: string) => {
    const numericOnly = text.replace(/\D/g, '').slice(0, 10);
    setPhone(numericOnly);
  };

  const onLogin = async () => {
    if (!isValidPhone || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await authService.sendOtp(phone);
      navigation.navigate('OtpVerification', {
        phoneNumber: phone,
        keepSignedIn: true,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not send OTP. Please try again.';
      Alert.alert('OTP failed', message);
    } finally {
      setIsSending(false);
    }
  };

  const legalText = useMemo(
    () => ({
      leading:
        'By continuing, you confirm that you are 18 years of age and agree to the ',
      terms: 'Terms & Conditions',
      middle: ' and ',
      privacy: 'Privacy Policy',
      trailing: '.',
    }),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={styles.brandSection}>
            <Image source={LOGO} resizeMode="contain" style={styles.logo} />
            <Text style={styles.appName}>CareTaker</Text>
            <Text style={styles.tagline}>Earn by providing care services.</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Mobile Number</Text>
            <CustomInput
              value={phone}
              onChangeText={onChangePhone}
              placeholder="Enter 10-digit number"
              prefix="+91"
              keyboardType="number-pad"
              maxLength={10}
              error={errorText}
              style={styles.phoneInput}
            />

            <CustomButton
              title="Login"
              onPress={onLogin}
              disabled={isLoginDisabled}
              loading={isSending}
              style={styles.loginButton}
            />
          </View>

          <Text style={styles.footerText}>
            {legalText.leading}
            <Text
              style={styles.footerLink}
              suppressHighlighting
              onPress={() => navigation.navigate('TermsAndConditions')}>
              {legalText.terms}
            </Text>
            {legalText.middle}
            <Text
              style={styles.footerLink}
              suppressHighlighting
              onPress={() => navigation.navigate('PrivacyPolicy')}>
              {legalText.privacy}
            </Text>
            {legalText.trailing}
          </Text>
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
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 20,
  },
  brandSection: {
    alignItems: 'center',
  },
  logo: {
    width: 168,
    height: 168,
  },
  appName: {
    marginTop: 8,
    fontSize: 32,
    lineHeight: 40,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    marginTop: 40,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  phoneInput: {
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 12,
  },
  footerText: {
    marginTop: 'auto',
    paddingTop: 32,
    paddingBottom: 8,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  footerLink: {
    color: COLORS.link,
    fontFamily: FONTS.medium,
    textDecorationLine: 'underline',
  },
});
