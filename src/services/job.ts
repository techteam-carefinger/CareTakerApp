import {CurrentJob, EarningsData, IncomingJob, JobHistoryData} from '../types';
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
    customerRating: firstNumber(source.customerRating, source.rating),
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

const normalizeEarnings = (payload: unknown): EarningsData => {
  const record = asRecord(payload);
  return {
    today: firstNumber(record.today, record.todayEarnings, record.daily) ?? 0,
    week: firstNumber(record.week, record.weekEarnings, record.weekly) ?? 0,
    month: firstNumber(record.month, record.monthEarnings, record.monthly) ?? 0,
    total: firstNumber(record.total, record.totalEarnings) ?? 0,
    jobsToday: firstNumber(record.jobsToday, record.todayJobs) ?? 0,
    minutesToday: firstNumber(record.minutesToday, record.todayMinutes) ?? 0,
  };
};

export const jobService = {
  async updateLocation(lat: number, lng: number): Promise<void> {
    await api.post('/update-location', {
      auth: true,
      body: {lat, lng},
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
    });
  },

  async getPendingRequest(): Promise<IncomingJob | null> {
    const data = await api.post<unknown>('/pending-request', {auth: true});
    return normalizeJob(data);
  },

  async getCurrentJob(): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/current-job', {auth: true});
    return normalizeJob(data);
  },

  async acceptJob(bookingId: string): Promise<CurrentJob | null> {
    const data = await api.post<unknown>('/accept-booking', {
      auth: true,
      body: {bookingId},
    });
    return normalizeJob(data);
  },

  async rejectJob(bookingId: string, reason = 'Skipped by caretaker'): Promise<void> {
    await api.post('/reject-booking', {
      auth: true,
      body: {bookingId, reason},
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

  async getJobHistory(): Promise<JobHistoryData> {
    const data = await api.post<unknown>('/job-history', {auth: true});
    return normalizeHistory(data);
  },

  async getEarnings(): Promise<EarningsData> {
    const data = await api.post<unknown>('/earnings', {auth: true});
    return normalizeEarnings(data);
  },
};
