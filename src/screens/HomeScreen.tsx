import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';

import {TakerTabBar} from '../components/home/TakerTabBar';
import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {GOOGLE_MAPS_API_KEY} from '../config/env';
import {RootStackParamList} from '../navigation/types';
import {ApiError, jobService, storage} from '../services';
import {ApiUser, CapturedLocation, IncomingJob} from '../types';

type Coords = {
  latitude: number;
  longitude: number;
};

const THEME = '#1F8A9E';
const POLL_INTERVAL_MS = 4000;
const LOCATION_PING_MS = 15000;

const DEFAULT_REGION: Region = {
  latitude: 23.2599,
  longitude: 77.4126,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const formatMoney = (value: number) => `₹${value.toFixed(0)}`;

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {height} = useWindowDimensions();
  const mapHeight = Math.round(height * 0.52);

  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);
  const lastUserCoordsRef = useRef<Coords | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(false);

  const [user, setUser] = useState<ApiUser | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(
    Platform.OS === 'ios',
  );
  const [incomingJob, setIncomingJob] = useState<IncomingJob | null>(null);
  const [isHandlingRequest, setIsHandlingRequest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [storedUser, storedOnline] = await Promise.all([
          storage.getUser(),
          storage.getOnline(),
        ]);
        if (cancelled) {
          return;
        }
        setUser(storedUser);
        setIsOnline(storedOnline);
        isOnlineRef.current = storedOnline;
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    void bootstrapLocation();
    return () => {
      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrapLocation = async () => {
    const cached = await storage.getLocation();
    if (cached) {
      setCoords({latitude: cached.latitude, longitude: cached.longitude});
      if (cached.address) {
        setAddress(cached.address);
      }
    }
    await requestLocationPermission();
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (alreadyGranted) {
        setHasLocationPermission(true);
        return;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'CareFinger Taker needs your location to receive nearby care requests.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask Me Later',
        },
      );
      setHasLocationPermission(result === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      setHasLocationPermission(false);
    }
  };

  const persistLocation = useCallback((next: Coords, resolvedAddress?: string) => {
    const payload: CapturedLocation = {
      latitude: next.latitude,
      longitude: next.longitude,
      address: resolvedAddress,
      capturedAt: Date.now(),
    };
    void storage.setLocation(payload);
  }, []);

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        setIsResolving(true);
        const endpoint =
          'https://maps.googleapis.com/maps/api/geocode/json' +
          `?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(endpoint);
        const data = (await response.json()) as {
          status?: string;
          results?: Array<{formatted_address?: string}>;
        };
        const resolved = data.results?.[0]?.formatted_address;
        const finalAddress =
          data.status === 'OK' && resolved ? resolved : fallback;
        setAddress(finalAddress);
        persistLocation({latitude, longitude}, finalAddress);
      } catch {
        setAddress(fallback);
        persistLocation({latitude, longitude}, fallback);
      } finally {
        setIsResolving(false);
      }
    },
    [persistLocation],
  );

  const handleUserLocationChange = useCallback(
    (event: {nativeEvent: {coordinate?: Coords}}) => {
      const coordinate = event.nativeEvent.coordinate;
      if (!coordinate) {
        return;
      }

      const userCoords: Coords = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      };
      lastUserCoordsRef.current = userCoords;
      setCoords(userCoords);

      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true;
        mapRef.current?.animateToRegion(
          {
            ...userCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
        void reverseGeocode(userCoords.latitude, userCoords.longitude);
      }
    },
    [reverseGeocode],
  );

  const pingLocation = useCallback(async () => {
    const current = lastUserCoordsRef.current ?? coords;
    if (!isOnlineRef.current || !current) {
      return;
    }
    try {
      await jobService.updateLocation(current.latitude, current.longitude);
    } catch {
      // Keep the taker online even if a location ping fails.
    }
  }, [coords]);

  const pollIncoming = useCallback(async () => {
    if (!isOnlineRef.current) {
      return;
    }
    try {
      const request = await jobService.getPendingRequest();
      if (request) {
        setIncomingJob(request);
      }
    } catch {
      // Empty queue / backend not ready is a normal idle state.
    }
  }, []);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    void pingLocation();
    void pollIncoming();
    const locationTimer = setInterval(() => {
      void pingLocation();
    }, LOCATION_PING_MS);
    const pollTimer = setInterval(() => {
      void pollIncoming();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(locationTimer);
      clearInterval(pollTimer);
    };
  }, [isOnline, pingLocation, pollIncoming]);

  const toggleOnline = async () => {
    if (isToggling) {
      return;
    }
    if (!hasLocationPermission) {
      Alert.alert(
        'Location required',
        'Allow location access to go online and receive nearby requests.',
      );
      await requestLocationPermission();
      return;
    }

    const next = !isOnline;
    setIsToggling(true);
    try {
      const current = lastUserCoordsRef.current ?? coords;
      await jobService.setOnlineStatus(
        next,
        current?.latitude,
        current?.longitude,
      );
      setIsOnline(next);
      isOnlineRef.current = next;
      await storage.setOnline(next);
      if (!next) {
        setIncomingJob(null);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not update your online status. Please try again.';
      Alert.alert('Status update failed', message);
    } finally {
      setIsToggling(false);
    }
  };

  const openActiveJob = (job: IncomingJob) => {
    if (job.lat == null || job.lng == null) {
      Alert.alert('Incomplete request', 'This request does not include a pickup location.');
      return;
    }

    navigation.navigate('ActiveJob', {
      bookingId: job.bookingId,
      otp: job.otp,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      pickup: {
        address: job.address || address || 'Pickup location',
        latitude: job.lat,
        longitude: job.lng,
      },
      drop:
        job.dropLat != null && job.dropLng != null
          ? {
              address: job.dropAddress || 'Drop location',
              latitude: job.dropLat,
              longitude: job.dropLng,
            }
          : undefined,
      remainingMinutes: job.remainingMinutes,
      ratePerMinute: job.ratePerMinute,
      isFree: job.isFree,
    });
  };

  const onAccept = async () => {
    if (!incomingJob || isHandlingRequest) {
      return;
    }
    setIsHandlingRequest(true);
    try {
      const accepted = await jobService.acceptJob(incomingJob.bookingId);
      const job = accepted ?? incomingJob;
      setIncomingJob(null);
      openActiveJob(job);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not accept this request.';
      Alert.alert('Accept failed', message);
    } finally {
      setIsHandlingRequest(false);
    }
  };

  const onSkip = async () => {
    if (!incomingJob || isHandlingRequest) {
      return;
    }
    setIsHandlingRequest(true);
    try {
      await jobService.rejectJob(incomingJob.bookingId);
      setIncomingJob(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not skip this request.';
      Alert.alert('Skip failed', message);
    } finally {
      setIsHandlingRequest(false);
    }
  };

  const displayName = user?.name?.trim() || 'Caretaker';
  const todayEarnings = user?.todayEarnings ?? 0;
  const addressText = isResolving
    ? 'Updating your location...'
    : address || 'Waiting for GPS...';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <View style={[styles.mapContainer, {height: mapHeight}]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={
              coords
                ? {...coords, latitudeDelta: 0.01, longitudeDelta: 0.01}
                : DEFAULT_REGION
            }
            mapType="standard"
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
            onUserLocationChange={handleUserLocationChange}
          />

          <View style={styles.topBar}>
            <View>
              <Text style={styles.hello} allowFontScaling={false}>
                Hello, {displayName.split(' ')[0]}
              </Text>
              <Text style={styles.statusLabel} allowFontScaling={false}>
                {isOnline ? 'You are online' : 'You are offline'}
              </Text>
            </View>
            <View style={[styles.livePill, isOnline && styles.livePillOn]}>
              <View style={[styles.liveDot, isOnline && styles.liveDotOn]} />
              <Text style={styles.liveText} allowFontScaling={false}>
                {isOnline ? 'LIVE' : 'OFF'}
              </Text>
            </View>
          </View>

          <View style={styles.addressChip}>
            <Ionicons name="location" size={16} color={THEME} />
            <Text style={styles.addressText} numberOfLines={1} allowFontScaling={false}>
              {addressText}
            </Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.earningsRow}>
            <View>
              <Text style={styles.earningsLabel} allowFontScaling={false}>
                Today&apos;s earnings
              </Text>
              <Text style={styles.earningsValue} allowFontScaling={false}>
                {formatMoney(todayEarnings)}
              </Text>
            </View>
            <Pressable
              style={styles.historyButton}
              onPress={() => navigation.navigate('Earnings')}>
              <Text style={styles.historyButtonText} allowFontScaling={false}>
                View
              </Text>
            </Pressable>
          </View>

          <Text style={styles.hint} allowFontScaling={false}>
            {isOnline
              ? 'Stay nearby. Incoming care requests will appear here.'
              : 'Go online to start receiving nearby patient requests.'}
          </Text>

          <CustomButton
            title={isOnline ? 'Go Offline' : 'Go Online'}
            onPress={toggleOnline}
            loading={isToggling}
            disabled={isToggling}
            style={isOnline ? styles.offlineButton : styles.onlineButton}
          />
        </View>

        <TakerTabBar active="Home" />
      </View>

      <Modal visible={Boolean(incomingJob)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.requestCard}>
            <Text style={styles.requestEyebrow} allowFontScaling={false}>
              New care request
            </Text>
            <Text style={styles.requestName} allowFontScaling={false}>
              {incomingJob?.customerName || 'Patient'}
            </Text>
            <Text style={styles.requestAddress} allowFontScaling={false}>
              {incomingJob?.address || 'Pickup location incoming'}
            </Text>
            <View style={styles.requestMetaRow}>
              {incomingJob?.distanceKm != null ? (
                <Text style={styles.requestMeta} allowFontScaling={false}>
                  {incomingJob.distanceKm.toFixed(1)} km away
                </Text>
              ) : null}
              {incomingJob?.isFree ? (
                <Text style={styles.requestMeta} allowFontScaling={false}>
                  Free service
                </Text>
              ) : incomingJob?.ratePerMinute != null ? (
                <Text style={styles.requestMeta} allowFontScaling={false}>
                  ₹{incomingJob.ratePerMinute}/min
                </Text>
              ) : null}
            </View>
            <View style={styles.requestActions}>
              <Pressable
                style={styles.skipButton}
                onPress={onSkip}
                disabled={isHandlingRequest}>
                <Text style={styles.skipText} allowFontScaling={false}>
                  Skip
                </Text>
              </Pressable>
              <View style={styles.acceptWrap}>
                <CustomButton
                  title="Accept"
                  onPress={onAccept}
                  loading={isHandlingRequest}
                  disabled={isHandlingRequest}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  mapContainer: {
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hello: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: '#111827',
  },
  statusLabel: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  livePillOn: {
    backgroundColor: '#ECFDF3',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  liveDotOn: {
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#111827',
  },
  addressChip: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 96,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECF8FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  earningsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#4B5563',
  },
  earningsValue: {
    marginTop: 4,
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: THEME,
  },
  historyButton: {
    backgroundColor: THEME,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyButtonText: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  hint: {
    marginTop: 16,
    marginBottom: 18,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  onlineButton: {
    borderRadius: 14,
  },
  offlineButton: {
    borderRadius: 14,
    backgroundColor: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  requestEyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: THEME,
    letterSpacing: 0.4,
  },
  requestName: {
    marginTop: 8,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#111827',
  },
  requestAddress: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  requestMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  requestMeta: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestActions: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    height: 54,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#6B7280',
  },
  acceptWrap: {
    flex: 1,
  },
});
