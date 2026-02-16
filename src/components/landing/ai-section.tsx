"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Sparkles, MessageSquare, Target, TrendingUp, Bot } from "lucide-react";

const chatMessages = [
  { role: "user" as const, text: "Show me deals closing this month over $10k" },
  {
    role: "ai" as const,
    text: "Found 7 deals worth $142,500 total. 3 are in negotiation stage -- Acme Corp ($45k), Globex ($28k), and Wayne Ent ($31k) need follow-ups this week.",
  },
  { role: "user" as const, text: "Draft follow-up emails for all three" },
  {
    role: "ai" as const,
    text: "Done! I've drafted personalized emails for each contact based on their last interaction. Acme: pricing discussion follow-up. Globex: demo feedback. Wayne: contract review.",
  },
];

function AIChatMockup() {
  return (
    <div className="rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 dark:border-white/10 bg-white/[0.02] dark:bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Bot className="w-3.5 h-3.5 text-[#a78bfa]" />
          <span className="text-[11px] text-muted-foreground font-medium">
            Nexxus AI Assistant
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="p-5 space-y-3.5 min-h-[300px]">
        {chatMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              delay: i * 0.2,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-[#7ec4e3] to-[#a78bfa] text-white rounded-br-md shadow-lg"
                  : "bg-white/[0.05] dark:bg-white/[0.05] border border-white/10 dark:border-white/10 text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "ai" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#a78bfa]" />
                  <span className="text-[10px] font-semibold text-[#a78bfa]">
                    AI
                  </span>
                </div>
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
          className="flex items-center gap-1.5 px-4 py-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
                className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]/50"
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground ml-1.5">
            AI is thinking...
          </span>
        </motion.div>
      </div>
    </div>
  );
}

const capabilities = [
  {
    icon: Target,
    title: "AI Lead Scoring",
    description:
      "Automatically rank leads based on behavior, engagement, and fit. Focus on deals that matter most.",
    gradient: "from-[#7ec4e3] to-[#a78bfa]",
  },
  {
    icon: MessageSquare,
    title: "Smart Follow-ups",
    description:
      "AI drafts personalized emails based on conversation history, deal stage, and contact preferences.",
    gradient: "from-[#a78bfa] to-[#f472b6]",
  },
  {
    icon: TrendingUp,
    title: "Revenue Forecasting",
    description:
      "Predict monthly revenue with AI that learns from your historical data and win rates.",
    gradient: "from-[#7eea9b] to-[#7ec4e3]",
  },
  {
    icon: Brain,
    title: "Deal Insights",
    description:
      "Get AI-powered recommendations on next steps, risk alerts, and deal health analysis.",
    gradient: "from-[#f472b6] to-[#f2b76c]",
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
            background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)",
            filter: "blur(120px)",
          }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(126,196,227,0.06) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#a78bfa]/20 bg-[#a78bfa]/10 px-5 py-2 text-xs font-semibold tracking-wide text-[#a78bfa] backdrop-blur-xl mb-6">
            <Brain className="w-3.5 h-3.5" />
            AI-Powered
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            Your AI sales assistant
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-[#a78bfa] via-[#f472b6] to-[#7ec4e3] bg-clip-text text-transparent">
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
                background: "radial-gradient(ellipse at center, rgba(167,139,250,0.1) 0%, transparent 70%)",
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
                  whileHover={{ y: -4 }}
                  className="group relative rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl p-6 hover:border-white/20 dark:hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/5"
                >
                  {/* Hover glow */}
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${cap.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`}
                  />

                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {cap.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
