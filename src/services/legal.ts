import {ADMIN_API_BASE_URL} from '../config/env';
import {ApiResponse, LegalDocument} from '../types';
import {ApiError} from './api';

async function fetchLegal(path: string): Promise<LegalDocument> {
  let response: Response;
  try {
    response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({}),
    });
  } catch {
    throw new ApiError(
      'Network request failed. Check your connection and the API URL.',
      0,
    );
  }

  let payload: ApiResponse<LegalDocument>;
  try {
    payload = (await response.json()) as ApiResponse<LegalDocument>;
  } catch {
    throw new ApiError('Unexpected server response.', response.status);
  }

  if (!response.ok || payload.success === false || !payload.data) {
    throw new ApiError(
      payload.message || payload.error || 'Could not load the document.',
      response.status,
    );
  }

  return payload.data;
}

const loadWithFallback = async (primary: string, fallback: string) => {
  try {
    return await fetchLegal(primary);
  } catch {
    return fetchLegal(fallback);
  }
};

export const legalService = {
  getTakerTerms: () => loadWithFallback('/get_taker_terms', '/get_user_terms'),
  getTakerPrivacy: () =>
    loadWithFallback('/get_taker_privacy', '/get_user_privacy'),
};
