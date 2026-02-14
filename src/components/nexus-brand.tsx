"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const brandName = "Nexxus CRM";

export function NexusBrandHeader() {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group"
    >
      <Link
        href="/"
        className="inline-block rounded-xl px-2 py-1.5 -ml-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          className="text-sm sm:text-lg font-semibold tracking-tight text-foreground whitespace-nowrap"
        >
          {brandName}
        </span>
      </Link>
    </motion.div>
  );
}

export function NexusBrandSidebar() {
  return (
    <span
      className="truncate font-semibold text-foreground"
    >
      {brandName}
    </span>
  );
}

export { brandName };
