import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Bell, Sparkles, BookOpen, Video, PlayCircle, Megaphone, Check, Link, Loader2, RefreshCw, ChevronRight, User, Phone, MapPin, Clock, ExternalLink, Download } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
import { useAnnouncement, TradingClass } from '@/contexts/AnnouncementContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Interfaces
interface ManagementAnnouncement {
    id: string;
    title: string;
    content: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
    author: string;
}

interface UpcomingContent {
    id: string;
    title: string;
    type: 'Video' | 'Article' | 'Webinar';
    releaseDate: string;
    image: string;
    category: string;
}

interface Registration {
    mobile: string;
    name: string;
    clientCode: string; // "SKY40001|NAVI|ACTIVE"
    clientCity: string;
    referCode: string;
    referMode: string;
    smsSent: boolean;
    whatsappSent: boolean;
    reminderSent: boolean;
    classRegisterDate: string;
    attendedTime: string | null;
}

// Mock Data for Announcements and Content (Classes are fetched from context)
const announcements: ManagementAnnouncement[] = [
    {
        id: '1',
        title: 'Q4 Performance Review & Strategy',
        content: 'We are delighted to announce that our Q4 performance has exceeded expectations. Join us for a detailed strategy meeting next week.',
        date: '2025-12-25',
        priority: 'high',
        author: 'Executive Management'
    },
    {
        id: '2',
        title: 'New Trading Tools Integration',
        content: 'We are rolling out a new set of advanced analytical tools for all senior traders starting next month.',
        date: '2025-12-24',
        priority: 'medium',
        author: 'Tech Team'
    }
];

const upcomingContents: UpcomingContent[] = [
    {
        id: '1',
        title: 'Market Outlook 2026',
        type: 'Webinar',
        releaseDate: 'Jan 10, 2026',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
        category: 'Market Analysis'
    },
    {
        id: '2',
        title: 'Psychology of Trading',
        type: 'Video',
        releaseDate: 'Jan 15, 2026',
        image: 'https://images.unsplash.com/photo-1579226905180-636b77d963b9?q=80&w=800&auto=format&fit=crop',
        category: 'Education'
    },
    {
        id: '3',
        title: 'Global Economic Trends',
        type: 'Article',
        releaseDate: 'Jan 20, 2026',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop',
        category: 'Economics'
    }
];

