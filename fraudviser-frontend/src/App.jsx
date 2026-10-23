import {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  Database,
  History,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const money = (value) => {
  if (value == null || value === "") return "—";

  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};

const date = (value) => {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const blankForm = {
  productName: "",
  category: "Smartphones",
  brand: "",
  model: "",
  storage: "",
  condition: "used",
  price: "",
  seller: "",
  marketplace: "",
  url: "",
  description: "",
  observations: "",
};

const getListing = (item) => item?.listing || item || {};

const getAssessment = (item) => item?.assessment || item?.result || item || {};

const getRiskLevel = (item) => {
  const result = getAssessment(item);

  const risk = result.risk;

  if (typeof risk === "string") {
    return result.riskLevel || risk;
  }

  return (
    result.riskLevel ||
    risk?.level ||
    risk?.riskLevel ||
    item?.riskLevel ||
    "Insufficient information"
  );
};

const getRiskStyle = (level = "") => {
  const value = String(level).toLowerCase();

  if (value.includes("elevated") || value.includes("high")) {
    return {
      style: "border-red-200 bg-red-50 text-red-700",
      dot: "bg-red-500",
    };
  }

  if (value.includes("moderate") || value.includes("medium")) {
    return {
      style: "border-amber-200 bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    };
  }

  if (value.includes("low")) {
    return {
      style: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  return {
    style: "border-slate-200 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };
};

function App() {
  const [view, setView] = useState("overview");
  const [health, setHealth] = useState("checking");
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState({ ...blankForm });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const importRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [healthResponse, marketResponse, historyResponse] =
        await Promise.all([
          api.get("/health").catch((err) => err.response || null),
          api
            .get("/market-prices")
            .catch(() => ({ data: { items: [], total: 0 } })),
          api
            .get("/analysis")
            .catch(() => ({ data: { items: [], total: 0 } })),
        ]);

      setHealth(
        healthResponse?.data?.database === "connected"
          ? "connected"
          : healthResponse?.data?.api === "running"
            ? "database-offline"
            : "offline"
      );


      setRecords(
        Array.isArray(marketResponse?.data?.items)
          ? marketResponse.data.items
          : []
      );

      setHistory(
        Array.isArray(historyResponse?.data?.items)
          ? historyResponse.data.items
          : []
      );
    } catch {
      setHealth("offline");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showAssessment = useCallback(async (item) => {
    setError("");

    if (typeof item === "string") {
      try {
        const response = await api.get(`/analysis/${item}`);
        setAssessment(response.data);
        setView("result");
      } catch (err) {
        setError(
          err.response?.data?.error || "Could not load this assessment."
        );
      }
    } else {
      setAssessment(item);
      setView("result");
    }
  }, []);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/analysis", {
        ...form,
        price: Number(form.price),
      });

      setAssessment(response.data);
      setView("result");
      await refresh();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to save assessment. Check that the API and MongoDB are running."
      );
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setForm({ ...blankForm });
    setError("");
    setImportMessage("");
    setView("analyze");
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportMessage("");

    try {
      const fileText = await file.text();
      const importedData = JSON.parse(fileText);

      const recordsToImport = Array.isArray(importedData)
        ? importedData
        : importedData.records;

      if (!Array.isArray(recordsToImport)) {
        throw new Error("Your JSON file must contain an array of records.");
      }

      const response = await api.post("/market-prices/import", {
        records: recordsToImport,
        metadata: {
          source: file.name,
          sourceType: "imported",
        },
      });

      setImportMessage(
        `${response.data.received ?? recordsToImport.length} observation(s) imported.`
      );

      await refresh();
    } catch (err) {
      setImportMessage(
        err.response?.data?.error ||
          err.message ||
          "Could not import the file. Check your JSON format."
      );
    } finally {
      event.target.value = "";
    }
  };

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        const listing = getListing(item);

        return `${listing.productName || ""} ${
          listing.model || ""
        } ${listing.marketplace || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      }),
    [history, query]
  );

  const demoCount = records.filter(
    (item) => item.sourceType === "demo"
  ).length;

  const sources = [
    ...new Set(records.map((item) => item.sourceType).filter(Boolean)),
  ];

  const latestMarketRecord = records.reduce(
    (latest, item) =>
      item.retrievedAt &&
      (!latest || new Date(item.retrievedAt) > new Date(latest))
        ? item.retrievedAt
        : latest,
    null
  );

  const dashboardDate = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();

  const pageTitles = {
    overview: ["Overview", "Your marketplace safety dashboard"],
    analyze: ["New analysis", "Evaluate a product listing before you buy"],
    history: ["Assessment history", "Review your recent product checks"],
    result: ["Analysis report", "Transparent signals to support your decision"],
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex min-h-screen flex-col border-r border-slate-200 bg-white px-5 py-6">
        <button
          type="button"
          onClick={() => setView("overview")}
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
            onClick={() => setView("overview")}
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
            onClick={() => setView("history")}
            count={history.length}
          >
            History
          </NavButton>
        </nav>

        <div className="mt-auto pt-10">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                health === "connected"
                  ? "bg-emerald-500"
                  : health === "checking"
                    ? "animate-pulse bg-amber-500"
                    : "bg-red-500"
              }`}
            />

            <div className="min-w-0">
              <strong className="block text-xs font-semibold text-slate-800">
                {health === "connected"
                  ? "Database connected"
                  : health === "database-offline"
                    ? "MongoDB disconnected"
                    : health === "checking"
                      ? "Checking connection"
                      : "API unavailable"}
              </strong>

              <span className="mt-1 block text-xs text-slate-500">
                {records.length} market observations
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
              FV
            </div>

            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">
                Fraudviser demo
              </strong>
              <span className="block text-xs text-slate-500">
                Local workspace
              </span>
            </div>

            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Fraudviser</span>
            <span className="text-slate-300">/</span>
            <strong className="text-slate-900">{pageTitles[view][0]}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              <span
                className={`h-2 w-2 rounded-full ${
                  health === "connected" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {health === "connected"
                ? "System operational"
                : health === "database-offline"
                  ? "Database disconnected"
                  : health === "checking"
                    ? "Checking system"
                    : "API unavailable"}
            </span>

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

          {view === "overview" && (
            <>
              <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <div className="text-xs font-bold tracking-[0.13em] text-slate-500">
                    {dashboardDate} <span className="text-emerald-600">·</span>{" "}
                    NIGERIA
                  </div>

                  <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl">
                    Make your next purchase with confidence.
                  </h1>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Compare a listing against market observations and see the
                    signals behind its risk assessment.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 lg:self-auto"
                  onClick={startNew}
                >
                  <Plus size={17} />
                  Analyse a listing
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={23} />
                </div>

                <div className="flex-1">
                  <strong className="text-base font-semibold text-slate-900">
                    A clearer way to shop online
                  </strong>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Fraudviser compares product listings with recorded
                    observations and explains the signals it can actually see.
                  </p>
                </div>

                <span className="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold tracking-wide text-slate-600">
                  DECISION SUPPORT
                </span>
              </div>

              <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  icon={<Database size={19} />}
                  label="Market observations"
                  value={records.length.toLocaleString()}
                  note={
                    records.length
                      ? `${demoCount} demonstration · ${
                          records.length - demoCount
                        } other`
                      : "Import or seed data to begin"
                  }
                />

                <StatCard
                  icon={<History size={19} />}
                  label="Assessments made"
                  value={history.length.toString()}
                  note="Saved assessment history"
                />

                <StatCard
                  icon={<Activity size={19} />}
                  label="Market data status"
                  value={records.length ? "Available" : "No records yet"}
                  note={
                    latestMarketRecord
                      ? `Last update ${date(latestMarketRecord)}${
                          sources.length ? ` · ${sources.join(", ")}` : ""
                        }`
                      : "No market observations recorded"
                  }
                />
              </section>

              <SectionHeading
                title="Recent assessments"
                description="Your latest listing checks appear here."
                action={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                    onClick={() => setView("history")}
                  >
                    View history <ArrowRight size={15} />
                  </button>
                }
              />

              <AssessmentTable
                items={history.slice(0, 5)}
                onOpen={showAssessment}
                onNew={startNew}
              />

              <section className="mt-7 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Database size={19} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Market data and sources
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      Data is not presented as live unless a verified provider
                      supplies it. Import records you are permitted to use, or
                      seed clearly labelled demonstration data.
                    </p>

                    {importMessage && (
                      <p
                        role="status"
                        className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
                      >
                        {importMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={importRef}
                    className="hidden"
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImport}
                  />

                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={16} />
                    Import JSON
                  </button>

                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={async () => {
                      try {
                        const response = await api.post(
                          "/market-prices/refresh"
                        );

                        setImportMessage(
                          response.data.message || "Refresh request completed."
                        );
                        await refresh();
                      } catch (err) {
                        setImportMessage(
                          err.response?.data?.error ||
                            "No external live provider is configured. Import data or run npm run seed:demo."
                        );
                      }
                    }}
                  >
                    <Activity size={16} />
                    Refresh source
                  </button>
                </div>
              </section>

              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-600 sm:flex-row sm:items-center">
                <CircleAlert size={17} className="shrink-0 text-slate-500" />
                <span className="flex-1 leading-6">
                  Demonstration observations are illustrative only. They are
                  not live marketplace listings, and a risk assessment cannot
                  guarantee that a seller is safe or fraudulent.
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 self-start font-semibold text-emerald-700 hover:text-emerald-900"
                  onClick={refresh}
                >
                  Refresh <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}

          {view === "analyze" && (
            <>
              <PageHeading
                eyebrow="LISTING EVALUATION"
                title="New analysis"
                description="Evaluate a product listing before you buy."
                action={
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setView("overview")}
                  >
                    <ArrowLeft size={16} /> Dashboard
                  </button>
                }
              />

              <form
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
                onSubmit={handleAnalyze}
              >
                <FormSection
                  number="01"
                  title="Product details"
                  description="Be specific so we can find genuinely comparable observations."
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Product name" required>
                    <input
                      required
                      maxLength={120}
                      placeholder="e.g. Apple iPhone 13"
                      value={form.productName}
                      onChange={(e) =>
                        setForm({ ...form, productName: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Category" required>
                    <select
                      required
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                    >
                      <option>Smartphones</option>
                      <option>Laptops</option>
                      <option>Tablets</option>
                      <option>Audio</option>
                      <option>Other electronics</option>
                    </select>
                  </Field>

                  <Field label="Brand">
                    <input
                      placeholder="e.g. Apple"
                      value={form.brand}
                      onChange={(e) =>
                        setForm({ ...form, brand: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Model" required>
                    <input
                      required
                      placeholder="e.g. iPhone 13"
                      value={form.model}
                      onChange={(e) =>
                        setForm({ ...form, model: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Storage / specification" required>
                    <input
                      required
                      placeholder="e.g. 128GB"
                      value={form.storage}
                      onChange={(e) =>
                        setForm({ ...form, storage: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Condition" required>
                    <select
                      required
                      value={form.condition}
                      onChange={(e) =>
                        setForm({ ...form, condition: e.target.value })
                      }
                    >
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="refurbished">Refurbished</option>
                    </select>
                  </Field>
                </div>

                <div className="mt-10">
                  <FormSection
                    number="02"
                    title="Listing details"
                    description="Add the price and available seller information."
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Asking price (NGN)" required>
                    <div className="flex overflow-hidden rounded-xl border border-slate-300 transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">
                        ₦
                      </span>
                      <input
                        className="min-w-0 flex-1 border-0 px-3 py-3 text-sm outline-none focus:ring-0"
                        required
                        type="number"
                        min="1"
                        max="1000000000"
                        step="1"
                        placeholder="e.g. 480000"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: e.target.value })
                        }
                      />
                    </div>
                  </Field>

                  <Field label="Seller name">
                    <input
                      maxLength={120}
                      placeholder="Seller or shop name"
                      value={form.seller}
                      onChange={(e) =>
                        setForm({ ...form, seller: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Marketplace">
                    <input
                      maxLength={120}
                      placeholder="e.g. Jiji, Instagram, shop"
                      value={form.marketplace}
                      onChange={(e) =>
                        setForm({ ...form, marketplace: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Listing URL">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.url}
                      onChange={(e) =>
                        setForm({ ...form, url: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Seller description">
                    <textarea
                      rows={3}
                      maxLength={1500}
                      placeholder="Copy the relevant listing description, if available"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Additional observations">
                    <textarea
                      rows={3}
                      maxLength={1500}
                      placeholder="Anything you noticed about the offer or seller"
                      value={form.observations}
                      onChange={(e) =>
                        setForm({ ...form, observations: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-7 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <Shield size={17} className="mt-1 shrink-0" />
                  <p>
                    Your assessment is saved to the database connected to your
                    API. Risk scores are decision-support signals, not verified
                    probabilities of fraud.
                  </p>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setView("overview")}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading || health !== "connected"}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Analysing...
                      </>
                    ) : (
                      <>
                        Analyse listing <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                {health !== "connected" && (
                  <p className="mt-4 text-right text-sm text-amber-700">
                    Connect the API and MongoDB before submitting an assessment.
                  </p>
                )}
              </form>
            </>
          )}

          {view === "history" && (
            <>
              <PageHeading
                eyebrow="YOUR SAVED CHECKS"
                title="Assessment history"
                description="Review your recent product checks."
                action={
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                    onClick={startNew}
                  >
                    <Plus size={16} /> New analysis
                  </button>
                }
              />

              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-emerald-600 sm:max-w-md">
                  <Search size={17} className="shrink-0 text-slate-400" />
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none focus:ring-0"
                    placeholder="Search product or marketplace..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <span className="text-sm text-slate-500">
                  {filteredHistory.length} assessment
                  {filteredHistory.length === 1 ? "" : "s"}
                </span>
              </div>

              <AssessmentTable
                items={filteredHistory}
                onOpen={showAssessment}
                onNew={startNew}
              />
            </>
          )}

          {view === "result" && assessment && (
            <ResultView
              assessment={assessment}
              onBack={() => setView("history")}
              onNew={startNew}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, icon, count, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
            active
              ? "bg-white/15 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, note }) {
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

function SectionHeading({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
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

function FormSection({ number, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">
        {number}
      </span>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, required = false, children }) {
  const controlClass =
    "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  let child = children;

  if (children && children.type !== "div") {
    child = cloneElement(children, {
      className: `${controlClass} ${children.props.className || ""}`.trim(),
    });
  }

  return (
    <label className="block min-w-0 text-sm font-medium text-slate-700">
      <span>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {child}
    </label>
  );
}

function RiskBadge({ level }) {
  const risk = getRiskStyle(level);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${risk.style}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${risk.dot}`} />
      <span className="truncate">{level}</span>
    </span>
  );
}

