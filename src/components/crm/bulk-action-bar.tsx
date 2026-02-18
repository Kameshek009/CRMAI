"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown, Trash2 } from "lucide-react";

export interface BulkAction {
  label: string;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  onClick?: () => void;
  dropdown?: { label: string; value: string }[];
  onDropdownSelect?: (value: string) => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  actions: BulkAction[];
}

export function BulkActionBar({ selectedCount, onDeselectAll, actions }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-lg border bg-background px-4 py-2 shadow-lg"
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-7 px-2" aria-label="Clear selection">
            <X className="size-3.5" />
            Clear
          </Button>
          <div className="h-5 w-px bg-border" />
          {actions.map((action) =>
            action.dropdown ? (
              <DropdownMenu key={action.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    {action.icon}
                    {action.label}
                    <ChevronDown className="size-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {action.dropdown.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => action.onDropdownSelect?.(item.value)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={action.label}
                variant={action.variant === "destructive" ? "destructive" : "outline"}
                size="sm"
                className="h-7"
                onClick={action.onClick}
              >
                {action.icon || (action.variant === "destructive" && <Trash2 className="size-3.5 mr-1" />)}
                {action.label}
              </Button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
