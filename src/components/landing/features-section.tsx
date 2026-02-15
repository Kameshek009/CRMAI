"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Zap,
  BarChart3,
  Users,
  Brain,
  GitBranch,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  gradient: string;
  mockup: FeatureMockupProps;
}

interface FeatureMockupProps {
  type: "pipeline" | "analytics" | "contacts";
}

function PipelineMockup() {
  const stages = [
    { name: "Lead", count: 12, color: "bg-blue-500", pct: 100 },
    { name: "Qualified", count: 8, color: "bg-violet-500", pct: 80 },
    { name: "Proposal", count: 5, color: "bg-purple-500", pct: 60 },
    { name: "Negotiation", count: 3, color: "bg-pink-500", pct: 40 },
    { name: "Won", count: 2, color: "bg-emerald-500", pct: 25 },
  ];
  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
          className="flex items-center gap-3"
        >
          <span className="text-[11px] text-muted-foreground w-20 shrink-0 text-right">{s.name}</span>
          <div className="flex-1 h-8 bg-muted/50 rounded-lg overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${s.pct}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
              className={`h-full ${s.color}/20 rounded-lg flex items-center px-3`}
            >
              <span className={`w-2 h-2 rounded-full ${s.color} mr-2`} />
              <span className="text-[11px] font-medium text-foreground">{s.count} deals</span>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 50];
  return (
    <div className="flex items-end gap-1.5 h-40">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
          className="flex-1 rounded-t-md bg-gradient-to-t from-violet-500/80 to-purple-400/40"
        />
      ))}
    </div>
  );
}

function ContactsMockup() {
  const contacts = [
    { name: "Sarah Chen", role: "VP Sales", score: 95, avatar: "SC" },
    { name: "Mike Johnson", role: "CTO", score: 88, avatar: "MJ" },
    { name: "Lisa Park", role: "Head of Growth", score: 82, avatar: "LP" },
    { name: "David Kim", role: "CEO", score: 79, avatar: "DK" },
  ];
  return (
    <div className="space-y-2">
      {contacts.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
          className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {c.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{c.role}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${c.score}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <span className="text-[10px] font-semibold text-emerald-500">{c.score}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FeatureMockup({ type }: FeatureMockupProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[10px] text-muted-foreground ml-2 font-medium">
          NexusCRM — {type === "pipeline" ? "Sales Pipeline" : type === "analytics" ? "Analytics" : "Contacts"}
        </span>
      </div>
      {type === "pipeline" && <PipelineMockup />}
      {type === "analytics" && <AnalyticsMockup />}
      {type === "contacts" && <ContactsMockup />}
    </div>
  );
}

const features: Feature[] = [
  {
    icon: GitBranch,
    title: "Visual Sales Pipeline",
    description: "Drag-and-drop deals through custom stages. See your entire funnel at a glance with real-time updates and automated stage transitions.",
    color: "text-blue-500",
    gradient: "from-blue-500/10 to-transparent",
    mockup: { type: "pipeline" },
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track conversion rates, revenue forecasts, and team performance with beautiful dashboards that update in real time.",
    color: "text-violet-500",
    gradient: "from-violet-500/10 to-transparent",
    mockup: { type: "analytics" },
  },
  {
    icon: Users,
    title: "Smart Contact Management",
    description: "AI-enriched contact profiles with lead scoring, activity timelines, and intelligent relationship mapping across your organization.",
    color: "text-emerald-500",
    gradient: "from-emerald-500/10 to-transparent",
    mockup: { type: "contacts" },
  },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reversed = index % 2 !== 0;
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16`}
    >
      <motion.div
        initial={{ opacity: 0, x: reversed ? 60 : -60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
        className="flex-1 max-w-lg"
      >
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-border mb-5`}>
          <Icon className={`w-6 h-6 ${feature.color}`} />
        </div>
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">{feature.title}</h3>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{feature.description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: reversed ? -60 : 60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.15 }}
        className="flex-1 w-full max-w-lg"
      >
        <FeatureMockup {...feature.mockup} />
      </motion.div>
    </div>
  );
}

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section id="features" ref={sectionRef} className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <motion.div style={{ y: bgY }} className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full bg-violet-500/[0.04] blur-[120px]" />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-24"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-md mb-4">
            <Zap className="w-3 h-3" />
            Powerful Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-blue-600 via-violet-500 to-purple-600 bg-clip-text text-transparent">close more deals</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete CRM toolkit designed for modern sales teams. Every feature built to save time and increase revenue.
          </p>
        </motion.div>

        <div className="flex flex-col gap-20 sm:gap-32">
          {features.map((f, i) => (
            <FeatureRow key={f.title} feature={f} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="mt-20 sm:mt-32"
        >
          <h3 className="text-center text-xl sm:text-2xl font-bold text-foreground mb-10">And so much more</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: "AI Assistant", desc: "Chat with AI about your deals, get suggestions, and automate follow-ups." },
              { icon: MessageSquare, title: "Email Sequences", desc: "Automated drip campaigns with smart scheduling and open tracking." },
              { icon: Zap, title: "Automations", desc: "Create triggers and actions to eliminate repetitive tasks entirely." },
              { icon: Users, title: "Team Collaboration", desc: "Share pipelines, assign deals, and keep everyone aligned." },
              { icon: BarChart3, title: "Custom Reports", desc: "Build any report you need with drag-and-drop widgets and filters." },
              { icon: GitBranch, title: "Integrations", desc: "Connect with 50+ tools — Slack, Gmail, Outlook, Zapier, and more." },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 20 }}
                  className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-border/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-violet-500/10 transition-colors">
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{f.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
