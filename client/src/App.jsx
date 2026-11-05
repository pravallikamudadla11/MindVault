import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Library, Plus, Search, Star, Clock3, Folder, Archive,
  Trash2, Settings, Moon, Sun, Link2, FileText, FileUp, MoreHorizontal,
  Pin, ExternalLink, Download, Pencil, RotateCcw, X, Menu, Tag, Layers,
  LogOut, Sparkles, Filter, Check, ChevronDown, HardDrive, BookOpen
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
      localStorage.setItem("mindvault_token", result.token); onAuth(result.user);
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
      <div className="modal-head"><div><span className="eyebrow">{initial?"UPDATE RESOURCE":"ADD TO YOUR VAULT"}</span><h2>{initial?"Edit resource":"Save something useful"}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X/></button></div>
      {!initial && <div className="type-tabs">{[["link","Link",Link2],["note","Note",FileText],["file","File",FileUp]].map(([v,l,I])=><button type="button" key={v} className={type===v?"type-tab active":"type-tab"} onClick={()=>setType(v)}><I size={16}/>{l}</button>)}</div>}
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
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?"Saving…":initial?"Save changes":"Add to MindVault"}</button></div>
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

  useEffect(()=>{
    const applyTheme = () => { const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.dataset.theme = isDark ? "dark" : "light"; };
    applyTheme(); localStorage.setItem("mindvault_theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", applyTheme);
    return () => media.removeEventListener?.("change", applyTheme);
  },[theme]);
  useEffect(()=>{const token=localStorage.getItem("mindvault_token");if(token) api("/auth/me").then(setUser).catch(()=>localStorage.removeItem("mindvault_token"));},[]);
  const notify = msg => { setToast(msg); setTimeout(()=>setToast(""),2800); };
  const logout = () => { localStorage.removeItem("mindvault_token"); setUser(null); setResources([]); setCollections([]); setPage("dashboard"); notify("You have been signed out."); };
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
    setLoading(true);
    try {
      const view = page==="trash"?"trash":page==="archive"?"archive":page==="recent"?"recent":"active";
      const params=new URLSearchParams({view,search:query,type,category,sort});
      if(page==="favorites") params.set("favorite","true");
      if(page==="collection"&&selectedCollection) params.set("collection",selectedCollection);
      const [items,dash,cols]=await Promise.all([api(`/resources?${params}`),api("/dashboard"),api("/collections")]);
      setResources(items);setStats(dash);setCollections(cols);
    } catch(err){notify(err.message);} finally{setLoading(false);}
  };
  useEffect(()=>{if(user) load();},[user,page,query,type,category,sort,selectedCollection]);
  const saveResource = async (body,id) => { await api(id?`/resources/${id}`:"/resources",{method:id?"PATCH":"POST",body}); notify(id?"Resource updated":"Added to your vault"); await load(); };
  const update = async (id,patch) => { await api(`/resources/${id}`,{method:"PATCH",body:JSON.stringify(patch)}); await load(); };
  const remove = async item => { if(!confirm(item.trashed?"Permanently delete this resource?":"Move this resource to the recycle bin?")) return; await api(`/resources/${item._id}`,{method:"DELETE"}); notify(item.trashed?"Permanently deleted":"Moved to recycle bin"); await load(); };
  const restore = async item => { await api(`/resources/${item._id}/restore`,{method:"PATCH"});notify("Resource restored");await load(); };
  const openItem = async item => { try { await api(`/resources/${item._id}`); } catch{} if(item.type==="link") window.open(item.url,"_blank","noopener,noreferrer"); else if(item.type==="file") window.open(item.filePath,"_blank","noopener,noreferrer"); else setModal({note:item}); await load(); };
  const createCollection = async e => {e.preventDefault();if(!newCollection.trim())return;try{await api("/collections",{method:"POST",body:JSON.stringify({name:newCollection})});setNewCollection("");notify("Collection created");await load();}catch(err){notify(err.message);}};
  const addToCollection = async item => { if(!collections.length){notify("Create a collection first.");return;} const choice=prompt(`Enter collection name:\n${collections.map(c=>c.name).join(", ")}`); const c=collections.find(x=>x.name.toLowerCase()===choice?.toLowerCase());if(!c)return;await api(`/collections/${c._id}`,{method:"PATCH",body:JSON.stringify({resourceId:item._id})});notify("Added to collection");await load();};
  const titleMap={dashboard:"Your overview",library:"My library",favorites:"Favorites",recent:"Recently viewed",archive:"Archive",trash:"Recycle bin",collection:"Collections",settings:"Settings"};
  const navItems=[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"library",label:"My library",icon:Library},{id:"favorites",label:"Favorites",icon:Star},{id:"recent",label:"Recently viewed",icon:Clock3}];
  const secondary=[{id:"collection",label:"Collections",icon:Folder},{id:"archive",label:"Archive",icon:Archive},{id:"trash",label:"Recycle bin",icon:Trash2}];
  const categories=useMemo(()=>[...new Set(resources.map(r=>r.category).filter(Boolean))],[resources]);
  if(!user) return <AuthScreen onAuth={setUser}/>;

  const resourceCards = resources;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"show":""}`}>
      <div className="brand"><span className="brand-mark"><Layers size={21}/></span> MindVault <button className="mobile-close icon-btn" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <button className="primary-btn add-main" onClick={()=>setModal({new:true})}><Plus size={17}/> Add resource</button>
      <div className="nav-label">WORKSPACE</div>
      {navItems.map(n=><button key={n.id} className={`nav-item ${page===n.id?"selected":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);}}><n.icon size={18}/>{n.label}{n.id==="favorites"&&stats.favorites>0&&<span className="nav-count">{stats.favorites}</span>}</button>)}
      <div className="nav-label nav-label-spaced">YOUR SPACE</div>
      {secondary.map(n=><button key={n.id} className={`nav-item ${page===n.id?"selected":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);}}><n.icon size={18}/>{n.label}{n.id==="trash"&&stats.trash>0&&<span className="nav-count">{stats.trash}</span>}</button>)}
      {collections.length>0&&<div className="collection-nav"><div className="nav-label nav-label-spaced">COLLECTIONS</div>{collections.slice(0,5).map(c=><button className="nav-item compact" key={c._id} onClick={()=>{setSelectedCollection(c._id);setPage("collection");}}><Folder size={16}/>{c.name}</button>)}</div>}
      <div className="sidebar-bottom"><div className="storage-card"><div className="storage-top"><HardDrive size={15}/> Storage used</div><strong>{formatBytes(stats.storageBytes)}</strong><small>Local upload storage</small></div><button className="nav-item" onClick={()=>setPage("settings")}><Settings size={18}/> Settings</button><div className="user-mini"><div className="avatar">{initials(user.name)}</div><div className="user-meta"><strong>{user.name}</strong><small>{user.email}</small></div><button className="icon-btn logout" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<div className="mobile-scrim" onClick={()=>setMobileNav(false)}></div>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{titleMap[page]}</strong></div><div className="top-actions"><div className="top-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your vault…"/><kbd>⌘ K</kbd></div><button className="icon-btn theme-toggle" onClick={()=>setPage("settings")} title="Appearance settings"><Settings size={18}/></button><div className="avatar top-avatar">{initials(user.name)}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><span className="eyebrow">THURSDAY, YOUR DIGITAL SPACE</span><h1>{page==="dashboard"?`Welcome back, ${user.name.split(" ")[0]}`:titleMap[page]}</h1><p>{page==="dashboard"?"A clear space for everything worth keeping.":page==="library"?"All your saved links, notes and files in one place.":page==="trash"?"Items here can be restored or permanently deleted.":"Keep your knowledge organized and close at hand."}</p></div>{page!=="settings"&&<button className="primary-btn" onClick={()=>setModal({new:true})}><Plus size={17}/> Add resource</button>}</div>

        {page==="dashboard"&&<><div className="stats-grid">
          {[["Total resources",stats.total,Library,"#7866e8"],["Website links",stats.links,Link2,"#3b9caa"],["Notes",stats.notes,FileText,"#d49a43"],["Files",stats.files,FileUp,"#d47d9d"]].map(([label,value,Icon,color])=><div className="stat-card" key={label}><div className="stat-icon" style={{"--accent":color}}><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>In your active library</small></div>)}
        </div><div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-head"><div><h3>Recently added</h3><p>Your latest saved resources</p></div><button className="text-btn" onClick={()=>setPage("library")}>View library <span>→</span></button></div><ResourceList items={resources.slice(0,5)} onOpen={openItem} onEdit={x=>setModal({edit:x})} onUpdate={update} onDelete={remove} onRestore={restore} onCollection={addToCollection}/>{resources.length===0&&<EmptyState onAdd={()=>setModal({new:true})}/>}</section><section className="panel side-panel"><div className="panel-head"><div><h3>Quick insights</h3><p>Your knowledge at a glance</p></div><Sparkles size={18} className="sparkle"/></div><div className="insight-row"><span className="insight-icon purple"><Star size={16}/></span><div><strong>{stats.favorites} favorites</strong><small>Resources worth keeping close</small></div></div><div className="insight-row"><span className="insight-icon teal"><Archive size={16}/></span><div><strong>{stats.archived} archived items</strong><small>Out of your active workspace</small></div></div><div className="insight-row"><span className="insight-icon amber"><HardDrive size={16}/></span><div><strong>{formatBytes(stats.storageBytes)} used</strong><small>Across uploaded files</small></div></div><div className="tip-card"><Sparkles size={16}/><div><strong>Little organization tip</strong><p>Use tags like “exam”, “reference” or “to-read” to find things faster.</p></div></div></section></div></>}

        {page==="settings"&&<div className="settings-stack">
          <section className="panel settings-panel"><h3>Appearance</h3><p className="settings-description">Choose how MindVault looks on this device.</p><div className="theme-options">{[{value:"light",label:"Light",icon:Sun},{value:"dark",label:"Dark",icon:Moon},{value:"system",label:"System default",icon:Settings}].map(option=><button key={option.value} className={`theme-option ${theme===option.value?"selected":""}`} onClick={()=>setTheme(option.value)}><option.icon size={19}/><strong>{option.label}</strong><small>{theme===option.value?"Currently selected":"Use this theme"}</small></button>)}</div></section>
          <section className="panel settings-panel"><h3>Account</h3><div className="setting-row"><div><strong>{user.name}</strong><p>{user.email}</p></div><button className="secondary-btn danger-text" onClick={logout}><LogOut size={16}/> Sign out</button></div></section>
          <section className="panel settings-panel"><h3>Change password</h3><p className="settings-description">Use a unique password to protect your account.</p><form className="password-change-form" onSubmit={changePassword}><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Enter current password"/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" required value={passwordDraft} onChange={e=>setPasswordDraft(e.target.value)} placeholder="Create a new password"/></label><PasswordFeedback password={passwordDraft}/><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required placeholder="Confirm new password"/></label><button className="primary-btn">Update password</button></form></section>
          <section className="panel settings-panel"><h3>About MindVault</h3><div className="setting-row"><div><strong>Digital Clutter Organizer</strong><p>Full Stack Development project</p></div><span className="version-pill">v1.1.0</span></div></section>
        </div>}

        {page==="collection"&&<div className="collection-toolbar"><form onSubmit={createCollection} className="create-collection"><input value={newCollection} onChange={e=>setNewCollection(e.target.value)} placeholder="New collection name…"/><button className="primary-btn"><Plus size={16}/> Create</button></form><select value={selectedCollection} onChange={e=>setSelectedCollection(e.target.value)}><option value="">Select a collection</option>{collections.map(c=><option value={c._id} key={c._id}>{c.name}</option>)}</select></div>}

        {page!=="dashboard"&&page!=="settings"&&<><div className="filterbar"><div className="filter-left"><label className="filter-select"><Filter size={15}/><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All types</option><option value="link">Links</option><option value="note">Notes</option><option value="file">Files</option></select><ChevronDown size={14}/></label><label className="filter-select"><Tag size={15}/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={14}/></label></div><label className="sort-select">Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title</option><option value="viewed">Recently viewed</option></select></label></div>
        {loading?<div className="loading-state">Loading your vault…</div>:resourceCards.length?<div className="resource-grid">{resourceCards.map(item=><ResourceCard key={item._id} item={item} onOpen={openItem} onEdit={x=>setModal({edit:x})} onUpdate={update} onDelete={remove} onRestore={restore} onCollection={addToCollection}/>)}</div>:<EmptyState onAdd={()=>setModal({new:true})} trash={page==="trash"}/>}</>}
      </div>
    </main>
    {modal&&<>{modal.note?<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal note-reader"><div className="modal-head"><div><span className="eyebrow">SAVED NOTE</span><h2>{modal.note.title}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><p className="note-content">{modal.note.content}</p></div></div>:<ResourceModal initial={modal.edit} onClose={()=>setModal(null)} onSave={saveResource}/>}</>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function ResourceList({items,onOpen,onEdit,onUpdate,onDelete,onRestore,onCollection}) {
  return <div className="resource-list">{items.map(item=><div className="list-row" key={item._id}><div className={`resource-type-icon ${item.type}`} >{item.type==="link"?<Link2/>:item.type==="note"?<FileText/>:<FileUp/>}</div><button className="list-title" onClick={()=>onOpen(item)}><strong>{item.title}</strong><small>{item.category} · {new Date(item.createdAt).toLocaleDateString()}</small></button><button className="icon-btn" onClick={()=>onUpdate(item._id,{favorite:!item.favorite})}><Star size={16} fill={item.favorite?"currentColor":"none"}/></button></div>)}</div>;
}
function ResourceCard({item,onOpen,onEdit,onUpdate,onDelete,onRestore,onCollection}) {
  const [menu,setMenu]=useState(false);
  return <article className="resource-card">
    <div className="resource-card-top"><span className={`resource-type-icon ${item.type}`}>{item.type==="link"?<Link2/>:item.type==="note"?<FileText/>:<FileUp/>}</span><div className="card-actions"><button className={`icon-btn star-btn ${item.favorite?"is-fav":""}`} title="Favorite" onClick={()=>onUpdate(item._id,{favorite:!item.favorite})}><Star size={17} fill={item.favorite?"currentColor":"none"}/></button><div className="menu-wrap"><button className="icon-btn" onClick={()=>setMenu(!menu)}><MoreHorizontal size={19}/></button>{menu&&<div className="dropdown-menu">
      {!item.trashed&&<><button onClick={()=>{onEdit(item);setMenu(false);}}><Pencil size={15}/> Edit</button><button onClick={()=>{onUpdate(item._id,{pinned:!item.pinned});setMenu(false);}}><Pin size={15}/> {item.pinned?"Unpin":"Pin to top"}</button><button onClick={()=>{onCollection(item);setMenu(false);}}><Folder size={15}/> Add to collection</button><button onClick={()=>{onUpdate(item._id,{archived:true});setMenu(false);}}><Archive size={15}/> Archive</button></>}
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
