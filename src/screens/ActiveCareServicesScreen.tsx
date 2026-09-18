import React, {useCallback, useState} from 'react';
import {Alert, Linking, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {CareServiceCard} from '../components/home/CareServiceCard';
import {TakerTabBar} from '../components/home/TakerTabBar';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {jobService, storage} from '../services';
import {IncomingJob} from '../types';
import {toActiveJobParams} from '../utils/jobNav';

export function ActiveCareServicesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [job, setJob] = useState<IncomingJob | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const cached = await storage.getCurrentJob();
        if (!cancelled && cached) {
          setJob(cached);
        }
        try {
          const current = await jobService.getCurrentJob();
          if (cancelled) {
            return;
          }
          if (current) {
            setJob(current);
            await storage.setCurrentJob(current);
          } else if (!cached) {
            setJob(null);
            await storage.clearCurrentJob();
          }
        } catch {
          // Keep the locally cached active job if the API is unavailable.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onChat = () => {
    Alert.alert('Chat', 'In-app chat will be available in a later update.');
  };

  const onCall = () => {
    if (!job?.customerPhone) {
      Alert.alert('Phone unavailable', 'This request does not include a phone number.');
      return;
    }
    void Linking.openURL(`tel:${job.customerPhone}`);
  };

  const onPickup = async () => {
    if (!job) {
      return;
    }
    const params = toActiveJobParams(job);
    if (!params) {
      Alert.alert(
        'Incomplete request',
        'This request does not include a pickup location.',
      );
      return;
    }
    setIsWorking(true);
    try {
      navigation.navigate('ActiveJob', params);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <Text style={styles.title} allowFontScaling={false}>
          Active Care Services
        </Text>
        {job ? (
          <CareServiceCard
            job={job}
            variant="active"
            busy={isWorking}
            onChat={onChat}
            onCall={onCall}
            onPickup={() => void onPickup()}
          />
        ) : (
          <Text style={styles.empty} allowFontScaling={false}>
            No active care service right now. Accept a booking from Home to see
            it here.
          </Text>
        )}
        <TakerTabBar active="Active" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  title: {
    marginBottom: 18,
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#152238',
  },
  empty: {
    marginTop: 40,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
