const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'devices', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '  const handleSyncTime = async () => {';
const endMarker = '  const handleAddUser = async (e: React.FormEvent) => {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found! Start:', startIndex, 'End:', endIndex);
  process.exit(1);
}

const replacement = `  const handleSyncTime = async () => {
    setSyncingTime(true);
    try {
      const res = await axios.post(\`/api/devices/\${id}/sync-time\`);
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

  const triggerCriticalAction = (actionKey: string) => {
    let title = "";
    let description = "";
    let icon = null;
    let options = [];
    
    switch (actionKey) {
      case "clear-data":
        title = "مسح جميع البيانات من الجهاز";
        description = "⚠️ تحذير شديد: سيتم مسح كافة بصمات الموظفين والمستخدمين وسجلات الحضور والإنصراف المخزنة في ذاكرة البصمة بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.";
        options = [
          { key: "clearDb", label: "حذف البيانات أيضاً من قاعدة بيانات السيرفر (PostgreSQL)", description: "سيتم حذف الموظفين وسجل الحركات الخاص بهذا الجهاز نهائياً من السيرفر", defaultValue: false },
          { key: "reboot", label: "إعادة تشغيل الجهاز (Reboot) تلقائياً لتصفير العدادات", description: "يوصى به لتحديث شاشة البصمة ومسح الذاكرة المؤقتة للعتاد", defaultValue: true }
        ];
        break;
      case "clear-logs":
        title = "تفريغ ذاكرة سجلات الحضور والانصراف";
        description = "⚠️ تحذير: سيتم حذف جميع حركات الحضور والانصراف المخزنة في ذاكرة الجهاز لتوفير مساحة. لن يتم حذف المستخدمين أو البصمات.";
        options = [
          { key: "clearDb", label: "حذف الحركات أيضاً من قاعدة بيانات السيرفر (PostgreSQL)", description: "سيتم إفراغ سجل الحركات المخزن محلياً على السيرفر لهذا الجهاز", defaultValue: false },
          { key: "reboot", label: "إعادة تشغيل الجهاز (Reboot) تلقائياً لتحديث العدادات", description: "يوصى به لتحديث عداد الحركات المعروض على شاشة جهاز البصمة", defaultValue: true }
        ];
        break;
      case "reboot":
        title = "إعادة تشغيل جهاز البصمة";
        description = "هل أنت متأكد من إعادة تشغيل جهاز البصمة؟ سيفقد الجهاز الاتصال بالشبكة لعدة دقائق ثم يعود للعمل تلقائياً.";
        break;
      case "clear-admins":
        title = "إلغاء صلاحيات المشرفين";
        description = "سيتم تحويل جميع المشرفين والمدراء الحاليين على جهاز البصمة إلى مستخدمين عاديين. هذا الإجراء يسمح لك بدخول القائمة البرمجية للجهاز مباشرة دون قفل.";
        options = [
          { key: "reboot", label: "إعادة تشغيل جهاز البصمة تلقائياً لتطبيق الصلاحيات فوراً", defaultValue: true }
        ];
        break;
      case "power-off":
        title = "إيقاف تشغيل جهاز البصمة";
        description = "⚠️ تحذير: سيتم إيقاف تشغيل جهاز البصمة نهائياً عن بعد. سيتعين على شخص ما الضغط على زر التشغيل في الجهاز يدوياً لإعادة تشغيله.";
        break;
      case "disable-device":
        title = "تعطيل جهاز البصمة مؤقتاً";
        description = "سيتم تعطيل إمكانية تسجيل الحضور والإنصراف أو استخدام شاشة الجهاز مؤقتاً. لن يقبل الجهاز بصمات الموظفين حتى يتم تفعيله مجدداً.";
        break;
      case "enable-device":
        title = "تفعيل جهاز البصمة";
        description = "سيتم إعادة تشغيل العمليات وقبول بصمات وحركات الموظفين على جهاز البصمة.";
        break;
      case "refresh-data":
        title = "تحديث البيانات بالجهاز";
        description = "سيتم تحديث وإعادة تهيئة الذاكرة التخزينية لجهاز البصمة وتحديث البيانات المحلية فيه.";
        options = [
          { key: "reboot", label: "إعادة تشغيل الجهاز بعد التحديث", defaultValue: false }
        ];
        break;
      case "clear-super-log":
        title = "مسح سجل المشرفين";
        description = "⚠️ تحذير: سيتم مسح سجل العمليات البرمجية والإدارية المخزن على جهاز البصمة نهائياً.";
        break;
      case "delete-device":
        title = "حذف جهاز البصمة من النظام";
        description = "⚠️ تحذير شديد: سيتم حذف هذا الجهاز تماماً من النظام وقاعدة البيانات المحلية. لن يؤدي هذا إلى مسح أي بيانات من على الجهاز الفعلي، ولكن لن تتمكن من إدارته من هنا مجدداً.";
        break;
      default:
        return;
    }

    const defaultOptions = {};
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

  const executeAction = async (actionKey, options) => {
    const steps = [];
    let mainLabel = "";
    let mainApi = "";
    let mainPayload = {};
    
    switch (actionKey) {
      case "clear-data":
        mainLabel = "مسح البيانات من جهاز البصمة";
        mainApi = \`/api/devices/\${id}/clear-data\`;
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
        mainApi = \`/api/devices/\${id}/clear-logs\`;
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
        mainApi = \`/api/devices/\${id}/reboot\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "clear-admins":
        mainLabel = "إلغاء صلاحيات المشرفين من الجهاز";
        mainApi = \`/api/devices/\${id}/clear-admins\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        if (options.reboot) {
          steps.push({ key: "reboot", label: "إعادة تشغيل جهاز البصمة لتفعيل الصلاحيات", status: "pending" });
        }
        break;
      case "power-off":
        mainLabel = "إرسال أمر إيقاف التشغيل للجهاز";
        mainApi = \`/api/devices/\${id}/power-off\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "disable-device":
        mainLabel = "إرسال أمر تعطيل العمليات للجهاز";
        mainApi = \`/api/devices/\${id}/disable-device\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "enable-device":
        mainLabel = "إرسال أمر تفعيل العمليات للجهاز";
        mainApi = \`/api/devices/\${id}/enable-device\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "refresh-data":
        mainLabel = "تحديث مخزن البيانات بالجهاز";
        mainApi = \`/api/devices/\${id}/refresh-data\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        if (options.reboot) {
          steps.push({ key: "reboot", label: "إعادة تشغيل جهاز البصمة", status: "pending" });
        }
        break;
      case "clear-super-log":
        mainLabel = "مسح سجل المشرفين من الجهاز";
        mainApi = \`/api/devices/\${id}/clear-super-log\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
      case "delete-device":
        mainLabel = "حذف الجهاز من قاعدة بيانات السيرفر";
        mainApi = \`/api/devices/\${id}\`;
        steps.push({ key: "main", label: mainLabel, status: "pending" });
        break;
    }

    setConfirmConfig(prev => prev ? { ...prev, loading: true } : null);
    setActionProgress(steps);

    const updateStepStatus = (key, status) => {
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
        toast.error(\`❌ فشل الإجراء الأساسي: \${mainRes.data.error}\`);
        setConfirmConfig(prev => prev ? { ...prev, loading: false } : null);
        return;
      }

      if (options.reboot && steps.some(s => s.key === "reboot")) {
        updateStepStatus("reboot", "running");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const rebootRes = await axios.post(\`/api/devices/\${id}/reboot\`);
        if (rebootRes.data.success) {
          updateStepStatus("reboot", "success");
          toast.success("✅ تم تنفيذ جميع العمليات المترابطة وإعادة تشغيل الجهاز بنجاح");
        } else {
          updateStepStatus("reboot", "error");
          toast.error(\`⚠️ فشل إعادة تشغيل الجهاز: \${rebootRes.data.error}\`);
        }
      } else {
        toast.success("✅ تم تنفيذ العملية بنجاح");
      }
    } catch (err) {
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
      const res = await axios.post(\`/api/devices/\${id}/enable-clock\`);
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
      const res = await axios.post(\`/api/devices/\${id}/unlock-door\`);
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
      const res = await axios.post(\`/api/devices/\${id}/enable-realtime\`);
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
  const handleDelete = async () => { triggerCriticalAction("delete-device"); };

`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully replaced file content.');
