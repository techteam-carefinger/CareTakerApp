import {API_BASE_URL} from '../config/env';
import {ApiResponse} from '../types';
import {storage} from './storage';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type UploadFile = {
  uri: string;
  name?: string;
  type?: string;
};

interface RequestOptions {
  /** When true, attaches the stored JWT as `Authorization: Bearer <token>`. */
  auth?: boolean;
  /** JSON body. Ignored when `form` or `files` is provided. */
  body?: Record<string, unknown>;
  /** Multipart text fields (used by `POST /api/provider/profile`). */
  form?: Record<string, string | number | boolean | undefined | null>;
  /** Multipart file fields. */
  files?: Record<string, UploadFile | undefined>;
  /** Override the default API origin, e.g. provider vs taker. */
  baseUrl?: string;
}

const guessMimeType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'webp') {
    return 'image/webp';
  }
  if (extension === 'heic' || extension === 'heif') {
    return 'image/heic';
  }
  return 'image/jpeg';
};

const buildFormData = (
  form?: RequestOptions['form'],
  files?: RequestOptions['files'],
): FormData => {
  const formData = new FormData();

  if (form) {
    Object.entries(form).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      formData.append(key, String(value));
    });
  }

  if (files) {
    Object.entries(files).forEach(([key, file]) => {
      if (!file?.uri) {
        return;
      }
      const name = file.name ?? `${key}.jpg`;
      formData.append(key, {
        uri: file.uri,
        name,
        type: file.type ?? guessMimeType(name),
      } as unknown as Blob);
    });
  }

  return formData;
};

/**
 * Thin wrapper around fetch that targets the CareFinger APIs.
 * Backend routes used by the app are POST and return
 * `{ success, message?, data?, error? }`.
 */
async function request<T>(
  path: string,
  {auth = false, body, form, files, baseUrl}: RequestOptions = {},
): Promise<T> {
  const isMultipart = Boolean(form || files);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await storage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl ?? API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: isMultipart
        ? buildFormData(form, files)
        : body
          ? JSON.stringify(body)
          : undefined,
    });
  } catch {
    throw new ApiError(
      'Network request failed. Check your connection and the API URL.',
      0,
    );
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('Unexpected server response.', response.status);
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message || payload.error || 'Something went wrong.',
      response.status,
    );
  }

  return payload.data as T;
}

export const api = {
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, options),
};
