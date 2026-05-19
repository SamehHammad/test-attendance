"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Monitor, Wifi, WifiOff, RefreshCw, Pencil, Trash2,
  MapPin, Hash, Calendar, Users, ClipboardList, Settings,
  Clock, Power, ShieldAlert, UserCheck, Cpu, Info,
  Lock, Unlock, DoorOpen, DoorClosed, Activity, Database,
  Shield, UserPlus, UserMinus, Timer, Globe, Bell, Zap
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

  // New Control Actions Loading states
  const [disabling, setDisabling] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [poweringOff, setPoweringOff] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [clearingAdmins, setClearingAdmins] = useState(false);
  const [enablingClock, setEnablingClock] = useState(false);
  const [unlockingDoor, setUnlockingDoor] = useState(false);
  const [enablingRealtime, setEnablingRealtime] = useState(false);
  const [clearingSuperLog, setClearingSuperLog] = useState(false);

  // Hardware Parameters
  const [paramsData, setParamsData] = useState<any>(null);
  const [loadingParams, setLoadingParams] = useState(false);

  // Device State
  const [deviceState, setDeviceState] = useState<any>(null);
  const [doorState, setDoorState] = useState<any>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("general");

  // Dialog modal states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [toggleUserOpen, setToggleUserOpen] = useState(false);
  const [userGroupOpen, setUserGroupOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [userTimezonesOpen, setUserTimezonesOpen] = useState(false);
  const [deleteEnrollOpen, setDeleteEnrollOpen] = useState(false);

  // Additional options for reboot / DB sync
  const [addUserReboot, setAddUserReboot] = useState(false);
  const [delUserClearDb, setDelUserClearDb] = useState(true);
  const [delUserReboot, setDelUserReboot] = useState(false);
  const [toggleUserReboot, setToggleUserReboot] = useState(false);
  const [timezoneReboot, setTimezoneReboot] = useState(true);
  const [userTimezonesReboot, setUserTimezonesReboot] = useState(true);
  const [deleteEnrollReboot, setDeleteEnrollReboot] = useState(false);

  // Custom Action Confirmation Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    icon: React.ReactNode;
    actionKey: string;
    loading: boolean;
    options?: Array<{
      key: string;
      label: string;
      description?: string;
      defaultValue: boolean;
    }>;
    onConfirm: (selectedOptions: Record<string, boolean>) => Promise<void>;
  } | null>(null);

  // Selected options state for the custom confirmation dialog
  const [dialogOptions, setDialogOptions] = useState<Record<string, boolean>>({});
  const [actionProgress, setActionProgress] = useState<Array<{
    key: string;
    label: string;
    status: "pending" | "running" | "success" | "error";
  }>>([]);

  // Form states
  const [newUser, setNewUser] = useState({ uid: "", userId: "", name: "", password: "", role: "0", cardno: "" });
  const [delUserId, setDelUserId] = useState("");
  const [toggleUser, setToggleUser] = useState({ userId: "", enabled: true });
  const [userGroup, setUserGroup] = useState({ userSn: "", groupNumber: "" });
  const [timezoneForm, setTimezoneForm] = useState({
    timezoneIndex: "1",
    sunday: "08:00 TO 17:00",
    monday: "08:00 TO 17:00",
    tuesday: "08:00 TO 17:00",
    wednesday: "08:00 TO 17:00",
    thursday: "08:00 TO 17:00",
    friday: "00:00 TO 00:00",
    saturday: "00:00 TO 00:00"
  });
  const [userTimezonesForm, setUserTimezonesForm] = useState({ userId: "", timezones: "" });
  const [deleteEnrollForm, setDeleteEnrollForm] = useState({ userId: "", fingerIndex: "0" });

  // Action submitting states
  const [submittingAddUser, setSubmittingAddUser] = useState(false);
  const [submittingDelUser, setSubmittingDelUser] = useState(false);
  const [submittingToggleUser, setSubmittingToggleUser] = useState(false);
  const [submittingUserGroup, setSubmittingUserGroup] = useState(false);
  const [submittingTimezone, setSubmittingTimezone] = useState(false);
  const [submittingUserTimezones, setSubmittingUserTimezones] = useState(false);
  const [submittingDeleteEnroll, setSubmittingDeleteEnroll] = useState(false);

  const fetchDevice = useCallback(async () => {
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
  }, [id, router]);

  const fetchParameters = useCallback(async () => {
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
  }, [id]);

  const fetchDeviceState = useCallback(async () => {
    try {
      const res = await axios.get(`/api/devices/${id}/device-state`);
      if (res.data.success) {
        setDeviceState(res.data.state);
      }
    } catch {
      // Fail silently
    }
  }, [id]);

  const fetchDoorState = useCallback(async () => {
    try {
      const res = await axios.get(`/api/devices/${id}/door-state`);
      if (res.data.success) {
        setDoorState(res.data.state);
      }
    } catch {
      // Fail silently
    }
  }, [id]);

  useEffect(() => {
    fetchDevice();
    fetchParameters();
    fetchDeviceState();
    fetchDoorState();
  }, [fetchDevice, fetchParameters, fetchDeviceState, fetchDoorState]);

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
    const triggerCriticalAction = (actionKey: string) => {
    let title = "";
    let description = "";
    let icon = <ShieldAlert className="h-10 w-10 text-red-500" />;
    let options: Array<{ key: string; label: string; description?: string; defaultValue: boolean }> = [];
    
    switch (actionKey) {
      case "clear-data":
        title = "مسح جميع البيانات من الجهاز";
        description = "⚠️ تحذير شديد: سيتم مسح كافة بصمات الموظفين والمستخدمين وسجلات الحضور والإنصراف المخزنة في ذاكرة البصمة بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.";
        icon = <ShieldAlert className="h-10 w-10 text-rose-500 animate-pulse" />;
        options = [
          { key: "clearDb", label: "حذف البيانات أيضاً من قاعدة بيانات السيرفر (PostgreSQL)", description: "سيتم حذف الموظفين وسجل الحركات الخاص بهذا الجهاز نهائياً من السيرفر", defaultValue: false },
          { key: "reboot", label: "إعادة تشغيل الجهاز (Reboot) تلقائياً لتصفير العدادات", description: "يوصى به لتحديث شاشة البصمة ومسح الذاكرة المؤقتة للعتاد", defaultValue: true }
        ];
        break;
      case "clear-logs":
        title = "تفريغ ذاكرة سجلات الحضور والانصراف";
        description = "⚠️ تحذير: سيتم حذف جميع حركات الحضور والانصراف المخزنة في ذاكرة الجهاز لتوفير مساحة. لن يتم حذف المستخدمين أو البصمات.";
        icon = <Database className="h-10 w-10 text-amber-500" />;
        options = [
          { key: "clearDb", label: "حذف الحركات أيضاً من قاعدة بيانات السيرفر (PostgreSQL)", description: "سيتم إفراغ سجل الحركات المخزن محلياً على السيرفر لهذا الجهاز", defaultValue: false },
          { key: "reboot", label: "إعادة تشغيل الجهاز (Reboot) تلقائياً لتحديث العدادات", description: "يوصى به لتحديث عداد الحركات المعروض على شاشة جهاز البصمة", defaultValue: true }
        ];
        break;
      case "reboot":
        title = "إعادة تشغيل جهاز البصمة";
        description = "هل أنت متأكد من إعادة تشغيل جهاز البصمة؟ سيفقد الجهاز الاتصال بالشبكة لعدة دقائق ثم يعود للعمل تلقائياً.";
        icon = <RefreshCw className="h-10 w-10 text-rose-500 animate-spin" />;
        break;
      case "clear-admins":
        title = "إلغاء صلاحيات المشرفين";
        description = "سيتم تحويل جميع المشرفين والمدراء الحاليين على جهاز البصمة إلى مستخدمين عاديين. هذا الإجراء يسمح لك بدخول القائمة البرمجية للجهاز مباشرة دون قفل.";
        icon = <Shield className="h-10 w-10 text-indigo-500" />;
        options = [
          { key: "reboot", label: "إعادة تشغيل جهاز البصمة تلقائياً لتطبيق الصلاحيات فوراً", defaultValue: true }
        ];
        break;
      case "power-off":
        title = "إيقاف تشغيل جهاز البصمة";
        description = "⚠️ تحذير: سيتم إيقاف تشغيل جهاز البصمة نهائياً عن بعد. سيتعين على شخص ما الضغط على زر التشغيل في الجهاز يدوياً لإعادة تشغيله.";
        icon = <Power className="h-10 w-10 text-red-600 animate-pulse" />;
        break;
      case "disable-device":
        title = "تعطيل جهاز البصمة مؤقتاً";
        description = "سيتم تعطيل إمكانية تسجيل الحضور والإنصراف أو استخدام شاشة الجهاز مؤقتاً. لن يقبل الجهاز بصمات الموظفين حتى يتم تفعيله مجدداً.";
        icon = <Lock className="h-10 w-10 text-orange-500" />;
        break;
      case "enable-device":
        title = "تفعيل جهاز البصمة";
        description = "سيتم إعادة تشغيل العمليات وقبول بصمات وحركات الموظفين على جهاز البصمة.";
        icon = <Unlock className="h-10 w-10 text-green-500" />;
        break;
      case "refresh-data":
        title = "تحديث البيانات بالجهاز";
        description = "سيتم تحديث وإعادة تهيئة الذاكرة التخزينية لجهاز البصمة وتحديث البيانات المحلية فيه.";
        icon = <RefreshCw className="h-10 w-10 text-blue-500" />;
        options = [
          { key: "reboot", label: "إعادة تشغيل الجهاز بعد التحديث", defaultValue: false }
        ];
        break;
      case "clear-super-log":
        title = "مسح سجل المشرفين";
        description = "⚠️ تحذير: سيتم مسح سجل العمليات البرمجية والإدارية المخزن على جهاز البصمة نهائياً.";
        icon = <ClipboardList className="h-10 w-10 text-purple-500" />;
        break;
      case "delete-device":
        title = "حذف جهاز البصمة من النظام";
        description = "⚠️ تحذير شديد: سيتم حذف هذا الجهاز تماماً من النظام وقاعدة البيانات المحلية. لن يؤدي هذا إلى مسح أي بيانات من على الجهاز الفعلي، ولكن لن تتمكن من إدارته من هنا مجدداً.";
        icon = <Trash2 className="h-10 w-10 text-rose-600 animate-pulse" />;
        break;
      default:
        return;
    }

    const defaultOptions: Record<string, boolean> = {};
    options.forEach(o => {
      defaultOptions[o.key] = o.defaultValue;
    });
    setDialogOptions(defaultOptions);
    setActionProgress([]);

    setConfirmConfig({
      isOpen: true,
      title,
      description,
      icon,
      actionKey,
      loading: false,
      options,
      onConfirm: async (selectedOptions) => {
        await executeAction(actionKey, selectedOptions);
      }
    });
  };

  const executeAction = async (actionKey: string, options: Record<string, boolean>) => {
    const steps: Array<{ key: string; label: string; status: "pending" | "running" | "success" | "error" }> = [];
    
    let mainLabel = "";
    let mainApi = "";
    let mainPayload: any = {};
    
    switch (actionKey) {
      case "clear-data":
        mainLabel = "مسح البيانات من جهاز البصمة";
        mainApi = `/api/devices/${id}/clear-data`;
        mainPayload = { clearDb: !!options.clearDb };
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        if (options.clearDb) {
          steps.push({ key: "db", label: "حذف البيانات من قاعدة بيانات السيرفر", status: "pending" });
        }
        if (options.reboot) {
          steps.push({ key: "reboot", label: "إعادة تشغيل جهاز البصمة لتطبيق التغييرات", status: "pending" });
        }
        break;
      case "clear-logs":
        mainLabel = "مسح السجلات من جهاز البصمة";
        mainApi = `/api/devices/${id}/clear-logs`;
        mainPayload = { clearDb: !!options.clearDb };
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        if (options.clearDb) {
          steps.push({ key: "db", label: "حذف السجلات من قاعدة بيانات السيرفر", status: "pending" });
        }
        if (options.reboot) {
          steps.push({ key: "reboot", label: "إعادة تشغيل جهاز البصمة لتحديث العدادات", status: "pending" });
        }
        break;
      case "reboot":
        mainLabel = "إرسال أمر إعادة التشغيل للجهاز";
        mainApi = `/api/devices/${id}/reboot`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "clear-admins":
        mainLabel = "إلغاء صلاحيات المشرفين من الجهاز";
        mainApi = `/api/devices/${id}/clear-admins`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        if (options.reboot) {
          steps.push({ key: "reboot", label: "إعادة تشغيل جهاز البصمة لتفعيل الصلاحيات", status: "pending" });
        }
        break;
      case "power-off":
        mainLabel = "إرسال أمر إيقاف التشغيل للجهاز";
        mainApi = `/api/devices/${id}/power-off`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "disable-device":
        mainLabel = "إرسال أمر تعطيل العمليات للجهاز";
        mainApi = `/api/devices/${id}/disable-device`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "enable-device":
        mainLabel = "إرسال أمر تفعيل العمليات للجهاز";
        mainApi = `/api/devices/${id}/enable-device`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "refresh-data":
        mainLabel = "تحديث مخزن البيانات بالجهاز";
        mainApi = `/api/devices/${id}/refresh-data`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        if (options.reboot) {
          steps.push({ key: "reboot", label: "إعادة تشغيل جهاز البصمة", status: "pending" });
        }
        break;
      case "clear-super-log":
        mainLabel = "مسح سجل المشرفين من الجهاز";
        mainApi = `/api/devices/${id}/clear-super-log`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "delete-device":
        mainLabel = "حذف الجهاز من قاعدة بيانات السيرفر";
        mainApi = `/api/devices/${id}`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
    }

    setConfirmConfig(prev => prev ? { ...prev, loading: true } : null);
    setActionProgress(steps);

    const updateStepStatus = (key: string, status: "pending" | "running" | "success" | "error") => {
      setActionProgress(prev => prev.map(s => s.key === key ? { ...s, status } : s));
    };

    try {
      updateStepStatus("main", "running");
      const method = actionKey === "delete-device" ? "delete" : "post";
      const mainRes = await (method === "delete" ? axios.delete(mainApi) : axios.post(mainApi, mainPayload));
      
      if (mainRes.data.success) {
        updateStepStatus("main", "success");
        if (steps.some(s => s.key === "db")) {
          updateStepStatus("db", "success");
        }
        
        if (actionKey === "delete-device") {
          toast.success("تم حذف الجهاز بنجاح");
          router.push("/dashboard/devices");
          return;
        }

        fetchDevice();
        if (actionKey === "disable-device" || actionKey === "enable-device") {
          fetchDeviceState();
        }
      } else {
        updateStepStatus("main", "error");
        if (steps.some(s => s.key === "db")) {
          updateStepStatus("db", "error");
        }
        toast.error(`❌ فشل الإجراء الأساسي: ${mainRes.data.error}`);
        setConfirmConfig(prev => prev ? { ...prev, loading: false } : null);
        return;
      }

      if (options.reboot && steps.some(s => s.key === "reboot")) {
        updateStepStatus("reboot", "running");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const rebootRes = await axios.post(`/api/devices/${id}/reboot`);
        if (rebootRes.data.success) {
          updateStepStatus("reboot", "success");
          toast.success("✅ تم تنفيذ جميع العمليات المترابطة وإعادة تشغيل الجهاز بنجاح");
        } else {
          updateStepStatus("reboot", "error");
          toast.error(`⚠️ فشل إعادة تشغيل الجهاز: ${rebootRes.data.error}`);
        }
      } else {
        toast.success("✅ تم تنفيذ العملية بنجاح");
      }
    } catch (err: any) {
      console.error(err);
      setActionProgress(prev => prev.map(s => s.status === "running" ? { ...s, status: "error" } : s));
      toast.error("❌ حدث خطأ غير متوقع أثناء الاتصال بالخادم");
    } finally {
      setConfirmConfig(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const handleClearLogs = async () => { triggerCriticalAction("clear-logs"); };
  const handleReboot = async () => { triggerCriticalAction("reboot"); };
  const handleDisableDevice = async () => { triggerCriticalAction("disable-device"); };
  const handleEnableDevice = async () => { triggerCriticalAction("enable-device"); };
  const handlePowerOff = async () => { triggerCriticalAction("power-off"); };
  const handleClearData = async () => { triggerCriticalAction("clear-data"); };
  const handleRefreshData = async () => { triggerCriticalAction("refresh-data"); };
  const handleClearAdmins = async () => { triggerCriticalAction("clear-admins"); };
  const handleEnableClock = async () => {
    setEnablingClock(true);
    try {
      const res = await axios.post(`/api/devices/${id}/enable-clock`);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في تفعيل الساعة");
    } finally {
      setEnablingClock(false);
    }
  };
  const handleUnlockDoor = async () => {
    setUnlockingDoor(true);
    try {
      const res = await axios.post(`/api/devices/${id}/unlock-door`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDoorState();
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في فتح الباب");
    } finally {
      setUnlockingDoor(false);
    }
  };
  const handleEnableRealtime = async () => {
    setEnablingRealtime(true);
    try {
      const res = await axios.post(`/api/devices/${id}/enable-realtime`);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في تفعيل الوضع الفوري");
    } finally {
      setEnablingRealtime(false);
    }
  };
  const handleClearSuperLog = async () => { triggerCriticalAction("clear-super-log"); };
  const handleDelete = async () => { triggerCriticalAction("delete-device"); };�كد من مسح سجلات المشرفين؟")) return;
    setClearingSuperLog(true);
    try {
      const res = await axios.post(`/api/devices/${id}/clear-super-log`);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("فشل في مسح سجلات المشرفين");
    } finally {
      setClearingSuperLog(false);
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.uid || !newUser.userId || !newUser.name) {
      toast.error("يرجى ملء جميع الحقول الإلزامية (الرقم التسلسلي، معرف المستخدم، الاسم)");
      return;
    }
    setSubmittingAddUser(true);
    try {
      const res = await axios.post(`/api/devices/${id}/set-user`, {
        uid: parseInt(newUser.uid),
        userId: newUser.userId,
        name: newUser.name,
        password: newUser.password || undefined,
        role: parseInt(newUser.role),
        cardno: newUser.cardno || undefined,
      });
      if (res.data.success) {
        toast.success(res.data.message || "تمت إضافة المستخدم بنجاح");
        setAddUserOpen(false);
        setNewUser({ uid: "", userId: "", name: "", password: "", role: "0", cardno: "" });
        fetchDevice();
      } else {
        toast.error(res.data.error || "فشل إضافة المستخدم");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في إضافة المستخدم");
    } finally {
      setSubmittingAddUser(false);
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delUserId) {
      toast.error("يرجى إدخال معرف المستخدم");
      return;
    }
    setSubmittingDelUser(true);
    try {
      const res = await axios.post(`/api/devices/${id}/delete-user`, { userId: delUserId });
      if (res.data.success) {
        toast.success(res.data.message || "تم حذف المستخدم بنجاح");
        setDeleteUserOpen(false);
        setDelUserId("");
        fetchDevice();
      } else {
        toast.error(res.data.error || "فشل حذف المستخدم");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في حذف المستخدم");
    } finally {
      setSubmittingDelUser(false);
    }
  };

  const handleToggleUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleUser.userId) {
      toast.error("يرجى إدخال معرف المستخدم");
      return;
    }
    setSubmittingToggleUser(true);
    try {
      const res = await axios.post(`/api/devices/${id}/enable-user`, {
        userId: toggleUser.userId,
        enabled: toggleUser.enabled
      });
      if (res.data.success) {
        toast.success(res.data.message || "تم تغيير حالة المستخدم بنجاح");
        setToggleUserOpen(false);
        setToggleUser({ userId: "", enabled: true });
      } else {
        toast.error(res.data.error || "فشل تغيير صلاحية المستخدم");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في تغيير صلاحية المستخدم");
    } finally {
      setSubmittingToggleUser(false);
    }
  };

  const handleSetUserGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userGroup.userSn || !userGroup.groupNumber) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    setSubmittingUserGroup(true);
    try {
      const res = await axios.post(`/api/devices/${id}/user-group`, {
        userSn: parseInt(userGroup.userSn),
        groupNumber: parseInt(userGroup.groupNumber)
      });
      if (res.data.success) {
        toast.success(res.data.message || "تم تعيين المجموعة بنجاح");
        setUserGroupOpen(false);
        setUserGroup({ userSn: "", groupNumber: "" });
      } else {
        toast.error(res.data.error || "فشل تعيين مجموعة المستخدم");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في تعيين مجموعة المستخدم");
    } finally {
      setSubmittingUserGroup(false);
    }
  };

  const handleSetTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTimezone(true);
    try {
      const res = await axios.post(`/api/devices/${id}/timezone-info`, {
        timezoneIndex: parseInt(timezoneForm.timezoneIndex),
        sunday: timezoneForm.sunday,
        monday: timezoneForm.monday,
        tuesday: timezoneForm.tuesday,
        wednesday: timezoneForm.wednesday,
        thursday: timezoneForm.thursday,
        friday: timezoneForm.friday,
        saturday: timezoneForm.saturday
      });
      if (res.data.success) {
        toast.success(res.data.message || "تم حفظ المنطقة الزمنية بنجاح");
        setTimezoneOpen(false);
      } else {
        toast.error(res.data.error || "فشل تعيين المنطقة الزمنية");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في تعيين المنطقة الزمنية");
    } finally {
      setSubmittingTimezone(false);
    }
  };

  const handleSetUserTimezones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTimezonesForm.userId || !userTimezonesForm.timezones) {
      toast.error("يرجى إدخال معرف المستخدم والمناطق الزمنية");
      return;
    }
    const tzArray = userTimezonesForm.timezones
      .split(",")
      .map(t => parseInt(t.trim()))
      .filter(t => !isNaN(t));
      
    if (tzArray.length === 0) {
      toast.error("يرجى إدخال مناطق زمنية صالحة مفصولة بفواصل");
      return;
    }
    
    setSubmittingUserTimezones(true);
    try {
      const res = await axios.post(`/api/devices/${id}/user-timezones`, {
        userId: userTimezonesForm.userId,
        timezones: tzArray
      });
      if (res.data.success) {
        toast.success(res.data.message || "تم تعيين مناطق المستخدم الزمنية بنجاح");
        setUserTimezonesOpen(false);
        setUserTimezonesForm({ userId: "", timezones: "" });
      } else {
        toast.error(res.data.error || "فشل تعيين مناطق المستخدم الزمنية");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في تعيين مناطق المستخدم الزمنية");
    } finally {
      setSubmittingUserTimezones(false);
    }
  };

  const handleDeleteEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteEnrollForm.userId) {
      toast.error("يرجى إدخال معرف المستخدم");
      return;
    }
    setSubmittingDeleteEnroll(true);
    try {
      const res = await axios.post(`/api/devices/${id}/delete-enroll-data`, {
        userId: deleteEnrollForm.userId,
        fingerIndex: parseInt(deleteEnrollForm.fingerIndex)
      });
      if (res.data.success) {
        toast.success(res.data.message || "تم حذف بيانات التسجيل بنجاح");
        setDeleteEnrollOpen(false);
        setDeleteEnrollForm({ userId: "", fingerIndex: "0" });
      } else {
        toast.error(res.data.error || "فشل حذف بيانات التسجيل");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "فشل في حذف بيانات التسجيل");
    } finally {
      setSubmittingDeleteEnroll(false);
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

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "general" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Settings className="h-4 w-4 inline ml-2" />
          عام
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "users" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users className="h-4 w-4 inline ml-2" />
          المستخدمين
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "schedule" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Timer className="h-4 w-4 inline ml-2" />
          المواعيد
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "security" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Shield className="h-4 w-4 inline ml-2" />
          الأمان
        </button>
        <button
          onClick={() => setActiveTab("advanced")}
          className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "advanced" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Zap className="h-4 w-4 inline ml-2" />
          متقدم
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Right Column: Advanced Controls Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Controls Card - General Tab */}
          {activeTab === "general" && (
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
          )}

          {/* Quick Actions Panel - Always Visible */}
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

          {/* Device Control Tab */}
          {activeTab === "general" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Power className="h-5 w-5 text-purple-600" />
                التحكم بتشغيل الجهاز
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-green-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 mb-3">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">تعطيل الجهاز</h3>
                  <p className="text-[11px] text-gray-400 mt-1">إيقاف جميع العمليات مؤقتاً</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisableDevice}
                    loading={disabling}
                    className="w-full mt-3 text-xs"
                  >
                    تعطيل
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                    <Unlock className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">تفعيل الجهاز</h3>
                  <p className="text-[11px] text-gray-400 mt-1">إعادة تشغيل العمليات</p>
                  <Button
                    size="sm"
                    onClick={handleEnableDevice}
                    loading={enabling}
                    className="w-full mt-3 text-xs"
                  >
                    تفعيل
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-red-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
                    <Power className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">إيقاف التشغيل</h3>
                  <p className="text-[11px] text-gray-400 mt-1">إيقاف الجهاز بالكامل</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePowerOff}
                    loading={poweringOff}
                    className="w-full mt-3 text-xs border-red-200 text-red-700 hover:bg-red-50"
                  >
                    إيقاف
                  </Button>
                </div>
              </div>

              {deviceState && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">حالة الجهاز:</span>
                    <Badge variant="default" className="mr-2">{deviceState.description}</Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === "general" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-600" />
                إدارة البيانات
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-orange-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 mb-3">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">تحديث البيانات</h3>
                  <p className="text-[11px] text-gray-400 mt-1">تحديث البيانات المحلية</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshData}
                    loading={refreshingData}
                    className="w-full mt-3 text-xs"
                  >
                    تحديث
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-red-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مسح جميع البيانات</h3>
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">حذف كل شيء</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearData}
                    loading={clearingData}
                    className="w-full mt-3 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700 font-bold"
                  >
                    مسح الكل
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مسح المشرفين</h3>
                  <p className="text-[11px] text-gray-400 mt-1">تحويل الكل لمستخدمين عاديين</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAdmins}
                    loading={clearingAdmins}
                    className="w-full mt-3 text-xs"
                  >
                    مسح المشرفين
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                إدارة المستخدمين
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">إضافة مستخدم</h3>
                  <p className="text-[11px] text-gray-400 mt-1">إضافة مستخدم جديد للجهاز</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setAddUserOpen(true)}
                  >
                    إضافة
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-red-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
                    <UserMinus className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">حذف مستخدم</h3>
                  <p className="text-[11px] text-gray-400 mt-1">حذف مستخدم من الجهاز</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setDeleteUserOpen(true)}
                  >
                    حذف
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-green-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 mb-3">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">تفعيل/تعطيل مستخدم</h3>
                  <p className="text-[11px] text-gray-400 mt-1">التحكم في صلاحيات المستخدم</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setToggleUserOpen(true)}
                  >
                    التحكم
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مجموعة المستخدم</h3>
                  <p className="text-[11px] text-gray-400 mt-1">تعيين مجموعة للمستخدم</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setUserGroupOpen(true)}
                  >
                    تعيين
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Timer className="h-5 w-5 text-emerald-600" />
                إدارة المواعيد والمناطق الزمنية
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-emerald-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <Globe className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">المناطق الزمنية</h3>
                  <p className="text-[11px] text-gray-400 mt-1">إعداد مناطق الدخول والخروج</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setTimezoneOpen(true)}
                  >
                    إعداد
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مناطق المستخدم الزمنية</h3>
                  <p className="text-[11px] text-gray-400 mt-1">تعيين مناطق لكل مستخدم</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setUserTimezonesOpen(true)}
                  >
                    تعيين
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                إعدادات الأمان والباب
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-green-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 mb-3">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">فتح الباب</h3>
                  <p className="text-[11px] text-gray-400 mt-1">فتح الباب عن بعد</p>
                  <Button
                    size="sm"
                    onClick={handleUnlockDoor}
                    loading={unlockingDoor}
                    className="w-full mt-3 text-xs"
                  >
                    فتح الآن
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                    <DoorClosed className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">حالة الباب</h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    الحالة الحالية: {doorState || "غير معروف"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchDoorState}
                    className="w-full mt-3 text-xs"
                  >
                    تحديث الحالة
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">تفعيل الساعة</h3>
                  <p className="text-[11px] text-gray-400 mt-1">تفعيل عرض الساعة على الشاشة</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnableClock}
                    loading={enablingClock}
                    className="w-full mt-3 text-xs"
                  >
                    تفعيل
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-orange-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 mb-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">مسح سجلات المشرفين</h3>
                  <p className="text-[11px] text-gray-400 mt-1">مسح سجلات العمليات الخاصة</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearSuperLog}
                    loading={clearingSuperLog}
                    className="w-full mt-3 text-xs"
                  >
                    مسح
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === "advanced" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                إعدادات متقدمة
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-yellow-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 mb-3">
                    <Bell className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">تفعيل الوضع الفوري</h3>
                  <p className="text-[11px] text-gray-400 mt-1">استقبال الأحداث في الوقت الفعلي</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnableRealtime}
                    loading={enablingRealtime}
                    className="w-full mt-3 text-xs"
                  >
                    تفعيل
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-red-200 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">حذف بيانات التسجيل</h3>
                  <p className="text-[11px] text-gray-400 mt-1">حذف بصمات المستخدم</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => setDeleteEnrollOpen(true)}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                بيانات الجهاز (Hardware Specs)
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

      {/* Add User Modal */}
      {addUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">إضافة مستخدم جديد للجهاز</h3>
              <button onClick={() => setAddUserOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">الرقم التسلسلي (UID - رقم فريد بالبصمة)</label>
                <input
                  type="number"
                  required
                  placeholder="مثال: 1"
                  value={newUser.uid}
                  onChange={e => setNewUser({ ...newUser, uid: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">معرف المستخدم (User ID - رقم الكارت/الموظف)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1001"
                  value={newUser.userId}
                  onChange={e => setNewUser({ ...newUser, userId: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد أحمد"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">كلمة المرور (اختياري)</label>
                <input
                  type="password"
                  placeholder="مثال: 123456"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">الصلاحية (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="0">مستخدم عادي</option>
                    <option value="14">مسؤول النظام (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم الكارت (اختياري)</label>
                  <input
                    type="number"
                    placeholder="مثال: 4567"
                    value={newUser.cardno}
                    onChange={e => setNewUser({ ...newUser, cardno: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button type="submit" size="sm" loading={submittingAddUser} className="flex-1">
                  إضافة
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAddUserOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">حذف مستخدم من الجهاز</h3>
              <button onClick={() => setDeleteUserOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleDeleteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">معرف المستخدم (User ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1001"
                  value={delUserId}
                  onChange={e => setDelUserId(e.target.value)}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <p className="text-xs text-rose-600 leading-normal">
                ⚠️ تنبيه: سيتم حذف هذا المستخدم وكل سجلاته المرتبطة بجهاز البصمة بشكل نهائي.
              </p>
              <div className="flex gap-2.5">
                <Button type="submit" size="sm" loading={submittingDelUser} className="flex-1 text-white bg-rose-600 hover:bg-rose-700 border-none">
                  حذف المستخدم
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteUserOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle User Modal */}
      {toggleUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">تفعيل/تعطيل صلاحيات المستخدم</h3>
              <button onClick={() => setToggleUserOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleToggleUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">معرف المستخدم (User ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1001"
                  value={toggleUser.userId}
                  onChange={e => setToggleUser({ ...toggleUser, userId: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">حالة تفعيل المستخدم بالجهاز</label>
                <select
                  value={toggleUser.enabled ? "true" : "false"}
                  onChange={e => setToggleUser({ ...toggleUser, enabled: e.target.value === "true" })}
                  className="w-full text-xs text-gray-900 bg-white border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="true">نشط ومفعل (Enabled)</option>
                  <option value="false">معطل (Disabled)</option>
                </select>
              </div>
              <div className="flex gap-2.5">
                <Button type="submit" size="sm" loading={submittingToggleUser} className="flex-1">
                  تعديل الحالة
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setToggleUserOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Group Modal */}
      {userGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">تعيين مجموعة للمستخدم</h3>
              <button onClick={() => setUserGroupOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSetUserGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">الرقم التسلسلي للمستخدم (User SN)</label>
                <input
                  type="number"
                  required
                  placeholder="مثال: 1"
                  value={userGroup.userSn}
                  onChange={e => setUserGroup({ ...userGroup, userSn: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم المجموعة (Group Number)</label>
                <input
                  type="number"
                  required
                  placeholder="مثال: 1"
                  value={userGroup.groupNumber}
                  onChange={e => setUserGroup({ ...userGroup, groupNumber: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex gap-2.5">
                <Button type="submit" size="sm" loading={submittingUserGroup} className="flex-1">
                  تعيين المجموعة
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setUserGroupOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timezone Modal */}
      {timezoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">إعدادات المنطقة الزمنية للجهاز</h3>
              <button onClick={() => setTimezoneOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSetTimezone} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم المنطقة الزمنية (Timezone Index - من 1 إلى 50)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={timezoneForm.timezoneIndex}
                  onChange={e => setTimezoneForm({ ...timezoneForm, timezoneIndex: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-gray-400">تنسيق النطاق الزمني: HH:MM TO HH:MM (مثال: 08:00 TO 17:00)</p>
              <div className="grid grid-cols-2 gap-3.5 text-right">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الأحد (Sunday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.sunday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, sunday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الأثنين (Monday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.monday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, monday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الثلاثاء (Tuesday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.tuesday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, tuesday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الأربعاء (Wednesday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.wednesday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, wednesday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الخميس (Thursday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.thursday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, thursday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الجمعة (Friday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.friday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, friday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">السبت (Saturday)</label>
                  <input
                    type="text"
                    required
                    value={timezoneForm.saturday}
                    onChange={e => setTimezoneForm({ ...timezoneForm, saturday: e.target.value })}
                    className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2.5">
                <Button type="submit" size="sm" loading={submittingTimezone} className="flex-1">
                  حفظ المنطقة الزمنية
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setTimezoneOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Timezones Modal */}
      {userTimezonesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">تعيين مناطق زمنية للمستخدم</h3>
              <button onClick={() => setUserTimezonesOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSetUserTimezones} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">معرف المستخدم (User ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1001"
                  value={userTimezonesForm.userId}
                  onChange={e => setUserTimezonesForm({ ...userTimezonesForm, userId: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">المناطق الزمنية المحددة (مفصولة بفواصل)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1, 2, 5"
                  value={userTimezonesForm.timezones}
                  onChange={e => setUserTimezonesForm({ ...userTimezonesForm, timezones: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex gap-2.5">
                <Button type="submit" size="sm" loading={submittingUserTimezones} className="flex-1">
                  تعيين المناطق الزمنية
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setUserTimezonesOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Enroll Modal */}
      {deleteEnrollOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">حذف بيانات التسجيل (البصمة) للمستخدم</h3>
              <button onClick={() => setDeleteEnrollOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleDeleteEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">معرف المستخدم (User ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1001"
                  value={deleteEnrollForm.userId}
                  onChange={e => setDeleteEnrollForm({ ...deleteEnrollForm, userId: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم مؤشر البصمة (Finger Index - من 0 إلى 9)</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  required
                  value={deleteEnrollForm.fingerIndex}
                  onChange={e => setDeleteEnrollForm({ ...deleteEnrollForm, fingerIndex: e.target.value })}
                  className="w-full text-xs text-gray-900 bg-white placeholder:text-gray-400 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex gap-2.5">
                <Button type="submit" size="sm" loading={submittingDeleteEnroll} className="flex-1 text-white bg-rose-600 hover:bg-rose-700 border-none">
                  حذف البصمة
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteEnrollOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
