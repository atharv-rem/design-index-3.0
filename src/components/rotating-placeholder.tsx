"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const placeholders = [
  "ask anything",
  "dark mode portfolio",
  "minimalist website designs",
  "an icon library of 3d icons",
];

export default function RotatingPlaceholder() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative block h-[1.4em] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="block whitespace-nowrap"
        >
          {placeholders[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
