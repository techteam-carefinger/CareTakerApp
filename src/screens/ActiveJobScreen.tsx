import React, {useMemo, useRef, useState} from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MapView, {Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CustomButton, OTPInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {jobService} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveJob'>;
type JobPhase = 'enroute' | 'arrived' | 'active';

const THEME = '#1F8A9E';
const OTP_LENGTH = 4;

const formatClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function ActiveJobScreen({navigation, route}: Props) {
  const {
    bookingId,
    otp,
    customerName = 'Patient',
    customerPhone,
    pickup,
    drop,
    ratePerMinute,
    isFree,
  } = route.params;
  const {height} = useWindowDimensions();
  const mapHeight = Math.round(height * 0.42);
  const mapRef = useRef<MapView | null>(null);

  const [phase, setPhase] = useState<JobPhase>('enroute');
  const [otpValue, setOtpValue] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const region: Region = useMemo(
    () => ({
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }),
    [pickup.latitude, pickup.longitude],
  );

  const startTimer = () => {
    if (timerRef.current) {
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds(current => current + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const onCall = () => {
    if (!customerPhone) {
      Alert.alert('Phone unavailable', 'This request does not include a phone number.');
      return;
    }
    void Linking.openURL(`tel:${customerPhone}`);
  };

  const onNavigate = () => {
    const url = Platform.select({
      ios: `maps://?daddr=${pickup.latitude},${pickup.longitude}`,
      default: `google.navigation:q=${pickup.latitude},${pickup.longitude}`,
    });
    void Linking.openURL(url ?? '');
  };

  const onArrived = async () => {
    setIsWorking(true);
    try {
      await jobService.markArrived(bookingId);
      setPhase('arrived');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not mark arrival.';
      Alert.alert('Arrival failed', message);
    } finally {
      setIsWorking(false);
    }
  };

  const onStart = async () => {
    if (otpValue.length !== OTP_LENGTH) {
      Alert.alert('Enter PIN', 'Ask the patient for the 4-digit service PIN.');
      return;
    }
    if (otp != null && String(otp).padStart(OTP_LENGTH, '0') !== otpValue) {
      Alert.alert('Incorrect PIN', 'The PIN does not match this booking.');
      return;
    }

    setIsWorking(true);
    try {
      await jobService.startJob(bookingId, otpValue);
      setPhase('active');
      startTimer();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not start the service.';
      Alert.alert('Start failed', message);
    } finally {
      setIsWorking(false);
    }
  };

  const onComplete = () => {
    Alert.alert('Complete service?', 'This will end the current care job.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Complete',
        onPress: () => {
          void (async () => {
            setIsWorking(true);
            try {
              stopTimer();
              const minutes = Math.max(1, Math.round(elapsedSeconds / 60) || 1);
              const completed = await jobService.completeJob(bookingId);
              navigation.replace('ServiceComplete', {
                bookingId,
                minutes: completed?.minutes ?? minutes,
                ratePerMinute,
                earnings: completed?.earnings,
                customerName,
              });
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Could not complete this service.';
              Alert.alert('Complete failed', message);
            } finally {
              setIsWorking(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.mapWrap, {height: mapHeight}]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={region}
          showsUserLocation>
          <Marker coordinate={pickup} title="Pickup" pinColor={THEME} />
          {drop ? <Marker coordinate={drop} title="Drop" pinColor="#D9642A" /> : null}
        </MapView>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.phase} allowFontScaling={false}>
          {phase === 'enroute'
            ? 'Heading to patient'
            : phase === 'arrived'
              ? 'Enter service PIN'
              : 'Service in progress'}
        </Text>
        <Text style={styles.customer} allowFontScaling={false}>
          {customerName}
        </Text>
        <Text style={styles.address} allowFontScaling={false}>
          {pickup.address}
        </Text>
        {isFree ? (
          <Text style={styles.offer} allowFontScaling={false}>
            Free care service
          </Text>
        ) : ratePerMinute != null ? (
          <Text style={styles.offer} allowFontScaling={false}>
            ₹{ratePerMinute}/min
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable style={styles.iconButton} onPress={onCall}>
            <Ionicons name="call-outline" size={18} color={THEME} />
            <Text style={styles.iconLabel}>Call</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={onNavigate}>
            <Ionicons name="navigate-outline" size={18} color={THEME} />
            <Text style={styles.iconLabel}>Navigate</Text>
          </Pressable>
        </View>

        {phase === 'arrived' ? (
          <View style={styles.otpWrap}>
            <OTPInput length={OTP_LENGTH} value={otpValue} onChange={setOtpValue} />
          </View>
        ) : null}

        {phase === 'active' ? (
          <Text style={styles.timer} allowFontScaling={false}>
            {formatClock(elapsedSeconds)}
          </Text>
        ) : null}

        {phase === 'enroute' ? (
          <CustomButton
            title="I've arrived"
            onPress={onArrived}
            loading={isWorking}
            disabled={isWorking}
          />
        ) : null}
        {phase === 'arrived' ? (
          <CustomButton
            title="Start service"
            onPress={onStart}
            loading={isWorking}
            disabled={isWorking || otpValue.length !== OTP_LENGTH}
          />
        ) : null}
        {phase === 'active' ? (
          <CustomButton
            title="Complete service"
            onPress={onComplete}
            loading={isWorking}
            disabled={isWorking}
          />
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
  mapWrap: {
    backgroundColor: '#E5E7EB',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  phase: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: THEME,
  },
  customer: {
    marginTop: 6,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#111827',
  },
  address: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  offer: {
    marginTop: 8,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#111827',
  },
  actionRow: {
    marginTop: 16,
    marginBottom: 18,
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
  },
  otpWrap: {
    marginBottom: 18,
  },
  timer: {
    marginBottom: 18,
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: COLORS.primary,
    textAlign: 'center',
  },
});
