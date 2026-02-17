"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, MessageSquare, Target, TrendingUp, Bot, Wand2, Shield, Clock } from "lucide-react";

/* ---------- typewriter text ---------- */
function TypewriterText({ text, delay = 0, speed = 20, onDone }: {
  text: string; delay?: number; speed?: number; onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      onDone?.();
    }
  }, [started, displayed, text, speed, onDone]);

  return <>{displayed}<span className="animate-pulse">|</span></>;
}

/* ---------- chat messages ---------- */
const chatMessages = [
  { role: "user" as const, text: "Show me deals closing this month over $10k" },
  {
    role: "ai" as const,
    text: "Found 7 deals worth $142,500 total. 3 are in negotiation stage — Acme Corp ($45k), Globex ($28k), and Wayne Ent ($31k) need follow-ups this week.",
  },
  { role: "user" as const, text: "Draft follow-up emails for all three" },
  {
    role: "ai" as const,
    text: "Done! I've drafted personalized emails for each contact based on their last interaction. Acme: pricing discussion follow-up. Globex: demo feedback. Wayne: contract review.",
  },
];

function AIChatMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [visibleMessages, setVisibleMessages] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    chatMessages.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleMessages(i + 1), i * 1800 + 500));
    });
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 dark:border-white/10 bg-white/[0.02] dark:bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Bot className="w-3.5 h-3.5 text-landing-accent" />
          <span className="text-[11px] text-muted-foreground font-medium">Nexxus AI Assistant</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] text-emerald-400 font-medium">Online</span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="p-5 space-y-3.5 min-h-[320px]">
        <AnimatePresence mode="popLayout">
          {chatMessages.slice(0, visibleMessages).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-landing-accent text-white rounded-br-md shadow-lg shadow-landing-accent/10"
                    : "bg-white/[0.05] dark:bg-white/[0.05] border border-white/10 dark:border-white/10 text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "ai" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3 text-landing-accent" />
                    <span className="text-[10px] font-semibold text-landing-accent">AI</span>
                  </div>
                )}
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {visibleMessages >= chatMessages.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1.5 px-4 py-2"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full bg-landing-accent/50"
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground ml-1.5">AI is thinking...</span>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
          <Wand2 className="w-4 h-4 text-landing-accent/50" />
          <span className="text-[12px] text-muted-foreground/40 flex-1">Ask AI anything about your CRM...</span>
          <div className="w-7 h-7 rounded-lg bg-landing-accent flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- neural network particles ---------- */
// Pre-computed node positions to avoid Math.random() during SSR/hydration
const NEURAL_NODES = [
  { id: 0, x: 15, y: 25 }, { id: 1, x: 72, y: 18 }, { id: 2, x: 45, y: 55 },
  { id: 3, x: 88, y: 42 }, { id: 4, x: 30, y: 75 }, { id: 5, x: 62, y: 85 },
  { id: 6, x: 20, y: 48 }, { id: 7, x: 78, y: 68 }, { id: 8, x: 50, y: 32 },
  { id: 9, x: 35, y: 90 }, { id: 10, x: 85, y: 15 }, { id: 11, x: 55, y: 60 },
];

function NeuralNetworkBg() {
  const nodes = NEURAL_NODES;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-30">
      <svg className="absolute inset-0 w-full h-full">
        {/* Connections */}
        {nodes.map((n1, i) =>
          nodes.slice(i + 1).filter((_, j) => (i + j) % 3 === 0).map((n2) => (
            <motion.line
              key={`${n1.id}-${n2.id}`}
              x1={`${n1.x}%`} y1={`${n1.y}%`}
              x2={`${n2.x}%`} y2={`${n2.y}%`}
              stroke="url(#neural-gradient)"
              strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.3 }}
              viewport={{ once: true }}
              transition={{ duration: 2, delay: ((n1.id + n2.id) % 10) * 0.1 }}
            />
          ))
        )}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <motion.circle
            key={n.id}
            cx={`${n.x}%`}
            cy={`${n.y}%`}
            r="3"
            fill="url(#neural-gradient)"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.5 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
        <defs>
          <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--landing-accent)" />
            <stop offset="100%" stopColor="var(--landing-accent)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const capabilities = [
  {
    icon: Target,
    title: "AI Lead Scoring",
    description: "Automatically rank leads based on behavior, engagement, and fit. Focus on deals that matter most.",
    gradient: "from-landing-accent to-landing-accent",
    stat: "94%",
    statLabel: "Accuracy",
  },
  {
    icon: MessageSquare,
    title: "Smart Follow-ups",
    description: "AI drafts personalized emails based on conversation history, deal stage, and contact preferences.",
    gradient: "from-landing-accent to-landing-accent",
    stat: "3x",
    statLabel: "Response rate",
  },
  {
    icon: TrendingUp,
    title: "Revenue Forecasting",
    description: "Predict monthly revenue with AI that learns from your historical data and win rates.",
    gradient: "from-landing-accent to-landing-accent",
    stat: "±5%",
    statLabel: "Variance",
  },
  {
    icon: Brain,
    title: "Deal Insights",
    description: "Get AI-powered recommendations on next steps, risk alerts, and deal health analysis.",
    gradient: "from-landing-accent to-landing-accent",
    stat: "24/7",
    statLabel: "Monitoring",
  },
];

export function AISection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="ai"
      ref={sectionRef}
      className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.10) 0%, transparent 70%)",
            filter: "blur(120px)",
          }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <NeuralNetworkBg />

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-landing-accent/20 bg-landing-accent/10 px-5 py-2 text-xs font-semibold tracking-wide text-landing-accent backdrop-blur-xl mb-6">
            <Brain className="w-3.5 h-3.5" />
            AI-Powered
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            Your AI sales assistant
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
              that never sleeps
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Ask questions in natural language, get instant insights, automate follow-ups, and let AI handle the busywork while you focus on selling.
          </p>
        </motion.div>

        {/* Content: Chat + Capabilities */}
        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16">
          {/* Chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="flex-1 w-full max-w-xl relative"
          >
            <AIChatMockup />
            {/* Glow behind */}
            <div
              className="absolute -inset-8 -z-10 rounded-3xl"
              style={{
                background: "radial-gradient(ellipse at center, rgba(var(--landing-accent-rgb),0.12) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
          </motion.div>

          {/* Capability cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group relative rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl p-6 hover:border-white/20 dark:hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-landing-accent/10"
                >
                  {/* Hover glow */}
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${cap.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`}
                  />

                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-11 h-11 rounded-xl bg-gradient-to-br ${cap.gradient} opacity-0 group-hover:opacity-30 group-hover:scale-150 transition-all duration-700 blur-md`} />
                    </div>
                    {/* Stat badge */}
                    <div className="text-right">
                      <span className={`text-lg font-bold bg-gradient-to-r ${cap.gradient} bg-clip-text text-transparent`}>
                        {cap.stat}
                      </span>
                      <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{cap.statLabel}</p>
                    </div>
                  </div>

                  <h4 className="font-semibold text-foreground mb-2">{cap.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom AI metrics bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6"
        >
          {[
            { icon: Shield, label: "Enterprise Security", value: "SOC 2" },
            { icon: Clock, label: "Avg Response Time", value: "<1s" },
            { icon: Brain, label: "Models Trained On", value: "10B+" },
            { icon: Sparkles, label: "AI Actions/Day", value: "2M+" },
          ].map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-4"
              >
                <div className="w-9 h-9 rounded-xl bg-landing-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-landing-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{metric.value}</p>
                  <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
