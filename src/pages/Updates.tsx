import React, { useState, useMemo } from 'react';
import {
    Search,
    ChevronRight,
    Book,
    Layout,
    History,
    FileCheck,
    PlayCircle,
    Menu,
    X,
    ExternalLink,
    ChevronDown,
    Sparkles
} from 'lucide-react';
import { docsData, DocItem } from '@/constants/docsData';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const MediaRenderer: React.FC<{ media: any; title: string }> = ({ media, title }) => (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-100 dark:shadow-none border border-slate-200 dark:border-slate-800 mt-8 mb-8">
        {media.type === 'video' ? (
            <video
                key={media.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-[410px] object-cover"
            >
                <source src={media.url} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        ) : (
            <div className="relative group">
                <img
                    src={media.url}
                    alt={title}
                    className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <p className="text-white font-medium text-sm flex items-center">
                        <PlayCircle className="h-5 w-5 mr-2" />
                        {media.caption || 'View full content'}
                    </p>
                </div>
            </div>
        )}
        {media.caption && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">{media.caption}</p>
            </div>
        )}
    </div>
);

const Updates: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState(docsData[0].id);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const categories = [
        { id: 'updates', title: "What's New", icon: Sparkles },
        { id: 'policies', title: 'Policies', icon: FileCheck },
        { id: 'guidelines', title: 'Guidelines', icon: Book },
        { id: 'features', title: 'Feature Guide', icon: Layout },
    ];

    const filteredDocs = useMemo(() => {
        return docsData.filter(doc =>
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [searchQuery]);

    const activeDoc = useMemo(() => {
        return docsData.find(doc => doc.id === selectedId) || docsData[0];
    }, [selectedId]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50/30 dark:bg-slate-950/30 overflow-hidden">
            {/* Sidebar Navigation */}
            <aside
                className={`flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden opacity-0'
                    }`}
            >
                {/* Search Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <Input
                            placeholder="Explore guides..."
                            className="pl-9 bg-slate-100/50 dark:bg-slate-950/50 border-none h-9 text-sm focus-visible:ring-blue-500 text-slate-800 dark:text-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <nav className="p-4 space-y-6">
                        {categories.map(category => (
                            <div key={category.id} className="space-y-2">
                                <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 px-2 py-1">
                                    <category.icon className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{category.title}</span>
                                </div>
                                <div className="space-y-0.5">
                                    {filteredDocs
                                        .filter(doc => doc.category === category.id)
                                        .map(doc => {
                                            const Icon = doc.icon;
                                            const isActive = selectedId === doc.id;
                                            return (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => setSelectedId(doc.id)}
                                                    className={`w-full flex items-start text-left px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/30'
                                                        : 'text-slate-600 dark:text-slate-405 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                        }`}
                                                >
                                                    <Icon className={`h-4 w-4 mr-3 mt-0.5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                                                        }`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {doc.title}
                                                        </p>
                                                        {doc.version && (
                                                            <span className={`text-[10px] font-mono mt-0.5 block ${isActive ? 'text-blue-500 dark:text-blue-450' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                 {doc.version}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isActive && <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0 text-blue-400 dark:text-blue-550" />}
                                                </button>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        ))}
                    </nav>
                </ScrollArea>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <Button variant="outline" className="w-full justify-between text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 transition-all shadow-sm bg-white dark:bg-slate-900">
                        Go to Main CRM
                        <ExternalLink className="h-3.5 w-3.5 ml-2" />
                    </Button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col">
                <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center text-sm text-slate-550 dark:text-slate-400">
                            <span className="capitalize">{activeDoc.category}</span>
                            <ChevronRight className="h-4 w-4 mx-2 text-slate-300 dark:text-slate-600" />
                            <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[200px] md:max-w-[400px]">
                                {activeDoc.title}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <h2 className="text-[12px] font-bold tracking-wider text-slate-700 dark:text-slate-300">Documentation :</h2>
                        {activeDoc.date && (
                            <Badge variant="outline" className="text-slate-400 dark:text-slate-500 font-medium border-slate-200 dark:border-slate-800">
                                Last updated: {activeDoc.date}
                            </Badge>
                        )}
                    </div>
                </header>

                <ScrollArea className="flex-1 bg-white dark:bg-slate-900">
                    <div className="max-w-4xl mx-auto px-8 py-12 md:px-12 lg:px-16">
                        {/* Article Header */}
                        <div className="space-y-6 mb-12">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl ring-4 ring-blue-50/50 dark:ring-blue-900/10">
                                        <activeDoc.icon className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Badge className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 capitalize font-bold px-3 py-0.5 rounded-full ring-4 ring-blue-100 dark:ring-blue-950/20 text-white">
                                            {activeDoc.category}
                                        </Badge>
                                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                            {activeDoc.title}
                                        </h1>
                                    </div>
                                </div>
                                <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                                    {activeDoc.description}
                                </p>
                            </div>

                            {/* Article Content */}
                            <article className="prose prose-slate dark:prose-invert max-w-none 
                            prose-h2:text-2xl prose-h2:font-bold prose-h2:text-slate-800 dark:prose-h2:text-slate-200 prose-h2:mt-12 prose-h2:mb-4
                            prose-h3:text-xl prose-h3:font-bold prose-h3:text-slate-700 dark:prose-h3:text-slate-300 prose-h3:mt-8 prose-h3:mb-3
                            prose-p:text-slate-600 dark:prose-p:text-slate-405 prose-p:text-lg prose-p:leading-relaxed prose-p:mb-6
                            prose-li:text-slate-600 dark:prose-li:text-slate-405 prose-li:text-lg prose-li:mb-2
                            prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-bold
                            prose-ol:list-decimal prose-ol:pl-6
                            prose-ul:list-disc prose-ul:pl-6
                        ">
                                <div dangerouslySetInnerHTML={{ __html: activeDoc.content }} />

                                {activeDoc.media && <MediaRenderer media={activeDoc.media} title={activeDoc.title} />}

                                {activeDoc.sections?.map((section, index) => (
                                    <div key={index} className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800 first:border-t-0 first:mt-0 first:pt-0">
                                        {section.title && <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">{section.title}</h2>}
                                        <div dangerouslySetInnerHTML={{ __html: section.content }} />
                                        {section.media && <MediaRenderer media={section.media} title={section.title || activeDoc.title} />}
                                    </div>
                                ))}
                            </article>

                            {/* Article Footer */}
                            <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Share:</span>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400">
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400">
                                        <History className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Was this helpful?</p>
                                    <div className="flex space-x-2">
                                        <Button variant="outline" size="sm" className="rounded-full px-4 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Yes</Button>
                                        <Button variant="outline" size="sm" className="rounded-full px-4 border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-400 transition-colors bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">No</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
};

export default Updates;
