import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/trial') {
      window.location.replace('/trial');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-[#121620] p-6 text-center shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Commercial MovieBox API
        </div>
        <h1 className="text-xl font-bold text-white mb-2">API Gateway Active</h1>
        <p className="text-sm text-slate-400 mb-6">
          Redirecting to the Live Client API Tester &amp; Documentation portal...
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/trial"
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors"
          >
            Open API Portal (/trial)
          </a>
          <a
            href="/owner"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors"
          >
            Owner Panel
          </a>
        </div>
      </div>
    </div>
  );
}
