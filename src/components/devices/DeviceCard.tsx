"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Monitor, Wifi, WifiOff, RefreshCw, Pencil, Trash2,
  MapPin, Hash, Calendar, Users, ClipboardList, MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import axios from "axios";
import toast from "react-hot-toast";

interface DeviceCardProps {
  device: {
    id: string;
    name: string;
    ip: string;
    port: number;
    location?: string | null;
    isActive: boolean;
    lastSync?: string | null;
    _count?: { employees: number; attendance: number };
  };
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  index: number;
}

export function DeviceCard({ device, onEdit, onDelete, onRefresh, index }: DeviceCardProps) {
  const [testingConn, setTestingConn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleTestConnection = async () => {
    setTestingConn(true);
    try {
      const res = await axios.post(`/api/devices/${device.id}/test-connection`);
      if (res.data.success) {
        toast.success(`✅ الجهاز ${device.name} متصل بنجاح`);
      } else {
        toast.error(`❌ فشل الاتصال: ${res.data.error}`);
      }
      onRefresh();
    } catch {
      toast.error("فشل في اختبار الاتصال");
    } finally {
      setTestingConn(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`/api/devices/${device.id}/sync`);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
      onRefresh();
    } catch {
      toast.error("فشل في مزامنة البيانات");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف الجهاز "${device.name}"؟`)) return;
    try {
      await axios.delete(`/api/devices/${device.id}`);
      toast.success("تم حذف الجهاز بنجاح");
      onDelete();
    } catch {
      toast.error("فشل في حذف الجهاز");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="group relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300"
    >
      {/* Status Indicator */}
      <div className="absolute top-4 left-4">
        <span className="relative flex h-2.5 w-2.5">
          {device.isActive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              device.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
        </span>
      </div>

      {/* Menu */}
      <div className="absolute top-3 right-3">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-8 z-20 w-36 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl py-1">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-3.5 w-3.5" /> تعديل
                </button>
                <button
                  onClick={() => { handleDelete(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Icon + Name */}
      <div className="mb-4 flex items-center gap-3 mt-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
          <Monitor className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
            {device.name}
          </h3>
          <Badge variant={device.isActive ? "success" : "default"}>
            {device.isActive ? (
              <><Wifi className="h-2.5 w-2.5" /> متصل</>
            ) : (
              <><WifiOff className="h-2.5 w-2.5" /> غير متصل</>
            )}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Hash className="h-3.5 w-3.5 text-blue-400" />
          <span dir="ltr" className="font-mono">
            {device.ip}:{device.port}
          </span>
        </div>
        {device.location && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3.5 w-3.5 text-violet-400" />
            <span>{device.location}</span>
          </div>
        )}
        {device.lastSync && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span>آخر مزامنة: {formatDateTime(device.lastSync)}</span>
          </div>
        )}
      </div>

      {/* Counts */}
      {device._count && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-0.5">
              <Users className="h-3 w-3" />
              <span className="text-[10px]">موظفون</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {device._count.employees}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-0.5">
              <ClipboardList className="h-3 w-3" />
              <span className="text-[10px]">سجلات</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {device._count.attendance}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleTestConnection}
          loading={testingConn}
          className="flex-1 text-xs"
        >
          <Wifi className="h-3.5 w-3.5" />
          اختبار الاتصال
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSync}
          loading={syncing}
          className="flex-1 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          مزامنة
        </Button>
      </div>
    </motion.div>
  );
}
