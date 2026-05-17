"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient: string;
  delay?: number;
}

export function StatCard({ title, value, subtitle, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Background glow */}
      <div className={cn("absolute -top-6 -left-6 h-24 w-24 rounded-full opacity-10 blur-2xl", gradient)} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", gradient)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}
