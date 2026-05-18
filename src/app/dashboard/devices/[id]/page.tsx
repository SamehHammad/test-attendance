"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Monitor, Wifi, WifiOff, RefreshCw, Pencil, Trash2,
  MapPin, Hash, Calendar, Users, ClipboardList, Settings,
  Clock, Power, ShieldAlert, UserCheck, Cpu, Info
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeviceForm } from "@/components/devices/DeviceForm";
import { formatDateTime } from "@/lib/utils";
import axios from "axios";
import toast from "react-hot-toast";

interface ParamsProps {
  params: Promise<{ id: string }>;
}

export default function DeviceSettingsPage({ params }: ParamsProps) {
  const { id } = use(params);
  const router = useRouter();

  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // Control Actions Loading states
  const [testingConn, setTestingConn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [syncingTime, setSyncingTime] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  // Hardware Parameters
  const [paramsData, setParamsData] = useState<any>(null);
  const [loadingParams, setLoadingParams] = useState(false);

  const fetchDevice = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/devices/${id}`);
      if (res.data.success) {
        setDevice(res.data.data);
      } else {
        toast.error("الجهاز غير موجود");
        router.push("/dashboard/devices");
      }
    } catch {
      toast.error("فشل تحميل بيانات الجهاز");
      router.push("/dashboard/devices");
    } finally {
      setLoading(false);
    }
  };

  const fetchParameters = async () => {
    setLoadingParams(true);
    try {
      const res = await axios.get(`/api/devices/${id}/parameters`);
      if (res.data.success) {
        setParamsData(res.data.data);
      }
    } catch {
      // Fail silently
    } finally {
      setLoadingParams(false);
    }
  };

  useEffect(() => {
    fetchDevice();
    fetchParameters();
  }, [id]);

  const handleTestConnection = async () => {
    setTestingConn(true);
    try {
      const res = await axios.post(`/api/devices/${id}/test-connection`);
      if (res.data.success) {
        toast.success(`✅ الجهاز ${device.name} متصل بنجاح`);
        fetchDevice();
        fetchParameters();
      } else {
        toast.error(`❌ فشل الاتصال: ${res.data.error}`);
      }
    } catch {
      toast.error("فشل في اختبار الاتصال");
    } finally {
      setTestingConn(false);
    }
  };

  const handleSyncLogs = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`/api/devices/${id}/sync`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDevice();
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في مزامنة البيانات");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncUsers = async () => {
    setSyncingUsers(true);
    try {
      const res = await axios.post(`/api/devices/${id}/sync-users`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDevice();
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في سحب الموظفين من الجهاز");
    } finally {
      setSyncingUsers(false);
    }
  };

  const handleSyncTime = async () => {
    setSyncingTime(true);
    try {
      const res = await axios.post(`/api/devices/${id}/sync-time`);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في مزامنة وقت الجهاز");
    } finally {
      setSyncingTime(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("⚠️ تحذير: هل أنت متأكد من مسح جميع السجلات المخزنة بذاكرة جهاز البصمة؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setClearingLogs(true);
    try {
      const res = await axios.post(`/api/devices/${id}/clear-logs`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDevice();
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في مسح سجلات الجهاز");
    } finally {
      setClearingLogs(false);
    }
  };

  const handleReboot = async () => {
    if (!confirm(`هل أنت متأكد من إعادة تشغيل جهاز "${device.name}"؟ سيفقد الاتصال لدقائق.`)) return;
    setRebooting(true);
    try {
      const res = await axios.post(`/api/devices/${id}/reboot`);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في إعادة تشغيل الجهاز");
    } finally {
      setRebooting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف الجهاز "${device.name}"؟`)) return;
    try {
      await axios.delete(`/api/devices/${id}`);
      toast.success("تم حذف الجهاز بنجاح");
      router.push("/dashboard/devices");
    } catch {
      toast.error("فشل في حذف الجهاز");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-500">جاري تحميل إعدادات الجهاز...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Back navigation & Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/devices"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
              <Badge variant={device.isActive ? "success" : "default"}>
                {device.isActive ? "متصل" : "غير متصل"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">التحكم المتقدم وضبط معلمات العتاد بالكامل</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            تعديل بيانات الجهاز
          </Button>
          <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            حذف الجهاز
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Right Column: Advanced Controls Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Controls Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-md font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Settings className="h-5 w-5 text-blue-600" />
              لوحة العمليات والتحكم بالجهاز عن بعد
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Sync Users */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors flex flex-col justify-between h-44">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">سحب الموظفين من الجهاز</h3>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">جلب كافة الموظفين المسجلين حديثاً على جهاز البصمة لحفظهم بقاعدة البيانات.</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSyncUsers}
                  loading={syncingUsers}
                  className="w-full mt-3 text-xs font-semibold"
                >
                  سحب الموظفين الآن
                </Button>
              </div>

              {/* Sync Time */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-amber-200 transition-colors flex flex-col justify-between h-44">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مزامنة وقت وتاريخ الجهاز</h3>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">تحديث وضبط ساعة البصمة الداخلية لتطابق توقيت هذا السيرفر الحالي بالثانية.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncTime}
                  loading={syncingTime}
                  className="w-full mt-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold"
                >
                  مزامنة ساعة الجهاز
                </Button>
              </div>

              {/* Reboot Device */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-rose-200 transition-colors flex flex-col justify-between h-44">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-3">
                    <Power className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">إعادة تشغيل الجهاز (Reboot)</h3>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">إرسال إشارة لإعادة التشغيل الفعلي للجهاز عن بُعد للتنظيف أو حل المشاكل.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReboot}
                  loading={rebooting}
                  className="w-full mt-3 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                >
                  إعادة التشغيل الآن
                </Button>
              </div>

              {/* Clear Logs */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-red-300 transition-colors flex flex-col justify-between h-44">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مسح وتفريغ سجلات الجهاز</h3>
                  <p className="text-[11px] text-red-500 mt-1 leading-relaxed font-semibold">حذف السجلات من ذاكرة الجهاز (يستخدم فقط لتفريغ مساحة الذاكرة).</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearLogs}
                  loading={clearingLogs}
                  className="w-full mt-3 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700 font-bold"
                >
                  تفريغ الذاكرة
                </Button>
              </div>

            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              مزامنة بيانات وحركات الحضور
            </h2>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">سجل حركات الحضور والانصراف المزامنة</p>
                <p className="text-xs text-gray-500 mt-1">
                  آخر مزامنة ناجحة للحركات: {device.lastSync ? formatDateTime(device.lastSync) : "لم تتم المزامنة بعد"}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  loading={testingConn}
                  className="flex-1 sm:flex-none text-xs"
                >
                  <Wifi className="h-3.5 w-3.5" /> اختبار الاتصال
                </Button>
                <Button
                  onClick={handleSyncLogs}
                  loading={syncing}
                  className="flex-1 sm:flex-none text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> مزامنة السجلات الآن
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Left Column: Live Specs & Hardware Parameters */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Connection Status Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-600" />
              حالة اتصال الشبكة
            </h2>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">عنوان الآي بي (IP)</span>
                <span className="font-mono font-bold text-gray-800" dir="ltr">{device.ip}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">منفذ الاتصال (Port)</span>
                <span className="font-mono font-bold text-gray-800">{device.port}</span>
              </div>
              {device.location && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">موقع الجهاز</span>
                    <span className="font-semibold text-gray-800">{device.location}</span>
                  </div>
                </>
              )}
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">إجمالي الموظفين بالنظام</span>
                <span className="font-bold text-gray-800">{device._count?.employees || 0} موظف</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">إجمالي البصمات بالنظام</span>
                <span className="font-bold text-gray-800">{device._count?.attendance || 0} حركة</span>
              </div>
            </div>
          </div>

          {/* Live parameters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-600" />
                بيانات العتاد الحيّة (Hardware Specs)
              </h2>
              <button
                onClick={fetchParameters}
                disabled={loadingParams}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingParams ? "animate-spin" : ""}`} /> تحديث
              </button>
            </div>

            <div className="space-y-3.5">
              {loadingParams ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  <p className="text-[11px] text-gray-400">جاري القراءة المباشرة من البصمة...</p>
                </div>
              ) : paramsData ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">الرقم التسلسلي (Serial Number)</span>
                    <span className="font-mono font-bold text-gray-800 break-all">{paramsData.serialNumber}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">كود المنتج / الموديل</span>
                    <span className="font-semibold text-gray-800">{paramsData.productCode}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">الشركة المصنعة (Vendor)</span>
                    <span className="font-semibold text-gray-800">{paramsData.vendor}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">عنوان الماك (MAC Address)</span>
                    <span className="font-mono font-bold text-gray-800">{paramsData.mac}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">إصدار النظام (Firmware)</span>
                    <span className="font-semibold text-gray-800">{paramsData.firmware}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">منصة التشغيل (Platform)</span>
                    <span className="font-semibold text-gray-800">{paramsData.platform}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">دعم الكروت (Card Option)</span>
                    <span className="font-semibold text-gray-800">{paramsData.cardFun === "1" ? "مدعوم" : "غير مدعوم"}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">إصدار بروتوكول الـ SDK</span>
                    <span className="font-semibold text-gray-800">{paramsData.sdkVersion}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <Info className="h-5 w-5 text-gray-400" />
                  <p className="text-[11px] text-gray-400 leading-normal">فشل في قراءة بيانات العتاد. تأكد من تشغيل البصمة واتصالها بالشبكة.</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs py-1 h-7" onClick={fetchParameters}>
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {editOpen && (
        <DeviceForm
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSuccess={fetchDevice}
          device={device}
        />
      )}
    </div>
  );
}
