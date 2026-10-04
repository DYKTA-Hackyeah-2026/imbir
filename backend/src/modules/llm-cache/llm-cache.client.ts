import config from '../../config/config.js';
import { HttpError } from '../../utils/http-error.js';

export interface UpstreamResponse {
  status: number;
  headers: Headers;
  data: unknown;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new HttpError(502, `LLM cache unreachable: ${message}`, 'INTERNAL_SERVER_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function adminHeaders(): Record<string, string> {
  if (!config.llmCacheAdminToken) {
    throw HttpError.internal('LLM_CACHE_ADMIN_TOKEN is not configured');
  }
  return { 'x-admin-token': config.llmCacheAdminToken };
}

export interface ChatRequestOptions {
  body: unknown;
  cacheSpace?: string;
}

export async function chatCompletions(options: ChatRequestOptions): Promise<UpstreamResponse> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.cacheSpace) {
    headers['x-cache-space'] = options.cacheSpace;
  }

  const response = await fetchWithTimeout(
    `${config.llmCacheUrl}/v1/chat/completions`,
    { method: 'POST', headers, body: JSON.stringify(options.body) },
    config.llmCacheTimeoutMs,
  );

  return { status: response.status, headers: response.headers, data: await readBody(response) };
}

export async function getModels(): Promise<UpstreamResponse> {
  const response = await fetchWithTimeout(
    `${config.llmCacheUrl}/v1/models`,
    { method: 'GET' },
    config.llmCacheTimeoutMs,
  );
  return { status: response.status, headers: response.headers, data: await readBody(response) };
}

export async function health(): Promise<UpstreamResponse> {
  const response = await fetchWithTimeout(
    `${config.llmCacheUrl}/health`,
    { method: 'GET' },
    config.llmCacheTimeoutMs,
  );
  return { status: response.status, headers: response.headers, data: await readBody(response) };
}

export interface AdminRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: string;
  body?: unknown;
}

export async function adminRequest(request: AdminRequest): Promise<UpstreamResponse> {
  const headers: Record<string, string> = { ...adminHeaders() };
  let payload: string | undefined;
  if (request.body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(request.body);
  }

  const query = request.query ?? '';
  const url = `${config.llmCacheUrl}/admin/api${request.path}${query}`;

  const response = await fetchWithTimeout(
    url,
    { method: request.method, headers, body: payload },
    config.llmCacheTimeoutMs,
  );

  return { status: response.status, headers: response.headers, data: await readBody(response) };
}

export { HttpError };
