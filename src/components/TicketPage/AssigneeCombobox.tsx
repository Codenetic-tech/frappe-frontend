import React, { useState, useCallback, useEffect } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Loader2, User as UserIcon, Search, Check } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';

export interface AssignedToOption {
    user: string;
    code: string;
    for_value: string;
}

interface AssigneeComboboxProps {
    value: AssignedToOption | null;
    onChange: (option: AssignedToOption) => void;
    placeholder?: string;
    triggerClassName?: string;
    contentClassName?: string;
    align?: 'start' | 'end' | 'center';
    disabled?: boolean;
}

export const AssigneeCombobox: React.FC<AssigneeComboboxProps> = ({
    value,
    onChange,
    placeholder = 'Select recipient...',
    triggerClassName,
    contentClassName,
    align = 'start',
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [assignees, setAssignees] = useState<AssignedToOption[]>([]);
    const [error, setError] = useState('');
    const { call: getAssignedTo, loading } = useFrappePostCall<{ message: AssignedToOption[] }>(
        'gopocket.api.get_assigned_to'
    );

    const fetchAssignees = useCallback((query: string) => {
        setError('');
        getAssignedTo({ search: query || undefined })
            .then((res) => {
                setAssignees(res?.message ?? []);
            })
            .catch((err: any) => {
                setError(err?.message || 'Failed to load assignees.');
                setAssignees([]);
            });
    }, [getAssignedTo]);

    // Debounced, server-side search — re-queries on every keystroke (capped at
    // 50 records server-side), not just on first open. Clicking the search icon
    // (see below) bypasses the debounce and searches immediately.
    useEffect(() => {
        if (!open) return;
        const handle = setTimeout(() => fetchAssignees(search), 300);
        return () => clearTimeout(handle);
    }, [open, search, fetchAssignees]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between border-slate-200 rounded-xl h-10 shadow-sm focus:border-purple-300 font-normal px-3 bg-white hover:bg-slate-50 text-sm disabled:opacity-50",
                        triggerClassName
                    )}
                >
                    <span className={cn("truncate", value ? "text-slate-900 font-medium" : "text-slate-400 text-xs")}>
                        {value ? `${value.user} (${value.code})` : placeholder}
                    </span>
                    <UserIcon className="w-3.5 h-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className={cn("w-[310px] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden", contentClassName)}
                align={align}
                onWheel={(e) => e.stopPropagation()}
            >
                <Command className="border-none overflow-visible" shouldFilter={false}>
                    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                        <button
                            type="button"
                            onClick={() => fetchAssignees(search)}
                            title="Search now"
                            className="mr-2 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                        <CommandPrimitive.Input
                            placeholder="Search user or code..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            value={search}
                            onValueChange={setSearch}
                        />
                    </div>
                    <CommandList className="max-h-[220px] overflow-y-auto pointer-events-auto p-1">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400 font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Loading...
                            </div>
                        ) : error ? (
                            <div className="px-3 py-4 text-xs text-red-500 font-medium text-center">
                                {error}
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>No recipient found.</CommandEmpty>
                                <CommandGroup>
                                    {assignees.map((assignee) => (
                                        <CommandItem
                                            key={`${assignee.code}-${assignee.user}`}
                                            value={`${assignee.user} ${assignee.code}`}
                                            onSelect={() => {
                                                onChange(assignee);
                                                setOpen(false);
                                            }}
                                            className="cursor-pointer py-2.5 rounded-lg mx-1"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{assignee.user}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{assignee.code}</span>
                                                </div>
                                                {value?.user === assignee.user && value?.code === assignee.code && (
                                                    <Check className="h-4 w-4 text-purple-600" />
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default AssigneeCombobox;
