import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  CircleAlert,
  History,
  LayoutDashboard,
  Plus,
  Shield,
  ShieldCheck,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth.js";
import useWorkspace from "../../hooks/useWorkspace.js";

function NavButton({ active, icon, count, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
        active
          ? "bg-emerald-700 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function viewForPath(pathname) {
  if (pathname.startsWith("/analysis/")) return "result";
  const segment = pathname.replace(/\/+$/, "").slice(1);
  if (segment === "app" || segment === "") return "overview";
  if (segment === "analyze") return "analyze";
  if (segment === "history") return "history";
  return "overview";
}

const PAGE_TITLES = {
  overview: "Overview",
  analyze: "New analysis",
  history: "Assessment history",
  result: "Analysis report",
};

export default function WorkspaceShell() {
  const { user } = useAuth();
  const { error, setError, history, startNew, signOut } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const view = viewForPath(location.pathname);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 md:pl-[250px]">
      <aside className="sidebar-scroll hidden md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:h-screen md:w-[250px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain md:border-r md:border-slate-200 md:bg-white md:px-5 md:py-6">
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="flex items-center gap-3 text-left text-xl font-bold tracking-tight"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <Shield size={21} strokeWidth={2.4} />
          </span>
          <span>
            Fraudviser<span className="text-emerald-600">.</span>
            <span className="mt-0.5 block text-[9px] font-bold tracking-[0.18em] text-slate-400">
              BUY WITH CLARITY
            </span>
          </span>
        </button>

        <div className="mb-3 mt-10 px-3 text-xs font-bold tracking-[0.16em] text-slate-400">
          WORKSPACE
        </div>

        <nav className="flex flex-col gap-2" aria-label="Main navigation">
          <NavButton
            active={view === "overview"}
            icon={<LayoutDashboard size={18} />}
            onClick={() => navigate("/app")}
          >
            Overview
          </NavButton>
          <NavButton
            active={view === "analyze"}
            icon={<Activity size={18} />}
            onClick={startNew}
          >
            Analyse a listing
          </NavButton>
          <NavButton
            active={view === "history"}
            icon={<History size={18} />}
            onClick={() => navigate("/history")}
            count={history.length}
          >
            History
          </NavButton>
        </nav>

        <div className="mt-auto rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <ShieldCheck size={19} className="mb-2 text-emerald-700" />
          <strong className="block">Take a moment before you pay.</strong>
          <span className="mt-1 block text-xs text-emerald-800">
            Inspect the item and verify the seller independently.
          </span>
        </div>
      </aside>

      <nav
        className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
          onClick={() => navigate("/app")}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <Shield size={19} />
          </span>
          <span>
            Fraudviser<span className="text-emerald-600">.</span>
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Overview"
            title="Overview"
            onClick={() => navigate("/app")}
            className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg ${view === "overview" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}
          >
            <LayoutDashboard size={19} />
          </button>
          <button
            type="button"
            aria-label="Analyse a listing"
            title="Analyse a listing"
            onClick={startNew}
            className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg ${view === "analyze" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}
          >
            <Activity size={19} />
          </button>
          <button
            type="button"
            aria-label="Assessment history"
            title="History"
            onClick={() => navigate("/history")}
            className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg ${view === "history" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}
          >
            <History size={19} />
          </button>
        </div>
      </nav>

      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Fraudviser</span>
            <span className="text-slate-300">/</span>
            <strong className="text-slate-900">{PAGE_TITLES[view]}</strong>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="hidden text-right sm:block">
              <strong className="block max-w-48 truncate text-xs text-slate-800">
                {user?.email}
              </strong>
              <span className="text-[10px] capitalize text-slate-500">
                {user?.role} workspace
              </span>
            </span>
            <button
              type="button"
              onClick={signOut}
              className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              onClick={startNew}
            >
              <Plus size={16} />
              New analysis
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1500px] p-5 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="rounded-lg p-1 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
