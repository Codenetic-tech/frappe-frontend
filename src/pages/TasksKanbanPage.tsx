import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  Layout
} from 'lucide-react';
import { KanbanColumn } from '@/components/TaskPage/KanbanColumn';
import { TaskModal } from '@/components/TaskPage/TaskModal';
import { type Task } from '@/utils/tasksCache';
import { useAuth } from '@/contexts/AuthContext';
import { useTask } from '@/contexts/TaskContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from '@/lib/utils';

// Define the column structure
interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

const TasksKanbanPage: React.FC = () => {
  const { user } = useAuth();
  const {
    tasks,
    loading,
    refreshing,
    error: contextError,
    refreshTasks,
    createTask: contextCreateTask,
    updateTaskStatus: contextUpdateTaskStatus
  } = useTask();

  const [columns, setColumns] = useState<Column[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCompletedOverdue, setShowCompletedOverdue] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Combine errors
  const error = contextError || localError;

  // Get actual user credentials from auth context
  const employeeId = user?.user_code || '';
  const email = user?.mail_id || '';

  // Initialize columns
  const initializeColumns = (taskList: Task[]) => {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdueTasks = taskList.filter(task => {
      const dueDate = new Date(task.due_date.replace(' ', 'T'));
      const isOverdue = dueDate < startOfToday;
      if (showCompletedOverdue) return isOverdue;
      return isOverdue && task.status !== 'Done';
    });

    const todayTasks = taskList.filter(task => {
      const dueDate = new Date(task.due_date.replace(' ', 'T'));
      return dueDate.toDateString() === today.toDateString();
    });

    const tomorrowTasks = taskList.filter(task => {
      const dueDate = new Date(task.due_date.replace(' ', 'T'));
      return dueDate.toDateString() === tomorrow.toDateString();
    });

    const upcomingTasks = taskList.filter(task => {
      const dueDate = new Date(task.due_date.replace(' ', 'T'));
      return dueDate > tomorrow && dueDate <= endOfWeek;
    });

    return [
      {
        id: 'overdue',
        title: 'Overdue',
        tasks: overdueTasks,
        color: 'bg-red-50/50 border-red-100'
      },
      {
        id: 'today',
        title: 'Today',
        tasks: todayTasks,
        color: 'bg-orange-50/50 border-orange-100'
      },
      {
        id: 'tomorrow',
        title: 'Tomorrow',
        tasks: tomorrowTasks,
        color: 'bg-blue-50/50 border-blue-100'
      },
      {
        id: 'this-week',
        title: 'This Week',
        tasks: upcomingTasks,
        color: 'bg-slate-50/50 border-slate-100'
      }
    ];
  };

  // Update columns when tasks change
  useEffect(() => {
    setColumns(initializeColumns(tasks));
  }, [tasks, showCompletedOverdue]);

  // Filter tasks based on search and priority
  const getFilteredColumns = () => {
    if (!searchTerm && filterPriority === 'all') return columns;

    return columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => {
        const matchesSearch = searchTerm === '' ||
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

        return matchesSearch && matchesPriority;
      })
    }));
  };

  // Create new task
  const createTask = async (taskData: any) => {
    setCreatingTask(true);
    setLocalError(null);
    try {
      await contextCreateTask(taskData);
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
      setLocalError('Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: 'Todo' | 'In Progress' | 'Done') => {
    try {
      await contextUpdateTaskStatus(taskId, status);
    } catch (error) {
      console.error('Error updating task:', error);
      setLocalError('Failed to update task status');
    }
  };

  const filteredColumns = getFilteredColumns();

  // Show error state only for actual errors
  if (error && tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Tasks</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={refreshTasks}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 flex flex-col h-full bg-slate-50/30">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                <CheckSquare size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
                <p className="text-sm text-slate-500 font-medium">Manage and track your lead activities</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative group min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="text"
                  placeholder="Search tasks or leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 rounded-xl focus:ring-blue-500 transition-all w-full"
                />
              </div>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px] h-10 bg-white border-slate-200 rounded-xl">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">🔴 High</SelectItem>
                  <SelectItem value="Medium">🟡 Medium</SelectItem>
                  <SelectItem value="Low">🔵 Low</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 h-10">
                <Checkbox
                  id="showCompletedOverdue"
                  checked={showCompletedOverdue}
                  onCheckedChange={(checked) => setShowCompletedOverdue(checked as boolean)}
                  className="rounded-md"
                />
                <label
                  htmlFor="showCompletedOverdue"
                  className="text-xs font-bold text-slate-600 cursor-pointer select-none"
                >
                  Show Done
                </label>
              </div>

              <Button
                variant="outline"
                onClick={refreshTasks}
                disabled={loading || refreshing || !employeeId}
                className="h-10 w-10 p-0 bg-white border-slate-200 rounded-xl hover:bg-slate-50"
              >
                <RefreshCw className={cn("h-4 w-4 text-slate-500", (loading || refreshing) && 'animate-spin')} />
              </Button>

              <Button
                onClick={() => setIsTaskModalOpen(true)}
                disabled={!employeeId}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                <Plus size={18} />
                New Task
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {columns.map(column => (
              <Card key={column.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{column.title}</span>
                    <span className="text-xl font-bold text-slate-900">{loading ? '...' : column.tasks.length}</span>
                  </div>
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center",
                    column.id === 'overdue' ? "bg-red-50 text-red-600" :
                    column.id === 'today' ? "bg-orange-50 text-orange-600" :
                    column.id === 'tomorrow' ? "bg-blue-50 text-blue-600" :
                    "bg-slate-50 text-slate-600"
                  )}>
                    <Layout size={20} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-b-blue-600 shadow-sm"></div>
              <p className="text-slate-500 font-medium">Loading tasks...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full pb-4">
              {filteredColumns.map(column => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={column.tasks}
                  color={column.color}
                  onTaskUpdate={updateTaskStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* Empty State */}
        {!loading && tasks.length > 0 && filteredColumns.every(column => column.tasks.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No tasks found</h3>
            <p className="text-slate-500 text-sm mb-6">Change your filters or add a new task.</p>
            <Button variant="outline" onClick={() => {setSearchTerm(''); setFilterPriority('all');}} className="rounded-xl">
              Clear all filters
            </Button>
          </div>
        )}
      
      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={createTask}
        loading={creatingTask}
        userEmail={email}
      />
    </div>
  );
};

export default TasksKanbanPage;
