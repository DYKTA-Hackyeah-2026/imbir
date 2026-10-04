/**
 * Example typed frontend client. It is type-checked against the generated
 * `api-types.ts` so the OpenAPI contract and the UI stay in sync.
 */
import type { components } from './api-types';

export type MatchmakingRequest = components['schemas']['MatchmakingRequest'];
export type MatchmakingResponse = components['schemas']['MatchmakingResponse'];
export type Match = components['schemas']['Match'];
export type InnovationDetail = components['schemas']['InnovationDetail'];
export type FeedbackRequest = components['schemas']['FeedbackRequest'];
export type ErrorEnvelope = components['schemas']['ErrorEnvelope'];

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: ErrorEnvelope['error'];
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await response.json()) as T | ErrorEnvelope;
  if (!response.ok) {
    return { ok: false, status: response.status, error: (body as ErrorEnvelope).error };
  }
  return { ok: true, status: response.status, data: body as T };
}

export function requestMatches(input: MatchmakingRequest): Promise<ApiResult<MatchmakingResponse>> {
  return request<MatchmakingResponse>('/api/v1/matchmaking', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getInnovation(innovationId: string): Promise<ApiResult<InnovationDetail>> {
  return request<InnovationDetail>(`/api/v1/innovations/${encodeURIComponent(innovationId)}`);
}

export function sendFeedback(
  requestId: string,
  feedback: FeedbackRequest,
): Promise<ApiResult<{ recorded: boolean }>> {
  return request(`/api/v1/matchmaking/${encodeURIComponent(requestId)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}
