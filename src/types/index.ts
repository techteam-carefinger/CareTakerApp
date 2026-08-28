/**
 * Shapes returned by the CareFinger backend (`modules/takerApp`).
 * Field names are parsed defensively so the UI can tolerate aliases.
 */
export interface ApiUser {
  user_id: string;
  takerId?: string;
  providerId?: string;
  name: string | null;
  phoneNumber: string;
  email: string | null;
  profilePicture: string | null;
  vehicleNumber?: string | null;
  vehicleModel?: string | null;
  rating?: number;
  isOnline?: boolean;
  isProfileCompleted?: boolean;
  totalEarnings?: number;
  todayEarnings?: number;
  totalJobs?: number;
  totalMinutesServed?: number;
  lat: number | null;
  lng: number | null;
}

export interface LoginData {
  token: string;
  user: ApiUser;
  isProfileComplete: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface LegalDocument {
  _id: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalProfile {
  address?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  emergencyContact?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female';
  shift?: string;
  serviceType?: string;
  registrationStep?: 1 | 2 | 'done';
}

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  address?: string;
  capturedAt: number;
}

export interface RideLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export type JobStatus =
  | 'searching'
  | 'pending'
  | 'accepted'
  | 'arrived'
  | 'started'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface IncomingJob {
  bookingId: string;
  status: JobStatus | string;
  otp?: number;
  customerName?: string;
  customerPhone?: string;
  customerRating?: number;
  address?: string;
  lat?: number;
  lng?: number;
  dropAddress?: string;
  dropLat?: number;
  dropLng?: number;
  distanceKm?: number;
  etaMinutes?: number;
  remainingMinutes?: number;
  ratePerMinute?: number;
  isFree?: boolean;
}

export interface CurrentJob extends IncomingJob {
  startedAt?: string;
  minutes?: number;
  earnings?: number;
}

export interface JobHistoryItem {
  bookingId?: string;
  _id?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  bookingDate?: string;
  date?: string;
  amount?: number;
  price?: number;
  totalAmount?: number;
  earnings?: number;
  minutes?: number;
  customerName?: string;
}

export interface JobHistoryData {
  jobs: JobHistoryItem[];
  total: number;
}

export interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  jobsToday: number;
  minutesToday: number;
}
