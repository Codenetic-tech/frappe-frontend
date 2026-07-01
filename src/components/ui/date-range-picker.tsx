import * as React from "react";
import {
    addDays,
    addMonths,
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    getMonth,
    getYear,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    setMonth,
    setYear,
    startOfDay,
    startOfMonth,
    startOfToday,
    startOfWeek,
    subDays,
    subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DateRange = [Date, Date];

export interface DateRangePreset {
    label: string;
    value: DateRange;
}

export interface DateRangePickerProps {
    value: DateRange | null;
    onChange: (value: DateRange | null) => void;
    placeholder?: string;
    className?: string;
    /** date-fns format string used for the trigger label. */
    dateFormat?: string;
    presets?: DateRangePreset[];
    disabled?: boolean;
}

// Structure/spacing mirrors rsuite's DateRangePicker; colors use the app's
// own primary theme token (--primary) instead of rsuite's blue.
const rs = {
    trigger:
        "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
    popup: "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800",
    divider: "border-slate-200 dark:border-slate-800",
    textPrimary: "text-slate-800 dark:text-slate-200",
    textSecondary: "text-slate-500 dark:text-slate-400",
    hoverBg: "hover:bg-slate-100 dark:hover:bg-slate-800",
    rangeBg: "bg-primary/10",
    selectedBg: "bg-primary",
    link: "text-primary hover:text-primary/80",
};

const defaultPresets = (): DateRangePreset[] => {
    const today = startOfToday();
    return [
        { label: "Today", value: [startOfDay(today), endOfDay(today)] },
        { label: "Yesterday", value: [startOfDay(subDays(today, 1)), endOfDay(subDays(today, 1))] },
        { label: "Last 7 Days", value: [startOfDay(subDays(today, 6)), endOfDay(today)] },
    ];
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMM"));

function buildWeeks(month: Date): Date[][] {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const days: Date[] = [];
    let cursor = start;
    while (!isAfter(cursor, end)) {
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }
    return weeks;
}

interface MonthPanelProps {
    month: Date;
    rangeStart: Date | null;
    rangeEnd: Date | null;
    onNavigate: (direction: -1 | 1) => void;
    onJumpToMonth: (date: Date) => void;
    onDayClick: (day: Date) => void;
    onDayHover: (day: Date) => void;
}

const YEARS_PER_PAGE = 12;

const MonthPanel: React.FC<MonthPanelProps> = ({
    month,
    rangeStart,
    rangeEnd,
    onNavigate,
    onJumpToMonth,
    onDayClick,
    onDayHover,
}) => {
    const weeks = React.useMemo(() => buildWeeks(month), [month]);
    const today = startOfToday();
    const [view, setView] = React.useState<"days" | "months" | "years">("days");
    const [cursorYear, setCursorYear] = React.useState(() => getYear(month));
    const [yearsPageStart, setYearsPageStart] = React.useState(() => getYear(month) - (getYear(month) % YEARS_PER_PAGE));

    const openMonthView = () => {
        setCursorYear(getYear(month));
        setView("months");
    };

    const openYearView = () => {
        const y = cursorYear;
        setYearsPageStart(y - (y % YEARS_PER_PAGE));
        setView("years");
    };

    const handlePickMonth = (monthIndex: number) => {
        onJumpToMonth(setMonth(setYear(month, cursorYear), monthIndex));
        setView("days");
    };

    const handlePickYear = (year: number) => {
        setCursorYear(year);
        setView("months");
    };

    const handlePrev = () => {
        if (view === "months") setCursorYear((y) => y - 1);
        else if (view === "years") setYearsPageStart((y) => y - YEARS_PER_PAGE);
        else onNavigate(-1);
    };

    const handleNext = () => {
        if (view === "months") setCursorYear((y) => y + 1);
        else if (view === "years") setYearsPageStart((y) => y + YEARS_PER_PAGE);
        else onNavigate(1);
    };

    const handleTitleClick = () => {
        if (view === "days") openMonthView();
        else if (view === "months") openYearView();
        else setView("days");
    };

    const headerLabel =
        view === "months" ? String(cursorYear) : view === "years" ? `${yearsPageStart} - ${yearsPageStart + YEARS_PER_PAGE - 1}` : format(month, "MMMM yyyy");

    return (
        <div className="w-[300px] shrink-0 px-3 pt-3">
            <div className="mb-2 flex items-center justify-between px-0.5">
                <button
                    type="button"
                    onClick={handlePrev}
                    className={cn("flex h-7 w-7 items-center justify-center rounded", rs.hoverBg, rs.textSecondary)}
                    aria-label="Previous"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={handleTitleClick}
                    className={cn("rounded px-2 py-0.5 text-sm font-semibold transition-colors", rs.hoverBg, rs.textPrimary)}
                    aria-label="Change view"
                >
                    {headerLabel}
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className={cn("flex h-7 w-7 items-center justify-center rounded", rs.hoverBg, rs.textSecondary)}
                    aria-label="Next"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {view === "months" ? (
                <div className="grid grid-cols-3 gap-1.5 pb-3">
                    {MONTH_LABELS.map((label, index) => {
                        const isActive = cursorYear === getYear(month) && index === getMonth(month);
                        return (
                            <button
                                key={label}
                                type="button"
                                onClick={() => handlePickMonth(index)}
                                className={cn(
                                    "rounded-md py-2 text-sm font-medium transition-colors",
                                    isActive ? cn(rs.selectedBg, "text-primary-foreground") : cn(rs.textPrimary, rs.hoverBg),
                                )}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            ) : view === "years" ? (
                <div className="grid grid-cols-3 gap-1.5 pb-3">
                    {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearsPageStart + i).map((year) => {
                        const isActive = year === getYear(month);
                        return (
                            <button
                                key={year}
                                type="button"
                                onClick={() => handlePickYear(year)}
                                className={cn(
                                    "rounded-md py-2 text-sm font-medium transition-colors",
                                    isActive ? cn(rs.selectedBg, "text-primary-foreground") : cn(rs.textPrimary, rs.hoverBg),
                                )}
                            >
                                {year}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-7">
                        {WEEKDAYS.map((d) => (
                            <div key={d} className={cn("flex h-8 items-center justify-center text-[11px] font-medium", rs.textSecondary)}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7">
                            {week.map((day) => {
                                const outside = !isSameMonth(day, month);
                                const isStart = rangeStart && isSameDay(day, rangeStart);
                                const isEnd = rangeEnd && isSameDay(day, rangeEnd);
                                const inRange =
                                    rangeStart &&
                                    rangeEnd &&
                                    !isStart &&
                                    !isEnd &&
                                    isWithinInterval(day, { start: rangeStart, end: rangeEnd });
                                const isEdge = isStart || isEnd;
                                const isToday = isSameDay(day, today);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={cn(
                                            "relative h-10",
                                            inRange && rs.rangeBg,
                                            isStart && rangeEnd && !isSameDay(rangeStart!, rangeEnd) && cn("rounded-l-full", rs.rangeBg),
                                            isEnd && rangeStart && !isSameDay(rangeStart!, rangeEnd) && cn("rounded-r-full", rs.rangeBg),
                                        )}
                                    >
                                        <button
                                            type="button"
                                            disabled={outside}
                                            onClick={() => onDayClick(day)}
                                            onMouseEnter={() => onDayHover(day)}
                                            className={cn(
                                                "flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors",
                                                outside && "invisible",
                                                !outside && !isEdge && rs.textPrimary,
                                                !outside && !isEdge && !inRange && rs.hoverBg,
                                                isEdge && cn(rs.selectedBg, "font-semibold text-primary-foreground"),
                                                !isEdge && isToday && "font-bold text-primary ring-1 ring-inset ring-primary/40",
                                            )}
                                        >
                                            {format(day, "d")}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    value,
    onChange,
    placeholder = "Select date range",
    className,
    dateFormat = "dd/MM/yyyy",
    presets,
    disabled,
}) => {
    const initialLeftMonth = (v: DateRange | null) => (v ? startOfMonth(v[0]) : subMonths(startOfMonth(new Date()), 1));
    const initialRightMonth = (v: DateRange | null) =>
        v ? (isSameMonth(v[0], v[1]) ? addMonths(startOfMonth(v[0]), 1) : startOfMonth(v[1])) : startOfMonth(new Date());

    const [open, setOpen] = React.useState(false);
    const [leftMonth, setLeftMonth] = React.useState(() => initialLeftMonth(value));
    const [rightMonth, setRightMonth] = React.useState(() => initialRightMonth(value));
    const [draftStart, setDraftStart] = React.useState<Date | null>(value?.[0] ?? null);
    const [draftEnd, setDraftEnd] = React.useState<Date | null>(value?.[1] ?? null);
    const [pickingEnd, setPickingEnd] = React.useState(false);
    const [hoverDay, setHoverDay] = React.useState<Date | null>(null);

    const resolvedPresets = presets ?? defaultPresets();

    const resetDraftFromValue = React.useCallback(() => {
        setDraftStart(value?.[0] ?? null);
        setDraftEnd(value?.[1] ?? null);
        setLeftMonth(initialLeftMonth(value));
        setRightMonth(initialRightMonth(value));
        setPickingEnd(false);
        setHoverDay(null);
    }, [value]);

    const handleOpenChange = (next: boolean) => {
        if (next) resetDraftFromValue();
        setOpen(next);
    };

    const handleDayClick = (day: Date) => {
        if (!pickingEnd) {
            setDraftStart(day);
            setDraftEnd(null);
            setPickingEnd(true);
        } else {
            if (draftStart && isBefore(day, draftStart)) {
                setDraftEnd(draftStart);
                setDraftStart(day);
            } else {
                setDraftEnd(day);
            }
            setPickingEnd(false);
            setHoverDay(null);
        }
    };

    const handlePresetClick = (preset: DateRangePreset) => {
        onChange(preset.value);
        setOpen(false);
    };

    const handleOk = () => {
        if (draftStart && draftEnd) {
            onChange(isAfter(draftStart, draftEnd) ? [draftEnd, draftStart] : [draftStart, draftEnd]);
        } else {
            onChange(null);
        }
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const previewStart = draftStart;
    const previewEnd = pickingEnd && hoverDay ? hoverDay : draftEnd;
    const [displayStart, displayEnd] =
        previewStart && previewEnd && isAfter(previewStart, previewEnd)
            ? [previewEnd, previewStart]
            : [previewStart, previewEnd];

    const label = open && displayStart
        ? `${format(displayStart, dateFormat)} ~ ${displayEnd ? format(displayEnd, dateFormat) : ""}`
        : value
            ? `${format(value[0], dateFormat)} ~ ${format(value[1], dateFormat)}`
            : placeholder;

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "group flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        rs.trigger,
                        className,
                    )}
                >
                    <CalendarIcon className={cn("h-4 w-4 shrink-0", rs.textSecondary)} />
                    <span className={cn("flex-1 truncate text-left", !value && !(open && displayStart) && rs.textSecondary)}>{label}</span>
                    {value && !disabled && (
                        <X
                            onClick={handleClear}
                            className={cn(
                                "h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
                                rs.textSecondary,
                                "hover:text-slate-800 dark:hover:text-slate-200",
                            )}
                        />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className={cn("w-auto rounded-md border p-0 shadow-md", rs.popup)}
            >
                {/* Calendars */}
                <div className="flex">
                    <div className={cn("border-r", rs.divider)}>
                        <MonthPanel
                            month={leftMonth}
                            rangeStart={displayStart}
                            rangeEnd={displayEnd}
                            onNavigate={(dir) => setLeftMonth((m) => (dir === 1 ? addMonths(m, 1) : subMonths(m, 1)))}
                            onJumpToMonth={(date) => setLeftMonth(startOfMonth(date))}
                            onDayClick={handleDayClick}
                            onDayHover={setHoverDay}
                        />
                    </div>
                    <MonthPanel
                        month={rightMonth}
                        rangeStart={displayStart}
                        rangeEnd={displayEnd}
                        onNavigate={(dir) => setRightMonth((m) => (dir === 1 ? addMonths(m, 1) : subMonths(m, 1)))}
                        onJumpToMonth={(date) => setRightMonth(startOfMonth(date))}
                        onDayClick={handleDayClick}
                        onDayHover={setHoverDay}
                    />
                </div>

                {/* Footer: presets + OK */}
                <div className={cn("flex items-center justify-between border-t px-3 py-2", rs.divider)}>
                    <div className="flex items-center gap-3">
                        {resolvedPresets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => handlePresetClick(preset)}
                                className={cn("text-xs font-medium", rs.link)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleOk}
                        disabled={!draftStart || !draftEnd}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        OK
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

DateRangePicker.displayName = "DateRangePicker";
