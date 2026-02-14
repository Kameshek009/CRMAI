"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Brain, Sparkles, MessageSquare, Target, TrendingUp, Bot } from "lucide-react";

const chatMessages = [
  { role: "user" as const, text: "Show me deals closing this month over $10k" },
  { role: "ai" as const, text: "Found 7 deals worth $142,500 total. 3 are in negotiation stage — Acme Corp ($45k), Globex ($28k), and Wayne Ent ($31k) need follow-ups this week." },
  { role: "user" as const, text: "Draft follow-up emails for all three" },
  { role: "ai" as const, text: "Done! I've drafted personalized emails for each contact based on their last interaction. Acme: pricing discussion follow-up. Globex: demo feedback. Wayne: contract review." },
];

function AIChatMockup() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Bot className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] text-muted-foreground font-medium">NexusCRM AI Assistant</span>
        </div>
      </div>
      <div className="p-4 space-y-3 min-h-[280px]">
        {chatMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${msg.role === "user" ? "bg-foreground text-background rounded-br-md" : "bg-muted text-foreground rounded-bl-md border border-border"}`}>
              {msg.role === "ai" && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-semibold text-violet-500">AI</span>
                </div>
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
          className="flex items-center gap-1 px-3.5 py-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="w-1.5 h-1.5 rounded-full bg-violet-500/50"
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground ml-1.5">AI is thinking...</span>
        </motion.div>
      </div>
    </div>
  );
}

const capabilities = [
  { icon: Target, title: "AI Lead Scoring", description: "Automatically rank leads based on behavior, engagement, and fit. Focus on deals that matter most.", gradient: "from-blue-500 to-cyan-500" },
  { icon: MessageSquare, title: "Smart Follow-ups", description: "AI drafts personalized emails based on conversation history, deal stage, and contact preferences.", gradient: "from-violet-500 to-purple-500" },
  { icon: TrendingUp, title: "Revenue Forecasting", description: "Predict monthly revenue with AI that learns from your historical data and win rates.", gradient: "from-emerald-500 to-green-500" },
  { icon: Brain, title: "Deal Insights", description: "Get AI-powered recommendations on next steps, risk alerts, and deal health analysis.", gradient: "from-pink-500 to-rose-500" },
];

export function AISection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden bg-muted/30">
      <motion.div style={{ y: bgY }} className="pointer-events-none absolute top-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-violet-500/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-500/[0.05] blur-[100px]" />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-violet-600 dark:text-violet-400 backdrop-blur-md mb-4">
            <Brain className="w-3 h-3" />
            AI-Powered
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Your AI sales assistant{" "}
            <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">that never sleeps</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Ask questions in natural language, get instant insights, automate follow-ups, and let AI handle the busywork while you focus on selling.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="flex-1 w-full max-w-xl relative"
          >
            <AIChatMockup />
            <div className="absolute -inset-8 -z-10 rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent blur-3xl" />
          </motion.div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                  className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1.5">{cap.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
