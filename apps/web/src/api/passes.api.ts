import { apiClient } from './client.js';
import {
  PassDetailResponse,
  VerifyPassRequest,
  VerifyPassResponse,
  EmailNotificationStatus,
} from '../types/pass.types.js';

export async function fetchRegistrationPass(registrationId: number): Promise<PassDetailResponse> {
  return apiClient<PassDetailResponse>(`/api/v1/registrations/${registrationId}/pass`);
}

export async function generateRegistrationPass(registrationId: number): Promise<PassDetailResponse> {
  return apiClient<PassDetailResponse>(`/api/v1/registrations/${registrationId}/pass`, {
    method: 'POST',
  });
}

export async function fetchPassById(passId: number): Promise<PassDetailResponse> {
  return apiClient<PassDetailResponse>(`/api/v1/passes/${passId}`);
}

export async function verifyPass(request: VerifyPassRequest): Promise<VerifyPassResponse> {
  return apiClient<VerifyPassResponse>('/api/v1/passes/verify', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function validatePass(request: VerifyPassRequest): Promise<VerifyPassResponse> {
  return apiClient<VerifyPassResponse>('/api/v1/passes/validate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function fetchEmailNotificationStatus(registrationId: number): Promise<EmailNotificationStatus> {
  return apiClient<EmailNotificationStatus>(`/api/v1/registrations/${registrationId}/notifications/email`);
}

export async function sendOrRetryEmailNotification(
  registrationId: number,
  force = false
): Promise<EmailNotificationStatus> {
  return apiClient<EmailNotificationStatus>(`/api/v1/registrations/${registrationId}/notifications/email`, {
    method: 'POST',
    body: JSON.stringify({ force }),
  });
}
