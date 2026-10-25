export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}

let cachedCsrfToken: string | null = null;

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCsrfToken(token: string | null): void {
  cachedCsrfToken = token;
}

export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    // 1. Prefer cookie directly if available (canonical source in browser)
    const cookieToken = getCookie('festconnect_csrf');
    if (cookieToken) {
      cachedCsrfToken = cookieToken;
      return cookieToken;
    }

    // 2. Use in-memory cached token (e.g. from login response or test mock)
    if (cachedCsrfToken) {
      return cachedCsrfToken;
    }
  }

  // 3. Fetch fresh token from backend probe
  try {
    const res = await fetch('/api/v1/auth/csrf', {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken || '';
    }
  } catch {
    // Return cached token if network probe fails
  }

  return cachedCsrfToken || '';
}

export function clearCsrfCache(): void {
  cachedCsrfToken = null;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const token = await getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  // Auto-retry once if CSRF mismatch or expired token occurs
  const errorMessage = String(data?.error?.message || data?.message || '');
  if (
    !isRetry &&
    response.status === 403 &&
    errorMessage.toLowerCase().includes('csrf')
  ) {
    clearCsrfCache();
    const freshToken = await getCsrfToken(true);
    if (freshToken) {
      const retryHeaders = {
        ...headers,
        'X-CSRF-Token': freshToken,
      };
      return apiClient<T>(endpoint, { ...options, headers: retryHeaders }, true);
    }
  }

  if (!response.ok) {
    const apiError: ApiError = {
      statusCode: response.status,
      code: data?.error?.code || 'API_ERROR',
      message: data?.error?.message || data?.message || `Request failed with status ${response.status}`,
      details: data?.error?.details || [],
    };
    throw apiError;
  }

  return (data?.data !== undefined ? data.data : data) as T;
}
