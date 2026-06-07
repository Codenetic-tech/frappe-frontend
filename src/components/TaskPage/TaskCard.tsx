import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Clock, 
    User, 
    Flag, 
    MoreVertical, 
    CheckCircle2, 
    Circle, 
    PlayCircle,
    ArrowUpCircle,
    ArrowRightCircle,
    ArrowDownCircle
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { type Task } from '@/utils/tasksCache';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

interface TaskCardProps {
    task: Task;
    onTaskUpdate: (taskId: string, status: 'Todo' | 'In Progress' | 'Done') => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskUpdate }) => {
    const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'Done';
    
    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'High': return <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />;
            case 'Medium': return <ArrowRightCircle className="w-3.5 h-3.5 text-amber-500" />;
            case 'Low': return <ArrowDownCircle className="w-3.5 h-3.5 text-blue-500" />;
            default: return <Flag className="w-3.5 h-3.5 text-slate-400" />;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'In Progress': return <PlayCircle className="w-4 h-4 text-blue-500" />;
            default: return <Circle className="w-4 h-4 text-slate-300" />;
        }
    };

    const formatDueDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            return format(date, 'MMM d, h:mm a');
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <Card className={cn(
            "group hover:shadow-md transition-all duration-200 border-l-4",
            task.priority === 'High' ? "border-l-red-500" : 
            task.priority === 'Medium' ? "border-l-amber-500" : 
            "border-l-blue-500",
            task.status === 'Done' && "opacity-75"
        )}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <h4 className={cn(
                            "font-semibold text-slate-900 leading-tight transition-all",
                            task.status === 'Done' && "line-through text-slate-400"
                        )}>
                            {task.title}
                        </h4>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onTaskUpdate(task.name, 'Todo')}>
                                Set as Todo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onTaskUpdate(task.name, 'In Progress')}>
                                Set as In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onTaskUpdate(task.name, 'Done')}>
                                Set as Done
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-3">
                    {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed" 
                           dangerouslySetInnerHTML={{ __html: task.description }}>
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="outline" className={cn(
                            "text-[10px] font-bold uppercase tracking-wider gap-1 py-0.5",
                            isOverdue && task.status !== 'Done' ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                            <Clock className="w-3 h-3" />
                            {formatDueDate(task.due_date)}
                        </Badge>
                        
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider gap-1 py-0.5 bg-slate-50 text-slate-600 border-slate-100">
                            {getPriorityIcon(task.priority)}
                            {task.priority}
                        </Badge>
                    </div>

                    {(task.first_name || task.reference_docname) && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                                <User className="w-3 h-3 text-blue-500" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600 truncate">
                                {task.first_name || task.reference_docname}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
