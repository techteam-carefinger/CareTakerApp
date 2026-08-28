import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
} from '@react-native-firebase/auth';

import {AUTH_CONFIG, PROVIDER_API_BASE_URL} from '../config/env';
import {ApiUser, LoginData} from '../types';
import {api, UploadFile} from './api';
import {storage} from './storage';

type PendingConfirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

/**
 * Firebase's confirmation result is not serialisable, so it cannot be passed
 * through navigation params. We keep it here between the Login and OTP screens.
 */
let pendingConfirmation: PendingConfirmation | null = null;
let awaitingAutoVerification = false;

const toE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return `${AUTH_CONFIG.defaultCountryCode}${digits}`;
};

const toLocalPhone = (phone: string): string =>
  phone.replace(/\D/g, '').slice(-10);

const isUserProfileComplete = (user: ApiUser): boolean =>
  Boolean(user.isProfileCompleted) ||
  Boolean(user.name && user.name.trim().length >= 3);

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const isLocalFileUri = (value?: string): boolean =>
  Boolean(
    value &&
      (value.startsWith('file://') ||
        value.startsWith('content://') ||
        value.startsWith('ph://')),
  );

/**
 * Maps `/api/provider` documents onto the app's `ApiUser` shape.
 */
const normalizeProvider = (payload: unknown): ApiUser => {
  const record = asRecord(payload);
  const nested = asRecord(record.provider);
  const source = Object.keys(nested).length ? nested : record;
  const location = asRecord(source.location);
  const coordinates = Array.isArray(location.coordinates)
    ? location.coordinates
    : [];
  const id = firstString(source._id, source.id, source.providerId, source.user_id);
  const lng = firstNumber(source.lng, coordinates[0]);
  const lat = firstNumber(source.lat, coordinates[1]);

  return {
    user_id: id,
    providerId: id,
    takerId: id,
    name: firstString(source.name) || null,
    phoneNumber: firstString(source.phone, source.phoneNumber),
    email: firstString(source.email) || null,
    profilePicture:
      firstString(source.profileImage, source.profilePicture) || null,
    isOnline: Boolean(source.isOnline),
    isProfileCompleted: Boolean(source.isProfileCompleted),
    lat,
    lng,
  };
};

type ProviderAuthPayload = {
  token?: string;
  provider?: unknown;
};

const toLoginData = (payload: unknown): LoginData => {
  const record = asRecord(payload);
  const nested = asRecord(record.data);
  const user = normalizeProvider(payload);
  const token = firstString(record.token, nested.token);

  if (!token) {
    throw new Error('Login succeeded but no session token was returned.');
  }

  return {
    token,
    user,
    isProfileComplete: isUserProfileComplete(user),
  };
};

export type RestoredSession =
  | {route: 'Login'}
  | {route: 'Home'}
  | {route: 'ProfileSetup'; phoneNumber: string}
  | {route: 'RegistrationDocuments'; phoneNumber: string};

const sessionFromUser = async (user: ApiUser): Promise<RestoredSession> => {
  const local = await storage.getLocalProfile();
  const phoneNumber = toLocalPhone(user.phoneNumber);

  if (local?.registrationStep === 2) {
    return {route: 'RegistrationDocuments', phoneNumber};
  }

  if (
    isUserProfileComplete(user) &&
    local?.registrationStep !== 1 &&
    local?.registrationStep !== 2
  ) {
    return {route: 'Home'};
  }

  return {route: 'ProfileSetup', phoneNumber};
};

const firebaseAuthMessage = (error: unknown, fallback: string): Error => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as {code?: string}).code)
      : '';

  const messages: Record<string, string> = {
    'auth/invalid-phone-number': 'Enter a valid 10-digit mobile number.',
    'auth/missing-phone-number': 'Phone number is required.',
    'auth/too-many-requests':
      'Too many OTP requests. Please wait and try again.',
    'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.',
    'auth/invalid-verification-code':
      'Invalid OTP. Please check the code and try again.',
    'auth/session-expired': 'OTP expired. Please request a new code.',
    'auth/code-expired': 'OTP expired. Please request a new code.',
    'auth/missing-verification-code':
      'Enter the 6-digit OTP sent to your phone.',
    'auth/network-request-failed':
      'Network error. Check your connection and try again.',
    'auth/app-not-authorized':
      'This app is not authorized for phone login. Add the debug SHA-1 in Firebase.',
    'auth/missing-client-identifier':
      'This app is not authorized for phone login. Add the debug SHA-1 in Firebase.',
    'auth/captcha-check-failed':
      'Phone verification failed. Please try again.',
    'auth/invalid-app-credential':
      'Firebase Phone Auth is not set up for this app. Check SHA-1 fingerprints.',
  };

  if (messages[code]) {
    return new Error(messages[code]);
  }

  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }

  return new Error(fallback);
};

