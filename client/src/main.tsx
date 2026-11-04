import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Ellipsis,
  FileText,
  Filter,
  Flower2,
  House,
  LogOut,
  Mail,
  Menu,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import { api, setToken, type Book, type Snapshot } from "./lib/api";
import "./index.css";
type User = {
  userId: string;
  id?: string;
  name: string;
  email: string;
  role: "ADMIN" | "AUTHOR";
  city?: string;
};
function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
function payoutLabel(period: string) {
  return period === "SOURCE_AGGREGATE" ? "All-time source aggregate" : period;
}
function initials(n: string) {
  return n
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [boot, setBoot] = useState(true),
    [page, setPage] = useState("Overview"),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [authors, setAuthors] = useState<any[]>([]),
    [notifications, setNotifications] = useState<any[]>([]),
    [selected, setSelected] = useState<any | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [cityFilter, setCityFilter] = useState("all"),
    [focused, setFocused] = useState<string | null>(null),
    [mobileOpen, setMobileOpen] = useState(false);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 3200);
  };
  useEffect(() => {
    if (!localStorage.getItem("bookleaf-token")) {
      setBoot(false);
      return;
    }
    api<{ user: any }>("/auth/me")
      .then((x) => setUser({ ...x.user, userId: x.user.id }))
      .catch(() => setToken(null))
      .finally(() => setBoot(false));
  }, []);
  const load = async (u = user) => {
    if (!u) return;
    try {
      if (u.role === "ADMIN") {
        const [a, n] = await Promise.all([
          api<{ authors: any[] }>("/admin/authors"),
          api<{ notifications: any[] }>("/notifications"),
        ]);
        setAuthors(a.authors);
        setNotifications(n.notifications);
        const id = focused || a.authors[0]?.id;
        if (id) {
          const s = await api<Snapshot>(`/admin/authors/${id}`);
          setSnapshot(s);
        }
      } else {
        setSnapshot(await api<Snapshot>("/dashboard"));
        const n = await api<{ notifications: any[] }>("/notifications");
        setNotifications(n.notifications);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not load your dashboard");
    }
  };
  useEffect(() => {
    if (user) load(user);
  }, [user, focused]);
  useEffect(() => {
    if (
      !user ||
      !notifications.some((row) =>
        ["QUEUED", "PROCESSING"].includes(row.status),
      )
    )
      return;
    const refreshNotifications = async () => {
      try {
        const result = await api<{ notifications: any[] }>("/notifications");
        setNotifications(result.notifications);
      } catch {
        // Keep the last visible state; the next poll can recover from a transient error.
      }
    };
    const timer = window.setInterval(refreshNotifications, 2000);
    return () => window.clearInterval(timer);
  }, [user, notifications]);
  const signIn = async (email: string, password: string) => {
    const data = await api<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser({ ...data.user, userId: data.user.id });
    setPage("Overview");
  };
  const logout = () => {
    setToken(null);
    setUser(null);
    setSnapshot(null);
  };
  const send = async (id?: string) => {
    setBusy(true);
    try {
      const out = id
        ? await api<any>(`/admin/authors/${id}/send-summary`, {
            method: "POST",
          })
        : await api<any>("/admin/send-pending", { method: "POST" });
      notify(id ? "Royalty summary queued" : "Bulk summaries queued");
      setTimeout(() => load(), 650);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to queue summary");
    } finally {
      setBusy(false);
    }
  };
  if (boot)
    return (
      <div className="grid min-h-screen place-items-center text-leaf">
        <Flower2 size={28} className="animate-pulse" />
      </div>
    );
  if (!user) return <Login onLogin={signIn} />;
  const admin = user.role === "ADMIN";
  const menu = [
    { name: "Overview", icon: House },
    { name: admin ? "Authors" : "My books", icon: BookOpen },
    { name: "Notifications", icon: Mail },
  ];
  const go = (p: string) => {
    setPage(p);
    setMobileOpen(false);
  };
  return (
    <div className="min-h-screen bg-paper">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#183d31] text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <Brand inverse />
          <span className="rounded bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-white/60">
            Desk
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden"
          >
            <X size={19} />
          </button>
        </div>
        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-white/40">
            Workspace
          </p>
          {menu.map((m) => (
            <button
              key={m.name}
              onClick={() => go(m.name)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${page === m.name ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/7 hover:text-white"}`}
            >
              <m.icon size={17} strokeWidth={1.8} />
              {m.name}
              {m.name === "Notifications" &&
              notifications.some((n) => n.status === "FAILED") ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rose-400" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              <ShieldCheck size={15} className="text-[#aad3b2]" />
              Secure author data
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/50">
              Your royalty information is private and protected.
            </p>
            <button
              onClick={() =>
                notify("Your account data is protected with role-based access.")
              }
              className="mt-2 flex items-center gap-1.5 text-[11px] text-[#bfddc5]"
            >
              Learn about privacy <ArrowRight size={12} />
            </button>
          </div>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}
      <main className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-line bg-paper/95 px-5 backdrop-blur md:px-9">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden">
              <Menu size={19} />
            </button>
            <div>
              <div className="text-[11px] text-muted">
                BookLeaf <span className="mx-1">/</span> {page}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold">
                {page === "Overview" ? "Royalty overview" : page}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-muted sm:flex">
              <ShieldCheck size={13} className="text-leaf" />
              Private workspace
            </div>
            <button
              onClick={() => notify("You are all caught up.")}
              className="relative rounded-lg p-2 text-[#65726b] hover:bg-white"
            >
              <Activity size={17} />
              {notifications.some(
                (n) => n.status === "PROCESSING" || n.status === "QUEUED",
              ) && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>
            <div className="mx-1 h-7 w-px bg-line" />
            <button
              className="flex items-center gap-2.5"
              onClick={() =>
                notify(
                  `${user.email} · ${admin ? "Administrator" : "Author"} account`,
                )
              }
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#dcebe0] text-[10px] font-bold text-leaf">
                {initials(user.name)}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-[11px] font-semibold">{user.name}</div>
                <div className="text-[10px] text-muted">
                  {admin ? "Operations" : "Author account"}
                </div>
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 md:px-9">
          {page === "Notifications" ? (
            <Notifications
              rows={notifications}
              admin={admin}
              onSelect={setSelected}
            />
          ) : admin && page === "Authors" ? (
            <AdminAuthors
              authors={authors}
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
              cityFilter={cityFilter}
              setCityFilter={setCityFilter}
              selected={focused}
              onSelect={setFocused}
              onSend={send}
              busy={busy}
              snapshot={snapshot}
              onNotification={() => go("Notifications")}
            />
          ) : (
            <Dashboard
              admin={admin}
              user={user}
              snap={snapshot}
              authors={authors}
              selected={focused}
              onSelect={setFocused}
              onSend={send}
              busy={busy}
              notifications={notifications}
              onNotification={() => go("Notifications")}
              onDetail={setSelected}
              onAuthors={() => go(admin ? "Authors" : "My books")}
            />
          )}
        </div>
      </main>
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#193e32] px-4 py-3 text-sm text-white shadow-xl">
          <Check size={16} className="text-[#a9d8b1]" />
          {toast}
        </div>
      )}
      {selected && (
        <NotificationModal row={selected} close={() => setSelected(null)} />
      )}
    </div>
  );
}
function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid h-8 w-8 place-items-center rounded-[10px] ${inverse ? "bg-[#eaf4ec] text-leaf" : "bg-leaf text-white"}`}
      >
        <Flower2 size={18} strokeWidth={1.8} />
      </div>
      <span
        className={`display text-[17px] font-extrabold tracking-[-.06em] ${inverse ? "text-white" : "text-ink"}`}
      >
        bookleaf
      </span>
    </div>
  );
}
function Login({
  onLogin,
}: {
  onLogin: (e: string, p: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("admin@bookleaf.local"),
    [password, setPassword] = useState("BookleafDemo2026!"),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    try {
      await onLogin(email, password);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Sign in failed");
    } finally {
      setWorking(false);
    }
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.04fr_.96fr]">
      <div className="relative hidden overflow-hidden bg-[#183d31] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand inverse />
        <div className="absolute -right-28 top-1/4 h-[520px] w-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-8 top-[32%] h-[360px] w-[360px] rounded-full border border-white/10" />
        <div className="relative max-w-[510px]">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#a9d2b1]">
            <span className="h-px w-7 bg-[#a9d2b1]" /> A calmer way to stay in
            the know
          </div>
          <h1 className="display text-[48px] font-semibold leading-[1.13] tracking-[-.05em]">
            Your words.
            <br />
            Your work.
            <br />
            <span className="text-[#a9d2b1]">Your royalties.</span>
          </h1>
          <p className="mt-6 max-w-[370px] text-[14px] leading-7 text-white/65">
            A clear, considered view of your publishing journey and the earnings
            behind every page.
          </p>
          <div className="mt-10 flex items-center gap-4 border-t border-white/15 pt-6">
            <div className="flex -space-x-2">
              {["#bfdbbf", "#e7cdbc", "#d7c8e5", "#f2dfad"].map((x, i) => (
                <div
                  key={i}
                  className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#183d31] text-[9px] font-bold text-[#183d31]"
                  style={{ background: x }}
                >
                  {["M", "A", "N", "K"][i]}
                </div>
              ))}
            </div>
            <div className="text-[11px] leading-5 text-white/55">
              <b className="text-white/85">
                Made for the people behind the pages.
              </b>
              <br />A little more clarity, every quarter.
            </div>
          </div>
        </div>
        <div className="relative flex justify-between text-[10px] text-white/45">
          <span>© 2026 BookLeaf Publishing</span>
          <span>Private author portal</span>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-[390px]">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[.17em] text-leaf">
            Welcome back
          </p>
          <h2 className="display mt-3 text-[32px] font-bold tracking-[-.045em]">
            Sign in to your desk
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your latest numbers and author updates are right where you left
            them.
          </p>
          <label className="mt-9 block text-xs font-semibold">
            Email address
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-[#adb5b0] focus:border-leaf focus:ring-2 focus:ring-leaf/10"
            />
          </label>
          <label className="mt-5 block text-xs font-semibold">
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="Enter your password"
              className="mt-2 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-[#adb5b0] focus:border-leaf focus:ring-2 focus:ring-leaf/10"
            />
          </label>
          {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
          <button
            disabled={working}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-leaf py-3 text-sm font-semibold text-white transition hover:bg-[#154a3a] disabled:opacity-60"
          >
            {working ? "Signing in…" : "Continue to your desk"}
            <ArrowRight size={16} />
          </button>
          <div className="mt-7 flex items-start gap-2 rounded-lg bg-[#edf3ee] p-3.5 text-[11px] leading-5 text-[#60716a]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-leaf" />
            Your account only shows information connected to your own author
            profile.
          </div>
          <p className="mt-8 text-center text-[10px] text-muted">
            Need a hand?{" "}
            <span className="font-semibold text-leaf">Contact Author Care</span>
          </p>
        </form>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  sub,
  icon: Icon,
  accent = "green",
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  accent?: string;
  trend?: string;
}) {
  return (
    <div className="card-shadow rounded-xl border border-line/80 bg-white p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium text-muted">{label}</div>
        <div
          className={`grid h-8 w-8 place-items-center rounded-lg ${accent === "amber" ? "bg-[#fff5e4] text-[#b77c24]" : accent === "blue" ? "bg-[#eaf1f7] text-[#5d7d9a]" : "bg-mint text-leaf"}`}
        >
          <Icon size={16} strokeWidth={1.8} />
        </div>
      </div>
      <div className="display mt-3 text-[25px] font-bold tracking-[-.04em] md:text-[28px]">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        {trend && (
          <span className="flex items-center text-[#438763]">
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}
function Dashboard({
  admin,
  user,
  snap,
  authors,
  selected,
  onSelect,
  onSend,
  busy,
  notifications,
  onNotification,
  onAuthors,
  onDetail,
}: {
  admin: boolean;
  user: User;
  snap: Snapshot | null;
  authors: any[];
  selected: string | null;
  onSelect: (s: string) => void;
  onSend: (id?: string) => void;
  busy: boolean;
  notifications: any[];
  onNotification: () => void;
  onAuthors: () => void;
  onDetail: (x: any) => void;
}) {
  const a = snap?.author,
    b = snap?.books || [],
    sum = snap?.summary;
  const [expanded, setExpanded] = useState<string | null>(null);
  const pendingCount = authors.filter((x) => x.pending > 0).length;
  const chartData = b
    .filter((book) => book.status === "PUBLISHED")
    .map((book) => ({
      title:
        book.title.length > 22 ? `${book.title.slice(0, 20)}…` : book.title,
      earned: book.earned,
      paid: book.paid,
    }));
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#e2eae3] bg-white px-5 py-5 card-shadow md:px-7 md:py-6">
        <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-[#eef5ef]" />
        <div className="pointer-events-none absolute right-16 top-8 h-36 w-36 rounded-full border border-[#dce9de]" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-leaf">
              <span className="h-1.5 w-1.5 rounded-full bg-[#52946b]" />
              {admin ? "Operations workspace" : "Your author workspace"}
              <span className="whitespace-nowrap font-normal normal-case tracking-normal text-muted">
                · {today}
              </span>
            </div>
            <h1 className="display text-[28px] font-bold tracking-[-.045em] md:text-[34px]">
              Welcome back,{" "}
              {admin
                ? user.name.split(" ")[0]
                : a?.name.split(" ")[0] || user.name.split(" ")[0]}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted">
              {admin
                ? "Your authors, royalties and recent activity — all in one place."
                : "Your books, royalties and latest updates — all in one place."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {admin && (
              <button
                onClick={onAuthors}
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-semibold hover:bg-[#fbfcfb]"
              >
                <Users size={15} />
                All authors
              </button>
            )}
            <button
              onClick={() => (admin ? onSend() : onNotification())}
              className="flex items-center gap-2 rounded-lg bg-leaf px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#154a3a]"
            >
              {admin ? (
                <>
                  <Sparkles size={15} />
                  {busy ? "Preparing…" : "Send royalty summaries"}
                </>
              ) : (
                <>
                  <Mail size={15} />
                  View updates
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {admin && authors.length > 0 && (
        <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          {authors.slice(0, 6).map((x) => (
            <button
              key={x.id}
              onClick={() => onSelect(x.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${selected === x.id ? "border-leaf bg-mint font-semibold text-leaf" : "border-line bg-white text-[#718078]"}`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e8eee9] text-[8px] font-bold text-leaf">
                {initials(x.name)}
              </span>
              {x.name}
            </button>
          ))}
          {authors.length > 6 && (
            <button
              onClick={onAuthors}
              className="px-2 text-[11px] font-semibold text-leaf"
            >
              +{authors.length - 6} more
            </button>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {admin ? (
          <>
            <Stat
              label="Authors"
              value={`${authors.length}`}
              sub="in your community"
              icon={Users}
            />
            <Stat
              label="Royalties earned"
              value={money(authors.reduce((s, x) => s + x.earned, 0))}
              sub="across all published titles"
              icon={ArrowUpRight}
              trend=""
            />
            <Stat
              label="Awaiting payout"
              value={money(authors.reduce((s, x) => s + x.pending, 0))}
              sub={`${pendingCount} authors with a balance`}
              icon={Clock3}
              accent="amber"
            />
            <Stat
              label="Books on record"
              value={`${authors.reduce((s, x) => s + x.books, 0)}`}
              sub="published and in production"
              icon={BookOpen}
              accent="blue"
            />
          </>
        ) : (
          <>
            <Stat
              label="Total royalties earned"
              value={money(sum?.earned || 0)}
              sub={`${sum?.books || 0} titles on your shelf`}
              icon={ArrowUpRight}
              trend=""
            />
            <Stat
              label="Already paid"
              value={money(sum?.paid || 0)}
              sub="settled to date"
              icon={CheckCheck}
            />
            <Stat
              label="Pending payout"
              value={money(sum?.pending || 0)}
              sub={
                sum?.pending ? "In the payout cycle" : "You’re all caught up"
              }
              icon={Clock3}
              accent={sum?.pending ? "amber" : "green"}
            />
            <Stat
              label="Copies sold"
              value={(sum?.copiesSold || 0).toLocaleString("en-IN")}
              sub="across all published books"
              icon={BookOpen}
              accent="blue"
            />
          </>
        )}
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="card-shadow rounded-xl border border-line/80 bg-white p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[14px] font-bold">Earnings by title</h2>
              <p className="mt-1 text-[11px] text-muted">
                Total earned compared with amount paid
              </p>
            </div>
            <span className="rounded-full bg-[#f1f5f1] px-2.5 py-1.5 text-[9px] font-medium text-[#65766b]">
              {chartData.length} published{" "}
              {chartData.length === 1 ? "title" : "titles"}
            </span>
          </div>
          {chartData.length ? (
            <div className="mt-5 h-[205px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 2, right: 12, top: 4, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid horizontal={false} stroke="#edf0ed" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#8b9690" }}
                    tickFormatter={(value) => `₹${value / 1000}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={128}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#65746c" }}
                  />
                  <Tooltip
                    formatter={(value: unknown) => money(Number(value))}
                    contentStyle={{
                      border: "1px solid #e6eae6",
                      borderRadius: 10,
                      fontSize: 11,
                      boxShadow: "0 8px 24px #17352a10",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 10, color: "#77847c" }}
                  />
                  <Bar
                    dataKey="earned"
                    name="Earned"
                    fill="#9ab99e"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={12}
                  />
                  <Bar
                    dataKey="paid"
                    name="Paid"
                    fill="#356b50"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5 grid h-[205px] place-items-center rounded-lg bg-[#fafbf9] text-center text-[11px] leading-5 text-muted">
              No published royalty records to chart yet.
            </div>
          )}
        </div>
        <div className="card-shadow flex flex-col rounded-xl border border-line/80 bg-white p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[14px] font-bold">Payout snapshot</h2>
              <p className="mt-1 text-[11px] text-muted">
                A quick look at your royalty balance
              </p>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#f2f5f1] text-leaf">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-muted">Total earned</div>
                <div className="display mt-1 text-[22px] font-bold tracking-[-.04em]">
                  {money(sum?.earned || 0)}
                </div>
              </div>
              <div className="pb-1 text-right">
                <div className="text-[10px] text-muted">Paid so far</div>
                <div className="mt-1 text-[13px] font-bold text-leaf">
                  {money(sum?.paid || 0)}
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0ed]">
              <div
                style={{
                  width: `${sum?.earned ? Math.min(100, (sum.paid / sum.earned) * 100) : 0}%`,
                }}
                className="h-full rounded-full bg-[#579274] transition-all"
              />
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-muted">
              <span>
                {sum?.earned ? Math.round((sum.paid / sum.earned) * 100) : 0}%
                paid
              </span>
              <span>{money(sum?.pending || 0)} pending</span>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <div className="rounded-lg bg-[#f6f8f5] p-3.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${sum?.pending ? "bg-[#d79a3b]" : "bg-[#54a070]"}`}
                />
                {sum?.pending ? "Next quarterly payout" : "All settled"}
              </div>
              <p className="mt-1.5 text-[10px] leading-5 text-muted">
                {sum?.pending
                  ? "Pending royalties are included in the next scheduled payout cycle. Allow up to 45 days from processing."
                  : "Every recorded royalty has been paid. Thank you for writing with us."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="card-shadow overflow-hidden rounded-xl border border-line/80 bg-white">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold">
                {admin ? "Author royalty detail" : "Your bookshelf"}
              </h2>
              <p className="mt-1 text-[11px] text-muted">
                {admin
                  ? a?.name + " · all book and payout records"
                  : "Every title, together in one place"}
              </p>
            </div>
            <button
              onClick={onAuthors}
              className="flex items-center gap-1 text-[10px] font-semibold text-leaf"
            >
              {admin ? "Browse authors" : "View all books"}
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left">
              <thead>
                <tr className="bg-[#fafbfa] text-[9px] uppercase tracking-[.1em] text-[#8b9690]">
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-3 py-3 font-semibold">Copies sold</th>
                  <th className="px-3 py-3 font-semibold">Earned</th>
                  <th className="px-3 py-3 font-semibold">Paid</th>
                  <th className="px-3 py-3 font-semibold">Pending</th>
                  <th className="px-3 py-3 font-semibold">Last payout</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {b.map((book) => (
                  <React.Fragment key={book.id}>
                    <tr
                      onClick={() =>
                        setExpanded(expanded === book.id ? null : book.id)
                      }
                      className="cursor-pointer border-t border-line/60 hover:bg-[#fbfcfb]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-8 shrink-0 place-items-center rounded bg-[#e7ede7] text-leaf">
                            <BookOpen size={14} />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold">
                              {book.title}
                            </div>
                            <div className="mt-0.5 text-[9px] text-muted">
                              {book.genre} · {book.sourceStatus}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 text-[11px]">
                        {book.copiesSold.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 text-[11px] font-semibold">
                        {money(book.earned)}
                      </td>
                      <td className="px-3 text-[11px]">{money(book.paid)}</td>
                      <td className="px-3 text-[11px]">
                        {money(book.pending)}
                      </td>
                      <td className="px-3 text-[10px] text-muted">
                        {book.lastPayout
                          ? new Date(book.lastPayout).toLocaleDateString(
                              "en-IN",
                            )
                          : "—"}
                      </td>
                      <td className="px-5 text-right">
                        <Status value={book.royaltyStatus} />
                      </td>
                    </tr>
                    {expanded === book.id && (
                      <tr className="bg-[#fafbf9]">
                        <td colSpan={7} className="px-5 pb-4 pt-1">
                          <div className="grid grid-cols-2 gap-3 text-[10px] sm:grid-cols-3 lg:grid-cols-4">
                            <div>
                              <span className="text-muted">ISBN</span>
                              <p className="mt-1 font-medium">{book.isbn}</p>
                            </div>
                            <div>
                              <span className="text-muted">
                                Publication date
                              </span>
                              <p className="mt-1 font-medium">
                                {book.publishedAt
                                  ? new Date(
                                      book.publishedAt,
                                    ).toLocaleDateString("en-IN")
                                  : "Not published yet"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted">List price</span>
                              <p className="mt-1 font-medium">
                                {money(book.mrp)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted">
                                Royalty per copy
                              </span>
                              <p className="mt-1 font-medium">
                                {book.royaltyPerCopy === null
                                  ? "—"
                                  : money(book.royaltyPerCopy)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted">Print partner</span>
                              <p className="mt-1 font-medium">
                                {book.platform}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted">Available on</span>
                              <p className="mt-1 font-medium leading-5">
                                {book.availableOn.length
                                  ? book.availableOn.join(" · ")
                                  : "No platform records"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted">Total paid</span>
                              <p className="mt-1 font-medium">
                                {money(book.paid)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted">Last payout</span>
                              <p className="mt-1 font-medium">
                                {book.lastPayout
                                  ? new Date(
                                      book.lastPayout,
                                    ).toLocaleDateString("en-IN")
                                  : "No payout recorded"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 border-t border-line/70 pt-3">
                            <div className="mb-2 text-[9px] font-bold uppercase tracking-[.1em] text-muted">
                              Payout summary
                            </div>
                            {book.payouts.length ? (
                              <div className="space-y-2">
                                {book.payouts.map((payout, index) => (
                                  <div
                                    key={`${book.id}-${payout.period}-${index}`}
                                    className="flex flex-wrap items-center justify-between gap-2 text-[10px]"
                                  >
                                    <span className="text-[#59675f]">
                                      {payoutLabel(payout.period)}
                                    </span>
                                    <span className="font-semibold">
                                      {money(payout.amount)}
                                    </span>
                                    <span className="text-muted">
                                      {payout.date
                                        ? new Date(
                                            payout.date,
                                          ).toLocaleDateString("en-IN")
                                        : "Date not supplied"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted">
                                No payout recorded for this title.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {!b.length && (
              <Empty
                title="No book records yet"
                text="Your book details will appear here once they are added."
              />
            )}
          </div>
        </div>
        <div className="card-shadow rounded-xl border border-line/80 bg-white">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold">Recent updates</h2>
              <p className="mt-1 text-[11px] text-muted">
                Royalty summaries & activity
              </p>
            </div>
            <button
              onClick={onNotification}
              className="text-[10px] font-semibold text-leaf"
            >
              View all
            </button>
          </div>
          <div className="p-2">
            {notifications.slice(0, 4).map((n) => (
              <button
                key={n.id}
                onClick={() => onDetail(n)}
                className="flex w-full gap-3 rounded-lg p-3 text-left hover:bg-[#f8faf8]"
              >
                <div
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${n.status === "FAILED" ? "bg-[#fbefed] text-[#bd6559]" : n.status === "SUCCESS" ? "bg-mint text-leaf" : "bg-[#fff5e4] text-[#b77c24]"}`}
                >
                  <Mail size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-semibold">
                    {n.author?.name || a?.name || "Author"} · royalty update
                  </div>
                  <div className="mt-1 text-[9px] text-muted">
                    {new Date(n.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    <span
                      className={
                        n.status === "FAILED"
                          ? "text-rose-600"
                          : n.status === "SUCCESS"
                            ? "text-leaf"
                            : "text-amber-700"
                      }
                    >
                      {n.status.toLowerCase()}
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="mt-1 text-[#aab3ad]" />
              </button>
            ))}
            {!notifications.length && (
              <Empty
                title="A quiet inbox"
                text="Sent royalty summaries will show up here."
              />
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-[#e4ebe5] bg-[#eff4ef] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-leaf">
            <Flower2 size={16} />
          </div>
          <div>
            <div className="text-[11px] font-bold">A note from BookLeaf</div>
            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[#66766d]">
              We’re here to make the business of your books feel a little
              simpler. Your figures reflect the records currently available to
              our team. For questions about a specific title or payout, Author
              Care is always happy to help.
            </p>
          </div>
          <button
            onClick={() =>
              (window.location.href = "mailto:care@bookleaf.local")
            }
            className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-lg border border-[#dce5dd] bg-white px-3 py-2 text-[10px] font-semibold sm:flex"
          >
            Contact us
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </>
  );
}
function Status({ value }: { value: string }) {
  const v =
    value === "paid" || value === "success"
      ? ["#e8f3eb", "#427d58", value === "success" ? "Success" : "Paid"]
      : value === "pending" || value === "queued"
        ? ["#fff4df", "#a77421", value === "queued" ? "Queued" : "Pending"]
        : value === "overdue" || value === "failed"
          ? ["#fbecea", "#b5534a", value === "failed" ? "Failed" : "Overdue"]
          : value === "processing"
            ? ["#eaf1f7", "#5d7d9a", "Processing"]
            : ["#eef1f0", "#7d8983", "In production"];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold"
      style={{ background: v[0], color: v[1] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: v[1] }} />
      {v[2]}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[#f0f4f0] text-[#668573]">
        <FileText size={16} />
      </div>
      <div className="mt-3 text-xs font-semibold">{title}</div>
      <div className="mt-1 text-[10px] text-muted">{text}</div>
    </div>
  );
}
function AdminAuthors({
  authors,
  query,
  setQuery,
  filter,
  setFilter,
  cityFilter,
  setCityFilter,
  selected,
  onSelect,
  onSend,
  busy,
  snapshot,
  onNotification,
}: {
  authors: any[];
  query: string;
  setQuery: (s: string) => void;
  filter: string;
  setFilter: (s: string) => void;
  cityFilter: string;
  setCityFilter: (s: string) => void;
  selected: string | null;
  onSelect: (s: string) => void;
  onSend: (id?: string) => void;
  busy: boolean;
  snapshot: Snapshot | null;
  onNotification: () => void;
}) {
  const rows = authors.filter(
    (a) =>
      (!query ||
        `${a.name} ${a.email}`.toLowerCase().includes(query.toLowerCase())) &&
      (filter === "all" || a.status === filter) &&
      (cityFilter === "all" || a.city === cityFilter),
  );
  const cities = [
    ...new Set(authors.map((a) => a.city).filter(Boolean)),
  ] as string[];
  const current = authors.find((a) => a.id === selected) || authors[0];
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-[11px] text-muted">
            Workspace <span className="mx-1">/</span> Directory
          </div>
          <h1 className="display text-[31px] font-bold tracking-[-.045em]">
            Author directory
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            The people behind the books, with every royalty in view.
          </p>
        </div>
        <button
          disabled={!current || busy}
          onClick={() => onSend(current?.id)}
          className="flex items-center justify-center gap-2 rounded-lg bg-leaf px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Sparkles size={15} />
          {busy ? "Preparing summary…" : "Generate & send summary"}
        </button>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Authors in directory"
          value={`${authors.length}`}
          sub="across your publishing list"
          icon={Users}
        />
        <Stat
          label="Pending royalties"
          value={money(authors.reduce((s, x) => s + x.pending, 0))}
          sub="to be included in a payout"
          icon={Clock3}
          accent="amber"
        />
        <Stat
          label="Overdue balances"
          value={`${authors.filter((a) => a.status === "overdue").length}`}
          sub="needs an operations review"
          icon={Activity}
          accent="blue"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card-shadow overflow-hidden rounded-xl border border-line/80 bg-white">
          <div className="border-b border-line/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49e]"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search author name or email"
                  className="w-full rounded-lg border border-line bg-[#fcfdfc] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-leaf"
                />
              </div>
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49e]"
                />
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-line bg-[#fcfdfc] py-2.5 pl-9 pr-8 text-xs outline-none"
                >
                  <option value="all">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49e]"
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-line bg-[#fcfdfc] py-2.5 pl-9 pr-8 text-xs outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="paid">Fully paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-muted">
              Showing <b className="text-ink">{rows.length}</b> of{" "}
              {authors.length} authors
            </div>
          </div>
          <div className="divide-y divide-line/70">
            {rows.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${current?.id === a.id ? "bg-[#f1f6f1]" : "hover:bg-[#fbfcfb]"}`}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e5eee7] text-[10px] font-bold text-leaf">
                  {initials(a.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold">
                    {a.name}
                  </div>
                  <div className="mt-1 truncate text-[9px] text-muted">
                    {a.city || "—"} · {a.books} books
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-[10px] font-semibold">
                    {money(a.pending)} pending
                  </div>
                  <div className="mt-1 text-[9px] text-muted">
                    {money(a.earned)} earned
                  </div>
                </div>
                <Status value={a.status} />
                <ChevronRight size={14} className="shrink-0 text-[#aab3ad]" />
              </button>
            ))}
            {!rows.length && (
              <Empty
                title="No authors found"
                text="Try another name or payout status."
              />
            )}
          </div>
        </div>
        <div className="card-shadow overflow-hidden rounded-xl border border-line/80 bg-white">
          <div className="flex items-center gap-3 border-b border-line/70 p-5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e5eee7] text-xs font-bold text-leaf">
              {initials(snapshot?.author.name || current?.name || "A")}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold">
                {snapshot?.author.name || current?.name || "Choose an author"}
              </h2>
              <p className="mt-1 truncate text-[10px] text-muted">
                {snapshot?.author.email || current?.email || ""} ·{" "}
                {snapshot?.author.city || current?.city || "—"}
              </p>
            </div>
            <button
              onClick={onNotification}
              title="Notification log"
              className="rounded-lg border border-line p-2 text-muted hover:text-leaf"
            >
              <Mail size={15} />
            </button>
            <button
              onClick={() => onSend(current?.id)}
              disabled={!current || busy}
              className="rounded-lg bg-[#eaf3ed] p-2 text-leaf hover:bg-[#dcece0] disabled:opacity-40"
              title="Send royalty summary"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line/70 border-b border-line/70">
            <div className="p-4">
              <div className="text-[9px] text-muted">Earned</div>
              <div className="mt-1 text-[12px] font-bold">
                {money(snapshot?.summary.earned || current?.earned || 0)}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[9px] text-muted">Paid</div>
              <div className="mt-1 text-[12px] font-bold text-leaf">
                {money(snapshot?.summary.paid || current?.paid || 0)}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[9px] text-muted">Pending</div>
              <div className="mt-1 text-[12px] font-bold text-[#ad7829]">
                {money(snapshot?.summary.pending || current?.pending || 0)}
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold">Book & royalty detail</h3>
              <span className="text-[9px] text-muted">
                {snapshot?.books.length || 0} titles
              </span>
            </div>
            {snapshot?.books.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 border-t border-line/60 py-3"
              >
                <div className="grid h-8 w-7 place-items-center rounded bg-[#edf2ed] text-leaf">
                  <BookOpen size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-semibold">
                    {b.title}
                  </div>
                  <div className="mt-1 text-[9px] text-muted">
                    {b.sourceStatus} · {b.copiesSold.toLocaleString("en-IN")}{" "}
                    copies
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[9px]">
                    <span className="text-muted">
                      Earned <b className="ml-1 text-ink">{money(b.earned)}</b>
                    </span>
                    <span className="text-muted">
                      Paid <b className="ml-1 text-leaf">{money(b.paid)}</b>
                    </span>
                    <span className="text-muted">
                      Pending{" "}
                      <b className="ml-1 text-[#ad7829]">{money(b.pending)}</b>
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] leading-4 text-muted">
                    ISBN {b.isbn} · MRP {money(b.mrp)} · {b.platform} · Last
                    payout{" "}
                    {b.lastPayout
                      ? new Date(b.lastPayout).toLocaleDateString("en-IN")
                      : "none recorded"}
                  </div>
                  <div className="mt-1 text-[9px] leading-4 text-muted">
                    Available on:{" "}
                    {b.availableOn.length
                      ? b.availableOn.join(" · ")
                      : "No platform records"}
                  </div>
                </div>
                <div className="text-right">
                  <Status value={b.royaltyStatus} />
                </div>
              </div>
            ))}
            {!snapshot?.books.length && (
              <Empty
                title="Select an author"
                text="Their titles and payout history will appear here."
              />
            )}
            {!!snapshot?.books.length && (
              <div className="mt-4 border-t border-line/70 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold">Payout summary</h3>
                  <span className="text-[9px] text-muted">
                    Source aggregate
                  </span>
                </div>
                {snapshot.books.flatMap((book) =>
                  book.payouts.map((payout, index) => ({
                    book,
                    payout,
                    index,
                  })),
                ).length ? (
                  snapshot.books
                    .flatMap((book) =>
                      book.payouts.map((payout, index) => ({
                        book,
                        payout,
                        index,
                      })),
                    )
                    .map(({ book, payout, index }) => (
                      <div
                        key={`${book.id}-${payout.period}-${index}`}
                        className="flex items-center justify-between gap-3 border-t border-line/50 py-2.5 text-[10px]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {book.title}
                          </div>
                          <div className="mt-0.5 text-[9px] text-muted">
                            {payoutLabel(payout.period)} ·{" "}
                            {payout.date
                              ? new Date(payout.date).toLocaleDateString(
                                  "en-IN",
                                )
                              : "Date not supplied"}
                          </div>
                        </div>
                        <div className="shrink-0 font-semibold text-leaf">
                          {money(payout.amount)}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="rounded-lg bg-[#fafbf9] p-3 text-[10px] leading-5 text-muted">
                    The source records provide total paid and the last payout
                    date only; individual payment transactions were not
                    included.
                  </p>
                )}
                <p className="mt-2 text-[9px] leading-4 text-muted">
                  The source file includes total paid and the last payout date,
                  not individual transaction records.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
function Notifications({
  rows,
  admin,
  onSelect,
}: {
  rows: any[];
  admin: boolean;
  onSelect: (r: any) => void;
}) {
  const [tab, setTab] = useState("all");
  const filtered = rows.filter(
    (n) =>
      tab === "all" ||
      (tab === "failed" ? n.status === "FAILED" : n.status === "SUCCESS"),
  );
  return (
    <>
      <div className="mb-7 flex items-end justify-between">
        <div>
          <div className="mb-2 text-[11px] text-muted">
            Workspace <span className="mx-1">/</span> Activity
          </div>
          <h1 className="display text-[31px] font-bold tracking-[-.045em]">
            Notification log
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            A clear record of royalty summaries and delivery status.
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-[10px] text-muted sm:flex">
          <ShieldCheck size={13} className="text-leaf" />
          Private & auditable
        </div>
      </div>
      <div className="card-shadow overflow-hidden rounded-xl border border-line/80 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-line/70 p-4 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-lg bg-[#f4f6f4] p-1">
            {[
              ["all", "All activity"],
              ["success", "Delivered"],
              ["failed", "Failed"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${tab === k ? "bg-white text-ink shadow-sm" : "text-muted"}`}
              >
                {label}{" "}
                <span className="ml-1 text-[#9aa49e]">
                  {k === "all"
                    ? rows.length
                    : rows.filter((n) =>
                        k === "failed"
                          ? n.status === "FAILED"
                          : n.status === "SUCCESS",
                      ).length}
                </span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted">
            Most recent first · last 100 events
          </div>
        </div>
        {filtered.map((n) => (
          <button
            onClick={() => onSelect(n)}
            key={n.id}
            className="flex w-full items-center gap-4 border-b border-line/60 px-5 py-4 text-left hover:bg-[#fbfcfb]"
          >
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${n.status === "FAILED" ? "bg-[#fbefed] text-[#bd6559]" : n.status === "SUCCESS" ? "bg-mint text-leaf" : "bg-[#fff5e4] text-[#b77c24]"}`}
            >
              {n.status === "SUCCESS" ? (
                <CheckCheck size={16} />
              ) : n.status === "FAILED" ? (
                <X size={16} />
              ) : (
                <Clock3 size={16} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold">
                {n.subject || "Royalty summary"}{" "}
                <span className="font-normal text-muted">
                  {admin && n.author ? `· ${n.author.name}` : ""}
                </span>
              </div>
              <div className="mt-1 truncate text-[10px] text-muted">
                {n.error ||
                  `Triggered ${new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div
                className={`text-[10px] font-semibold ${n.status === "SUCCESS" ? "text-leaf" : n.status === "FAILED" ? "text-rose-600" : "text-amber-700"}`}
              >
                {n.status === "SUCCESS"
                  ? "Delivered"
                  : n.status === "FAILED"
                    ? "Failed"
                    : n.status === "PROCESSING"
                      ? "Processing"
                      : "Queued"}
              </div>
              <div className="mt-1 text-[9px] text-muted">
                {n.completedAt
                  ? new Date(n.completedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "In progress"}
              </div>
            </div>
            <ChevronRight size={15} className="shrink-0 text-[#aab3ad]" />
          </button>
        ))}
        {!filtered.length && (
          <Empty
            title="No updates in this view"
            text="Summary delivery events will appear here when available."
          />
        )}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[10px] text-muted">
        <CircleHelp size={13} /> Each event records when the request was made
        and how the automation completed.
      </p>
    </>
  );
}
function NotificationModal({ row, close }: { row: any; close: () => void }) {
  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      className="fixed inset-0 z-50 grid place-items-center bg-[#14231c]/40 p-4 backdrop-blur-[2px]"
    >
      <div className="max-h-[85vh] w-full max-w-[590px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-line p-5">
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg ${row.status === "SUCCESS" ? "bg-mint text-leaf" : row.status === "FAILED" ? "bg-[#fbefed] text-[#bd6559]" : "bg-[#fff5e4] text-[#b77c24]"}`}
              >
                <Mail size={15} />
              </div>
              <Status value={row.status.toLowerCase()} />
            </div>
            <h2 className="mt-3 text-[15px] font-bold">
              {row.subject || "Royalty summary"}
            </h2>
            <p className="mt-1 text-[10px] text-muted">
              {row.author?.name ? `To ${row.author.name} · ` : ""}
              {new Date(row.createdAt).toLocaleString("en-IN", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-2 text-muted hover:bg-[#f4f6f4]"
          >
            <X size={17} />
          </button>
        </div>
        {row.error && (
          <div className="mx-5 mt-4 rounded-lg bg-[#fbefed] p-3 text-xs text-[#a94b42]">
            {row.error}
          </div>
        )}
        <div className="whitespace-pre-wrap px-6 py-5 text-[12px] leading-7 text-[#45544c]">
          {row.body ||
            "The summary is being prepared. Refresh the log shortly to see the final message."}
        </div>
        <div className="flex justify-end border-t border-line p-4">
          <button
            onClick={close}
            className="rounded-lg border border-line px-4 py-2 text-xs font-semibold hover:bg-[#f7f8f6]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
