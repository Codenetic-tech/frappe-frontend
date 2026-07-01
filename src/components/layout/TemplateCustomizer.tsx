import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useSidebar } from '../ui/sidebar';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

/* ─── Types ─────────────────────────────────────────────────────── */
type ThemeMode          = 'light' | 'dark' | 'system';
type SkinType           = 'default' | 'bordered';
type NavbarTypeOption   = 'sticky' | 'static' | 'hidden';
type ContentLayoutOpt   = 'compact' | 'wide';

/* ─── Preset palette ─────────────────────────────────────────────── */
const PRESET_COLORS = [
  { value: '#696cff', label: 'Purple'  },
  { value: '#71dd37', label: 'Green'   },
  { value: '#ff9f43', label: 'Orange'  },
  { value: '#ff3e1d', label: 'Red'     },
  { value: '#03c3ec', label: 'Cyan'    },
] as const;

/* ─── Defaults ───────────────────────────────────────────────────── */
const DEFAULTS = {
  primaryColor  : '#696cff',
  theme         : 'light'   as ThemeMode,
  skin          : 'default' as SkinType,
  semiDark      : false,
  navbarType    : 'sticky'  as NavbarTypeOption,
  contentLayout : 'compact' as ContentLayoutOpt,
};

/* ─── localStorage helpers ───────────────────────────────────────── */
const TPLNAME = 'vertical-menu-template';
const lsGet = (key: string, fb: string) =>
  localStorage.getItem(`templateCustomizer-${TPLNAME}--${key}`) ?? fb;
const lsSet = (key: string, val: string) =>
  localStorage.setItem(`templateCustomizer-${TPLNAME}--${key}`, val);

/* ─── Color helpers ──────────────────────────────────────────────── */
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ─── Asset image helper ─────────────────────────────────────────── */
const Thumb: React.FC<{ file: string; alt: string }> = ({ file, alt }) => (
  <img
    src={`/customizer/${file}`}
    alt={alt}
    width={98}
    height={62}
    className="block h-auto w-full dark:invert"
  />
);

/* ─── Inline icon SVGs ────────────────────────────────────────────── */
const IcSun = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IcMoon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IcMonitor = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IcCheck = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcGear = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

/* ─── Reusable sub-components ─────────────────────────────────────── */
const SectionBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4 mt-1">
    <span className="inline-flex items-center rounded-full bg-[#ebe9ff] px-2.5 py-[3px] text-[11px] font-medium text-[#696cff]">
      {children}
    </span>
  </div>
);

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn('mb-2 text-[13px] font-medium text-[#384551] dark:text-slate-300', className)}>
    {children}
  </p>
);

/* Card used for icon-only options (Theme) */
const IconCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ selected, onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-center w-full overflow-hidden rounded-md border-2 cursor-pointer transition-colors focus:outline-none',
      selected
        ? 'border-[#696cff]'
        : 'border-[rgba(67,89,113,0.12)] hover:border-[rgba(105,108,255,0.4)] dark:border-slate-800 dark:hover:border-[rgba(105,108,255,0.6)]'
    )}
  >
    <div className="flex w-full items-center justify-center py-[14px] text-[#697a8d] dark:text-slate-400">
      {children}
    </div>
    <span className={cn(
      'w-full pb-[7px] text-center text-[11.5px] leading-none',
      selected ? 'font-medium text-[#696cff]' : 'text-[#697a8d] dark:text-slate-400'
    )}>
      {label}
    </span>
  </button>
);

/* Card used for thumbnail-based options (Skin, Menu, Navbar, Content, Direction) */
const ThumbCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  label: string;
  file: string;
}> = ({ selected, onClick, label, file }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-center w-[109px] overflow-hidden rounded-md border-2 cursor-pointer transition-colors focus:outline-none',
      selected
        ? 'border-[#696cff]'
        : 'border-[rgba(67,89,113,0.12)] hover:border-[rgba(105,108,255,0.4)] dark:border-slate-800 dark:hover:border-[rgba(105,108,255,0.6)]'
    )}
  >
    <div className="flex w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Thumb file={file} alt={label} />
    </div>
    <span className={cn(
      'w-full px-1 pb-[7px] pt-[5px] text-center text-[11.5px] leading-tight',
      selected ? 'font-medium text-[#696cff]' : 'text-[#697a8d] dark:text-slate-400'
    )}>
      {label}
    </span>
  </button>
);