export const authService = {
  /**
   * Triggers Firebase Phone Auth, sending an SMS OTP to the given number.
   * The backend never receives this code — it only verifies the Firebase ID token.
   */
  async sendOtp(phone: string): Promise<void> {
    awaitingAutoVerification = true;
    await getAuth()
      .signOut()
      .catch(() => undefined);

    try {
      const confirmation = await signInWithPhoneNumber(
        getAuth(),
        toE164(phone),
      );
      pendingConfirmation = confirmation;
    } catch (error) {
      awaitingAutoVerification = false;
      pendingConfirmation = null;
      throw firebaseAuthMessage(error, 'Could not send OTP. Please try again.');
    }
  },

  hasPendingOtp(): boolean {
    return pendingConfirmation != null;
  },

  /**
   * On Android, Firebase can auto-verify the SMS and sign the user in without
   * manual code entry. Listen for that and complete the backend login flow.
   */
  subscribeAutoVerification(
    onVerified: (idToken: string) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const unsubscribe = onAuthStateChanged(getAuth(), async user => {
      if (!awaitingAutoVerification || !pendingConfirmation || !user) {
        return;
      }

      try {
        awaitingAutoVerification = false;
        pendingConfirmation = null;
        const idToken = await user.getIdToken(true);
        onVerified(idToken);
      } catch (error) {
        awaitingAutoVerification = false;
        onError?.(
          firebaseAuthMessage(
            error,
            'Automatic OTP verification failed. Please enter the code.',
          ),
        );
      }
    });

    return unsubscribe;
  },

  /**
   * Confirms the SMS code with Firebase and returns the fresh Firebase ID token.
   * The backend `/login` endpoint verifies this token via firebase-admin.
   */
  async confirmOtp(code: string): Promise<string> {
    if (!pendingConfirmation) {
      throw new Error('No OTP request in progress. Please resend the code.');
    }

    try {
      await pendingConfirmation.confirm(code);
    } catch (error) {
      throw firebaseAuthMessage(
        error,
        'Invalid or expired OTP. Please try again.',
      );
    }

    awaitingAutoVerification = false;
    pendingConfirmation = null;

    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      throw new Error('Firebase sign-in failed. Please try again.');
    }

    return currentUser.getIdToken(true);
  },

  /**
   * Logs in the provider via `POST /api/provider/login` with the Firebase
   * ID token — same pattern as CareFIngerUserApp `POST /api/patient/login`.
   */
  async login(
    idToken: string,
    extra?: {
      name?: string;
      email?: string;
      lat?: number;
      lng?: number;
      fcmToken?: string;
      keepSignedIn?: boolean;
    },
  ): Promise<LoginData> {
    const {keepSignedIn = true, ...loginFields} = extra ?? {};
    const payload = await api.post<ProviderAuthPayload>('/login', {
      baseUrl: PROVIDER_API_BASE_URL,
      body: {idToken, ...loginFields},
    });

    const data = toLoginData(payload);

    await storage.setToken(data.token);
    await storage.setUser(data.user);
    await storage.setKeepSignedIn(keepSignedIn !== false);

    return data;
  },

  async updateProfile(fields: {
    name?: string;
    email?: string;
    profilePicture?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    experience?: string | number;
    education?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
    aadhaarFrontImage?: UploadFile;
    aadhaarBackImage?: UploadFile;
    licenseFrontImage?: UploadFile;
    licenseBackImage?: UploadFile;
  }): Promise<ApiUser> {
    const {
      profilePicture,
      vehicleNumber,
      vehicleModel,
      aadhaarFrontImage,
      aadhaarBackImage,
      licenseFrontImage,
      licenseBackImage,
      ...formFields
    } = fields;
    const profileImage = isLocalFileUri(profilePicture)
      ? {uri: profilePicture as string, name: 'profile.jpg'}
      : undefined;

    const provider = await api.post<unknown>('/profile', {
      auth: true,
      baseUrl: PROVIDER_API_BASE_URL,
      form: formFields,
      files: {
        profileImage,
        aadhaarFrontImage,
        aadhaarBackImage,
        panFrontImage: licenseFrontImage,
        panBackImage: licenseBackImage,
      },
    });

    const user = normalizeProvider(provider);
    if (vehicleNumber) {
      user.vehicleNumber = vehicleNumber;
    }
    if (vehicleModel) {
      user.vehicleModel = vehicleModel;
    }

    await storage.setUser(user);
    return user;
  },

  async me(): Promise<ApiUser> {
    const provider = await api.post<unknown>('/profile', {
      auth: true,
      baseUrl: PROVIDER_API_BASE_URL,
    });
    const user = normalizeProvider(provider);
    await storage.setUser(user);
    return user;
  },

  async restoreSession(): Promise<RestoredSession> {
    const token = await storage.getToken();
    if (!token) {
      return {route: 'Login'};
    }

    const keepSignedIn = await storage.getKeepSignedIn();
    if (keepSignedIn === false) {
      await this.logout();
      return {route: 'Login'};
    }

    const cachedUser = await storage.getUser();

    try {
      const user = await this.me();
      return await sessionFromUser(user);
    } catch {
      // Keep the saved session. Do not force OTP login again after a
      // profile refresh failure (network, 401 from a stale route, etc.).
      if (cachedUser) {
        return await sessionFromUser(cachedUser);
      }
      return {route: 'Home'};
    }
  },

  async logout(): Promise<void> {
    awaitingAutoVerification = false;
    pendingConfirmation = null;
    await getAuth()
      .signOut()
      .catch(() => undefined);
    await storage.clear();
  },
};
