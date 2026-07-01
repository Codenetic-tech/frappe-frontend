import React, { useState } from 'react';
import {
  Play,
  Calendar,
  Activity,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  Download,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Datasets
const DEST_NUMBER = '917814783983';

const ICICI = {
  A: { young: { basic: 6325, essential: 7094, recommended: 7852 }, older: { basic: 19468, essential: 21100, recommended: 20807 } },
  B: { young: { basic: 6000, essential: 6750, recommended: 7400 }, older: { basic: 17557, essential: 19189, recommended: 19049 } },
  C: { young: { basic: 5994, essential: 6763, recommended: 7548 }, older: { basic: 16602, essential: 18234, recommended: 18170 } }
};
const HDFC = {
  young: { 5: 9698, 10: 11859 },
  mid: { 5: 10201, 10: 12613 },
  older: { 5: 11457, 10: 14673 }
};
const CARE = {
  5: { '18-35': 5846, '36-40': 6875, '41-45': 10244, '46-60': 15696, '61-65': 31167 },
  10: { '18-35': 7709, '36-40': 9105, '41-45': 13565, '46-60': 20906, '61-65': 41713 }
};

const NIVA_5L = [
  { dob: '01/01/1975', pin: '842001', premium: 15128 },
  { dob: '01/01/1975', pin: '700001', premium: 17934 },
  { dob: '01/01/1990', pin: '110092', premium: 9959 },
  { dob: '01/01/1990', pin: '842001', premium: 8420 },
  { dob: '01/01/1990', pin: '700001', premium: 9959 },
  { dob: '01/01/2000', pin: '110092', premium: 8487 },
  { dob: '01/01/2003', pin: '842001', premium: 7193 },
  { dob: '01/01/2003', pin: '700001', premium: 8487 }
];
const NIVA_10L = [
  { dob: '01/01/1975', pin: '110092', premium: 17934 },
  { dob: '01/01/1975', pin: '842001', premium: 15128 },
  { dob: '01/01/1990', pin: '842001', premium: 9962 },
  { dob: '01/01/1990', pin: '110092', premium: 11737 },
  { dob: '01/01/2000', pin: '110092', premium: 10040 },
  { dob: '01/01/2000', pin: '700001', premium: 10040 },
  { dob: '01/01/2000', pin: '842001', premium: 8547 }
];

const ZONE_A_KEYWORDS = [
  'delhi', 'new delhi', 'greater noida', 'noida', 'ghaziabad',
  'gurgaon', 'gurugram', 'faridabad', 'mumbai', 'navi mumbai', 'thane',
  'surat', 'ahmedabad'
];
const ZONE_B_KEYWORDS = [
  'pune', 'bengaluru', 'bangalore', 'hyderabad', 'chennai'
];

const OFFER_IMAGES = [
  { url: 'https://i.ibb.co/VWk9KhYM/Magenta-and-Pink-Senior-Home-Living-Care-Service-Instagram-Post.png', caption: 'Exclusive DIWALI GIFT — T&Cs apply' },
  { url: 'https://i.ibb.co/nsMCNgpc/Add-a-subheading-3.png', caption: 'Refer & Earn — health bonus' }
];

const GetQuote: React.FC = () => {
  const { user, frappeUser } = useAuth();
  const displayName = frappeUser?.first_name || frappeUser?.full_name || user?.firstName || user?.user_code || 'User';

  // Checker inputs state
  const [clientName, setClientName] = useState('');
  const [dob, setDob] = useState('');
  const [sumInsured, setSumInsured] = useState('5');
  const [pincode, setPincode] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Validation / Lookup state
  const [pinError, setPinError] = useState(false);
  const [waError, setWaError] = useState(false);
  const [detectedZone, setDetectedZone] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('—');
  const [isCalculating, setIsCalculating] = useState(false);

  // Quote State
  const [calculatedQuote, setCalculatedQuote] = useState<any>(null);

  // Carousel active index
  const [carouselIndex, setCarouselIndex] = useState(0);

  const nextCarousel = () => {
    setCarouselIndex(prev => (prev + 1) % OFFER_IMAGES.length);
  };
  const prevCarousel = () => {
    setCarouselIndex(prev => (prev - 1 + OFFER_IMAGES.length) % OFFER_IMAGES.length);
  };

  // Helpers
  const ageFromDob = (dobInput: string) => {
    if (!dobInput) return null;
    const dt = new Date(dobInput + 'T00:00:00');
    if (isNaN(dt.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dt.getFullYear();
    const m = now.getMonth() - dt.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age--;
    return age;
  };

  const fmtINR = (n: number | null) => {
    if (n === null || isNaN(n)) return '—';
    return n.toLocaleString('en-IN');
  };

  const withGST = (n: number) => Math.round(n * 1.18);

  const validateWA = (raw: string) => {
    if (!raw) return false;
    const only = raw.replace(/[^\d+]/g, '');
    const digits = only.replace('+', '');
    return digits.length === 10 || (digits.length === 12 && digits.startsWith('91')) || (digits.length === 11 && digits.startsWith('0'));
  };

  const handlePincodeInput = async (val: string) => {
    setPincode(val);
    const trimmed = val.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setPinError(false);
      setResolvedAddress('—');
      setDetectedZone('');
      return;
    }

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${trimmed}`);
      const j = await res.json();
      if (!j || !j[0] || j[0].Status !== 'Success' || !j[0].PostOffice?.length) {
        throw new Error('PIN lookup failed');
      }
      const list = j[0].PostOffice;
      const textBlock = list.map((po: any) => [
        po.Name, po.BranchType, po.Block, po.District, po.Region, po.State, po.Country
      ].filter(Boolean).join(' ')).join(' ').toLowerCase();

      let zone = 'C';
      if (ZONE_A_KEYWORDS.some(k => textBlock.includes(k))) zone = 'A';
      else if (ZONE_B_KEYWORDS.some(k => textBlock.includes(k))) zone = 'B';

      const first = list[0];
      setResolvedAddress(`${first.Name}, ${first.District}, ${first.State}`);
      setDetectedZone(zone);
      setPinError(false);
    } catch (e) {
      setPinError(true);
      setResolvedAddress('—');
      setDetectedZone('');
    }
  };

  const checkPremium = async () => {
    if (!validateWA(whatsapp)) {
      setWaError(true);
      return;
    }
    setWaError(false);

    const age = ageFromDob(dob);
    if (!dob || age === null) {
      alert('Please enter a valid Date of Birth');
      return;
    }

    if (!pincode || pincode.length !== 6 || pinError || resolvedAddress === '—') {
      alert('Please enter a valid resolved 6-digit Pincode');
      return;
    }

    setIsCalculating(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsCalculating(false);

    const si = parseFloat(sumInsured);
    const band = age <= 35 ? 'young' : 'older';
    const zone = detectedZone || 'A';

    // ICICI
    const iciciBase = zone === 'A' ? 7.5 : 5;
    const iciciSI = si < iciciBase ? iciciBase : si;
    const iciciFactor = iciciSI / iciciBase;
    const rates = ICICI[zone as keyof typeof ICICI][band as 'young' | 'older'];
    const iciciBasic = Math.round(rates.basic * iciciFactor);
    const iciciEssential = Math.round(rates.essential * iciciFactor);
    const iciciRecommended = Math.round(rates.recommended * iciciFactor);

    // HDFC
    const hdfcBaseKey = si >= 10 ? 10 : 5;
    const hdfcBand = age <= 27 ? 'young' : age <= 35 ? 'mid' : 'older';
    const hdfcBase = HDFC[hdfcBand][hdfcBaseKey as 5 | 10];
    const hdfcPrice = Math.round(hdfcBase * (si / hdfcBaseKey));

    // CARE
    const careBaseKey = si >= 10 ? 10 : 5;
    let careBand: '18-35' | '36-40' | '41-45' | '46-60' | '61-65' = '18-35';
    if (age <= 35) careBand = '18-35';
    else if (age <= 40) careBand = '36-40';
    else if (age <= 45) careBand = '41-45';
    else if (age <= 60) careBand = '46-60';
    else careBand = '61-65';
    const careBase = CARE[careBaseKey as 5 | 10][careBand];
    const carePrice = Math.round(careBase * (si / careBaseKey));

    // Niva
    const nivaBase = si <= 5 ? 5 : 10;
    const nivaDataset = nivaBase === 5 ? NIVA_5L : NIVA_10L;
    let closest = nivaDataset[0];
    let minDiff = 999;
    nivaDataset.forEach(d => {
      const parts = d.dob.split('/');
      const dAge = ageFromDob(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      if (dAge !== null) {
        const diff = Math.abs(dAge - age);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d;
        }
      }
    });
    const nivaPrice = si === nivaBase ? closest.premium : Math.round(closest.premium * (si / nivaBase));

    setCalculatedQuote({
      name: clientName || 'Client Name',
      dob,
      age,
      pin: pincode,
      zone,
      si,
      icici: { basic: iciciBasic, essential: iciciEssential, recommended: iciciRecommended, effectiveSI: iciciSI },
      hdfc: { price: hdfcPrice, meta: `Band ${hdfcBand} • base ${hdfcBaseKey}L → scaled to ${si}L` },
      care: { price: carePrice, meta: `Band ${careBand} • base ${careBaseKey}L → scaled to ${si}L` },
      niva: { price: nivaPrice, meta: `Base ${nivaBase}L matched ±${minDiff} yrs` }
    });
  };

  const handleClear = () => {
    setClientName('');
    setDob('');
    setSumInsured('5');
    setPincode('');
    setWhatsapp('');
    setResolvedAddress('—');
    setDetectedZone('');
    setCalculatedQuote(null);
    setPinError(false);
    setWaError(false);
  };

  const handleWhatsAppAction = (insurer: string, plan: string, price: number) => {
    const quote = calculatedQuote || { name: clientName || 'Client', dob, pin: pincode, zone: detectedZone || 'A', si: parseFloat(sumInsured) };
    const dobStr = quote.dob ? new Date(quote.dob).toLocaleDateString('en-GB') : '';
    const text = `${quote.name} DOB:- ${dobStr}\nPincode: ${quote.pin} • Zone: ${quote.zone}\nSum Insured: ₹${quote.si}L\nInsurer: ${insurer}\nPlan: ${plan}\nPremium (indicative): ₹${fmtINR(price)}\n\nPlease contact me.`;
    window.open(`https://wa.me/${DEST_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareQuote = () => {
    if (!calculatedQuote) return;
    let customerWA = whatsapp.replace(/[^\d]/g, '');
    if (customerWA.length === 10) customerWA = '91' + customerWA;

    const dobStr = new Date(calculatedQuote.dob).toLocaleDateString('en-GB');
    const lines = [
      `*GoPocket Health Quote for ${calculatedQuote.name}*`,
      `DOB: ${dobStr} | Pincode: ${calculatedQuote.pin} (Zone ${calculatedQuote.zone})`,
      `Sum Insured: ₹${calculatedQuote.si}L`,
      '----------------------------------------',
      `*ICICI Lombard (Premium: ₹${fmtINR(calculatedQuote.icici.recommended)})*`,
      `• Daycare treatment cover`,
      `• Pre- & post-hospitalisation cover`,
      `• Modern treatment cover`,
      '----------------------------------------',
      `*HDFC Optima Secure (Premium: ₹${fmtINR(calculatedQuote.hdfc.price)})*`,
      `• Free annual health checkup`,
      `• ICU & room rent cover`,
      `• Non-consumable implants cover`,
      '----------------------------------------',
      `*Care Supreme (Premium: ₹${fmtINR(calculatedQuote.care.price)})*`,
      `• Ayurveda & daycare cover`,
      `• Max bonus up to 500%`,
      `• OPD cover & e-consultation`,
      '----------------------------------------',
      `*NivaBupa (Premium: ₹${fmtINR(calculatedQuote.niva.price)})*`,
      `• Robotic surgery cover`,
      `• Premium lock feature`,
      '----------------------------------------',
      `*Zero GST applies on these policies.*`
    ];

    window.open(`https://wa.me/${customerWA}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!calculatedQuote) return;
    try {
      // @ts-ignore
      let jsPDFClass = window.jspdf?.jsPDF;
      if (!jsPDFClass) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        // @ts-ignore
        jsPDFClass = window.jspdf?.jsPDF;
      }

      if (jsPDFClass) {
        const doc = new jsPDFClass({ unit: 'pt', format: 'a4' });
        doc.setFontSize(16);
        doc.text('GoPocket — Insurance Quotation (Indicative)', 40, 60);
        doc.setFontSize(11);
        doc.text(`Name: ${calculatedQuote.name}`, 40, 92);
        doc.text(`DOB: ${calculatedQuote.dob}`, 40, 110);
        doc.text(`Pincode: ${calculatedQuote.pin}  • Zone: ${calculatedQuote.zone}`, 40, 128);
        doc.text(`Sum Insured selected: ₹${calculatedQuote.si}L`, 40, 146);

        let y = 180;
        doc.text(`ICICI Lombard (Zone ${calculatedQuote.zone})`, 40, y); y += 18;
        doc.text(`  Basic: ₹${fmtINR(calculatedQuote.icici.basic)}`, 60, y); y += 14;
        doc.text(`  Essential: ₹${fmtINR(calculatedQuote.icici.essential)}`, 60, y); y += 14;
        doc.text(`  Recommended: ₹${fmtINR(calculatedQuote.icici.recommended)}`, 60, y); y += 22;

        doc.text(`HDFC Optima Secure: ₹${fmtINR(calculatedQuote.hdfc.price)}`, 40, y); y += 18;
        doc.text(`Care Supreme: ₹${fmtINR(calculatedQuote.care.price)}`, 40, y); y += 18;
        doc.text(`NivaBupa Indicative: ₹${fmtINR(calculatedQuote.niva.price)}`, 40, y); y += 30;

        doc.setFontSize(9);
        doc.text('Note: GST is already included as Zero-GST promotional prices. Verify details on active portal.', 40, y, { maxWidth: 500 });
        doc.save(`GoPocket_Quotation_${calculatedQuote.name.replace(/\s+/g, '_')}.pdf`);
      }
    } catch (e) {
      console.error(e);
      alert('Error rendering PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 dark:bg-transparent p-4 space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Insurance Premium Checker <span className="text-sm font-bold text-slate-500 dark:text-slate-450">(Zone-Accurate)</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Hello {displayName}, get accurate premium comparison for client.</p>
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
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-sm font-semibold border border-slate-200/50 dark:border-slate-800 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>26 Feb, 2026 - 28 Feb, 2026</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Enter Client Details</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Compare ICICI, HDFC ERGO, Care Health & NivaBupa</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-405 tracking-wider">Full name</label>
                <input
                  type="text"
                  className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                  placeholder="e.g. Shivesh Anand"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-405 tracking-wider">Date of birth</label>
                  <input
                    type="date"
                    className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-405 tracking-wider">Sum Insured</label>
                  <select
                    className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-100"
                    value={sumInsured}
                    onChange={e => setSumInsured(e.target.value)}
                  >
                    <option value="5" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">₹5,00,000</option>
                    <option value="7.5" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">₹7,50,000</option>
                    <option value="10" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">₹10,00,000</option>
                    <option value="15" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">₹15,00,000</option>
                    <option value="20" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">₹20,00,000</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-455 tracking-wider">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                    placeholder="e.g. 110092"
                    value={pincode}
                    onChange={e => handlePincodeInput(e.target.value)}
                  />
                  {pinError && <p className="text-[10px] text-red-500 dark:text-red-400 font-bold mt-1">PIN invalid / network issue</p>}
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-455 tracking-wider">WhatsApp support <span className="text-red-500 font-black">*</span></label>
                  <input
                    type="text"
                    className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                    placeholder="10-digit number"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                  />
                  {waError && <p className="text-[10px] text-red-500 dark:text-red-400 font-bold mt-1">Enter valid WhatsApp number</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button onClick={checkPremium} className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 font-bold text-white shadow-md hover:scale-[1.01] transition-transform border-none">
                  Check Premium
                </Button>
                <Button variant="outline" onClick={handleClear} className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850">
                  Clear
                </Button>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold pt-1">
                Tip: Enter 6-digit PIN to auto-detect zone. Zone A minimum SI for ICICI = 7.5L.
              </div>
            </CardContent>
          </Card>

          {/* Resolved info Card */}
          <Card className={cn(
            "rounded-2xl border-slate-200/60 dark:border-slate-800 transition-all duration-300 shadow-sm bg-white dark:bg-slate-900",
            detectedZone && "bg-gradient-to-r from-blue-50/40 to-emerald-50/40 dark:from-blue-950/10 dark:to-emerald-950/10 border-l-4 border-l-blue-500"
          )}>
            <CardContent className="p-5 flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wider block">Resolved Client Info</span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{clientName || '—'}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{resolvedAddress}</p>
              </div>
              {detectedZone && (
                <Badge className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-black px-3 py-1 rounded-full text-xs shadow-sm border-none">
                  Zone {detectedZone}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Premium Results Column */}
        <div className="lg:col-span-8 space-y-6">
          {isCalculating ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="w-10 h-10 border-4 border-slate-100 dark:border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Calculating premiums & auto-detecting zone...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid of Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ICICI Lombard */}
                <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex flex-col justify-between overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/20 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400 text-xs">IL</div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-105">ICICI Lombard</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Zone-Aware Pricing</p>
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {calculatedQuote ? (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-center border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold">
                                <th className="p-2 border border-slate-200 dark:border-slate-800">Plan</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-800">Premium</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-800">SI</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-800">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {['Basic', 'Essential', 'Recommended'].map((plan) => {
                                const price = plan === 'Basic' ? calculatedQuote.icici.basic : plan === 'Essential' ? calculatedQuote.icici.essential : calculatedQuote.icici.recommended;
                                return (
                                  <tr key={plan} className="hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-250">
                                    <td className="p-2 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">{plan}</td>
                                    <td className="p-2 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400">₹{fmtINR(price)}</td>
                                    <td className="p-2 border border-slate-200 dark:border-slate-800">{calculatedQuote.icici.effectiveSI}L</td>
                                    <td className="p-2 border border-slate-200 dark:border-slate-800">
                                      <button
                                        onClick={() => handleWhatsAppAction('ICICI Lombard', plan, price)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1 px-2.5 rounded text-[10px] shadow-sm transition-colors border-none"
                                      >
                                        Get Now
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] border border-emerald-100 dark:border-emerald-900/30 rounded-full px-2 py-0.5 shadow-sm">
                            Zero GST promotional
                          </span>
                          {calculatedQuote.icici.effectiveSI !== calculatedQuote.si && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                              Min Zone {calculatedQuote.zone} SI = {calculatedQuote.icici.effectiveSI}L
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic text-center py-6">Enter client details and check premium to view pricing</p>
                    )}
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Daycare treatment cover</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Pre- & post-hospitalisation</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Modern treatments & ICU cover</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* HDFC Optima Secure */}
                <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex flex-col justify-between overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs">HE</div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-105">HDFC Optima Secure</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Age-Band Pricing</p>
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {calculatedQuote ? (
                      <div className="space-y-2">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-slate-400 dark:text-slate-500 text-xs line-through">₹{fmtINR(withGST(calculatedQuote.hdfc.price))}</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">₹{fmtINR(calculatedQuote.hdfc.price)}</span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 font-bold text-[9px] px-2 py-0.5 rounded-full">Zero GST</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{calculatedQuote.hdfc.meta}</p>
                        <Button
                          onClick={() => handleWhatsAppAction('HDFC Optima Secure', 'Standard Secure', calculatedQuote.hdfc.price)}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-xs shadow-sm mt-2 border-none"
                        >
                          Get Now
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic text-center py-6">Enter client details and check premium to view pricing</p>
                    )}
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Free health checkup</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Non-consumable cover (implants)</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> ICU & room rent cover</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Care Supreme */}
                <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex flex-col justify-between overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-950/20 flex items-center justify-center font-bold text-teal-600 dark:text-teal-400 text-xs">CH</div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-105">Care Health — Supreme</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Wellness & High Recharge</p>
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {calculatedQuote ? (
                      <div className="space-y-2">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-slate-400 dark:text-slate-500 text-xs line-through">₹{fmtINR(withGST(calculatedQuote.care.price))}</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">₹{fmtINR(calculatedQuote.care.price)}</span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 font-bold text-[9px] px-2 py-0.5 rounded-full">Zero GST</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{calculatedQuote.care.meta}</p>
                        <Button
                          onClick={() => handleWhatsAppAction('Care Health Supreme', 'Supreme Plan', calculatedQuote.care.price)}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-xs shadow-sm mt-2 border-none"
                        >
                          Get Now
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic text-center py-6">Enter client details and check premium to view pricing</p>
                    )}
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Max bonus up to 500%</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> OPD & medicine claim cover</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Ayurveda treatment cover</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* NivaBupa */}
                <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex flex-col justify-between overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="h-8 w-8 rounded-lg bg-pink-100 dark:bg-pink-950/20 flex items-center justify-center font-bold text-pink-600 dark:text-pink-400 text-xs">NB</div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-105">NivaBupa</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Sample Dataset Matches</p>
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {calculatedQuote ? (
                      <div className="space-y-2">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-slate-400 dark:text-slate-505 text-xs line-through">₹{fmtINR(withGST(calculatedQuote.niva.price))}</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">₹{fmtINR(calculatedQuote.niva.price)}</span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 font-bold text-[9px] px-2 py-0.5 rounded-full">Zero GST</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold">{calculatedQuote.niva.meta}</p>
                        <Button
                          onClick={() => handleWhatsAppAction('NivaBupa', 'Standard', calculatedQuote.niva.price)}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-xs shadow-sm mt-2 border-none"
                        >
                          Get Now
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-505 font-semibold italic text-center py-6">Enter client details and check premium to view pricing</p>
                    )}
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Robotic surgery cover</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Premium locks (until claim)</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Annual health checks</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Actions Footer */}
              {calculatedQuote && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                  <Button onClick={handleDownloadPDF} className="bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-white rounded-xl gap-2 shadow-sm border-none">
                    <Download className="h-4 w-4" />
                    Download Quote (PDF)
                  </Button>
                  <Button onClick={handleShareQuote} variant="outline" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-205 font-bold rounded-xl gap-2 hover:bg-slate-50 dark:hover:bg-slate-850">
                    <Share2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Share Quote on WhatsApp
                  </Button>
                </div>
              )}

              {/* Offers Carousel Banners */}
              <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 text-white">
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Promos & Updates</span>
                    <h3 className="text-lg font-bold leading-tight">{OFFER_IMAGES[carouselIndex].caption}</h3>
                    <div className="flex items-center gap-2 pt-2">
                      <Button size="icon" variant="ghost" onClick={prevCarousel} className="h-7 w-7 text-white hover:bg-white/10 rounded-full">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={nextCarousel} className="h-7 w-7 text-white hover:bg-white/10 rounded-full">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="w-full md:w-48 aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-900 relative">
                    <img src={OFFER_IMAGES[carouselIndex].url} alt="Promo" className="object-cover w-full h-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GetQuote;
