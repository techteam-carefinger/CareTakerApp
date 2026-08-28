import React, {useState} from 'react';
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

import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';
import {UploadFile} from '../services/api';
import {pickImage} from '../utils/pickImage';

type RegistrationDocumentsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'RegistrationDocuments'
>;

type DocumentCardProps = {
  imageUri?: string;
  buttonLabel: string;
  onUpload: () => void;
};

function DocumentCard({imageUri, buttonLabel, onUpload}: DocumentCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        {imageUri ? (
          <Image source={{uri: imageUri}} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <Ionicons name="id-card-outline" size={42} color="#C5CDD4" />
        )}
      </View>
      <Pressable style={styles.uploadButton} onPress={onUpload}>
        <Text style={styles.uploadButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

export function RegistrationDocumentsScreen({
  navigation,
  route,
}: RegistrationDocumentsScreenProps) {
  const {phoneNumber} = route.params;

  const [identityFront, setIdentityFront] = useState<UploadFile | null>(null);
  const [identityBack, setIdentityBack] = useState<UploadFile | null>(null);
  const [licenseFront, setLicenseFront] = useState<UploadFile | null>(null);
  const [licenseBack, setLicenseBack] = useState<UploadFile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('ProfileSetup', {phoneNumber});
  };

  const onUpload = async (
    setter: React.Dispatch<React.SetStateAction<UploadFile | null>>,
  ) => {
    const file = await pickImage();
    if (file) {
      setter(file);
    }
  };

  const isContinueDisabled =
    !identityFront ||
    !identityBack ||
    !licenseFront ||
    !licenseBack ||
    isSaving;

  const onContinue = async () => {
    if (isContinueDisabled) {
      return;
    }

    setIsSaving(true);
    try {
      await authService.updateProfile({
        aadhaarFrontImage: identityFront,
        aadhaarBackImage: identityBack,
        licenseFrontImage: licenseFront,
        licenseBackImage: licenseBack,
      });
      const existing = await storage.getLocalProfile();
      await storage.setLocalProfile({
        ...existing,
        registrationStep: 'done',
      });
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your documents. Please try again.';
      Alert.alert('Upload failed', message);
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

          <Text style={styles.sectionTitle}>Upload identity</Text>
          <View style={styles.cardRow}>
            <DocumentCard
              imageUri={identityFront?.uri}
              buttonLabel="Upload front"
              onUpload={() => void onUpload(setIdentityFront)}
            />
            <DocumentCard
              imageUri={identityBack?.uri}
              buttonLabel="Upload back"
              onUpload={() => void onUpload(setIdentityBack)}
            />
          </View>

          <Text style={styles.sectionTitle}>Upload License</Text>
          <View style={styles.cardRow}>
            <DocumentCard
              imageUri={licenseFront?.uri}
              buttonLabel="Upload front"
              onUpload={() => void onUpload(setLicenseFront)}
            />
            <DocumentCard
              imageUri={licenseBack?.uri}
              buttonLabel="Upload back"
              onUpload={() => void onUpload(setLicenseBack)}
            />
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
    paddingHorizontal: 22,
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
  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: '#9AA3AE',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E6EB',
    borderRadius: 14,
    padding: 10,
    backgroundColor: COLORS.white,
  },
  preview: {
    height: 112,
    borderRadius: 10,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    marginTop: 10,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5DBE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  continueButton: {
    marginTop: 28,
    borderRadius: 999,
  },
});
