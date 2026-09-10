const normalizeBase = (value) => {
  if (!value) return 'http://localhost:5000';
  return String(value).trim().replace(/\/+$/, '');
};

export const API_BASE = normalizeBase(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
);

export const isApiConfigured = Boolean(API_BASE);

export const apiUrl = (path = '') => {
  const base = API_BASE || 'http://localhost:5000';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};


