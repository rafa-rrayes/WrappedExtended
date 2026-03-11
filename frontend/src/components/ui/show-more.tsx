"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShowMoreProps<T> {
  items: T[];
  initialCount: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function ShowMore<T>({
  items,
  initialCount,
  renderItem,
  className,
}: ShowMoreProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);
  const hiddenCount = items.length - initialCount;

  if (hiddenCount <= 0) {
    return (
      <div className={className}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    );
  }

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {visible.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderItem(item, i)}
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-sm text-text-secondary hover:text-green transition-colors flex items-center gap-1 mx-auto"
      >
        <span className="border-b border-green/30">
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </span>
      </button>
    </div>
  );
}
