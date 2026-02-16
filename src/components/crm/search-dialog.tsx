"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User, Building2, Handshake, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchStore } from "@/stores/search-store";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
}

const typeIcons: Record<string, typeof User> = {
  contact: User,
  company: Building2,
  deal: Handshake,
};

const typeRoutes: Record<string, string> = {
  contact: "/dashboard/contacts",
  company: "/dashboard/companies",
  deal: "/dashboard/deals",
};

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
  const router = useRouter();

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

  // Search
  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/crm/search?q=${encodeURIComponent(q)}&limit=10`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        setSelectedIndex(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    const route = typeRoutes[result.type];
    if (route) {
      router.push(`${route}/${result.id}`);
      setOpen(false);
      setQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contacts, companies, deals..."
            className="border-0 shadow-none focus-visible:ring-0 h-12"
            autoFocus
          />
          {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {Object.entries(grouped).map(([type, items]) => {
              const Icon = typeIcons[type] || User;
              return (
                <div key={type}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    {type}s
                  </div>
                  {items.map((item) => {
                    const globalIndex = results.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                          globalIndex === selectedIndex && "bg-muted"
                        )}
                      >
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {query && !isLoading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No results found for &quot;{query}&quot;
          </div>
        )}

        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">↵</kbd> Open</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
