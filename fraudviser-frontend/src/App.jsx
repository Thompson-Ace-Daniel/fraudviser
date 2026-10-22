import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
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
import api from "../api/axios.js";

const money = (value) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(value);
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
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
const initials = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "FV";

function App() {
  const [view, setView] = useState("overview");
  const [health, setHealth] = useState("checking");
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState(blankForm);
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
          api.get("/analysis").catch(() => ({ data: { items: [], total: 0 } })),
        ]);
      setHealth(
        healthResponse?.data?.database === "connected"
          ? "connected"
          : healthResponse?.data?.api === "running"
            ? "database-offline"
            : "offline",
      );
      setRecords(marketResponse.data.items || []);
      setHistory(historyResponse.data.items || []);
    } catch {
      setHealth("offline");
    }
  }, []);
  useEffect(() => {
    Promise.resolve().then(refresh);
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
          err.response?.data?.error || "Could not load this assessment.",
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
      const response = await api.post("/analysis", form);
      setAssessment(response.data);
      setView("result");
      await refresh();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to save assessment. Check that the API and MongoDB are running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setForm(blankForm);
    setError("");
    setView("analyze");
  };
  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage("");
    try {
      const text = await file.text();
      const recordsToImport = JSON.parse(text);
      const response = await api.post("/market-prices/import", {
        records: Array.isArray(recordsToImport)
          ? recordsToImport
          : recordsToImport.records,
        metadata: { source: file.name, sourceType: "imported" },
      });
      setImportMessage(
        `${response.data.received} permitted observation(s) imported and labelled “imported”.`,
      );
      await refresh();
    } catch (err) {
      setImportMessage(
        err.response?.data?.error ||
          "Could not import the file. Use a JSON array of records with productName, category, model, condition and price.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const filteredHistory = useMemo(
    () =>
      history.filter((item) =>
        `${item.listing?.productName} ${item.listing?.model} ${item.listing?.marketplace}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [history, query],
  );
  const demoCount = records.filter((item) => item.sourceType === "demo").length;
  const sources = [...new Set(records.map((item) => item.sourceType))];
  const latestMarketRecord = records.reduce(
    (latest, item) =>
      item.retrievedAt &&
      (!latest || new Date(item.retrievedAt) > new Date(latest))
        ? item.retrievedAt
        : latest,
    null,
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Shield size={21} strokeWidth={2.4} />
          </span>
          <span>
            Fraudviser<span className="brand-period">.</span>
            <small>BUY WITH CLARITY</small>
          </span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <button
            className={`nav-item ${view === "overview" ? "selected" : ""}`}
            onClick={() => setView("overview")}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button
            className={`nav-item ${view === "analyze" ? "selected" : ""}`}
            onClick={startNew}
          >
            <Activity size={18} />
            Analyse a listing
          </button>
          <button
            className={`nav-item ${view === "history" ? "selected" : ""}`}
            onClick={() => setView("history")}
          >
            <History size={18} />
            History<span className="nav-count">{history.length}</span>
          </button>
        </nav>
        <div className="side-bottom">
          <div className="data-status">
            <span
              className={`status-dot ${health === "connected" ? "green" : health === "checking" ? "amber" : "red"}`}
            />
            <div>
              <strong>
                {health === "connected"
                  ? "Database connected"
                  : health === "database-offline"
                    ? "MongoDB disconnected"
                    : health === "checking"
                      ? "Checking connection"
                      : "API unavailable"}
              </strong>
              <small>{records.length} market observations</small>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">FV</div>
            <div>
              <strong>Fraudviser demo</strong>
              <small>Local workspace</small>
            </div>
            <ChevronDown size={16} className="muted" />
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Fraudviser</span>
            <span className="crumb-slash">/</span>
            <strong>{pageTitles[view][0]}</strong>
          </div>
          <div className="top-actions">
            <span
              className={`connection-pill ${health === "connected" ? "online" : ""}`}
            >
              <span className="status-dot" />
              {health === "connected"
                ? "System operational"
                : health === "database-offline"
                  ? "Database disconnected"
                  : "API unavailable"}
            </span>
            <button
              className="button button-dark button-small"
              onClick={startNew}
            >
              <Plus size={16} /> New analysis
            </button>
          </div>
        </header>
        <div className="content-wrap">
          {error && (
            <div className="alert alert-error">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {dashboardDate} <span className="eyebrow-dot">·</span>{" "}
                    NIGERIA
                  </div>
                  <h1>
                    Make your next purchase
                    <br className="mobile-break" /> with confidence.
                  </h1>
                  <p>
                    Compare a listing against market observations and see the
                    signals behind its risk assessment.
                  </p>
                </div>
                <button className="button button-dark" onClick={startNew}>
                  <Plus size={17} /> Analyse a listing <ArrowRight size={16} />
                </button>
              </div>
              <div className="welcome-banner">
                <div className="banner-icon">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <strong>A clearer way to shop online</strong>
                  <p>
                    Fraudviser compares product listings with recorded
                    observations and explains the signals it can actually see.
                  </p>
                </div>
                <span className="banner-tag">DECISION SUPPORT</span>
              </div>
              <section className="stats-grid">
                <StatCard
                  icon={<Database size={18} />}
                  label="Market observations"
                  value={records.length.toLocaleString()}
                  note={
                    records.length
                      ? `${demoCount} demonstration · ${records.length - demoCount} other`
                      : "Import or seed data to begin"
                  }
                  accent="blue"
                />
                <StatCard
                  icon={<History size={18} />}
                  label="Assessments made"
                  value={history.length.toString()}
                  note="Saved to your assessment history"
                  accent="violet"
                />
                <StatCard
                  icon={<Activity size={18} />}
                  label="Market data status"
                  value={records.length ? "Available" : "No records yet"}
                  note={
                    latestMarketRecord
                      ? `Last recorded update ${date(latestMarketRecord)} · ${sources.join(", ")}`
                      : "No fabricated prices are shown"
                  }
                  accent="green"
                />
              </section>
              <div className="section-heading">
                <div>
                  <h2>Recent assessments</h2>
                  <p>Your latest listing checks appear here.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setView("history")}
                >
                  View history <ArrowRight size={15} />
                </button>
              </div>
              <AssessmentTable
                items={history.slice(0, 5)}
                onOpen={showAssessment}
                onNew={startNew}
              />
              <section className="data-card">
                <div className="data-card-copy">
                  <div className="card-icon">
                    <Database size={18} />
                  </div>
                  <div>
                    <h3>Market data &amp; provenance</h3>
                    <p>
                      Data is never presented as live unless a verified provider
                      supplies it. Seed demo observations explicitly or import
                      records you are permitted to use.
                    </p>
                    {importMessage && (
                      <div className="import-message">{importMessage}</div>
                    )}
                  </div>
                </div>
                <div className="data-card-actions">
                  <button
                    className="button button-outline"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={16} /> Import JSON
                  </button>
                  <button
                    className="button button-quiet"
                    onClick={async () => {
                      try {
                        const r = await api.post("/market-prices/refresh");
                        setImportMessage(
                          r.data.message ||
                            "No external live provider is configured.",
                        );
                      } catch (err) {
                        setImportMessage(
                          err.response?.data?.error ||
                            "No external live provider is configured. Import data or run npm run seed:demo.",
                        );
                      }
                    }}
                  >
                    <Activity size={16} /> Refresh source
                  </button>
                  <input
                    ref={importRef}
                    className="visually-hidden"
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImport}
                  />
                </div>
              </section>
              <div className="data-note">
                <CircleAlert size={16} />
                <span>
                  Demonstration observations are illustrative only. They are
                  clearly identified and are not live marketplace listings.
                </span>
                <button className="text-button" onClick={refresh}>
                  Refresh <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {view === "analyze" && (
            <>
              <div className="compact-heading">
                <div>
                  <div className="eyebrow">LISTING EVALUATION</div>
                  <h1>{pageTitles.analyze[0]}</h1>
                  <p>
                    {pageTitles.analyze[1]}. All fields marked required must be
                    completed.
                  </p>
                </div>
                <button
                  className="button button-outline"
                  onClick={() => setView("overview")}
                >
                  <ArrowLeft size={16} /> Dashboard
                </button>
              </div>
              <form className="form-card" onSubmit={handleAnalyze}>
                <div className="form-section-title">
                  <span className="step-number">01</span>
                  <div>
                    <h2>Product details</h2>
                    <p>
                      Be specific so we can find genuinely comparable
                      observations.
                    </p>
                  </div>
                </div>
                <div className="form-grid">
                  <Field label="Product name" required>
                    <input
                      required
                      maxLength="120"
                      placeholder="e.g. Apple iPhone 13"
                      value={form.productName}
                      onChange={(e) =>
                        setForm({ ...form, productName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Category" required>
                    <select
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
                <div className="form-section-title section-spaced">
                  <span className="step-number">02</span>
                  <div>
                    <h2>Listing details</h2>
                    <p>
                      These details provide context for the observed risk
                      signals.
                    </p>
                  </div>
                </div>
                <div className="form-grid">
                  <Field label="Asking price" required>
                    <div className="input-prefix">
                      <span>₦</span>
                      <input
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
                      maxLength="120"
                      placeholder="Seller or shop name"
                      value={form.seller}
                      onChange={(e) =>
                        setForm({ ...form, seller: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Marketplace">
                    <input
                      maxLength="120"
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
                  <Field label="Seller description" className="field-wide">
                    <textarea
                      rows="3"
                      maxLength="1500"
                      placeholder="Copy the relevant listing description, if available"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Additional observations" className="field-wide">
                    <textarea
                      rows="3"
                      maxLength="1500"
                      placeholder="Anything you noticed about the offer or seller"
                      value={form.observations}
                      onChange={(e) =>
                        setForm({ ...form, observations: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="form-footnote">
                  <Shield size={16} />
                  <span>
                    Your assessment is saved to this local demonstration
                    database. Risk scores are explainable decision-support
                    signals, not fraud probabilities.
                  </span>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setView("overview")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-dark"
                    disabled={loading || health !== "connected"}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="spin" size={17} /> Analysing...
                      </>
                    ) : (
                      <>
                        Analyse listing <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
                {health !== "connected" && (
                  <p className="inline-help">
                    Connect the API and MongoDB before submitting an assessment.
                  </p>
                )}
              </form>
            </>
          )}
          {view === "history" && (
            <>
              <div className="compact-heading">
                <div>
                  <div className="eyebrow">YOUR SAVED CHECKS</div>
                  <h1>{pageTitles.history[0]}</h1>
                  <p>{pageTitles.history[1]}.</p>
                </div>
                <button className="button button-dark" onClick={startNew}>
                  <Plus size={16} /> New analysis
                </button>
              </div>
              <div className="history-tools">
                <div className="searchbox">
                  <Search size={17} />
                  <input
                    placeholder="Search product or marketplace..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <span>
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

function StatCard({ icon, label, value, note, accent }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${accent}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}
function Field({ label, required, className = "", children }) {
  return (
    <label className={`field ${className}`}>
      <span>
        {label}
        {required && <i> *</i>}
      </span>
      {children}
    </label>
  );
}
function RiskBadge({ level }) {
  const cls = level?.startsWith("Elevated")
    ? "risk-elevated"
    : level?.startsWith("Moderate")
      ? "risk-moderate"
      : level?.startsWith("Low")
        ? "risk-low"
        : "risk-insufficient";
  return (
    <span className={`risk-badge ${cls}`}>
      <span />
      {level || "Insufficient information"}
    </span>
  );
}
function AssessmentTable({ items, onOpen, onNew }) {
  if (!items.length)
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Smartphone size={22} />
        </div>
        <h3>No assessments yet</h3>
        <p>
          Start with a product listing to see its market comparison and
          observable risk signals.
        </p>
        <button className="button button-dark" onClick={onNew}>
          <Plus size={16} /> Analyse your first listing
        </button>
      </div>
    );
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>LISTING PRICE</th>
              <th>REFERENCE PRICE</th>
              <th>OBSERVED RISK</th>
              <th>DATE</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item._id}
                onClick={() => onOpen(item._id)}
                className="clickable-row"
              >
                <td>
                  <div className="product-cell">
                    <span className="product-thumb">
                      {initials(
                        item.listing?.brand || item.listing?.productName,
                      )}
                    </span>
                    <span>
                      <strong>{item.listing?.productName}</strong>
                      <small>
                        {[item.listing?.storage, item.listing?.condition]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                  </div>
                </td>
                <td className="price-cell">{money(item.listing?.price)}</td>
                <td>{money(item.priceAnalysis?.referencePrice)}</td>
                <td>
                  <RiskBadge level={item.risk?.level} />
                </td>
                <td>{date(item.createdAt)}</td>
                <td>
                  <button className="row-arrow" aria-label="Open assessment">
                    <ArrowRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ResultView({ assessment, onBack, onNew }) {
  const listing = assessment.listing || {},
    prices = assessment.priceAnalysis || {},
    risk = assessment.risk || {};
  const rangeMax = Math.max(prices.highestPrice || 0, listing.price || 0, 1);
  const marker = (value) =>
    `${Math.max(0, Math.min(100, ((value || 0) / rangeMax) * 100))}%`;
  return (
    <>
      <div className="result-top">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> Back to history
        </button>
        <span className="report-date">
          <Clock3 size={14} /> Assessed {date(assessment.createdAt)}
        </span>
      </div>
      <div className="report-title">
        <div>
          <div className="eyebrow">ASSESSMENT REPORT</div>
          <h1>{listing.productName || "Product listing"}</h1>
          <p>
            {[listing.brand, listing.model, listing.storage, listing.condition]
              .filter(Boolean)
              .join(" · ")}{" "}
            {listing.marketplace ? `· ${listing.marketplace}` : ""}
          </p>
        </div>
        <RiskBadge level={risk.level} />
      </div>
      <div className="result-grid">
        <section className="result-card price-result">
          <div className="result-card-head">
            <div>
              <div className="eyebrow">PRICE COMPARISON</div>
              <h2>How does the price compare?</h2>
            </div>
            <span className="comparison-chip">
              <BarChart3 size={15} /> {prices.count || 0} matches
            </span>
          </div>
          <div className="price-metrics">
            <div>
              <span>Your listing</span>
              <strong>{money(listing.price)}</strong>
            </div>
            <div className="metric-divider" />
            <div>
              <span>Reference median</span>
              <strong>{money(prices.referencePrice)}</strong>
            </div>
            <div className="deviation-metric">
              <ArrowDownRight size={16} />
              <span>
                {prices.available
                  ? `${prices.signedDeviationPct > 0 ? "+" : ""}${prices.signedDeviationPct}%`
                  : "Unavailable"}
              </span>
              <small>deviation</small>
            </div>
          </div>
          {prices.available ? (
            <>
              <div className="price-chart">
                <div className="price-axis">
                  <span>₦0</span>
                  <span>{money(rangeMax)}</span>
                </div>
                <div className="price-track">
                  <span
                    className="range-bar"
                    style={{
                      left: marker(prices.lowestPrice),
                      width: `${Math.max(3, ((prices.highestPrice - prices.lowestPrice) / rangeMax) * 100)}%`,
                    }}
                  />
                  <span
                    className="marker marker-listing"
                    style={{ left: marker(listing.price) }}
                    title="Listing price"
                  >
                    <i />
                  </span>
                  <span
                    className="marker marker-median"
                    style={{ left: marker(prices.referencePrice) }}
                    title="Reference median"
                  >
                    <i />
                  </span>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-listing" /> Your listing ·{" "}
                    {money(listing.price)}
                  </span>
                  <span>
                    <i className="legend-median" /> Median ·{" "}
                    {money(prices.referencePrice)}
                  </span>
                </div>
                <div className="range-summary">
                  <span>Observed range</span>
                  <strong>
                    {money(prices.lowestPrice)} — {money(prices.highestPrice)}
                  </strong>
                </div>
              </div>
              <div className="method-note">
                <Check size={15} />
                <span>
                  {prices.method}.{" "}
                  {prices.confidence === "low"
                    ? "Confidence is low because fewer than five matching observations are available."
                    : "Confidence is moderate; this remains a small observational sample."}
                </span>
              </div>
              <div className="observation-list">
                <div className="observation-heading">
                  <strong>Matching observations</strong>
                  <span>Source and recorded date</span>
                </div>
                {prices.observations?.map((item, index) => (
                  <div
                    className="observation-row"
                    key={`${item.source}-${item.retrievedAt}-${index}`}
                  >
                    <span>
                      <i className={`source-dot source-${item.sourceType}`} />
                      {item.sourceType} · {item.source}
                    </span>
                    <strong>{money(item.price)}</strong>
                    <small>{date(item.observedAt || item.retrievedAt)}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-data-note">
              <Database size={19} />
              <span>
                <strong>No comparable market estimate available</strong>
                <small>
                  There are no observations for this exact model, specification
                  and condition. Import or seed matching records and analyse
                  again.
                </small>
              </span>
            </div>
          )}
        </section>
        <section className="result-card risk-result">
          <div className="eyebrow">OBSERVED RISK SIGNALS</div>
          <h2>Risk assessment</h2>
          <div className="score-row">
            <div
              className={`score-ring ${risk.score >= 50 ? "high" : risk.score >= 25 ? "medium" : "low"}`}
            >
              <strong>{risk.score ?? 0}</strong>
              <span>/ 100</span>
            </div>
            <div>
              <RiskBadge level={risk.level} />
              <p>Rule-based signal score</p>
            </div>
          </div>
          <div className="score-meter">
            <span style={{ width: `${risk.score ?? 0}%` }} />
          </div>
          <div className="risk-disclaimer">{risk.disclaimer}</div>
          <h3 className="subsection-title">What contributed</h3>
          <div className="factor-list">
            {risk.factors?.length ? (
              risk.factors.map((factor, i) => (
                <div className="factor" key={`${factor.title}-${i}`}>
                  <span className={`factor-icon ${factor.severity}`}>
                    <CircleAlert size={15} />
                  </span>
                  <div>
                    <strong>{factor.title}</strong>
                    <p>{factor.explanation}</p>
                  </div>
                  <span className="factor-weight">+{factor.weight}</span>
                </div>
              ))
            ) : (
              <div className="factor factor-empty">
                <span className="factor-icon low">
                  <ShieldCheck size={15} />
                </span>
                <div>
                  <strong>No triggered warning rules</strong>
                  <p>This does not establish that the seller is legitimate.</p>
                </div>
              </div>
            )}
          </div>
          {!!risk.missingInformation?.length && (
            <>
              <h3 className="subsection-title">Information that would help</h3>
              <ul className="missing-list">
                {risk.missingInformation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
      <section className="result-card recommendations">
        <div className="recommendation-heading">
          <div className="recommend-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2>Before you make a payment</h2>
            <p>Practical checks to reduce the chance of a bad purchase.</p>
          </div>
        </div>
        <div className="recommend-grid">
          {(risk.recommendations || []).map((item, i) => (
            <div className="recommend-item" key={item}>
              <span>0{i + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="result-actions">
        <button className="button button-outline" onClick={onBack}>
          <ArrowLeft size={16} /> Assessment history
        </button>
        <button className="button button-dark" onClick={onNew}>
          <Plus size={16} /> Analyse another listing
        </button>
      </div>
    </>
  );
}

export default App;
