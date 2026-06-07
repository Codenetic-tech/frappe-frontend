import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { User, Company, Employee } from '../utils';

export interface HierarchyNode {
    name: string;
    parent_gopocket_tree: string | null;
    category?: string;
    is_group?: number;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  token: string | null;
  path: string | null;
  login: (employeeId: string, password: string, otp?: string, tmp_id?: string) => Promise<any>;
  logout: () => void;
  switchRole: (role: string) => void;
  hierarchyData: HierarchyNode[] | null;
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
  const {
    currentUser,
    isLoading: authLoading,
    login: frappeLogin,
    logout: frappeLogout,
    updateCurrentUser,
    error: authError
  } = useFrappeAuth();

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [employee, setEmployee] = useState<Employee | null>(() => {
    const savedEmployee = localStorage.getItem('employee');
    return savedEmployee ? JSON.parse(savedEmployee) : null;
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[] | null>(() => {
    try {
      const savedHierarchy = localStorage.getItem('hierarchy_data');
      return savedHierarchy ? JSON.parse(savedHierarchy) : null;
    } catch (e) {
      return null;
    }
  });

  // isAuthenticated is derived from local user state, not just SDK
  const isAuthenticated = Boolean(user);
  const isLoading = authLoading && !user; // Only show loading if we don't have a user yet
  const isInitialLoading = isLoading;
  const token = null; // Token handled by SDK cookies
  const path = null; // Path handled by router/SDK

  const fetchHierarchyData = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const apiUrl = `${API_BASE_URL}/api/method/rms.branch.heirarchy`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          setHierarchyData(data.message);
          localStorage.setItem('hierarchy_data', JSON.stringify(data.message));
        }
      }
    } catch (error) {
      console.error('Fetch hierarchy data error:', error);
    }
  };

  // Force validation on mount
  useEffect(() => {
    updateCurrentUser();
  }, []);

  // Sync with SDK state
  useEffect(() => {
    console.log('AuthContext: currentUser changed to:', currentUser);

    if (currentUser) {
      // Create a basic user object from currentUser (which is likely the email/id)
      // Ideally we should fetch the full user details here. 
      // For now, we construct a basic valid User object to allow the app to function.
      const userData: User = {
        id: currentUser,
        email: currentUser,
        firstName: currentUser.split('@')[0] || 'User',
        lastName: '',
        role: 'admin', // Defaulting to admin for testing, or we need to fetch this
        companyId: 'gopocket',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        employeeId: currentUser,
        token: '',
        path: '',
        team: '[]',
        hierarchy: '[]',
        branch: '',
        // Mappings for backward compatibility
        user_code: currentUser,
        mail_id: currentUser,
        category: 'admin',
        department: 'General'
      };

      // Mock Employee data
      const employeeData: Employee = {
        id: currentUser,
        employeeId: currentUser,
        userId: currentUser,
        companyId: 'gopocket',
        firstName: currentUser.split('@')[0] || 'User',
        lastName: '',
        email: currentUser,
        phone: '',
        designation: 'Employee',
        department: 'General',
        joiningDate: new Date().toISOString(),
        salary: 0,
        status: 'confirmed',
        address: '',
        token: '',
        path: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUser(userData);
      setEmployee(employeeData);

      // Update local storage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('employee', JSON.stringify(employeeData));

      // Fetch hierarchy data
      fetchHierarchyData();

    } else if (currentUser === null && !user) {
      // If SDK says null and we have no local user, ensure we are clean
      // Note: We don't clear if we have a user but SDK is null (refresh race),
      // UNLESS there is an error.
      setUser(null);
      setEmployee(null);
      setHierarchyData(null);
      localStorage.removeItem('user');
      localStorage.removeItem('employee');
      localStorage.removeItem('hierarchy_data');
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
        console.log('Login success, manually updating user state...');

        // Manually set user state immediately to bypass SDK delay
        const manualUser = employeeId;
        const userData: User = {
          id: manualUser,
          email: manualUser,
          firstName: res.full_name || manualUser.split('@')[0] || 'User',
          lastName: '',
          role: 'admin',
          companyId: 'gopocket',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          employeeId: manualUser,
          token: '',
          path: '',
          team: '[]',
          hierarchy: '[]',
          branch: '',
          // Mappings for backward compatibility
          user_code: manualUser,
          mail_id: manualUser,
          category: 'admin',
          department: 'General'
        };

        const employeeData: Employee = {
          id: manualUser,
          employeeId: manualUser,
          userId: manualUser,
          companyId: 'gopocket',
          firstName: res.full_name || manualUser.split('@')[0] || 'User',
          lastName: '',
          email: manualUser,
          phone: '',
          designation: 'Employee',
          department: 'General',
          joiningDate: new Date().toISOString(),
          salary: 0,
          status: 'confirmed',
          address: '',
          token: '',
          path: '',
          emergencyContact: { name: '', phone: '', relationship: '' },
          documents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setUser(userData);
        setEmployee(employeeData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('employee', JSON.stringify(employeeData));

        // Fetch hierarchy data
        await fetchHierarchyData();

        // Also try to update SDK state for consistency
        await updateCurrentUser();
        console.log('updateCurrentUser called (background).');
        return { success: true };
      } else {
        console.warn('Login message mismatch but no error thrown. Message:', res?.message);
        // Attempt to update user anyway since auth might have succeeded
        await updateCurrentUser();
        console.log('updateCurrentUser completed (fallback).');
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    frappeLogout();
    setUser(null);
    setEmployee(null);
    setCompany(null);
    setHierarchyData(null);
    localStorage.removeItem('user');
    localStorage.removeItem('employee');
    localStorage.removeItem('hierarchy_data');
  };

  const switchRole = (role: string) => {
    if (user) {
      const updatedUser = { ...user, role: role as User['role'] };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser)); // Persist role switch
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      employee,
      company,
      isAuthenticated,
      isLoading,
      isInitialLoading,
      token,
      path,
      login,
      logout,
      switchRole,
      hierarchyData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
