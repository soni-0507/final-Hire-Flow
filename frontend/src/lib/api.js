   const BASE = import.meta.env.PROD ? 'https://hireflow-api-c8k6.onrender.com/api' : (import.meta.env.VITE_API_URL || '/api');

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

function buildUrl(path, params) {
  const clean = params ? Object.entries(params).filter(([, v]) => v !== '' && v != null) : [];
  return `${BASE}${path}${clean.length ? `?${new URLSearchParams(clean).toString()}` : ''}`;
}

async function request(path, { method = 'GET', body, params } = {}) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data?.errors);
  }
  return data;
}

/** Authenticated file download (plain links cannot send the JWT). */
async function download(path, filename, params) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  let res;
  try {
    res = await fetch(buildUrl(path, params), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.message || 'Download failed', res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
  download,
};

/** Turns API validation details into { fieldName: message } for inline form errors. */
export const fieldErrors = (err) => Object.fromEntries((err?.details || []).map((d) => [d.field, d.message]));
