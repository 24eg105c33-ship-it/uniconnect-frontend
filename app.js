/* ANURAG UNIVERSITY · UniConnect — vanilla JS single-page frontend */
(function () {
  "use strict";

  const API = ((window.UNI_CONFIG && window.UNI_CONFIG.API_URL) || "http://localhost:8080/api").replace(/\/$/, "");
  const DOMAIN = "anurag.edu.in";
  const BRAND = "ANURAG UNIVERSITY";
  const EMAIL_RE = /^[a-z0-9._%+-]+@anurag\.edu\.in$/i;
  const MAX_IMG_BYTES = 1_000_000;

  /* ---------- tiny helpers ---------- */
  const root = document.getElementById("app");
  const state = { user: null, posts: [], suggestions: [], mode: "login" };

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v; // only used with static icon strings below
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return e;
  }
  function mount(node) { root.replaceChildren(node); }

  const ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 4.5 6.4 4.5c2 0 3.7 1.1 5.6 3.2 1.9-2.1 3.6-3.2 5.6-3.2 3.7 0 5.5 3.9 4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M22 3 2 10.5l7.5 3L12 21z"/><path d="m22 3-12.5 10.5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>',
  };
  const icon = (name, cls) => h("span", { class: cls || "", html: ICON[name], style: "display:contents" });

  /* ---------- theme ---------- */
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("uc_theme", t); } catch (e) {}
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#000000" : "#ffffff");
  }
  function toggleTheme() { setTheme(currentTheme() === "dark" ? "light" : "dark"); render(); }
  function themeButton(extraClass, withLabel) {
    const dark = currentTheme() === "dark";
    return h("button", { class: extraClass, title: dark ? "Switch to light theme" : "Switch to dark theme", "aria-label": "Toggle theme", onclick: toggleTheme },
      icon(dark ? "sun" : "moon"), withLabel ? h("span", null, dark ? "Light mode" : "Dark mode") : null);
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- API ---------- */
  const getToken = () => { try { return localStorage.getItem("uc_token"); } catch (e) { return null; } };
  async function api(path, opts) {
    opts = opts || {};
    const headers = { "Content-Type": "application/json" };
    const tok = getToken();
    if (tok) headers.Authorization = "Bearer " + tok;
    let res;
    try {
      res = await fetch(API + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    } catch (e) {
      throw new Error("Can't reach the server. If it was idle, wait ~30 seconds and try again.");
    }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && tok && !path.startsWith("/auth/")) { logout(true); throw new Error("Please log in again"); }
    if (!res.ok) throw new Error((data && (data.message || data.error)) || "Something went wrong (" + res.status + ")");
    return data;
  }

  /* ---------- formatting ---------- */
  const COLORS = ["#f56040", "#c13584", "#833ab4", "#5851db", "#405de6", "#1c9d8c", "#e08a00", "#2e8b57"];
  function colorFor(name) { let n = 0; for (const c of String(name)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return COLORS[n % COLORS.length]; }
  function avatar(name, size) {
    return h("div", { class: "avatar", style: `width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px;background:${colorFor(name)}` },
      (String(name).trim()[0] || "?").toUpperCase());
  }
  function ago(iso) {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    if (s < 604800) return Math.floor(s / 86400) + "d";
    return new Date(iso).toLocaleDateString();
  }
  const ordinal = (n) => (n ? n + ({ 1: "st", 2: "nd", 3: "rd" }[n] || "th") + " Year" : "");
  const sub = (u) => [u.department || u.authorDepartment, ordinal(u.year || u.authorYear)].filter(Boolean).join(" · ") || "Anurag University";
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

  /* ---------- auth screen ---------- */
  function renderAuth() {
    const reg = state.mode === "register";
    const err = h("div", { class: "error", role: "alert" });
    const f = {
      name: h("input", { class: "field", placeholder: "Full name", autocomplete: "name" }),
      email: h("input", { class: "field", type: "email", placeholder: "College email (name@" + DOMAIN + ")", autocomplete: "email" }),
      dept: h("input", { class: "field", placeholder: "Department (e.g. CSE)" }),
      year: h("select", { class: "field" }, [h("option", { value: "" }, "Year"), ...[1, 2, 3, 4].map((y) => h("option", { value: y }, ordinal(y)))]),
      pass: h("input", { class: "field", type: "password", placeholder: "Password", autocomplete: reg ? "new-password" : "current-password" }),
    };
    const btn = h("button", { class: "btn-primary", type: "submit" }, reg ? "Sign up" : "Log in");

    async function submit(ev) {
      ev.preventDefault();
      err.textContent = "";
      const email = f.email.value.trim();
      if (!EMAIL_RE.test(email)) { err.textContent = "Only your college email (@" + DOMAIN + ") can be used."; f.email.focus(); return; }
      if (reg && !f.name.value.trim()) { err.textContent = "Please enter your name."; return; }
      if (reg && f.pass.value.length < 8) { err.textContent = "Password must be at least 8 characters."; return; }
      btn.disabled = true; btn.textContent = "Please wait…";
      try {
        const body = reg
          ? { name: f.name.value.trim(), email, password: f.pass.value, department: f.dept.value.trim() || null, year: f.year.value ? Number(f.year.value) : null }
          : { email, password: f.pass.value };
        const res = await api(reg ? "/auth/register" : "/auth/login", { method: "POST", body });
        try { localStorage.setItem("uc_token", res.token); } catch (e) {}
        state.user = res.user;
        await enterApp();
      } catch (e) {
        err.textContent = e.message;
        btn.disabled = false; btn.textContent = reg ? "Sign up" : "Log in";
      }
    }

    const card = h("div", { class: "auth-card" },
      h("div", { class: "brand" }, BRAND),
      h("div", { class: "tagline" }, reg ? "Sign up with your college email to connect with your university." : "Your University. Your Network."),
      h("form", { onsubmit: submit, novalidate: true },
        reg ? [f.name, f.dept, f.year] : null,
        f.email, f.pass, btn,
        h("div", { class: "hint", style: "margin-top:4px" }, "Only @" + DOMAIN + " email addresses are allowed.")),
      err);
    const swap = h("div", { class: "switch-card" },
      reg ? "Have an account? " : "Don't have an account? ",
      h("button", { class: "link", onclick: () => { state.mode = reg ? "login" : "register"; render(); } }, reg ? "Log in" : "Sign up"));

    mount(h("div", { class: "auth-wrap" }, h("div", { class: "auth-col" }, card, swap), themeButton("icon-btn theme-float")));
  }

  /* ---------- app shell ---------- */
  function navItem(name, label, onclick, active) {
    return h("button", { class: "nav-item" + (active ? " active" : ""), onclick }, icon(name), h("span", null, label));
  }

  function renderApp() {
    const feedCol = h("div", { class: "feed-col" },
      h("div", { class: "topbar" }, h("div", { class: "brand" }, BRAND), h("div", { style: "display:flex" }, themeButton("icon-btn"), h("button", { class: "icon-btn", "aria-label": "Log out", onclick: () => logout() }, icon("logout")))),
      renderStories(),
      h("div", { class: "composer-prompt", onclick: openComposer },
        avatar(state.user.name, 36), "What's happening at " + "Anurag, " + state.user.name.split(" ")[0] + "?"),
      h("div", { id: "feed" }, renderPosts()));

    const sideCol = h("aside", { class: "side-col" },
      h("div", { class: "me-card" }, avatar(state.user.name, 56),
        h("div", { class: "who" }, h("span", { class: "name" }, state.user.name), h("span", { class: "sub" }, state.user.email))),
      h("div", { class: "side-title" }, "Suggested for you"),
      state.suggestions.length ? state.suggestions.map((u) =>
        h("div", { class: "sugg" }, avatar(u.name, 44), h("div", { class: "who" }, h("span", { class: "name" }, u.name), h("span", { class: "sub" }, sub(u))))) :
        h("div", { class: "hint" }, "More students will appear as they join."),
      h("div", { class: "footer-note" }, "© " + new Date().getFullYear() + " " + BRAND + " · UniConnect"));

    const sidebar = h("nav", { class: "sidebar", "aria-label": "Main" },
      h("div", { class: "brand" }, BRAND),
      h("div", { class: "nav" },
        navItem("home", "Home", () => window.scrollTo({ top: 0, behavior: "smooth" }), true),
        navItem("search", "Search", openSearch),
        navItem("plus", "Create", openComposer)),
      h("div", { class: "nav-bottom" },
        themeButton("nav-item", true),
        h("button", { class: "nav-item", onclick: () => logout() }, icon("logout"), h("span", null, "Log out"))));

    const bottom = h("div", { class: "bottombar" },
      h("button", { class: "icon-btn", "aria-label": "Home", onclick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }, icon("home")),
      h("button", { class: "icon-btn", "aria-label": "Search", onclick: openSearch }, icon("search")),
      h("button", { class: "icon-btn", "aria-label": "Create post", onclick: openComposer }, icon("plus")));

    mount(h("div", { class: "shell" }, sidebar, h("main", { class: "main" }, feedCol, sideCol), bottom));
  }

  function renderStories() {
    const people = [state.user, ...state.suggestions];
    return h("div", { class: "stories" }, people.map((u, i) =>
      h("div", { class: "story" }, h("div", { class: "ring" }, avatar(u.name, 60)), h("span", null, i === 0 ? "Your story" : u.name.split(" ")[0]))));
  }

  /* ---------- posts ---------- */
  function renderPosts() {
    if (!state.posts.length) {
      return h("div", { class: "empty" }, h("div", { style: "font-size:40px" }, "📷"), h("p", { style: "font-weight:600;margin-top:8px" }, "No posts yet"), h("p", null, "Be the first to share something with Anurag University."));
    }
    return state.posts.map(postCard);
  }

  function postCard(p) {
    const likeBtn = h("button", { class: "icon-btn" + (p.likedByMe ? " liked" : ""), "aria-label": "Like", "aria-pressed": String(p.likedByMe), onclick: () => like(p, card) }, icon("heart"));
    const commentsBox = h("div", { class: "comments" });
    let open = false, loaded = false;
    const form = h("form", { class: "comment-form", onsubmit: async (e) => {
      e.preventDefault();
      const txt = input.value.trim(); if (!txt) return;
      postBtn.disabled = true;
      try {
        const c = await api("/posts/" + p.id + "/comments", { method: "POST", body: { text: txt } });
        input.value = ""; p.comments++;
        if (loaded) commentsBox.append(commentLine(c));
        refreshCounts(card, p);
      } catch (er) { toast(er.message); }
      postBtn.disabled = !input.value.trim();
    } });
    const input = h("input", { placeholder: "Add a comment…", maxlength: "1000", "aria-label": "Add a comment", oninput: () => { postBtn.disabled = !input.value.trim(); } });
    const postBtn = h("button", { type: "submit", disabled: true }, "Post");
    form.append(input, postBtn);

    async function toggleComments() {
      open = !open;
      if (open && !loaded) {
        try { (await api("/posts/" + p.id + "/comments")).forEach((c) => commentsBox.append(commentLine(c))); loaded = true; } catch (e) { toast(e.message); open = false; }
      }
      commentsBox.style.display = open ? "flex" : "none";
      if (open) input.focus();
    }
    commentsBox.style.display = "none";

    const media = p.imageUrl ? h("div", { class: "post-media", ondblclick: () => { if (!p.likedByMe) like(p, card); pop(media); } },
      h("img", { src: p.imageUrl, alt: "Post by " + p.authorName, loading: "lazy" }),
      h("div", { class: "big-heart", html: ICON.heart })) : null;

    const card = h("article", { class: "post", "data-id": p.id },
      h("div", { class: "post-head" }, avatar(p.authorName, 36),
        h("div", { class: "who" }, h("span", { class: "name" }, p.authorName), h("span", { class: "sub" }, sub(p) + " · " + ago(p.createdAt)))),
      p.imageUrl ? null : (p.content ? h("div", { class: "post-text" }, p.content) : null),
      media,
      h("div", { class: "actions" },
        likeBtn,
        h("button", { class: "icon-btn", "aria-label": "Comment", onclick: toggleComments }, icon("comment")),
        h("button", { class: "icon-btn", "aria-label": "Share", onclick: () => share(p, card) }, icon("share"))),
      h("div", { class: "counts" }, h("span", { "data-k": "likes" }), h("span", { class: "m", "data-k": "shares" })),
      p.imageUrl && p.content ? h("div", { class: "caption" }, h("b", null, p.authorName), p.content) : null,
      h("button", { class: "view-comments", "data-k": "comments", onclick: toggleComments }),
      commentsBox, form);
    refreshCounts(card, p);
    return card;
  }

  function commentLine(c) { return h("div", { class: "comment" }, h("b", null, c.authorName), c.text); }
  function pop(media) { const b = media.querySelector(".big-heart"); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }

  function refreshCounts(card, p) {
    card.querySelector('[data-k="likes"]').textContent = plural(p.likes, "like");
    card.querySelector('[data-k="shares"]').textContent = p.shares ? plural(p.shares, "share") : "";
    card.querySelector('[data-k="comments"]').textContent = p.comments ? "View all " + plural(p.comments, "comment") : "No comments yet";
    const lb = card.querySelector(".actions .icon-btn");
    lb.classList.toggle("liked", p.likedByMe); lb.setAttribute("aria-pressed", String(p.likedByMe));
  }

  async function like(p, card) {
    // optimistic update
    p.likedByMe = !p.likedByMe; p.likes += p.likedByMe ? 1 : -1; refreshCounts(card, p);
    try { const r = await api("/posts/" + p.id + "/like", { method: "POST" }); Object.assign(p, r); }
    catch (e) { p.likedByMe = !p.likedByMe; p.likes += p.likedByMe ? 1 : -1; toast(e.message); }
    refreshCounts(card, p);
  }

  async function share(p, card) {
    const text = (p.content ? p.content.slice(0, 120) + " — " : "") + p.authorName + " on " + BRAND;
    try {
      if (navigator.share) await navigator.share({ title: BRAND, text, url: location.href });
      else { await navigator.clipboard.writeText(text + "\n" + location.href); toast("Link copied to clipboard"); }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { Object.assign(p, await api("/posts/" + p.id + "/share", { method: "POST" })); refreshCounts(card, p); } catch (e) {}
  }

  /* ---------- modals ---------- */
  function modal(title, body, foot) {
    const close = () => ov.remove();
    const ov = h("div", { class: "overlay", onclick: (e) => { if (e.target === ov) close(); } },
      h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title },
        h("div", { class: "modal-head" }, h("span", null, title), h("button", { class: "icon-btn", "aria-label": "Close", onclick: close }, "✕")),
        h("div", { class: "modal-body" }, body, foot)));
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
    document.body.append(ov);
    return { close, ov };
  }

  function openComposer() {
    let image = null;
    const ta = h("textarea", { placeholder: "Share a project, achievement or campus update…", maxlength: "2000" });
    const prev = h("div", { class: "preview", style: "display:none" });
    const file = h("input", { type: "file", accept: "image/*", style: "display:none", onchange: () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > MAX_IMG_BYTES) { toast("Photo is too large (max 1 MB)"); file.value = ""; return; }
      const r = new FileReader();
      r.onload = () => { image = r.result; prev.style.display = "block"; prev.replaceChildren(h("img", { src: image, alt: "Preview" }), h("button", { class: "rm", type: "button", "aria-label": "Remove photo", onclick: () => { image = null; prev.style.display = "none"; file.value = ""; } }, "✕")); };
      r.readAsDataURL(f);
    } });
    const share = h("button", { class: "btn-primary", style: "margin:0", onclick: async () => {
      if (!ta.value.trim() && !image) { toast("Write something or add a photo"); return; }
      share.disabled = true; share.textContent = "Sharing…";
      try {
        const p = await api("/posts", { method: "POST", body: { content: ta.value, imageUrl: image } });
        state.posts.unshift(p);
        m.close(); refreshFeed(); toast("Posted!");
      } catch (e) { toast(e.message); share.disabled = false; share.textContent = "Share"; }
    } }, "Share");
    const m = modal("Create new post", [h("div", { style: "display:flex;gap:12px" }, avatar(state.user.name, 36), h("div", { style: "flex:1" }, ta)), prev],
      h("div", { class: "modal-foot" }, h("button", { class: "icon-btn", "aria-label": "Add photo", onclick: () => file.click() }, icon("photo")), file, share));
    ta.focus();
  }

  function openSearch() {
    const list = h("div", { class: "result-list" }, h("div", { class: "empty" }, "Search students by name or department"));
    let t;
    const input = h("input", { class: "search-input", placeholder: "Search students…", "aria-label": "Search students", oninput: () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const q = input.value.trim();
        if (!q) { list.replaceChildren(h("div", { class: "empty" }, "Search students by name or department")); return; }
        try {
          const r = await api("/users/search?q=" + encodeURIComponent(q));
          list.replaceChildren(...(r.length ? r.map((u) => h("div", { class: "sugg" }, avatar(u.name, 44), h("div", { class: "who" }, h("span", { class: "name" }, u.name), h("span", { class: "sub" }, sub(u))))) : [h("div", { class: "empty" }, "No students found")]));
        } catch (e) { toast(e.message); }
      }, 250);
    } });
    modal("Search", [input, list]);
    input.focus();
  }

  function refreshFeed() { const f = document.getElementById("feed"); if (f) f.replaceChildren(...[].concat(renderPosts())); }

  /* ---------- lifecycle ---------- */
  async function enterApp() {
    mount(h("div", { class: "auth-wrap" }, h("div", { class: "spinner", "aria-label": "Loading" })));
    try {
      const [posts, sugg] = await Promise.all([api("/posts"), api("/users/suggestions")]);
      state.posts = posts; state.suggestions = sugg;
      renderApp();
    } catch (e) {
      toast(e.message); if (!getToken()) renderAuth(); else logout(true);
    }
  }
  function logout(silent) {
    try { localStorage.removeItem("uc_token"); } catch (e) {}
    state.user = null; state.posts = []; state.suggestions = [];
    render(); if (!silent) toast("Logged out");
  }
  function render() { state.user ? renderApp() : renderAuth(); }

  async function boot() {
    if (!getToken()) return renderAuth();
    mount(h("div", { class: "auth-wrap" }, h("div", { class: "spinner", "aria-label": "Loading" })));
    try { state.user = await api("/me"); await enterApp(); }
    catch (e) { try { localStorage.removeItem("uc_token"); } catch (x) {} renderAuth(); }
  }
  boot();
})();
