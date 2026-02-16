"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

/* ---------- floating particles ---------- */
function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0.2, 0.6, 0.3, 0.5, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section
      id="cta"
      ref={ref}
      className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden"
    >
      <motion.div style={{ scale, opacity }} className="mx-auto max-w-5xl">
        <div className="relative rounded-[2rem] overflow-hidden p-1">
          {/* Animated gradient border */}
          <div
            className="absolute inset-0 rounded-[2rem] landing-gradient-border"
            style={{
              background:
                "linear-gradient(135deg, #7ec4e3, #a78bfa, #f472b6, #7eea9b, #7ec4e3)",
              backgroundSize: "400% 400%",
            }}
          />

          {/* Inner card */}
          <div className="relative rounded-[calc(2rem-4px)] bg-background/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl p-10 sm:p-16 md:p-20 text-center overflow-hidden">
            {/* Background gradient orbs */}
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute top-[-30%] left-[-10%] h-[500px] w-[500px] rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
                  filter: "blur(80px)",
                }}
              />
              <div
                className="absolute bottom-[-30%] right-[-10%] h-[400px] w-[400px] rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(126,196,227,0.12) 0%, transparent 70%)",
                  filter: "blur(80px)",
                }}
              />
              <div
                className="absolute top-[20%] right-[20%] h-[300px] w-[300px] rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)",
                  filter: "blur(60px)",
                }}
              />
            </div>

            <FloatingParticles />

            {/* Grid pattern */}
            <div className="pointer-events-none absolute inset-0">
              <svg
                className="absolute inset-0 h-full w-full opacity-[0.03]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="cta-grid"
                    width="30"
                    height="30"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 30 0 L 0 0 0 30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-grid)" />
              </svg>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative z-10"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-5 py-2 text-xs font-semibold text-[#a78bfa] mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                Start for free today
              </div>

              {/* Heading */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground mb-6">
                Ready to supercharge
                <br className="hidden sm:block" />
                <span className="landing-gradient-text bg-gradient-to-r from-[#7ec4e3] via-[#a78bfa] to-[#f472b6] bg-clip-text text-transparent">
                  {" "}your sales?
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
                Join 10,000+ teams already using Nexxus CRM to close more deals, faster. Free forever -- no credit card required.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href="/sign-up"
                    className="landing-pulse-button group relative inline-flex items-center gap-2.5 h-14 sm:h-16 px-10 sm:px-12 rounded-2xl text-base sm:text-lg font-semibold bg-gradient-to-r from-[#7ec4e3] via-[#a78bfa] to-[#f472b6] text-white shadow-2xl shadow-purple-500/25 transition-shadow hover:shadow-purple-500/40"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href="#pricing"
                    className="inline-flex items-center gap-2.5 h-14 sm:h-16 px-10 sm:px-12 rounded-2xl text-base sm:text-lg font-semibold border border-white/15 dark:border-white/15 bg-white/5 dark:bg-white/5 text-foreground backdrop-blur-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all"
                  >
                    View Pricing
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
