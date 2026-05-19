"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Monitor, Wifi, WifiOff, RefreshCw, Pencil, Trash2,
  MapPin, Hash, Calendar, Users, ClipboardList, MoreVertical,
  Settings
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
        console.log("============= سجلات الحضور الخام (في المتصفح) =============");
        console.table(res.data.data);
        console.log("============= المستخدمين المسجلين بالجهاز =============");
        console.table(res.data.debug?.users);
        console.log("============= معلومات نظام الجهاز =============");
        console.dir(res.data.debug?.info, { depth: null });
        console.log("=========================================================");
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
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="group relative rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all duration-300"
    >
      {/* Menu & Settings */}
      <div className="absolute top-3 left-3 flex items-center gap-1">
        <Link
          href={`/dashboard/devices/${device.id}`}
          title="التحكم المتقدم وضبط العتاد"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </Link>
        
        <div className="relative z-50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 w-36 rounded-xl border border-gray-200 bg-white shadow-2xl py-1 flex flex-col overflow-hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 text-right transition-colors"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-gray-400" /> 
                  <span>تعديل</span>
                </button>
                <div className="h-px bg-gray-100 w-full" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 text-right transition-colors"
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-rose-500" /> 
                  <span>حذف</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Icon + Name */}
      <div className="mb-5 flex items-center gap-3 mt-1">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100/50 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-300">
          <Monitor className="h-6 w-6 text-blue-600" />
          
          {/* Status Indicator */}
          <span className="absolute -top-1 -left-1 flex h-3 w-3">
            {device.isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full border-2 border-white ${
                device.isActive ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-semibold text-gray-900 text-sm leading-none">
            {device.name}
          </h3>
          <Badge variant={device.isActive ? "success" : "default"} className="w-fit">
            {device.isActive ? (
              <><Wifi className="h-3 w-3" /> متصل</>
            ) : (
              <><WifiOff className="h-3 w-3" /> غير متصل</>
            )}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Hash className="h-3.5 w-3.5 text-gray-400" />
          <span dir="ltr" className="font-mono">
            {device.ip}:{device.port}
          </span>
        </div>
        {device.location && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <span>{device.location}</span>
          </div>
        )}
        {device.lastSync && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>آخر مزامنة: {formatDateTime(device.lastSync)}</span>
          </div>
        )}
      </div>

      {/* Counts */}
      {device._count && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
              <Users className="h-3 w-3" />
              <span className="text-[10px]">موظفون</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {device._count.employees}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
              <ClipboardList className="h-3 w-3" />
              <span className="text-[10px]">سجلات</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
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
          className="flex-1 text-xs font-semibold"
        >
          <Wifi className="h-3.5 w-3.5" />
          اختبار الاتصال
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSync}
          loading={syncing}
          className="flex-1 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          مزامنة
        </Button>
      </div>
    </motion.div>
  );
}
