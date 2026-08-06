// ─── API Client (Axios/Fetch instance with base URL) ───

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/**
 * Lightweight fetch wrapper with:
 *  - Automatic JSON serialisation / deserialisation
 *  - Query-string builder from `params`
 *  - Centralised error handling
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers: customHeaders, ...rest } = options;

  // Build query string
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`API ${response.status}: ${errorBody}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ─── Convenience methods ───

export const api = {
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    return request<T>(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PATCH', body });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export default api;
