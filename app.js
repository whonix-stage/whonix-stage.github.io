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
  var LS_SITENOTICE = "sitenotice-dismissed";
  var LS_FLYIN = "flyin-last-dismissed";
  var STORAGE_KEYS = [
    { key: LS_THEME, label: "Color theme (dark / light)" },
    { key: LS_LEGAL_ACK, label: "Legal agreement banner dismissed" },
    { key: LS_SITENOTICE, label: "Site-notice banner dismissed (stores the banner id)" },
    { key: LS_FLYIN, label: "Fly-in donate toast last-dismissed timestamp" }
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
  // Index URLs are stored relative to the site root ("wiki/Foo/"). Derive this
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

  // Top site-notice banner: shown by default (no-JS friendly); dismiss stores the
  // banner's id in localStorage, so a NEW id re-shows to everyone. TT-safe (hidden
  // attribute only).
  function initSitenotice() {
    var wrap = document.getElementById("siteNotice");
    if (!wrap) return;
    var banner = wrap.querySelector(".sitenotice-banner[data-banner-id]");
    if (!banner) return;
    var id = banner.getAttribute("data-banner-id") || "";
    try {
      if (localStorage.getItem(LS_SITENOTICE) === id) { wrap.hidden = true; return; }
    } catch (err) {}
    var btn = wrap.querySelector("[data-sitenotice-dismiss]");
    if (btn) btn.addEventListener("click", function () {
      wrap.hidden = true;
      try { localStorage.setItem(LS_SITENOTICE, id); } catch (err) {}
    });
  }

  // Fly-in donate toast: a JS-only gadget (hidden by default). Show it after a
  // delay unless it was dismissed within the last N days; the close button stores
  // the dismissal timestamp. TT-safe (hidden attribute only).
  function initFlyin() {
    var panel = document.getElementById("fly-in-notification-panel");
    if (!panel) return;
    var DAY = 86400000, dismissDays = 7, waitMs = 120000;
    try {
      var last = parseInt(localStorage.getItem(LS_FLYIN) || "0", 10);
      if (last && (Date.now() - last) < dismissDays * DAY) return;
    } catch (err) {}
    var timer = setTimeout(function () { panel.hidden = false; }, waitMs);
    function close() {
      clearTimeout(timer);
      panel.hidden = true;
      try { localStorage.setItem(LS_FLYIN, String(Date.now())); } catch (err) {}
    }
    var btn = panel.querySelector(".close-panel");
    if (btn) {
      btn.addEventListener("click", close);
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); close(); }
      });
    }
  }

  // Generic modal (MiniModal): a .mini-modal element toggled active; closed by its
  // .mm-close button, the .underlay, or Escape. Body scroll is locked while open.
  // TT-safe (classList + hidden only). Returns { open, close } for other features.
  function initModals() {
    var active = null;
    function close() {
      if (!active) return;
      active.modal.classList.remove("active");
      active.modal.hidden = true;
      document.body.classList.remove("mini-modal-active");
      var cb = active.onClose;
      active = null;
      if (cb) cb();
    }
    function open(modal, onClose) {
      if (!modal) return;
      if (active) close();  // one modal at a time: run the previous onClose (stops its timer)
      modal.hidden = false;
      modal.classList.add("active");
      document.body.classList.add("mini-modal-active");
      active = { modal: modal, onClose: onClose };
      var c = modal.querySelector(".mm-close");
      if (c) c.focus();
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    document.addEventListener("click", function (e) {
      if (!active) return;
      if (e.target.classList.contains("underlay") || (e.target.closest && e.target.closest(".mm-close"))) {
        close();
      }
    });
    var triggers = document.querySelectorAll("[data-modal-open]");
    for (var i = 0; i < triggers.length; i++) {
      (function (t) {
        t.addEventListener("click", function (e) {
          e.preventDefault();
          open(document.getElementById(t.getAttribute("data-modal-open")));
        });
      })(triggers[i]);
    }
    return { open: open, close: close };
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Download-button modal: a download button marked .dlbtn-modal opens a donation
  // appeal + a countdown, then proceeds to the file. No fetch (CSP connect-src
  // 'none') and no inline crypto panel (its images are article-only); donate links
  // go to /wiki/Donate. TT-safe DOM (createElement + textContent), no string sinks.
  function initDownloadModal(modals) {
    var btns = document.querySelectorAll("a.download-button-v2.dlbtn-modal[href]");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function (e) {
          var href = btn.getAttribute("href");
          if (!href) return;
          e.preventDefault();
          var modal = el("div", "mini-modal download-button-modal");
          modal.id = "download-button-modal";
          modal.setAttribute("role", "dialog");
          modal.setAttribute("aria-modal", "true");
          modal.hidden = true;
          modal.appendChild(el("div", "underlay"));
          var closeBtn = el("button", "mm-close");
          closeBtn.type = "button";
          closeBtn.setAttribute("aria-label", "Close");
          closeBtn.appendChild(el("i", "fa-solid fa-xmark"));
          modal.appendChild(closeBtn);
          var content = el("div", "content");
          content.appendChild(el("p", "donation-appeal",
            "We provide our software for free. To keep improving it we rely on "
            + "donations -- if you find it valuable, please consider contributing."));
          var donate = el("a", "eoy-donate-button", "Donate (crypto, PayPal or other)");
          donate.setAttribute("href", "/wiki/Donate");
          donate.setAttribute("target", "_blank");
          donate.setAttribute("rel", "noopener");
          content.appendChild(donate);
          var status = el("p", "dl-status");
          status.appendChild(document.createTextNode("Your download starts in "));
          var count = el("span", "dl-count", "5");
          status.appendChild(count);
          status.appendChild(document.createTextNode(" seconds, or "));
          var proceed = el("a", "dl-proceed", "download now");
          proceed.setAttribute("href", href);
          proceed.setAttribute("rel", "noreferrer");
          status.appendChild(proceed);
          status.appendChild(document.createTextNode("."));
          content.appendChild(status);
          modal.appendChild(content);
          document.body.appendChild(modal);
          var seconds = 5;
          var timer = setInterval(function () {
            seconds -= 1;
            count.textContent = String(seconds);
            // Navigate by CLICKING the proceed anchor so its rel="noreferrer" is
            // honored (window.location.href would leak the Referer -- an onion origin
            // among them -- which the explicit "download now" link deliberately does not).
            if (seconds <= 0) { clearInterval(timer); proceed.click(); }
          }, 1000);
          modals.open(modal, function () { clearInterval(timer); modal.remove(); });
        });
      })(btns[i]);
    }
  }

  // Table-expand: give each captioned content table an "Expand table" button that
  // opens a clone of the table in the modal (a wide table is easier to read
  // full-screen). TT-safe: cloneNode + DOM APIs, ids stripped from the clone to
  // avoid duplicates. No-JS visitors keep the inline (scrollable) table.
  function initTableExpand(modals) {
    var tables = document.querySelectorAll(
      ".wiki-content table:not(.toc):not(.storage-table)");
    for (var i = 0; i < tables.length; i++) {
      (function (table) {
        var caption = table.querySelector(":scope > caption");
        if (!caption) return;
        var btn = el("button", "expand-table-button");
        btn.type = "button";
        btn.appendChild(el("i", "fa-solid fa-expand"));
        btn.appendChild(document.createTextNode(" Expand table"));
        caption.insertBefore(btn, caption.firstChild);
        btn.addEventListener("click", function () {
          var modal = el("div", "mini-modal table-expand-modal");
          modal.setAttribute("role", "dialog");
          modal.setAttribute("aria-modal", "true");
          modal.hidden = true;
          modal.appendChild(el("div", "underlay"));
          var closeBtn = el("button", "mm-close");
          closeBtn.type = "button";
          closeBtn.setAttribute("aria-label", "Close");
          closeBtn.appendChild(el("i", "fa-solid fa-xmark"));
          modal.appendChild(closeBtn);
          var content = el("div", "content");
          var wrap = el("div", "table-wrapper");
          var clone = table.cloneNode(true);
          var withId = clone.querySelectorAll("[id]");
          for (var k = 0; k < withId.length; k++) withId[k].removeAttribute("id");
          var cb = clone.querySelector(".expand-table-button");
          if (cb) cb.remove();
          wrap.appendChild(clone);
          content.appendChild(wrap);
          modal.appendChild(content);
          document.body.appendChild(modal);
          modals.open(modal, function () { modal.remove(); });
        });
      })(tables[i]);
    }
  }

  // Hovercards (the job of the old MediaWiki Popups): (1) reference previews --
  // hover a [n] citation to see the footnote; (2) page previews -- hover an internal
  // link to see the target's title + summary from a prebuilt index (window.MWPREVIEWS;
  // CSP connect-src 'none' forbids an on-hover fetch). JS-only enhancement; native
  // title= tooltips still work with JS off. TT-safe DOM; positioned via el.style
  // (CSSOM, not an inline style= attribute, so allowed under style-src 'self').
  function initHovercards() {
    var content = document.querySelector(".wiki-content");
    if (!content) return;
    var card = null, hideTimer = null, showTimer = null;
    function ensure() {
      if (card) return card;
      card = el("div", "hovercard");
      card.hidden = true;
      card.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
      card.addEventListener("mouseleave", hideSoon);
      document.body.appendChild(card);
      return card;
    }
    function hideSoon() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { if (card) card.hidden = true; }, 200);
    }
    function place(anchor) {
      var r = anchor.getBoundingClientRect();
      var top = r.bottom + window.scrollY + 6;
      var left = Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - 340));
      card.style.top = top + "px";
      card.style.left = left + "px";
    }
    function fill(nodes) {
      var c = ensure();
      while (c.firstChild) c.removeChild(c.firstChild);
      for (var i = 0; i < nodes.length; i++) c.appendChild(nodes[i]);
    }
    function refNodes(a) {
      var id = (a.getAttribute("href") || "").replace(/^#/, "");
      if (!id) return null;
      var li = document.getElementById(id);
      if (!li) return null;
      var out = [];
      var kids = li.cloneNode(true).childNodes;
      for (var i = 0; i < kids.length; i++) {
        // drop the back-link caret pandoc/ref adds; keep the footnote text
        if (kids[i].nodeType === 1 && kids[i].classList && kids[i].classList.contains("mw-cite-backlink")) continue;
        out.push(kids[i]);
      }
      var box = el("div", "hovercard-ref");
      for (var j = 0; j < out.length; j++) box.appendChild(out[j]);
      return [box];
    }
    function pageNodes(a) {
      var idx = window.MWPREVIEWS;
      if (!idx) return null;
      var href = a.getAttribute("href") || "";
      // Only internal (relative) links have previews -- skip absolute/scheme and
      // protocol-relative links so an EXTERNAL url whose path happens to match an
      // index key never shows a spoofed card.
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.indexOf("//") === 0) return null;
      // Key is ROOT-RELATIVE ("wiki/Foo/", the MWPREVIEWS key form). Resolve the
      // anchor against the site root computed from rootPrefix() -- the same path-to-
      // root the search box uses -- so it matches online AND offline via file://
      // (new URL(a.href).pathname would be the full filesystem path under file://).
      var key;
      try {
        var rootUrl = new URL(rootPrefix(), document.baseURI).href;
        var anchorUrl = new URL(a.href).href;
        if (anchorUrl.indexOf(rootUrl) !== 0) return null;  // outside the output tree
        key = decodeURI(anchorUrl.slice(rootUrl.length).split("#")[0]);
      } catch (e) { return null; }
      var p = idx[key];
      if (!p || !p.d) return null;  // only pages with a summary
      var box = el("div", "hovercard-page");
      box.appendChild(el("div", "hovercard-title", p.t || key));
      box.appendChild(el("p", "hovercard-extract", p.d));
      return [box];
    }
    function onEnter(e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a || !content.contains(a)) return;
      var nodes = null;
      if (a.closest("sup.reference")) nodes = refNodes(a);
      else if (a.getAttribute("href") && a.getAttribute("href").indexOf("#") !== 0) nodes = pageNodes(a);
      if (!nodes) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(function () {
        fill(nodes);
        card.hidden = false;
        place(a);
      }, 200);
    }
    content.addEventListener("mouseover", onEnter);
    content.addEventListener("mouseout", function () { clearTimeout(showTimer); hideSoon(); });
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
    initSitenotice();
    initFlyin();
    var modals = initModals();
    initDownloadModal(modals);
    initTableExpand(modals);
    initHovercards();
    initStorageViewer();
  });
})();
