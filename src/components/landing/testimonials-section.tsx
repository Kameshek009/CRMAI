"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  { name: "Sarah Mitchell", role: "VP of Sales", company: "TechFlow", avatar: "SM", text: "NexusCRM transformed how our team sells. The AI insights alone helped us identify $200K in pipeline we were about to lose. We closed 40% more deals in Q1.", stars: 5 },
  { name: "James Rodriguez", role: "Head of Growth", company: "ScaleUp Inc", avatar: "JR", text: "We tried Salesforce, HubSpot, and Pipedrive. NexusCRM is the first CRM our sales team actually enjoys using. The AI assistant is like having an extra team member.", stars: 5 },
  { name: "Lena Park", role: "CEO", company: "Sparkline", avatar: "LP", text: "The pipeline view and AI scoring are game-changers. We went from spreadsheets to a real sales machine. Our conversion rate jumped 35% in two months.", stars: 5 },
  { name: "Marcus Chen", role: "Sales Director", company: "CloudBase", avatar: "MC", text: "Finally a CRM that doesn't feel like it was built in 2005. Clean, fast, and the AI actually delivers on its promises. My reps save 2 hours daily.", stars: 5 },
  { name: "Anna Williams", role: "Founder", company: "GrowthLab", avatar: "AW", text: "As a startup, we needed something powerful but simple. NexusCRM gave us enterprise features without the enterprise complexity. Best investment this year.", stars: 5 },
  { name: "David Kim", role: "CRO", company: "FinBridge", avatar: "DK", text: "The revenue forecasting is scary accurate. We planned our entire hiring roadmap based on NexusCRM predictions and hit targets within 5% variance.", stars: 5 },
];

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="testimonials" ref={ref} className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden bg-muted/30">
      <div className="pointer-events-none absolute top-[-15%] left-[50%] -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-purple-500/[0.04] blur-[120px]" />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-14 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-md mb-4">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            Loved by teams
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Don&apos;t take our word for it
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            See why thousands of sales teams switched to NexusCRM and never looked back.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 150, damping: 20 }}
              className="relative rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow group"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-muted-foreground/10 group-hover:text-violet-500/20 transition-colors" />
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.stars)].map((_, si) => (
                  <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">{t.avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role} at {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
