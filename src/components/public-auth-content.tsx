"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function PublicAuthContent({
  title,
  subtitle,
  children,
  footerText,
  footerLinkLabel,
  footerLinkHref,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
}) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="flex-1 flex flex-col items-center justify-center px-4 py-12"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-[420px]"
      >
        <motion.div variants={item} className="mb-8">
          <motion.h1
            className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-2 text-sm text-[var(--muted-foreground)]"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28, type: "spring", stiffness: 300, damping: 30 }}
          >
            {subtitle}
          </motion.p>
        </motion.div>

        <motion.div
          variants={item}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 30, delay: 0.12 }}
          className="rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] p-0 overflow-hidden shadow-lg"
        >
          {children}
        </motion.div>

        <motion.p
          variants={item}
          className="mt-6 text-center text-sm text-[var(--muted-foreground)]"
        >
          {footerText}{" "}
          <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={footerLinkHref}
              className="font-medium text-[var(--foreground)] underline underline-offset-2 hover:opacity-80 transition-opacity rounded-lg px-1 py-0.5"
            >
              {footerLinkLabel}
            </Link>
          </motion.span>
        </motion.p>
      </motion.div>
    </motion.main>
  );
}
