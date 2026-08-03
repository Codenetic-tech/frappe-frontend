/**
 * Global API Session Expiry Interceptor
 * Intercepts all network requests (fetch and XMLHttpRequest) across the application.
 * If an API response returns `session_expired: 1`, it immediately triggers a global logout.
 */

import { toast } from 'sonner';

let isInterceptorActive = false;
let isLoggingOut = false;

const isSessionExpiredResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;

    // Check direct property `session_expired: 1` or `"1"` or `true`
    if (data.session_expired === 1 || data.session_expired === '1' || data.session_expired === true) {
        return true;
    }

    // Check inside `_server_messages` JSON string
    if (typeof data._server_messages === 'string') {
        if (
            data._server_messages.includes('"session_expired":1') ||
            data._server_messages.includes('"session_expired": 1') ||
            data._server_messages.includes('"session_expired":"1"')
        ) {
            return true;
        }
    }

    return false;
};

export const triggerGlobalLogout = (reason?: string) => {
    if (isLoggingOut) return;
    isLoggingOut = true;

    console.warn('[Global Session Interceptor] Session expired detected! Logging out user...', reason);

    try {
        toast.error('Session expired. Please log in again.', {
            id: 'session-expired-toast',
        });
    } catch {
        // Fallback if toast unavailable
    }

    // Clear session storage
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('frappe_user');
    sessionStorage.clear();

    // Dispatch global event for AuthContext to sync state
    window.dispatchEvent(new CustomEvent('frappe-session-expired'));

    // Redirect to login if not already there
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }

    setTimeout(() => {
        isLoggingOut = false;
    }, 3000);
};

export const setupGlobalSessionInterceptor = () => {
    if (isInterceptorActive) return;
    isInterceptorActive = true;

    // 1. Intercept window.fetch (covers fetch, frappe-react-sdk, SWR, etc.)
    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
        const response = await originalFetch.apply(this, args);

        try {
            const clonedResponse = response.clone();
            clonedResponse.json().then((data) => {
                if (isSessionExpiredResponse(data)) {
                    triggerGlobalLogout('fetch response contains session_expired: 1');
                }
            }).catch(() => {
                // Ignore non-JSON responses
            });
        } catch {
            // Ignore clone errors
        }

        return response;
    };

    // 2. Intercept XMLHttpRequest (covers legacy or Axios XHR calls)
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args: any[]) {
        this.addEventListener('load', function () {
            try {
                if (this.responseText) {
                    const data = JSON.parse(this.responseText);
                    if (isSessionExpiredResponse(data)) {
                        triggerGlobalLogout('XHR response contains session_expired: 1');
                    }
                }
            } catch {
                // Ignore non-JSON responses
            }
        });
        return originalXHRSend.apply(this, args);
    };

    console.log('[Global Session Interceptor] Initialized and monitoring for session_expired: 1');
};
