export interface User {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: 'admin' | 'manager' | 'employee' | string;
  user_code?: string;
  category?: string;
}