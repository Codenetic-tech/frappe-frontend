import React, { useState } from 'react';
import {
  Heart,
  Shield,
  ArrowLeftRight,
  Zap,
  Bike,
  Car,
  Truck,
  Bus,
  Plane,
  Activity,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Play,
  Calendar,
  Star,
  Phone,
  Mail,
  Check,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Dummy data
const BUY_INSURANCE_CATEGORIES = [
  { id: 'health', name: 'Health', icon: Shield, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'portability', name: 'Portability Health', icon: ArrowLeftRight, bg: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'topup', name: 'Top Up Health', icon: Zap, bg: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'bike', name: 'Bike', icon: Bike, bg: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'motor', name: 'Motor', icon: Car, bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { id: 'goods', name: 'Goods Carrying Vehicle', icon: Truck, bg: 'bg-teal-50 text-teal-600 border-teal-100' },
  { id: 'passenger', name: 'Passenger Carrying Vehicle', icon: Bus, bg: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  { id: 'life', name: 'Life', icon: Heart, bg: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'travel', name: 'Travel', icon: Plane, bg: 'bg-purple-50 text-purple-600 border-purple-100' },
];

const LATEST_ENQUIRIES = [
  {
    id: 'SIBHE1772169734',
    title: 'National Insurance > Group Personal Acc...',
    provider: 'Raheja QBE - Health QuBE (Super Saver)',
    date: 'Today | 10:24 AM',
    status: 'KYC DETAILS',
    statusColor: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  {
    id: 'SIBHE1746169734',
    title: 'Floater-Fresh-Health Insurance',
    provider: 'Raheja QBE - Health QuBE (Super Saver)',
    date: '23 Feb, 2026 | 15:11 PM',
    status: 'POLICY FEATURES',
    statusColor: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    id: 'SIBHE4562169734',
    title: 'Motor Insurance - Four Wheeler',
    provider: 'Raheja QBE - Health QuBE (Super Saver)',
    date: '07 Dec, 2025 | 17:09 PM',
    status: 'PAYMENT DETAILS',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
];

const MY_RENEWALS = [
  {
    id: 'SIBHE9988269734',
    title: 'Comprehensive Car Insurance - Swift',
    provider: 'HDFC ERGO General Insurance',
    date: 'Due in 5 Days | 28 Feb, 2026',
    status: 'RENEW NOW',
    statusColor: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  {
    id: 'SIBHE8877169734',
    title: 'Individual Health Protector',
    provider: 'Niva Bupa Health Insurance',
    date: 'Due in 12 Days | 07 Mar, 2026',
    status: 'PAYMENT DETAILS',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
];

const DEST_NUMBER = '917814783983';

const Insurance: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'enquiries' | 'renewals'>('enquiries');
  const { user, frappeUser } = useAuth();
  const displayName = frappeUser?.first_name || frappeUser?.full_name || user?.firstName || user?.user_code || 'User';

  return (
    <div className="min-h-screen bg-stone-200/50 dark:bg-transparent space-y-6 p-6">
      {/* Upper Navigation & Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Welcome {frappeUser?.username || displayName} <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">You Demand, We Serve.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 font-semibold gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
            onClick={() => window.open(`https://wa.me/${DEST_NUMBER}?text=Watch%20Tutorial`, '_blank')}
          >
            <Play className="h-4 w-4 fill-slate-700 text-slate-700 dark:fill-slate-250 dark:text-slate-250" />
            Watch Tutorial
          </Button>
          <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-sm font-semibold border border-slate-200/20 dark:border-slate-800">
            <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>26 Feb, 2026 - 28 Feb, 2026</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Buy Insurance Grid */}
        <div className="lg:col-span-4 flex">
          <Card className="w-full rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Buy Insurance Now</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-4">
                {BUY_INSURANCE_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate('/get-quote')}
                      className="group flex flex-col items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-305 dark:hover:border-purple-900/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 min-h-[105px]"
                    >
                      <div className={`p-2.5 rounded-xl border relative ${category.bg} dark:bg-slate-800 dark:border-slate-700 transition-transform duration-300 group-hover:scale-105`}>
                        <Icon className="h-5 w-5 shrink-0" />
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm border border-white dark:border-slate-900">
                          <Check className="h-2 w-2" />
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-250 text-center leading-tight mt-2 line-clamp-2">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Dashboard Stats + Enquiries + RM Card */}
        <div className="lg:col-span-8 space-y-6 flex flex-col justify-between">
          {/* Dashboard Stats */}
          <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">My Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Enquiries */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100/60 dark:border-slate-850 relative group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                  <div className="absolute top-4 right-4 p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">My Enquiries</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block">09</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">(last 4 weeks)</span>
                </div>

                {/* Active Policies */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100/60 dark:border-slate-850 relative group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                  <div className="absolute top-4 right-4 p-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Policies</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block">02</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">(last 4 weeks)</span>
                </div>

                {/* Total Claims */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100/60 dark:border-slate-850 relative group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                  <div className="absolute top-4 right-4 p-1.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-405 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Claims</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block">00</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">(last 4 weeks)</span>
                </div>

                {/* My Renewals */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100/60 dark:border-slate-850 relative group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                  <div className="absolute top-4 right-4 p-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">My Renewals</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block">02</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">(last 4 weeks)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lower Grid: Enquiries Table & RM Contact Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tabs for Enquiries / Renewals */}
            <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full justify-between">
              <CardContent className="p-6">
                <Tabs defaultValue="enquiries" className="space-y-4">
                  <TabsList className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full grid grid-cols-2">
                    <TabsTrigger value="enquiries" className="rounded-lg font-bold text-xs py-2 text-slate-650 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
                      Latest Enquiries
                    </TabsTrigger>
                    <TabsTrigger value="renewals" className="rounded-lg font-bold text-xs py-2 text-slate-650 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
                      My Renewals
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="enquiries" className="space-y-3 focus-visible:outline-none">
                    {LATEST_ENQUIRIES.map((enquiry) => (
                      <div key={enquiry.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-2 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-1">
                            {enquiry.title}
                          </h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border dark:border-slate-800 ${enquiry.statusColor} dark:bg-amber-950/20 dark:text-amber-400 shrink-0`}>
                            {enquiry.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">{enquiry.provider}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{enquiry.date}</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="renewals" className="space-y-3 focus-visible:outline-none">
                    {MY_RENEWALS.map((renewal) => (
                      <div key={renewal.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-2 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-1">
                            {renewal.title}
                          </h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border dark:border-slate-800 ${renewal.statusColor} dark:bg-rose-950/20 dark:text-rose-405 shrink-0`}>
                            {renewal.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">{renewal.provider}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{renewal.date}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                <Button variant="outline" className="w-full text-xs font-bold text-slate-600 dark:text-slate-305 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 gap-1 rounded-xl shadow-sm">
                  View All
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </Card>

            {/* Relationship Manager Contact Card */}
            <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                <div className="absolute top-2 right-2 bg-yellow-400 text-white rounded-full p-1 shadow-md border border-white dark:border-slate-900">
                  <Star className="h-4 w-4 fill-white text-white" />
                </div>
              </div>

              <CardContent className="p-6 space-y-4 flex-1">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-white shadow-md text-sm border-2 border-white dark:border-slate-800 ring-1 ring-slate-105 dark:ring-slate-850">
                    JP
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Joseph Paul</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Your Relationship Manager</p>
                    <div className="flex items-center space-x-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-605 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  "Hello Shruti, I am Joseph Paul, your dedicated Relationship Manager. I am here to guide you through every step of your insurance journey."
                </p>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center space-x-3 text-slate-650">
                    <div className="p-1.5 bg-slate-105 dark:bg-slate-850 rounded-lg">
                      <Mail className="h-3.5 w-3.5 text-slate-505 dark:text-slate-450" />
                    </div>
                    <a href="mailto:sales@beyondsure.in" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-650 dark:hover:text-purple-400 transition-colors bg-transparent">
                      sales@beyondsure.in
                    </a>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-650">
                    <div className="p-1.5 bg-slate-105 dark:bg-slate-850 rounded-lg">
                      <Phone className="h-3.5 w-3.5 text-slate-505 dark:text-slate-450" />
                    </div>
                    <a href="tel:+919830024236" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-650 dark:hover:text-purple-405 transition-colors bg-transparent">
                      +91 9830024236
                    </a>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end">
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-full text-[10px] border-none">
                  Dedicated RM
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insurance;
