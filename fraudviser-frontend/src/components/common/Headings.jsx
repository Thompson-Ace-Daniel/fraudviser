export function SectionHeading({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="text-xs font-bold tracking-[0.15em] text-emerald-700">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, note }) {
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
