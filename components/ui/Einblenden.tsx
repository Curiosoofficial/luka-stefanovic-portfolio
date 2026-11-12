"use client";

import { motion } from "motion/react";

/** Blendet Inhalt beim ersten Erscheinen im Bild von unten ein. */
export function Einblenden({
  children,
  verzoegerung = 0,
  className = "",
}: {
  children: React.ReactNode;
  verzoegerung?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, delay: verzoegerung, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
