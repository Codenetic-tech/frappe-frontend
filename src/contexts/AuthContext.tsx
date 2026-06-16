import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFrappeAuth, FrappeContext } from 'frappe-react-sdk';
import { User } from '../utils';

interface AuthContextType {
  user: User | null;
  frappeUser: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean
  login: (employeeId: string, password: string, otp?: string, tmp_id?: string) => Promise<any>;
  loginWithoutPassword: (email: string, fullName?: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const frappeCtx = useContext(FrappeContext) as any;
  const {
    currentUser,
    isLoading: authLoading,
    login: frappeLogin,
    logout: frappeLogout,
    updateCurrentUser,
    error: authError
  } = useFrappeAuth();

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [frappeUser, setFrappeUser] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('frappe_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // isAuthenticated is derived from local user state, not just SDK
  const isAuthenticated = Boolean(user);
  const isLoading = authLoading && !user; // Only show loading if we don't have a user yet
  const isInitialLoading = isLoading;

  // Force validation or logout on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (!savedUser) {
      console.log('No user in sessionStorage on mount, forcing logout...');
      logout();
    } else {
      updateCurrentUser();
    }
  }, []);

  // Listen for user updates from other contexts / components
  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const saved = sessionStorage.getItem('frappe_user');
        if (saved) {
          setFrappeUser(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('AuthContext: failed to sync user update:', e);
      }
    };
    window.addEventListener('frappe-user-updated', handleUserUpdate);
    return () => {
      window.removeEventListener('frappe-user-updated', handleUserUpdate);
    };
  }, []);

  // Sync with SDK state
  useEffect(() => {
    console.log('AuthContext: currentUser changed to:', currentUser);

    if (currentUser) {
      // Check if we already have this user in session storage to avoid race conditions
      const savedUser = sessionStorage.getItem('user');
      const savedFrappeUser = sessionStorage.getItem('frappe_user');
      if (savedUser && savedFrappeUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          const parsedFrappeUser = JSON.parse(savedFrappeUser);
          if (
            parsedUser.id === currentUser &&
            (parsedFrappeUser.username === currentUser ||
              parsedFrappeUser.email === currentUser ||
              parsedFrappeUser.name === currentUser)
          ) {
            console.log('AuthContext: User is already logged in and synchronized. Skipping sync.');
            return;
          }
        } catch (e) {
          console.warn('AuthContext: Error parsing saved user on sync check:', e);
        }
      }

      // Create a basic user object from currentUser (which is likely the email/id)
      const userData: User = {
        id: currentUser,
        email: currentUser,
        firstName: currentUser.split('@')[0] || 'User',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: 'employee',
        user_code: currentUser.split('@')[0] || currentUser
      };

      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));

      // Fetch full User document from Frappe
      try {
        const db = (frappeCtx as any)?.db;
        if (db?.getDoc) {
          db.getDoc('User', currentUser).then((doc: any) => {
            const fullDoc = doc?.data ?? doc;
            setFrappeUser(fullDoc);
            sessionStorage.setItem('frappe_user', JSON.stringify(fullDoc));

            // Sync full profile data like user_code and category from the User document
            setUser(prevUser => {
              if (!prevUser) return null;
              const updated = {
                ...prevUser,
                user_code: fullDoc.username || fullDoc.name || prevUser.user_code,
                category: fullDoc.category || prevUser.category,
                firstName: fullDoc.first_name || prevUser.firstName,
                email: fullDoc.email || prevUser.email
              };
              sessionStorage.setItem('user', JSON.stringify(updated));
              return updated;
            });
          }).catch((err: any) => {
            console.warn('Could not fetch User doc:', err);
          });
        }
      } catch (err) {
        console.warn('frappeCtx.db not available:', err);
      }

    } else if (currentUser === null && !user) {
      // If SDK says null and we have no local user, ensure we are clean
      // Note: We don't clear if we have a user but SDK is null (refresh race),
      // UNLESS there is an error.
      setUser(null);
      setFrappeUser(null);
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('frappe_user');
    }
  }, [currentUser, authError]);

  // Handle Auth Errors (Logout if session is invalid)
  useEffect(() => {
    if (authError) {
      console.error("Auth verification failed:", authError);
      // Check for common auth failure signals: 401, 403 status, or "PermissionError"
      if (
        // @ts-ignore - The error type might not be fully typed in the SDK
        authError.httpStatus === 401 ||
        // @ts-ignore
        authError.httpStatus === 403 ||
        // @ts-ignore
        authError.exception === 'frappe.exceptions.PermissionError' ||
        // @ts-ignore
        authError.exc_type === 'PermissionError'
      ) {
        console.warn("Session invalid (401/403), logging out... (DISABLED FOR DEBUGGING)");
        // logout();
      }
    }
  }, [authError]);

  const login = async (employeeId: string, password: string, otp?: string, tmp_id?: string): Promise<any> => {
    try {
      console.log('Initiating login for:', employeeId, 'OTP:', otp);
      let res;
      if (otp && tmp_id) {
        res = await frappeLogin({
          otp: otp,
          tmp_id: tmp_id
        });
      } else {
        res = await frappeLogin({
          username: employeeId,
          password: password
        });
      }
      console.log('Login response received:', res);

      // Handle 2FA trigger
      if (res.tmp_id && res.verification) {
        console.log('2FA required. Temp ID:', res.tmp_id);
        return {
          requiresOtp: true,
          tmp_id: res.tmp_id,
          verification: res.verification
        };
      }

      // If login is successful
      if (res.message === 'Logged In' || res.message === 'Logged In!') {
        console.log('Login success, resolving logged-in user identity...');

        // Reconnect socket first so that session is established
        try {
          const socket = frappeCtx?.socket;
          if (socket) {
            console.log('Reconnecting socket after login...');
            socket.disconnect();
            socket.connect();
          }
        } catch (socketErr) {
          console.warn('Socket reconnect failed:', socketErr);
        }

        // Try to resolve logged in user identity (email/name)
        let loggedInUserName = employeeId;
        try {
          await updateCurrentUser();
          const fetchRes = await fetch('/api/method/frappe.auth.get_logged_user');
          const data = await fetchRes.json();
          if (data?.message) {
            loggedInUserName = data.message;
          }
        } catch (sdkErr) {
          console.warn('Could not resolve logged-in user name via SDK, using fallback:', sdkErr);
          try {
            const fetchRes = await fetch('/api/method/frappe.auth.get_logged_user');
            const data = await fetchRes.json();
            if (data?.message) {
              loggedInUserName = data.message;
            }
          } catch (innerErr) {
            console.warn('get_logged_user direct fetch failed:', innerErr);
          }
        }

        console.log('Resolved user identity name:', loggedInUserName);

        let userData: User = {
          id: loggedInUserName,
          email: loggedInUserName,
          firstName: res.full_name || loggedInUserName.split('@')[0] || 'User',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          role: 'employee',
          user_code: loggedInUserName
        };

        // Fetch full User document from Frappe FIRST before marking login as complete
        try {
          const db = (frappeCtx as any)?.db;
          if (db?.getDoc && loggedInUserName) {
            console.log('Fetching User document for:', loggedInUserName);
            const doc = await db.getDoc('User', loggedInUserName);
            const fullDoc = doc?.data ?? doc;
            if (fullDoc) {
              setFrappeUser(fullDoc);
              sessionStorage.setItem('frappe_user', JSON.stringify(fullDoc));

              // Sync full profile data like user_code and category from the User document
              userData = {
                ...userData,
                id: loggedInUserName,
                email: fullDoc.email || loggedInUserName,
                user_code: fullDoc.username || fullDoc.name || userData.user_code,
                category: fullDoc.category || userData.category,
                firstName: fullDoc.first_name || userData.firstName
              };
            }
          }
        } catch (err) {
          console.warn('Could not fetch User doc after login:', err);
        }

        setUser(userData);
        sessionStorage.setItem('user', JSON.stringify(userData));

        return { success: true };
      } else {
        console.warn('Login message mismatch but no error thrown. Message:', res?.message);
        // Attempt to update user anyway since auth might have succeeded
        try {
          await updateCurrentUser();
        } catch (e) {
          console.warn('Fallback updateCurrentUser failed:', e);
        }

        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithoutPassword = async (email: string, fullName?: string): Promise<void> => {
    try {
      console.log('Manually updating user state for login without password:', email);

      // Reconnect socket first so that session is established
      try {
        const socket = frappeCtx?.socket;
        if (socket) {
          socket.disconnect();
          socket.connect();
        }
      } catch (socketErr) {
        console.warn('Socket reconnect failed:', socketErr);
      }

      // Try to resolve logged in user identity for consistency
      let loggedInUserName = email;
      try {
        await updateCurrentUser();
        const fetchRes = await fetch('/api/method/frappe.auth.get_logged_user');
        const data = await fetchRes.json();
        if (data?.message) {
          loggedInUserName = data.message;
        }
      } catch (sdkErr) {
        console.warn('Could not resolve user name via SDK in loginWithoutPassword:', sdkErr);
        try {
          const fetchRes = await fetch('/api/method/frappe.auth.get_logged_user');
          const data = await fetchRes.json();
          if (data?.message) {
            loggedInUserName = data.message;
          }
        } catch (innerErr) {
          console.warn('get_logged_user fetch fallback failed:', innerErr);
        }
      }

      let userData: User = {
        id: loggedInUserName,
        email: loggedInUserName,
        firstName: fullName || loggedInUserName.split('@')[0] || 'User',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: 'employee',
        user_code: loggedInUserName.split('@')[0] || loggedInUserName
      };

      // Fetch full User document from Frappe FIRST before marking login as complete
      try {
        const db = (frappeCtx as any)?.db;
        if (db?.getDoc && loggedInUserName) {
          console.log('Fetching User document for loginWithoutPassword:', loggedInUserName);
          const doc = await db.getDoc('User', loggedInUserName);
          const fullDoc = doc?.data ?? doc;
          if (fullDoc) {
            setFrappeUser(fullDoc);
            sessionStorage.setItem('frappe_user', JSON.stringify(fullDoc));

            userData = {
              ...userData,
              id: loggedInUserName,
              email: fullDoc.email || loggedInUserName,
              user_code: fullDoc.username || fullDoc.name || userData.user_code,
              category: fullDoc.category || userData.category,
              firstName: fullDoc.first_name || userData.firstName
            };
          }
        }
      } catch (err) {
        console.warn('Could not fetch User doc in loginWithoutPassword:', err);
      }

      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login without password error:', error);
      throw error;
    }
  };

  const logout = () => {
    frappeLogout();
    setUser(null);
    setFrappeUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('frappe_user');
    sessionStorage.clear();
  };

  const switchRole = (role: string) => {
    if (user) {
      const updatedUser = { ...user, role: role as User['role'] };
      setUser(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser)); // Persist role switch
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      frappeUser,
      isAuthenticated,
      isLoading,
      isInitialLoading,
      login,
      loginWithoutPassword,
      logout,
      switchRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};
