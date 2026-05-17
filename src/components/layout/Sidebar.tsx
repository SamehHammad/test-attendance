"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Monitor,
  Users,
  ClipboardList,
  ChevronRight,
  Fingerprint,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/devices", label: "الأجهزة", icon: Monitor },
  { href: "/dashboard/employees", label: "الموظفون", icon: Users },
  { href: "/dashboard/attendance", label: "سجلات الحضور", icon: ClipboardList },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-30 h-full w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col bg-gray-900 dark:bg-gray-950 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700/50">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
                <Fingerprint className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">ZK Attendance</p>
                <p className="text-[10px] text-gray-400">نظام الحضور والانصراف</p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              القائمة الرئيسية
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={onClose}>
                  <motion.div
                    whileHover={{ x: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-l from-blue-600/20 to-violet-600/20 text-white"
                        : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 rounded-xl bg-gradient-to-l from-blue-600/20 to-violet-600/20 border border-blue-500/20"
                      />
                    )}
                    <Icon className={cn("h-4.5 w-4.5 shrink-0 relative z-10", isActive && "text-blue-400")} size={18} />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="mr-auto h-4 w-4 text-blue-400 relative z-10 rotate-180" />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-700/50">
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                ZK
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">ZKTeco K40</p>
                <p className="text-[10px] text-gray-500">v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
