export interface Task {
    name: string;
    title: string;
    description: string;
    status: 'Todo' | 'In Progress' | 'Done';
    priority: 'Low' | 'Medium' | 'High';
    due_date: string;
    assigned_to: string;
    reference_doctype?: string;
    reference_docname?: string;
    first_name?: string;
}

const CACHE_KEY = 'crm_all_tasks_cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

interface CachedData {
    tasks: Task[];
    timestamp: number;
    employeeId: string;
    email: string;
}

export const getCachedAllTasks = (employeeId: string, email: string): Task[] | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const parsed: CachedData = JSON.parse(cached);
        const now = Date.now();

        // Check expiry and ownership
        if (now - parsed.timestamp > CACHE_EXPIRY || parsed.employeeId !== employeeId || parsed.email !== email) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return parsed.tasks;
    } catch (e) {
        console.error('Error reading tasks cache:', e);
        return null;
    }
};

export const saveAllTasksToCache = (tasks: Task[], employeeId: string, email: string) => {
    try {
        const data: CachedData = {
            tasks,
            timestamp: Date.now(),
            employeeId,
            email
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving tasks cache:', e);
    }
};
