"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckSquare, BarChart2, LayoutGrid, Calendar, MessageCircle, Phone, Inbox, Film, FileText, Layout, BookOpen, ClipboardList, Clock, Zap, Timer, Grid3X3, Link2, Download, Play, BookMarked, HelpCircle, GraduationCap, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggleSlider } from "./theme-toggle-slider";
import { NexusBrandHeader } from "./nexus-brand";

type ColumnItem = { label: string; href: string; icon: LucideIcon };

const PRODUCT_COLUMNS: { title: string; items: ColumnItem[] }[] = [
  {
    title: "PROJECTS",
    items: [
      { label: "Tasks", href: "#", icon: CheckSquare },
      { label: "Dashboards", href: "#", icon: BarChart2 },
      { label: "Board view", href: "#", icon: LayoutGrid },
      { label: "Gantt", href: "#", icon: Calendar },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Chat", href: "#", icon: MessageCircle },
      { label: "SyncUp", href: "#", icon: Phone },
      { label: "Inbox", href: "#", icon: Inbox },
      { label: "Clips", href: "#", icon: Film },
    ],
  },
  {
    title: "KNOWLEDGE",
    items: [
      { label: "Docs", href: "#", icon: FileText },
      { label: "Whiteboards", href: "#", icon: Layout },
      { label: "Wiki", href: "#", icon: BookOpen },
      { label: "Forms", href: "#", icon: ClipboardList },
    ],
  },
  {
    title: "TIME",
    items: [
      { label: "Calendar", href: "#", icon: Calendar },
      { label: "Scheduling", href: "#", icon: Clock },
      { label: "Automations", href: "#", icon: Zap },
      { label: "Time tracking", href: "#", icon: Timer },
    ],
  },
  {
    title: "MORE",
    items: [
      { label: "All features", href: "#", icon: Grid3X3 },
      { label: "Integrations", href: "#", icon: Link2 },
      { label: "Downloads", href: "#", icon: Download },
      { label: "Watch demo", href: "#", icon: Play },
    ],
  },
];

const LEARN_COLUMNS: { title: string; items: ColumnItem[] }[] = [
  {
    title: "RESOURCES",
    items: [
      { label: "Blog", href: "#", icon: BookMarked },
      { label: "Guides", href: "#", icon: BookOpen },
      { label: "FAQ", href: "#", icon: HelpCircle },
      { label: "Help Center", href: "#", icon: HelpCircle },
    ],
  },
  {
    title: "LEARNING",
    items: [
      { label: "Tutorials", href: "#", icon: GraduationCap },
      { label: "Webinars", href: "#", icon: Video },
      { label: "Documentation", href: "#", icon: FileText },
      { label: "API", href: "#", icon: Link2 },
    ],
  },
];

function MegaDropdown({
  label,
  columns,
  open,
  onOpen,
  onClose,
}: {
  label: string;
  columns: { title: string; items: ColumnItem[] }[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onOpen();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(onClose, 150);
  };

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.button
        type="button"
        className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--foreground)] bg-transparent hover:bg-[var(--muted)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        {label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="absolute left-0 top-full mt-1 w-[max(90vw,640px)] max-w-[880px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl z-50"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-6">
              {columns.map((col, colIndex) => (
                <motion.div
                  key={col.title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: colIndex * 0.03 }}
                  className="flex flex-col gap-3"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    {col.title}
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {col.items.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                          >
                            <span className="text-[var(--muted-foreground)]">
                              <Icon className="w-4 h-4" />
                            </span>
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PublicAuthHeader() {
  const [openDropdown, setOpenDropdown] = useState<"product" | "learn" | null>(null);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 flex items-center justify-between h-16 pl-10 pr-6 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]"
    >
      <div className="flex items-center gap-1">
        <NexusBrandHeader />

        <nav className="flex items-center gap-0.5 ml-6">
          <MegaDropdown
            label="Product"
            columns={PRODUCT_COLUMNS}
            open={openDropdown === "product"}
            onOpen={() => setOpenDropdown("product")}
            onClose={() => setOpenDropdown(null)}
          />
          <MegaDropdown
            label="Learn"
            columns={LEARN_COLUMNS}
            open={openDropdown === "learn"}
            onOpen={() => setOpenDropdown("learn")}
            onClose={() => setOpenDropdown(null)}
          />
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="#"
              className="flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Pricing
            </Link>
          </motion.div>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 25 }}
        >
          <ThemeToggleSlider />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center gap-2"
        >
          <Link
            href="/sign-in"
            className="h-10 px-5 inline-flex items-center justify-center rounded-xl text-sm font-medium border-2 border-[var(--foreground)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-200"
          >
            Войти
          </Link>
          <Link
            href="/sign-up"
            className="h-10 px-5 inline-flex items-center justify-center rounded-xl text-sm font-medium bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all duration-200 shadow-sm"
          >
            Регистрация
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}