/* ─── Main component ─────────────────────────────────────────────── */
export const TemplateCustomizer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { state: sidebarState, setOpen: setSidebarOpen } = useSidebar();
  
  const isMenuCollapsed = sidebarState === 'collapsed';
  const setMenuCollapsed = (collapsed: boolean) => setSidebarOpen(!collapsed);

  const colorInputRef = useRef<HTMLInputElement>(null);

  /* State — initialised from localStorage */
  const [primaryColor, setPrimaryColor]     = useState(() => lsGet('PrimaryColor', DEFAULTS.primaryColor));
  const [theme, setTheme]                   = useState<ThemeMode>(() => lsGet('Theme', DEFAULTS.theme) as ThemeMode);
  const [skin, setSkin]                     = useState<SkinType>(() => lsGet('Skin', DEFAULTS.skin) as SkinType);
  const [semiDark, setSemiDark]             = useState(() => lsGet('SemiDark', 'false') === 'true');
  const [navbarType, setNavbarType]         = useState<NavbarTypeOption>(() => lsGet('layoutNavbarOptions', DEFAULTS.navbarType) as NavbarTypeOption);
  const [contentLayout, setContentLayout]   = useState<ContentLayoutOpt>(() => lsGet('contentLayout', DEFAULTS.contentLayout) as ContentLayoutOpt);

  /* ── DOM appliers ── */
  const applyColor = (color: string) => {
    const root = document.documentElement;
    // Primary color — drives bg-primary, text-primary, border-primary Tailwind utilities
    root.style.setProperty('--color-primary', color);
    root.style.setProperty('--color-ring', color);
    // Sneat custom menu/component variables
    root.style.setProperty('--color-sneat-primary', color);
    root.style.setProperty('--color-sneat-menu-active', color);
    // Derived alpha variants for hover/active backgrounds
    root.style.setProperty('--color-primary-8', hexToRgba(color, 0.08));
    root.style.setProperty('--color-primary-12', hexToRgba(color, 0.12));
    root.style.setProperty('--color-primary-60', hexToRgba(color, 0.6));
    lsSet('PrimaryColor', color);
    setPrimaryColor(color);
  };

  const applyTheme = (t: ThemeMode) => {
    const resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.setAttribute('data-bs-theme', resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    lsSet('Theme', t);
    setTheme(t);
  };

  const applySkin = (s: SkinType) => {
    document.documentElement.setAttribute('data-skin', s);
    document.documentElement.classList.toggle('layout-bordered', s === 'bordered');
    lsSet('Skin', s);
    setSkin(s);
  };

  const applySemiDark = (val: boolean) => {
    document.documentElement.classList.toggle('semi-dark-layout', val);
    lsSet('SemiDark', String(val));
    setSemiDark(val);
  };

  const applyNavbarType = (t: NavbarTypeOption) => {
    const html = document.documentElement;
    html.classList.remove('layout-navbar-fixed', 'layout-navbar-static', 'layout-navbar-hidden');
    if (t === 'sticky')      html.classList.add('layout-navbar-fixed');
    else if (t === 'static') html.classList.add('layout-navbar-static');
    else                     html.classList.add('layout-navbar-hidden');
    lsSet('layoutNavbarOptions', t);
    setNavbarType(t);
  };

  const applyContentLayout = (layout: ContentLayoutOpt) => {
    /* Setting data-content-layout attribute triggers LayoutContext MutationObserver
       which applies the compact/wide CSS classes automatically. */
    lsSet('contentLayout', layout);
    document.documentElement.setAttribute('data-content-layout', layout);
    setContentLayout(layout);
  };

  /* Apply persisted settings once on mount */
  useEffect(() => {
    applyColor(primaryColor);
    applyTheme(theme);
    applySkin(skin);
    applySemiDark(semiDark);
    applyNavbarType(navbarType);
    applyContentLayout(contentLayout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // System theme listener
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const resolved = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', resolved);
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleReset = () => {
    applyColor(DEFAULTS.primaryColor);
    applyTheme(DEFAULTS.theme);
    applySkin(DEFAULTS.skin);
    applySemiDark(DEFAULTS.semiDark);
    applyNavbarType(DEFAULTS.navbarType);
    applyContentLayout(DEFAULTS.contentLayout);
    setMenuCollapsed(false);
  };

  const isCustomColor = !PRESET_COLORS.some(
    (c) => c.value.toLowerCase() === primaryColor.toLowerCase()
  );

  return (
    <>
      {/* ── Floating trigger button ───────────────────────────────── */}
      <button
        type="button"
        aria-label="Open Template Customizer"
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-l-xl text-white shadow-lg transition-colors"
        style={{ backgroundColor: primaryColor }}
      >
        <IcGear />
      </button>

      {/* ── Slide-in panel (no backdrop — matches original Sneat behavior) ── */}
      <div
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col bg-white dark:bg-[#1c1c21] shadow-[0_0_2rem_rgba(67,89,113,0.24)] dark:shadow-[0_0_2rem_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-start justify-between border-b border-[rgba(67,89,113,0.1)] dark:border-slate-800 px-6 pb-[18px] pt-5">
          <div>
            <p className="mb-0.5 text-[15px] font-semibold leading-tight text-[#384551] dark:text-slate-100">
              Template Customizer
            </p>
            <p className="mb-0 text-[13px] leading-snug text-[#697a8d] dark:text-slate-400">
              Customize and preview in real time
            </p>
          </div>
          <div className="-mr-1 flex items-center">
            <button
              type="button"
              title="Reset to defaults"
              onClick={handleReset}
              className="flex h-[30px] w-[30px] items-center justify-center rounded text-[#697a8d] dark:text-slate-400 transition-colors hover:bg-[#f5f5f9] dark:hover:bg-slate-800 hover:text-[#384551] dark:hover:text-slate-100"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-[30px] w-[30px] items-center justify-center rounded text-[#697a8d] dark:text-slate-400 transition-colors hover:bg-[#f5f5f9] dark:hover:bg-slate-800 hover:text-[#384551] dark:hover:text-slate-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable body ───────────────────────────────────────────── */}
        <ScrollArea className="flex-1">
          <div className="pl-8 pr-6 py-5">

            {/* ══ THEMING ══════════════════════════════════════════════ */}
            <SectionBadge>Theming</SectionBadge>

            {/* Primary Color */}
            <div className="mb-5">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-[10px]">
                {PRESET_COLORS.map((c) => {
                  const active = primaryColor.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => applyColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={cn(
                        'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[6px] transition-transform hover:scale-105 focus:outline-none',
                        active && 'ring-2 ring-[#696cff] ring-offset-1'
                      )}
                    >
                      {active && <IcCheck />}
                    </button>
                  );
                })}

                {/* Custom color swatch */}
                <button
                  type="button"
                  title="Custom color"
                  onClick={() => colorInputRef.current?.click()}
                  style={{
                    background:
                      'conic-gradient(#696cff 0deg,#03c3ec 60deg,#71dd37 120deg,#ff9f43 180deg,#ff3e1d 240deg,#696cff 360deg)',
                  }}
                  className={cn(
                    'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[6px] transition-transform hover:scale-105 focus:outline-none',
                    isCustomColor && 'ring-2 ring-[#696cff] ring-offset-1'
                  )}
                >
                  {isCustomColor && <IcCheck />}
                </button>
                <input
                  ref={colorInputRef}
                  type="color"
                  className="sr-only"
                  value={primaryColor}
                  onChange={(e) => applyColor(e.target.value)}
                />
              </div>
            </div>

            {/* Theme */}
            <div className="mb-5">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'light',  label: 'Light',  Icon: IcSun     },
                  { value: 'dark',   label: 'Dark',   Icon: IcMoon    },
                  { value: 'system', label: 'System', Icon: IcMonitor },
                ] as const).map(({ value, label, Icon }) => (
                  <IconCard
                    key={value}
                    selected={theme === value}
                    onClick={() => applyTheme(value)}
                    label={label}
                  >
                    <Icon />
                  </IconCard>
                ))}
              </div>
            </div>

            {/* Skins */}
            <div className="mb-5">
              <Label>Skins</Label>
              <div className="flex gap-3">
                <ThumbCard selected={skin === 'default'}  onClick={() => applySkin('default')}  label="Default"  file="skin-default.svg" />
                <ThumbCard selected={skin === 'bordered'} onClick={() => applySkin('bordered')} label="Bordered" file="skin-border.svg"   />
              </div>
            </div>

            {/* Semi Dark */}
            <div className="mb-6 flex items-center justify-between">
              <Label className="mb-0">Semi Dark</Label>
              <Switch
                checked={semiDark}
                onCheckedChange={applySemiDark}
                className="data-[state=checked]:bg-[#696cff]"
              />
            </div>

            {/* ══ LAYOUT ═══════════════════════════════════════════════ */}
            <SectionBadge>Layout</SectionBadge>

            {/* Menu Navigation */}
            <div className="mb-5">
              <Label>Menu (Navigation)</Label>
              <div className="flex gap-3">
                <ThumbCard selected={!isMenuCollapsed} onClick={() => setMenuCollapsed(false)} label="Expanded"  file="layouts-expanded.svg"  />
                <ThumbCard selected={isMenuCollapsed}  onClick={() => setMenuCollapsed(true)}  label="Collapsed" file="layouts-collapsed.svg" />
              </div>
            </div>

            {/* Navbar Type */}
            <div className="mb-5">
              <Label>Navbar Type</Label>
              <div className="flex gap-3">
                <ThumbCard selected={navbarType === 'sticky'} onClick={() => applyNavbarType('sticky')} label="Sticky" file="navbar-sticky.svg" />
                <ThumbCard selected={navbarType === 'static'} onClick={() => applyNavbarType('static')} label="Static" file="navbar-static.svg" />
                <ThumbCard selected={navbarType === 'hidden'} onClick={() => applyNavbarType('hidden')} label="Hidden" file="navbar-hidden.svg" />
              </div>
            </div>

            {/* Content */}
            <div className="mb-5">
              <Label>Content</Label>
              <div className="flex gap-3">
                <ThumbCard selected={contentLayout === 'compact'} onClick={() => applyContentLayout('compact')} label="Compact" file="content-compact.svg" />
                <ThumbCard selected={contentLayout === 'wide'}    onClick={() => applyContentLayout('wide')}    label="Wide"    file="content-wide.svg"    />
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>
    </>
  );
};
