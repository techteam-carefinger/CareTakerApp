import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton, OTPInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {useOtpAutoRead} from '../hooks';
import {RootStackParamList} from '../navigation/types';
import {authService} from '../services';

type OtpVerificationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OtpVerification'
>;

const OTP_LENGTH = 6;
const INITIAL_TIMER_SECONDS = 30;

const formatPhoneNumber = (phoneNumber: string) => {
  const numericOnly = phoneNumber.replace(/\D/g, '').slice(-10);
  if (numericOnly.length !== 10) {
    return `+91 ${numericOnly}`;
  }
  return `+91 ${numericOnly.slice(0, 5)} ${numericOnly.slice(5)}`;
};

export function OtpVerificationScreen({
  navigation,
  route,
}: OtpVerificationScreenProps) {
  const {phoneNumber, keepSignedIn = true} = route.params;
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(INITIAL_TIMER_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const hasAutoVerifiedRef = useRef(false);

  const completeLogin = useCallback(
    async (idToken: string) => {
      const {isProfileComplete} = await authService.login(idToken, {
        keepSignedIn,
      });

      if (isProfileComplete) {
        navigation.replace('Home');
      } else {
        navigation.replace('ProfileSetup', {phoneNumber});
      }
    },
    [keepSignedIn, navigation, phoneNumber],
  );

  const {restartListener} = useOtpAutoRead({
    digits: OTP_LENGTH,
    enabled: true,
    onOtpDetected: (detectedOtp: string) => {
      if (detectedOtp.length === OTP_LENGTH) {
        setOtp(detectedOtp);
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    const finishWithToken = async (idToken: string) => {
      if (cancelled || hasAutoVerifiedRef.current) {
        return;
      }

      hasAutoVerifiedRef.current = true;
      setIsVerifying(true);
      try {
        await completeLogin(idToken);
      } catch (error) {
        hasAutoVerifiedRef.current = false;
        const message =
          error instanceof Error
            ? error.message
            : 'Automatic verification failed. Please enter the OTP manually.';
        Alert.alert('Verification failed', message);
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    };

    unsubscribe = authService.subscribeAutoVerification(idToken => {
      void finishWithToken(idToken);
    });

    void authService.consumeAutoVerifiedSession().then(existingToken => {
      if (existingToken) {
        void finishWithToken(existingToken);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [completeLogin]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      setCountdown(current => {
        if (current <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [countdown]);

  const formattedPhone = useMemo(
    () => formatPhoneNumber(phoneNumber),
    [phoneNumber],
  );
  const isOtpValid = otp.length === OTP_LENGTH;
  const canResend = countdown === 0 && !isResending;

  const handleOtpChange = (nextOtp: string) => {
    setOtp(nextOtp.replace(/\D/g, '').slice(0, OTP_LENGTH));
  };

  const onVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      const idToken = await authService.confirmOtp(otp);
      await completeLogin(idToken);
    } catch (error) {
      hasAutoVerifiedRef.current = false;
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid or expired OTP. Please try again.';
      Alert.alert('Verification failed', message);
    } finally {
      setIsVerifying(false);
    }
  }, [completeLogin, isVerifying, otp]);

  useEffect(() => {
    if (otp.length !== OTP_LENGTH || isVerifying || hasAutoVerifiedRef.current) {
      return;
    }

    hasAutoVerifiedRef.current = true;
    void onVerify();
  }, [isVerifying, onVerify, otp]);

  const onResend = async () => {
    if (!canResend || isResending) {
      return;
    }

    setIsResending(true);
    try {
      await authService.sendOtp(phoneNumber);
      setOtp('');
      hasAutoVerifiedRef.current = false;
      restartListener();
      setCountdown(INITIAL_TIMER_SECONDS);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not resend OTP. Please try again.';
      Alert.alert('Resend failed', message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.title}>OTP Verification</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code we sent to</Text>
        <Text style={styles.phoneText}>{formattedPhone}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.changeNumber}>Change number</Text>
        </Pressable>
        {Platform.OS === 'android' ? (
          <Text style={styles.autoReadHint} allowFontScaling={false}>
            OTP will be read automatically. Tap the code above the keyboard if
            prompted.
          </Text>
        ) : (
          <Text style={styles.autoReadHint} allowFontScaling={false}>
            Tap the OTP suggestion above the keyboard to autofill.
          </Text>
        )}

        <View style={styles.otpSection}>
          <OTPInput length={OTP_LENGTH} value={otp} onChange={handleOtpChange} />
        </View>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Didn&apos;t receive OTP?</Text>
          <Pressable disabled={!canResend} onPress={onResend}>
            <Text
              style={[styles.resendText, !canResend && styles.resendDisabled]}>
              {canResend
                ? isResending
                  ? 'Sending...'
                  : 'Resend code'
                : `Resend in ${countdown}s`}
            </Text>
          </Pressable>
        </View>

        <View style={styles.verifyButtonWrap}>
          <CustomButton
            title="Verify OTP"
            onPress={onVerify}
            disabled={!isOtpValid || isVerifying}
            loading={isVerifying}
            style={styles.verifyButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  backIcon: {
    fontSize: 22,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  title: {
    marginTop: 28,
    fontSize: 28,
    lineHeight: 36,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  phoneText: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 26,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  changeNumber: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  autoReadHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  otpSection: {
    marginTop: 32,
  },
  resendRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  resendText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  resendDisabled: {
    color: COLORS.textSecondary,
  },
  verifyButtonWrap: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
  verifyButton: {
    borderRadius: 12,
  },
});
