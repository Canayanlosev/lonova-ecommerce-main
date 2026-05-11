"use client";

import { motion } from "framer-motion";
import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
        {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, {
          size: 32,
          className: "text-slate-400",
        })}
      </div>
      <div>
        <p className="font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="premium-button text-sm">
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
