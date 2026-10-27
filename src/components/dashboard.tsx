"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Activity, AlertCircle, ArrowDownUp, ArrowLeftRight, ArrowRight, ArrowUpRight,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, ExternalLink, FolderGit2,
  GitBranch, Github, Globe2, LayoutDashboard, Loader2, LockKeyhole, LogOut,
  Menu, MoreHorizontal, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Star, X, XCircle
} from "lucide-react";

type Visibility = "public" | "private";
type Filter = "all" | Visibility;
type Sort = "recent" | "name" | "stars";
type Repository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  archived: boolean;
  fork: boolean;
  stargazers_count: number;
  updated_at: string;
};
type Pending = { names: string[]; visibility: Visibility };
type Outcome = { name: string; success: boolean; message: string };

function formatDate(date: string) {
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return "Unknown";
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

async function errorFromResponse(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string };
  return data.error || `Request failed (${response.status})`;
}

function Logo({ size = 40 }: { size?: number }) {
  return <span className="logo-mark" style={{ width: size, height: size }}><GitBranch size={size * .52} strokeWidth={2.3} /></span>;
}

function Brand() {
  return <div className="brand"><Logo /><span className="brand-name">repo<span>pilot</span><small>GITHUB REPOSITORY MANAGER</small></span></div>;
}

function VisibilityTag({ isPrivate }: { isPrivate: boolean }) {
  return <span className={`visibility-tag ${isPrivate ? "tag-private" : "tag-public"}`}>
    {isPrivate ? <LockKeyhole size={12} /> : <Globe2 size={12} />}
    {isPrivate ? "Private" : "Public"}
  </span>;
}

function LoadingDashboard() {
  return <div className="loading-page"><Logo size={52} /><Loader2 className="spin" size={22} /><span>Connecting your workspace...</span></div>;
}

