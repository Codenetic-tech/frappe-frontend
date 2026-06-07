import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { type Task } from '@/utils/tasksCache';

interface TaskAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    type: 'warning' | 'due';
}

export const TaskAlertModal: React.FC<TaskAlertModalProps> = ({ isOpen, onClose, task, type }) => {
    const navigate = useNavigate();

    if (!task) return null;

    const handleViewTask = () => {
        onClose();
        if (task.reference_docname) {
            navigate(`/leads/${task.reference_docname}`);
        } else {
            navigate('/tasks');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-none shadow-2xl bg-gradient-to-br from-white to-blue-50">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                        <Bell className="h-6 w-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold text-gray-900">
                        {type === 'warning' ? 'Upcoming Task' : 'Task Due Now!'}
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-600 mt-2">
                        {type === 'warning'
                            ? "This task is due in 10 minutes."
                            : "The time for this task has arrived."}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm mt-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{task.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={14} className="text-blue-500" />
                        <span>Due: {new Date(task.due_date.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center mt-6 flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-gray-200 hover:bg-gray-50 rounded-xl"
                    >
                        Dismiss
                    </Button>
                    <Button
                        type="button"
                        onClick={handleViewTask}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all active:scale-95 rounded-xl"
                    >
                        View Task
                        <ArrowRight size={16} className="ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
