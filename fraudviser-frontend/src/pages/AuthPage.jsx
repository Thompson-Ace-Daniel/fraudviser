import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import api from "../../api/axios.js";
import useAuth from "./useAuth.js";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const location = useLocation();
  const [form, setForm] = useState(() => ({ email: "", password: "", role: location.state?.role === "seller" ? "seller" : "buyer" }));
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const destination = typeof location.state?.from === "string" && location.state.from.startsWith("/") ? location.state.from : "/app";
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { data } = await api.post(`/auth/${isRegister ? "register" : "login"}`, form);
      setUser(data.user); navigate(destination, { replace: true });
    } catch (err) { setError(err.response?.data?.error || "We couldn’t sign you in. Please try again."); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#f7f8f4] px-4 py-6 sm:px-8 sm:py-10">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between"><Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-slate-950"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 text-white"><ShieldCheck size={21} /></span>Fraudviser<span className="-ml-2 text-emerald-600">.</span></Link><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16} />Back to home</Link></div>
    <div className="mx-auto grid min-h-[calc(100vh-120px)] w-full max-w-5xl items-center gap-10 py-8 lg:grid-cols-[1fr_.9fr]">
      <section className="hidden rounded-[2rem] bg-[#0b392c] p-10 text-white lg:block"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Buy and sell with more clarity</p><h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-tight">A smarter pause before the payment.</h1><p className="mt-4 max-w-md leading-7 text-emerald-50/75">Compare listing prices, review practical risk signals and keep each assessment together in your private workspace.</p><div className="mt-12 rounded-2xl border border-white/15 bg-white/5 p-5"><p className="text-sm leading-6 text-emerald-50">Your account keeps your assessments private to you. Sellers can use the same tools to check their prices before publishing a listing.</p></div></section>
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[.17em] text-emerald-700">Your workspace</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{isRegister ? "Create your account" : "Welcome back"}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{isRegister ? "Start checking listings and keep your analysis history in one place." : "Sign in to continue to your private analysis workspace."}</p>
        <form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-800">Email address<input required autoComplete="email" type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder="you@example.com" /></label>
          {isRegister && <fieldset><legend className="text-sm font-semibold text-slate-800">How will you use Fraudviser?</legend><div className="mt-2 grid grid-cols-2 gap-2">{[["buyer", "I buy online"], ["seller", "I sell online"]].map(([role, label]) => <button type="button" key={role} onClick={() => setForm({ ...form, role })} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${form.role === role ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div></fieldset>}
          <label className="block text-sm font-semibold text-slate-800">Password<div className="relative mt-2"><input required autoComplete={isRegister ? "new-password" : "current-password"} type={showPassword ? "text" : "password"} minLength={isRegister ? 10 : 1} maxLength={128} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="min-h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder={isRegister ? "At least 10 characters" : "Your password"} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{error}</p>}
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:opacity-60">{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}{!busy && <ArrowRight size={17} />}</button>
        </form><p className="mt-6 text-center text-sm text-slate-500">{isRegister ? "Already have an account?" : "New to Fraudviser?"} <Link to={isRegister ? "/login" : "/register"} className="font-bold text-emerald-800 hover:underline">{isRegister ? "Sign in" : "Create an account"}</Link></p><p className="mt-5 text-center text-xs leading-5 text-slate-400">Passwords are securely hashed before they are stored. Your analysis history is tied to your account.</p>
      </section>
    </div>
  </main>;
}
