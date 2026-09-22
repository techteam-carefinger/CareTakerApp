import {PROVIDER_API_BASE_URL} from '../config/env';
import {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
} from '../types';
import {api, ApiError} from './api';

const CATEGORIES: ComplaintCategory[] = [
  'payment',
  'booking',
  'app',
  'account',
  'other',
];

const STATUSES: ComplaintStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'rejected',
];

export const COMPLAINT_CATEGORY_OPTIONS: Array<{
  value: ComplaintCategory;
  label: string;
}> = [
  {value: 'payment', label: 'Payment'},
  {value: 'booking', label: 'Booking'},
  {value: 'app', label: 'App'},
  {value: 'account', label: 'Account'},
  {value: 'other', label: 'Other'},
];

export const COMPLAINT_STATUS_OPTIONS: Array<{
  value: ComplaintStatus | 'all';
  label: string;
}> = [
  {value: 'all', label: 'All'},
  {value: 'open', label: 'Open'},
  {value: 'in_progress', label: 'In Progress'},
  {value: 'resolved', label: 'Resolved'},
  {value: 'rejected', label: 'Rejected'},
];

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  open: '#F97316',
  in_progress: '#2563EB',
  resolved: '#16A34A',
  rejected: '#DC2626',
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const isCategory = (value: unknown): value is ComplaintCategory =>
  typeof value === 'string' && CATEGORIES.includes(value as ComplaintCategory);

const isStatus = (value: unknown): value is ComplaintStatus =>
  typeof value === 'string' && STATUSES.includes(value as ComplaintStatus);

export const complaintCategoryLabel = (category: ComplaintCategory): string =>
  COMPLAINT_CATEGORY_OPTIONS.find(option => option.value === category)?.label ??
  'Other';

export const complaintStatusLabel = (status: ComplaintStatus): string =>
  COMPLAINT_STATUS_OPTIONS.find(option => option.value === status)?.label ??
  'Open';

export const complaintStatusColor = (status: ComplaintStatus): string =>
  STATUS_COLORS[status] ?? STATUS_COLORS.open;

export const formatComplaintDate = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
  return `${datePart} • ${timePart}`;
};

export const normalizeComplaint = (value: unknown): Complaint | null => {
  const record = asRecord(value);
  const complaintId =
    asString(record.complaintId).trim() || asString(record._id).trim();
  if (!complaintId) {
    return null;
  }

  const bookingId = asString(record.bookingId).trim();

  return {
    complaintId,
    subject: asString(record.subject),
    description: asString(record.description),
    category: isCategory(record.category) ? record.category : 'other',
    status: isStatus(record.status) ? record.status : 'open',
    bookingId: bookingId || null,
    adminNote: asString(record.adminNote),
    resolvedAt: asString(record.resolvedAt).trim() || null,
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
  };
};

const sortNewestFirst = (complaints: Complaint[]): Complaint[] =>
  [...complaints].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return 0;
    }
    return rightTime - leftTime;
  });

export type CreateComplaintInput = {
  subject: string;
  description: string;
  category: ComplaintCategory;
  bookingId?: string;
};

export const complaintService = {
  async create(input: CreateComplaintInput): Promise<Complaint | null> {
    const body: Record<string, unknown> = {
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: input.category,
    };
    const bookingId = input.bookingId?.trim();
    if (bookingId) {
      body.bookingId = bookingId;
    }

    const data = await api.post<unknown>('/complaint_create', {
      auth: true,
      body,
      baseUrl: PROVIDER_API_BASE_URL,
    });
    return normalizeComplaint(data);
  },

  async list(status?: ComplaintStatus): Promise<Complaint[]> {
    const data = await api.post<unknown>('/complaint_get', {
      auth: true,
      body: status ? {status} : {},
      baseUrl: PROVIDER_API_BASE_URL,
    });
    const items = Array.isArray(data) ? data : [];
    return sortNewestFirst(
      items
        .map(item => normalizeComplaint(item))
        .filter((item): item is Complaint => item !== null),
    );
  },

  async get(complaintId: string): Promise<Complaint> {
    const data = await api.post<unknown>('/complaint_get', {
      auth: true,
      body: {complaintId},
      baseUrl: PROVIDER_API_BASE_URL,
    });
    const complaint = normalizeComplaint(data);
    if (!complaint) {
      throw new ApiError('Complaint not found.', 404);
    }
    return complaint;
  },
};
