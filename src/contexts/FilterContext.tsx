import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface FilterContextType {
  selectedHierarchy: string[];
  setSelectedHierarchy: (hierarchy: string[]) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [selectedHierarchy, setSelectedHierarchy] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatLocal(sevenDaysAgo),
      end: formatLocal(today)
    };
  });

  const clearFilters = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setSelectedHierarchy([]);
    setDateRange({
      start: formatLocal(sevenDaysAgo),
      end: formatLocal(today)
    });
  };

  // Reset filters on logout
  useEffect(() => {
    if (!isAuthenticated) {
      clearFilters();
    }
  }, [isAuthenticated]);

  return (
    <FilterContext.Provider value={{
      selectedHierarchy,
      setSelectedHierarchy,
      dateRange,
      setDateRange,
      clearFilters
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
