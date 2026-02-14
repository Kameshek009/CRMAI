"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Mail,
  Settings,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Contacts" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Calendar, label: "Calendar" },
  { icon: Mail, label: "Inbox" },
  { icon: Settings, label: "Settings" },
];

const deals = [
  { name: "Acme Corp", contact: "John Smith", value: "$24,500", status: "Won", statusColor: "bg-emerald-500" },
  { name: "Globex Inc", contact: "Sarah Lee", value: "$18,200", status: "In Progress", statusColor: "bg-blue-500" },
  { name: "Initech", contact: "Mike Chen", value: "$31,000", status: "Won", statusColor: "bg-emerald-500" },
  { name: "Stark Ltd", contact: "Anna Taylor", value: "$12,750", status: "Review", statusColor: "bg-amber-500" },
  { name: "Wayne Ent", contact: "Bruce K.", value: "$45,000", status: "In Progress", statusColor: "bg-blue-500" },
];

const statusIcon = (status: string) => {
  if (status === "Won") return <CheckCircle2 className="w-3 h-3" />;
  if (status === "In Progress") return <Clock className="w-3 h-3" />;
  return <AlertCircle className="w-3 h-3" />;
};

export function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 30, delay: 0.3 }}
      className="relative w-full max-w-[700px]"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] text-muted-foreground ml-2 font-medium">NexusCRM — Deals Pipeline</span>
        </div>

        <div className="flex min-h-[320px]">
          {/* Sidebar */}
          <div className="w-[140px] border-r border-border bg-muted/30 p-3 flex flex-col gap-0.5 shrink-0">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
              Workspace
            </span>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                    item.active
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Main content — deals table */}
          <div className="flex-1 p-3">
            {/* Header row */}
            <div className="grid grid-cols-4 gap-2 px-2 pb-2 border-b border-border mb-1">
              {["Deal", "Contact", "Value", "Status"].map((h) => (
                <span key={h} className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {deals.map((deal, i) => (
              <motion.div
                key={deal.name}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="grid grid-cols-4 gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <span className="text-[11px] font-medium text-foreground truncate">{deal.name}</span>
                <span className="text-[11px] text-muted-foreground truncate">{deal.contact}</span>
                <span className="text-[11px] font-medium text-foreground">{deal.value}</span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${deal.statusColor}`} />
                  <span className="text-[10px] text-muted-foreground">{deal.status}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Glow effect behind */}
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent blur-2xl" />
    </motion.div>
  );
}
