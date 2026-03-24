const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function buildHeaders(session, headers = {}) {
  return {
    ...JSON_HEADERS,
    ...headers,
    'x-user-id': session.userId,
    'x-user-roles': session.role
  };
}

function normalizePath(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return path.startsWith('/api/') || path === '/health' ? path : `/api/v1${path}`;
}

export function createApiClient(session, apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '') {
  async function request(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}${normalizePath(path)}`, {
      method: options.method ?? 'GET',
      headers: buildHeaders(session, options.headers),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = payload?.message ?? payload?.error ?? `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  }

  return {
    request
  };
}
