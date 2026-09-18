import {CurrentJob, EarningsData, IncomingJob, JobHistoryData, ProviderDashboardStats} from '../types';
import {PROVIDER_API_BASE_URL} from '../config/env';
import {api} from './api';

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const firstNumber = (...values: unknown[]): number | undefined => {
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
  return undefined;
};

const normalizeJob = (payload: unknown): IncomingJob | null => {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    return payload.length ? normalizeJob(payload[0]) : null;
  }

  const record = asRecord(payload);
  const nested = asRecord(record.booking ?? record.job ?? record.request);
  const source = Object.keys(nested).length ? nested : record;
  const pickup = asRecord(source.pickup ?? source.pickupLocation);
  const drop = asRecord(source.drop ?? source.dropLocation ?? source.destination);

  const bookingId = firstString(
    source.bookingId,
    source._id,
    source.id,
    record.bookingId,
  );
  if (!bookingId) {
    return null;
  }

  return {
    bookingId,
    status: firstString(source.status, record.status) ?? 'pending',
    otp: firstNumber(source.otp, record.otp),
    customerName: firstString(
      source.customerName,
      source.userName,
      source.patientName,
      source.name,
    ),
    customerPhone: firstString(
      source.customerPhone,
      source.phoneNumber,
      source.userPhone,
    ),
    customerImage: firstString(
      source.customerImage,
      source.profilePicture,
      source.profileImage,
    ),
    customerRating: firstNumber(source.customerRating, source.rating),
    customerRatingCount: firstNumber(
      source.customerRatingCount,
      source.totalRatings,
      source.ratingCount,
    ),
    address: firstString(
      source.address,
      pickup.address,
      source.pickupAddress,
    ),
    lat: firstNumber(source.lat, pickup.latitude, pickup.lat, source.pickupLat),
    lng: firstNumber(
      source.lng,
      pickup.longitude,
      pickup.lng,
      source.pickupLng,
    ),
    dropAddress: firstString(source.dropAddress, drop.address),
    dropLat: firstNumber(source.dropLat, drop.latitude, drop.lat),
    dropLng: firstNumber(source.dropLng, drop.longitude, drop.lng),
    distanceKm: firstNumber(source.distanceKm, source.distance),
    etaMinutes: firstNumber(source.etaMinutes, source.eta),
    remainingMinutes: firstNumber(source.remainingMinutes),
    ratePerMinute: firstNumber(source.ratePerMinute, source.pricePerMinute),
    isFree: source.isFree === true || source.freeService === true,
    scheduledAt: firstString(source.scheduledAt, source.createdAt, source.bookingDate),
  };
};

const normalizeHistory = (payload: unknown): JobHistoryData => {
  if (!payload) {
    return {jobs: [], total: 0};
  }

  if (Array.isArray(payload)) {
    return {jobs: payload as JobHistoryData['jobs'], total: payload.length};
  }

  const record = asRecord(payload);
  const jobs = Array.isArray(record.jobs)
    ? (record.jobs as JobHistoryData['jobs'])
    : Array.isArray(record.bookings)
      ? (record.bookings as JobHistoryData['jobs'])
      : Array.isArray(record.data)
        ? (record.data as JobHistoryData['jobs'])
        : [];
  const total =
    typeof record.total === 'number'
      ? record.total
      : typeof record.count === 'number'
        ? record.count
        : jobs.length;
  return {jobs, total};
};

const normalizeDashboard = (payload: unknown): ProviderDashboardStats => {
  const record = asRecord(payload);
  return {
    totalBookings: firstNumber(record.totalBookings) ?? 0,
    completedBookings: firstNumber(record.completedBookings) ?? 0,
    cancelledBookings: firstNumber(record.cancelledBookings) ?? 0,
    pendingBookings: firstNumber(record.pendingBookings) ?? 0,
    todayEarnings:
      firstNumber(record.todayEarnings, record.today) ?? 0,
    weekEarnings: firstNumber(record.weekEarnings, record.week) ?? 0,
    monthEarnings: firstNumber(record.monthEarnings, record.month) ?? 0,
    totalEarnings: firstNumber(record.totalEarnings, record.total) ?? 0,
    jobsToday: firstNumber(record.jobsToday) ?? 0,
    minutesToday: firstNumber(record.minutesToday) ?? 0,
    totalMinutesServed: firstNumber(record.totalMinutesServed) ?? 0,
    totalJobs: firstNumber(record.totalJobs, record.completedBookings) ?? 0,
    isOnline: record.isOnline === true,
    name: firstString(record.name),
    providerType:
      firstString(record.providerType) === 'free' ? 'free' : 'paid',
    profileImage: firstString(record.profileImage, record.profilePicture),
  };
};

export const jobService = {
  async updateLocation(lat: number, lng: number): Promise<void> {
    await api.post('/update-location', {
      auth: true,
      body: {lat, lng},
      baseUrl: PROVIDER_API_BASE_URL,
    });
  },

  async setOnlineStatus(isOnline: boolean, lat?: number, lng?: number): Promise<void> {
    await api.post('/toggle-status', {
      auth: true,
      body: {
        isOnline,
        lat,
        lng,
      },
      baseUrl: PROVIDER_API_BASE_URL,
    });
  },

  async setServiceMode(providerType: 'free' | 'paid'): Promise<void> {
    await api.post('/service-mode', {
      auth: true,
      body: {providerType},
      baseUrl: PROVIDER_API_BASE_URL,
    });
  },

  async getPendingRequest(): Promise<IncomingJob | null> {
    const data = await api.post<unknown>('/pending-request', {
      auth: true,
      baseUrl: PROVIDER_API_BASE_URL,
    });
    return normalizeJob(data);
  },

  async getCurrentJob(): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/current-job', {
      auth: true,
      baseUrl: PROVIDER_API_BASE_URL,
    });
    return normalizeJob(data);
  },

  async acceptJob(bookingId: string): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/accept-booking', {
      auth: true,
      body: {bookingId},
      baseUrl: PROVIDER_API_BASE_URL,
    });
    return normalizeJob(data);
  },

  async rejectJob(bookingId: string, reason = 'Skipped by caretaker'): Promise<void> {
    await api.post('/reject-booking', {
      auth: true,
      body: {bookingId, reason},
      baseUrl: PROVIDER_API_BASE_URL,
    });
  },

  async markArrived(bookingId: string): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/arrive', {
      auth: true,
      body: {bookingId},
    });
    return normalizeJob(data);
  },

  async startJob(bookingId: string, otp: string): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/start-service', {
      auth: true,
      body: {bookingId, otp},
    });
    return normalizeJob(data);
  },

  async completeJob(bookingId: string): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/complete-service', {
      auth: true,
      body: {bookingId},
    });
    return normalizeJob(data);
  },

  async getDashboardStats(): Promise<ProviderDashboardStats> {
    const data = await api.post<unknown>('/dashboard-stats', {
      auth: true,
      baseUrl: PROVIDER_API_BASE_URL,
    });
    return normalizeDashboard(data);
  },

  async getJobHistory(): Promise<JobHistoryData> {
    const data = await api.post<unknown>('/job-history', {auth: true});
    return normalizeHistory(data);
  },

  async getEarnings(): Promise<EarningsData> {
    const stats = await this.getDashboardStats();
    return {
      today: stats.todayEarnings,
      week: stats.weekEarnings,
      month: stats.monthEarnings,
      total: stats.totalEarnings,
      jobsToday: stats.jobsToday,
      minutesToday: stats.minutesToday,
    };
  },
};
