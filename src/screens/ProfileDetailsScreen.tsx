import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';
import {ApiUser, LocalProfile} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileDetails'>;

type DetailRow = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  editable?: boolean;
  field?: 'name' | 'email' | 'vehicleNumber' | 'vehicleModel';
};

const formatPhoneNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local ? `+91 ${local}` : phone;
};

export function ProfileDetailsScreen({navigation}: Props) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const [storedUser, storedLocalProfile] = await Promise.all([
      storage.getUser(),
      storage.getLocalProfile(),
    ]);
    setUser(storedUser);
    setLocalProfile(storedLocalProfile);
    try {
      const freshUser = await authService.me();
      setUser(freshUser);
    } catch {
      // Keep cached user when refresh fails offline.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const rows: DetailRow[] = [
    {
      id: 'name',
      icon: 'person-outline',
      label: 'Name',
      value: user?.name?.trim() || undefined,
      editable: true,
      field: 'name',
    },
    {
      id: 'phone',
      icon: 'call-outline',
      label: 'Phone Number',
      value: formatPhoneNumber(user?.phoneNumber ?? ''),
    },
    {
      id: 'email',
      icon: 'mail-outline',
      label: 'Email',
      value: user?.email?.trim() || undefined,
      editable: true,
      field: 'email',
    },
    {
      id: 'vehicleNumber',
      icon: 'bicycle-outline',
      label: 'Vehicle Number',
      value: user?.vehicleNumber || localProfile?.vehicleNumber,
      editable: true,
      field: 'vehicleNumber',
    },
    {
      id: 'vehicleModel',
      icon: 'car-outline',
      label: 'Vehicle Model',
      value: user?.vehicleModel || localProfile?.vehicleModel,
      editable: true,
      field: 'vehicleModel',
    },
  ];

  const openEditor = (row: DetailRow) => {
    if (!row.field) {
      return;
    }
    const initialValue =
      row.field === 'name'
        ? user?.name ?? ''
        : row.field === 'email'
          ? user?.email ?? ''
          : row.field === 'vehicleNumber'
            ? user?.vehicleNumber || localProfile?.vehicleNumber || ''
            : user?.vehicleModel || localProfile?.vehicleModel || '';
    navigation.navigate('EditProfileField', {
      field: row.field,
      initialValue,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Profile
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.map((row, index) => (
            <Pressable
              key={row.id}
              style={[styles.row, index < rows.length - 1 && styles.rowDivider]}
              disabled={!row.editable}
              onPress={() => openEditor(row)}>
              <Ionicons name={row.icon} size={22} color="#111827" />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel} allowFontScaling={false}>
                  {row.label}
                </Text>
                <Text style={styles.rowValue} allowFontScaling={false}>
                  {row.value || 'Not added'}
                </Text>
              </View>
              {row.editable ? (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
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
    marginBottom: 8,
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
    fontSize: 24,
    color: '#111827',
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#111827',
  },
  rowValue: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
});
