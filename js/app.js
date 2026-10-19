/* FreeTV v2 — India-only curated app */
(function () {
  "use strict";

  var PAGE_SIZE = 120;
  var TABS = ["hindi", "marathi", "english", "sports"];

  /* ---------- i18n ---------- */
  var I18N = {
    en: {
      search_ph: "Search channels…",
      channels: "{n} channels",
      loading: "Loading channels…",
      load_error: "⚠️ Couldn't load channels.<br>Check internet and try again.",
      empty: "😕 No channels found.<br>Try a different search.",
      favs_empty: "★ No favorites yet — tap ★ on any channel.",
      err_slow: "⏳ Channel isn't loading — the stream may be down. Try another.",
      err_dead: "⚠️ This stream isn't working. Try another channel.",
      cat_all: "All",
      tab_sports: "🏆 Sports",
      sub: "✓ {n} working Indian channels",
      lang_btn: "🌐 हिं"
    },
    hi: {
      search_ph: "Channel dhoondo…",
      channels: "{n} channel",
      loading: "Channel load ho rahe hain…",
      load_error: "⚠️ Channel load nahi hue.<br>Internet check karke dobara try karo.",
      empty: "😕 Koi channel nahi mila.",
      favs_empty: "★ Abhi koi pasandida channel nahi — kisi channel pe ★ dabao.",
      err_slow: "⏳ Channel load nahi ho raha — stream down ho sakta hai.",
      err_dead: "⚠️ Ye stream nahi chal raha. Koi aur try karo.",
      cat_all: "Sab",
      tab_sports: "🏆 खेल",
      sub: "✓ {n} chalte hue Indian channel",
      lang_btn: "🌐 EN"
    }
  };

  var lang = "en";
  try {
    lang =
      localStorage.getItem("freetv:lang") ||
      ((navigator.language || "en").toLowerCase().indexOf("hi") === 0 ? "hi" : "en");
  } catch (e) {}
  if (!I18N[lang]) lang = "en";
  function t(key, a, b) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    if (a !== undefined) s = String(s).replace("{n}", a);
    if (b !== undefined) s = String(s).replace("{d}", b);
    return s;
  }

  /* ---------- state ---------- */
  var state = { tab: "hindi", channels: [], filtered: [], category: "All", query: "", favsOnly: false, rendered: 0, loading: false };
  var cache = {};
  var favs = {};
  try { favs = JSON.parse(localStorage.getItem("freetv:favs") || "{}"); } catch (e) { favs = {}; }
  function saveFavs() { try { localStorage.setItem("freetv:favs", JSON.stringify(favs)); } catch (e) {} }

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function qualityOf(name) { var m = String(name).match(/(\d{3,4}p)/); return m ? m[1] : ""; }

  /* ---------- language (UI) ---------- */
  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    try { localStorage.setItem("freetv:lang", l); } catch (e) {}
    $("search").setAttribute("placeholder", t("search_ph"));
    $("langToggle").textContent = t("lang_btn");
    $("loadingText").textContent = t("loading");
    $("tabSports").textContent = t("tab_sports");
    document.documentElement.lang = l === "hi" ? "hi" : "en";
    updateSub();
    buildCategories();
    applyFilters();
  }
  function updateSub() {
    var total = Object.keys(cache).reduce(function (s, k) { return s + cache[k].length; }, 0);
    $("subLine").innerHTML = total
      ? '<span class="ok">●</span> ' + esc(t("sub", total.toLocaleString("en-IN")))
      : "";
  }

  /* ---------- data ---------- */
  function loadTab(tab) {
    state.tab = tab;
    state.category = "All";
    state.favsOnly = false;
    $("favToggle").classList.remove("active");
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    if (cache[tab]) {
      state.channels = cache[tab];
      buildCategories();
      applyFilters();
      return;
    }
    state.loading = true;
    showLoading(true);
    $("grid").innerHTML = "";
    fetch("data/" + tab + ".json")
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (list) {
        cache[tab] = list;
        state.channels = list;
        state.loading = false;
        showLoading(false);
        updateSub();
        buildCategories();
        applyFilters();
      })
      .catch(function () {
        state.loading = false;
        showLoading(false);
        $("grid").innerHTML = '<div class="empty">' + t("load_error") + "</div>";
        $("count").textContent = "";
      });
  }
  function showLoading(on) { $("loading").style.display = on ? "flex" : "none"; }

  /* ---------- categories ---------- */
  function buildCategories() {
    var counts = {};
    state.channels.forEach(function (ch) { counts[ch.g] = (counts[ch.g] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    state.category = "All";
    var bar = $("cats");
    var html = '<button class="chip active" data-cat="All">' + esc(t("cat_all")) + "</button>";
    cats.slice(0, 16).forEach(function (c) {
      html += '<button class="chip" data-cat="' + esc(c) + '">' + esc(c) + " (" + counts[c] + ")</button>";
    });
    bar.innerHTML = html;
    bar.querySelectorAll(".chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        bar.querySelectorAll(".chip").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.category = btn.getAttribute("data-cat");
        applyFilters();
      });
    });
  }

  /* ---------- filtering + rendering ---------- */
  function applyFilters() {
    var q = state.query.trim().toLowerCase();
    var pool = state.favsOnly ? Object.keys(favs).map(function (k) { return favs[k]; }) : state.channels;
    state.filtered = pool.filter(function (ch) {
      if (state.category !== "All" && ch.g !== state.category) return false;
      if (q && ch.n.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    state.rendered = 0;
    $("grid").innerHTML = "";
    $("count").textContent = t("channels", state.filtered.length.toLocaleString("en-IN"));
    if (!state.filtered.length) {
      $("grid").innerHTML = '<div class="empty">' +
        (state.favsOnly && !Object.keys(favs).length ? t("favs_empty") : t("empty")) + "</div>";
      return;
    }
    renderMore();
  }

  function cardHTML(ch) {
    var isFav = !!favs[ch.u];
    var q = qualityOf(ch.n);
    var letter = esc((ch.n || "?").trim().charAt(0).toUpperCase());
    return '<div class="card" data-url="' + esc(ch.u) + '">' +
      '<div class="logo"><span class="letter">' + letter + "</span>" +
      (ch.l ? '<img loading="lazy" src="' + esc(ch.l) + '" alt="" onerror="this.remove()">' : "") + "</div>" +
      '<div class="cname">' + esc(ch.n) + "</div>" +
      '<div class="cmeta">' + (q ? '<span class="q">' + esc(q) + "</span>" : "") +
      '<span class="g">' + esc(ch.g) + "</span></div>" +
      '<button class="fav' + (isFav ? " on" : "") + '" data-fav="' + esc(ch.u) + '" aria-label="favorite">★</button>' +
      '<span class="live"><i></i>LIVE</span></div>';
  }

  function renderMore() {
    var grid = $("grid");
    var next = Math.min(state.rendered + PAGE_SIZE, state.filtered.length);
    var html = "";
    for (var i = state.rendered; i < next; i++) html += cardHTML(state.filtered[i]);
    grid.insertAdjacentHTML("beforeend", html);
    state.rendered = next;
    bindCards(grid);
  }

  function bindCards(root) {
    root.querySelectorAll(".card").forEach(function (card) {
      if (card._bound) return;
      card._bound = true;
      card.addEventListener("click", function (e) {
        var favBtn = e.target.closest("[data-fav]");
        if (favBtn) { e.stopPropagation(); toggleFav(favBtn.getAttribute("data-fav")); return; }
        var url = card.getAttribute("data-url");
        for (var i = 0; i < state.filtered.length; i++) {
          if (state.filtered[i].u === url) { openPlayer(state.filtered[i]); break; }
        }
      });
    });
  }

  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !state.loading && state.rendered < state.filtered.length) renderMore();
  }, { rootMargin: "600px" });

  /* ---------- favorites ---------- */
  function toggleFav(url) {
    var ch = favs[url] || null;
    if (!ch) for (var i = 0; i < state.channels.length; i++) {
      if (state.channels[i].u === url) { ch = state.channels[i]; break; }
    }
    if (!ch) { for (var k in cache) { var arr = cache[k]; for (var j = 0; j < arr.length; j++) if (arr[j].u === url) { ch = arr[j]; break; } if (ch) break; } }
    if (!ch) return;
    if (favs[url]) delete favs[url]; else favs[url] = { n: ch.n, l: ch.l, g: ch.g, u: ch.u };
    saveFavs();
    document.querySelectorAll("[data-fav]").forEach(function (b) {
      if (b.getAttribute("data-fav") === url) b.classList.toggle("on", !!favs[url]);
    });
    if (state.favsOnly) applyFilters();
  }

  /* ---------- fullscreen player ---------- */
  var hls = null, barTimer = null;
  function showBar() {
    $("pbar").classList.remove("hide");
    clearTimeout(barTimer);
    barTimer = setTimeout(function () { $("pbar").classList.add("hide"); }, 3500);
  }
  function goFullscreen() {
    var el = $("player"), v = $("video");
    try {
      if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    } catch (e) {}
  }
  function openPlayer(ch) {
    $("pName").textContent = ch.n;
    $("pMeta").textContent = ch.g;
    $("pError").style.display = "none";
    $("player").classList.add("open");
    document.body.style.overflow = "hidden";
    showBar();

    var video = $("video");
    if (hls) { hls.destroy(); hls = null; }
    video.removeAttribute("src");
    video.load();

    var timer = setTimeout(function () {
      if (video.readyState < 2) playerError(t("err_slow"));
    }, 20000);
    video.onplaying = function () { clearTimeout(timer); };

    try {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = ch.u;
      } else if (window.Hls && window.Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(ch.u);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, function (ev, data) {
          if (data.fatal) { clearTimeout(timer); playerError(t("err_dead")); }
        });
      } else {
        playerError(t("err_dead"));
        return;
      }
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { playerError(t("err_dead")); }
    goFullscreen();
  }
  function playerError(msg) {
    var box = $("pError");
    box.textContent = msg;
    box.style.display = "block";
    showBar();
  }
  function closePlayer() {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
    } catch (e) {}
    clearTimeout(barTimer);
    $("player").classList.remove("open");
    document.body.style.overflow = "";
    var video = $("video");
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (hls) { hls.destroy(); hls = null; }
  }

  /* ---------- wire up ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    setLang(lang);
    loadTab("hindi");
    io.observe($("sentinel"));

    document.querySelectorAll("#tabs button").forEach(function (btn) {
      btn.addEventListener("click", function () { loadTab(btn.getAttribute("data-tab")); });
    });

    var searchTimer = null;
    $("search").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      var v = e.target.value;
      searchTimer = setTimeout(function () { state.query = v; applyFilters(); }, 250);
    });

    $("favToggle").addEventListener("click", function () {
      state.favsOnly = !state.favsOnly;
      $("favToggle").classList.toggle("active", state.favsOnly);
      applyFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("langToggle").addEventListener("click", function () { setLang(lang === "en" ? "hi" : "en"); });

    $("pClose").addEventListener("click", closePlayer);
    $("video").addEventListener("click", function () {
      if ($("pbar").classList.contains("hide")) showBar();
      else { $("pbar").classList.add("hide"); clearTimeout(barTimer); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePlayer(); });
    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement && $("player").classList.contains("open")) closePlayer();
    });
    $("video").addEventListener("webkitendfullscreen", function () {
      if ($("player").classList.contains("open")) closePlayer();
    });
  });
})();
