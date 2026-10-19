/* FreeTV app logic */
(function () {
  "use strict";

  var BASE = "https://iptv-org.github.io/iptv";
  var PAGE_SIZE = 120;

  /* ---------- i18n ---------- */
  var I18N = {
    en: {
      search_ph: "Search channels… (e.g. news, sports)",
      fav: "★ Fav",
      all_countries: "🌍 All Countries",
      all_languages: "🗣 All Languages",
      channels: "{n} channels",
      loading: "Loading channels…",
      load_error: "⚠️ Couldn't load the playlist.<br>Check your internet and try again.",
      empty: "😕 No channels found.<br>Try a different search or filter.",
      favs_empty: "★ No favorites yet — tap ★ on any channel card.",
      err_old_link: "🔒 This channel uses an old (http) link and can't play on a secure website. Try another channel.",
      err_slow: "⏳ Channel isn't loading — the stream may be down right now. Try another one.",
      err_dead: "⚠️ This stream isn't working right now. Try another channel.",
      err_format: "⚠️ Your browser doesn't support this stream format.",
      cat_all: "All",
      footer: '📺 <b>FreeTV</b> — 8000+ free live TV channels from 200+ countries.<br>Streams by <a href="https://iptv-org.github.io" target="_blank" rel="noopener">iptv-org</a> (public free streams) · All channels belong to their owners · Free forever, no signup.',
      lang_btn: "🌐 हिं"
    },
    hi: {
      search_ph: "Channel dhoondo… (jaise news, sports)",
      fav: "★ Pasand",
      all_countries: "🌍 Sab Desh",
      all_languages: "🗣 Sab Bhashayein",
      channels: "{n} channel",
      loading: "Channel load ho rahe hain…",
      load_error: "⚠️ Playlist load nahi hui.<br>Internet check karke dobara try karo.",
      empty: "😕 Koi channel nahi mila.<br>Search ya filter badal kar dekho.",
      favs_empty: "★ Abhi koi pasandida channel nahi — kisi channel card pe ★ dabao.",
      err_old_link: "🔒 Ye channel purane (http) link par hai, isliye secure website par nahi chalega. Koi aur channel try karo.",
      err_slow: "⏳ Channel load nahi ho raha — ye stream abhi down ho sakta hai. Koi aur try karo.",
      err_dead: "⚠️ Ye stream abhi nahi chal raha. Koi aur channel try karo.",
      err_format: "⚠️ Tumhara browser ye stream format support nahi karta.",
      cat_all: "Sab",
      footer: '📺 <b>FreeTV</b> — 200+ deshon ke 8000+ muft live TV channel.<br><a href="https://iptv-org.github.io" target="_blank" rel="noopener">iptv-org</a> ke stream (muft public stream) · Sab channel unke malikon ke hain · Hamesha muft, bina signup.',
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

  function t(key, n) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    return n !== undefined ? String(s).replace("{n}", n) : s;
  }

  /* ---------- state ---------- */
  var state = {
    channels: [],
    filtered: [],
    country: "all",
    clang: "all",
    category: "All",
    query: "",
    favsOnly: false,
    rendered: 0,
    loading: false
  };

  var favs = {};
  try {
    favs = JSON.parse(localStorage.getItem("freetv:favs") || "{}");
  } catch (e) {
    favs = {};
  }
  function saveFavs() {
    try {
      localStorage.setItem("freetv:favs", JSON.stringify(favs));
    } catch (e) {}
  }

  var countryList = [];
  var langList = [];

  var $ = function (id) {
    return document.getElementById(id);
  };
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function flagOf(code) {
    if (!code || code.length !== 2) return "";
    var A = 0x1f1e6;
    return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65);
  }

  /* ---------- language (UI) ---------- */
  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    try {
      localStorage.setItem("freetv:lang", l);
    } catch (e) {}
    $("search").setAttribute("placeholder", t("search_ph"));
    $("favToggle").textContent = t("fav");
    $("langToggle").textContent = t("lang_btn");
    $("loadingText").textContent = t("loading");
    $("footer").innerHTML = t("footer");
    document.documentElement.lang = l === "hi" ? "hi" : "en";
    renderCountryOptions();
    renderLanguageOptions();
    buildCategories();
    applyFilters();
  }

  /* ---------- countries & content-languages ---------- */
  function renderCountryOptions() {
    var sel = $("country");
    var html = '<option value="all">' + esc(t("all_countries")) + "</option>";
    countryList.forEach(function (c) {
      html +=
        '<option value="' +
        c.code.toLowerCase() +
        '">' +
        flagOf(c.code) +
        " " +
        esc(c.name) +
        "</option>";
    });
    sel.innerHTML = html;
    sel.value = state.country;
  }

  function renderLanguageOptions() {
    var sel = $("language");
    var html = '<option value="all">' + esc(t("all_languages")) + "</option>";
    langList.forEach(function (c) {
      html +=
        '<option value="' +
        c.code +
        '">' +
        esc(c.name) +
        " (" +
        c.count +
        ")</option>";
    });
    sel.innerHTML = html;
    sel.value = state.clang;
  }

  function loadCountries() {
    fetch("data/countries.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (list) {
        countryList = list;
        renderCountryOptions();
      })
      .catch(function () {
        renderCountryOptions();
      });
  }

  function loadContentLanguages() {
    fetch("data/languages.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (list) {
        langList = list;
        renderLanguageOptions();
      })
      .catch(function () {
        renderLanguageOptions();
      });
  }

  /* ---------- playlist loading ---------- */
  function playlistURL() {
    if (state.clang !== "all") return BASE + "/languages/" + state.clang + ".m3u";
    return state.country === "all"
      ? BASE + "/index.m3u"
      : BASE + "/countries/" + state.country + ".m3u";
  }

  function loadPlaylist() {
    state.loading = true;
    showLoading(true);
    $("grid").innerHTML = "";
    state.rendered = 0;

    fetch(playlistURL())
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.text();
      })
      .then(function (text) {
        state.channels = parseM3U(text);
        state.loading = false;
        buildCategories();
        applyFilters();
        showLoading(false);
      })
      .catch(function () {
        state.loading = false;
        showLoading(false);
        $("grid").innerHTML = '<div class="empty">' + t("load_error") + "</div>";
        $("count").textContent = "";
      });
  }

  function showLoading(on) {
    $("loading").style.display = on ? "flex" : "none";
  }

  /* ---------- categories ---------- */
  function buildCategories() {
    var counts = {};
    state.channels.forEach(function (ch) {
      counts[ch.g] = (counts[ch.g] || 0) + 1;
    });
    var cats = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    });
    state.category = "All";
    var bar = $("cats");
    var html = '<button class="chip active" data-cat="All">' + esc(t("cat_all")) + "</button>";
    cats.slice(0, 18).forEach(function (c) {
      html +=
        '<button class="chip" data-cat="' +
        esc(c) +
        '">' +
        esc(c) +
        " (" +
        counts[c] +
        ")</button>";
    });
    bar.innerHTML = html;
    bar.querySelectorAll(".chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        bar.querySelectorAll(".chip").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        state.category = btn.getAttribute("data-cat");
        applyFilters();
      });
    });
  }

  /* ---------- filtering + rendering ---------- */
  function applyFilters() {
    var q = state.query.trim().toLowerCase();
    var pool = state.favsOnly
      ? Object.keys(favs).map(function (k) {
          return favs[k];
        })
      : state.channels;
    state.filtered = pool.filter(function (ch) {
      if (state.category !== "All" && ch.g !== state.category) return false;
      if (q && ch.n.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    state.rendered = 0;
    $("grid").innerHTML = "";
    $("count").textContent = t("channels", state.filtered.length.toLocaleString("en-IN"));
    if (!state.filtered.length) {
      $("grid").innerHTML =
        '<div class="empty">' +
        (state.favsOnly && !Object.keys(favs).length ? t("favs_empty") : t("empty")) +
        "</div>";
      return;
    }
    renderMore();
  }

  function cardHTML(ch) {
    var isFav = !!favs[ch.u];
    var q = qualityOf(ch.n);
    var letter = esc((ch.n || "?").trim().charAt(0).toUpperCase());
    return (
      '<div class="card" data-url="' +
      esc(ch.u) +
      '">' +
      '<div class="logo"><span class="letter">' +
      letter +
      "</span>" +
      (ch.l
        ? '<img loading="lazy" src="' + esc(ch.l) + '" alt="" onerror="this.remove()">'
        : "") +
      "</div>" +
      '<div class="cname">' +
      esc(ch.n) +
      "</div>" +
      '<div class="cmeta">' +
      (q ? '<span class="q">' + esc(q) + "</span>" : "") +
      '<span class="g">' +
      esc(ch.g) +
      "</span></div>" +
      '<button class="fav' +
      (isFav ? " on" : "") +
      '" data-fav="' +
      esc(ch.u) +
      '" aria-label="favorite">★</button>' +
      '<span class="live"><i></i>LIVE</span>' +
      "</div>"
    );
  }

  function renderMore() {
    var grid = $("grid");
    var next = Math.min(state.rendered + PAGE_SIZE, state.filtered.length);
    var html = "";
    for (var i = state.rendered; i < next; i++) {
      html += cardHTML(state.filtered[i]);
    }
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
        if (favBtn) {
          e.stopPropagation();
          toggleFav(favBtn.getAttribute("data-fav"));
          return;
        }
        var url = card.getAttribute("data-url");
        var ch = null;
        for (var i = 0; i < state.filtered.length; i++) {
          if (state.filtered[i].u === url) {
            ch = state.filtered[i];
            break;
          }
        }
        if (ch) openPlayer(ch);
      });
    });
  }

  /* infinite scroll */
  var io = new IntersectionObserver(
    function (entries) {
      if (entries[0].isIntersecting && !state.loading) {
        if (state.rendered < state.filtered.length) renderMore();
      }
    },
    { rootMargin: "600px" }
  );

  /* ---------- favorites ---------- */
  function toggleFav(url) {
    var ch = favs[url] || null;
    if (!ch) {
      for (var i = 0; i < state.channels.length; i++) {
        if (state.channels[i].u === url) {
          ch = state.channels[i];
          break;
        }
      }
    }
    if (!ch) return;
    if (favs[url]) {
      delete favs[url];
    } else {
      favs[url] = { n: ch.n, l: ch.l, g: ch.g, u: ch.u };
    }
    saveFavs();
    var btns = document.querySelectorAll('[data-fav]');
    for (var j = 0; j < btns.length; j++) {
      if (btns[j].getAttribute("data-fav") === url) {
        btns[j].classList.toggle("on", !!favs[url]);
      }
    }
    if (state.favsOnly) applyFilters();
  }

  /* ---------- player ---------- */
  var hls = null;
  function openPlayer(ch) {
    $("pName").textContent = ch.n;
    $("pMeta").textContent = ch.g;
    $("pError").style.display = "none";
    $("player").classList.add("open");
    document.body.style.overflow = "hidden";

    var video = $("video");
    if (hls) {
      hls.destroy();
      hls = null;
    }
    video.removeAttribute("src");
    video.load();

    if (ch.u.indexOf("http://") === 0) {
      playerError(t("err_old_link"));
      return;
    }
    var isHls = ch.u.indexOf(".m3u8") !== -1;
    var timer = setTimeout(function () {
      if (video.readyState < 2) playerError(t("err_slow"));
    }, 20000);
    video.onplaying = function () {
      clearTimeout(timer);
    };

    try {
      if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = ch.u;
      } else if (isHls && window.Hls && window.Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(ch.u);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, function (ev, data) {
          if (data.fatal) {
            clearTimeout(timer);
            playerError(t("err_dead"));
          }
        });
      } else if (!isHls) {
        video.src = ch.u;
      } else {
        playerError(t("err_format"));
        return;
      }
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {
      playerError(t("err_dead"));
    }
  }

  function playerError(msg) {
    var box = $("pError");
    box.textContent = msg;
    box.style.display = "block";
  }

  function closePlayer() {
    $("player").classList.remove("open");
    document.body.style.overflow = "";
    var video = $("video");
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  /* ---------- wire up ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    setLang(lang);
    loadCountries();
    loadContentLanguages();
    loadPlaylist();
    io.observe($("sentinel"));

    var searchTimer = null;
    $("search").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      var v = e.target.value;
      searchTimer = setTimeout(function () {
        state.query = v;
        applyFilters();
      }, 250);
    });

    function resetFavToggle() {
      state.favsOnly = false;
      $("favToggle").classList.remove("active");
    }

    $("country").addEventListener("change", function (e) {
      state.country = e.target.value;
      state.clang = "all";
      $("language").value = "all";
      resetFavToggle();
      loadPlaylist();
    });

    $("language").addEventListener("change", function (e) {
      state.clang = e.target.value;
      state.country = "all";
      $("country").value = "all";
      resetFavToggle();
      loadPlaylist();
    });

    $("favToggle").addEventListener("click", function () {
      state.favsOnly = !state.favsOnly;
      $("favToggle").classList.toggle("active", state.favsOnly);
      applyFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("langToggle").addEventListener("click", function () {
      setLang(lang === "en" ? "hi" : "en");
    });

    $("pClose").addEventListener("click", closePlayer);
    $("player").addEventListener("click", function (e) {
      if (e.target === $("player")) closePlayer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePlayer();
    });
  });
})();
