// ==============================================================================
// MediCloud API Client Wrapper & Toast Notification Engine
// ==============================================================================

const API = {
  getBaseUrl() {
    if (typeof window !== 'undefined' && window.MEDICLOUD_API_BASE) {
      return window.MEDICLOUD_API_BASE.replace(/\/+$/, '');
    }
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="medicloud-api-base"]');
      if (meta && meta.content && !meta.content.startsWith('%')) {
        return meta.content.trim().replace(/\/+$/, '');
      }
    }
    try {
      const stored = localStorage.getItem('medicloud_api_base');
      if (stored) return stored.trim().replace(/\/+$/, '');
    } catch (_) {}
    return '';
  },

  async request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    const baseUrl = this.getBaseUrl();
    const url = (endpoint.startsWith('http://') || endpoint.startsWith('https://'))
      ? endpoint
      : `${baseUrl}${endpoint}`;

    const config = {
      method: options.method || 'GET',
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      credentials: 'include'
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Special case: 401 Unauthorized redirect to login if not already on login
        if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
          if (window.Router && window.Router.currentRoute !== 'login') {
            window.Router.navigate('login');
          }
        }
        const error = new Error(data.error || `HTTP ${response.status}: Request failed`);
        error.status = response.status;
        error.code = data.code;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// Toast Notifications
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${icons[type] || 'ℹ️'}</span>
    <div style="flex: 1; font-weight: 500;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
