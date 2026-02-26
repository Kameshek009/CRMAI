"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { ShowingRow } from "@/types/crm";

const STATUS_DOT_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-gray-400",
  no_show: "bg-orange-500",
};

interface ShowingsCalendarProps {
  showings: ShowingRow[];
  onShowingClick: (showing: ShowingRow) => void;
  month: Date;
  onMonthChange: (date: Date) => void;
  locale?: string;
}

export function ShowingsCalendar({
  showings,
  onShowingClick,
  month,
  onMonthChange,
  locale,
}: ShowingsCalendarProps) {
  const { t } = useTranslation();
  const dateFnsLocale = locale === "ru" ? ru : undefined;

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const showingsByDay = useMemo(() => {
    const map = new Map<string, ShowingRow[]>();
    for (const s of showings) {
      const dayKey = format(new Date(s.showing_date), "yyyy-MM-dd");
      const arr = map.get(dayKey) || [];
      arr.push(s);
      map.set(dayKey, arr);
    }
    return map;
  }, [showings]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = days[i]!;
      return format(d, "EEEEEE", { locale: dateFnsLocale });
    });
  }, [days, dateFnsLocale]);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(month, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold capitalize">
            {format(month, "LLLL yyyy", { locale: dateFnsLocale })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-6"
            onClick={() => onMonthChange(new Date())}
          >
            {t("crm.showings.today")}
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayShowings = showingsByDay.get(dayKey) || [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);

          return (
            <div
              key={dayKey}
              className={cn(
                "min-h-[100px] border-b border-r p-1.5",
                !inMonth && "bg-muted/20"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground",
                  !inMonth && "text-muted-foreground/50"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayShowings.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onShowingClick(s)}
                    className={cn(
                      "w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded truncate",
                      "hover:bg-accent transition-colors",
                      s.status === "scheduled" && "bg-blue-500/10 text-blue-700 dark:text-blue-400",
                      s.status === "completed" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      s.status === "cancelled" && "bg-gray-500/10 text-gray-500",
                      s.status === "no_show" && "bg-orange-500/10 text-orange-700 dark:text-orange-400",
                    )}
                  >
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", STATUS_DOT_COLORS[s.status] || "bg-gray-400")} />
                    {format(new Date(s.showing_date), "HH:mm")} {s.title}
                  </button>
                ))}
                {dayShowings.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1.5">
                    +{dayShowings.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
