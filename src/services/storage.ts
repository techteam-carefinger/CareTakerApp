import AsyncStorage from '@react-native-async-storage/async-storage';

import {ApiUser, CapturedLocation, LocalProfile} from '../types';

const TOKEN_KEY = '@carefinger-taker/token';
const USER_KEY = '@carefinger-taker/user';
const KEEP_SIGNED_IN_KEY = '@carefinger-taker/keepSignedIn';
const LOCAL_PROFILE_KEY = '@carefinger-taker/localProfile';
const LOCATION_KEY = '@carefinger-taker/location';
const ONLINE_KEY = '@carefinger-taker/isOnline';

export const storage = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setUser(user: ApiUser): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<ApiUser | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ApiUser;
    } catch {
      return null;
    }
  },

  async setKeepSignedIn(value: boolean): Promise<void> {
    await AsyncStorage.setItem(KEEP_SIGNED_IN_KEY, value ? 'true' : 'false');
  },

  async getKeepSignedIn(): Promise<boolean | null> {
    const raw = await AsyncStorage.getItem(KEEP_SIGNED_IN_KEY);
    if (raw == null) {
      return null;
    }
    return raw === 'true';
  },

  async setLocalProfile(profile: LocalProfile): Promise<void> {
    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  },

  async getLocalProfile(): Promise<LocalProfile | null> {
    const raw = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as LocalProfile;
    } catch {
      return null;
    }
  },

  async setLocation(location: CapturedLocation): Promise<void> {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  },

  async getLocation(): Promise<CapturedLocation | null> {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CapturedLocation;
    } catch {
      return null;
    }
  },

  async setOnline(value: boolean): Promise<void> {
    await AsyncStorage.setItem(ONLINE_KEY, value ? 'true' : 'false');
  },

  async getOnline(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(ONLINE_KEY);
    return raw === 'true';
  },

  async clear(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(KEEP_SIGNED_IN_KEY),
      AsyncStorage.removeItem(LOCAL_PROFILE_KEY),
      AsyncStorage.removeItem(LOCATION_KEY),
      AsyncStorage.removeItem(ONLINE_KEY),
    ]);
  },
};
