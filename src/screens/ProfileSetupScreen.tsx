import React, {useEffect, useState} from 'react';
import {
  Alert,
  Image,
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
import {pickImage} from '../utils/pickImage';

type ProfileSetupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProfileSetup'
>;

type Gender = 'male' | 'female';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const capitalizeName = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export function ProfileSetupScreen({
  navigation,
  route,
}: ProfileSetupScreenProps) {
  const {phoneNumber} = route.params;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(phoneNumber.replace(/\D/g, '').slice(-10));
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [user, local] = await Promise.all([
        storage.getUser(),
        storage.getLocalProfile(),
      ]);
      if (cancelled) {
        return;
      }

      const fullName = user?.name?.trim() ?? '';
      const [storedFirst, ...rest] = fullName.split(' ').filter(Boolean);
      setFirstName(local?.firstName || storedFirst || '');
      setLastName(local?.lastName || rest.join(' ') || '');
      setEmail(user?.email ?? '');
      setAddress(local?.address ?? '');
      if (local?.gender) {
        setGender(local.gender);
      }
      if (user?.profilePicture) {
        setPhotoUri(user.profilePicture);
      }
      if (user?.phoneNumber) {
        setPhone(user.phoneNumber.replace(/\D/g, '').slice(-10));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmail = email.trim();
  const trimmedAddress = address.trim();

  const firstNameError =
    firstName.length === 0
      ? undefined
      : trimmedFirstName.length < 2
        ? 'Enter a valid first name'
        : undefined;
  const lastNameError =
    lastName.length === 0
      ? undefined
      : trimmedLastName.length < 2
        ? 'Enter a valid last name'
        : undefined;
  const emailError =
    trimmedEmail.length > 0 && !isValidEmail(trimmedEmail)
      ? 'Enter a valid email address'
      : undefined;
  const phoneError =
    phone.length === 0
      ? undefined
      : phone.length !== 10
        ? 'Enter a valid 10-digit mobile number'
        : undefined;
  const passwordError =
    password.length === 0
      ? undefined
      : password.length < 6
        ? 'Password must be at least 6 characters'
        : undefined;
  const addressError =
    address.length === 0
      ? undefined
      : trimmedAddress.length < 6
        ? 'Enter a valid address'
        : undefined;

  const isContinueDisabled =
    trimmedFirstName.length < 2 ||
    trimmedLastName.length < 2 ||
    phone.length !== 10 ||
    password.length < 6 ||
    trimmedAddress.length < 6 ||
    (trimmedEmail.length > 0 && !isValidEmail(trimmedEmail)) ||
    isSaving;

  const onPickPhoto = async () => {
    const file = await pickImage('Profile photo');
    if (file?.uri) {
      setPhotoUri(file.uri);
    }
  };

  const onContinue = async () => {
    if (isContinueDisabled) {
      return;
    }

    const fullName = capitalizeName(`${trimmedFirstName} ${trimmedLastName}`);

    setIsSaving(true);
    try {
      await authService.updateProfile({
        name: fullName,
        email: trimmedEmail || undefined,
        address: trimmedAddress,
        profilePicture: photoUri || undefined,
      });
      await storage.setLocalProfile({
        ...(await storage.getLocalProfile()),
        firstName: capitalizeName(trimmedFirstName),
        lastName: capitalizeName(trimmedLastName),
        address: trimmedAddress,
        gender,
        registrationStep: 2,
      });
      navigation.navigate('RegistrationDocuments', {phoneNumber});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your profile. Please try again.';
      Alert.alert('Registration failed', message);
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
          {navigation.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}

          <Pressable style={styles.avatarButton} onPress={() => void onPickPhoto()}>
            {photoUri ? (
              <Image
                source={{uri: photoUri}}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={54} color="#B8BFC6" />
              </View>
            )}
          </Pressable>

          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <CustomInput
                variant="subtle"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                autoCapitalize="words"
                error={firstNameError}
              />
            </View>
            <View style={styles.nameField}>
              <CustomInput
                variant="subtle"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                autoCapitalize="words"
                error={lastNameError}
              />
            </View>
          </View>

          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />
          </View>

          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={phone}
              onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Phone number"
              prefix="+91"
              keyboardType="number-pad"
              maxLength={10}
              error={phoneError}
            />
          </View>

          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              autoCapitalize="none"
              secureTextEntry={!isPasswordVisible}
              error={passwordError}
              rightIcon={
                <Pressable
                  onPress={() => setIsPasswordVisible(current => !current)}
                  hitSlop={8}>
                  <Ionicons
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9AA3AE"
                  />
                </Pressable>
              }
            />
          </View>

          <View style={styles.fieldGap}>
            <CustomInput
              variant="subtle"
              value={address}
              onChangeText={setAddress}
              placeholder="Address"
              autoCapitalize="words"
              multiline
              error={addressError}
            />
          </View>

          <Text style={styles.genderLabel}>Gender</Text>
          <View style={styles.genderRow}>
            <Pressable
              style={styles.genderOption}
              onPress={() => setGender('male')}>
              <View
                style={[
                  styles.radioOuter,
                  gender === 'male' && styles.radioOuterSelected,
                ]}>
                {gender === 'male' ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.genderText}>Male</Text>
            </Pressable>
            <Pressable
              style={styles.genderOption}
              onPress={() => setGender('female')}>
              <View
                style={[
                  styles.radioOuter,
                  gender === 'female' && styles.radioOuterSelected,
                ]}>
                {gender === 'female' ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.genderText}>Female</Text>
            </Pressable>
          </View>

          <CustomButton
            title="Continue"
            onPress={onContinue}
            disabled={isContinueDisabled}
            loading={isSaving}
            style={styles.continueButton}
          />
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
  avatarButton: {
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 28,
  },
  avatarPlaceholder: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#E6E8EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 118,
    height: 118,
    borderRadius: 59,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  fieldGap: {
    marginTop: 12,
  },
  genderLabel: {
    marginTop: 18,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  genderRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: '#1F2933',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1F2933',
  },
  genderText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  continueButton: {
    marginTop: 28,
    borderRadius: 999,
    backgroundColor: '#8EB6C8',
  },
});
