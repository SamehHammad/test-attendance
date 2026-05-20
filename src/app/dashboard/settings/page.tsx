"use client";

import { useState } from "react";
import { Shield, Globe, Router, SwitchCamera, AlertTriangle, CheckCircle2, Server, Key, Info } from "lucide-react";

export default function ConnectionSettingsPage() {
    const [activeTab, setActiveTab] = useState<"port" | "vpn" | "adms">("port");

    return (
        <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">بوابة الاتصال السحابي (Cloud Gateway)</h1>
                <p className="text-gray-500 mt-2">
                    إعدادات ربط التطبيق المرفوع على Vercel مع جهاز البصمة المحلي (Local Device)
                </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-amber-800">مشكلة الاتصال من Vercel (السحابة) إلى جهازك المحلي</h3>
                    <p className="text-sm text-amber-700 mt-1">
                        عند رفع التطبيق على Vercel، يصبح على الإنترنت العام ولا يمكنه الوصول إلى الشبكة الداخلية (مثل 30.30.30.63).
                        لحل هذه المشكلة، عليك اختيار إحدى الطرق أدناه لتوفير عنوان IP عام يمكن للتطبيق الاتصال به.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                    onClick={() => setActiveTab("port")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${activeTab === "port"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:bg-gray-50"
                        }`}
                >
                    <Router className="h-8 w-8 mb-3" />
                    <span className="font-semibold">توجيه المنافذ (Port Forwarding)</span>
                    <span className="text-xs mt-2 text-center opacity-80">الأسرع، يتطلب IP ثابت وفتح بورت بالراوتر</span>
                </button>

                <button
                    onClick={() => setActiveTab("vpn")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${activeTab === "vpn"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-gray-50"
                        }`}
                >
                    <Shield className="h-8 w-8 mb-3" />
                    <span className="font-semibold">الشبكة الوهمية (VPN/Tunnel)</span>
                    <span className="text-xs mt-2 text-center opacity-80">الأكثر أماناً والأسهل بدون IP ثابت (مثل Ngrok)</span>
                </button>

                <button
                    onClick={() => setActiveTab("adms")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${activeTab === "adms"
                            ? "border-purple-600 bg-purple-50 text-purple-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-purple-200 hover:bg-gray-50"
                        }`}
                >
                    <SwitchCamera className="h-8 w-8 mb-3" />
                    <span className="font-semibold">تقنية الدفع (ADMS)</span>
                    <span className="text-xs mt-2 text-center opacity-80">الجهاز يرسل البيانات للسيرفر (لمن يدعم ذلك)</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {activeTab === "port" && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Router className="text-blue-600 h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold">إعدادات Port Forwarding</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-blue-500" />
                                    دليل الإعداد السريع:
                                </h4>
                                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                                    <li>ادخل إلى لوحة تحكم الراوتر (غالباً 192.168.1.1).</li>
                                    <li>ابحث عن Port Forwarding أو Virtual Server في قسم Advanced.</li>
                                    <li>أضف عنوان الشبكة الداخلي للجهاز (مثال: 30.30.30.63).</li>
                                    <li>اختر المنفذ الداخلي (غالباً 4370) والمنفذ الخارجي (مثلا 4371).</li>
                                    <li>أدخل الـ IP العام (Public IP) هنا بدلاً من الـ IP الداخلي.</li>
                                </ol>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">عنوان IP العام (Public IP)</label>
                                    <div className="relative">
                                        <Globe className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="مثال: 197.xx.xx.xx"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">المنفذ الخارجي (External Port)</label>
                                    <div className="relative">
                                        <Server className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="number"
                                            placeholder="مثال: 4371"
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                                حفظ إعدادات الاتصال المباشر وتحديث الجهاز
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "vpn" && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <Shield className="text-emerald-600 h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold">ربط عبر نفق مشفر (Ngrok / Cloudflare Tunnel)</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-emerald-500" />
                                    بدلاً من إعدادات الراوتر المعقدة:
                                </h4>
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                    قم بتشغيل وكيل (Agent) صغير على جهاز كمبيوتر متصل بنفس الشبكة التي بها جهاز البصمة (مثلاً المكتب). هذا الوكيل سينشئ نفقاً مشفراً للإنترنت بطريقة آمنة.
                                </p>
                                <div className="bg-[#1e1e1e] p-3 rounded-md text-emerald-400 font-mono text-sm border border-gray-800" dir="ltr">
                                    ngrok p2p 30.30.30.63:4370
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">رابط الخادم (Tunnel TCP URL)</label>
                                <div className="relative">
                                    <Key className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="مثال: tcp://0.tcp.ngrok.io:12345"
                                        className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
                                حفظ رابط الـ Tunnel
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "adms" && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="bg-purple-100 p-2 rounded-lg">
                                <SwitchCamera className="text-purple-600 h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold">تفعيل بروتوكول ADMS (الدفع المباشر)</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    هذه الطريقة تعكس سير العمل: جهاز البصمة سيتصل تلقائياً بخدمات Vercel كل فترة لدفع البصمات الجديدة.
                                    لإعداد هذه الطريقة، تأكد أن جهاز البصمة يدعم خيار (ADMS Server) أو Cloud.
                                </p>

                                <h4 className="font-semibold text-gray-800 mb-2">في إعدادات جهاز البصمة، أدخل:</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-white p-3 border border-gray-200 rounded-lg text-left" dir="ltr">
                                        <span className="text-gray-400 block text-xs mb-1">Server IP/Domain</span>
                                        <strong>yourapp.vercel.app</strong>
                                    </div>
                                    <div className="bg-white p-3 border border-gray-200 rounded-lg text-left" dir="ltr">
                                        <span className="text-gray-400 block text-xs mb-1">Port</span>
                                        <strong>443</strong> (أو 80)
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50 text-purple-800 p-4 rounded-lg flex gap-3 border border-purple-200">
                                <CheckCircle2 className="h-6 w-6 shrink-0" />
                                <div>
                                    <h4 className="font-semibold mb-1">واجهة الاستقبال (API) نشطة</h4>
                                    <p className="text-sm opacity-80 text-purple-700">لقد تم تجهيز خوادم Vercel لاستقبال طلبات الدفع (Webhooks/API) من الجهاز تلقائياً. تأكد من إعداد الجهاز.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
