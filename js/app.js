/* Guia Librelato — Visão de Negócio
   Paginated interactive deck. Renders data/content.json and wires up navigation + widgets. */

(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  let slides = [];   // { el, group, kind, wire() }
  let current = 0;
  let ui = {};       // reusable interaction strings, from data.ui

  fetch("data/content.json")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      document.title = data.meta.siteTitle;
      ui = data.ui || {};
      buildDeck(data);
      buildToc(data);
      buildDotRail(data);
      applyStagger();
      wireNav();
      wireKeyboard();
      wireMobileNav();
      wireScrollGate();
      setupObserver();
      setupTapHint();
      updateUI(0);
    })
    .catch((err) => {
      console.error("Falha ao carregar data/content.json", err);
      $("#deck").innerHTML =
        '<div style="padding:80px 6vw;font-family:sans-serif;max-width:640px">' +
        "<h1>Não foi possível carregar o conteúdo</h1>" +
        "<p>Este site lê o arquivo <code>data/content.json</code> via <code>fetch()</code>. " +
        "Se você abriu o arquivo <code>index.html</code> diretamente (protocolo <code>file://</code>), " +
        "o navegador bloqueia essa leitura por segurança.</p>" +
        "<p>Rode um servidor local na pasta do projeto, por exemplo:</p>" +
        "<pre>python3 -m http.server 8080</pre>" +
        "<p>e acesse <code>http://localhost:8080</code>.</p>" +
        "</div>";
    });

  // ---------------------------------------------------------------
  // Deck assembly
  // ---------------------------------------------------------------
  function buildDeck(data) {
    const deck = $("#deck");

    // Hero slide
    const heroEl = el(`<section class="slide hero" id="slide-0" data-kind="hero"></section>`);
    heroEl.innerHTML = renderHero(data.hero);
    deck.appendChild(heroEl);
    slides.push({ el: heroEl, group: 0, title: "Início", kind: "hero" });

    // Chapter pages
    data.pages.forEach((page, i) => {
      const idx = slides.length;
      const alt = idx % 2 === 0 ? "" : " alt";
      const pageEl = el(`<section class="slide${alt}" id="slide-${idx}" data-kind="chapter" data-group="${page.group}"></section>`);
      pageEl.innerHTML = renderPage(page);
      deck.appendChild(pageEl);
      slides.push({
        el: pageEl, group: page.group, title: page.title, part: page.part,
        kind: "chapter", type: page.type, data: page,
        gate: !!page.gate, satisfied: !page.gate
      });
    });

    // Closing slide
    const closeIdx = slides.length;
    const closingEl = el(`<section class="slide closing" id="slide-${closeIdx}" data-kind="closing"></section>`);
    closingEl.innerHTML = renderClosing(data.closing, data.meta);
    deck.appendChild(closingEl);
    slides.push({ el: closingEl, group: 999, title: "Fim", kind: "closing" });

    // Wire interactivity per slide now that DOM exists
    data.pages.forEach((page) => {
      const s = slides.find((sl) => sl.kind === "chapter" && sl.data === page);
      wirePage(s.el, page);
    });
  }

  function firstSlideIndexOfGroup(group) {
    return slides.findIndex((s) => s.group === group);
  }

  // ---------------------------------------------------------------
  // Sidebar TOC (topic-level)
  // ---------------------------------------------------------------
  function buildToc(data) {
    const list = $("#tocList");
    data.toc.forEach((item) => {
      const idx = firstSlideIndexOfGroup(item.group);
      const li = el(`<li><a href="#" data-jump-index="${idx}" data-group="${item.group}">
        <span class="n">${String(item.group).padStart(2, "0")}</span>
        <span>${esc(item.title)}</span>
      </a></li>`);
      list.appendChild(li);
    });
  }

  // ---------------------------------------------------------------
  // Dot rail (page-level, fine grained)
  // ---------------------------------------------------------------
  function buildDotRail(data) {
    const rail = $("#dotRail");
    let prevGroup = null;
    slides.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.dataset.index = i;
      let label = s.title || "";
      if (s.kind === "chapter" && s.part) label += " " + s.part;
      btn.dataset.label = label;
      if (prevGroup !== null && s.group !== prevGroup) {
        btn.style.marginTop = "10px";
      }
      prevGroup = s.group;
      btn.addEventListener("click", () => goToIndex(i));
      rail.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  function goToIndex(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i > current && isGateBlocking()) {
      showToast(ui.gateToast || "Marque todos os itens obrigatórios antes de continuar.");
      return;
    }
    slides[i].el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function isGateBlocking() {
    const cur = slides[current];
    return !!(cur && cur.gate && !cur.satisfied);
  }

  let toastTimer = null;
  function showToast(message) {
    let toast = $("#toast");
    if (!toast) {
      toast = el(`<div id="toast" class="toast"></div>`);
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function wireScrollGate() {
    const deck = $("#deck");
    deck.addEventListener("wheel", (e) => {
      if (e.deltaY > 0 && isGateBlocking()) {
        e.preventDefault();
        showToast(ui.gateToast || "Marque todos os itens obrigatórios antes de continuar.");
      }
    }, { passive: false });

    let touchStartY = null;
    deck.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    deck.addEventListener("touchmove", (e) => {
      if (touchStartY === null) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > 0 && isGateBlocking()) {
        e.preventDefault();
        showToast(ui.gateToast || "Marque todos os itens obrigatórios antes de continuar.");
      }
    }, { passive: false });
  }

  function wireNav() {
    $("#prevBtn").addEventListener("click", () => goToIndex(current - 1));
    $("#nextBtn").addEventListener("click", () => goToIndex(current + 1));
    $$(".toc-list a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        goToIndex(parseInt(a.dataset.jumpIndex, 10));
      });
    });
  }

  function wireKeyboard() {
    window.addEventListener("keydown", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goToIndex(current + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goToIndex(current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToIndex(slides.length - 1);
      }
    });
  }

  function wireMobileNav() {
    const toggle = $("#navToggle");
    const toc = $("#toc");
    const backdrop = $("#tocBackdrop");
    function closeToc() {
      toc.classList.remove("open");
      backdrop.classList.remove("show");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", () => {
      const open = toc.classList.toggle("open");
      backdrop.classList.toggle("show", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    backdrop.addEventListener("click", closeToc);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeToc();
    });
    $$(".toc-list a, .toc-restart").forEach((a) => {
      a.addEventListener("click", closeToc);
    });
  }

  // ---------------------------------------------------------------
  // Staggered reveal delays: computed per-child so any number of items
  // (e.g. the 12-item portfolio grid) animates strictly first-to-last.
  // ---------------------------------------------------------------
  function applyStagger() {
    $$(".stagger").forEach((container) => {
      Array.from(container.children).forEach((child, i) => {
        child.style.transitionDelay = Math.min(i * 0.06, 0.6) + "s";
      });
    });
  }

  // ---------------------------------------------------------------
  // Active-slide observer: drives UI state + replayable animations
  // ---------------------------------------------------------------
  function setupObserver() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = slides.findIndex((s) => s.el === entry.target);
          if (idx === -1) return;
          if (entry.isIntersecting) {
            slides[idx].el.classList.add("is-active");
            current = idx;
            updateUI(idx);
            onSlideActivate(slides[idx]);
          } else {
            slides[idx].el.classList.remove("is-active");
          }
        });
      },
      { root: $("#deck"), threshold: 0.55 }
    );
    slides.forEach((s) => io.observe(s.el));
  }

  function updateUI(idx) {
    const total = slides.length;
    $("#progressFill").style.width = (idx / (total - 1)) * 100 + "%";
    $("#pageCounter").textContent = String(idx + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    $("#prevBtn").disabled = idx === 0;
    $("#nextBtn").disabled = idx === total - 1;

    $$(".dot-rail button").forEach((b, i) => b.classList.toggle("active", i === idx));

    const activeGroup = slides[idx].group;
    $$(".toc-list a").forEach((a) => a.classList.toggle("active", parseInt(a.dataset.group, 10) === activeGroup));
  }

  function onSlideActivate(slide) {
    if (slide.type === "market") replayStatCount(slide.el);
  }

  // ---------------------------------------------------------------
  // Hero & Closing
  // ---------------------------------------------------------------
  function renderHero(h) {
    return `
      <div class="hero-flex">
        <div class="hero-inner">
          <h1 class="hero-title anim">${esc(h.title)}</h1>
          <p class="hero-subtitle anim anim-d1">${esc(h.subtitle)}</p>
          <a class="hero-cta anim anim-d2" href="#" data-jump-index="1">${esc(h.cta)} →</a>
        </div>
        <div class="hero-photo anim anim-d1"><img src="${esc(h.image)}" alt="Implementos Librelato" loading="lazy" /></div>
      </div>
      <div class="hero-scroll anim anim-d3"><span class="dot"></span> ${esc(h.scrollHint)}</div>
    `;
  }

  function renderClosing(c, meta) {
    return `
      <img class="logo anim" src="${esc(meta.logo)}" alt="Librelato" />
      <p class="quote anim anim-d1">“${esc(c.quote)}”</p>
      <a class="back-cta anim anim-d2" href="#" data-jump="first">${esc(c.cta)}</a>
    `;
  }

  // ---------------------------------------------------------------
  // Page dispatch
  // ---------------------------------------------------------------
  const renderers = {
    intro: renderIntro,
    "cavalo-carroca": renderCavaloCarroca,
    backpack: renderBackpack,
    "portfolio-grid": renderPortfolioGrid,
    "portfolio-table": renderPortfolioTable,
    market: renderMarket,
    differentials: renderDifferentials,
    "pinos-calc": renderPinosCalc,
    "pinos-rodotrem": renderPinosRodotrem,
    glossary: renderGlossary,
    checklist: renderChecklist,
    "network-map": renderNetworkMap,
    "network-roles": renderNetworkRoles,
    journey: renderJourney,
    "association-entities": renderAssociationEntities,
    "association-standards": renderAssociationStandards
  };

  const wirers = {
    backpack: wireBackpack,
    "portfolio-grid": wirePortfolioGrid,
    "portfolio-table": wirePortfolioTable,
    market: wireMarket,
    differentials: wireDifferentials,
    "pinos-calc": wirePinosCalc,
    "pinos-rodotrem": wirePinosRodotrem,
    glossary: wireGlossary,
    checklist: wireChecklist,
    "network-map": wireNetworkMap,
    journey: wireJourney
  };

  function renderPage(p) {
    const fn = renderers[p.type];
    return `<div class="slide-inner">` + slideHead(p) + (fn ? fn(p) : "") + `</div>`;
  }

  function wirePage(el, p) {
    const fn = wirers[p.type];
    if (fn) fn(el, p);
  }

  function slideHead(p) {
    return `
      <div class="slide-head anim">
        <div class="slide-kicker">${esc(p.kicker)}${p.part ? `<span class="slide-part">· ${esc(p.part)}</span>` : ""}</div>
        <h2 class="slide-title">${esc(p.title)}</h2>
        ${p.subtitle ? `<p class="slide-subtitle">${esc(p.subtitle)}</p>` : ""}
      </div>
    `;
  }

  // ---------- intro ----------
  function renderIntro(p) {
    return `
      <div class="intro-split anim anim-d1">
        <div>
          <p class="lead">${esc(p.lead)}</p>
          ${p.body.map(t => `<p class="copy">${esc(t)}</p>`).join("")}
          <div class="tag-row">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
        <div class="intro-media"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || "")}" loading="lazy" /></div>
      </div>
    `;
  }

  // ---------- cavalo-carroca ----------
  function renderCavaloCarroca(p) {
    const [tracao, carga] = p.pair;
    return `
      <p class="copy anim anim-d1" style="margin-bottom:14px;">${esc(p.intro)}</p>
      <div class="cc-analogy-label anim anim-d2">${esc(p.analogyLabel)}</div>
      <div class="cc-analogy anim anim-d2">“${esc(p.analogy)}”</div>
      <div class="cc-pair stagger">
        <div class="cc-card tracao">
          <div class="cc-img"><img src="${esc(tracao.image)}" alt="${esc(tracao.label)}" loading="lazy" /></div>
          ${tracao.sub ? `<span class="sub">${esc(tracao.sub)}</span>` : ""}
          <h3>${esc(tracao.label)}</h3>
          <p>${esc(tracao.desc)}</p>
        </div>
        <div class="cc-card carga">
          <div class="cc-img"><img src="${esc(carga.image)}" alt="${esc(carga.label)}" loading="lazy" /></div>
          ${carga.sub ? `<span class="sub">${esc(carga.sub)}</span>` : ""}
          <h3>${esc(carga.label)}</h3>
          <p>${esc(carga.desc)}</p>
        </div>
      </div>
      <div class="cc-note anim anim-d3">${esc(p.note)}</div>
    `;
  }

  // ---------- backpack ----------
  function renderBackpack(p) {
    return `
      <div class="switch-panel anim anim-d1">
        <p class="switch-intro">${esc(p.intro)}</p>
        <div class="switch-tabs" role="tablist">
          ${p.options.map((o, i) => `
            <button class="switch-tab${i === 0 ? " active" : ""}" data-idx="${i}" role="tab">
              <span class="ico">${o.icon}</span> ${esc(o.cargo)}
            </button>`).join("")}
        </div>
        <div class="switch-display" id="backpackDisplay"></div>
      </div>
    `;
  }
  function wireBackpack(section, p) {
    const tabs = $$(".switch-tab", section);
    const display = $("#backpackDisplay", section);
    function show(i) {
      const o = p.options[i];
      display.classList.remove("swap");
      void display.offsetWidth;
      display.classList.add("swap");
      display.innerHTML = `
        ${o.image ? `<div class="switch-display-media"><img src="${esc(o.image)}" alt="${esc(o.implement)}" loading="lazy" /></div>` : `<div class="big-ico">${o.icon}</div>`}
        <div>
          <div class="headline">${esc(o.implement)}</div>
          <div class="desc">${esc(o.desc)}</div>
        </div>`;
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        show(i);
      });
    });
    show(0);
  }

  // ---------- portfolio-grid ----------
  function renderPortfolioGrid(p) {
    return `
      <p class="copy anim anim-d1" style="margin-bottom:16px;">${esc(p.intro)}</p>
      <div class="type-grid stagger">
        ${p.types.map(t => `
          <div class="type-card">
            <div class="type-card-img"><img src="${esc(t.image)}" alt="${esc(t.label)}" loading="lazy" /></div>
            <div class="type-card-label">${esc(t.label)}</div>
          </div>`).join("")}
      </div>
    `;
  }
  function wirePortfolioGrid() {}

  // ---------- portfolio-table (interactive tab switcher) ----------
  function renderPortfolioTable(p) {
    return `
      <div class="switch-panel anim anim-d1">
        <p class="switch-intro">${esc(p.intro)}</p>
        <div class="switch-tabs" role="tablist">
          ${p.table.map((row, i) => `
            <button class="switch-tab${i === 0 ? " active" : ""}" data-idx="${i}" role="tab">
              <span class="ico">${row.icon}</span> ${esc(row.cargo)}
            </button>`).join("")}
        </div>
        <div class="switch-display" id="portfolioDisplay"></div>
      </div>
    `;
  }
  function wirePortfolioTable(section, p) {
    const tabs = $$(".switch-tab", section);
    const display = $("#portfolioDisplay", section);
    function show(i) {
      const row = p.table[i];
      display.classList.remove("swap");
      void display.offsetWidth;
      display.classList.add("swap");
      display.innerHTML = `
        ${row.image ? `<div class="switch-display-media"><img src="${esc(row.image)}" alt="${esc(row.implemento)}" loading="lazy" /></div>` : `<div class="big-ico">${row.icon}</div>`}
        <div>
          <div class="headline">${esc(row.implemento)}</div>
          <div class="desc">${esc(row.exemplo)}</div>
          <span class="tagline">${esc(row.cargo)}</span>
        </div>`;
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        show(i);
      });
    });
    show(0);
  }

  // ---------- market ----------
  function renderMarket(p) {
    return `
      <div class="market-top anim anim-d1">
        <div class="market-stat">
          <div class="value" data-count="${p.stat.value}">0</div>
          <div class="label">${esc(p.stat.label)}</div>
        </div>
        <div class="market-lead">
          <p class="lead" style="margin-bottom:6px;">${esc(p.lead)}</p>
          <p class="copy">${esc(p.body)}</p>
        </div>
      </div>
      <div class="player-grid stagger">
        ${p.players.map(pl => `
          <div class="player-card">
            <div class="player-flip">
              <div class="player-face player-front">
                <img src="${esc(pl.logo)}" alt="${esc(pl.name)}" loading="lazy" />
                <span class="hint">${esc(ui.marketFlipHint)}</span>
              </div>
              <div class="player-face player-back" style="--accent:${esc(pl.accent)}">
                <div class="name">${esc(pl.name)}</div>
                <div class="trait">${esc(pl.trait)}</div>
              </div>
            </div>
          </div>`).join("")}
      </div>
      <p class="market-footer anim anim-d3">${esc(p.footer)}</p>
    `;
  }
  function wireMarket(section) {
    $$(".player-card", section).forEach(card => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
    });
  }
  function replayStatCount(section) {
    const node = $(".market-stat .value[data-count]", section);
    if (!node) return;
    const target = parseInt(node.dataset.count, 10);
    if (Number.isNaN(target)) return;
    const dur = 1100;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- differentials ----------
  function renderDifferentials(p) {
    return `
      <div class="diff-grid stagger">
        ${p.cards.map(c => `
          <div class="diff-card${c.points.length ? "" : " no-points"}">
            <div class="n">${esc(c.n)}</div>
            <h3>${esc(c.title)}</h3>
            <p class="desc">${esc(c.desc)}</p>
            ${c.points.length ? `
              <span class="toggle-hint">ver detalhes</span>
              <ul class="diff-points">${c.points.map(pt => `<li>${esc(pt)}</li>`).join("")}</ul>
            ` : ""}
          </div>`).join("")}
      </div>
    `;
  }
  function wireDifferentials(section) {
    $$(".diff-card", section).forEach(card => {
      if (!card.classList.contains("no-points")) {
        card.addEventListener("click", () => card.classList.toggle("open"));
      }
    });
  }

  // ---------- pinos-calc ----------
  function renderPinosCalc(p) {
    return `
      <div class="pinos-layout anim anim-d1">
        <div>
          <p class="copy">${esc(p.intro)}</p>
          <div class="pinos-rule">${esc(p.rule)}</div>
        </div>
        <div class="pinos-media"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || "")}" loading="lazy" /></div>
      </div>
      <div class="comp-selector anim anim-d2">
        ${p.compositions.map((c, i) => `
          <button class="comp-btn${i === 0 ? " active" : ""}" data-idx="${i}">${esc(c.name)}</button>
        `).join("")}
      </div>
      <div class="pin-display anim anim-d3" id="pinDisplay"></div>
      <p class="copy pinos-footnote anim anim-d3">${esc(p.footnote)}</p>
    `;
  }
  function wirePinosCalc(section, p) {
    const buttons = $$(".comp-btn", section);
    const display = $("#pinDisplay", section);
    function show(i) {
      const c = p.compositions[i];
      let dots = "";
      for (let k = 1; k <= c.pinos; k++) {
        if (k > 1) dots += `<div class="pin-link"></div>`;
        dots += `<div class="pin-dot" style="animation-delay:${(k - 1) * .12}s">${k}</div>`;
      }
      display.innerHTML = `
        <div class="comp-name">${esc(c.name)}</div>
        <div class="comp-note">${esc(c.note)}</div>
        <div class="pin-row">${dots}</div>
        <div class="pin-count">${c.pinos}<span>pino${c.pinos > 1 ? "s" : ""}</span></div>
      `;
    }
    buttons.forEach((b, i) => {
      b.addEventListener("click", () => {
        buttons.forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        show(i);
      });
    });
    show(0);
  }

  // ---------- pinos-rodotrem ----------
  function renderPinosRodotrem(p) {
    const r = p.rodotrem;
    return `
      <div class="rodotrem-panel anim anim-d1">
        <div>
          <div class="rk">${esc(r.kicker)}</div>
          <p class="intro">${esc(r.intro)}</p>
          <div class="pin-steps" id="pinSteps">
            ${r.pins.map((pin, i) => `
              <div class="pin-step${i === 0 ? " active" : ""}" data-idx="${i}">
                <div class="num">${pin.n}</div>
                <div class="label">${esc(pin.label)}</div>
              </div>`).join("")}
          </div>
          ${r.rulesTitle ? `<div class="rules-title">${esc(r.rulesTitle)}</div>` : ""}
          <div class="rodotrem-rules">
            ${r.rules.map(rule => `
              <div class="rule-item">
                <span class="rule-label">${esc(rule.label)}</span>
                <p class="rule-desc">${esc(rule.desc)}</p>
              </div>`).join("")}
          </div>
        </div>
        <div class="rodotrem-media">
          <img id="rodotremImg" src="${esc(r.image)}" alt="${esc(r.imageAlt || "")}" loading="lazy" />
        </div>
      </div>
    `;
  }
  function wirePinosRodotrem(section, p) {
    const steps = $$(".pin-step", section);
    const img = $("#rodotremImg", section);
    steps.forEach((step, i) => {
      step.addEventListener("click", () => {
        steps.forEach(x => x.classList.remove("active"));
        step.classList.add("active");
        const pin = p.rodotrem.pins[i];
        if (pin.image) {
          img.style.opacity = "0";
          setTimeout(() => {
            img.src = pin.image;
            img.alt = pin.imageAlt || "";
            img.style.opacity = "1";
          }, 150);
        }
      });
    });
  }

  // ---------- glossary ----------
  function renderGlossary(p) {
    return `
      <div class="glossary-grid stagger">
        ${p.terms.map(t => `
          <div class="term-card">
            <div class="term-flip">
              <div class="term-face term-front">
                <div class="term-img"><img src="${esc(t.image)}" alt="${esc(t.term)}" loading="lazy" /></div>
                <div class="term-body">
                  <div class="term-body-top">
                    <div class="term">${esc(t.term)}</div>
                    <span class="flip-hint">${esc(ui.glossaryFlipHint)}</span>
                  </div>
                  <div class="full">${esc(t.full)}</div>
                </div>
              </div>
              <div class="term-face term-back">
                <div class="term-mini">${esc(t.term)}</div>
                <p>${esc(t.def)}</p>
              </div>
            </div>
          </div>`).join("")}
      </div>
    `;
  }
  function wireGlossary(section) {
    $$(".term-card", section).forEach(card => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
    });
  }

  // ---------- checklist ----------
  function renderChecklist(p) {
    return `
      <span class="checklist-note anim anim-d1">${esc(p.note)}</span>
      <div class="check-grid stagger">
        ${p.items.map(item => `
          <div class="check-item">
            <span class="box">✓</span>
            <div class="check-icon">${item.icon}</div>
            <div class="check-label">${esc(item.label)}</div>
          </div>`).join("")}
      </div>
    `;
  }
  function wireChecklist(section, p) {
    const items = $$(".check-item", section);
    const slide = slides.find((s) => s.el === section);
    function updateGate() {
      if (!slide) return;
      slide.satisfied = items.every((it) => it.classList.contains("checked"));
    }
    items.forEach((item) => {
      item.addEventListener("click", () => {
        item.classList.toggle("checked");
        updateGate();
      });
    });
    updateGate();
  }

  // ---------- network-map ----------
  function renderNetworkMap(p) {
    return `
      <p class="lead anim anim-d1">${esc(p.lead)}</p>
      <div class="map-layout anim anim-d2">
        <div class="map-stage">
          <img src="${esc(p.mapBase)}" alt="Mapa do Brasil com a rede Librelato" loading="lazy" />
          ${p.legend.map(l => `<img class="map-overlay${l.active ? " on" : ""}" data-key="${l.key}" src="${esc(l.image)}" alt="${esc(l.label)}" loading="lazy" />`).join("")}
        </div>
        <div>
          <div class="map-legend" id="mapLegend">
            ${p.legend.map(l => `
              <button class="legend-chip" data-key="${l.key}">
                <span class="swatch" style="background:${esc(l.color)}"></span>
                ${esc(l.label)}
                ${l.count ? `<span class="count">${esc(l.count)}</span>` : ""}
              </button>`).join("")}
          </div>
          <div class="intl-box">
            <div class="intl-label">${esc(p.international.label)}</div>
            <div class="intl-chips">
              ${p.international.countries.map(c => `<span class="intl-chip">${c.count ? `<b>${esc(c.count)}</b>` : ""}${esc(c.name)}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  function wireNetworkMap(section) {
    $$(".legend-chip", section).forEach(chip => {
      chip.addEventListener("click", () => {
        const key = chip.dataset.key;
        const overlay = $(`.map-overlay[data-key="${key}"]`, section);
        const isOn = overlay.classList.toggle("on");
        chip.classList.toggle("off", !isOn);
      });
    });
  }

  // ---------- network-roles ----------
  function renderNetworkRoles(p) {
    return `
      <div class="network-layout anim anim-d1">
        <div class="network-media"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || "")}" loading="lazy" /></div>
        <div>
          <p class="copy">${esc(p.body)}</p>
          <div class="resp-list stagger">
            ${p.responsibilities.map((r, i) => `
              <div class="resp-item"><span class="idx">${i + 1}</span><p>${esc(r)}</p></div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // ---------- journey ----------
  function renderJourney(p) {
    return `
      <p class="copy anim anim-d1" style="margin-bottom:26px;">${esc(p.intro)}</p>
      <div class="anim anim-d2">
        <div class="journey-track" id="journeyTrack">
          <div class="journey-line"><div class="journey-line-fill" id="journeyFill"></div></div>
          ${p.steps.map((step, i) => `
            <div class="journey-step${i === 0 ? " active" : ""}" data-idx="${i}">
              <div class="dot">${step.n}</div>
              <div class="label">${esc(step.label)}</div>
            </div>`).join("")}
        </div>
        <div class="journey-detail">
          <div class="step-text">
            <span class="step-of" id="journeyStepOf">Etapa 1 de ${p.steps.length}</span>
            <div class="big-label" id="journeyLabel">${esc(p.steps[0].label)}</div>
            <p class="step-desc" id="journeyDesc">${esc(p.steps[0].desc || "")}</p>
          </div>
          <div class="journey-controls">
            <button id="journeyPrev" disabled aria-label="Etapa anterior">←</button>
            <button id="journeyNext" aria-label="Próxima etapa">→</button>
          </div>
        </div>
      </div>
    `;
  }
  function wireJourney(section, p) {
    const steps = $$(".journey-step", section);
    const fill = $("#journeyFill", section);
    const label = $("#journeyLabel", section);
    const desc = $("#journeyDesc", section);
    const stepOf = $("#journeyStepOf", section);
    const prev = $("#journeyPrev", section);
    const next = $("#journeyNext", section);
    let idx = 0;
    function render() {
      steps.forEach((e, i) => {
        e.classList.toggle("active", i === idx);
        e.classList.toggle("done", i < idx);
      });
      fill.style.width = (idx / (steps.length - 1)) * 100 + "%";
      label.textContent = p.steps[idx].label;
      desc.textContent = p.steps[idx].desc || "";
      stepOf.textContent = `Etapa ${idx + 1} de ${steps.length}`;
      prev.disabled = idx === 0;
      next.disabled = idx === steps.length - 1;
    }
    steps.forEach((e, i) => {
      e.addEventListener("click", () => { idx = i; render(); });
    });
    prev.addEventListener("click", () => { if (idx > 0) { idx--; render(); } });
    next.addEventListener("click", () => { if (idx < steps.length - 1) { idx++; render(); } });
    render();
  }

  // ---------- association-entities ----------
  function renderAssociationEntities(p) {
    return `
      <p class="copy anim anim-d1" style="margin-bottom:22px;">${esc(p.intro)}</p>
      <div class="entity-grid stagger">
        ${p.entities.map(e => `
          <div class="entity-card">
            <div class="acronym">${esc(e.acronym)}</div>
            <p class="desc">${esc(e.desc)}</p>
          </div>`).join("")}
      </div>
      <p class="copy anim anim-d2" style="font-weight:700;margin-bottom:4px;">${esc(p.dataLabel)}</p>
      <div class="data-chip-row anim anim-d3">
        ${p.dataProvided.map(d => `<span class="data-chip">${esc(d)}</span>`).join("")}
      </div>
    `;
  }

  // ---------- association-standards ----------
  function renderAssociationStandards(p) {
    return `
      <p class="copy anim anim-d1">${esc(p.normsDesc)}</p>
      <div class="standards-grid stagger">
        ${p.standards.map(s => `
          <div class="standard-card">
            <div class="org">${esc(s.org)}</div>
            <p class="desc">${esc(s.desc)}</p>
          </div>`).join("")}
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------
  function setupTapHint() {
    const hint = $("#tapHint");
    if (ui.tapHint) hint.textContent = ui.tapHint;
    let hidden = false;
    $("#deck").addEventListener("scroll", () => {
      if (hidden) return;
      hint.classList.add("hidden");
      hidden = true;
    }, { passive: true });
  }

  // delegate clicks on any element with data-jump-index / data-jump="first" (hero CTA, closing CTA, etc.)
  document.addEventListener("click", (e) => {
    const idxTarget = e.target.closest("[data-jump-index]");
    if (idxTarget) {
      e.preventDefault();
      goToIndex(parseInt(idxTarget.dataset.jumpIndex, 10));
      return;
    }
    const firstTarget = e.target.closest("[data-jump='first']");
    if (firstTarget) {
      e.preventDefault();
      goToIndex(0);
    }
  });
})();
