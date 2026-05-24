"use client";

import { useState, useEffect } from "react";
import { Shield, Globe, Router, SwitchCamera, AlertTriangle, CheckCircle2, Server, Key, Info, User, Lock, Network, Loader2, XCircle, Power, Wifi, WifiOff, Clock, RefreshCw } from "lucide-react";
import { getSystemSettings, updateSystemSettings, testConnection, getConnectionStatus } from "@/app/actions/settings";

export default function SettingsForm() {
    const [activeTab, setActiveTab] = useState<"port" | "vpn" | "adms" | "tunnel">("port");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<{
        isConnected: boolean;
        connectionStatus: string;
        lastConnectionTime: Date | null;
        connectionError: string | null;
        networkMode: string;
    }>({
        isConnected: false,
        connectionStatus: "disconnected",
        lastConnectionTime: null,
        connectionError: null,
        networkMode: "local"
    });

    const [formData, setFormData] = useState({
        networkMode: "local",
        publicIp: "",
        publicPort: "",
        tunnelUrl: "",
        vpnIp: "",
        vpnPort: "",
        vpnUsername: "",
        vpnPassword: ""
    });

    useEffect(() => {
        async function load() {
            try {
                const data = await getSystemSettings();
                setFormData({
                    networkMode: data.networkMode || "local",
                    publicIp: data.publicIp || "",
                    publicPort: data.publicPort?.toString() || "",
                    tunnelUrl: data.tunnelUrl || "",
                    vpnIp: data.vpnIp || "",
                    vpnPort: data.vpnPort?.toString() || "",
                    vpnUsername: data.vpnUsername || "",
                    vpnPassword: data.vpnPassword || ""
                });

                if (data.networkMode === "port") setActiveTab("port");
                else if (data.networkMode === "vpn") setActiveTab("vpn");
                else if (data.networkMode === "tunnel") setActiveTab("tunnel");
                else if (data.networkMode === "adms") setActiveTab("adms");
                else setActiveTab("port");

                // Load connection status
                const connStatus = await getConnectionStatus();
                setConnectionStatus(connStatus);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    // Auto-refresh connection status every 10 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const connStatus = await getConnectionStatus();
                setConnectionStatus(connStatus);
            } catch (e) {
                console.error(e);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (mode: string) => {
        setIsSaving(true);
        setSuccessMsg("");
        setTestResult(null);
        try {
            const payload = { ...formData, networkMode: mode };
            await updateSystemSettings(payload);
            setSuccessMsg("تم الحفظ بنجاح! سيتم استخدام هذه الإعدادات للاتصال بالجهاز.");
            setFormData(prev => ({ ...prev, networkMode: mode }));
        } catch (e) {
            console.error(e);
            setSuccessMsg("حدث خطأ أثناء الحفظ.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setSuccessMsg(""), 5000);
        }
    };

    const handleTestConnection = async (type: "port" | "vpn" | "tunnel") => {
        setIsTesting(true);
        setTestResult(null);
        try {
            let host = "";
            let port = 0;
            if (type === "port") {
                host = formData.publicIp;
                port = parseInt(formData.publicPort);
            } else if (type === "vpn") {
                host = formData.vpnIp;
                port = 1723; // Default PPTP VPN port
            } else if (type === "tunnel") {
                // Not standard TCP test usually, but we can try parsing the tunnel url if it's tcp://host:port
                if (formData.tunnelUrl.startsWith("tcp://")) {
                    const parts = formData.tunnelUrl.replace("tcp://", "").split(":");
                    host = parts[0];
                    port = parseInt(parts[1]);
                }
            }

            if (!host || !port || isNaN(port)) {
                setTestResult({ success: false, message: "الرجاء إدخال الآي بي والمنفذ بشكل صحيح قبل الاختبار." });
                setIsTesting(false);
                return;
            }

            const res = await testConnection(host, port);
            setTestResult(res);
        } catch (e) {
            setTestResult({ success: false, message: "حدث خطأ أثناء اختبار الاتصال." });
        } finally {
            setIsTesting(false);
        }
    };

    const handleConnect = async (mode: "port" | "vpn" | "tunnel") => {
        setIsConnecting(true);
        setSuccessMsg("");
        setTestResult(null);
        try {
            let host = "";
            let port = 0;
            if (mode === "port") {
                host = formData.publicIp;
                port = parseInt(formData.publicPort);
            } else if (mode === "vpn") {
                host = formData.vpnIp;
                port = 1723; // Default PPTP VPN port
            } else if (mode === "tunnel") {
                if (formData.tunnelUrl.startsWith("tcp://")) {
                    const parts = formData.tunnelUrl.replace("tcp://", "").split(":");
                    host = parts[0];
                    port = parseInt(parts[1]);
                }
            }

            if (!host || !port || isNaN(port)) {
                setTestResult({ success: false, message: "الرجاء إدخال الآي بي والمنفذ بشكل صحيح قبل الاتصال." });
                setIsConnecting(false);
                return;
            }

            // First save the settings
            await updateSystemSettings({ ...formData, networkMode: mode });

            // Then test and connect
            const res = await testConnection(host, port);
            if (res.success) {
                // Update connection status via API
                await fetch("/api/connection", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "connect", mode })
                });
                setSuccessMsg("تم الاتصال بنجاح! الاتصال دائم حتى يتم فصله يدوياً.");
                setTestResult(res);
                // Refresh connection status
                const connStatus = await getConnectionStatus();
                setConnectionStatus(connStatus);
            } else {
                setTestResult(res);
            }
        } catch (e) {
            setTestResult({ success: false, message: "حدث خطأ أثناء الاتصال." });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        setSuccessMsg("");
        try {
            await fetch("/api/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "disconnect" })
            });
            setSuccessMsg("تم فصل الاتصال بنجاح.");
            // Refresh connection status
            const connStatus = await getConnectionStatus();
            setConnectionStatus(connStatus);
        } catch (e) {
            setTestResult({ success: false, message: "حدث خطأ أثناء فصل الاتصال." });
        } finally {
            setIsDisconnecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium tracking-wide">جاري تحميل الإعدادات...</p>
            </div>
        );
    }

    const tabs = [
        { id: "port", icon: Router, label: "توجيه المنافذ", desc: "Port Forwarding" },
        { id: "vpn", icon: Shield, label: "VPN خاص", desc: "Virtual Private Network" },
        { id: "tunnel", icon: Network, label: "نفق (Tunnel)", desc: "Ngrok / Cloudflare" },
        { id: "adms", icon: SwitchCamera, label: "ADMS (دفع)", desc: "جهاز البصمة يتصل بالخادم" }
    ] as const;

    return (
        <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">بوابة الاتصال السحابي (Cloud Gateway)</h1>
                <p className="text-gray-500 mt-2">
                    إعدادات الجسر وطرق الوصول لجهاز البصمة المحلي (Local Device)
                </p>
            </div>

            {/* Connection Status Card */}
            <div className={`rounded-xl p-6 border-2 shadow-sm ${
                connectionStatus.isConnected 
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300" 
                    : connectionStatus.connectionStatus === "connecting"
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300"
                    : connectionStatus.connectionStatus === "error"
                    ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-300"
                    : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300"
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl shadow-md ${
                            connectionStatus.isConnected 
                                ? "bg-gradient-to-br from-green-400 to-emerald-500" 
                                : connectionStatus.connectionStatus === "connecting"
                                ? "bg-gradient-to-br from-blue-400 to-cyan-500"
                                : connectionStatus.connectionStatus === "error"
                                ? "bg-gradient-to-br from-red-400 to-rose-500"
                                : "bg-gradient-to-br from-gray-400 to-slate-500"
                        }`}>
                            {connectionStatus.isConnected ? (
                                <Wifi className="h-8 w-8 text-white" />
                            ) : connectionStatus.connectionStatus === "connecting" ? (
                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                            ) : connectionStatus.connectionStatus === "error" ? (
                                <WifiOff className="h-8 w-8 text-white" />
                            ) : (
                                <WifiOff className="h-8 w-8 text-white" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className={`font-extrabold text-2xl ${
                                    connectionStatus.isConnected 
                                        ? "text-green-700" 
                                        : connectionStatus.connectionStatus === "connecting"
                                        ? "text-blue-700"
                                        : connectionStatus.connectionStatus === "error"
                                        ? "text-red-700"
                                        : "text-gray-700"
                                }`}>
                                    {connectionStatus.isConnected 
                                        ? "متصل" 
                                        : connectionStatus.connectionStatus === "connecting"
                                        ? "جاري الاتصال..."
                                        : connectionStatus.connectionStatus === "error"
                                        ? "فشل الاتصال"
                                        : "غير متصل"}
                                </h3>
                                {connectionStatus.isConnected && (
                                    <span className="flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    connectionStatus.isConnected 
                                        ? "bg-green-200 text-green-800" 
                                        : connectionStatus.connectionStatus === "connecting"
                                        ? "bg-blue-200 text-blue-800"
                                        : connectionStatus.connectionStatus === "error"
                                        ? "bg-red-200 text-red-800"
                                        : "bg-gray-200 text-gray-800"
                                }`}>
                                    {connectionStatus.networkMode === "vpn" ? "VPN خاص" : 
                                     connectionStatus.networkMode === "port" ? "توجيه المنافذ" :
                                     connectionStatus.networkMode === "tunnel" ? "نفق (Tunnel)" :
                                     connectionStatus.networkMode === "adms" ? "ADMS" : "محلي"}
                                </span>
                                {connectionStatus.lastConnectionTime && (
                                    <span className="text-gray-600 text-sm font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        آخر اتصال: {new Date(connectionStatus.lastConnectionTime).toLocaleString('ar-EG')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {connectionStatus.isConnected && (
                        <button
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            {isDisconnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
                            فصل الاتصال
                        </button>
                    )}
                </div>
                {connectionStatus.connectionError && (
                    <div className="mt-4 p-4 bg-red-100 rounded-xl border-2 border-red-300">
                        <p className="text-sm text-red-800 font-bold flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            {connectionStatus.connectionError}
                        </p>
                    </div>
                )}
            </div>

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium text-sm">{successMsg}</span>
                </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-amber-900">تجاوز قيود الشبكة المحلية لـ Vercel</h3>
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                        اختر إحدى الطرق التالية ووفر بيانات الاتصال المناسبة.
                        النظام سيحاول الاتصال بالجهاز المحلي من خلال هذا المسار بدلاً من الـ IP الداخلي
                        مما يتيح للخادم السحابي الوصول للأجهزة المحلية.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setTestResult(null); setSuccessMsg(""); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${isActive
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:bg-gray-50"
                                }`}
                        >
                            <Icon className="h-6 w-6 mb-2" />
                            <span className="font-bold text-sm">{tab.label}</span>
                            <span className={`text-xs mt-1 ${isActive ? "text-blue-500" : "text-gray-400"}`}>{tab.desc}</span>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Port Forwarding Tab */}
                {activeTab === "port" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Router className="text-blue-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">إعدادات توجيه المنافذ (Port Forwarding)</h2>
                            </div>
                            {formData.networkMode === "port" && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold border border-blue-200">الإعداد المحفوظ</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                                    <Info className="h-5 w-5 text-blue-500" />
                                    دليل الإعداد :
                                </h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    قم بتوجيه المنفذ الداخلي (مثل 4370 للجهاز) إلى منفذ خارجي في راوتر المكتب، وأدخل الـ IP العام (Public IP) الخاص بمزود خدمة الإنترنت هنا.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">الآي بي العام (Public IP)</label>
                                    <div className="relative">
                                        <Globe className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text" name="publicIp"
                                            value={formData.publicIp} onChange={handleChange}
                                            placeholder="مثال: 197.xx.xx.xx"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal text-left"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">المنفذ الخارجي (External Port)</label>
                                    <div className="relative">
                                        <Server className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="number" name="publicPort"
                                            value={formData.publicPort} onChange={handleChange}
                                            placeholder="مثال: 4370"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal text-left"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                            </div>

                            {testResult && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 border ${testResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                                    {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                    <span className="font-semibold text-sm">{testResult.message}</span>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button disabled={isTesting || isSaving || isConnecting} onClick={() => handleTestConnection("port")} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    اختبار الاتصال
                                </button>
                                <button disabled={isSaving || isTesting || isConnecting} onClick={() => handleConnect("port")} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                                    {isConnecting ? "جاري الاتصال..." : "اتصال دائم"}
                                </button>
                                <button disabled={isSaving || isTesting || isConnecting} onClick={() => handleSave("port")} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {isSaving ? "جاري الحفظ..." : "حفظ فقط"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VPN Tab */}
                {activeTab === "vpn" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Shield className="text-blue-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">إعدادات الاتصال عبر شبكة خاصة (VPN)</h2>
                            </div>
                            {connectionStatus.isConnected && connectionStatus.networkMode === "vpn" ? (
                                <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold border border-green-200">حالة اتصال السيرفر بـ VPN</span>
                            ) : formData.networkMode === "vpn" && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold border border-blue-200">الإعداد المحفوظ</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 mb-4">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    أدخل بيانات الوصول لخادم الـ VPN الخاص بك (مثل OpenVPN أو WireGuard) ليتمكن النظام من الوصول لأجهزة البصمة المتصلة بنفس الشبكة الخاصة.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">عنوان IP الشبكة (VPN IP)</label>
                                    <div className="relative">
                                        <Globe className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text" name="vpnIp"
                                            value={formData.vpnIp} onChange={handleChange}
                                            placeholder="مثال: 10.8.0.x"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal text-left"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">اسم المستخدم (إن وجد)</label>
                                    <div className="relative">
                                        <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text" name="vpnUsername"
                                            value={formData.vpnUsername} onChange={handleChange}
                                            placeholder="اختياري"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal text-left"
                                            dir="auto"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">كلمة المرور / المفتاح السري</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="password" name="vpnPassword"
                                            value={formData.vpnPassword} onChange={handleChange}
                                            placeholder="••••••••••"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-left"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                            </div>

                            {testResult && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 border ${testResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                                    {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                    <span className="font-semibold text-sm">{testResult.message}</span>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button disabled={isTesting || isSaving || isConnecting} onClick={() => handleTestConnection("vpn")} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    اختبار الاتصال
                                </button>
                                {connectionStatus.isConnected && connectionStatus.networkMode === "vpn" ? (
                                    <button disabled={isDisconnecting || isSaving || isTesting} onClick={handleDisconnect} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                        {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                                        {isDisconnecting ? "جاري الفصل..." : "فصل الاتصال"}
                                    </button>
                                ) : (
                                    <button disabled={isSaving || isTesting || isConnecting} onClick={() => handleConnect("vpn")} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                        {isConnecting ? "جاري الاتصال..." : "اتصال دائم"}
                                    </button>
                                )}
                                <button disabled={isSaving || isTesting || isConnecting || isDisconnecting} onClick={() => handleSave("vpn")} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {isSaving ? "جاري الحفظ..." : "حفظ فقط"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tunnel Tab */}
                {activeTab === "tunnel" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Network className="text-blue-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">ربط عبر نفق (Ngrok / Cloudflare Tunnel)</h2>
                            </div>
                            {formData.networkMode === "tunnel" && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold border border-blue-200">الإعداد المحفوظ</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <p className="text-sm text-gray-600 leading-relaxed mb-3 font-semibold">
                                    قم بتشغيل وكيل (Agent) صغير على جهاز كمبيوتر متصل بنفس الشبكة التي بها جهاز البصمة، وأدخل رابط الخادم المولد أدناه.
                                </p>
                                <div className="bg-gray-900 p-3 rounded-md text-green-400 font-mono text-sm border border-gray-800 text-left" dir="ltr">
                                    ngrok tcp 4370
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">رابط الخادم (TCP URL)</label>
                                <div className="relative">
                                    <Key className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text" name="tunnelUrl"
                                        value={formData.tunnelUrl} onChange={handleChange}
                                        placeholder="مثال: tcp://0.tcp.ngrok.io:12345"
                                        className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal text-left"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {testResult && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 border ${testResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                                    {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                    <span className="font-semibold text-sm">{testResult.message}</span>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button disabled={isTesting || isSaving || isConnecting} onClick={() => handleTestConnection("tunnel")} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    اختبار الاتصال
                                </button>
                                <button disabled={isSaving || isTesting || isConnecting} onClick={() => handleConnect("tunnel")} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                                    {isConnecting ? "جاري الاتصال..." : "اتصال دائم"}
                                </button>
                                <button disabled={isSaving || isTesting || isConnecting} onClick={() => handleSave("tunnel")} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {isSaving ? "جاري الحفظ..." : "حفظ فقط"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ADMS Tab */}
                {activeTab === "adms" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <SwitchCamera className="text-blue-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">تفعيل بروتوكول ADMS (الدفع المباشر)</h2>
                            </div>
                            {formData.networkMode === "adms" && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold border border-blue-200">الإعداد المحفوظ</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <p className="text-sm text-gray-800 font-semibold leading-relaxed mb-4">
                                    هذه الطريقة تعكس سير العمل: جهاز البصمة سيتصل تلقائياً بخدمات Vercel بشكل مباشر.
                                    لإعداد هذه الطريقة، تأكد أن جهاز البصمة لديك يدعم خيار (ADMS Server) أو Cloud Settings.
                                </p>
                                <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                                    <li>الدخول لإعدادات الجهاز - الشبكة - Cloud Server</li>
                                    <li>إدخال عنوان الخادم (Domain/IP) لهذا الموقع.</li>
                                    <li>تحديد المنفذ (عادة 80 أو 443).</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 border border-blue-200">
                                <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
                                <div>
                                    <h4 className="font-bold mb-1">واجهة الاستقبال (API)</h4>
                                    <p className="text-sm font-medium text-blue-700">لقد تم تجهيز خوادم الموقع لاستقبال طلبات الدفع من الجهاز تلقائياً.</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button disabled={isSaving} onClick={() => handleSave("adms")} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {isSaving ? "جاري الحفظ..." : "ضبط النظام على وضع الاستقبال (ADMS)"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
