import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCachedAllTasks, saveAllTasksToCache, type Task } from '@/utils/tasksCache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface TaskContextType {
    tasks: Task[];
    todaysTasks: Task[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    alertInfo: { task: Task; type: 'warning' | 'due' } | null;
    fetchTasks: () => Promise<void>;
    refreshTasks: () => Promise<void>;
    createTask: (taskData: any) => Promise<void>;
    updateTaskStatus: (taskId: string, status: 'Todo' | 'In Progress' | 'Done') => Promise<void>;
    closeAlert: () => void;
}

const TODAY_TASKS_CACHE_KEY = 'crm_today_tasks_cache';

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTask must be used within a TaskProvider');
    }
    return context;
};

interface TaskProviderProps {
    children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alertInfo, setAlertInfo] = useState<{ task: Task; type: 'warning' | 'due' } | null>(null);

    const timeoutsRef = React.useRef<any[]>([]);
    const soundRef = React.useRef<HTMLAudioElement | null>(null);

    const employeeId = user?.user_code || '';
    const email = user?.mail_id || '';

    const closeAlert = () => {
        setAlertInfo(null);
        if (soundRef.current) {
            soundRef.current.pause();
            soundRef.current.currentTime = 0;
        }
    };

    const triggerAlert = useCallback((task: Task, type: 'warning' | 'due') => {
        // Always update sound source/object to ensure latest changes apply
        if (soundRef.current) {
            soundRef.current.pause();
            soundRef.current.currentTime = 0;
        }
        soundRef.current = new Audio('/notification.wav');

        // Play Sound in Loop
        soundRef.current.loop = true;
        soundRef.current.play().catch(e => console.log('Audio play failed', e));

        // Show System Notification
        if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification(type === 'warning' ? 'Upcoming Task Reminder' : 'Task Due Now!', {
                body: task.title,
                icon: '/icons/icon-192x192.png',
                requireInteraction: true
            });
        }

        // Show Modal
        setAlertInfo({ task, type });
    }, []);

    const setupAlerts = useCallback((taskList: Task[]) => {
        // Clear existing timeouts
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        const now = new Date().getTime();
        const todayStr = new Date().toDateString();

        const todayTasksList = taskList.filter(task => {
            if (!task.due_date) return false;
            const dueDate = new Date(task.due_date.replace(' ', 'T'));
            return dueDate.toDateString() === todayStr;
        });

        setTodaysTasks(todayTasksList);
        // Save today's tasks to local storage
        localStorage.setItem(TODAY_TASKS_CACHE_KEY, JSON.stringify({
            tasks: todayTasksList,
            timestamp: Date.now(),
            email: email
        }));

        todayTasksList.forEach(task => {
            if (task.status === 'Done') return;

            const dueDate = new Date(task.due_date.replace(' ', 'T')).getTime();

            // 10 minute warning
            const warningTime = dueDate - (10 * 60 * 1000);
            const warningDelay = warningTime - now;
            if (warningDelay > 0) {
                const timeoutId = setTimeout(() => {
                    triggerAlert(task, 'warning');
                }, warningDelay);
                timeoutsRef.current.push(timeoutId);
            }

            // Due time alert
            const dueDelay = dueDate - now;
            if (dueDelay > 0) {
                const timeoutId = setTimeout(() => {
                    triggerAlert(task, 'due');
                }, dueDelay);
                timeoutsRef.current.push(timeoutId);
            }
        });
    }, [email, triggerAlert]);

    const fetchTasks = useCallback(async () => {
        if (!employeeId || !email) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Check cache first
            const cachedTasks = getCachedAllTasks(employeeId, email);
            if (cachedTasks) {
                setTasks(cachedTasks);
                setupAlerts(cachedTasks);
                setLoading(false);
                return;
            }

            const response = await fetch('https://n8n.gopocket.in/webhook/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'getalltasks',
                    employeeId: employeeId,
                    email: email
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.status}`);
            }

            const responseText = await response.text();

            if (!responseText || responseText.trim() === '') {
                setTasks([]);
                setLoading(false);
                return;
            }

            let tasksData: Task[];
            try {
                tasksData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing response as JSON:', parseError);
                if (responseText.trim() === '[]') {
                    tasksData = [];
                } else {
                    throw new Error('Invalid response format from server');
                }
            }

            if (!tasksData || !Array.isArray(tasksData)) {
                setTasks([]);
                setLoading(false);
                return;
            }

            // Sort tasks by due date
            tasksData.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

            setTasks(tasksData);
            setupAlerts(tasksData);
            saveAllTasksToCache(tasksData, employeeId, email);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setError('Failed to load tasks. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [employeeId, email, setupAlerts]);

    const refreshTasks = async () => {
        if (!employeeId || !email) return;

        setRefreshing(true);
        setError(null);
        localStorage.removeItem('crm_all_tasks_cache');
        await fetchTasks();
        setRefreshing(false);
    };

    const createTask = async (taskData: any) => {
        if (!email) {
            setError('User authentication required');
            throw new Error('User authentication required');
        }

        try {
            const dueDate = new Date(taskData.due_date);
            const formattedDueDate = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')} ${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}:00`;

            const response = await fetch('https://n8n.gopocket.in/webhook/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doc: {
                        doctype: "CRM Task",
                        reference_doctype: "CRM Lead",
                        reference_docname: taskData.leadId || '',
                        title: taskData.title,
                        description: `<p>${taskData.description}</p>`,
                        assigned_to: email,
                        due_date: formattedDueDate,
                        priority: taskData.priority,
                        status: "Todo"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create task: ${response.status}`);
            }

            await refreshTasks();
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    };

    const updateTaskStatus = async (taskId: string, status: 'Todo' | 'In Progress' | 'Done') => {
        if (!employeeId) return;

        try {
            const task = tasks.find(t => t.name === taskId);
            if (!task) return;

            const response = await fetch('https://n8n.gopocket.in/webhook/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctype: "CRM Task",
                    name: taskId,
                    fieldname: "status",
                    value: status,
                    leadid: task.reference_docname
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update task: ${response.status}`);
            }

            await refreshTasks();
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    };

    // Initial fetch
    useEffect(() => {
        if (employeeId && email) {
            if ('Notification' in window && window.Notification.permission === 'default') {
                window.Notification.requestPermission();
            }
            fetchTasks();
        }
    }, [fetchTasks, employeeId, email]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(clearTimeout);
        };
    }, []);

    return (
        <TaskContext.Provider value={{
            tasks,
            todaysTasks,
            loading,
            refreshing,
            error,
            alertInfo,
            fetchTasks,
            refreshTasks,
            createTask,
            updateTaskStatus,
            closeAlert
        }}>
            {children}
        </TaskContext.Provider>
    );
};
