export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee' | string;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeId: string;
  token: string;
  path: string;
  team: string;
  hierarchy: string;
  branch: string;
  
  // Mappings for backward compatibility with old code
  user_code?: string;
  client_code?: string | null;
  mail_id?: string | null;
  category?: string | null;
  mobile?: string | null;
  pan_no?: string | null;
  type?: string | null;
  active_date?: string | null;
  department?: string | null;
}

export interface Employee {
  id: string;
  employeeId: string;
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  joiningDate: string;
  salary: number;
  status: string;
  address: string;
  token: string;
  path: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  documents: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
}
