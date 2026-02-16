"use client";

import { useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Brain,
  GitBranch,
  Users,
  BarChart3,
  Zap,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

interface BentoFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  iconGradient: string;
  size: "lg" | "md" | "sm";
}

const features: BentoFeature[] = [
  {
    icon: Brain,
    title: "AI-Powered CRM",
    description:
      "Let artificial intelligence score leads, predict outcomes, and draft follow-ups. Your AI co-pilot works 24/7 so you never miss an opportunity.",
    gradient: "from-[#a78bfa]/20 via-[#a78bfa]/10 to-transparent",
    iconGradient: "from-[#818cf8] to-[#a78bfa]",
    size: "lg",
  },
  {
    icon: GitBranch,
    title: "Pipeline Management",
    description:
      "Drag-and-drop deals through custom stages. Visualize your entire funnel with real-time updates and automated transitions.",
    gradient: "from-[#a78bfa]/20 via-[#f472b6]/10 to-transparent",
    iconGradient: "from-[#a78bfa] to-[#f472b6]",
    size: "md",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share pipelines, assign deals, mention teammates, and keep everyone aligned in real time.",
    gradient: "from-[#f472b6]/20 via-[#818cf8]/10 to-transparent",
    iconGradient: "from-[#f472b6] to-[#e879f9]",
    size: "sm",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Beautiful dashboards with conversion rates, revenue forecasts, and performance metrics that update in real time.",
    gradient: "from-[#818cf8]/20 via-[#a78bfa]/10 to-transparent",
    iconGradient: "from-[#818cf8] to-[#a78bfa]",
    size: "sm",
  },
  {
    icon: Zap,
    title: "Smart Automation",
    description:
      "Create triggers and workflows that eliminate repetitive tasks. Auto-assign leads, send follow-ups, update stages — hands free.",
    gradient: "from-[#e879f9]/20 via-[#f472b6]/10 to-transparent",
    iconGradient: "from-[#e879f9] to-[#f472b6]",
    size: "md",
  },
  {
    icon: RefreshCw,
    title: "Real-time Sync",
    description:
      "Instant sync across all devices. Connect with Gmail, Outlook, Slack, Zapier, and 50+ tools seamlessly.",
    gradient: "from-[#a78bfa]/20 via-[#818cf8]/10 to-transparent",
    iconGradient: "from-[#a78bfa] to-[#818cf8]",
    size: "lg",
  },
];

/* ---------- mouse-following glow card with 3D tilt ---------- */
function BentoCard({ feature, index }: { feature: BentoFeature; index: number }) {
  const Icon = feature.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothGlowX = useSpring(glowX, { stiffness: 200, damping: 30 });
  const smoothGlowY = useSpring(glowY, { stiffness: 200, damping: 30 });
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [6, -6]), { stiffness: 200, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-6, 6]), { stiffness: 200, damping: 25 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [glowX, glowY, mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 150,
        damping: 22,
      }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`landing-glass-card group relative overflow-hidden rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 transition-all duration-300 hover:border-white/20 dark:hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 ${
        feature.size === "lg"
          ? "md:col-span-2 md:row-span-2"
          : feature.size === "md"
          ? "md:col-span-2"
          : ""
      }`}
    >
      {/* Mouse-following glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(400px circle at ${smoothGlowX}px ${smoothGlowY}px, rgba(167,139,250,0.12), rgba(167,139,250,0.06), transparent 60%)`,
        }}
      />

      {/* Background gradient */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-40 group-hover:opacity-70 transition-opacity duration-500`}
      />

      {/* Hover glow border effect */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.05) 50%, rgba(244,114,182,0.1) 100%)",
        }}
      />

      <div className="relative z-10">
        {/* Icon with pulse ring */}
        <div className="relative mb-5 sm:mb-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.iconGradient} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          {/* Animated ring on hover */}
          <div className={`absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.iconGradient} opacity-0 group-hover:opacity-30 group-hover:scale-[1.6] transition-all duration-700 blur-md`} />
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
          {feature.description}
        </p>

        {/* Mini visual for large cards */}
        {feature.size === "lg" && (
          <div className="mt-6 sm:mt-8 flex items-center gap-3">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className={`h-1.5 rounded-full bg-gradient-to-r ${feature.iconGradient}`}
                animate={{ width: [12, 24, 16, 32, 12] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}

        {/* Subtle arrow on hover */}
        <motion.div
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-60 transition-opacity duration-300"
          initial={false}
        >
          <span className={`bg-gradient-to-r ${feature.iconGradient} bg-clip-text text-transparent`}>
            Learn more
          </span>
          <motion.span
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`bg-gradient-to-r ${feature.iconGradient} bg-clip-text text-transparent`}
          >
            &rarr;
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl mb-6">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Powerful Features
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            Everything you need to
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-[#a78bfa] via-[#a78bfa] to-[#f472b6] bg-clip-text text-transparent">
              close more deals
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A complete CRM toolkit designed for modern sales teams. Every feature built to save time and increase revenue.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5 auto-rows-auto">
          {features.map((feature, i) => (
            <BentoCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
