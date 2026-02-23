"use client";

import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n";

interface TimeAgoProps {
  date: string | Date;
  className?: string;
}

function getRelativeTime(date: Date, locale: string): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const isRu = locale.startsWith("ru");

  if (seconds < 60) return isRu ? "только что" : "just now";
  if (minutes < 60) return isRu ? `${minutes} мин назад` : `${minutes}m ago`;
  if (hours < 24) return isRu ? `${hours} ч назад` : `${hours}h ago`;
  if (days === 1) return isRu ? "вчера" : "yesterday";
  if (days < 7) return isRu ? `${days} дн назад` : `${days}d ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return isRu ? `${weeks} нед назад` : `${weeks}w ago`;
  }

  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const { locale } = useTranslation();
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const [relative, setRelative] = useState(() => getRelativeTime(dateObj, locale));

  useEffect(() => {
    setRelative(getRelativeTime(dateObj, locale));
    const interval = setInterval(() => {
      setRelative(getRelativeTime(dateObj, locale));
    }, 60_000);
    return () => clearInterval(interval);
  }, [dateObj, locale]);

  const absolute = dateObj.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={dateObj.toISOString()} className={className}>
            {relative}
          </time>
        </TooltipTrigger>
        <TooltipContent>
          <p>{absolute}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
