"use client";

import { useState, useEffect } from "react";
import { Shield, Globe, Router, SwitchCamera, AlertTriangle, CheckCircle2, Server, Key, Info, User, Lock, Network } from "lucide-react";
import { getSystemSettings, updateSystemSettings } from "@/app/actions/settings";

export default function SettingsForm() {
    const [activeTab, setActiveTab] = useState<"port" | "vpn" | "adms" | "tunnel">("port");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

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
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (mode: string) => {
        setIsSaving(true);
        setSuccessMsg("");
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

    if (isLoading) return <div>جاري تحميل الإعدادات...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">بوابة الاتصال السحابي (Cloud Gateway)</h1>
                <p className="text-gray-500 mt-2">
                    إعدادات الجسر وطرق الوصول لجهاز البصمة المحلي (Local Device)
                </p>
            </div>

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    {successMsg}
                </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-amber-800">تجاوز قيود الشبكة المحلية لـ Vercel</h3>
                    <p className="text-sm text-amber-700 mt-1">
                        اختر إحدى الطرق التالية ووفر بيانات الاتصال المناسبة.
                        النظام سيحاول الاتصال بالجهاز المحلي من خلال هذا المسار بدلاً من الـ IP الداخلي.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button
                    onClick={() => setActiveTab("port")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${activeTab === "port"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:bg-gray-50"
                        }`}
                >
                    <Router className="h-6 w-6 mb-2" />
                    <span className="font-semibold text-sm">توجيه المنافذ</span>
                </button>

                <button
                    onClick={() => setActiveTab("vpn")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${activeTab === "vpn"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-gray-50"
                        }`}
                >
                    <Shield className="h-6 w-6 mb-2" />
                    <span className="font-semibold text-sm">VPN خاص</span>
                </button>

                <button
                    onClick={() => setActiveTab("tunnel")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${activeTab === "tunnel"
                            ? "border-orange-600 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-orange-200 hover:bg-gray-50"
                        }`}
                >
                    <Network className="h-6 w-6 mb-2" />
                    <span className="font-semibold text-sm">نفق (Tunnel)</span>
                </button>

                <button
                    onClick={() => setActiveTab("adms")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${activeTab === "adms"
                            ? "border-purple-600 bg-purple-50 text-purple-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-purple-200 hover:bg-gray-50"
                        }`}
                >
                    <SwitchCamera className="h-6 w-6 mb-2" />
                    <span className="font-semibold text-sm">ADMS (دفع)</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {activeTab === "port" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Router className="text-blue-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold">إعدادات Port Forwarding</h2>
                            </div>
                            {formData.networkMode === "port" && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">نشط حالياً</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-blue-500" />
                                    دليل الإعداد السريع:
                                </h4>
                                <p className="text-sm text-gray-600">
                                    قم بتوجيه المنفذ الداخلي (مثل 4370 للجهاز) إلى منفذ خارجي في راوتر المكتب، وأدخل الـ IP العام الخاص بمودم الإنترنت.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">الآي بي العام (Public IP)</label>
                                    <div className="relative">
                                        <Globe className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text" name="publicIp"
                                            value={formData.publicIp} onChange={handleChange}
                                            placeholder="مثال: 197.xx.xx.xx"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">المنفذ الخارجي (External Port)</label>
                                    <div className="relative">
                                        <Server className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="number" name="publicPort"
                                            value={formData.publicPort} onChange={handleChange}
                                            placeholder="مثال: 4371"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button disabled={isSaving} onClick={() => handleSave("port")} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50">
                                {isSaving ? "جاري الحفظ..." : "حفظ واستخدام Port Forwarding"}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "vpn" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 p-2 rounded-lg">
                                    <Shield className="text-emerald-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold">إعدادات الاتصال عبر VPN (خوادم وسيطة)</h2>
                            </div>
                            {formData.networkMode === "vpn" && (
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">نشط حالياً</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 mb-4">
                                <p className="text-sm text-gray-600">
                                    إذا كنت تدير خادم VPN خاص بك (مثل OpenVPN ، WireGuard ، أو Proxy)، يرجى إدخال بيانات الوصول أدناه ليتمكن التطبيق من الاتصال بالشبكة من خلاله.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">آي بي الـ VPN (VPN IP)</label>
                                    <div className="relative">
                                        <Globe className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text" name="vpnIp"
                                            value={formData.vpnIp} onChange={handleChange}
                                            placeholder="10.8.0.x"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">منفذ الـ VPN</label>
                                    <div className="relative">
                                        <Server className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="number" name="vpnPort"
                                            value={formData.vpnPort} onChange={handleChange}
                                            placeholder="1194"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">اسم المستخدم (إن وجد)</label>
                                    <div className="relative">
                                        <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text" name="vpnUsername"
                                            value={formData.vpnUsername} onChange={handleChange}
                                            placeholder="Username"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور / المفتاح السري</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="password" name="vpnPassword"
                                            value={formData.vpnPassword} onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button disabled={isSaving} onClick={() => handleSave("vpn")} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50">
                                {isSaving ? "جاري الحفظ..." : "حفظ واستخدام الـ VPN"}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "tunnel" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 p-2 rounded-lg">
                                    <Network className="text-orange-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold">ربط عبر نفق (Ngrok / Cloudflare)</h2>
                            </div>
                            {formData.networkMode === "tunnel" && (
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">نشط حالياً</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                    قم بتشغيل وكيل (Agent) صغير على جهاز كمبيوتر متصل بنفس الشبكة التي بها جهاز البصمة، وأدخل رابط الخادم المولد أدناه.
                                </p>
                                <div className="bg-[#1e1e1e] p-3 rounded-md text-orange-400 font-mono text-sm border border-gray-800" dir="ltr">
                                    ngrok p2p 30.30.30.63:4370
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">رابط الخادم (Tunnel TCP URL)</label>
                                <div className="relative">
                                    <Key className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text" name="tunnelUrl"
                                        value={formData.tunnelUrl} onChange={handleChange}
                                        placeholder="مثال: tcp://0.tcp.ngrok.io:12345"
                                        className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <button disabled={isSaving} onClick={() => handleSave("tunnel")} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50">
                                {isSaving ? "جاري الحفظ..." : "حفظ الرابط كخيار رئيسي"}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "adms" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <SwitchCamera className="text-purple-600 h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold">تفعيل بروتوكول ADMS (الدفع المباشر)</h2>
                            </div>
                            {formData.networkMode === "adms" && (
                                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">نشط حالياً</span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    هذه الطريقة تعكس سير العمل: جهاز البصمة سيتصل تلقائياً بخدمات Vercel.
                                    لإعداد هذه الطريقة، تأكد أن جهاز البصمة لديك يدعم خيار (ADMS Server) أو Cloud.
                                </p>
                            </div>

                            <div className="bg-purple-50 text-purple-800 p-4 rounded-lg flex gap-3 border border-purple-200">
                                <CheckCircle2 className="h-6 w-6 shrink-0" />
                                <div>
                                    <h4 className="font-semibold mb-1">واجهة الاستقبال (API)</h4>
                                    <p className="text-sm opacity-80 text-purple-700">لقد تم تجهيز خوادم Vercel لاستقبال طلبات الدفع من الجهاز تلقائياً.</p>
                                </div>
                            </div>

                            <button disabled={isSaving} onClick={() => handleSave("adms")} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50">
                                {isSaving ? "جاري الحفظ..." : "ضبط النظام على وضع الاستقبال (ADMS)"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
