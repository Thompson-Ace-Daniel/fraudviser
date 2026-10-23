import {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../api/axios.js";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
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
  Box,
  Upload,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useMatch } from "react-router-dom";
import ResultPage from "./pages/ResultPage.jsx";

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
  category: "Other",
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
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = useMatch("/analysis/:assessmentId")?.params.assessmentId;
  const view = location.pathname.startsWith("/analysis/") ? "result" : location.pathname.slice(1) || "overview";
  const setView = (next) => navigate(next === "result" ? (assessment?._id ? `/analysis/${assessment._id}` : "/history") : next === "overview" ? "/" : `/${next}`);
  const [health, setHealth] = useState("checking");
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState(() => {
    try { return { ...blankForm, ...JSON.parse(sessionStorage.getItem("fraudviser-draft") || "{}") }; }
    catch { return { ...blankForm }; }
  });
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
  }, [setHealth, setRecords, setHistory]);

  useEffect(() => {
    Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    sessionStorage.setItem("fraudviser-draft", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    if (!assessmentId) return;
    if (String(assessment?._id || assessment?.id) === String(assessmentId)) return;
    let active = true;
    api.get(`/analysis/${assessmentId}`).then(({ data }) => {
      if (active) setAssessment(data);
    }).catch((err) => {
      if (active) setError(err.response?.data?.error || "Could not load this assessment.");
    });
    return () => { active = false; };
  }, [assessmentId, assessment]);

  const showAssessment = useCallback((item) => {
    setError("");
    const id = typeof item === "string" ? item : item?._id || item?.id;
    if (id) navigate(`/analysis/${id}`);
    else setAssessment(item);
  }, [navigate, setError, setAssessment]);

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
      navigate(`/analysis/${response.data._id || response.data.id}`);
      sessionStorage.removeItem("fraudviser-draft");
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
    sessionStorage.removeItem("fraudviser-draft");
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
          onClick={() => navigate("/")}
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
            onClick={() => navigate("/")}
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
                  description="Check any kind of product. Add identifying details to find the closest available comparisons."
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
                    <input
                      required
                      maxLength={80}
                      placeholder="e.g. Fashion, Home & Garden, Vehicles"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                    />
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

                  <Field label="Model or product identifier">
                    <input
                      placeholder="e.g. iPhone 13"
                      value={form.model}
                      onChange={(e) =>
                        setForm({ ...form, model: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Key specification (optional)">
                    <input
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
                        Analysing listing and generating AI review…
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

          {view === "result" && !assessment && !error && (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading saved assessment…</div>
          )}

          {view === "result" && assessment && (String(assessment._id || assessment.id) === String(assessmentId) || !assessmentId) && (
            <ResultPage
              assessment={assessment}
              onBack={() => navigate("/history")}
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


export default App;
