import {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api/axios.js";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Car,
  Check,
  ChevronRight,
  History,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  ShoppingBag,
  Search,
  Shield,
  ShieldCheck,
  Box,
  X,
  Wrench,
} from "lucide-react";
import { useLocation, useNavigate, useMatch } from "react-router-dom";
import ResultPage from "./pages/ResultPage.jsx";
import useAuth from "./pages/useAuth.js";

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
  category: "Electronics & phones",
  productType: "goods",
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

const productTypes = [
  { label: "Electronics & phones", detail: "Phones, laptops, appliances", icon: Box, kind: "goods" },
  { label: "Food & groceries", detail: "Food, drinks, household goods", icon: ShoppingBag, kind: "goods" },
  { label: "Fashion & beauty", detail: "Clothing, shoes, personal care", icon: ShoppingBag, kind: "goods" },
  { label: "Vehicles & parts", detail: "Cars, bikes, spare parts", icon: Car, kind: "goods" },
  { label: "Home & furniture", detail: "Furniture, decor, equipment", icon: Box, kind: "goods" },
  { label: "Services", detail: "Repairs, lessons, professional work", icon: Wrench, kind: "service" },
  { label: "Other", detail: "Something not listed here", icon: Box, kind: "goods" },
];

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
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = useMatch("/analysis/:assessmentId")?.params.assessmentId;
  const pathView = location.pathname.slice(1) || "overview";
  const view = location.pathname.startsWith("/analysis/") ? "result" : pathView === "app" ? "overview" : pathView;
  const setView = (next) => navigate(next === "result" ? (assessment?._id ? `/analysis/${assessment._id}` : "/history") : next === "overview" ? "/app" : `/${next}`);
  const [history, setHistory] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState(() => {
    try { return { ...blankForm, ...JSON.parse(sessionStorage.getItem("fraudviser-draft") || "{}") }; }
    catch { return { ...blankForm }; }
  });
  const [loading, setLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const historyResponse = await api.get("/analysis");

      setHistory(
        Array.isArray(historyResponse?.data?.items)
          ? historyResponse.data.items
          : []
      );
    } catch {
      setHistory([]);
    }
  }, [setHistory]);

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
    setProgress(8);
    setError("");
    const progressTimer = setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(1, Math.round((92 - current) * 0.09))));
    }, 350);

    try {
      const response = await api.post("/analysis", {
        ...form,
        price: Number(form.price),
      });

      setAssessment(response.data);
      setProgress(100);
      navigate(`/analysis/${response.data._id || response.data.id}`);
      sessionStorage.removeItem("fraudviser-draft");
      await refresh();
    } catch (err) {
      setError(
        err.response?.status >= 500
          ? "We couldn’t complete this analysis right now. Please try again shortly."
          : err.response?.data?.error || "We couldn’t complete this analysis. Please check the details and try again."
      );
    } finally {
      clearInterval(progressTimer);
      setLoading(false);
      window.setTimeout(() => setProgress(0), 500);
    }
  };

  const startNew = () => {
    setForm({ ...blankForm });
    setFormStep(1);
    sessionStorage.removeItem("fraudviser-draft");
    setError("");
    setView("analyze");
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      navigate("/", { replace: true });
    } catch {
      setError("We couldn’t end your session right now. Please try signing out again.");
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
    analyze: ["New analysis", user?.role === "seller" ? "Review pricing and details before publishing a listing" : "Evaluate a product listing before you buy"],
    history: ["Assessment history", "Review your recent product checks"],
    result: ["Analysis report", "Transparent signals to support your decision"],
  };

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
          <span className="mt-1 block text-xs text-emerald-800">Inspect the item and verify the seller independently.</span>
        </div>
      </aside>

      <nav className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Mobile navigation">
        <button type="button" className="flex items-center gap-2 font-bold tracking-tight" onClick={() => navigate("/app")}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white"><Shield size={19} /></span>
          <span>Fraudviser<span className="text-emerald-600">.</span></span>
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Overview" title="Overview" onClick={() => navigate("/app")} className={`rounded-lg p-2.5 ${view === "overview" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}><LayoutDashboard size={19} /></button>
          <button type="button" aria-label="Analyse a listing" title="Analyse a listing" onClick={startNew} className={`rounded-lg p-2.5 ${view === "analyze" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}><Activity size={19} /></button>
          <button type="button" aria-label="Assessment history" title="History" onClick={() => navigate("/history")} className={`rounded-lg p-2.5 ${view === "history" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}><History size={19} /></button>
        </div>
      </nav>

      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Fraudviser</span>
            <span className="text-slate-300">/</span>
            <strong className="text-slate-900">{pageTitles[view][0]}</strong>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="hidden text-right sm:block"><strong className="block max-w-48 truncate text-xs text-slate-800">{user?.email}</strong><span className="text-[10px] capitalize text-slate-500">{user?.role} workspace</span></span>
            <button type="button" onClick={signOut} className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Sign out</button>
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
                    {user?.role === "seller" ? "Price your next listing with context." : "Make your next purchase with confidence."}
                  </h1>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    {user?.role === "seller" ? "Compare your listing against available market observations and make its details easier for buyers to verify." : "Compare a listing against market observations and see the signals behind its risk assessment."}
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
                  icon={<History size={19} />}
                  label={user?.role === "seller" ? "Listings reviewed" : "Assessments made"}
                  value={history.length.toString()}
                  note="Saved assessment history"
                />

                <StatCard
                  icon={<Activity size={19} />}
                  label="Account type"
                  value={user?.role === "seller" ? "Seller" : "Buyer"}
                  note="Your workspace is private to your account"
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

              <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={19} /></div>
                  <div><h3 className="font-semibold text-slate-900">{user?.role === "seller" ? "Build buyer confidence" : "A few checks before you pay"}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{user?.role === "seller" ? "Clear details and verifiable claims help buyers make informed choices." : "Use the report as a starting point, then verify important claims yourself."}</p></div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(user?.role === "seller" ? ["Use clear photos of the exact item.", "State condition, included items and defects accurately.", "Share warranty and proof of ownership details when available."] : ["Inspect the exact item and confirm its condition.", "Check that the model, size and included items match the listing.", "Avoid deposits and use a payment method with buyer protection."]).map((tip, index) => <div key={tip} className="flex min-w-0 gap-3 rounded-xl bg-slate-50 p-4"><span className="text-xs font-bold text-emerald-700">0{index + 1}</span><p className="text-sm leading-6 text-slate-600">{tip}</p></div>)}
                </div>
              </section>

              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-600 sm:flex-row sm:items-center">
                <CircleAlert size={17} className="shrink-0 text-slate-500" />
                <span className="flex-1 leading-6">
                  Market references include clearly labelled demonstration
                  records where no live source is available. They are not
                  verified marketplace listings.
                </span>
              </div>
            </>
          )}

          {view === "analyze" && (
            <>
              <PageHeading
                eyebrow="LISTING EVALUATION"
                title="New analysis"
                description={user?.role === "seller" ? "Review pricing and details before you publish your listing." : "Evaluate a product listing before you buy."}
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
                {formStep === 1 ? (
                  <>
                    <FormSection
                      number="01"
                      title="What kind of listing are you checking?"
                      description="Choose the closest match. We’ll tailor the next step to the item or service."
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {productTypes.map((type) => {
                        const TypeIcon = type.icon;
                        const active = form.category === type.label;
                        return (
                          <button
                            key={type.label}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setForm({ ...form, category: type.label, productType: type.kind, condition: type.kind === "service" ? "service" : type.label === "Food & groceries" ? "new" : form.condition === "service" || form.condition === "open_box" || form.condition === "near_expiry" ? "new" : form.condition })}
                            className={`flex min-h-24 min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"}`}
                          >
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}><TypeIcon size={20} /></span>
                            <span className="min-w-0 flex-1"><strong className="block break-words text-sm font-semibold text-slate-900">{type.label}</strong><small className="mt-1 block text-xs leading-5 text-slate-500">{type.detail}</small></span>
                            {active && <Check size={17} className="shrink-0 text-emerald-700" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
                      <button type="button" onClick={() => setFormStep(2)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Continue <ChevronRight size={17} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-7 flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700"><Box size={19} /></span><span><small className="block text-xs font-semibold uppercase tracking-wider text-emerald-700">Listing type</small><strong className="mt-0.5 block text-sm text-emerald-950">{form.category}</strong></span></div>
                      <button type="button" onClick={() => setFormStep(1)} className="self-start text-sm font-semibold text-emerald-800 underline underline-offset-4 sm:self-auto">Change type</button>
                    </div>
                    <FormSection
                      number="02"
                      title="Tell us about the listing"
                      description="Add the details that identify this item or service and help us find fair comparisons."
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label={form.productType === "service" ? "Service name" : form.category === "Food & groceries" ? "Product name" : "Product name"} required>
                        <input required maxLength={120} placeholder={form.category === "Services" ? "e.g. Phone screen repair" : form.category === "Food & groceries" ? "e.g. 5kg bag of rice" : "e.g. Apple iPhone 13"} value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
                      </Field>

                      <Field label={form.category === "Vehicles & parts" ? "Make" : form.category === "Services" ? "Provider / business name" : form.category === "Food & groceries" ? "Brand / producer" : "Brand (if known)"}>
                        <input placeholder={form.category === "Vehicles & parts" ? "e.g. Toyota" : form.category === "Services" ? "e.g. Ayo Repairs" : "e.g. Apple"} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                      </Field>

                      <Field label={form.category === "Vehicles & parts" ? "Model and year" : form.category === "Food & groceries" ? "Variety / product type" : form.category === "Services" ? "Service scope" : "Model or product identifier"}>
                        <input placeholder={form.category === "Vehicles & parts" ? "e.g. Corolla 2018" : form.category === "Food & groceries" ? "e.g. Ofada rice" : form.category === "Services" ? "e.g. Screen replacement" : "e.g. iPhone 13"} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                      </Field>

                      <Field label={form.category === "Food & groceries" ? "Pack size / quantity" : form.category === "Vehicles & parts" ? "Mileage or key specification" : form.category === "Services" ? "Duration / deliverables" : "Size or key specification"}>
                        <input placeholder={form.category === "Food & groceries" ? "e.g. 5kg" : form.category === "Vehicles & parts" ? "e.g. 85,000 km" : form.category === "Services" ? "e.g. 2 hours, materials included" : "e.g. 128GB, size 42"} value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} />
                      </Field>

                      {form.productType !== "service" && (
                        <Field label={form.category === "Food & groceries" ? "Package condition" : "Condition"} required>
                          <select required value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                            {form.category === "Food & groceries" ? <><option value="new">Fresh / sealed</option><option value="open_box">Opened</option><option value="near_expiry">Near expiry / date needs checking</option></> : <><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></>}
                          </select>
                        </Field>
                      )}
                    </div>

                    <div className="mt-10">
                      <FormSection number="03" title="Listing details" description="Add the asking price and any seller information you have." />
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
                    We compare like-for-like records where available. Any risk
                    score is decision support, not proof that a seller is safe
                    or fraudulent.
                  </p>
                </div>

                {loading && (
                  <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" role="status" aria-live="polite">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-emerald-950">
                      <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" />Preparing your buying advice</span>
                      <span className="text-xs tabular-nums text-emerald-800">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-emerald-100" role="progressbar" aria-label="Analysis progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
                    <p className="mt-2 text-xs text-emerald-800">{progress < 28 ? "Checking listing details" : progress < 58 ? "Comparing similar items" : progress < 84 ? "Reviewing visible warning signs" : "Preparing practical next steps"}</p>
                  </div>
                )}

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
                  <button type="button" className="min-h-11 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => formStep === 2 ? setFormStep(1) : setView("overview")}>
                    <ArrowLeft size={16} className="mr-2 inline" />{formStep === 2 ? "Back to listing type" : "Cancel"}
                  </button>
                  <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70">
                    {loading ? "Reviewing listing…" : <>Analyse and get advice <ArrowRight size={16} /></>}
                  </button>
                </div>
                  </>
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
