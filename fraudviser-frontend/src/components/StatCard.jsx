export default function StatCard({ icon, label, value, note }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="my-2 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </div>
      <div className="text-sm leading-6 text-slate-500">{note}</div>
    </article>
  );
}
