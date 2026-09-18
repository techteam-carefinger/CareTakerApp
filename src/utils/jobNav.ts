import {RootStackParamList} from '../navigation/types';
import {IncomingJob} from '../types';

export function toActiveJobParams(
  job: IncomingJob,
  fallbackAddress = 'Pickup location',
): RootStackParamList['ActiveJob'] | null {
  if (job.lat == null || job.lng == null) {
    return null;
  }

  return {
    bookingId: job.bookingId,
    otp: job.otp,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    pickup: {
      address: job.address || fallbackAddress,
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
  };
}
