"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { ChevronDown, CheckSquare, BarChart2, LayoutGrid, Calendar, MessageCircle, Phone, Inbox, Film, FileText, Layout, BookOpen, ClipboardList, Clock, Zap, Timer, Grid3X3, Link2, Download, Play, BookMarked, HelpCircle, GraduationCap, Video, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggleSlider } from "./theme-toggle-slider";
import { NexusBrandHeader } from "./nexus-brand";

type ColumnItem = { label: string; href: string; icon: LucideIcon };

const PRODUCT_COLUMNS: { title: string; items: ColumnItem[] }[] = [
  {
    title: "PROJECTS",
    items: [
      { label: "Tasks", href: "/#features", icon: CheckSquare },
      { label: "Dashboards", href: "/#features", icon: BarChart2 },
      { label: "Board view", href: "/#features", icon: LayoutGrid },
      { label: "Gantt", href: "/#features", icon: Calendar },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Chat", href: "/#ai", icon: MessageCircle },
      { label: "SyncUp", href: "/#ai", icon: Phone },
      { label: "Inbox", href: "/#features", icon: Inbox },
      { label: "Clips", href: "/#features", icon: Film },
    ],
  },
  {
    title: "KNOWLEDGE",
    items: [
      { label: "Docs", href: "/#features", icon: FileText },
      { label: "Whiteboards", href: "/#features", icon: Layout },
      { label: "Wiki", href: "/#features", icon: BookOpen },
      { label: "Forms", href: "/#features", icon: ClipboardList },
    ],
  },
  {
    title: "TIME",
    items: [
      { label: "Calendar", href: "/#features", icon: Calendar },
      { label: "Scheduling", href: "/#features", icon: Clock },
      { label: "Automations", href: "/#ai", icon: Zap },
      { label: "Time tracking", href: "/#features", icon: Timer },
    ],
  },
  {
    title: "MORE",
    items: [
      { label: "All features", href: "/#features", icon: Grid3X3 },
      { label: "Integrations", href: "/#features", icon: Link2 },
      { label: "Get started", href: "/sign-up", icon: Download },
      { label: "Watch demo", href: "/#ai", icon: Play },
    ],
  },
];

const LEARN_COLUMNS: { title: string; items: ColumnItem[] }[] = [
  {
    title: "RESOURCES",
    items: [
      { label: "Blog", href: "/#testimonials", icon: BookMarked },
      { label: "Guides", href: "/#features", icon: BookOpen },
      { label: "FAQ", href: "/pricing", icon: HelpCircle },
      { label: "Help Center", href: "/#cta", icon: HelpCircle },
    ],
  },
  {
    title: "LEARNING",
    items: [
      { label: "Tutorials", href: "/#ai", icon: GraduationCap },
      { label: "Webinars", href: "/#ai", icon: Video },
      { label: "Documentation", href: "/#features", icon: FileText },
      { label: "API", href: "/#features", icon: Link2 },
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
        className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground bg-transparent hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="absolute left-0 top-full mt-1 w-[max(90vw,640px)] max-w-[880px] rounded-2xl border border-white/10 bg-background/90 dark:bg-[#0a0b14]/90 backdrop-blur-2xl p-6 shadow-2xl shadow-black/10 z-50"
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
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {col.title}
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {col.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <span className="text-muted-foreground">
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

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border p-6 flex flex-col gap-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <NexusBrandHeader />
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              <Link href="/#features" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Product
              </Link>
              <Link href="/#ai" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Learn
              </Link>
              <Link href="/pricing" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Pricing
              </Link>
            </nav>

            <div className="flex items-center px-3">
              <ThemeToggleSlider />
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <Link
                href="/sign-in"
                onClick={onClose}
                className="h-11 inline-flex items-center justify-center rounded-xl text-sm font-medium border-2 border-foreground bg-background text-foreground hover:bg-muted transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={onClose}
                className="h-11 inline-flex items-center justify-center rounded-xl text-sm font-medium bg-foreground text-background hover:opacity-90 transition-all shadow-sm"
              >
                Get started
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function PublicAuthHeader() {
  const [openDropdown, setOpenDropdown] = useState<"product" | "learn" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`sticky top-0 z-50 flex items-center justify-between h-12 sm:h-16 px-3 sm:px-6 lg:pl-10 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/5"
            : "bg-background/50 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <div className="flex items-center gap-1">
          <NexusBrandHeader />

          <nav className="hidden md:flex items-center gap-0.5 ml-6">
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
                href="/pricing"
                className="flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Pricing
              </Link>
            </motion.div>
          </nav>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
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
              className="h-10 px-5 inline-flex items-center justify-center rounded-xl text-sm font-medium border border-white/15 bg-white/5 text-foreground hover:bg-white/10 backdrop-blur-xl transition-all duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="h-10 px-5 inline-flex items-center justify-center rounded-xl text-sm font-medium bg-gradient-to-r from-[#a78bfa] via-[#a78bfa] to-[#f472b6] text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200"
            >
              Get started
            </Link>
          </motion.div>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggleSlider />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        {/* Scroll progress bar */}
        <ScrollProgress />
      </motion.header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg, #a78bfa, #a78bfa, #f472b6, #7eea9b)",
      }}
    />
  );
}
