import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from "@/hooks/use-toast";

export interface TradingClass {
    id: string;
    title: string;
    description: string;
    instructor: string;
    date: string;
    time: string;
    image: string;
    type: 'Online' | 'Live';
    cost: 'Free' | 'Paid';
    language: string;
}

interface AnnouncementContextType {
    classes: TradingClass[];
    isLoadingClasses: boolean;
    refreshClasses: () => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export const useAnnouncement = () => {
    const context = useContext(AnnouncementContext);
    if (context === undefined) {
        throw new Error('useAnnouncement must be used within an AnnouncementProvider');
    }
    return context;
};

interface AnnouncementProviderProps {
    children: ReactNode;
}

export const AnnouncementProvider: React.FC<AnnouncementProviderProps> = ({ children }) => {
    const [classes, setClasses] = useState<TradingClass[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);

    const fetchClasses = async () => {
        setIsLoadingClasses(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/crm.api.lead.get_all_seminars`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch classes');
            }

            const data = await response.json();

            // Check if response has the expected structure
            if (data.message && data.message.status === 'success' && Array.isArray(data.message.data)) {
                // Map API response to TradingClass interface
                const mappedClasses: TradingClass[] = data.message.data.map((item: any) => {
                    // Parse date_and_time "2025-12-28 11:30:00"
                    const [datePart, timePart] = item.date_and_time.split(' ');

                    return {
                        id: item.name,
                        title: item.tittle, // Handling 'tittle' typo from API
                        description: item.description,
                        instructor: 'GoPocket Team', // Default as not in API explicitly or use owner
                        date: datePart,
                        time: timePart, // 24h format "11:30:00"
                        // Prepend domain if partial path
                        image: item.image.startsWith('http') ? item.image : `https://live.gopocket.in${item.image}`,
                        type: item.type,
                        cost: item.cost,
                        language: item.language
                    };
                });

                // Sort by date and time ascending
                mappedClasses.sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.time}`);
                    const dateB = new Date(`${b.date}T${b.time}`);
                    return dateA.getTime() - dateB.getTime();
                });

                setClasses(mappedClasses);
            } else {
                console.error("Unexpected API response structure:", data);
                setClasses([]);
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
            // Optional: Toast here might be annoying on every page load if it fails silently in background, 
            // but for now keeping it consistent with previous behavior.
            toast({
                title: "Error",
                description: "Failed to load classes.",
                variant: "destructive"
            });
        } finally {
            setIsLoadingClasses(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    return (
        <AnnouncementContext.Provider value={{ classes, isLoadingClasses, refreshClasses: fetchClasses }}>
            {children}
        </AnnouncementContext.Provider>
    );
};
