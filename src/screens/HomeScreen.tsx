import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';

import {CareServiceCard} from '../components/home/CareServiceCard';
import {TakerTabBar} from '../components/home/TakerTabBar';
import {COLORS, FONTS} from '../constants';
import {GOOGLE_MAPS_API_KEY} from '../config/env';
import {RootStackParamList} from '../navigation/types';
import {ApiError, authService, jobService, storage} from '../services';
import {ApiUser, CapturedLocation, IncomingJob} from '../types';

type Coords = {
  latitude: number;
  longitude: number;
};

type ServiceMode = 'free' | 'paid';
type StatIcon = React.ComponentProps<typeof Ionicons>['name'];

const THEME = COLORS.primary;
const POLL_INTERVAL_MS = 4000;
const LOCATION_PING_MS = 15000;

const DEFAULT_REGION: Region = {
  latitude: 23.2599,
  longitude: 77.4126,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const formatMoney = (value: number) => `₹${Math.round(value)}`;
const padCount = (value: number) =>
  String(Math.max(0, Math.round(value))).padStart(2, '0');

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);
  const lastUserCoordsRef = useRef<Coords | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(false);
  const skippedIdsRef = useRef<Set<string>>(new Set());

  const [user, setUser] = useState<ApiUser | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('free');
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(
    Platform.OS === 'ios',
  );
  const [incomingJob, setIncomingJob] = useState<IncomingJob | null>(null);
  const [isHandlingRequest, setIsHandlingRequest] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [storedUser, storedOnline, storedMode] = await Promise.all([
          storage.getUser(),
          storage.getOnline(),
          storage.getServiceMode(),
        ]);
        if (cancelled) {
          return;
        }
        setUser(storedUser);
        setTotalEarnings(storedUser?.totalEarnings ?? 0);
        setIsOnline(storedOnline);
        isOnlineRef.current = storedOnline;
        setServiceMode(storedUser?.providerType ?? storedMode);

        try {
          const [stats, freshUser] = await Promise.all([
            jobService.getDashboardStats(),
            authService.me().catch(() => storedUser),
          ]);
          if (cancelled) {
            return;
          }
          const profileUser = freshUser ?? storedUser;
          const hasProfile = profileUser?.isProfileCompleted === true;
          if (!hasProfile) {
            const phoneNumber =
              profileUser?.phoneNumber?.replace(/\D/g, '').slice(-10) ?? '';
            navigation.reset({
              index: 0,
              routes: [{name: 'ProfileSetup', params: {phoneNumber}}],
            });
            return;
          }
          if (profileUser?.isApproved !== true) {
            navigation.reset({
              index: 0,
              routes: [{name: 'PendingApproval'}],
            });
            return;
          }
          setTotalEarnings(stats.totalEarnings);
          setCompletedCount(stats.completedBookings);
          setPendingCount(stats.pendingBookings);
          setCancelledCount(stats.cancelledBookings);
          setIsOnline(stats.isOnline);
          isOnlineRef.current = stats.isOnline;
          await storage.setOnline(stats.isOnline);
          if (stats.providerType) {
            setServiceMode(stats.providerType);
            await storage.setServiceMode(stats.providerType);
          }
          if (profileUser) {
            const nextUser: ApiUser = {
              ...profileUser,
              name: stats.name || profileUser.name,
              todayEarnings: stats.todayEarnings,
              totalEarnings: stats.totalEarnings,
              totalJobs: stats.totalJobs,
              totalMinutesServed: stats.totalMinutesServed,
              isOnline: stats.isOnline,
              providerType: stats.providerType ?? profileUser.providerType,
              profilePicture:
                stats.profileImage || profileUser.profilePicture,
              isApproved: profileUser.isApproved,
            };
            setUser(nextUser);
            await storage.setUser(nextUser);
          }
        } catch {
          if (storedUser?.isProfileCompleted !== true) {
            const phoneNumber =
              storedUser?.phoneNumber?.replace(/\D/g, '').slice(-10) ?? '';
            navigation.reset({
              index: 0,
              routes: [{name: 'ProfileSetup', params: {phoneNumber}}],
            });
            return;
          }
          if (storedUser.isApproved !== true) {
            navigation.reset({
              index: 0,
              routes: [{name: 'PendingApproval'}],
            });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [navigation]),
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
      if (request && !skippedIdsRef.current.has(request.bookingId)) {
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
      await jobService.setOnlineStatus(next);
      setIsOnline(next);
      isOnlineRef.current = next;
      await storage.setOnline(next);
      if (user) {
        const nextUser = {...user, isOnline: next};
        setUser(nextUser);
        await storage.setUser(nextUser);
      }
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

  const changeServiceMode = async (next: ServiceMode) => {
    if (next === serviceMode || isUpdatingMode) {
      return;
    }

    const previous = serviceMode;
    setIsUpdatingMode(true);
    setServiceMode(next);

    try {
      const confirmed = await jobService.setServiceMode(next);
      setServiceMode(confirmed);
      await storage.setServiceMode(confirmed);
      if (user) {
        const nextUser = {...user, providerType: confirmed};
        setUser(nextUser);
        await storage.setUser(nextUser);
      }
    } catch (error) {
      setServiceMode(previous);
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not update service mode.';
      Alert.alert('Mode update failed', message);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const onAccept = async () => {
    if (!incomingJob || isHandlingRequest) {
      return;
    }
    setIsHandlingRequest(true);
    try {
      const accepted = await jobService.acceptJob(incomingJob.bookingId);
      const job: IncomingJob = {
        ...incomingJob,
        ...(accepted ?? {}),
        bookingId: accepted?.bookingId || incomingJob.bookingId,
        status: accepted?.status || 'assigned',
      };
      setIncomingJob(null);
      await storage.setCurrentJob(job);
      navigation.navigate('ActiveCareServices');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not accept this request.';
      Alert.alert('Accept failed', message);
    } finally {
      setIsHandlingRequest(false);
    }
  };

  const onDecline = async () => {
    if (!incomingJob || isHandlingRequest) {
      return;
    }
    setIsHandlingRequest(true);
    try {
      skippedIdsRef.current.add(incomingJob.bookingId);
      await jobService.rejectJob(incomingJob.bookingId);
      setIncomingJob(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not decline this request.';
      Alert.alert('Decline failed', message);
    } finally {
      setIsHandlingRequest(false);
    }
  };

  const displayName = user?.name?.trim() || 'Caretaker';

  const stats: Array<{
    value: string;
    label: string;
    icon: StatIcon;
    onPress: () => void;
  }> = [
    {
      value: formatMoney(totalEarnings),
      label: 'Total Earnings',
      icon: 'wallet-outline',
      onPress: () => navigation.navigate('Earnings'),
    },
    {
      value: padCount(completedCount),
      label: 'Complete Care Services',
      icon: 'car-outline',
      onPress: () => navigation.navigate('JobHistory'),
    },
    {
      value: padCount(pendingCount),
      label: 'Pending Care Services',
      icon: 'time-outline',
      onPress: () => navigation.navigate('JobHistory'),
    },
    {
      value: padCount(cancelledCount),
      label: 'Cancel Care Services',
      icon: 'close-circle-outline',
      onPress: () => navigation.navigate('JobHistory'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.hiddenMap} pointerEvents="none">
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={
            coords
              ? {...coords, latitudeDelta: 0.01, longitudeDelta: 0.01}
              : DEFAULT_REGION
          }
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          onUserLocationChange={handleUserLocationChange}
        />
      </View>

      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.hello} allowFontScaling={false}>
                Hello,
              </Text>
              <Text style={styles.userName} allowFontScaling={false} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerIcon}
                onPress={() => navigation.navigate('Earnings')}>
                <Ionicons name="wallet-outline" size={20} color={THEME} />
              </Pressable>
              <Pressable
                style={styles.headerIcon}
                onPress={() => navigation.navigate('Profile')}>
                <Ionicons name="person-outline" size={20} color={THEME} />
              </Pressable>
            </View>
          </View>

          {!incomingJob ? (
            <>
              <View style={styles.modeRow}>
                <Pressable
                  style={[
                    styles.modeButton,
                    serviceMode === 'free' && styles.modeButtonActive,
                  ]}
                  disabled={isUpdatingMode}
                  onPress={() => void changeServiceMode('free')}>
                  {isUpdatingMode && serviceMode === 'free' ? (
                    <ActivityIndicator
                      size="small"
                      color={serviceMode === 'free' ? '#FFFFFF' : THEME}
                    />
                  ) : (
                    <Ionicons
                      name="heart-outline"
                      size={16}
                      color={serviceMode === 'free' ? '#FFFFFF' : THEME}
                    />
                  )}
                  <Text
                    style={[
                      styles.modeText,
                      serviceMode === 'free' && styles.modeTextActive,
                    ]}
                    allowFontScaling={false}>
                    FREE MODE
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modeButton,
                    serviceMode === 'paid' && styles.modeButtonActive,
                  ]}
                  disabled={isUpdatingMode}
                  onPress={() => void changeServiceMode('paid')}>
                  {isUpdatingMode && serviceMode === 'paid' ? (
                    <ActivityIndicator
                      size="small"
                      color={serviceMode === 'paid' ? '#FFFFFF' : THEME}
                    />
                  ) : (
                    <Ionicons
                      name="cash-outline"
                      size={16}
                      color={serviceMode === 'paid' ? '#FFFFFF' : THEME}
                    />
                  )}
                  <Text
                    style={[
                      styles.modeText,
                      serviceMode === 'paid' && styles.modeTextActive,
                    ]}
                    allowFontScaling={false}>
                    PAID MODE
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.modeCaption} allowFontScaling={false}>
                {serviceMode === 'free'
                  ? 'You will receive free service bookings only.'
                  : 'You will receive paid service bookings only.'}
              </Text>
            </>
          ) : null}

          <View style={styles.statsGrid}>
            {stats.map(stat => (
              <Pressable
                key={stat.label}
                style={styles.statCard}
                onPress={stat.onPress}>
                <View style={styles.statTop}>
                  <Text style={styles.statValue} allowFontScaling={false}>
                    {stat.value}
                  </Text>
                  <Ionicons name={stat.icon} size={18} color={THEME} />
                </View>
                <View style={styles.statBottom}>
                  <Text style={styles.statLabel} allowFontScaling={false}>
                    {stat.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.onlineBar, isOnline && styles.onlineBarOn]}
            onPress={() => void toggleOnline()}
            disabled={isToggling}>
            <Ionicons
              name={isOnline ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={isOnline ? '#16A34A' : THEME}
            />
            <Text
              style={[styles.onlineBarText, isOnline && styles.onlineBarTextOn]}
              allowFontScaling={false}>
              {isOnline
                ? 'You are Online'
                : 'Go Online to receive bookings'}
            </Text>
          </Pressable>

          {incomingJob ? (
            <View style={styles.upcomingSection}>
              <Text style={styles.upcomingTitle} allowFontScaling={false}>
                New Upcoming Care Service
              </Text>
              <CareServiceCard
                job={{
                  ...incomingJob,
                  address: incomingJob.address || address,
                }}
                variant="incoming"
                busy={isHandlingRequest}
                onAccept={() => void onAccept()}
                onDecline={() => void onDecline()}
              />
            </View>
          ) : null}
        </ScrollView>

        <TakerTabBar active="Home" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hiddenMap: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  hello: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    marginTop: 2,
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#152238',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#B7D4DE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3FAFC',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: THEME,
  },
  modeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: THEME,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  modeCaption: {
    marginTop: 10,
    marginBottom: 18,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48.2%',
    minHeight: 108,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EDF2F7',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: '#152238',
  },
  statBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  statLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#4B5563',
  },
  onlineBar: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  onlineBarOn: {
    borderColor: '#BBF7D0',
    backgroundColor: '#E8F8EC',
  },
  onlineBarText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: THEME,
  },
  onlineBarTextOn: {
    color: '#166534',
  },
  upcomingSection: {
    marginTop: 22,
  },
  upcomingTitle: {
    marginBottom: 12,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#152238',
  },
});
