import { ArrowRight, Box, Plus } from "lucide-react";
import { date, hasNumber, money } from "../../utils/format.js";
import {
  assessmentIdOf,
  getAssessmentLabel,
  getAssessmentStyle,
  getListing,
} from "../../utils/assessment.js";

export function AssessmentBadge({ label, item }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getAssessmentStyle(item)}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export function AssessmentTableSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading assessments"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0"
        >
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function AssessmentTable({ items, onOpen, onNew }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Box size={24} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">
          No assessments yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Analyse a product listing to start building your assessment history.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          onClick={onNew}
        >
          <Plus size={16} /> Start an analysis
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 p-3 xl:hidden">
        {items.map((item) => {
          const listing = getListing(item);
          const id = assessmentIdOf(item);
          return (
            <article
              key={id || `${listing.productName}-${listing.model}`}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-bold text-slate-900">
                    {listing.productName || "Unnamed product"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {listing.model || listing.category || "Marketplace listing"}
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500"
                  aria-label="View assessment"
                  onClick={() => onOpen(id || item)}
                >
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm tabular-nums text-slate-900">
                  {hasNumber(listing.price) ? money(listing.price) : "Price not added"}
                </strong>
                <AssessmentBadge label={getAssessmentLabel(item)} item={item} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {date(item.createdAt || item.assessedAt)}
              </p>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                "Product",
                "Asking price",
                "AI assessment",
                "Date",
                "",
              ].map((heading, index) => (
                <th
                  key={`${heading}-${index}`}
                  scope="col"
                  className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const listing = getListing(item);
              const id = assessmentIdOf(item);
              return (
                <tr
                  key={id || `${listing.productName}-${listing.model}`}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Box size={18} />
                      </div>
                      <div className="min-w-0">
                        <strong className="block max-w-[220px] truncate text-sm font-semibold text-slate-900">
                          {listing.productName || "Unnamed product"}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-500">
                          {listing.model || "Model not specified"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                    {hasNumber(listing.price) ? money(listing.price) : "Price not added"}
                  </td>
                  <td className="px-5 py-4">
                    <AssessmentBadge
                      label={getAssessmentLabel(item)}
                      item={item}
                    />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {date(item.createdAt || item.assessedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="View assessment"
                      title="View assessment"
                      onClick={() => onOpen(id || item)}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
