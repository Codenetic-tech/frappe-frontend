import React, { useMemo, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { exportToExcel } from '@/utils/excelExport';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { FrappeContext, useFrappeEventListener, useFrappeUpdateDoc, useFrappeGetCall } from 'frappe-react-sdk';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import {
    FileText,
    Zap,
    Clock,
    CircleCheck,
    XCircle,
    MoreHorizontal,
    Search,
    RefreshCcw,
    FileDown,
    Columns3,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Check,
    Copy,
    ChevronsUpDown,
    Calendar as CalendarIcon,
    X,
    Users,
    UserCheck,
    ExternalLink,
    Filter,
    Plus,
    AlertCircle,
    Phone,
    MapPin,
    User,
    MessageSquare,
    Bookmark,
    Volume2,
    Mic,
    MicOff,
    Pause,
    Play,
    Grid,
    CircleDot,
    UserPlus,
    PhoneForwarded,
    Headphones,
    Signal,
    Tag,
    Loader2
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface LeadItem {
    name: string;
    first_name?: string;
    mobile_no?: string;
    custom_allocated_code?: string;
    custom_allocated_person_name?: string;
    source?: string;
    status: string;
    custom_city?: string;
    custom_campaign_name?: string;
    custom_last_campaign?: string;
    custom_client_code?: string;
    custom_branch?: string;
    custom_parent?: string;
    custom_repeated_lead?: number | boolean;
    creation: string;
    modified: string;
    lead_name?: string;
    industry?: string;
    validity_date?: string;
    language?: string;
    whats_your_profession?: string;
    gender?: string;
    city?: string;
    state?: string;
    ucc?: string;
    pannumber?: string;
    form_id?: string;
    campaign?: string;
    branch_code?: string;
    referredby?: string;
    what_is_your_experience_level_in_trading?: string;
    what_is_your_preferred_medium_to_get_services_details?: string;
    how_many_demat_account_can_you_open_in_a_month?: string;
    how_much_revenue_are_you_targeting_in_a_month?: number;
    no_of_employees?: number;
    tradedone?: string;
    other_brokers?: string;
    issue?: string;
    nse_cm?: number;
    nse_cd?: number;
    bse_fo?: number;
    mcx_co?: number;
    nse_fo?: number;
    bse_fo_segment?: number;
    bse_cm?: number;
    [key: string]: any;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const ITEMS_PER_PAGE = 50;

const CATEGORY_ORDER: Record<string, number> = {
    'ZONE': 1,
    'REGION': 2,
    'BRANCH': 3,
    'RM': 4,
    'AP': 5,
    'U-AP': 6,
    'CLIENT': 7
};

const getCategoryStyles = (category?: string) => {
    switch (category?.toUpperCase()) {
        case 'ZONE': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
        case 'REGION': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
        case 'BRANCH': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700';
        case 'RM': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
        case 'AP': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
        case 'U-AP': return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30';
        case 'CLIENT': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
        default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
};

const CRM_LEAD_FILTER_FIELDS = [
    { value: 'name', label: 'Lead ID', type: 'string' },
    { value: 'first_name', label: 'First Name', type: 'string' },
    { value: 'mobile_no', label: 'Mobile Number', type: 'string' },
    { value: 'custom_allocated_code', label: 'Allocated Code', type: 'string' },
    { value: 'custom_allocated_person_name', label: 'Allocated Person', type: 'string' },
    { value: 'source', label: 'Source', type: 'string' },
    { value: 'status', label: 'Status', type: 'select', options: ['New', 'Followup', 'Not Interested', 'Call Back', 'Switch off', 'RNR', 'won', 'Client'] },
    { value: 'custom_city', label: 'City', type: 'string' },
    { value: 'custom_campaign_name', label: 'Campaign Name', type: 'string' },
    { value: 'custom_last_campaign', label: 'Last Campaign', type: 'string' },
    { value: 'custom_client_code', label: 'Client Code', type: 'string' },
    { value: 'custom_branch', label: 'Branch', type: 'string' },
    { value: 'custom_parent', label: 'Parent', type: 'string' },
    { value: 'custom_repeated_lead', label: 'Repeated Lead', type: 'select', options: ['1', '0'] },
    { value: 'creation', label: 'Creation Date', type: 'date' },
    { value: 'modified', label: 'Modified Date', type: 'date' },
] as const;

const STRING_OPERATORS = ['like', '=', '!=', 'not like'] as const;
const DATE_OPERATORS = ['>', '<', '>=', '<=', 'Between', 'Timespan'] as const;
const NUMBER_OPERATORS = ['=', '!=', '>', '<', '>=', '<='] as const;
const SELECT_OPERATORS = ['=', '!='] as const;

const OPERATOR_LABELS: Record<string, string> = {
    '>': 'After',
    '<': 'Before',
    '>=': 'On or After',
    '<=': 'On or Before',
    'like': 'Contains',
    'not like': 'Does not contain',
    '=': 'Equals',
    '!=': 'Does not equal',
};

const getOperatorsForType = (type: string) => {
    switch (type) {
        case 'date': return [...DATE_OPERATORS];
        case 'number': return [...NUMBER_OPERATORS];
        case 'select': return [...SELECT_OPERATORS];
        default: return [...STRING_OPERATORS];
    }
};

const getFieldType = (fieldValue: string): string =>
    CRM_LEAD_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const getFieldOptions = (fieldValue: string): readonly string[] => {
    const field = CRM_LEAD_FILTER_FIELDS.find(f => f.value === fieldValue);
    return field && 'options' in field ? (field as any).options : [];
};

interface AdvancedFilter {
    id: string;
    field: string;
    operator: string;
    value: string | [string, string];
}

const TableWrapper = ({ scrollWholePage, children }: { scrollWholePage: boolean; children: React.ReactNode }) => {
    if (scrollWholePage) {
        return (
            <ScrollArea className="w-full">
                {children}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        );
    }
    return (
        <ScrollArea className="flex-1 w-full">
            {children}
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
};

const postFetcher = async (key: string | [string, string] | { url: string; body: Record<string, any> }) => {
    let url = '';
    let bodyStr = '';

    if (Array.isArray(key)) {
        url = key[0];
        bodyStr = key[1];
    } else if (typeof key === 'object' && key !== null) {
        url = key.url;
        bodyStr = JSON.stringify(key.body);
    } else {
        url = key as string;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: bodyStr || undefined
    });
    if (!response.ok) {
        let errData;
        try {
            errData = await response.json();
        } catch (e) {
            errData = { message: response.statusText || 'Fetch failed' };
        }
        const error: any = new Error(errData.message || 'Fetch failed');
        error.status = response.status;
        error.info = errData;
        throw error;
    }
    const data = await response.json();
    return data.message;
};

const formatDateTimeWithAmPm = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
        const cleanStr = dateStr.replace('T', ' ').trim();
        const parts = cleanStr.split(' ');
        if (parts.length < 2) return dateStr;

        const datePart = parts[0];
        const timePart = parts[1];

        const timeSubparts = timePart.split(':');
        let hours = parseInt(timeSubparts[0], 10);
        const minutes = timeSubparts[1] || '00';

        if (isNaN(hours)) return dateStr;

        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;

        const formattedHours = hours.toString().padStart(2, '0');

        return `${datePart} ${formattedHours}:${minutes} ${ampm}`;
    } catch {
        return dateStr;
    }
};

const Leads: React.FC = () => {
    const navigate = useNavigate();
    const { toast: radixToast, dismiss } = useToast();
    const toast = {
        success: (msg: string) => radixToast({ title: 'Success', description: msg, variant: 'success' }),
        error: (msg: string) => radixToast({ title: 'Error', description: msg, variant: 'destructive' }),
        info: (msg: string) => radixToast({ description: msg }),
        loading: (msg: string) => {
            const { id } = radixToast({ description: msg });
            return id;
        },
        dismiss: (id?: string) => dismiss(id)
    };
    const { user, frappeUser } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { orgTreeData } = useOrgTree();
    const frappe = useContext(FrappeContext);
    const { updateDoc } = useFrappeUpdateDoc();
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [copiedCampaignIndex, setCopiedCampaignIndex] = useState<number | null>(null);

    const handleCopyCampaign = (e: React.MouseEvent, campaignName: string, index: number) => {
        e.stopPropagation();
        if (!campaignName) return;
        navigator.clipboard.writeText(campaignName);
        setCopiedCampaignIndex(index);
        setTimeout(() => setCopiedCampaignIndex(null), 2000);
        toast.success(`Copied "${campaignName}" to clipboard`);
    };

    const isBulkUpdatingRef = useRef(false);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isDialerOpen, setIsDialerOpen] = useState(false);
    const [dialNumber, setDialNumber] = useState('');
    const [isDockerOpen, setIsDockerOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [widgetPosition, setWidgetPosition] = useState({ x: 20, y: 20 });
    const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        const handle = (e.target as HTMLElement).closest('.drag-handle');
        if (handle) {
            e.preventDefault();
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                posX: widgetPosition.x,
                posY: widgetPosition.y,
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = dragRef.current.startY - e.clientY;
        setWidgetPosition({
            x: Math.max(10, dragRef.current.posX + dx),
            y: Math.max(10, dragRef.current.posY + dy),
        });
    };

    const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const [activeCallLead, setActiveCallLead] = useState<LeadItem | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [callStatus, setCallStatus] = useState<'initiating' | 'in-progress' | 'ended'>('initiating');
    const [callOutcome, setCallOutcome] = useState<string | null>(null);

    useEffect(() => {
        let interval: any;
        if (isCallModalOpen && callStatus === 'in-progress' && !isOnHold) {
            interval = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCallModalOpen, callStatus, isOnHold]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleMakeCall = async (leadOrNumber: LeadItem | string) => {
        const isString = typeof leadOrNumber === 'string';
        const mobile_no = isString ? leadOrNumber : leadOrNumber.mobile_no;
        
        if (!mobile_no) {
            toast.error('Mobile number is missing');
            return;
        }
        
        const cleanNumber = mobile_no.replace(/\s+/g, '');
        const to_number = cleanNumber.startsWith('+') ? cleanNumber : `+91${cleanNumber}`;

        const displayName = isString 
            ? to_number 
            : ((leadOrNumber as LeadItem).first_name || (leadOrNumber as LeadItem).lead_name || to_number);

        const loadingToastId = toast.loading(`Initiating call to ${displayName}...`);
        
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/method/crm.integrations.exotel.handler.make_a_call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to_number
                })
            });
            
            const data = await response.json();
            
            if (!response.ok || data.exc || data.exception) {
                let errMsg = '';
                if (data._server_messages) {
                    try {
                        const msgs = JSON.parse(data._server_messages);
                        if (Array.isArray(msgs) && msgs[0]) {
                            const firstMsg = typeof msgs[0] === 'string' ? JSON.parse(msgs[0]) : msgs[0];
                            if (firstMsg && firstMsg.message) {
                                errMsg = firstMsg.message;
                            }
                        } else if (typeof msgs === 'object' && msgs.message) {
                            errMsg = msgs.message;
                        }
                    } catch (e) {}
                }
                
                if (!errMsg && data.exception) {
                    const match = data.exception.match(/^(?:[\w.]+):\s*(.*)$/);
                    errMsg = match ? match[1] : data.exception;
                }
                
                if (!errMsg && data.message && typeof data.message === 'string') {
                    errMsg = data.message;
                }
                
                if (!errMsg) {
                    errMsg = 'Failed to initiate call';
                }
                
                throw new Error(errMsg);
            }
            
            toast.dismiss(loadingToastId);
            
            let matchingLead: LeadItem | null = null;
            if (isString) {
                const cleanFrom = cleanNumber.replace(/^\+?91|^0/, '');
                matchingLead = leadsData.find((l: LeadItem) => {
                    if (!l.mobile_no) return false;
                    const cleanMobile = l.mobile_no.replace(/^\+?91|^0/, '');
                    return cleanMobile === cleanFrom;
                }) || null;
            } else {
                matchingLead = leadOrNumber as LeadItem;
            }

            if (!matchingLead) {
                matchingLead = {
                    name: '',
                    first_name: 'Outbound Call',
                    lead_name: 'Outbound Call',
                    mobile_no: to_number,
                    source: 'Manual Dial',
                    status: 'Open',
                    creation: new Date().toISOString(),
                    modified: new Date().toISOString()
                };
            }

            setActiveCallLead(matchingLead);
            setCallStatus('in-progress');
            setCallDuration(0);
            setIsMuted(false);
            setIsOnHold(false);
            setIsRecording(false);
            setIsCallModalOpen(true);
            setIsMinimized(false);
            setIsDialerOpen(false); // Close dialer on success
            setDialNumber(''); // Clear dial number
        } catch (error: any) {
            toast.dismiss(loadingToastId);
            toast.error(error.message || 'Error making call');
            console.error('Exotel make_a_call error:', error);
        }
    };

    const handleBulkAssign = async (targetParent: any) => {
        setIsRefreshing(true);
        isBulkUpdatingRef.current = true;
        try {
            const displayName = targetParent.name1 || targetParent.client_name || userNameMap.get(targetParent.name) || targetParent.name;

            await Promise.all(
                Array.from(selectedRows).map(leadName =>
                    updateDoc('CRM Lead', leadName, {
                        custom_allocated_to: targetParent.name,
                    })
                )
            );

            toast.success(`Successfully assigned ${selectedRows.size} leads to ${displayName}`);
            setSelectedRows(new Set());

            await Promise.all([
                refetchLeads(),
                mutateChart(),
            ]);
        } catch (err) {
            console.error(err);
            toast.error('Failed to assign some leads');
        } finally {
            setIsRefreshing(false);
            setTimeout(() => {
                isBulkUpdatingRef.current = false;
            }, 2000);
        }
    };

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('leadsSearchQuery') || '');
    const [campaignSearchQuery, setCampaignSearchQuery] = useState(() => sessionStorage.getItem('leadsCampaignSearchQuery') || '');
    const debouncedCampaignSearchQuery = useDebounce(campaignSearchQuery, 400);

    const { data: campaignApiData, isLoading: isCampaignsLoading } = useFrappeGetCall<{
        message?: {
            status?: string;
            user?: string;
            campaigns?: string[];
        };
        status?: string;
        user?: string;
        campaigns?: string[];
    }>('gopocket.lead.get_campaign_names');

    const campaignOptions = useMemo(() => {
        const list = campaignApiData?.message?.campaigns || campaignApiData?.campaigns;
        if (Array.isArray(list)) return list;
        return [];
    }, [campaignApiData]);

    const [openCampaignBox, setOpenCampaignBox] = useState(false);
    const [campaignSearchInput, setCampaignSearchInput] = useState('');

    useEffect(() => {
        if (!openCampaignBox) {
            setCampaignSearchInput('');
        }
    }, [openCampaignBox]);
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('leadsDateRange');
        if (stored) {
            try {
                const [start, end] = JSON.parse(stored);
                return [new Date(start), new Date(end)];
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('leadsStatusFilter') || 'ALL');
    const [parentFilter, setParentFilter] = useState<string>(() => sessionStorage.getItem('leadsParentFilter') || 'ALL');
    const [repeatedLeadFilter, setRepeatedLeadFilter] = useState<boolean>(() => sessionStorage.getItem('leadsRepeatedLeadFilter') === 'true');
    const [openParentBox, setOpenParentBox] = useState(false);
    const [parentSearch, setParentSearch] = useState('');

    useEffect(() => {
        sessionStorage.setItem('leadsRepeatedLeadFilter', String(repeatedLeadFilter));
    }, [repeatedLeadFilter]);

    useEffect(() => {
        if (!openParentBox) {
            setParentSearch('');
        }
    }, [openParentBox]);

    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof LeadItem; direction: 'asc' | 'desc' } | null>({
        key: 'creation',
        direction: 'desc'
    });
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [scrollWholePage, setScrollWholePage] = useState<boolean>(() => {
        return localStorage.getItem("scroll-whole-page") === "true";
    });

    useEffect(() => {
        const handleLayoutChange = () => {
            setScrollWholePage(localStorage.getItem("scroll-whole-page") === "true");
        };
        window.addEventListener("layout-changed", handleLayoutChange);
        return () => {
            window.removeEventListener("layout-changed", handleLayoutChange);
        };
    }, []);

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
    const [openFilterPanel, setOpenFilterPanel] = useState(false);
    const [draftFilters, setDraftFilters] = useState<AdvancedFilter[]>([]);
    const [fieldComboOpen, setFieldComboOpen] = useState<Record<string, boolean>>({});

    const handleFilterPanelOpen = (open: boolean) => {
        if (open) {
            setDraftFilters(
                advancedFilters.length > 0
                    ? advancedFilters.map(f => ({ ...f }))
                    : [{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]
            );
        }
        setOpenFilterPanel(open);
    };

    const addDraftFilter = () =>
        setDraftFilters(prev => [...prev, { id: crypto.randomUUID(), field: '', operator: '', value: '' }]);

    const removeDraftFilter = (id: string) =>
        setDraftFilters(prev => prev.filter(f => f.id !== id));

    const updateDraftFilter = (id: string, updates: Partial<AdvancedFilter>) =>
        setDraftFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

    const applyAdvancedFilters = () => {
        const valid = draftFilters.filter(f => {
            if (!f.field || !f.operator) return false;
            if (Array.isArray(f.value)) return f.value[0] !== '' && f.value[1] !== '';
            return f.value !== '';
        }).map(f => {
            if ((f.operator === 'like' || f.operator === 'not like') && typeof f.value === 'string' && !f.value.includes('%')) {
                return { ...f, value: `%${f.value}%` };
            }
            return f;
        });
        setAdvancedFilters(valid);
        setOpenFilterPanel(false);
    };

    const clearAdvancedFilters = () => {
        setDraftFilters([{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]);
        setAdvancedFilters([]);
        setOpenFilterPanel(false);
    };

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('leadsColumnVisibility');
        const defaults = {
            first_name: true,
            mobile_no: true,
            source: true,
            status: true,
            assigned_to: true,
            _comments: true,
            city: true,
            campaign: false,
            last_campaign: true,
            client_code: true,
            branch: true,
            parent: true,
            creation: true,
            modified: false,
        };
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    });

    useEffect(() => {
        localStorage.setItem('leadsColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const stored = localStorage.getItem('leadsColumnWidths');
        const defaults = {
            first_name: 180,
            mobile_no: 180,
            source: 180,
            status: 180,
            assigned_to: 180,
            _comments: 240,
            city: 180,
            campaign: 180,
            last_campaign: 180,
            client_code: 150,
            branch: 150,
            parent: 180,
            creation: 180,
            modified: 180,
        };
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    });

    useEffect(() => {
        localStorage.setItem('leadsColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || 150;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(80, startWidth + deltaX);
            setColumnWidths(prev => {
                const updated = {
                    ...prev,
                    [columnId]: newWidth
                };
                localStorage.setItem('leadsColumnWidths', JSON.stringify(updated));
                return updated;
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderResizeHandle = (columnId: string) => (
        <div
            onMouseDown={(e) => handleResizeStart(e, columnId)}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 group/resize flex items-center justify-center -mr-1.5"
        >
            <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 group-hover/resize:bg-purple-500/80 active:bg-purple-600 transition-colors" />
        </div>
    );

    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const stored = localStorage.getItem('leadsColumnOrder');
        const defaultOrder = [
            'mobile_no',
            'source',
            'status',
            'assigned_to',
            '_comments',
            'city',
            'campaign',
            'last_campaign',
            'client_code',
            'branch',
            'parent',
            'creation',
            'modified'
        ];
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Exclude first_name if it was previously saved in storage
                // Map _comment to _comments if stored
                let filtered = parsed
                    .map((c: string) => c === '_comment' ? '_comments' : c)
                    .filter((c: string) => c !== 'first_name');
                
                // Merge in any missing default columns to avoid them being hidden/lost
                defaultOrder.forEach(col => {
                    if (!filtered.includes(col)) {
                        filtered.push(col);
                    }
                });
                return filtered;
            } catch (e) {
                return defaultOrder;
            }
        }
        return defaultOrder;
    });

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        setDraggedIndex(null);
        setDraggedOverIndex(null);
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        setColumnOrder(prev => {
            const next = [...prev];
            const [dragged] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, dragged);
            localStorage.setItem('leadsColumnOrder', JSON.stringify(next));
            return next;
        });
    };

    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [activeLeadForComment, setActiveLeadForComment] = useState<LeadItem | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Not Interested Modal State
    const [isNotInterestedModalOpen, setIsNotInterestedModalOpen] = useState(false);
    const [selectedLeadForNotInterested, setSelectedLeadForNotInterested] = useState<LeadItem | null>(null);
    const [lostNotesText, setLostNotesText] = useState('');
    const [isSubmittingNotInterested, setIsSubmittingNotInterested] = useState(false);

    const handleConfirmNotInterested = async () => {
        if (!selectedLeadForNotInterested || !lostNotesText.trim()) return;
        setIsSubmittingNotInterested(true);
        try {
            await updateDoc('CRM Lead', selectedLeadForNotInterested.name, {
                status: 'Not Interested',
                lost_reason: 'Other',
                lost_notes: lostNotesText.trim()
            });
            toast.success('Status updated to Not Interested');
            setIsNotInterestedModalOpen(false);
            setSelectedLeadForNotInterested(null);
            setLostNotesText('');
            refetchLeads();
        } catch (err: any) {
            console.error('Failed to update status:', err);
            toast.error(err?.message || 'Failed to update status');
        } finally {
            setIsSubmittingNotInterested(false);
        }
    };

    const handleAddComment = async () => {
        if (!activeLeadForComment || !commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers = { 'Content-Type': 'application/json' };
            const commentEmail = user?.email || frappeUser?.email || frappeUser?.name || '';
            const commentBy = frappeUser?.full_name || [frappeUser?.first_name, frappeUser?.last_name].filter(Boolean).join(' ') || user?.firstName || user?.user_code || user?.id || user?.email || '';

            const res = await fetch(`${API_BASE_URL}/api/method/frappe.desk.form.utils.add_comment`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    reference_doctype: 'CRM Lead',
                    reference_name: activeLeadForComment.name,
                    content: `<p>${commentText.replace(/\n/g, '<br>')}</p>`,
                    comment_email: commentEmail,
                    comment_by: commentBy
                })
            });

            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            if (data.message) {
                toast.success('Comment added successfully');
                setCommentText('');
                setIsCommentModalOpen(false);
                refetchLeads();
            } else {
                throw new Error('Failed to insert comment');
            }
        } catch (e: any) {
            console.error('Failed to create comment:', e);
            toast.error(e.message || 'Failed to add comment');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Persistence for filters
    useEffect(() => {
        sessionStorage.setItem('leadsSearchQuery', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        sessionStorage.setItem('leadsCampaignSearchQuery', campaignSearchQuery);
    }, [campaignSearchQuery]);

    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('leadsDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('leadsDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('leadsStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('leadsParentFilter', parentFilter);
    }, [parentFilter]);

    const visibleColumnCount = useMemo(() => {
        return Object.values(columnVisibility).filter(v => v).length;
    }, [columnVisibility]);

    const totalTableWidth = useMemo(() => {
        let width = 48 + 80; // checkbox + actions
        if (columnVisibility.first_name) width += columnWidths.first_name;
        if (columnVisibility.mobile_no) width += columnWidths.mobile_no;
        if (columnVisibility.source) width += columnWidths.source;
        if (columnVisibility.status) width += columnWidths.status;
        if (columnVisibility.assigned_to) width += columnWidths.assigned_to;
        if (columnVisibility._comments) width += columnWidths._comments;
        if (columnVisibility.city) width += columnWidths.city;
        if (columnVisibility.campaign) width += columnWidths.campaign;
        if (columnVisibility.creation) width += columnWidths.creation;
        if (columnVisibility.modified) width += columnWidths.modified;
        return width;
    }, [columnVisibility, columnWidths]);

    // Filtered hierarchy for parent selection, sorted by category order
    const parentOptions = useMemo(() => {
        const tree = orgTreeData;
        const loggedInCode = user?.user_code || user?.id || frappeUser?.username || frappeUser?.name;

        let list: any[] = [];
        if (tree && Array.isArray(tree)) {
            list = tree.filter(item => {
                if (item.is_group === 1) return true;
                if (loggedInCode && (
                    item.name === loggedInCode ||
                    item.code === loggedInCode ||
                    item.org_code === loggedInCode
                )) {
                    return true;
                }
                return false;
            });
        }

        // Ensure logged-in user's code is present even if not in orgTreeData or marked as group
        if (loggedInCode && !list.some(item => item.name === loggedInCode || item.code === loggedInCode || item.org_code === loggedInCode)) {
            const userNode = tree && Array.isArray(tree) ? tree.find((item: any) =>
                item.name === loggedInCode || item.code === loggedInCode || item.org_code === loggedInCode
            ) : null;

            if (userNode) {
                list.push(userNode);
            } else {
                list.push({
                    name: loggedInCode,
                    code: loggedInCode,
                    org_code: loggedInCode,
                    name1: frappeUser?.full_name || [frappeUser?.first_name, frappeUser?.last_name].filter(Boolean).join(' ') || user?.firstName || loggedInCode,
                    category: 'USER',
                    is_group: 0
                });
            }
        }

        return list.sort((a, b) => {
            const isALoggedIn = Boolean(loggedInCode && (a.name === loggedInCode || a.code === loggedInCode || a.org_code === loggedInCode));
            const isBLoggedIn = Boolean(loggedInCode && (b.name === loggedInCode || b.code === loggedInCode || b.org_code === loggedInCode));
            if (isALoggedIn && !isBLoggedIn) return -1;
            if (!isALoggedIn && isBLoggedIn) return 1;

            const pa = CATEGORY_ORDER[a.category?.toUpperCase() || ''] || 99;
            const pb = CATEGORY_ORDER[b.category?.toUpperCase() || ''] || 99;
            if (pa !== pb) return pa - pb;
            return a.name.localeCompare(b.name);
        });
    }, [orgTreeData, user, frappeUser]);

    const userNameMap = useMemo(() => {
        if (!orgTreeData) return new Map<string, string>();
        return new Map(orgTreeData.map(node => [node.name, node.name1 || '']));
    }, [orgTreeData]);

    const userCodeMap = useMemo(() => {
        const tree = orgTreeData;
        const map = new Map<string, string>();
        const setEntry = (key: string, val: string) => {
            if (!key) return;
            map.set(key, val);
            map.set(key.toUpperCase(), val);
        };
        if (tree && Array.isArray(tree)) {
            tree.forEach((node: any) => {
                const code = node.code || node.org_code || node.name;
                const name1 = node.name1 || '';
                const displayName = name1 && name1 !== code ? `${name1} (${code})` : code;
                setEntry(node.name, displayName);
                if (node.code) setEntry(node.code, displayName);
                if (node.org_code) setEntry(node.org_code, displayName);
            });
        }
        const loggedInCode = user?.user_code || user?.id || frappeUser?.username || frappeUser?.name;
        if (loggedInCode && !map.has(loggedInCode)) {
            const name1 = frappeUser?.full_name || [frappeUser?.first_name, frappeUser?.last_name].filter(Boolean).join(' ') || user?.firstName;
            const displayName = name1 && name1 !== loggedInCode ? `${name1} (${loggedInCode})` : loggedInCode;
            setEntry(loggedInCode, displayName);
        }
        return map;
    }, [orgTreeData, user, frappeUser]);

    const visibleParentOptions = useMemo(() => {
        if (!parentOptions) return [];
        if (!parentSearch) return parentOptions.slice(0, 100);

        const searchLower = parentSearch.toLowerCase();
        return parentOptions
            .filter(opt => {
                const code = opt.code || opt.org_code || '';
                const clientName = userNameMap.get(opt.name) || '';
                const name1 = opt.name1 || '';
                return opt.name.toLowerCase().includes(searchLower) ||
                    code.toLowerCase().includes(searchLower) ||
                    clientName.toLowerCase().includes(searchLower) ||
                    name1.toLowerCase().includes(searchLower) ||
                    (opt.category && opt.category.toLowerCase().includes(searchLower));
            })
            .slice(0, 100);
    }, [parentOptions, parentSearch, userNameMap]);

    // Define hierarchy tree expansion logic
    const expandBranches = useCallback((selectedNodes: string[]) => {
        if (!orgTreeData || !Array.isArray(orgTreeData)) return selectedNodes;

        const childrenMap = new Map<string, string[]>();
        orgTreeData.forEach(node => {
            const parent = node.parent_crm_heirarchy;
            if (parent) {
                if (!childrenMap.has(parent)) {
                    childrenMap.set(parent, []);
                }
                childrenMap.get(parent)!.push(node.name);
            }
        });

        const allCodes = new Set<string>();
        const collectDescendants = (nodeId: string) => {
            allCodes.add(nodeId);
            const children = childrenMap.get(nodeId);
            if (children) {
                children.forEach(collectDescendants);
            }
        };

        selectedNodes.forEach(name => collectDescendants(name));
        return Array.from(allCodes);
    }, [orgTreeData]);

    const getHierarchyCodes = useCallback((names: string[]) => {
        const tree = orgTreeData;
        if (!tree) return names;
        const codeMap = new Map<string, string>();
        tree.forEach((node: any) => {
            if (node.name) {
                const code = node.code || node.org_code || node.name;
                codeMap.set(node.name, code);
            }
        });
        return names.map(name => codeMap.get(name) || name);
    }, [orgTreeData]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters: any[] = [];

        // Hierarchy filters
        const parentFilterList = selectedHierarchy && selectedHierarchy.length > 0
            ? expandBranches(selectedHierarchy)
            : [];
        const combinedParents = parentFilter !== 'ALL'
            ? [...new Set([parentFilter, ...parentFilterList])]
            : parentFilterList;

        const combinedCodes = getHierarchyCodes(combinedParents);

        if (combinedCodes.length > 0) {
            activeFilters.push(['custom_allocated_code', 'in', combinedCodes]);
        }

        // Search Query
        if (debouncedSearchQuery) {
            if (/^\d/.test(debouncedSearchQuery)) {
                activeFilters.push(['mobile_no', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                if (debouncedSearchQuery.toUpperCase().startsWith('CRM-')) {
                    activeFilters.push(['name', 'like', `%${debouncedSearchQuery}%`]);
                } else {
                    activeFilters.push(['first_name', 'like', `%${debouncedSearchQuery}%`]);
                }
            }
        }

        // Campaign Search Query
        if (debouncedCampaignSearchQuery) {
            activeFilters.push(['custom_campaign_name', 'like', `%${debouncedCampaignSearchQuery}%`]);
        }

        // Repeated Lead Checkbox Filter
        if (repeatedLeadFilter) {
            activeFilters.push(['custom_repeated_lead', '=', 1]);
        }

        // Date Range
        if (dateRange?.[0] && dateRange?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            activeFilters.push(['creation', '>=', `${formatLocal(dateRange[0])} 00:00:00`]);
            activeFilters.push(['creation', '<=', `${formatLocal(dateRange[1])} 23:59:59`]);
        }

        // Add advanced filters
        for (const f of advancedFilters) {
            if (!f.field || !f.operator) continue;
            if (Array.isArray(f.value)) {
                if (f.value[0] && f.value[1]) {
                    activeFilters.push([f.field, f.operator, f.value]);
                }
            } else if (f.value) {
                activeFilters.push([f.field, f.operator, f.value]);
            }
        }

        return activeFilters;
    }, [selectedHierarchy, parentFilter, expandBranches, getHierarchyCodes, debouncedSearchQuery, debouncedCampaignSearchQuery, dateRange, advancedFilters]);

    const filters = useMemo(() => {
        const activeFilters = [...totalFilters];
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'Others') {
                activeFilters.push(['status', 'not in', ['New', 'Followup', 'won', 'Not Interested']]);
            } else {
                activeFilters.push(['status', '=', statusFilter]);
            }
        }
        return activeFilters;
    }, [totalFilters, statusFilter]);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    // Fetch dashboard chart data for status breakdown (1 API call instead of 6 separate ones)
    const { data: chartData, error: chartError, mutate: mutateChart } = useSWR<any>(
        [`${API_BASE_URL}/api/method/frappe.desk.doctype.dashboard_chart.dashboard_chart.get`, JSON.stringify({
            chart_name: 'Status-1',
            filters: JSON.stringify(filters),
            refresh: 1
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true, shouldRetryOnError: false, dedupingInterval: 5000 }
    );

    const chartCounts = useMemo(() => {
        let total = 0;
        let newC = 0;
        let followupC = 0;
        let wonC = 0;
        let notInterestedC = 0;
        let othersC = 0;

        if (chartData && chartData.labels && chartData.datasets?.[0]?.values) {
            const labels = chartData.labels;
            const values = chartData.datasets[0].values;

            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                const value = Number(values[i]) || 0;
                total += value;

                const lowerLabel = (label || '').toLowerCase();
                if (lowerLabel === 'new') {
                    newC = value;
                } else if (lowerLabel === 'followup') {
                    followupC = value;
                } else if (lowerLabel === 'won') {
                    wonC = value;
                } else if (lowerLabel === 'not interested') {
                    notInterestedC = value;
                } else {
                    othersC += value;
                }
            }
        }

        return {
            totalCount: total,
            newCount: newC,
            followupCount: followupC,
            wonCount: wonC,
            notInterestedCount: notInterestedC,
            othersCount: othersC
        };
    }, [chartData]);

    const {
        totalCount,
        newCount,
        followupCount,
        wonCount,
        notInterestedCount,
        othersCount
    } = chartCounts;

    // Sorting config & string calculation for backend
    const orderBy = useMemo(() => {
        if (!sortConfig) {
            return 'creation desc';
        }
        return `${sortConfig.key} ${sortConfig.direction}`;
    }, [sortConfig]);

    // List query via SWR
    const {
        data: leadsData = [],
        error: listError,
        isLoading,
        mutate: refetchLeads
    } = useSWR<any[]>(
        [`${API_BASE_URL}/api/method/frappe.client.get_list`, JSON.stringify({
            doctype: 'CRM Lead',
            fields: [
                'name',
                'first_name',
                'mobile_no',
                'custom_allocated_code',
                'custom_allocated_person_name',
                'source',
                'status',
                '_comments',
                'custom_city',
                'custom_campaign_name',
                'custom_last_campaign',
                'custom_client_code',
                'custom_branch',
                'custom_parent',
                'custom_repeated_lead',
                'creation',
                'modified',
            ],
            filters,
            order_by: orderBy,
            limit_start: (currentPage - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true, shouldRetryOnError: false, dedupingInterval: 2000 }
    );

    const count = totalCount;

    useEffect(() => {
        const errors = [listError, chartError];
        for (const err of errors) {
            if (err) {
                const status = err.status;
                const info = err.info || {};
                const exception = info.exception || "";
                const exc_type = info.exc_type || "";
                const _server_messages = info._server_messages || "";
                const message = info.message || err.message || "";

                const is403 = status === 403;
                const isPermissionError =
                    exception.includes('PermissionError') ||
                    exc_type === 'PermissionError' ||
                    _server_messages.includes('PermissionError') ||
                    _server_messages.includes('Insufficient Permission') ||
                    message.includes('PermissionError') ||
                    message.includes('Insufficient Permission');

                if (is403 || isPermissionError) {
                    let msg = "Insufficient Permission for CRM Lead";
                    try {
                        if (_server_messages) {
                            const parsedMsgs = JSON.parse(_server_messages);
                            if (Array.isArray(parsedMsgs) && parsedMsgs[0]?.message) {
                                msg = parsedMsgs[0].message.replace(/<[^>]*>/g, '');
                            }
                        } else if (message) {
                            msg = message;
                        }
                    } catch (e) {
                        if (message) msg = message;
                    }
                    setPermissionError(msg);
                    break;
                }
            }
        }
    }, [listError, chartError]);

    // Save leads to sessionStorage when loaded
    useEffect(() => {
        if (leadsData && leadsData.length > 0) {
            sessionStorage.setItem('leadsData', JSON.stringify(leadsData));
        }
    }, [leadsData]);

    const error = listError ? (typeof listError === 'string' ? listError : (listError.message || 'An error occurred')) : permissionError;

    const handleSort = (key: keyof LeadItem) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig?.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetchLeads(),
                mutateChart(),
            ]);
            toast.success('Leads data refreshed successfully');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Real-time listener for CRM Lead updates via WebSocket
    const listUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleListUpdate = useCallback((eventData: any) => {
        if (isBulkUpdatingRef.current) return;
        console.log('Realtime CRM Lead event:', eventData);

        if (listUpdateTimeoutRef.current) {
            clearTimeout(listUpdateTimeoutRef.current);
        }

        listUpdateTimeoutRef.current = setTimeout(() => {
            if (!isBulkUpdatingRef.current) {
                refetchLeads();
                mutateChart();
            }
        }, 1000);
    }, [refetchLeads, mutateChart]);

    // Unsubscribe from CRM Lead doctype room to avoid broad, noisy updates
    useEffect(() => {
        const socket = frappe?.socket;
        if (socket) {
            console.log('Explicitly unsubscribing from CRM Lead doctype room...');
            socket.emit("doctype_unsubscribe", "CRM Lead");
        }
    }, [frappe]);

    // Listen to custom scoped CRM Lead update events
    useFrappeEventListener('crm_lead_list_update', handleListUpdate);

    // Listen to Exotel inbound and outbound calls
    const handleExotelCall = useCallback((eventData: any) => {
        console.log('Realtime Exotel Call event:', eventData);
        if (!eventData) return;
        
        let isMyCall = false;
        if (eventData.AgentEmail && user?.email) {
            isMyCall = eventData.AgentEmail.toLowerCase() === user.email.toLowerCase();
        } else if (activeCallLead?.mobile_no) {
            const cleanLeadNum = activeCallLead.mobile_no.replace(/^\+?91|^0/, '');
            const cleanToNum = (eventData.To || '').replace(/^\+?91|^0/, '');
            const cleanFromNum = (eventData.From || '').replace(/^\+?91|^0/, '');
            isMyCall = cleanLeadNum === cleanToNum || cleanLeadNum === cleanFromNum;
        }

        if (!isMyCall) return;

        const eventType = (eventData.EventType || '').toLowerCase();

        if (eventType === 'dial') {
            const cleanFrom = eventData.CallFrom.replace(/^\+?91|^0/, '');
            
            // Look for matching lead inside current leadsData
            let matchingLead = leadsData.find((l: LeadItem) => {
                if (!l.mobile_no) return false;
                const cleanMobile = l.mobile_no.replace(/^\+?91|^0/, '');
                return cleanMobile === cleanFrom;
            });
            
            // Fallback to temp lead info if caller number doesn't match existing leads
            if (!matchingLead) {
                matchingLead = {
                    name: '',
                    first_name: 'Inbound Caller',
                    lead_name: 'Inbound Caller',
                    mobile_no: eventData.CallFrom,
                    source: 'Inbound Call',
                    status: 'Open',
                    creation: new Date().toISOString(),
                    modified: new Date().toISOString()
                };
            }
            
            setActiveCallLead(matchingLead);
            setCallStatus('in-progress');
            setCallOutcome(null);
            setCallDuration(0);
            setIsMuted(false);
            setIsOnHold(false);
            setIsRecording(false);
            setIsCallModalOpen(true);
            setIsMinimized(false); // Maximize to draw attention
        } else if (eventType === 'terminal') {
            const outcome = eventData.Status || 'ended';
            setCallStatus('ended');
            setCallOutcome(outcome);
            
            // Auto close after 3 seconds so agent can see the final status in the UI
            setTimeout(() => {
                setIsCallModalOpen(false);
            }, 3000);
        }
    }, [leadsData, user, activeCallLead]);

    useFrappeEventListener('exotel_call', handleExotelCall);

    const handleResetFilters = () => {
        setSearchQuery('');
        setCampaignSearchQuery('');
        setStatusFilter('ALL');
        setParentFilter('ALL');
        setDateRange(null);
        setAdvancedFilters([]);
        setCurrentPage(1);
        toast.success('All search criteria and filters have been cleared.');
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress({ current: 0, total: totalCount });
        try {
            let allData: any[] = [];
            let current_limit_start = 0;
            const limit_page_length = 5000;
            let hasMore = true;

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers = { 'Content-Type': 'application/json' };

            while (hasMore) {
                const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'CRM Lead',
                        fields: [
                            'name',
                            'first_name',
                            'mobile_no',
                            'custom_allocated_code',
                            'custom_allocated_person_name',
                            'source',
                            'status',
                            '_comments',
                            'custom_city',
                            'custom_campaign_name',
                            'custom_last_campaign',
                            'custom_client_code',
                            'custom_branch',
                            'custom_parent',
                            'custom_repeated_lead',
                            'creation',
                            'modified',
                        ],
                        filters,
                        limit_start: current_limit_start,
                        limit_page_length: limit_page_length
                    })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                });

                const data = res.message;

                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    setExportProgress({ current: allData.length, total: totalCount });
                    if (data.length < limit_page_length) {
                        hasMore = false;
                    } else {
                        current_limit_start += limit_page_length;
                    }
                } else {
                    hasMore = false;
                }
            }

            if (allData.length > 0) {
                const exportData = allData.map(item => ({
                    'Lead ID': item.name,
                    'Name': item.first_name || '',
                    'Mobile': item.mobile_no || '',
                    'Allocated Code': item.custom_allocated_code || '',
                    'Allocated Person': item.custom_allocated_person_name || '',
                    'Source': item.source || '',
                    'Status': item.status || '',
                    'Comments': formatComment(item._comments),
                    'City': item.custom_city || '',
                    'Campaign Name': item.custom_campaign_name || '',
                    'Created Date': item.creation || '',
                    'Modified Date': item.modified || '',
                }));

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `Leads_Export_${todayStr}`);
                toast.success('Excel export completed successfully');
            } else {
                toast.error('No records found to export');
            }
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, statusFilter, parentFilter, dateRange]);

    const sortedData = useMemo(() => {
        if (!leadsData) return [];
        const result = [...leadsData];
        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = (a[sortConfig.key] || '').toString();
                const bValue = (b[sortConfig.key] || '').toString();
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [leadsData, sortConfig]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const formatValue = (value: string | null | undefined) => value || '-';

    const formatComment = (commentsJson: string | null | undefined) => {
        if (!commentsJson) return '-';
        try {
            const parsed = JSON.parse(commentsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Get the latest comment
                const latest = parsed[parsed.length - 1];
                const rawComment = latest?.comment || '';
                // Strip HTML tags
                const cleanText = rawComment.replace(/<\/?[^>]+(>|$)/g, "");
                return cleanText || '-';
            }
        } catch (e) {
            console.error('Failed to parse comment JSON:', e);
        }
        return '-';
    };

    const renderStatusBadge = (status: string | null | undefined) => {
        if (!status) return '-';
        const s = status.toLowerCase();

        const badgeClass = s === 'won'
            ? "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400"
            : s === 'new'
                ? "bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                : s === 'rnr'
                    ? "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400"
                    : s === 'followup'
                        ? "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                        : s === 'not interested'
                            ? "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                            : s === 'client'
                                ? "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";

        const dotClass = s === 'won'
            ? "bg-green-500"
            : s === 'new'
                ? "bg-purple-500"
                : s === 'rnr'
                    ? "bg-orange-500"
                    : s === 'followup'
                        ? "bg-amber-500"
                        : s === 'not interested'
                            ? "bg-red-500"
                            : s === 'client'
                                ? "bg-blue-500"
                                : "bg-slate-500";

        return (
            <div className="flex items-center gap-2">
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                    badgeClass
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotClass)} />
                    {status}
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "p-4 flex flex-col space-y-6",
            scrollWholePage ? "min-h-full" : "h-full overflow-hidden"
        )}>
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card
                        onClick={() => setStatusFilter('ALL')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 transition-opacity",
                            statusFilter === 'ALL' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('New')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600 transition-opacity",
                            statusFilter === 'New' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">New</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{newCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Followup')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transition-opacity",
                            statusFilter === 'Followup' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Followup</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{followupCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('won')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transition-opacity",
                            statusFilter === 'won' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Won</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <CircleCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{wonCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Not Interested')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 transition-opacity",
                            statusFilter === 'Not Interested' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Not Interested</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{notInterestedCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Others')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700 transition-opacity",
                            statusFilter === 'Others' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Others</span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                                <MoreHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{othersCount}</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Filter className="w-4 h-4 text-slate-500" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 text-slate-800 dark:text-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Advanced Filters</p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Use % as wildcard for "like"</span>
                            </div>

                            <div className="space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                                {draftFilters.map((filter) => (
                                    <div key={filter.id} className="flex items-center gap-2">
                                        {/* Field combobox */}
                                        <Popover
                                            open={fieldComboOpen[filter.id] ?? false}
                                            onOpenChange={(open) => setFieldComboOpen(prev => ({ ...prev, [filter.id]: open }))}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-[150px] justify-between h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0"
                                                >
                                                    <span className="truncate">
                                                        {filter.field
                                                            ? CRM_LEAD_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command className="bg-white dark:bg-slate-900">
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {CRM_LEAD_FILTER_FIELDS.map((field) => (
                                                                <CommandItem
                                                                    key={field.value}
                                                                    value={field.label}
                                                                    onSelect={() => {
                                                                        const defaultOp = getOperatorsForType(field.type)[0];
                                                                        const defaultVal = field.type === 'date' && defaultOp === 'Between' ? ['', ''] as [string, string] : '';
                                                                        updateDraftFilter(filter.id, { field: field.value, operator: defaultOp, value: defaultVal });
                                                                        setFieldComboOpen(prev => ({ ...prev, [filter.id]: false }));
                                                                    }}
                                                                    className="text-xs"
                                                                >
                                                                    <Check className={cn('mr-2 h-3 w-3', filter.field === field.value ? 'opacity-100' : 'opacity-0')} />
                                                                    {field.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Operator */}
                                        {filter.field && (
                                            <Select
                                                value={filter.operator}
                                                onValueChange={(val) => {
                                                    const newVal = val === 'Between' ? ['', ''] as [string, string] : '';
                                                    updateDraftFilter(filter.id, { operator: val, value: newVal });
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs w-[95px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shrink-0">
                                                    <SelectValue placeholder="Operator" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                    {getOperatorsForType(getFieldType(filter.field)).map((op: string) => (
                                                        <SelectItem key={op} value={op} className="text-xs">
                                                            {OPERATOR_LABELS[op] ?? op}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {/* Value */}
                                        {filter.field && filter.operator && (
                                            getFieldType(filter.field) === 'select' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select option..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                        {getFieldOptions(filter.field).map((opt: string) => (
                                                            <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : filter.operator === 'Between' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                'flex-1 h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 justify-start gap-1.5 min-w-0 truncate',
                                                                !(Array.isArray(filter.value) && filter.value[0]) && 'text-slate-400 dark:text-slate-500'
                                                            )}
                                                        >
                                                            <CalendarIcon className="h-3 w-3 shrink-0 text-slate-400" />
                                                            <span className="truncate">
                                                                {Array.isArray(filter.value) && filter.value[0]
                                                                    ? filter.value[1]
                                                                        ? `${filter.value[0]} → ${filter.value[1]}`
                                                                        : filter.value[0]
                                                                    : 'Pick date range'}
                                                            </span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-[60]" align="start">
                                                        <Calendar
                                                            mode="range"
                                                            selected={{
                                                                from: Array.isArray(filter.value) && filter.value[0]
                                                                    ? (() => { const [y, m, d] = filter.value[0].split('-').map(Number); return new Date(y, m - 1, d); })()
                                                                    : undefined,
                                                                to: Array.isArray(filter.value) && filter.value[1]
                                                                    ? (() => { const [y, m, d] = filter.value[1].split('-').map(Number); return new Date(y, m - 1, d); })()
                                                                    : undefined,
                                                            }}
                                                            onSelect={(range) => {
                                                                const fmt = (dt: Date | undefined) => {
                                                                    if (!dt) return '';
                                                                    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                                                                };
                                                                updateDraftFilter(filter.id, { value: [fmt(range?.from), fmt(range?.to)] });
                                                            }}
                                                            numberOfMonths={2}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            ) : filter.operator === 'Timespan' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select period..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                        <SelectItem value="today" className="text-xs">Today</SelectItem>
                                                        <SelectItem value="yesterday" className="text-xs">Yesterday</SelectItem>
                                                        <SelectItem value="last week" className="text-xs">Last Week</SelectItem>
                                                        <SelectItem value="this week" className="text-xs">This Week</SelectItem>
                                                        <SelectItem value="last month" className="text-xs">Last Month</SelectItem>
                                                        <SelectItem value="this month" className="text-xs">This Month</SelectItem>
                                                        <SelectItem value="this quarter" className="text-xs">This Quarter</SelectItem>
                                                        <SelectItem value="last quarter" className="text-xs">Last Quarter</SelectItem>
                                                        <SelectItem value="this year" className="text-xs">This Year</SelectItem>
                                                        <SelectItem value="last year" className="text-xs">Last Year</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type={getFieldType(filter.field) === 'date' ? 'date' : (getFieldType(filter.field) === 'number' ? 'number' : 'text')}
                                                    placeholder="Value"
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                                    className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg"
                                                />
                                            )
                                        )}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 shrink-0"
                                            onClick={() => removeDraftFilter(filter.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-t-slate-100 dark:border-slate-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Condition
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearAdvancedFilters}
                                        className="h-8 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                    >
                                        Clear All
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={applyAdvancedFilters}
                                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-[190px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Creation Date Range"
                        />
                    </div>
                    <div className="w-[180px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Followup">Followup</SelectItem>
                                <SelectItem value="RNR">RNR</SelectItem>
                                <SelectItem value="Call Back">Call Back</SelectItem>
                                <SelectItem value="Switch off">Switch Off</SelectItem>
                                <SelectItem value="Not Interested">Not Interested</SelectItem>
                                <SelectItem value="won">Won</SelectItem>
                                <SelectItem value="Client">Client</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Campaign Combobox */}
                    <div className="w-[200px]">
                        <Popover open={openCampaignBox} onOpenChange={setOpenCampaignBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCampaignBox}
                                    className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal text-sm"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate text-sm">
                                            {campaignSearchQuery || "Select Campaign"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                        {campaignSearchQuery && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCampaignSearchQuery('');
                                                }}
                                                className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <Command className="bg-white dark:bg-slate-900">
                                    <CommandInput
                                        placeholder="Search campaign..."
                                        className="h-9 text-sm text-slate-800 dark:text-slate-100"
                                        value={campaignSearchInput}
                                        onValueChange={setCampaignSearchInput}
                                    />
                                    <CommandList>
                                        {isCampaignsLoading ? (
                                            <div className="flex items-center justify-center py-6 gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                                                Loading campaigns...
                                            </div>
                                        ) : (
                                            <>
                                                <CommandEmpty className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
                                                    No campaign found.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="ALL_CAMPAIGNS_OPTION"
                                                        onSelect={() => {
                                                            setCampaignSearchQuery('');
                                                            setOpenCampaignBox(false);
                                                        }}
                                                        className="flex items-center justify-between focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300 text-sm"
                                                    >
                                                        <span className="text-sm font-normal">All Campaigns</span>
                                                        {!campaignSearchQuery && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                                                    </CommandItem>
                                                    {campaignOptions.map((campaignName: string) => {
                                                        const isSelected = campaignSearchQuery === campaignName;
                                                        return (
                                                            <CommandItem
                                                                key={campaignName}
                                                                value={campaignName}
                                                                onSelect={() => {
                                                                    setCampaignSearchQuery(isSelected ? '' : campaignName);
                                                                    setOpenCampaignBox(false);
                                                                }}
                                                                className="flex items-center justify-between gap-2 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300 text-sm"
                                                            >
                                                                <span className="truncate text-sm font-normal">{campaignName}</span>
                                                                {isSelected && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />}
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Parent Filter Combobox */}
                    <div className="w-[200px]">
                        <Popover open={openParentBox} onOpenChange={setOpenParentBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openParentBox}
                                    className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {parentFilter === "ALL"
                                                ? "Select Parent"
                                                : userCodeMap.get(parentFilter) || parentFilter}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                                    <CommandInput
                                        placeholder="Search parent..."
                                        className="h-9 text-slate-800 dark:text-slate-100"
                                        value={parentSearch}
                                        onValueChange={setParentSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No parent found.</CommandEmpty>
                                        <CommandGroup>
                                            {!parentSearch && (
                                                <CommandItem
                                                    value="ALL"
                                                    onSelect={() => {
                                                        setParentFilter("ALL");
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
                                                >
                                                    <span>All Parents</span>
                                                    {parentFilter === "ALL" && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                                                </CommandItem>
                                            )}
                                            {visibleParentOptions.map((opt) => (
                                                <CommandItem
                                                    key={opt.name}
                                                    value={`${opt.code || ''} ${opt.org_code || ''} ${opt.name} ${opt.name1 || ''} ${userNameMap.get(opt.name) || ''}`}
                                                    onSelect={() => {
                                                        setParentFilter(opt.name === parentFilter ? "ALL" : opt.name);
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
                                                >
                                                    <span className="truncate text-sm">
                                                        {opt.name1 && opt.name1 !== (opt.code || opt.org_code || opt.name)
                                                            ? `${opt.name1} (${opt.code || opt.org_code || opt.name})`
                                                            : (opt.code || opt.org_code || opt.name)}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {opt.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[8px] px-1 py-0 h-3.5 uppercase font-bold border",
                                                                    getCategoryStyles(opt.category)
                                                                )}
                                                            >
                                                                {opt.category}
                                                            </Badge>
                                                        )}
                                                        {parentFilter === opt.name && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Repeated Lead Checkbox Filter */}
                    <div className="flex items-center gap-2 h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <Checkbox
                            id="repeated-lead-filter"
                            checked={repeatedLeadFilter}
                            onCheckedChange={(checked) => setRepeatedLeadFilter(Boolean(checked))}
                        />
                        <label
                            htmlFor="repeated-lead-filter"
                            className="text-sm font-normal text-slate-700 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap"
                        >
                            Repeated Lead
                        </label>
                    </div>

                    {selectedRows.size > 0 && (
                        <div className="flex items-center gap-2 px-3 h-10 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">
                                {selectedRows.size} Selected
                            </span>
                            <div className="h-4 w-[1px] bg-purple-200 mx-1" />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider text-purple-700 hover:bg-purple-100 hover:text-purple-800 gap-1.5 focus:ring-0 focus:ring-offset-0">
                                        <Users className="w-3.5 h-3.5" />
                                        Assign To
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-64 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
                                    <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                                        <CommandInput placeholder="Search user..." className="h-9 text-slate-800 dark:text-slate-100" value={parentSearch} onValueChange={setParentSearch} />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No user found.</CommandEmpty>
                                            <CommandGroup>
                                                {visibleParentOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.name}
                                                        value={`${opt.code || ''} ${opt.org_code || ''} ${opt.name} ${opt.name1 || ''}`}
                                                        onSelect={() => {
                                                            handleBulkAssign(opt);
                                                        }}
                                                        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    >
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate">
                                                                {opt.name1 && opt.name1 !== (opt.code || opt.org_code || opt.name)
                                                                    ? `${opt.name1} (${opt.code || opt.org_code || opt.name})`
                                                                    : (opt.code || opt.org_code || opt.name)}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tighter">{opt.category}</span>
                                                        </div>
                                                        {opt.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[8px] px-1.5 py-0 h-4 uppercase font-bold border shrink-0",
                                                                    getCategoryStyles(opt.category)
                                                                )}
                                                            >
                                                                {opt.category}
                                                            </Badge>
                                                        )}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRows(new Set())} className="h-6 w-6 text-purple-700 hover:bg-purple-100 rounded-md" title="Clear selection">
                                <X className="w-3.5 h-3.5 animate-in" />
                            </Button>
                        </div>
                    )}

                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Name, ID, Mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading || isExporting}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {(user?.user_code === 'HO' || user?.user_code === 'DRCT' || user?.user_code === 'Business') && (
                        <Button
                            onClick={handleExport}
                            disabled={isExporting || isLoading || isRefreshing}
                            variant="outline"
                            className="rounded-xl px-4 font-semibold gap-2 h-10 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-sm"
                        >
                            {isExporting ? (
                                <>
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                    <span className="text-[10px] font-bold">
                                        {exportProgress.total > 0 ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FileDown className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Export</span>
                                </>
                            )}
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            <DropdownMenuGroup>
                                {[
                                    { id: 'first_name', label: 'First Name' },
                                    { id: 'mobile_no', label: 'Mobile' },
                                    { id: 'source', label: 'Source' },
                                    { id: 'status', label: 'Status' },
                                    { id: 'assigned_to', label: 'Assigned To' },
                                    { id: '_comments', label: 'Comments' },
                                    { id: 'city', label: 'City' },
                                    { id: 'campaign', label: 'Campaign' },
                                    { id: 'last_campaign', label: 'Last Campaign' },
                                    { id: 'client_code', label: 'Client Code' },
                                    { id: 'branch', label: 'Branch' },
                                    { id: 'parent', label: 'Parent' },
                                    { id: 'creation', label: 'Created At' },
                                    { id: 'modified', label: 'Modified At' },
                                ].map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
                                        className="capitalize cursor-pointer"
                                        checked={columnVisibility[col.id]}
                                        onCheckedChange={(checked) =>
                                            setColumnVisibility(prev => ({ ...prev, [col.id]: checked }))
                                        }
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {(searchQuery || campaignSearchQuery || statusFilter !== 'ALL' || parentFilter !== 'ALL' || repeatedLeadFilter || dateRange !== null || advancedFilters.length > 0) && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setSearchQuery('');
                                setCampaignSearchQuery('');
                                setStatusFilter('ALL');
                                setParentFilter('ALL');
                                setRepeatedLeadFilter(false);
                                setDateRange(null);
                                setAdvancedFilters([]);
                                setDraftFilters([{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]);
                                setCurrentPage(1);
                            }}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Reset
                        </Button>
                    )}

                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200 dark:border-slate-800">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5 animate-bounce shrink-0" />
                    {error}
                </div>
            )}

            {/* Table Section */}
            <Card className={cn(
                "border-none shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col",
                scrollWholePage ? "" : "flex-1 min-h-0 overflow-hidden"
            )}>
                <TableWrapper scrollWholePage={scrollWholePage}>
                    <table className="text-sm table-fixed" style={{ width: '100%', minWidth: totalTableWidth }}>
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-30">
                            <tr className="border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                <th className="text-left py-4 px-4 sticky top-0 left-0 bg-slate-50 dark:bg-slate-900 border-r border-r-slate-100 dark:border-r-slate-800/50 z-40" style={{ width: 48, minWidth: 48, maxWidth: 48 }}>
                                    <Checkbox
                                        checked={sortedData.length > 0 && sortedData.every(row => selectedRows.has(row.name))}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedRows(new Set(sortedData.map(row => row.name)));
                                            } else {
                                                setSelectedRows(new Set());
                                            }
                                        }}
                                    />
                                </th>
                                {columnVisibility.first_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col relative sticky top-0 bg-slate-50 dark:bg-slate-900 z-30" onClick={() => handleSort('first_name')} style={{ width: columnWidths.first_name, minWidth: columnWidths.first_name, maxWidth: columnWidths.first_name }}>
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            First Name
                                            {sortConfig?.key === 'first_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                        </div>
                                        {renderResizeHandle('first_name')}
                                    </th>
                                )}
                                {columnOrder.map((colId, index) => {
                                    if (!columnVisibility[colId]) return null;

                                    let content: React.ReactNode = null;
                                    let onClickHandler: (() => void) | undefined = undefined;

                                    if (colId === 'first_name') {
                                        onClickHandler = () => handleSort('first_name');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                First Name
                                                {sortConfig?.key === 'first_name' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'mobile_no') {
                                        content = <div className="truncate pr-2">Contact</div>;
                                    } else if (colId === 'source') {
                                        content = <div className="truncate pr-2">Source</div>;
                                    } else if (colId === 'status') {
                                        onClickHandler = () => handleSort('status');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Status
                                                {sortConfig?.key === 'status' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'assigned_to') {
                                        onClickHandler = () => handleSort('custom_allocated_person_name');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Assigned To
                                                {sortConfig?.key === 'custom_allocated_person_name' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === '_comments') {
                                        content = <div className="truncate pr-2">Comments</div>;
                                    } else if (colId === 'city') {
                                        content = <div className="truncate pr-2">City</div>;
                                    } else if (colId === 'campaign') {
                                        content = <div className="truncate pr-2">Campaign</div>;
                                    } else if (colId === 'last_campaign') {
                                        content = <div className="truncate pr-2">Last Campaign</div>;
                                    } else if (colId === 'client_code') {
                                        content = <div className="truncate pr-2">Client Code</div>;
                                    } else if (colId === 'branch') {
                                        content = <div className="truncate pr-2">Branch</div>;
                                    } else if (colId === 'parent') {
                                        content = <div className="truncate pr-2">Parent</div>;
                                    } else if (colId === 'creation') {
                                        onClickHandler = () => handleSort('creation');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Created At
                                                {sortConfig?.key === 'creation' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'modified') {
                                        onClickHandler = () => handleSort('modified');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Modified At
                                                {sortConfig?.key === 'modified' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    }

                                    return (
                                        <th
                                            key={colId}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => {
                                                handleDragOver(e);
                                                setDraggedOverIndex(index);
                                            }}
                                            onDragLeave={() => setDraggedOverIndex(null)}
                                            onDragEnd={() => {
                                                setDraggedIndex(null);
                                                setDraggedOverIndex(null);
                                            }}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={cn(
                                                "text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-grab active:cursor-grabbing select-none group/col relative transition-all duration-150 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 sticky top-0 bg-slate-50 dark:bg-slate-900 z-30",
                                                draggedIndex !== null && draggedIndex !== index && draggedOverIndex === index && "bg-purple-50/50 dark:bg-purple-950/10"
                                            )}
                                            onClick={onClickHandler}
                                            style={{
                                                width: columnWidths[colId],
                                                minWidth: columnWidths[colId],
                                                maxWidth: columnWidths[colId]
                                            }}
                                        >
                                            {content}
                                            {renderResizeHandle(colId)}
                                            {draggedOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 w-1 bg-purple-600 z-30 pointer-events-none animate-pulse",
                                                    draggedIndex < index ? "right-0" : "left-0"
                                                )} />
                                            )}
                                        </th>
                                    );
                                })}
                                <th className="p-0 m-0 border-none w-auto sticky top-0 bg-slate-50 dark:bg-slate-900 z-30" style={{ minWidth: 0 }} />
                                <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 sticky top-0 right-0 bg-slate-50 dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800/50 z-40" style={{ width: 80, minWidth: 80, maxWidth: 80 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={visibleColumnCount + 3} className="p-4">
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : sortedData.length > 0 ? (
                                sortedData.map((row: LeadItem, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group whitespace-nowrap"
                                    >
                                        <td className="py-4 px-4 sticky left-0 bg-white dark:bg-slate-900 border-r border-r-slate-100 dark:border-r-slate-800/50 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800" onClick={(e) => e.stopPropagation()} style={{ width: 48, minWidth: 48, maxWidth: 48 }}>
                                            <Checkbox
                                                checked={selectedRows.has(row.name)}
                                                onCheckedChange={(checked) => {
                                                    const next = new Set(selectedRows);
                                                    if (checked) {
                                                        next.add(row.name);
                                                    } else {
                                                        next.delete(row.name);
                                                    }
                                                    setSelectedRows(next);
                                                }}
                                            />
                                        </td>
                                        {columnVisibility.first_name && (
                                            <td className="py-4 px-4" style={{ width: columnWidths.first_name, minWidth: columnWidths.first_name, maxWidth: columnWidths.first_name }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs uppercase shrink-0">
                                                        {(row.first_name || row.lead_name || 'U')[0]}
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/leads/${row.name}`)}
                                                        className="font-semibold text-slate-900 dark:text-slate-100 leading-tight hover:text-purple-600 transition-colors text-left focus:outline-none truncate block w-full"
                                                    >
                                                        {formatValue(row.first_name || row.lead_name)}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {columnOrder.map((colId) => {
                                            if (!columnVisibility[colId]) return null;
                                            if (colId === 'mobile_no') {
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.mobile_no, minWidth: columnWidths.mobile_no, maxWidth: columnWidths.mobile_no }}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 truncate w-full">
                                                                {row.mobile_no ? (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMakeCall(row);
                                                                        }}
                                                                        className="p-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 active:bg-blue-200 dark:active:bg-blue-900/90 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/40 transition-all shrink-0 flex items-center justify-center active:scale-90"
                                                                        title="Call with Exotel"
                                                                    >
                                                                        <Phone className="w-3.5 h-3.5 font-bold" />
                                                                    </button>
                                                                ) : (
                                                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                                )}
                                                                <span className="font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{row.mobile_no || '-'}</span>
                                                            </div>
                                                            {row.mobile_no && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const searchMobile = row.mobile_no?.replace(/^\+91/, '');
                                                                        window.dispatchEvent(new CustomEvent('trigger-kyc-search', {
                                                                            detail: { clientCode: searchMobile }
                                                                        }));
                                                                    }}
                                                                    className="p-1 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-md text-purple-700 hover:text-purple-600 transition-all group/kyc shrink-0"
                                                                    title="Search in KYC Tracker"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'source') {
                                                return (
                                                    <td key={colId} className="py-4 px-4 text-slate-500 dark:text-slate-400 truncate" style={{ width: columnWidths.source, minWidth: columnWidths.source, maxWidth: columnWidths.source }}>
                                                        {formatValue(row.source)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'status') {
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.status, minWidth: columnWidths.status, maxWidth: columnWidths.status }}>
                                                        {renderStatusBadge(row.status)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'assigned_to') {
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.assigned_to, minWidth: columnWidths.assigned_to, maxWidth: columnWidths.assigned_to }}>
                                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs truncate">
                                                            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] shrink-0">
                                                                <User className="w-3 h-3" />
                                                            </div>
                                                            <span className="truncate">
                                                                {row.custom_allocated_person_name || row.custom_allocated_code ? (
                                                                    `${row.custom_allocated_person_name || ''} ${row.custom_allocated_code ? `(${row.custom_allocated_code})` : ''}`.trim()
                                                                ) : '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === '_comments') {
                                                return (
                                                    <td key={colId} className="py-4 px-4 text-slate-600 dark:text-slate-400 truncate" style={{ width: columnWidths._comments, minWidth: columnWidths._comments, maxWidth: columnWidths._comments }} title={formatComment(row._comments)}>
                                                        {formatComment(row._comments)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'city') {
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.city, minWidth: columnWidths.city, maxWidth: columnWidths.city }}>
                                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
                                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="text-xs truncate">{formatValue(row.custom_city)}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'campaign') {
                                                return (
                                                    <td key={colId} className="py-4 px-4 text-slate-600 dark:text-slate-400 truncate" style={{ width: columnWidths.campaign, minWidth: columnWidths.campaign, maxWidth: columnWidths.campaign }}>
                                                        <span className="text-xs truncate">{formatValue(row.custom_campaign_name)}</span>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'last_campaign') {
                                                return (
                                                    <td key={colId} className="py-4 px-4 text-slate-600 dark:text-slate-400 truncate" style={{ width: columnWidths.last_campaign, minWidth: columnWidths.last_campaign, maxWidth: columnWidths.last_campaign }}>
                                                        <span className="text-xs truncate">{formatValue(row.custom_last_campaign)}</span>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'client_code') {
                                                return (
                                                    <td key={colId} className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 truncate" style={{ width: columnWidths.client_code, minWidth: columnWidths.client_code, maxWidth: columnWidths.client_code }}>
                                                        <span className="truncate">{formatValue(row.custom_client_code)}</span>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'branch') {
                                                return (
                                                    <td key={colId} className="py-4 px-4 text-slate-600 dark:text-slate-400 truncate" style={{ width: columnWidths.branch, minWidth: columnWidths.branch, maxWidth: columnWidths.branch }}>
                                                        <span className="text-xs truncate">{formatValue(row.custom_branch)}</span>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'parent') {
                                                const parentVal = row.custom_parent ? (userCodeMap.get(row.custom_parent) || row.custom_parent) : '-';
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.parent, minWidth: columnWidths.parent, maxWidth: columnWidths.parent }}>
                                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs truncate">
                                                            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] shrink-0">
                                                                <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                                            </div>
                                                            <span className="truncate">{parentVal}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'creation') {
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.creation, minWidth: columnWidths.creation, maxWidth: columnWidths.creation }}>
                                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                                                            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="text-[12px] font-medium truncate">{formatDateTimeWithAmPm(row.creation)}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'modified') {
                                                return (
                                                    <td key={colId} className="py-4 px-4" style={{ width: columnWidths.modified, minWidth: columnWidths.modified, maxWidth: columnWidths.modified }}>
                                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                                                            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="text-[12px] font-medium truncate">{formatDateTimeWithAmPm(row.modified)}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return null;
                                        })}
                                        {/* Spacer Column */}
                                        <td className="p-0 m-0 border-none w-auto" style={{ minWidth: 0 }} />
                                        <td className="py-4 px-4 text-right sticky right-0 bg-white dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800/50 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800" onClick={(e) => e.stopPropagation()} style={{ width: 80, minWidth: 80, maxWidth: 80 }}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl p-1.5">
                                                    <DropdownMenuLabel className="text-sm font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5">Change Status</DropdownMenuLabel>
                                                    {['Followup', 'Not Interested', 'Call Back', 'Switch off', 'RNR']
                                                        .filter(s => s !== row.status)
                                                        .map((status) => (
                                                            <DropdownMenuItem
                                                                key={status}
                                                                onClick={async () => {
                                                                    if (status === 'Not Interested') {
                                                                        setSelectedLeadForNotInterested(row);
                                                                        setLostNotesText('');
                                                                        setIsNotInterestedModalOpen(true);
                                                                    } else {
                                                                        try {
                                                                            await updateDoc('CRM Lead', row.name, { status });
                                                                            toast.success(`Status updated to ${status}`);
                                                                            refetchLeads();
                                                                        } catch (err) {
                                                                            toast.error('Failed to update status');
                                                                        }
                                                                    }
                                                                }}
                                                                className="text-sm py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                                            >
                                                                {status}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1.5" />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setActiveLeadForComment(row);
                                                            setCommentText('');
                                                            setIsCommentModalOpen(true);
                                                        }}
                                                        className="text-sm py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        Add Comment
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            ) : !isLoading && (
                                <tr>
                                    <td colSpan={visibleColumnCount + 3} className="h-48 text-center text-slate-400 dark:text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm font-medium">No results found matching your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableWrapper>

                {/* Status Info Footer */}
                <div className="shrink-0 py-2 px-4 border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-slate-200 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-200 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-200 font-bold">{totalCount}</span> leads
                    </p>
                </div>
            </Card>

            {/* Comment Modal */}
            <Dialog open={isCommentModalOpen} onOpenChange={setIsCommentModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                            Add Comment
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                            Add a new comment for {activeLeadForComment?.first_name || activeLeadForComment?.lead_name || 'this lead'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <textarea
                            className="w-full h-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100 transition-all resize-none"
                            placeholder="Write your comment here..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="flex sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsCommentModalOpen(false)}
                            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddComment}
                            disabled={isSubmittingComment || !commentText.trim()}
                            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-4"
                        >
                            {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Not Interested Details Modal */}
            <Dialog open={isNotInterestedModalOpen} onOpenChange={setIsNotInterestedModalOpen}>
                <DialogContent className="sm:max-w-[440px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            Mark as Not Interested
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Please provide detailed notes for marking <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLeadForNotInterested?.first_name || selectedLeadForNotInterested?.lead_name || selectedLeadForNotInterested?.name}</span> as Not Interested.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Lost Notes / Description <span className="text-red-500">*</span>
                            </label>
                            <Textarea
                                value={lostNotesText}
                                onChange={(e) => setLostNotesText(e.target.value)}
                                placeholder="Provide detailed description for why the lead is not interested..."
                                rows={4}
                                className="resize-none text-sm bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsNotInterestedModalOpen(false)}
                            disabled={isSubmittingNotInterested}
                            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmNotInterested}
                            disabled={isSubmittingNotInterested || !lostNotesText.trim()}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 gap-2"
                        >
                            {isSubmittingNotInterested && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmittingNotInterested ? 'Saving...' : 'Save & Update'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Floating Draggable Dialer Widget (Bottom-Left Call Monitor) */}
            {isCallModalOpen && (
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        position: 'fixed',
                        bottom: `${widgetPosition.y}px`,
                        left: `${widgetPosition.x}px`,
                        zIndex: 9999,
                    }}
                    className="transition-shadow duration-300"
                >
                    {isMinimized ? (
                        /* Minimized Pill View */
                        <div className="bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-full py-2 px-3 shadow-2xl flex items-center justify-between border border-slate-850 dark:border-slate-200 w-56 drag-handle cursor-grab active:cursor-grabbing select-none">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Phone className="w-3.5 h-3.5 animate-pulse text-emerald-450 dark:text-emerald-600 shrink-0" />
                                <span className="font-mono text-[11px] font-bold text-slate-100 dark:text-slate-800 shrink-0">
                                    {formatDuration(callDuration)}
                                </span>
                                <span className="text-[10px] font-semibold truncate opacity-90 text-slate-200 dark:text-slate-700">
                                    {activeCallLead?.first_name || activeCallLead?.lead_name}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                <button
                                    onClick={() => setIsMinimized(false)}
                                    className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-full transition-colors text-slate-300 dark:text-slate-600 outline-none"
                                    title="Expand Dialer"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        setCallStatus('ended');
                                        setIsCallModalOpen(false);
                                    }}
                                    className="p-1 hover:bg-red-500 rounded-full transition-colors text-red-400 dark:text-red-500 hover:text-white dark:hover:text-white outline-none"
                                    title="Dismiss popup"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Normal Expanded View Widget - Simple Call Status only */
                        <div className="w-72 bg-slate-950 dark:bg-white border border-slate-800 dark:border-slate-200 text-slate-100 dark:text-slate-900 rounded-2xl shadow-2xl flex flex-col gap-3 p-4 select-none">
                            {/* Drag Header */}
                            <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between pb-2 border-b border-slate-800 dark:border-slate-150">
                                <span className="text-[10px] font-bold text-purple-400 dark:text-purple-600 uppercase tracking-wider">
                                    📞 Active Call
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMinimized(true);
                                        }}
                                        className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-md text-slate-400 hover:text-white dark:hover:text-slate-800 transition-colors outline-none"
                                        title="Minimize"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13H5" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCallStatus('ended');
                                            setIsCallModalOpen(false);
                                        }}
                                        className="p-1 hover:bg-red-950/40 dark:hover:bg-red-55 rounded-md text-slate-400 hover:text-red-400 dark:hover:text-red-650 transition-colors outline-none"
                                        title="Dismiss popup"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Lead & Call Status Details */}
                            <div className="flex flex-col items-center bg-slate-900 dark:bg-slate-50 rounded-xl p-3 border border-slate-850 dark:border-slate-150">
                                <h4 className="text-sm font-bold text-slate-100 dark:text-slate-850 tracking-wide text-center">
                                    {activeCallLead?.first_name || activeCallLead?.lead_name || 'Unknown'}
                                </h4>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                    {activeCallLead?.mobile_no}
                                </span>
                                <div className="flex items-center gap-2 mt-2">
                                    {callStatus === 'ended' ? (
                                        <>
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                callOutcome === 'completed' ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                                            )}></span>
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wide",
                                                callOutcome === 'completed' ? "text-emerald-455 dark:text-emerald-600" : "text-red-450 dark:text-red-600"
                                            )}>
                                                {callOutcome ? callOutcome.replace('-', ' ') : 'Ended'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[10px] font-bold text-emerald-450 dark:text-emerald-600 uppercase tracking-wide">
                                                In progress (Mobile)
                                            </span>
                                        </>
                                    )}
                                    <span className="text-slate-700 dark:text-slate-300 text-[10px]">|</span>
                                    <span className="text-[11px] font-mono font-bold text-slate-300 dark:text-slate-700">
                                        {formatDuration(callDuration)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions layout (Notes, Tags, Assign) */}
                            <div className="flex gap-2 w-full mt-1">
                                <button
                                    onClick={() => {
                                        setIsCallModalOpen(false);
                                        setActiveLeadForComment(activeCallLead);
                                        setCommentText('');
                                        setIsCommentModalOpen(true);
                                    }}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-100 border border-slate-800 dark:border-slate-200 text-slate-300 dark:text-slate-700 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all outline-none"
                                >
                                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                                    Notes
                                </button>
                                <button
                                    onClick={() => toast.info('Manage Tags')}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-100 border border-slate-800 dark:border-slate-200 text-slate-300 dark:text-slate-700 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all outline-none"
                                >
                                    <Tag className="w-3.5 h-3.5 text-emerald-500" />
                                    Tags
                                </button>
                                <button
                                    onClick={() => {
                                        if (activeCallLead) {
                                            setIsCallModalOpen(false);
                                            setSelectedRows(new Set([activeCallLead.name]));
                                            toast.info('Please select "Assign To" in the bulk options row');
                                        }
                                    }}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-100 border border-slate-800 dark:border-slate-200 text-slate-300 dark:text-slate-700 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all outline-none"
                                >
                                    <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                                    Assign
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Docker in Bottom-Right */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                }}
                className="flex flex-col items-end gap-3"
            >
                {/* Dialpad Widget */}
                {isDialerOpen && (
                    <div className="w-72 bg-[#1c1c1e] dark:bg-[#f4f5f8] border border-neutral-800 dark:border-slate-200 text-white dark:text-slate-900 rounded-[32px] shadow-2xl p-5 flex flex-col gap-3 select-none mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-1">
                            <button
                                onClick={() => setIsDialerOpen(false)}
                                className="p-1.5 hover:bg-neutral-800 dark:hover:bg-slate-200 rounded-full text-neutral-400 hover:text-white dark:hover:text-slate-800 transition-colors outline-none"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-bold text-neutral-450 dark:text-slate-500 uppercase tracking-wider">
                                Dial Pad
                            </span>
                            <div className="w-6" /> {/* Spacer */}
                        </div>

                        {/* Number Input */}
                        <div className="flex flex-col items-center py-2">
                            <input
                                type="text"
                                placeholder="Enter number..."
                                value={dialNumber}
                                onChange={(e) => setDialNumber(e.target.value)}
                                className="w-full bg-transparent text-xl font-extrabold tracking-widest text-center text-white dark:text-slate-800 placeholder-neutral-600 dark:placeholder-slate-400 focus:outline-none font-mono"
                            />
                        </div>

                        {/* Keypad Grid */}
                        <div className="grid grid-cols-3 gap-3 py-1">
                            {[
                                { digit: '1', sub: 'o_o' },
                                { digit: '2', sub: 'ABC' },
                                { digit: '3', sub: 'DEF' },
                                { digit: '4', sub: 'GHI' },
                                { digit: '5', sub: 'JKL' },
                                { digit: '6', sub: 'MNO' },
                                { digit: '7', sub: 'PQRS' },
                                { digit: '8', sub: 'TUV' },
                                { digit: '9', sub: 'WXYZ' },
                                { digit: '*', sub: '' },
                                { digit: '0', sub: '+' },
                                { digit: '#', sub: '' }
                            ].map((item) => (
                                <button
                                    key={item.digit}
                                    onClick={() => setDialNumber(prev => prev + item.digit)}
                                    className="bg-[#2c2c2e] dark:bg-white hover:bg-neutral-700 dark:hover:bg-slate-50 text-white dark:text-slate-800 border border-neutral-800 dark:border-slate-150 rounded-2xl py-2.5 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <span className="text-base font-extrabold">{item.digit}</span>
                                    <span className="text-[7px] font-bold text-neutral-450 dark:text-slate-500 tracking-wider">
                                        {item.sub || '\u00A0'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Action buttons (Call and Backspace) */}
                        <div className="grid grid-cols-3 items-center gap-3 mt-1">
                            <div /> {/* Left Spacer */}
                            <button
                                onClick={() => handleMakeCall(dialNumber)}
                                disabled={!dialNumber}
                                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl py-2.5 flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all outline-none cursor-pointer"
                                title="Initiate Call"
                            >
                                <Phone className="w-4 h-4 fill-white" />
                            </button>
                            <button
                                onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                                disabled={!dialNumber}
                                className="hover:bg-neutral-800 dark:hover:bg-slate-200 disabled:opacity-30 text-neutral-400 dark:text-slate-500 rounded-2xl py-2.5 flex items-center justify-center active:scale-95 transition-all outline-none cursor-pointer"
                                title="Delete"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6-6h12v12H9l-6-6z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                               {/* Sub-docked Items in Arc (180 deg to 90 deg) */}
                {isDockerOpen && (
                    <>
                        {/* 1. Dialer Sub-item (180 deg - directly left) */}
                        <button
                            onClick={() => {
                                setIsDialerOpen(!isDialerOpen);
                                setIsDockerOpen(false);
                            }}
                            style={{
                                position: 'fixed',
                                bottom: '28px',
                                right: '148px',
                                zIndex: 9999,
                            }}
                            className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all outline-none cursor-pointer animate-in fade-in zoom-in-50 duration-200"
                            title="Phone Dialer"
                        >
                            <Phone className="w-4 h-4" />
                        </button>

                        {/* 2. Create Lead Sub-item (135 deg - diagonal) */}
                        <button
                            onClick={() => {
                                toast.info('Create Lead clicked (dummy action)');
                                setIsDockerOpen(false);
                            }}
                            style={{
                                position: 'fixed',
                                bottom: '113px',
                                right: '113px',
                                zIndex: 9999,
                            }}
                            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all outline-none cursor-pointer animate-in fade-in zoom-in-50 duration-200 delay-[50ms]"
                            title="Create Lead"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>

                        {/* 3. Dummy Action 1 (90 deg - directly top) */}
                        <button
                            onClick={() => {
                                toast.info('Support Channel clicked (dummy action)');
                                setIsDockerOpen(false);
                            }}
                            style={{
                                position: 'fixed',
                                bottom: '148px',
                                right: '28px',
                                zIndex: 9999,
                            }}
                            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all outline-none cursor-pointer animate-in fade-in zoom-in-50 duration-200 delay-[100ms]"
                            title="Support Channel"
                        >
                            <Headphones className="w-4 h-4" />
                        </button>
                    </>
                )}

                {/* Main Docker Toggle Button */}
                <button
                    onClick={() => setIsDockerOpen(!isDockerOpen)}
                    className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-2xl flex items-center justify-center p-0 transition-all active:scale-90 duration-300 cursor-pointer outline-none"
                    title="Menu Actions"
                >
                    <Plus className={cn("w-7 h-7 transition-transform duration-300", isDockerOpen && "rotate-45")} />
                </button>
            </div>
        </div>
    );
};

export default Leads;
