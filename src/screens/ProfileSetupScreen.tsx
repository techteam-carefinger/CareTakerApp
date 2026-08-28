import React, {useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton, CustomInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';

const LOGO = require('../../assets/logo.png');

type ProfileSetupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProfileSetup'
>;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function ProfileSetupScreen({navigation, route}: ProfileSetupScreenProps) {
  const {phoneNumber} = route.params;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const trimmedFullName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedVehicleNumber = vehicleNumber.trim().toUpperCase();
  const trimmedVehicleModel = vehicleModel.trim();

  const fullNameError =
    fullName.length === 0
      ? undefined
      : trimmedFullName.length < 3
        ? 'Full name should be at least 3 characters'
        : undefined;
  const emailError =
    trimmedEmail.length > 0 && !isValidEmail(trimmedEmail)
      ? 'Enter a valid email address'
      : undefined;
  const vehicleError =
    vehicleNumber.length === 0
      ? undefined
      : trimmedVehicleNumber.length < 4
        ? 'Enter a valid vehicle number'
        : undefined;

  const isSaveDisabled =
    trimmedFullName.length < 3 ||
    trimmedVehicleNumber.length < 4 ||
    (trimmedEmail.length > 0 && !isValidEmail(trimmedEmail));

  const onChangeFullName = (value: string) => {
    setFullName(value.replace(/\s{2,}/g, ' '));
  };

  const onSaveProfile = async () => {
    if (isSaveDisabled || isSaving) {
      return;
    }

    const normalizedFullName = trimmedFullName
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    setIsSaving(true);
    try {
      await authService.updateProfile({
        name: normalizedFullName,
        email: trimmedEmail || undefined,
        vehicleNumber: trimmedVehicleNumber,
        vehicleModel: trimmedVehicleModel || undefined,
      });
      await storage.setLocalProfile({
        address: address.trim() || undefined,
        vehicleNumber: trimmedVehicleNumber,
        vehicleModel: trimmedVehicleModel || undefined,
      });
      navigation.replace('Home');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your profile. Please try again.';
      Alert.alert('Profile setup failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerSection}>
            <Image source={LOGO} resizeMode="contain" style={styles.logo} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Caretaker Setup</Text>
            <Text style={styles.subtitle}>
              Complete your profile so nearby patients can find you.
            </Text>
            <Text style={styles.phoneHint}>Signed in as +91 {phoneNumber}</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <CustomInput
              value={fullName}
              onChangeText={onChangeFullName}
              placeholder="Enter your full name"
              leftIcon={<Text style={styles.inputIcon}>👤</Text>}
              keyboardType="default"
              autoCapitalize="words"
              error={fullNameError}
            />

            <Text style={styles.label}>Email (Optional)</Text>
            <CustomInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              leftIcon={<Text style={styles.inputIcon}>✉</Text>}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />

            <Text style={styles.label}>
              Vehicle Number <Text style={styles.required}>*</Text>
            </Text>
            <CustomInput
              value={vehicleNumber}
              onChangeText={value => setVehicleNumber(value.toUpperCase())}
              placeholder="MP04 AB 1234"
              leftIcon={<Text style={styles.inputIcon}>🛵</Text>}
              keyboardType="default"
              autoCapitalize="characters"
              error={vehicleError}
            />

            <Text style={styles.label}>Vehicle Model (Optional)</Text>
            <CustomInput
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="Activa / Splendor / Car"
              leftIcon={<Text style={styles.inputIcon}>🚗</Text>}
              keyboardType="default"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Address (Optional)</Text>
            <CustomInput
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              leftIcon={<Text style={styles.inputIcon}>⌖</Text>}
              keyboardType="default"
              autoCapitalize="words"
            />
          </View>

          <CustomButton
            title="Save Profile"
            onPress={onSaveProfile}
            disabled={isSaveDisabled || isSaving}
            loading={isSaving}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  backgroundCircleTop: {
    position: 'absolute',
    top: -170,
    left: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: '#D9EAF2',
  },
  backgroundCircleBottom: {
    position: 'absolute',
    bottom: -190,
    right: -170,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#E8F2F8',
    opacity: 0.7,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 2,
    paddingBottom: 18,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 34,
    lineHeight: 34,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  headerSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  logo: {
    width: 230,
    height: 230,
  },
  titleSection: {
    marginTop: -44,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    maxWidth: 320,
  },
  phoneHint: {
    marginTop: 8,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
  },
  formSection: {
    marginTop: 14,
  },
  label: {
    marginBottom: 8,
    marginTop: 10,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  required: {
    color: COLORS.error,
    fontFamily: FONTS.semiBold,
  },
  inputIcon: {
    fontFamily: FONTS.regular,
    color: '#8D9CAB',
    fontSize: 15,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 18,
    borderRadius: 10,
  },
});
