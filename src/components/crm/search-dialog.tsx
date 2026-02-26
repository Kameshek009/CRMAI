"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  User,
  Building2,
  Handshake,
  Loader2,
  CheckSquare,
  Plus,
  ArrowRight,
  LayoutGrid,
  Kanban,
  TrendingUp,
  MessageSquare,
  Settings,
  FileText,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchStore } from "@/stores/search-store";
import { useTranslation } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
}

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  section: "actions" | "navigation" | "search";
  action: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const typeIcons: Record<string, LucideIcon> = {
  contact: User,
  company: Building2,
  deal: Handshake,
  task: CheckSquare,
};

const typeRoutes: Record<string, string> = {
  contact: "/dashboard/contacts",
  company: "/dashboard/companies",
  deal: "/dashboard/deals",
  task: "/dashboard/tasks",
};

// ============================================================================
// Component
// ============================================================================

export function SearchDialog() {
  const { open: storeOpen, setOpen: setStoreOpen } = useSearchStore();
  const [localOpen, setLocalOpen] = useState(false);
  const open = storeOpen || localOpen;
  const setOpen = useCallback((v: boolean) => { setLocalOpen(v); setStoreOpen(v); }, [setStoreOpen]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search
  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/crm/search?q=${encodeURIComponent(q)}&limit=8`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Navigate helper
  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
  }, [router, setOpen]);

  // Build command items
  const staticActions: CommandItem[] = useMemo(() => [
    { id: "create-contact", label: t("nav.search.commands.createContact"), icon: Plus, section: "actions", action: () => navigate("/dashboard/contacts?create=1") },
    { id: "create-deal", label: t("nav.search.commands.createDeal"), icon: Plus, section: "actions", action: () => navigate("/dashboard/deals?create=1") },
    { id: "create-task", label: t("nav.search.commands.createTask"), icon: Plus, section: "actions", action: () => navigate("/dashboard/tasks?create=1") },
  ], [navigate, t]);

  const navItems: CommandItem[] = useMemo(() => [
    { id: "nav-overview", label: t("nav.search.pages.overview"), sublabel: t("nav.search.pages.overviewSub"), icon: LayoutGrid, section: "navigation", action: () => navigate("/dashboard") },
    { id: "nav-contacts", label: t("nav.search.pages.contacts"), sublabel: t("nav.search.pages.contactsSub"), icon: User, section: "navigation", action: () => navigate("/dashboard/contacts") },
    { id: "nav-deals", label: t("nav.search.pages.deals"), sublabel: t("nav.search.pages.dealsSub"), icon: Handshake, section: "navigation", action: () => navigate("/dashboard/deals") },
    { id: "nav-companies", label: t("nav.search.pages.organizations"), sublabel: t("nav.search.pages.organizationsSub"), icon: Building2, section: "navigation", action: () => navigate("/dashboard/companies") },
    { id: "nav-pipeline", label: t("nav.search.pages.pipeline"), sublabel: t("nav.search.pages.pipelineSub"), icon: Kanban, section: "navigation", action: () => navigate("/dashboard/pipeline") },
    { id: "nav-tasks", label: t("nav.search.pages.tasks"), sublabel: t("nav.search.pages.tasksSub"), icon: CheckSquare, section: "navigation", action: () => navigate("/dashboard/tasks") },
    { id: "nav-notes", label: t("nav.search.pages.notes"), sublabel: t("nav.search.pages.notesSub"), icon: FileText, section: "navigation", action: () => navigate("/dashboard/notes") },
    { id: "nav-call-logs", label: t("nav.search.pages.callLogs"), icon: Phone, section: "navigation", action: () => navigate("/dashboard/call-logs") },
    { id: "nav-analytics", label: t("nav.search.pages.analytics"), sublabel: t("nav.search.pages.analyticsSub"), icon: TrendingUp, section: "navigation", action: () => navigate("/dashboard/analytics") },
    { id: "nav-chat", label: t("nav.search.pages.aiChat"), sublabel: t("nav.search.pages.aiChatSub"), icon: MessageSquare, section: "navigation", action: () => navigate("/dashboard/chats") },
    { id: "nav-settings", label: t("nav.search.pages.settings"), sublabel: t("nav.search.pages.settingsSub"), icon: Settings, section: "navigation", action: () => navigate("/dashboard/account") },
  ], [navigate, t]);

  // Filter static items by query (fuzzy)
  const filteredStatic = useMemo(() => {
    if (!query) return [...staticActions, ...navItems];
    const q = query.toLowerCase();
    const all = [...staticActions, ...navItems];
    return all.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    );
  }, [query, staticActions, navItems]);

  // Convert search results to command items
  const searchItems: CommandItem[] = useMemo(() => {
    return results.map((r) => ({
      id: `search-${r.type}-${r.id}`,
      label: r.title,
      sublabel: r.subtitle,
      icon: typeIcons[r.type] || User,
      section: "search" as const,
      action: () => {
        const route = typeRoutes[r.type];
        if (route) navigate(`${route}/${r.id}`);
      },
    }));
  }, [results, navigate]);

  // All items in display order
  const allItems = useMemo(() => {
    if (!query) return filteredStatic;
    return [...searchItems, ...filteredStatic];
  }, [query, searchItems, filteredStatic]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allItems.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      allItems[selectedIndex].action();
    }
  };

  // Group items by section
  const sections = useMemo(() => {
    const groups: { label: string; items: { item: CommandItem; globalIndex: number }[] }[] = [];

    const sectionOrder = ["search", "actions", "navigation"] as const;
    const sectionLabels = {
      search: t("nav.search.groups.results"),
      actions: t("nav.search.groups.actions"),
      navigation: t("nav.search.groups.goTo"),
    };

    for (const section of sectionOrder) {
      const items = allItems
        .map((item, i) => ({ item, globalIndex: i }))
        .filter(({ item }) => item.section === section);
      if (items.length > 0) {
        groups.push({ label: sectionLabels[section], items });
      }
    }

    return groups;
  }, [allItems, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("nav.search.placeholder")}
            className="border-0 shadow-none focus-visible:ring-0 h-12"
            autoFocus
          />
          {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-1" aria-live="polite" aria-label={`${allItems.length} results`}>
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {section.label}
              </div>
              {section.items.map(({ item, globalIndex }) => {
                const Icon = item.icon;
                const isSelected = globalIndex === selectedIndex;
                return (
                  <button
                    key={item.id}
                    data-selected={isSelected}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors",
                      isSelected ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="text-muted-foreground ml-2 text-xs">{item.sublabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {query && !isLoading && allItems.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("nav.search.noResults")} &quot;{query}&quot;
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd> {t("nav.search.hints.navigate")}</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↵</kbd> {t("nav.search.hints.open")}</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> {t("nav.search.hints.close")}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