function Landing() {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  useEffect(() => { setAuthError(new URLSearchParams(window.location.search).has("authError")); }, []);
  return <div className="landing">
    <div className="landing-noise" />
    <header className="landing-nav"><Brand /><div className="landing-top-right"><span className="secure-pill"><span className="live-dot" /> Private workspace</span></div></header>
    <main className="landing-content">
      <div className="hero-eyebrow"><Sparkles size={15} /> YOUR GITHUB COMMAND CENTER</div>
      <h1>Every repository.<br/><em>One beautiful</em> workspace.</h1>
      <p>Finally, an easier way to organize your GitHub repositories. View everything in one place, search in seconds, and switch visibility with confidence.</p>
      {authError && <div className="landing-auth-error"><AlertCircle size={17} /> Sign-in was denied. Make sure your GitHub username matches ALLOWED_GITHUB_USERNAME in your app settings.</div>}
      <button className="github-login" disabled={loading} onClick={() => { setLoading(true); void signIn("github"); }}>
        {loading ? <Loader2 size={20} className="spin" /> : <Github size={22} />}
        Continue with GitHub <ArrowRight size={18} />
      </button>
      <div className="hero-trust"><ShieldCheck size={16} /> Secure OAuth login <span /> No passwords stored <span /> Personal dashboard</div>
      <div className="landing-features">
        <div><span className="feature-icon icon-violet"><FolderGit2 size={21}/></span><strong>All repos, one place</strong><small>Browse, search, and filter instantly.</small></div>
        <div><span className="feature-icon icon-blue"><ArrowLeftRight size={21}/></span><strong>Bulk visibility changes</strong><small>Make multiple repos public or private.</small></div>
        <div><span className="feature-icon icon-green"><ShieldCheck size={21}/></span><strong>Built for peace of mind</strong><small>Preview and confirm before making changes.</small></div>
      </div>
    </main>
    <footer className="landing-footer">Built for developers, powered by the GitHub API <span>•</span> RepoPilot</footer>
  </div>;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [publicAcknowledged, setPublicAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const stopRef = useRef(false);

  const refresh = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/repositories", { cache: "no-store" });
      if (!response.ok) throw new Error(await errorFromResponse(response));
      const data = await response.json() as { repositories: Repository[]; truncated: boolean };
      if (!Array.isArray(data.repositories)) throw new Error("Unexpected repository response.");
      setRepos(data.repositories);
      setTruncated(Boolean(data.truncated));
      setSelected((previous) => new Set([...previous].filter((name) => data.repositories.some((r) => r.full_name === name))));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load your GitHub repositories.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (status === "authenticated") void refresh(true); }, [status, refresh]);

  const stats = useMemo(() => ({
    all: repos.length,
    public: repos.filter((repo) => !repo.private).length,
    private: repos.filter((repo) => repo.private).length,
    archived: repos.filter((repo) => repo.archived).length,
  }), [repos]);

  const visibleRepos = useMemo(() => {
    const text = search.trim().toLowerCase();
    const result = repos.filter((repo) =>
      (filter === "all" || (filter === "private") === repo.private) &&
      (!text || `${repo.name} ${repo.description || ""}`.toLowerCase().includes(text))
    );
    result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stars") return b.stargazers_count - a.stargazers_count;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return result;
  }, [repos, filter, search, sort]);

  const selectedRepos = repos.filter((r) => selected.has(r.full_name));
  const allVisibleSelected = visibleRepos.length > 0 && visibleRepos.every((r) => selected.has(r.full_name));

  function toggleOne(name: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }
  function toggleAllVisible() {
    setSelected((old) => {
      const next = new Set(old);
      if (allVisibleSelected) visibleRepos.forEach((r) => next.delete(r.full_name));
      else visibleRepos.forEach((r) => next.add(r.full_name));
      return next;
    });
  }
  function prepare(names: string[], visibility: Visibility) {
    if (busy) return;
    const applicable = repos.filter((r) => names.includes(r.full_name) && (r.private ? "private" : "public") !== visibility);
    if (!applicable.length) return;
    setPending({ names: applicable.map((r) => r.full_name), visibility });
    setPublicAcknowledged(false);
    setShowResults(false);
  }

  async function applyChanges() {
    if (!pending || busy) return;
    const { names, visibility } = pending;
    setPending(null);
    setBusy(true);
    setDone(0);
    setTotal(names.length);
    setOutcomes([]);
    setShowResults(true);
    stopRef.current = false;
    const results: Outcome[] = [];
    for (const [index, fullName] of names.entries()) {
      if (stopRef.current) break;
      const name = fullName.split("/").slice(1).join("/");
      try {
        const response = await fetch("/api/repositories/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, visibility }),
        });
        if (!response.ok) throw new Error(await errorFromResponse(response));
        const result = await response.json() as { visibility: Visibility };
        setRepos((current) => current.map((r) => r.full_name === fullName ? { ...r, private: result.visibility === "private" } : r));
        setSelected((current) => { const next = new Set(current); next.delete(fullName); return next; });
        results.push({ name: fullName, success: true, message: `Changed to ${result.visibility}` });
      } catch (err) {
        results.push({ name: fullName, success: false, message: err instanceof Error ? err.message : "Unknown error" });
      }
      setOutcomes([...results]);
      setDone(index + 1);
    }
    setBusy(false);
  }

  if (status === "loading") return <LoadingDashboard />;
  if (status === "unauthenticated") return <Landing />;

  return <div className="app-shell">
    {mobileNavOpen && <button aria-label="Close navigation" className="mobile-overlay" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-head"><Brand /><button className="mobile-close icon-button" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X size={19}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="sidebar-nav">
        <button className="nav-item active" onClick={() => setMobileNavOpen(false)}><LayoutDashboard size={18} /> Overview <span className="nav-active-dot" /></button>
        <button className="nav-item" onClick={() => { setFilter("all"); setMobileNavOpen(false); }}><FolderGit2 size={18} /> Repositories <span className="nav-count">{stats.all}</span></button>
      </nav>
      <div className="nav-label second-nav">QUICK FILTERS</div>
      <nav className="sidebar-nav">
        <button className={`nav-item ${filter === "public" ? "soft-active" : ""}`} onClick={() => { setFilter("public"); setMobileNavOpen(false); }}><Globe2 size={17} /> Public repositories <span className="nav-count">{stats.public}</span></button>
        <button className={`nav-item ${filter === "private" ? "soft-active" : ""}`} onClick={() => { setFilter("private"); setMobileNavOpen(false); }}><LockKeyhole size={17} /> Private repositories <span className="nav-count">{stats.private}</span></button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="tip-card"><span className="tip-icon"><Sparkles size={18}/></span><strong>Work smarter, not harder.</strong><p>Change multiple repositories at once using bulk actions.</p></div>
      <div className="sidebar-bottom">
        <div className="account-avatar">{(session.user?.name || "G").slice(0, 1).toUpperCase()}</div>
        <div className="account-text"><strong>{session.user?.name || "GitHub user"}</strong><small><span className="connected-dot" /> GitHub connected</small></div>
        <button className="icon-button signout" title="Sign out" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={17}/></button>
      </div>
    </aside>

    <div className="main-panel">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={22}/></button><span className="breadcrumb">Workspace</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div><div className="topbar-right"><span className="server-pill"><span className="connected-dot" /> GitHub API connected</span><div className="header-avatar">{(session.user?.name || "G").slice(0, 1).toUpperCase()}</div></div></header>

      <main className="content">
        <div className="page-intro"><div><div className="page-eyebrow"><span className="eyebrow-dot" /> YOUR REPOSITORY WORKSPACE</div><h1>Repository Overview <span className="wave">✦</span></h1><p>A bird&apos;s-eye view of your projects. Everything you need, all in one place.</p></div><button className="refresh-button" onClick={() => void refresh(false)} disabled={loading || refreshing || busy}>{refreshing ? <Loader2 className="spin" size={16}/> : <RefreshCw size={16}/>} Refresh data</button></div>

        {loadError && <div className="alert error-alert"><AlertCircle size={20}/><div><strong>Could not load repositories</strong><p>{loadError}</p></div><button onClick={() => void refresh(false)}>Retry</button></div>}
        {truncated && <div className="alert note-alert"><AlertCircle size={17}/><span>Only the first 1,000 repositories are loaded. Refine on GitHub if your account owns more.</span></div>}

        <div className="stats-grid">
          <div className="stat-card stat-all"><div className="stat-head"><span>Total repositories</span><span className="stat-icon stat-icon-purple"><FolderGit2 size={19}/></span></div><div className="stat-number">{loading ? "—" : stats.all}<span className="stat-trail">repos</span></div><div className="stat-foot"><Activity size={14}/> Across your GitHub account</div></div>
          <div className="stat-card"><div className="stat-head"><span>Public repositories</span><span className="stat-icon stat-icon-green"><Globe2 size={19}/></span></div><div className="stat-number">{loading ? "—" : stats.public}<span className="stat-trail">public</span></div><div className="stat-foot"><span className="metric-dot green"/> Visible to everyone</div></div>
          <div className="stat-card"><div className="stat-head"><span>Private repositories</span><span className="stat-icon stat-icon-blue"><LockKeyhole size={19}/></span></div><div className="stat-number">{loading ? "—" : stats.private}<span className="stat-trail">private</span></div><div className="stat-foot"><span className="metric-dot blue"/> Access restricted</div></div>
          <div className="stat-card"><div className="stat-head"><span>Archived repositories</span><span className="stat-icon stat-icon-orange"><Clock3 size={19}/></span></div><div className="stat-number">{loading ? "—" : stats.archived}<span className="stat-trail">archived</span></div><div className="stat-foot"><span className="metric-dot orange"/> Read-only projects</div></div>
        </div>

        <section className="repo-panel">
          <div className="panel-header"><div><h2>Your Repositories <span>{stats.all}</span></h2><p>Manage, organize, and update your GitHub projects.</p></div><span className="panel-kicker"><ShieldCheck size={14}/> Owner access only</span></div>
          <div className="toolbar"><div className="search-box"><Search size={18}/><input aria-label="Search repositories" placeholder="Search repositories..." value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={15}/></button>}</div><div className="filter-tabs" aria-label="Repository visibility filter">{(["all", "public", "private"] as Filter[]).map((item) => <button key={item} className={filter === item ? "filter-active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "public" ? "Public" : "Private"}</button>)}</div><div className="sort-wrap"><ArrowDownUp size={15}/><select aria-label="Sort repositories" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="recent">Recently updated</option><option value="name">Name A–Z</option><option value="stars">Most stars</option></select><ChevronDown className="select-chevron" size={15}/></div></div>

          <div className="selection-bar"><label className="select-all"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={!visibleRepos.length || busy}/><span>{selected.size ? `${selected.size} selected` : "Select all shown"}</span></label><span className="showing-label">Showing {visibleRepos.length} of {stats.all} repositories</span>{selected.size > 0 && <div className="bulk-actions"><button className="bulk-clear" onClick={() => setSelected(new Set())} disabled={busy}>Clear</button><button className="bulk-public" onClick={() => prepare(selectedRepos.map((r) => r.full_name), "public")} disabled={busy || !selectedRepos.some((r) => r.private)}><Globe2 size={14}/> Make public</button><button className="bulk-private" onClick={() => prepare(selectedRepos.map((r) => r.full_name), "private")} disabled={busy || !selectedRepos.some((r) => !r.private)}><LockKeyhole size={14}/> Make private</button></div>}</div>
          <div className="table-scroll"><table className="repo-table"><thead><tr><th className="check-col"></th><th>REPOSITORY</th><th>VISIBILITY</th><th>STARS</th><th>LAST UPDATED</th><th className="action-col">ACTIONS</th></tr></thead><tbody>
            {loading ? Array.from({length: 5}, (_,i) => <tr key={i} className="skeleton-row"><td><span className="skeleton square"/></td><td><div className="skeleton-cell"><span className="skeleton square large"/><div><span className="skeleton line"/><span className="skeleton line short"/></div></div></td><td><span className="skeleton line short"/></td><td><span className="skeleton line tiny"/></td><td><span className="skeleton line short"/></td><td><span className="skeleton line short"/></td></tr>) :
            visibleRepos.map((repo) => <tr key={repo.id} className={selected.has(repo.full_name) ? "row-selected" : ""}>
              <td><input aria-label={`Select ${repo.name}`} type="checkbox" checked={selected.has(repo.full_name)} onChange={() => toggleOne(repo.full_name)} disabled={busy}/></td>
              <td><div className="repo-name-cell"><div className={`repo-icon ${repo.private ? "repo-icon-private" : "repo-icon-public"}`}>{repo.private ? <LockKeyhole size={18}/> : <FolderGit2 size={19}/>}</div><div className="repo-meta"><div className="name-line"><a target="_blank" rel="noopener noreferrer" href={repo.html_url}>{repo.name}<ArrowUpRight size={14}/></a>{repo.fork && <span className="mini-label">Fork</span>}{repo.archived && <span className="mini-label archived-label">Archived</span>}</div><div className="description">{repo.description || "No description provided"}</div></div></div></td>
              <td><VisibilityTag isPrivate={repo.private}/></td>
              <td><span className="stars"><Star size={14}/>{repo.stargazers_count}</span></td>
              <td><span className="updated-date">{formatDate(repo.updated_at)}</span></td>
              <td><div className="row-actions"><button title={`Make ${repo.name} ${repo.private ? "public" : "private"}`} className="action-swap" onClick={() => prepare([repo.full_name], repo.private ? "public" : "private")} disabled={busy}>{repo.private ? <Globe2 size={15}/> : <LockKeyhole size={15}/>}<span>{repo.private ? "Public" : "Private"}</span></button><a title="View on GitHub" className="action-external" href={repo.html_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/></a></div></td>
            </tr>)}
          </tbody></table></div>
          {!loading && visibleRepos.length === 0 && <div className="empty-state"><div><Search size={25}/></div><h3>{repos.length ? "No matching repositories" : "No repositories yet"}</h3><p>{repos.length ? "Try another keyword or visibility filter." : "Repositories you own on GitHub will appear here."}</p>{repos.length > 0 && <button onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button>}</div>}
          <div className="table-footer"><span>{selected.size ? `${selected.size} repositories selected` : "Select repositories to change visibility in bulk"}</span><span><ShieldCheck size={14}/> Changes are confirmed before applying</span></div>
        </section>
        <footer className="app-footer"><span><Logo size={25}/> RepoPilot <span className="footer-copyright">© {new Date().getFullYear()}</span></span><span>Made for a simpler developer workflow <span className="footer-heart">♥</span></span></footer>
      </main>
    </div>

    {pending && <div className="modal-shade" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setPending(null); }}><div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="modal">
      <div className="modal-top"><div className={`modal-symbol ${pending.visibility === "public" ? "modal-public" : "modal-private"}`}>{pending.visibility === "public" ? <Globe2 size={24}/> : <LockKeyhole size={24}/>}</div><button aria-label="Close confirmation" className="icon-button" onClick={() => setPending(null)}><X size={20}/></button></div>
      <h2 id="modal-title">Make {pending.names.length} {pending.names.length === 1 ? "repository" : "repositories"} {pending.visibility}?</h2><p className="modal-description">{pending.visibility === "public" ? "Anyone on the internet will be able to view the code and full Git history of these repositories." : "These repositories will no longer be publicly accessible. GitHub Pages sites and other public integrations may stop working."}</p>
      <div className="modal-list"><div className="modal-list-label">REPOSITORIES TO UPDATE</div>{pending.names.slice(0, 5).map((name) => <div key={name}><FolderGit2 size={15}/><span>{name}</span><VisibilityTag isPrivate={pending.visibility === "private"}/></div>)}{pending.names.length > 5 && <p>+ {pending.names.length - 5} more repositories</p>}</div>
      {pending.visibility === "public" ? <label className="risk-confirm"><input type="checkbox" checked={publicAcknowledged} onChange={(e) => setPublicAcknowledged(e.target.checked)}/><span>I understand that code, commit history, and any committed secrets could become publicly accessible.</span></label> : <div className="private-note"><AlertCircle size={17}/><span>Public forks may remain public and Pages sites may be unpublished.</span></div>}
      <div className="modal-buttons"><button className="cancel-button" onClick={() => setPending(null)}>Cancel</button><button className={`confirm-button ${pending.visibility === "public" ? "confirm-public" : "confirm-private"}`} disabled={pending.visibility === "public" && !publicAcknowledged} onClick={() => void applyChanges()}>{pending.visibility === "public" ? <Globe2 size={17}/> : <LockKeyhole size={17}/>} Confirm & make {pending.visibility}</button></div>
    </div></div>}

    {showResults && <div className="progress-pane" role="status" aria-live="polite"><div className="progress-head"><div className="progress-title">{busy ? <Loader2 size={17} className="spin"/> : outcomes.some((o) => !o.success) ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}<strong>{busy ? "Applying repository changes" : "Repository changes complete"}</strong></div><button className="icon-button" title={busy ? "Stop after current request" : "Close"} onClick={() => { if (busy) stopRef.current = true; else setShowResults(false); }}>{busy ? <span className="stop-text">Stop</span> : <X size={18}/>}</button></div><div className="progress-count">{done} of {total} processed • {outcomes.filter((o) => o.success).length} successful{outcomes.some((o) => !o.success) ? ` • ${outcomes.filter((o) => !o.success).length} failed` : ""}</div><div className="progress-track"><div style={{width: `${total ? (done / total) * 100 : 0}%`}}/></div>{!busy && outcomes.some((o) => !o.success) && <div className="failed-list">{outcomes.filter((o) => !o.success).map((o) => <div key={o.name}><XCircle size={14}/><span><strong>{o.name}</strong> — {o.message}</span></div>)}</div>}{!busy && <button className="progress-dismiss" onClick={() => setShowResults(false)}>Dismiss <Check size={14}/></button>}</div>}
  </div>;
}
