const endpoints = [
  ["POST", "/api/zk/test-connection", "فحص الاتصال وقراءة معلومات الجهاز"],
  ["POST", "/api/zk/sync", "قراءة المستخدمين والحضور ومعلومات الجهاز دفعة واحدة"],
  ["POST", "/api/zk/attendance", "قراءة سجلات الحضور مباشرة"],
  ["POST", "/api/zk/users", "قراءة مستخدمي الجهاز مباشرة"],
  ["POST", "/api/zk/sync-time", "ضبط وقت الجهاز"],
  ["POST", "/api/zk/parameters", "قراءة إعدادات ومعلومات الجهاز"],
  ["POST", "/api/zk/device-state", "قراءة حالة الجهاز وسعته"],
  ["POST", "/api/zk/unlock-door", "فتح الباب"],
  ["POST", "/api/zk/clear-logs", "مسح سجلات الحضور من الجهاز"],
  ["POST", "/api/zk/reboot", "إعادة تشغيل الجهاز"],
  ["POST", "/api/zk/power-off", "إيقاف تشغيل الجهاز"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-14 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-3xl border border-emerald-400/20 bg-slate-900 p-8 shadow-2xl shadow-emerald-950/30">
          <div className="mb-4 inline-flex rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            يعمل دون قاعدة بيانات
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Trivvo Hr Device Gateway</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            خادم وسيط ينفّذ الطلبات مباشرة على أجهزة ZKTeco. لا تُحفظ الأجهزة أو الموظفون أو سجلات الحضور محليًا؛ تتولى المنصة المتصلة حفظ البيانات.
          </p>
        </div>

        <section>
          <h2 className="mb-5 text-2xl font-bold">واجهات الاتصال المباشر</h2>
          <div className="grid gap-3">
            {endpoints.map(([method, path, description]) => (
              <div key={path} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-[80px_1fr_1.4fr] sm:items-center">
                <span className="w-fit rounded-lg bg-sky-400/10 px-3 py-1 font-mono text-sm font-bold text-sky-300">{method}</span>
                <code className="text-left text-sm text-emerald-300" dir="ltr">{path}</code>
                <span className="text-slate-300">{description}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-slate-300">
            أرسل <code className="text-emerald-300">ip</code> وغيّر <code className="text-emerald-300">port</code> عند الحاجة. المنفذ الافتراضي هو <code className="text-emerald-300">4370</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
