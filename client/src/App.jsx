import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Library, Plus, Search, Star, Clock3, Folder, Archive,
  Trash2, Settings, Moon, Sun, Link2, FileText, FileUp, MoreHorizontal,
  Pin, ExternalLink, Download, Pencil, RotateCcw, X, Menu, Tag, Layers,
  LogOut, Sparkles, Filter, Check, ChevronDown, HardDrive, BookOpen, WifiOff, CloudDownload, Trash
} from "lucide-react";

const api = async (path, options = {}) => {
  const token = localStorage.getItem("mindvault_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
};
const formatBytes = (n = 0) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
const initials = name => (name || "U").split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase();

// Offline copies are stored in this browser only (IndexedDB), not in MongoDB.
const OFFLINE_DB = "mindvault-offline-v1";
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("resources", { keyPath: "offlineKey" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function offlinePut(item) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => { const tx = db.transaction("resources", "readwrite"); tx.objectStore("resources").put(item); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
async function offlineAll(userKey) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => { const req = db.transaction("resources").objectStore("resources").getAll(); req.onsuccess = () => resolve(req.result.filter(x => x.userKey === userKey)); req.onerror = () => reject(req.error); });
}
async function offlineDelete(offlineKey) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => { const tx = db.transaction("resources", "readwrite"); tx.objectStore("resources").delete(offlineKey); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
const offlineKeyFor = (user, item) => `${user.email}:${item._id}`;

const passwordChecks = password => [
  { label: "At least 9 characters", valid: password.length >= 9 },
  { label: "One uppercase letter (A–Z)", valid: /[A-Z]/.test(password) },
  { label: "One lowercase letter (a–z)", valid: /[a-z]/.test(password) },
  { label: "One number (0–9)", valid: /\d/.test(password) },
  { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) }
];

function PasswordFeedback({ password }) {
  if (!password) return null;
  const checks = passwordChecks(password);
  const score = checks.filter(item => item.valid).length;
  const strength = score <= 2 ? "Weak" : score <= 4 ? "Medium" : "Strong";
  return <div className="password-feedback">
    <div className="password-strength-head"><span>Password strength</span><strong className={`strength-${strength.toLowerCase()}`}>{strength}</strong></div>
    <div className="strength-meter">{checks.map((item, i) => <span key={i} className={item.valid ? `filled ${strength.toLowerCase()}` : ""}/>)}</div>
    <div className="password-rules">{checks.map(item => <div key={item.label} className={item.valid ? "rule-valid" : "rule-invalid"}><Check size={13}/>{item.label}</div>)}</div>
  </div>;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name:"", email:"", password:"", confirmPassword:"" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError("");
    if (mode === "register") {
      if (!passwordChecks(form.password).every(item => item.valid)) { setError("Please satisfy all password requirements."); return; }
      if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    }
    setBusy(true);
    try {
      const { confirmPassword, ...payload } = form;
      const result = await api(`/auth/${mode}`, { method:"POST", body:JSON.stringify(payload) });
      localStorage.setItem("mindvault_token", result.token); localStorage.setItem("mindvault_user",JSON.stringify(result.user)); onAuth(result.user);
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="auth-wrap">
    <div className="auth-art"><div className="brand"><span className="brand-mark"><Layers size={22}/></span> MindVault</div>
      <div className="art-copy"><span className="eyebrow">YOUR PERSONAL KNOWLEDGE SPACE</span><h1>Everything you save.<br/><em>Never lost again.</em></h1><p>Bring your links, notes and files together in one calm, searchable space.</p>
        <div className="art-pills"><span><Link2 size={14}/> Links</span><span><FileText size={14}/> Notes</span><span><FileUp size={14}/> Files</span></div>
      </div><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
      <div className="art-footer">A little more organized, every day.</div>
    </div>
    <div className="auth-panel"><form className="auth-form" onSubmit={submit}>
      <div className="mobile-brand"><span className="brand-mark"><Layers size={20}/></span> MindVault</div>
      <span className="eyebrow">WELCOME {mode === "login" ? "BACK" : "ABOARD"}</span>
      <h2>{mode === "login" ? "Sign in to MindVault" : "Create your account"}</h2>
      <p className="muted">{mode === "login" ? "Pick up right where you left off." : "Start building your personal knowledge library."}</p>
      {mode === "register" && <label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}
      <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
      <label>Password<input required type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={mode === "register" ? "Create a strong password" : "Your password"}/></label>
      {mode === "register" && <><PasswordFeedback password={form.password}/><label>Confirm password<input required type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} placeholder="Re-enter your password"/></label></>}
      {error && <div className="error-box">{error}</div>}
      <button className="primary-btn full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      <p className="auth-switch">{mode === "login" ? "New to MindVault?" : "Already have an account?"} <button type="button" className="text-btn" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setForm({...form,password:"",confirmPassword:""});}}>{mode==="login"?"Create an account":"Sign in"}</button></p>
    </form></div>
  </div>;
}

function ResourceModal({ initial, onClose, onSave }) {
  const [type,setType] = useState(initial?.type || "link");
  const [form,setForm] = useState({ title:initial?.title||"", description:initial?.description||"", url:initial?.url||"", content:initial?.content||"", category:initial?.category||"Study", tags:(initial?.tags||[]).join(", ") });
  const [file,setFile] = useState(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const change = e => setForm({...form,[e.target.name]:e.target.value});
  const submit = async e => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const body = new FormData();
      Object.entries({...form,type}).forEach(([k,v])=>body.append(k,v));
      if(file) body.append("file",file);
      await onSave(body, initial?._id); onClose();
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <form className="modal" onSubmit={submit}>
      <div className="modal-head"><div><span className="eyebrow">{initial?._id?"UPDATE RESOURCE":"ADD TO YOUR VAULT"}</span><h2>{initial?._id?"Edit resource":"Save something useful"}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X/></button></div>
      {!initial?._id && <div className="type-tabs">{[["link","Link",Link2],["note","Note",FileText],["file","File",FileUp]].map(([v,l,I])=><button type="button" key={v} className={type===v?"type-tab active":"type-tab"} onClick={()=>setType(v)}><I size={16}/>{l}</button>)}</div>}
      <div className="form-grid">
        <label className="span-two">Title<input required name="title" value={form.title} onChange={change} placeholder="Give it a clear name"/></label>
        {type==="link" && <label className="span-two">Website URL<input required type="url" name="url" value={form.url} onChange={change} placeholder="https://example.com"/></label>}
        {type==="note" && <label className="span-two">Your note<textarea rows="5" name="content" value={form.content} onChange={change} placeholder="Write or paste your thoughts…"/></label>}
        {type==="file" && <label className="span-two file-drop"><FileUp size={25}/><strong>{file?.name || initial?.fileName || "Choose a file to upload"}</strong><small>PDF, DOC, DOCX, TXT or image · Max 10 MB</small><input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={e=>setFile(e.target.files[0])}/></label>}
        <label className="span-two">Description<input name="description" value={form.description} onChange={change} placeholder="A short description (optional)"/></label>
        <label>Category<input name="category" value={form.category} onChange={change} placeholder="e.g. Study"/></label>
        <label>Tags<input name="tags" value={form.tags} onChange={change} placeholder="python, exam, useful"/></label>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?"Saving…":initial?._id?"Save changes":"Add to MindVault"}</button></div>
    </form>
  </div>;
}

function App() {
  const [user,setUser] = useState(null);
  const [page,setPage] = useState("dashboard");
  const [resources,setResources] = useState([]);
  const [collections,setCollections] = useState([]);
  const [stats,setStats] = useState({total:0,links:0,notes:0,files:0,favorites:0,storageBytes:0});
  const [query,setQuery] = useState("");
  const [debouncedQuery,setDebouncedQuery] = useState("");
  const [profileOpen,setProfileOpen] = useState(false);
  const [type,setType] = useState("all");
  const [category,setCategory] = useState("all");
  const [sort,setSort] = useState("newest");
  const [modal,setModal] = useState(null);
  const [toast,setToast] = useState("");
  const [theme,setTheme] = useState(localStorage.getItem("mindvault_theme") || "system");
  const [mobileNav,setMobileNav] = useState(false);
  const [selectedCollection,setSelectedCollection] = useState("");
  const [newCollection,setNewCollection] = useState("");
  const [loading,setLoading] = useState(false);
  const [passwordDraft,setPasswordDraft] = useState("");
  const [activeQuick,setActiveQuick] = useState("all");
  const [offlineItems,setOfflineItems] = useState([]);
  const [online,setOnline] = useState(navigator.onLine);
  const [installPrompt,setInstallPrompt] = useState(null);

  useEffect(()=>{
    const applyTheme = () => { const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.dataset.theme = isDark ? "dark" : "light"; };
    applyTheme(); localStorage.setItem("mindvault_theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", applyTheme);
    return () => media.removeEventListener?.("change", applyTheme);
  },[theme]);
  useEffect(()=>{
    const token=localStorage.getItem("mindvault_token");
    if(token) api("/auth/me").then(u=>{setUser(u);localStorage.setItem("mindvault_user",JSON.stringify(u));}).catch(()=>{
      const cached=localStorage.getItem("mindvault_user");
      if(cached && !navigator.onLine) setUser(JSON.parse(cached));
      else if(!cached) localStorage.removeItem("mindvault_token");
    });
    const updateOnline=()=>setOnline(navigator.onLine);
    const install=e=>{e.preventDefault();setInstallPrompt(e);};
    window.addEventListener("online",updateOnline);window.addEventListener("offline",updateOnline);window.addEventListener("beforeinstallprompt",install);
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
    return()=>{window.removeEventListener("online",updateOnline);window.removeEventListener("offline",updateOnline);window.removeEventListener("beforeinstallprompt",install);};
  },[]);
  const notify = msg => { setToast(msg); setTimeout(()=>setToast(""),2800); };
  useEffect(()=>{ const timer=setTimeout(()=>setDebouncedQuery(query.trim()),300); return ()=>clearTimeout(timer); },[query]);
  const refreshOffline = async () => { if(user) try { setOfflineItems(await offlineAll(user.email)); } catch { notify("Offline storage is unavailable in this browser."); } };
  useEffect(()=>{if(user) refreshOffline();},[user]);
  const saveForOffline = async item => {
    try {
      const saved={...item,offlineKey:offlineKeyFor(user,item),userKey:user.email,offlineSavedAt:new Date().toISOString(),fileBlob:null};
      if(item.type==="file" && !item.filePath) throw new Error("This file has no downloadable file path.");
      if(item.type==="file" && item.filePath){
        const response=await fetch(item.filePath.startsWith("http")?item.filePath:`${item.filePath.startsWith("/")?"":"/"}${item.filePath}`);
        if(!response.ok) throw new Error("Could not download this file. Check its access permissions.");
        saved.fileBlob=await response.blob();
      }
      await offlinePut(saved); await refreshOffline(); notify(item.type==="link"?"Link details saved offline. The website itself still needs internet.":"Saved for offline access on this device.");
    } catch(err){notify(err.message||"Could not save this item offline.");}
  };
  const removeOffline = async item => { await offlineDelete(item.offlineKey); await refreshOffline(); notify("Offline copy removed from this device."); };
  const downloadOfflineFile = item => { if(!item.fileBlob){notify("No downloaded file is available for this item.");return;} const url=URL.createObjectURL(item.fileBlob);const a=document.createElement("a");a.href=url;a.download=item.fileName||item.title||"mindvault-file";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); };
  const installApp = async()=>{if(!installPrompt){notify("Use your browser menu and choose Install MindVault or Add to Home screen.");return;}installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);};
  const logout = () => { localStorage.removeItem("mindvault_token"); localStorage.removeItem("mindvault_user"); setUser(null); setResources([]); setCollections([]); setPage("dashboard"); notify("You have been signed out."); };
  const changePassword = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const currentPassword = form.elements.namedItem("currentPassword").value;
    const newPassword = form.elements.namedItem("newPassword").value;
    const confirmPassword = form.elements.namedItem("confirmPassword").value;
    if (!passwordChecks(newPassword).every(item => item.valid)) { notify("New password does not meet all requirements."); return; }
    if (newPassword !== confirmPassword) { notify("New passwords do not match."); return; }
    try { const result = await api("/auth/change-password", { method:"POST", body:JSON.stringify({currentPassword,newPassword}) }); form.reset(); setPasswordDraft(""); notify(result.message); }
    catch (error) { notify(error.message); }
  };
  const load = async () => {
    if(!user) return;
    if(page==="offline"){ await refreshOffline(); return; }
    setLoading(true);
    try {
      const view = page==="trash"?"trash":page==="archive"?"archive":page==="recent"?"recent":"active";
      const params=new URLSearchParams({view,search:debouncedQuery,type,category,sort});
      if(page==="favorites") params.set("favorite","true");
      if(page==="collection"&&selectedCollection) params.set("collection",selectedCollection);
      const [items,dash,cols]=await Promise.all([api(`/resources?${params}`),api("/dashboard"),api("/collections")]);
      setResources(items);setStats(dash);setCollections(cols);
    } catch(err){notify(err.message);} finally{setLoading(false);}
  };
  useEffect(()=>{if(user) load();},[user,page,debouncedQuery,type,category,sort,selectedCollection]);
  const saveResource = async (body,id) => { await api(id?`/resources/${id}`:"/resources",{method:id?"PATCH":"POST",body}); notify(id?"Resource updated":"Added to your vault"); await load(); };
  const update = async (id,patch) => { await api(`/resources/${id}`,{method:"PATCH",body:JSON.stringify(patch)}); await load(); };
  const remove = async item => { if(!confirm(item.trashed?"Permanently delete this resource?":"Move this resource to the recycle bin?")) return; await api(`/resources/${item._id}`,{method:"DELETE"}); notify(item.trashed?"Permanently deleted":"Moved to recycle bin"); await load(); };
  const restore = async item => { await api(`/resources/${item._id}/restore`,{method:"PATCH"});notify("Resource restored");await load(); };
  const openItem = async item => { try { await api(`/resources/${item._id}`); } catch{} if(item.type==="link") window.open(item.url,"_blank","noopener,noreferrer"); else if(item.type==="file") window.open(item.filePath,"_blank","noopener,noreferrer"); else setModal({note:item}); await load(); };
  const createCollection = async e => {e.preventDefault();if(!newCollection.trim())return;try{await api("/collections",{method:"POST",body:JSON.stringify({name:newCollection})});setNewCollection("");notify("Collection created");await load();}catch(err){notify(err.message);}};
  const addToCollection = async item => { if(!collections.length){notify("Create a collection first.");return;} const choice=prompt(`Enter collection name:\n${collections.map(c=>c.name).join(", ")}`); const c=collections.find(x=>x.name.toLowerCase()===choice?.toLowerCase());if(!c)return;await api(`/collections/${c._id}`,{method:"PATCH",body:JSON.stringify({resourceId:item._id})});notify("Added to collection");await load();};
  const exportVault = async () => { try { const all=await api("/resources?view=active&sort=newest"); const payload=JSON.stringify(all,null,2); const blob=new Blob([payload],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=`mindvault-export-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);notify(`Exported ${all.length} resources`); } catch(err) { notify(err.message); } };
  const pasteClipboardLink = async () => { try { const value=await navigator.clipboard.readText(); if(!/^https?:\/\//i.test(value.trim())){notify("Clipboard does not contain a web link.");return;} setModal({new:true,clipboardUrl:value.trim()}); } catch { notify("Clipboard access was blocked. Use Add resource to paste a link."); } };
  const openProfile = () => setProfileOpen(v=>!v);
  const titleMap={dashboard:"Your overview",library:"My library",favorites:"Favorites",recent:"Recently viewed",offline:"Offline library",archive:"Archive",trash:"Recycle bin",collection:"Collections",settings:"Settings"};
  const navItems=[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"library",label:"My library",icon:Library},{id:"favorites",label:"Favorites",icon:Star},{id:"recent",label:"Recently viewed",icon:Clock3},{id:"offline",label:"Offline library",icon:WifiOff}];
  const secondary=[{id:"collection",label:"Collections",icon:Folder},{id:"archive",label:"Archive",icon:Archive},{id:"trash",label:"Recycle bin",icon:Trash2}];
  const categories=useMemo(()=>[...new Set(resources.map(r=>r.category).filter(Boolean))],[resources]);
  if(!user) return <AuthScreen onAuth={setUser}/>;

  const resourceCards = resources;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"show":""}`}>
      <div className="brand"><span className="brand-mark"><Layers size={21}/></span> MindVault <button className="mobile-close icon-btn" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <button className="primary-btn add-main" onClick={()=>setModal({new:true})}><Plus size={17}/> Add resource</button>
      <div className="nav-label">WORKSPACE</div>
      {navItems.map(n=><button key={n.id} title={n.label} className={`nav-item ${page===n.id?"selected":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);}}><n.icon size={18}/>{n.label}{n.id==="favorites"&&stats.favorites>0&&<span className="nav-count">{stats.favorites}</span>}{n.id==="offline"&&offlineItems.length>0&&<span className="nav-count">{offlineItems.length}</span>}</button>)}
      <div className="nav-label nav-label-spaced">YOUR SPACE</div>
      {secondary.map(n=><button key={n.id} title={n.label} className={`nav-item ${page===n.id?"selected":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);}}><n.icon size={18}/>{n.label}{n.id==="trash"&&stats.trash>0&&<span className="nav-count">{stats.trash}</span>}</button>)}
      {collections.length>0&&<div className="collection-nav"><div className="nav-label nav-label-spaced">COLLECTIONS</div>{collections.slice(0,5).map(c=><button className="nav-item compact" key={c._id} onClick={()=>{setSelectedCollection(c._id);setPage("collection");}}><Folder size={16}/>{c.name}</button>)}</div>}
      <div className="sidebar-bottom"><div className="storage-card"><div className="storage-top"><HardDrive size={15}/> Storage used</div><strong>{formatBytes(stats.storageBytes)}</strong><small>Local upload storage</small></div><button className="nav-item" onClick={()=>setPage("settings")}><Settings size={18}/> Settings</button><div className="user-mini"><div className="avatar">{initials(user.name)}</div><div className="user-meta"><strong>{user.name}</strong><small>{user.email}</small></div><button className="icon-btn logout" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<div className="mobile-scrim" onClick={()=>setMobileNav(false)}></div>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{titleMap[page]}</strong></div><nav className="top-nav">{[{id:"dashboard",label:"Dashboard"},{id:"library",label:"All resources"},{id:"collection",label:"Collections"},{id:"settings",label:"Settings"}].map(n=><button key={n.id} className={page===n.id?"active":""} onClick={()=>setPage(n.id)}>{n.label}</button>)}</nav><div className="top-actions"><div className="top-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){setPage("library");setType("all");setCategory("all");}}} placeholder="Search title, URL, tags…" aria-label="Search all resources"/><kbd>Enter</kbd>{query&&<button className="search-clear" onClick={()=>setQuery("")} title="Clear search"><X size={14}/></button>}</div><button className="icon-btn theme-toggle" onClick={()=>setPage("settings")} title="Appearance settings"><Settings size={18}/></button><div className="profile-wrap"><button className="profile-trigger" onClick={openProfile} aria-expanded={profileOpen} title="Account profile"><span className="avatar top-avatar">{initials(user.name)}</span><span className="profile-name">{user.name}</span><ChevronDown size={14}/></button>{profileOpen&&<div className="profile-menu"><div className="profile-menu-head"><span className="avatar profile-large">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><div className="profile-detail"><span>ACCOUNT ID</span><strong>{String(user.id||user._id||"—").slice(-10)}</strong></div><div className="profile-detail"><span>MEMBER SINCE</span><strong>{user.createdAt?new Date(user.createdAt).toLocaleDateString(undefined,{month:"long",year:"numeric"}):"Account active"}</strong></div><button onClick={()=>{setProfileOpen(false);setPage("settings");}}><Settings size={15}/> Account settings</button><button className="profile-logout" onClick={logout}><LogOut size={15}/> Sign out</button></div>}</div></div></header>
      <div className="page-content">
        {query.trim()&&<div className="search-status"><Search size={15}/> Searching your vault for <strong>“{query.trim()}”</strong><span>{loading?"Updating results…":`${resources.length} matching resource${resources.length===1?"":"s"}`}</span><button className="text-btn" onClick={()=>{setQuery("");setPage("dashboard");}}>Clear search</button></div>}
        {!online&&<div className="offline-banner"><WifiOff size={16}/> You are offline. Showing locally saved content; cloud changes are paused.</div>}
        <div className="page-heading"><div><span className="eyebrow">YOUR DIGITAL SPACE · {new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase()}</span><h1>{page==="dashboard"?`Welcome back, ${user.name.split(" ")[0]}`:titleMap[page]}</h1><p>{page==="dashboard"?"A clear space for everything worth keeping.":page==="library"?"All your saved links, notes and files in one place.":page==="trash"?"Items here can be restored or permanently deleted.":page==="offline"?"Your downloaded notes and files, available without a connection.":"Keep your knowledge organized and close at hand."}</p></div>{page!=="settings"&&page!=="offline"&&<button className="primary-btn" onClick={()=>setModal({new:true})}><Plus size={17}/> Add resource</button>}</div>

        {page==="dashboard"&&<>
          <section className="welcome-hero">
            <div className="hero-copy"><span className="hero-status"><span className="status-dot"/> YOUR COGNITIVE SANCTUARY · SYNC ACTIVE</span><h2>Everything you save, <em>organized</em> in one place.</h2><p>Everything you need, just a search away. Keep links, notes and files together, reduce digital clutter, and stay focused on what matters.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>setModal({new:true})}><Plus size={16}/> Save a resource</button><button className="secondary-btn" onClick={pasteClipboardLink}><Link2 size={15}/> Paste clipboard URL</button></div></div>
            <div className="vault-composition"><div className="composition-heading"><div><span className="eyebrow">RESOURCE COMPOSITION</span><h3>Your vault breakdown</h3></div><span className="composition-icon"><Layers size={16}/></span></div><div className="composition-content"><div className="donut" style={{"--links":`${stats.total?stats.links/stats.total*100:0}%`,"--notes":`${stats.total?stats.notes/stats.total*100:0}%`}}><div><strong>{stats.total.toLocaleString()}</strong><small>Items</small></div></div><div className="composition-legend"><span><i className="dot-link"/> Links <b>{stats.total?Math.round(stats.links/stats.total*100):0}%</b></span><span><i className="dot-note"/> Notes <b>{stats.total?Math.round(stats.notes/stats.total*100):0}%</b></span><span><i className="dot-file"/> Files <b>{stats.total?Math.round(stats.files/stats.total*100):0}%</b></span></div></div><button className="triage-btn" onClick={()=>{setPage("library");setSort("newest");setQuery("");notify("Your latest resources are ready to review.");}}><Sparkles size={15}/> Review latest resources</button></div>
            <div className="hero-metrics"><button onClick={()=>setPage("library")}><span>Total resources</span><strong>{stats.total.toLocaleString()}</strong><small><Library size={12}/> In your vault</small></button><button onClick={()=>setPage("favorites")}><span>Favorites</span><strong>{stats.favorites||0}</strong><small><Star size={12}/> Saved for later</small></button><button onClick={()=>setPage("archive")}><span>Archived</span><strong>{stats.archived||0}</strong><small><Archive size={12}/> Out of active view</small></button><button onClick={()=>setPage("trash")}><span>Recycle bin</span><strong>{stats.trash||0}</strong><small><Trash2 size={12}/> Recoverable items</small></button></div>
          </section>
          <section className="tag-navigator"><div className="section-kicker"><span>INSTANT TAG NAVIGATOR</span><button className="text-btn" onClick={()=>setPage("library")}>Browse all tags <span>→</span></button></div><div className="tag-pills"><button className="tag-pill active" onClick={()=>{setPage("library");setQuery("");}}># All saved <b>{stats.total}</b></button>{[...new Set(resources.flatMap(r=>r.tags||[]))].slice(0,9).map(tag=><button className="tag-pill" key={tag} onClick={()=>{setPage("library");setQuery(tag);}}><span/> #{tag} <b>{resources.filter(r=>(r.tags||[]).includes(tag)).length}</b></button>)}</div></section>
          <section className="collection-section"><div className="section-heading"><div><span className="eyebrow">SMART GROUPING</span><h3>Active collections</h3><p>Keep related knowledge together</p></div><button className="text-btn" onClick={()=>setPage("collection")}>See all ({collections.length}) <span>→</span></button></div><div className="collection-cards">{collections.slice(0,3).map((c,i)=><button className={`collection-preview collection-tone-${i%3}`} key={c._id} onClick={()=>{setSelectedCollection(c._id);setPage("collection");}}><span className="collection-art"><Folder size={26}/><span>{(c.resources||[]).length} ITEMS</span></span><strong>{c.name}</strong><small>{(c.resources||[]).length} saved resources · Open collection <span>↗</span></small></button>)}{!collections.length&&<button className="collection-empty" onClick={()=>setPage("collection")}><Plus size={18}/> Create your first collection</button>}</div></section>
          <section className="dashboard-library"><div className="dashboard-tabs"><button className={activeQuick==="all"?"selected":""} onClick={()=>setActiveQuick("all")}><Library size={15}/> All resources ({stats.total})</button><button className={activeQuick==="favorites"?"selected":""} onClick={()=>setActiveQuick("favorites")}><Star size={14}/> Favorites ({stats.favorites||0})</button><button className="export-action" onClick={exportVault}><Download size={14}/> Export vault</button><button className="text-btn" onClick={()=>setPage("library")}>View all →</button></div><div className="resource-grid">{(activeQuick==="favorites"?resources.filter(r=>r.favorite):resources).slice(0,4).map(item=><ResourceCard key={item._id} item={item} onOpen={openItem} onEdit={x=>setModal({edit:x})} onUpdate={update} onDelete={remove} onRestore={restore} onCollection={addToCollection} onOffline={saveForOffline}/>)}</div>{!resources.length&&<EmptyState onAdd={()=>setModal({new:true})}/>}</section>
          <section className="dashboard-extras"><div className="panel recent-panel"><div className="widget-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h3>Recently opened</h3></div><button className="text-btn" onClick={()=>setPage("recent")}>View history →</button></div>{(stats.recent||[]).length?(stats.recent||[]).slice(0,5).map(item=><button className="recent-activity-row" key={item._id} onClick={()=>openItem(item)}><span className={`resource-type-icon ${item.type}`}>{item.type==="link"?<Link2 size={16}/>:item.type==="note"?<FileText size={16}/>:<FileUp size={16}/>}</span><span className="recent-activity-copy"><strong>{item.title}</strong><small>{item.category||"Uncategorized"}</small></span><small className="recent-date">{item.viewedAt?new Date(item.viewedAt).toLocaleDateString():"Recently"}</small></button>):<div className="widget-empty">Open a saved resource and it will appear here.</div>}</div><div className="dashboard-tools"><div className="widget-heading"><div><span className="eyebrow">QUICK ACCESS</span><h3>Make your next move</h3></div><Sparkles size={18}/></div><button className="quick-tool" onClick={()=>setModal({new:true})}><span className="quick-tool-icon"><Plus size={17}/></span><span><strong>Capture something</strong><small>Save a link, note or file</small></span></button><button className="quick-tool" onClick={pasteClipboardLink}><span className="quick-tool-icon"><Link2 size={17}/></span><span><strong>Save clipboard URL</strong><small>Turn your copied link into a resource</small></span></button><button className="quick-tool" onClick={()=>setPage("offline")}><span className="quick-tool-icon"><WifiOff size={17}/></span><span><strong>Offline library</strong><small>{offlineItems.length} item{offlineItems.length===1?"":"s"} saved on this device</small></span></button><button className="quick-tool" onClick={exportVault}><span className="quick-tool-icon"><Download size={17}/></span><span><strong>Back up your vault</strong><small>Export your resources as JSON</small></span></button></div></section>
        </>}

        {page==="offline"&&<section className="offline-library panel"><div className="offline-library-head"><div><span className="eyebrow">ON THIS DEVICE</span><h2>Offline library</h2><p>{offlineItems.length} saved item{offlineItems.length===1?"":"s"} · Available in this browser on this device</p></div><button className="secondary-btn" onClick={refreshOffline}><RotateCcw size={15}/> Refresh</button></div>{offlineItems.length?<div className="offline-list">{offlineItems.map(item=><article className="offline-row" key={item.offlineKey}><div className={`resource-type-icon ${item.type}`}>{item.type==="link"?<Link2/>:item.type==="note"?<FileText/>:<FileUp/>}</div><div className="offline-row-copy"><strong>{item.title}</strong><small>{item.type.toUpperCase()} · Saved {new Date(item.offlineSavedAt).toLocaleDateString()}</small><p>{item.description||item.content||item.url||item.fileName}</p></div><div className="offline-row-actions">{item.type==="file"&&<button className="secondary-btn" onClick={()=>downloadOfflineFile(item)} disabled={!item.fileBlob}><Download size={14}/> Download</button>}{item.type==="link"&&<button className="secondary-btn" onClick={()=>window.open(item.url,"_blank","noopener,noreferrer")}><ExternalLink size={14}/> Open online</button>}{item.type==="note"&&<button className="secondary-btn" onClick={()=>setModal({note:item})}><BookOpen size={14}/> Read</button>}<button className="icon-btn danger-text" title="Remove offline copy" onClick={()=>removeOffline(item)}><Trash size={16}/></button></div></article>)}</div>:<div className="empty-state"><div className="empty-illustration"><WifiOff size={30}/></div><h3>No offline items yet</h3><p>Open a resource menu and choose “Save for offline” to keep its details or file on this device.</p><button className="primary-btn" onClick={()=>setPage("library")}>Browse resources</button></div>}</section>}

        {page==="settings"&&<div className="settings-stack">
          <section className="panel settings-panel"><h3>Appearance</h3><p className="settings-description">Choose how MindVault looks on this device.</p><div className="theme-options">{[{value:"light",label:"Light",icon:Sun},{value:"dark",label:"Dark",icon:Moon},{value:"system",label:"System default",icon:Settings}].map(option=><button key={option.value} className={`theme-option ${theme===option.value?"selected":""}`} onClick={()=>setTheme(option.value)}><option.icon size={19}/><strong>{option.label}</strong><small>{theme===option.value?"Currently selected":"Use this theme"}</small></button>)}</div></section>
          <section className="panel settings-panel"><h3>Offline & installation</h3><p className="settings-description">Install MindVault like an app and manage locally saved content. Offline copies stay on this browser and are not synced to MongoDB.</p><div className="setting-row"><div><strong>{online?"You are online":"Offline mode active"}</strong><p>{offlineItems.length} resource{offlineItems.length===1?"":"s"} saved on this device</p></div><button className="secondary-btn" onClick={installApp}><CloudDownload size={16}/> Install app</button></div><div className="setting-row"><div><strong>Offline library</strong><p>Read saved notes and download saved files without internet.</p></div><button className="secondary-btn" onClick={()=>setPage("offline")}>Manage offline items</button></div></section>
          <section className="panel settings-panel"><h3>Account</h3><div className="setting-row"><div><strong>{user.name}</strong><p>{user.email}</p></div><button className="secondary-btn danger-text" onClick={logout}><LogOut size={16}/> Sign out</button></div></section>
          <section className="panel settings-panel"><h3>Change password</h3><p className="settings-description">Use a unique password to protect your account.</p><form className="password-change-form" onSubmit={changePassword}><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Enter current password"/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" required value={passwordDraft} onChange={e=>setPasswordDraft(e.target.value)} placeholder="Create a new password"/></label><PasswordFeedback password={passwordDraft}/><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required placeholder="Confirm new password"/></label><button className="primary-btn">Update password</button></form></section>
          <section className="panel settings-panel"><h3>About MindVault</h3><div className="setting-row"><div><strong>Digital Clutter Organizer</strong><p>Full Stack Development project</p></div><span className="version-pill">v1.1.0</span></div></section>
        </div>}

        {page==="collection"&&<div className="collection-toolbar"><form onSubmit={createCollection} className="create-collection"><input value={newCollection} onChange={e=>setNewCollection(e.target.value)} placeholder="New collection name…"/><button className="primary-btn"><Plus size={16}/> Create</button></form><select value={selectedCollection} onChange={e=>setSelectedCollection(e.target.value)}><option value="">Select a collection</option>{collections.map(c=><option value={c._id} key={c._id}>{c.name}</option>)}</select></div>}

        {page!=="dashboard"&&page!=="settings"&&page!=="offline"&&<><div className="filterbar"><div className="filter-left"><label className="filter-select"><Filter size={15}/><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All types</option><option value="link">Links</option><option value="note">Notes</option><option value="file">Files</option></select><ChevronDown size={14}/></label><label className="filter-select"><Tag size={15}/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={14}/></label></div><label className="sort-select">Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title</option><option value="viewed">Recently viewed</option></select></label></div>
        {loading?<div className="loading-state">Loading your vault…</div>:resourceCards.length?<div className="resource-grid">{resourceCards.map(item=><ResourceCard key={item._id} item={item} onOpen={openItem} onEdit={x=>setModal({edit:x})} onUpdate={update} onDelete={remove} onRestore={restore} onCollection={addToCollection} onOffline={saveForOffline}/>)}</div>:<EmptyState onAdd={()=>setModal({new:true})} trash={page==="trash"}/>}</>}
      </div>
    </main>
    {modal&&<>{modal.note?<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal note-reader"><div className="modal-head"><div><span className="eyebrow">SAVED NOTE</span><h2>{modal.note.title}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><p className="note-content">{modal.note.content}</p></div></div>:<ResourceModal initial={modal.edit || (modal.clipboardUrl?{type:"link",url:modal.clipboardUrl}:null)} onClose={()=>setModal(null)} onSave={saveResource}/>}</>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function ResourceList({items,onOpen,onEdit,onUpdate,onDelete,onRestore,onCollection}) {
  return <div className="resource-list">{items.map(item=><div className="list-row" key={item._id}><div className={`resource-type-icon ${item.type}`} >{item.type==="link"?<Link2/>:item.type==="note"?<FileText/>:<FileUp/>}</div><button className="list-title" onClick={()=>onOpen(item)}><strong>{item.title}</strong><small>{item.category} · {new Date(item.createdAt).toLocaleDateString()}</small></button><button className="icon-btn" onClick={()=>onUpdate(item._id,{favorite:!item.favorite})}><Star size={16} fill={item.favorite?"currentColor":"none"}/></button></div>)}</div>;
}
function ResourceCard({item,onOpen,onEdit,onUpdate,onDelete,onRestore,onCollection,onOffline}) {
  const [menu,setMenu]=useState(false);
  return <article className="resource-card">
    <div className="resource-card-top"><span className={`resource-type-icon ${item.type}`}>{item.type==="link"?<Link2/>:item.type==="note"?<FileText/>:<FileUp/>}</span><div className="card-actions"><button className={`icon-btn star-btn ${item.favorite?"is-fav":""}`} title="Favorite" onClick={()=>onUpdate(item._id,{favorite:!item.favorite})}><Star size={17} fill={item.favorite?"currentColor":"none"}/></button><div className="menu-wrap"><button className="icon-btn" onClick={()=>setMenu(!menu)}><MoreHorizontal size={19}/></button>{menu&&<div className="dropdown-menu">
      {!item.trashed&&<><button onClick={()=>{onEdit(item);setMenu(false);}}><Pencil size={15}/> Edit</button><button onClick={()=>{onUpdate(item._id,{pinned:!item.pinned});setMenu(false);}}><Pin size={15}/> {item.pinned?"Unpin":"Pin to top"}</button><button onClick={()=>{onCollection(item);setMenu(false);}}><Folder size={15}/> Add to collection</button><button onClick={()=>{onOffline(item);setMenu(false);}}><CloudDownload size={15}/> Save for offline</button><button onClick={()=>{onUpdate(item._id,{archived:true});setMenu(false);}}><Archive size={15}/> Archive</button></>}
      {item.trashed&&<button onClick={()=>{onRestore(item);setMenu(false);}}><RotateCcw size={15}/> Restore</button>}
      <button className="danger-text" onClick={()=>{onDelete(item);setMenu(false);}}><Trash2 size={15}/>{item.trashed?"Delete permanently":"Move to trash"}</button>
    </div>}</div></div></div>
    <button className="card-main" onClick={()=>onOpen(item)}><h3>{item.title}</h3><p>{item.description|| (item.type==="note"?item.content:item.type==="file"?item.fileName:item.url) || "No description added yet."}</p></button>
    <div className="card-tags"><span className="category-chip">{item.category||"Uncategorized"}</span>{item.tags?.slice(0,2).map(t=><span className="tag-chip" key={t}>#{t}</span>)}</div>
    <div className="card-footer"><span>{new Date(item.createdAt).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</span><button className="open-link" onClick={()=>onOpen(item)}>{item.type==="link"?"Open link":item.type==="file"?"Open file":"Read note"} <ExternalLink size={13}/></button></div>
  </article>;
}
function EmptyState({onAdd,trash=false}) {return <div className="empty-state"><div className="empty-illustration"><BookOpen size={30}/></div><h3>{trash?"Your recycle bin is empty":"Your vault is ready"}</h3><p>{trash?"Deleted resources will appear here.":"Save your first link, note or file to start building your knowledge library."}</p>{!trash&&<button className="primary-btn" onClick={onAdd}><Plus size={16}/> Add your first resource</button>}</div>}

export default App;
