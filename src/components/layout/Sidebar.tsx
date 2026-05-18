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
        <div className="flex h-full flex-col bg-white border-l border-gray-200">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 shadow-sm">
                <Fingerprint className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">ZK Attendance</p>
                <p className="text-[10px] text-gray-500">نظام الحضور والانصراف</p>
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
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            <p className="px-2 mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              القائمة الرئيسية
            </p>
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard" 
                ? pathname === item.href 
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={onClose} className="block">
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200", 
                        isActive ? "text-blue-600" : "text-gray-400 group-hover:scale-110"
                      )} 
                    />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
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
