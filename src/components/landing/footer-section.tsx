// FILE: footer-section.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

function WaveDivider() {
  return (
    <div className="absolute top-0 left-0 right-0 -translate-y-full overflow-hidden">
      <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 sm:h-16">
        <path
          d="M0 60L48 52C96 44 192 28 288 24C384 20 480 28 576 32C672 36 768 36 864 32C960 28 1056 20 1152 20C1248 20 1344 28 1392 32L1440 36V60H0Z"
          fill="var(--background)"
          fillOpacity="0.5"
        />
        <path
          d="M0 60L48 56C96 52 192 44 288 40C384 36 480 36 576 38C672 40 768 44 864 44C960 44 1056 40 1152 36C1248 32 1344 28 1392 26L1440 24V60H0Z"
          fill="var(--background)"
        />
      </svg>
    </div>
  );
}

export function FooterSection() {
  const [email, setEmail] = useState("");
  const { t } = useTranslation();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success(t("landing.footer.newsletter.success"));
    setEmail("");
  };

  const footerLinks = [
    {
      title: t("landing.footer.columns.product.title"),
      links: [
        { label: t("landing.footer.columns.product.features"), href: "/#features" },
        { label: t("landing.footer.columns.product.pricing"), href: "/pricing" },
        { label: t("landing.footer.columns.product.aiAssistant"), href: "/#ai" },
        { label: t("landing.footer.columns.product.howItWorks"), href: "/#how-it-works" },
        { label: t("landing.footer.columns.product.testimonials"), href: "/#testimonials" },
      ],
    },
    {
      title: t("landing.footer.columns.company.title"),
      links: [
        { label: t("landing.footer.columns.company.about"), href: "/#how-it-works" },
        { label: t("landing.footer.columns.company.getStarted"), href: "/sign-up" },
        { label: t("landing.footer.columns.company.signIn"), href: "/sign-in" },
      ],
    },
    {
      title: t("landing.footer.columns.resources.title"),
      links: [
        { label: t("landing.footer.columns.resources.aiChat"), href: "/#ai" },
        { label: t("landing.footer.columns.resources.faq"), href: "/#faq" },
        { label: t("landing.footer.columns.resources.pipeline"), href: "/#features" },
        { label: t("landing.footer.columns.resources.analytics"), href: "/#features" },
      ],
    },
    {
      title: t("landing.footer.columns.legal.title"),
      links: [
        { label: t("landing.footer.columns.legal.privacy"), href: "/privacy" },
        { label: t("landing.footer.columns.legal.terms"), href: "/terms" },
        { label: t("landing.footer.columns.legal.security"), href: "/security" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-white/10 dark:border-white/10">
      <WaveDivider />

      {/* Top gradient line */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-landing-accent/30 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        {/* Brand + Newsletter */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-10 mb-12 pb-12 border-b border-white/10 dark:border-white/10">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-landing-accent flex items-center justify-center shadow-lg shadow-landing-accent/20">
                <span className="text-landing-accent-foreground text-sm font-bold">N</span>
              </div>
              <span className="text-lg font-bold text-foreground">Nexxus CRM</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("landing.footer.description")}
            </p>
          </div>

          {/* Newsletter */}
          <div className="w-full lg:w-auto">
            <p className="text-sm font-semibold text-foreground mb-3" id="newsletter-label">{t("landing.footer.newsletter.title")}</p>
            <form onSubmit={handleSubscribe} className="flex gap-2" aria-labelledby="newsletter-label">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("landing.footer.newsletter.placeholder")}
                required
                className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 text-sm text-foreground placeholder:text-muted-foreground/50 backdrop-blur-xl focus:outline-none focus:border-landing-accent/50 transition-colors w-full lg:w-64"
              />
              <button type="submit" className="h-11 px-6 rounded-xl bg-landing-accent text-landing-accent-foreground text-sm font-semibold shrink-0 hover:shadow-lg hover:shadow-landing-accent/20 transition-shadow">
                {t("landing.footer.newsletter.subscribe")}
              </button>
            </form>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-foreground mb-5">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 pt-8 border-t border-white/10 dark:border-white/10 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">{t("landing.footer.contact.text")}</p>
          <a
            href={`mailto:${t("landing.footer.contact.email")}`}
            className="text-sm font-medium text-foreground hover:underline transition-colors"
          >
            {t("landing.footer.contact.email")}
          </a>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 pt-8 border-t border-white/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-landing-accent flex items-center justify-center shadow-lg">
              <span className="text-landing-accent-foreground text-xs font-bold">N</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Nexxus CRM
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {t("landing.footer.copyright")}
          </p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.footer.privacy")}
            </Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.footer.terms")}
            </Link>
            <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.footer.security")}
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