function AssessmentTable({ items, onOpen, onNew }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Smartphone size={24} />
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                "Product",
                "Marketplace",
                "Asking price",
                "Risk assessment",
                "Date",
                "",
              ].map((heading, index) => (
                <th
                  key={`${heading}-${index}`}
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
              const level = getRiskLevel(item);
              const id = item._id || item.id;

              return (
                <tr
                  key={id || `${listing.productName}-${listing.model}`}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Smartphone size={18} />
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

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {listing.marketplace || "Not provided"}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                    {money(listing.price)}
                  </td>

                  <td className="px-5 py-4">
                    <RiskBadge level={level} />
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

function ResultView({ assessment, onBack, onNew }) {
  const listing = getListing(assessment);
  const result = getAssessment(assessment);
  const level = getRiskLevel(assessment);

  const summary =
    result.summary ||
    result.explanation ||
    result.recommendation ||
    "Review the available information carefully before making a purchase.";

  const signals = result.signals || result.riskFactors || result.reasons || [];

  const signalList = Array.isArray(signals)
    ? signals
    : Object.entries(signals).map(([key, value]) => ({
        title: key,
        description:
          typeof value === "string" ? value : JSON.stringify(value),
      }));

  const score =
    result.score ?? result.riskScore ?? result.assessmentScore ?? null;

  const scoreNumber =
    score !== null && Number.isFinite(Number(score))
      ? Number(score)
      : null;

  // Gemini AI assessment is read from the saved assessment.
  const ai = assessment?.aiAssessment || result.aiAssessment || {};

  const aiAvailable = ai.available === true;

  const aiSummary =
    ai.summary || ai.explanation || ai.assessment || "";

  const aiWarnings = Array.isArray(ai.warningSigns) ? ai.warningSigns : [];
  const aiAdvice = Array.isArray(ai.safetyAdvice) ? ai.safetyAdvice : [];
  const aiLimitations = ai.limitations || "";

  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENT REPORT"
        title="Analysis report"
        description="Review the recorded details and signals for this listing."
        action={
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onBack}
          >
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={24} />
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-slate-500">
                LISTING ASSESSED
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
                {listing.productName || "Unnamed product"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {[listing.brand, listing.model, listing.storage]
                  .filter(Boolean)
                  .join(" · ") || "No additional specifications provided"}
              </p>
            </div>
          </div>

          <RiskBadge level={level} />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
          <ResultDetail label="Asking price" value={money(listing.price)} />
          <ResultDetail
            label="Condition"
            value={listing.condition || "Not provided"}
          />
          <ResultDetail
            label="Marketplace"
            value={listing.marketplace || "Not provided"}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Assessment findings
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Information returned by the analysis API
              </p>
            </div>
          </div>

          {scoreNumber !== null && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Reported assessment score
                </span>
                <strong className="text-xl font-bold text-slate-900">
                  {scoreNumber}
                </strong>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-800">Summary</h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
              {summary}
            </p>
          </div>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-800">
              Signals and observations
            </h4>

            {signalList.length > 0 ? (
              <div className="mt-4 space-y-3">
                {signalList.map((signal, index) => {
                  const title =
                    typeof signal === "string"
                      ? `Observation ${index + 1}`
                      : signal.title ||
                        signal.name ||
                        signal.type ||
                        `Observation ${index + 1}`;

                  const description =
                    typeof signal === "string"
                      ? signal
                      : signal.description ||
                        signal.message ||
                        signal.reason ||
                        signal.detail ||
                        "No further explanation provided.";

                  return (
                    <div
                      key={`${title}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Check size={15} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-slate-800">
                          {title}
                        </h5>
                        <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                          {description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                The API did not return a separate list of signals for this
                assessment. Check the summary and listing information above.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Database size={19} />
              </div>
              <h3 className="font-semibold text-slate-900">
                Listing information
              </h3>
            </div>

            <div className="mt-5 space-y-4">
              <ResultDetail
                label="Seller"
                value={listing.seller || "Not provided"}
              />
              <ResultDetail
                label="Category"
                value={listing.category || "Not provided"}
              />
              <ResultDetail
                label="Assessment date"
                value={date(assessment.createdAt || assessment.assessedAt)}
              />

              {listing.url && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Listing URL
                  </span>
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                  >
                    Open listing
                  </a>
                </div>
              )}
            </div>
          </section>

          {listing.description && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Seller description
              </h3>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {listing.description}
              </p>
            </section>
          )}

          {listing.observations && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Your observations
              </h3>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {listing.observations}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Gemini AI assessment */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} />
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">
              Gemini AI review
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Additional guidance based on the information supplied with this
              listing.
            </p>
          </div>

          <span
            className={`ml-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              aiAvailable
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {aiAvailable ? "AI review available" : "AI review unavailable"}
          </span>
        </div>

        {aiAvailable ? (
          <div className="mt-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                AI summary
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                {aiSummary || "No AI summary was returned."}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-800">
                Warning signs
              </h4>

              {aiWarnings.length ? (
                <ul className="mt-3 space-y-2">
                  {aiWarnings.map((warning, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                    >
                      <CircleAlert size={17} className="mt-1 shrink-0" />
                      <span>
                        {typeof warning === "string"
                          ? warning
                          : warning.description ||
                            warning.message ||
                            warning.title ||
                            JSON.stringify(warning)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No specific warning signs were returned. This does not prove
                  the listing or seller is safe.
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-800">
                Safety advice
              </h4>

              {aiAdvice.length ? (
                <ul className="mt-3 space-y-3">
                  {aiAdvice.map((advice, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <Check size={14} />
                      </span>
                      <span className="text-sm leading-6 text-slate-600">
                        {typeof advice === "string"
                          ? advice
                          : advice.description ||
                            advice.message ||
                            advice.title ||
                            JSON.stringify(advice)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No additional safety advice was returned.
                </p>
              )}
            </div>

            {aiLimitations && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800">
                  Limitations
                </h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {aiLimitations}
                </p>
              </div>
            )}

            {ai.model && (
              <p className="text-xs text-slate-400">
                AI model: {ai.model}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              {ai.explanation ||
                ai.error ||
                "The AI review could not be generated for this assessment. The rule-based findings above are still available."}
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <CircleAlert size={18} className="mt-0.5 shrink-0" />
        <p>
          This report supports your decision; it does not prove that a seller
          is genuine or fraudulent. Verify the product, seller identity, and
          payment arrangements independently before paying.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          <History size={16} /> Assessment history
        </button>

        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          onClick={onNew}
        >
          <Plus size={16} /> Analyse another listing
        </button>
      </div>
    </>
  );
}

function ResultDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="mt-1 block break-words text-sm font-semibold capitalize text-slate-800">
        {value || "Not provided"}
      </span>
    </div>
  );
}

export default App;