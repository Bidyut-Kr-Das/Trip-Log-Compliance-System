export default function LeftNavbar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Trip Log Compliance
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Route Planner</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {['Map', 'Logs', 'Dashboard', 'Settings'].map((item, index) => (
          <button
            key={item}
            type="button"
            className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
              index === 0
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  )
}