const AnnouncementPage = () => {
    const { user } = useAuth();
    const { classes, isLoadingClasses, refreshClasses } = useAnnouncement();
    const [activeTab, setActiveTab] = useState<'classes' | 'announcements' | 'content'>('classes');
    const [copiedClassId, setCopiedClassId] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<TradingClass | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);

    const tabs = [
        { id: 'classes', label: 'Classes', icon: BookOpen },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'content', label: 'Upcoming Content', icon: Sparkles }
    ];

    const isClassCompleted = (dateStr: string, timeStr: string) => {
        try {
            // dateStr: "YYYY-MM-DD"
            // timeStr: "HH:mm AM" or "HH:mm" or "HH:mm:ss"

            const [year, month, day] = dateStr.split('-').map(Number);

            const [time, modRaw] = timeStr.trim().split(' ');
            const modifier = modRaw?.toUpperCase();
            const [hoursRaw, minutes] = time.split(':').map(Number);
            let hours = hoursRaw;

            if (modifier) {
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
            }

            const classDate = new Date(year, month - 1, day, hours, minutes);
            const now = new Date();

            return now > classDate;
        } catch (error) {
            console.error("Date parsing error", error);
            return false;
        }
    };

    const fetchClassRegistrations = async (item: TradingClass) => {
        if (!user) return;

        setIsLoadingRegistrations(true);
        setSelectedClass(item);
        setRegistrations([]);

        try {
            const dateParts = item.date.split('-'); // ["2025", "12", "28"]
            const timeString = item.time.split(' ')[0].split(':').slice(0, 2).join('');
            const classCode = `${dateParts[0]}${dateParts[1]}${dateParts[2]}-${timeString}`;

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/crm.api.seminar.get_class_registrations`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({
                    classCode: classCode,
                    referCode: user.user_code
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const data = await response.json();
            const message = data.message;

            if (message && message.status === 1) {
                setRegistrations(message.registrations || []);
            } else {
                toast({
                    title: "Fetch Failed",
                    description: message?.reason || data.reason || "Unable to load registrations",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error fetching registrations:", error);
            toast({
                title: "Error",
                description: "Failed to load class registrations. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoadingRegistrations(false);
        }
    };

    const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);

    const handleCreateLink = async (e: React.MouseEvent, item: TradingClass) => {
        e.stopPropagation(); // Prevent card click
        if (!user) return;

        setGeneratingLinkId(item.id);

        try {
            const dateParts = item.date.split('-'); // ["2025", "12", "28"]
            const timeString = item.time.split(' ')[0].split(':').slice(0, 2).join('');
            const dateTimeId = `${dateParts[0]}${dateParts[1]}${dateParts[2]}-${timeString}`;

            // Calculate validity: days from today to class date
            const classDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = classDate.getTime() - today.getTime();
            const validity = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            const longLink = `https://gopocket.in/learn/${dateTimeId}/?refer=${user.user_code}`;

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/crm.api.referral._handle_short_link`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({
                    data: {
                        link: longLink,
                        validity: validity
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch short link: ${response.status}`);
            }

            const resData = await response.json();
            const message = resData.message;

            if (message && message.status === "success" && message.data?.shortLink) {
                const finalLink = `${message.data.shortLink}?mode=`;
                navigator.clipboard.writeText(finalLink);
                setCopiedClassId(item.id);
                setTimeout(() => setCopiedClassId(null), 2000);

                toast({
                    title: "Short Link Copied!",
                    description: "Link with blank mode parameter copied to clipboard.",
                    className: "bg-green-50 border-green-200 text-green-900"
                });
            } else {
                throw new Error(message?.data?.reason || "Failed to generate short link");
            }
        } catch (error) {
            console.error("Error generating link:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to generate link.",
                variant: "destructive"
            });
        } finally {
            setGeneratingLinkId(null);
        }
    };

    const handleDownloadImage = async (e: React.MouseEvent, imageUrl: string, title: string) => {
        e.stopPropagation();
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title.replace(/\s+/g, '_')}_banner.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast({
                title: "Download Started",
                description: "The class image is being downloaded.",
                className: "bg-blue-50 border-blue-200 text-blue-900"
            });
        } catch (error) {
            console.error("Error downloading image, opening in new tab:", error);
            // Fallback: Open in new tab if CORS prevents blob download
            window.open(imageUrl, '_blank');
            toast({
                title: "Opening Image",
                description: "Direct download failed (CORS). Opening image in a new tab instead.",
                className: "bg-amber-50 border-amber-200 text-amber-900"
            });
        }
    };

    const renderAnnouncements = () => (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center space-x-2 mb-4">
                <div className="bg-rose-100 p-2 rounded-lg">
                    <Bell className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Management Announcements</h2>
                    <p className="text-sm text-slate-500">Important updates from the leadership team</p>
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                {announcements.map((announcement) => (
                    <Card key={announcement.id} className="border-l-4 border-l-rose-500 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <Badge variant="outline" className="mb-2 border-slate-200">
                                        {announcement.date}
                                    </Badge>
                                    <CardTitle className="text-lg font-bold text-slate-800">{announcement.title}</CardTitle>
                                </div>
                                {announcement.priority === 'high' && (
                                    <Badge variant="destructive" className="uppercase text-[10px] shadow-sm">High Priority</Badge>
                                )}
                                {announcement.priority === 'medium' && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 uppercase text-[10px]">Important</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {announcement.content}
                                </p>
                            </div>
                            <div className="flex items-center text-xs text-slate-500 border-t pt-3">
                                <span className="font-semibold text-slate-700 mr-1">Posted by:</span> {announcement.author}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderClasses = () => {
        if (isLoadingClasses && classes.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Loading active classes...</p>
                </div>
            );
        }

        if (classes.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <BookOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-1">No Active Classes</h3>
                    <p className="text-slate-500 max-w-sm">There are no trading classes scheduled at the moment. Please check back later.</p>
                </div>
            );
        }

        const getClassDateTime = (dateStr: string, timeStr: string) => {
            try {
                const [year, month, day] = dateStr.split('-').map(Number);
                const [time, modRaw] = timeStr.trim().split(' ');
                const modifier = modRaw?.toUpperCase();
                const [hoursRaw, minutes] = time.split(':').map(Number);
                let hours = hoursRaw;
                if (modifier) {
                    if (modifier === 'PM' && hours < 12) hours += 12;
                    if (modifier === 'AM' && hours === 12) hours = 0;
                }
                return new Date(year, month - 1, day, hours, minutes).getTime();
            } catch {
                return 0;
            }
        };

        const upcomingClasses = classes
            .filter(item => !isClassCompleted(item.date, item.time))
            .sort((a, b) => getClassDateTime(a.date, a.time) - getClassDateTime(b.date, b.time));

        const completedClasses = classes
            .filter(item => isClassCompleted(item.date, item.time))
            .sort((a, b) => getClassDateTime(b.date, b.time) - getClassDateTime(a.date, a.time));

        const renderClassCard = (item: TradingClass) => {
            const isCompleted = isClassCompleted(item.date, item.time);
            const isCopied = copiedClassId === item.id;

            return (
                <Card
                    key={item.id}
                    onClick={() => fetchClassRegistrations(item)}
                    className="group cursor-pointer overflow-hidden border-slate-200 hover:border-blue-400 transition-all duration-300 hover:shadow-xl flex flex-col sm:flex-row h-full rounded-2xl"
                >
                    {/* Image Side - Left - Taller with 4:5 ratio */}
                    <div className="relative w-full sm:w-56 shrink-0 h-48 sm:h-auto overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10" />
                        <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    </div>

                    {/* Content Side - Right */}
                    <div className="flex flex-col flex-1 p-5">
                        <div className="flex-1 space-y-3">
                            {/* Title */}
                            <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                {item.title}
                            </h3>

                            {/* Type & Language */}
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="secondary" className={`
                                    uppercase text-[10px] tracking-wide font-bold
                                    ${item.type === 'Online' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                                `}>
                                    {item.type}
                                </Badge>
                                <Badge variant="secondary" className={`
                                    uppercase text-[10px] tracking-wide font-bold
                                    ${item.cost === 'Free' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                                `}>
                                    {item.cost}
                                </Badge>
                                <span className="text-slate-500 font-medium">|</span>
                                <span className="text-slate-600 font-medium">{item.language}</span>
                            </div>

                            {/* Date & Time */}
                            <div className="flex items-center text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                <span className="text-sm">{item.date} • {item.time.slice(0, 5)}</span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                                {item.description}
                            </p>
                            {/* Action Buttons */}
                            <div className="pt-4 mt-auto flex items-center gap-2">
                                <Button
                                    onClick={(e) => !isCompleted && !(generatingLinkId === item.id) && handleCreateLink(e, item)}
                                    disabled={isCompleted || generatingLinkId === item.id}
                                    className={`w-36 font-medium group transition-all duration-300 shadow-md hover:shadow-lg h-10
                                    ${isCompleted
                                            ? 'bg-slate-100 text-black cursor-not-allowed hover:bg-slate-100 shadow-none border border-slate-400'
                                            : isCopied
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-purple-600 hover:bg-purple-800 text-white'
                                        }
                                `}
                                >
                                    {generatingLinkId === item.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : isCompleted ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2 group-hover:rotate-45 transition-transform" />
                                            Completed
                                        </>
                                    ) : isCopied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Link Copied
                                        </>
                                    ) : (
                                        <>
                                            <Link className="w-4 h-4 mr-2 group-hover:rotate-45 transition-transform" />
                                            Create Link
                                        </>
                                    )}
                                </Button>

                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={(e) => handleDownloadImage(e, item.image, item.title)}
                                    className="h-10 w-10 border-slate-200 hover:bg-slate-100 text-slate-600 shrink-0 shadow-sm"
                                    title="Download Image"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            );
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in duration-500 pb-10">
                {/* Completed Classes Section - LEFT */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-xl">
                            <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Completed Classes</h2>
                            <p className="text-sm text-slate-500">Recent sessions that have concluded</p>
                        </div>
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
                            {completedClasses.length}
                        </Badge>
                    </div>
                    {completedClasses.length > 0 ? (
                        <div className="grid gap-6 grid-cols-1">
                            {completedClasses.map(renderClassCard)}
                        </div>
                    ) : (
                        <div className="bg-slate-50/50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                            <p className="text-slate-400 text-sm">No completed classes yet</p>
                        </div>
                    )}
                </div>

                {/* Upcoming Classes Section - RIGHT */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Upcoming Classes</h2>
                            <p className="text-sm text-slate-500">Scheduled trading sessions and webinars</p>
                        </div>
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-200">
                            {upcomingClasses.length}
                        </Badge>
                    </div>
                    {upcomingClasses.length > 0 ? (
                        <div className="grid gap-6 grid-cols-1">
                            {upcomingClasses.map(renderClassCard)}
                        </div>
                    ) : (
                        <div className="bg-slate-50/50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                            <p className="text-slate-400 text-sm">No upcoming classes scheduled</p>
                        </div>
                    )}
                </div>

                {upcomingClasses.length === 0 && completedClasses.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <BookOpen className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-1">No Classes Found</h3>
                        <p className="text-slate-500 max-w-sm">There are no trading classes available at the moment.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderRegistrations = () => {
        if (!selectedClass) return null;

        const dateParts = selectedClass.date.split('-');
        const timeString = selectedClass.time.split(' ')[0].split(':').slice(0, 2).join('');
        const classCode = `${dateParts[0]}${dateParts[1]}${dateParts[2]}-${timeString}`;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center space-x-2 text-sm text-slate-500">
                        <button
                            onClick={() => {
                                setSelectedClass(null);
                                setActiveTab('classes');
                            }}
                            className="hover:text-blue-600 transition-colors"
                        >
                            Announcement
                        </button>
                        <ChevronRight className="w-4 h-4" />
                        <button
                            onClick={() => setSelectedClass(null)}
                            className="hover:text-blue-600 transition-colors"
                        >
                            Classes
                        </button>
                        <ChevronRight className="w-4 h-4" />
                        <span className="font-semibold text-slate-900">{classCode}</span>
                        <ChevronRight className="w-4 h-4" />
                        <span className="font-semibold text-slate-900">
                            {selectedClass.title}
                        </span>
                    </nav>

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchClassRegistrations(selectedClass)}
                        disabled={isLoadingRegistrations}
                    >
                        <RefreshCw
                            className={`w-4 h-4 mr-2 ${isLoadingRegistrations ? 'animate-spin' : ''
                                }`}
                        />
                        Refresh List
                    </Button>
                </div>

                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Code</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Refer Code</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Refer Mode</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SMS</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reminder</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Register Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Attended</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingRegistrations && registrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                                <p className="text-slate-500 font-medium">Fetching registrations...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : registrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <User className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-slate-500 font-medium">No registrations found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    registrations.map((reg, idx) => {
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-900 capitalize">{reg.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                                    {reg.clientCode}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {reg.mobile}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 italic">
                                                    {reg.clientCity}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                                    {reg.referCode}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {reg.referMode}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={reg.smsSent ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                                                        {reg.smsSent ? "Success" : "Failed"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={reg.whatsappSent ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                                                        {reg.whatsappSent ? "Success" : "Failed"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={reg.reminderSent ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                                                        {reg.reminderSent ? "Success" : "Failed"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {reg.classRegisterDate}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <Badge className={reg.attendedTime ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                                                        {reg.attendedTime ? "Attended" : "Not Attended"}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderContent = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center space-x-2 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Featured Upcoming Content</h2>
                    <p className="text-sm text-slate-500">Exclusive material coming soon to the platform</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {upcomingContents.map((content) => (
                    <div key={content.id} className="relative group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 aspect-video cursor-pointer">
                        <img
                            src={content.image}
                            alt={content.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

                        <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center space-x-2 mb-3">
                                <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0 text-xs shadow-sm">
                                    {content.category}
                                </Badge>
                                <span className="text-slate-300 text-xs font-medium bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">• {content.releaseDate}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-purple-300 transition-colors">
                                {content.title}
                            </h3>
                            <div className="flex items-center text-xs text-slate-200 mt-2 font-medium">
                                {content.type === 'Video' && <PlayCircle className="w-4 h-4 mr-2 text-red-500" />}
                                {content.type === 'Webinar' && <Video className="w-4 h-4 mr-2 text-blue-400" />}
                                {content.type === 'Article' && <BookOpen className="w-4 h-4 mr-2 text-emerald-400" />}
                                <span className="uppercase tracking-wide opacity-90">Coming Soon</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden bg-stone-200/50 pt-1">
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
                {/* Tabs & Actions Navigation */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 flex items-center justify-between">
                    <div className="flex overflow-x-auto no-scrollbar flex-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setSelectedClass(null);
                                        setActiveTab(tab.id as any);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all whitespace-nowrap relative min-w-[160px] justify-center",
                                        isActive
                                            ? 'text-purple-600 bg-purple-50/50'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    )}
                                >
                                    <Icon size={18} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                                    {tab.label}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 shadow-[0_-2px_6px_rgba(37,99,235,0.3)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Refresh Button */}
                    <div className="px-4 border-l border-slate-200">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refreshClasses()}
                            disabled={isLoadingClasses}
                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full w-9 h-9 p-0"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoadingClasses && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Tab Content Area */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                    <ScrollArea className="flex-1 w-full">
                        <div className="p-6">
                            {selectedClass ? (
                                renderRegistrations()
                            ) : (
                                <>
                                    {activeTab === 'announcements' && renderAnnouncements()}
                                    {activeTab === 'classes' && renderClasses()}
                                    {activeTab === 'content' && renderContent()}
                                </>
                            )}
                        </div>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementPage;
