"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "AI Assistant", href: "/#ai" },
      { label: "Integrations", href: "/#features" },
      { label: "Testimonials", href: "/#testimonials" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#stats" },
      { label: "Pricing", href: "/pricing" },
      { label: "Get Started", href: "/sign-up" },
      { label: "Sign In", href: "/sign-in" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "AI Chat", href: "/#ai" },
      { label: "Pipeline", href: "/#features" },
      { label: "Analytics", href: "/#features" },
      { label: "Contacts", href: "/#features" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  },
];

export function FooterSection() {
  return (
    <footer className="relative border-t border-white/10 dark:border-white/10">
      {/* Top gradient line */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#a78bfa]/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
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
          <p className="text-sm text-muted-foreground">Need help? Contact us at</p>
          <a
            href="mailto:support@nexxuscrm.com"
            className="text-sm font-medium text-foreground hover:underline transition-colors"
          >
            support@nexxuscrm.com
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7ec4e3] to-[#a78bfa] flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Nexxus CRM
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nexxus CRM. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/security"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
