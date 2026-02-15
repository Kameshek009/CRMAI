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
      { label: "AI Chat", href: "/sign-up" },
      { label: "Pipeline", href: "/sign-up" },
      { label: "Analytics", href: "/sign-up" },
      { label: "Contacts", href: "/sign-up" },
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
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">Need help? Contact us at</p>
          <a href="mailto:support@nexuscrm.com" className="text-sm font-medium text-foreground hover:underline transition-colors">
            support@nexuscrm.com
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-bold">N</span>
            </div>
            <span className="text-sm font-semibold text-foreground">NexusCRM</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} NexusCRM. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Security
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
