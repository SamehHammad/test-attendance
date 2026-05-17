"use client";

import { Menu, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Navbar({ onMenuClick, title = "لوحة التحكم" }: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell className="h-4.5 w-4.5" size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900" />
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4.5 w-4.5" size={18} /> : <Moon className="h-4.5 w-4.5" size={18} />}
        </motion.button>

        {/* Avatar */}
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer">
          ZK
        </div>
      </div>
    </header>
  );
}
