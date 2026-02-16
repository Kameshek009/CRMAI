"use client";

import { useRef, useCallback } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "VP of Sales",
    company: "TechFlow",
    avatar: "SM",
    gradient: "from-[#7ec4e3] to-[#a78bfa]",
    text: "Nexxus CRM transformed how our team sells. The AI insights alone helped us identify $200K in pipeline we were about to lose. We closed 40% more deals in Q1.",
    stars: 5,
  },
  {
    name: "James Rodriguez",
    role: "Head of Growth",
    company: "ScaleUp Inc",
    avatar: "JR",
    gradient: "from-[#a78bfa] to-[#f472b6]",
    text: "We tried Salesforce, HubSpot, and Pipedrive. Nexxus CRM is the first CRM our sales team actually enjoys using. The AI assistant is like having an extra team member.",
    stars: 5,
  },
  {
    name: "Lena Park",
    role: "CEO",
    company: "Sparkline",
    avatar: "LP",
    gradient: "from-[#f472b6] to-[#f2b76c]",
    text: "The pipeline view and AI scoring are game-changers. We went from spreadsheets to a real sales machine. Our conversion rate jumped 35% in two months.",
    stars: 5,
  },
  {
    name: "Marcus Chen",
    role: "Sales Director",
    company: "CloudBase",
    avatar: "MC",
    gradient: "from-[#7eea9b] to-[#7ec4e3]",
    text: "Finally a CRM that doesn't feel like it was built in 2005. Clean, fast, and the AI actually delivers on its promises. My reps save 2 hours daily.",
    stars: 5,
  },
  {
    name: "Anna Williams",
    role: "Founder",
    company: "GrowthLab",
    avatar: "AW",
    gradient: "from-[#f2b76c] to-[#f472b6]",
    text: "As a startup, we needed something powerful but simple. Nexxus CRM gave us enterprise features without the enterprise complexity. Best investment this year.",
    stars: 5,
  },
  {
    name: "David Kim",
    role: "CRO",
    company: "FinBridge",
    avatar: "DK",
    gradient: "from-[#7ec4e3] to-[#7eea9b]",
    text: "The revenue forecasting is scary accurate. We planned our entire hiring roadmap based on Nexxus CRM predictions and hit targets within 5% variance.",
    stars: 5,
  },
  {
    name: "Elena Vasquez",
    role: "Sales Manager",
    company: "NovaTech",
    avatar: "EV",
    gradient: "from-[#a78bfa] to-[#7ec4e3]",
    text: "Onboarding new sales reps used to take weeks. With Nexxus CRM's AI assistant, new team members are productive from day one. Absolute game changer.",
    stars: 5,
  },
  {
    name: "Tom Bradley",
    role: "COO",
    company: "FlexPay",
    avatar: "TB",
    gradient: "from-[#f472b6] to-[#7eea9b]",
    text: "We switched from a $50k/year enterprise CRM to Nexxus and our team's productivity actually increased. The AI insights are unmatched at this price point.",
    stars: 5,
  },
];

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [5, -5]), { stiffness: 200, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-5, 5]), { stiffness: 200, damping: 25 });
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const smoothGlowX = useSpring(glowX, { stiffness: 200, damping: 30 });
  const smoothGlowY = useSpring(glowY, { stiffness: 200, damping: 30 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  }, [mouseX, mouseY, glowX, glowY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className="group relative flex-shrink-0 w-[340px] sm:w-[380px] rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-7 hover:border-white/20 dark:hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/5"
    >
      {/* Mouse-following glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(300px circle at ${smoothGlowX}px ${smoothGlowY}px, rgba(167,139,250,0.10), transparent 60%)`,
        }}
      />

      {/* Background glow on hover */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${t.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`}
      />

      {/* Quote icon */}
      <Quote className="absolute top-5 right-5 w-8 h-8 text-white/5 group-hover:text-[#a78bfa]/10 transition-colors duration-300" />

      {/* Stars */}
      <div className="flex gap-0.5 mb-4 relative z-10">
        {[...Array(t.stars)].map((_, si) => (
          <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>

      {/* Text */}
      <p className="text-sm sm:text-base text-foreground/90 leading-relaxed mb-6 relative z-10">
        &ldquo;{t.text}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-5 border-t border-white/10 dark:border-white/10 relative z-10">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-lg`}>
          {t.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">
            {t.role} at {t.company}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialMarquee({ reverse = false, speed = 40 }: { reverse?: boolean; speed?: number }) {
  const half1 = testimonials.slice(0, 4);
  const half2 = testimonials.slice(4);
  const items = reverse ? half2 : half1;
  const doubled = [...items, ...items];

  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <motion.div
        className="flex gap-5 sm:gap-6"
        animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
      </motion.div>
    </div>
  );
}

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="testimonials"
      ref={ref}
      className="relative py-24 sm:py-36 px-0 overflow-hidden"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(244,114,182,0.06) 0%, rgba(167,139,250,0.03) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="text-center mb-16 sm:mb-20 px-4 sm:px-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl mb-6">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          Loved by Teams
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
          Don&apos;t take our
          <br />
          <span className="landing-gradient-text bg-gradient-to-r from-[#f472b6] via-[#a78bfa] to-[#7ec4e3] bg-clip-text text-transparent">
            word for it
          </span>
        </h2>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          See why thousands of sales teams switched to Nexxus CRM and never looked back.
        </p>
      </motion.div>

      {/* Marquee rows */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <TestimonialMarquee speed={45} />
        <TestimonialMarquee reverse speed={50} />
      </div>
    </section>
  );
}
