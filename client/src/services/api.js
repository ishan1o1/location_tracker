import authService from './authService';

export async function apiFetch(url, options = {}) {
    const token = authService.getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        authService.logout();
        sessionStorage.setItem('pendingAuthError', 'Your session has expired. Please log in again.');
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    return response;
}

export default apiFetch;
