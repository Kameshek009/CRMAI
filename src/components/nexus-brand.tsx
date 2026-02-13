"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const brandName = "NexusCRM";

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
        className="inline-block rounded-xl px-2 py-1.5 -ml-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      >
        <span
          className="text-lg font-semibold tracking-tight transition-all duration-500 ease-out text-[var(--foreground)] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:via-violet-500 group-hover:to-fuchsia-500 group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]"
          style={{ WebkitBackgroundClip: "text", backgroundClip: "text" }}
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
      className="truncate font-semibold text-[var(--foreground)] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:via-violet-500 group-hover:to-fuchsia-500 transition-all duration-500"
      style={{ WebkitBackgroundClip: "text", backgroundClip: "text" }}
    >
      {brandName}
    </span>
  );
}

export { brandName };
