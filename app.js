/* mw-static-generator interactive layer.
   Vanilla ES, no jQuery. Trusted-Types-safe: builds DOM only via textContent,
   classList, createElement and setAttribute (non-handler attributes) plus
   clipboard.writeText -- no HTML-string DOM sinks -- so it needs no Trusted Types
   policy and runs under the strict CSP. Every feature degrades gracefully with JS
   disabled (event handlers are attached in code, never as markup attributes). */
"use strict";
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // Single source of truth for every localStorage key this site may set. The
  // Browser Storage page enumerates THIS (no separate hardcoded list), and the
  // feature code below references the constants -- so each key name lives once.
  // (The hashed inline pre-paint script in <head> reads the theme key too; it must
  // stay in sync with LS_THEME by contract, as it runs before this file loads.)
  var LS_THEME = "theme";
  var LS_LEGAL_ACK = "legal-agreement-banner-dismissed";
  var STORAGE_KEYS = [
    { key: LS_THEME, label: "Color theme (dark / light)" },
    { key: LS_LEGAL_ACK, label: "Legal agreement banner dismissed" }
  ];

  // Graceful degradation for a drifted CSP: the hashed inline pre-paint script in
  // <head> gives flash-free theming, but if its sha256 ever mismatches the CSP the
  // browser blocks it. Re-apply the stored theme here (app.js is 'self', always
  // allowed) so dark mode still works -- only the flash-free-ness is lost, never
  // the theme or the rest of the page. Idempotent when the inline script did run.
  // Runs immediately (not deferred to DOMContentLoaded) to minimize any flash.
  function applyStoredTheme() {
    try {
      var t = localStorage.getItem(LS_THEME);
      var root = document.documentElement;
      if (t === "dark" || (!t && matchMedia("(prefers-color-scheme:dark)").matches))
        root.setAttribute("data-theme", "dark");
      else if (t === "light")
        root.setAttribute("data-theme", "light");
    } catch (err) {}
  }
  applyStoredTheme();

  // Dark-mode toggle: flips <html data-theme> and persists to localStorage.
  function initDarkMode() {
    var links = document.querySelectorAll("[data-darkmode]");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function (e) {
        e.preventDefault();
        var root = document.documentElement;
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(LS_THEME, next); } catch (err) {}
      });
    }
  }

  // Copy-to-clipboard button on each code block (raw text from data-code or text).
  function initCopyButtons() {
    var blocks = document.querySelectorAll(".code-select");
    for (var i = 0; i < blocks.length; i++) {
      (function (block) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-button";
        btn.textContent = "Copy";
        btn.addEventListener("click", function () {
          var text = block.getAttribute("data-code");
          if (text === null) text = block.textContent;
          var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1500); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () {});
          }
        });
        block.parentNode.insertBefore(btn, block);
      })(blocks[i]);
    }
  }

  // Collapsibles: a header toggles the collapsed state (rendered expanded no-JS).
  function initCollapsibles() {
    var items = document.querySelectorAll(".mw-collapsible");
    for (var i = 0; i < items.length; i++) {
      (function (item) {
        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "collapsible-toggle";
        toggle.textContent = "Toggle";
        toggle.addEventListener("click", function () {
          item.classList.toggle("mw-collapsed");
        });
        item.insertBefore(toggle, item.firstChild);
      })(items[i]);
    }
  }

  // #expandcollapseall button: expand all collapsibles if any is collapsed, else
  // collapse all. Works with initCollapsibles (which owns the .mw-collapsed class).
  function initExpandCollapseAll() {
    var btns = document.querySelectorAll(".expand-or-collapse-all-button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var items = document.querySelectorAll(".mw-collapsible");
        var anyCollapsed = false;
        for (var k = 0; k < items.length; k++) {
          if (items[k].classList.contains("mw-collapsed")) { anyCollapsed = true; break; }
        }
        for (var j = 0; j < items.length; j++) {
          items[j].classList.toggle("mw-collapsed", !anyCollapsed);
        }
      });
    }
  }

  // Tab controllers: build the mininav (one button per section, labelled by the
  // section title), default to the first tab, switch on click. No-JS shows all
  // sections (CSS only hides inactive when an .active marker exists), so this is
  // progressive enhancement. TT-safe: textContent/createElement/classList only.
  function initTabs() {
    var controllers = document.querySelectorAll(".tab-content-controller");
    for (var i = 0; i < controllers.length; i++) {
      (function (ctrl) {
        var sections = ctrl.querySelectorAll(".tcc-section");
        var nav = ctrl.querySelector(".mininav");
        if (!sections.length || !nav) return;
        var btns = [];
        function activate(idx) {
          for (var k = 0; k < sections.length; k++)
            sections[k].classList.toggle("active", k === idx);
          for (var b = 0; b < btns.length; b++)
            btns[b].classList.toggle("active", b === idx);
        }
        for (var j = 0; j < sections.length; j++) {
          var title = sections[j].querySelector(".tcc-title");
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mininav-tab";
          btn.textContent = title ? title.textContent.trim() : "Tab " + (j + 1);
          (function (idx) {
            btn.addEventListener("click", function () { activate(idx); });
          })(j);
          nav.appendChild(btn);
          btns.push(btn);
        }
        ctrl.classList.add("mininav-ready");
        // default to the server-rendered active section (#tab active=true) if any,
        // else the first -- do not clobber the intended default tab.
        var def = 0;
        for (var d = 0; d < sections.length; d++) {
          if (sections[d].classList.contains("active")) { def = d; break; }
        }
        activate(def);
      })(controllers[i]);
    }
  }

  // Back-to-top button (created dynamically; hidden until scrolled).
  function initBackToTop() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "back-to-top";
    btn.textContent = "Top";
    btn.hidden = true;
    btn.addEventListener("click", function () { window.scrollTo(0, 0); });
    document.body.appendChild(btn);
    window.addEventListener("scroll", function () {
      btn.hidden = window.scrollY < 400;
    });
  }

  // Live search over the prebuilt index (window.MWSEARCH, loaded as a script -- no
  // fetch, so it works under connect-src 'none'). No-JS users get the Browse link.
  // Index URLs are stored relative to the site root ("wiki/Foo.html"). Derive this
  // page's path-to-root from app.js's own (already per-page relativized) src, so
  // search links resolve both online (served at domain root) and offline (file://).
  function rootPrefix() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      var m = src.match(/^(.*?)app\.js$/);
      if (m) return m[1];
    }
    return "";
  }

  function initSearch() {
    var input = document.getElementById("search-input");
    if (!input || !window.MWSEARCH) return;
    var root = rootPrefix();
    var results = document.createElement("ul");
    results.className = "search-results";
    results.hidden = true;
    input.parentNode.appendChild(results);
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      while (results.firstChild) results.removeChild(results.firstChild);
      if (q.length < 2) { results.hidden = true; return; }
      var shown = 0;
      for (var i = 0; i < window.MWSEARCH.length && shown < 20; i++) {
        var e = window.MWSEARCH[i];
        if (e.t.toLowerCase().indexOf(q) === -1) continue;
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.setAttribute("href", root + e.u);
        a.textContent = e.t;
        li.appendChild(a);
        results.appendChild(li);
        shown++;
      }
      results.hidden = shown === 0;
    });
  }

  // Consent/privacy banner: shown by default (no-JS friendly); dismiss remembers
  // via localStorage (no cookies). TT-safe: hidden attribute + classList only.
  function initConsentBanner() {
    var banner = document.querySelector(".consent-banner");
    if (!banner) return;
    try {
      if (localStorage.getItem(LS_LEGAL_ACK) === "1") { banner.hidden = true; return; }
    } catch (err) {}
    var btn = banner.querySelector("[data-consent-dismiss]");
    if (btn) btn.addEventListener("click", function () {
      banner.hidden = true;
      try { localStorage.setItem(LS_LEGAL_ACK, "1"); } catch (err) {}
    });
  }

  // Browser-storage viewer (the Special:BrowserStorage page): list what this site
  // has in localStorage + a button to clear it. Built with DOM APIs only (Trusted-
  // Types safe -- createElement + textContent). No-JS visitors get the static note.
  function initStorageViewer() {
    var mount = document.querySelector("[data-storage-viewer]");
    if (!mount) return;
    function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
    function el(tag, text, cls) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function render(note) {
      clear(mount);
      // Read the actual state once.
      var present = {};
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var pk = localStorage.key(i);
          present[pk] = localStorage.getItem(pk);
        }
      } catch (err) {
        mount.appendChild(el("p", "Storage is unavailable in this browser."));
        return;
      }
      // Rows: every POTENTIAL key from the registry (shown even when not set), then
      // any unrecognized key actually present -- so nothing is hidden.
      var known = {};
      var rows = STORAGE_KEYS.map(function (k) {
        known[k.key] = true;
        return { key: k.key, label: k.label, set: (k.key in present), value: present[k.key] };
      });
      Object.keys(present).sort().forEach(function (k) {
        if (!known[k]) rows.push({ key: k, label: "(unrecognized)", set: true, value: present[k] });
      });

      var table = el("table", null, "storage-table");
      var thead = document.createElement("thead");
      var hr = document.createElement("tr");
      ["Key", "Purpose", "Current value", ""].forEach(function (h) { hr.appendChild(el("th", h)); });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = document.createElement("tbody");
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.appendChild(el("td", r.key));
        tr.appendChild(el("td", r.label));
        tr.appendChild(el("td", r.set ? r.value : "not set", r.set ? null : "storage-unset"));
        var action = document.createElement("td");
        if (r.set) {
          var del = el("button", "Delete", "storage-del");
          del.type = "button";
          (function (key) {
            del.addEventListener("click", function () {
              try { localStorage.removeItem(key); } catch (err) {}
              render("Deleted " + key + ".");
            });
          })(r.key);
          action.appendChild(del);
        }
        tr.appendChild(action);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      mount.appendChild(table);

      var delAll = el("button", "Delete all stored data", "storage-clear");
      delAll.type = "button";
      delAll.addEventListener("click", function () {
        try { localStorage.clear(); } catch (err) {}
        render("All stored data deleted.");
      });
      mount.appendChild(delAll);
      if (note) mount.appendChild(el("p", note, "storage-cleared"));
    }
    render(null);
  }

  ready(function () {
    initDarkMode();
    initCopyButtons();
    initCollapsibles();
    initExpandCollapseAll();
    initTabs();
    initBackToTop();
    initSearch();
    initConsentBanner();
    initStorageViewer();
  });
})();
