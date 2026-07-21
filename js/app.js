/* Guia Librelato — Visão de Negócio
   Renders the whole page from data/content.json and wires up interactivity. */

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

  fetch("data/content.json")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      document.title = data.meta.siteTitle;
      renderToc(data);
      renderHero(data);
      renderSections(data);
      renderClosing(data);
      afterRender(data);
    })
    .catch((err) => {
      console.error("Falha ao carregar data/content.json", err);
      $("#main").innerHTML =
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
  // TOC
  // ---------------------------------------------------------------
  function renderToc(data) {
    const list = $("#tocList");
    data.toc.forEach((item) => {
      const li = el(`<li><a href="#chapter-${item.id}" data-nav="${item.id}">
        <span class="n">${String(item.id).padStart(2, "0")}</span>
        <span>${esc(item.title)}</span>
      </a></li>`);
      list.appendChild(li);
    });
  }

  // ---------------------------------------------------------------
  // Hero
  // ---------------------------------------------------------------
  function renderHero(data) {
    const h = data.hero;
    const hero = $("#hero");
    hero.innerHTML = `
      <div class="hero-inner reveal">
        <div class="hero-kicker">${esc(h.kicker)}</div>
        <h1 class="hero-title">${esc(h.title)}</h1>
        <p class="hero-subtitle">${esc(h.subtitle)}</p>
        <a class="hero-cta" href="#chapter-1" data-nav="1">${esc(h.cta)} →</a>
        <div class="hero-stats">
          ${h.stats.map(s => `
            <div class="hero-stat">
              <div class="value">${esc(s.value)}</div>
              <div class="label">${esc(s.label)}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="hero-photo reveal"><img src="${esc(h.image)}" alt="Implementos Librelato" loading="lazy" /></div>
      <div class="hero-scroll"><span class="dot"></span> Role para explorar</div>
    `;
  }

  // ---------------------------------------------------------------
  // Sections dispatch
  // ---------------------------------------------------------------
  const renderers = {
    intro: renderIntro,
    "cavalo-carroca": renderCavaloCarroca,
    portfolio: renderPortfolio,
    market: renderMarket,
    differentials: renderDifferentials,
    pinos: renderPinos,
    glossary: renderGlossary,
    network: renderNetwork,
    journey: renderJourney,
    association: renderAssociation
  };

  function renderSections(data) {
    const root = $("#sections");
    data.sections.forEach((s) => {
      const fn = renderers[s.type];
      const section = el(`<section class="chapter" id="chapter-${s.id}" data-chapter="${s.id}"></section>`);
      section.innerHTML = chapterHead(s) + '<div class="chapter-body">' + (fn ? fn(s) : "") + "</div>";
      root.appendChild(section);
    });
  }

  function chapterHead(s) {
    return `
      <div class="chapter-head reveal">
        <div class="chapter-kicker">${esc(s.kicker)}</div>
        <h2 class="chapter-title">${esc(s.title)}</h2>
        ${s.subtitle ? `<p class="chapter-subtitle">${esc(s.subtitle)}</p>` : ""}
      </div>
    `;
  }

  // ---------- 1. Intro ----------
  function renderIntro(s) {
    return `
      <div class="intro-split reveal">
        <div>
          <p class="lead">${esc(s.lead)}</p>
          ${s.body.map(p => `<p class="copy">${esc(p)}</p>`).join("")}
          <div class="tag-row">${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
        <div class="intro-media">
          <img src="${esc(s.image)}" alt="${esc(s.imageAlt || "")}" loading="lazy" />
        </div>
      </div>
    `;
  }

  // ---------- 2. Cavalo e Carroça ----------
  function renderCavaloCarroca(s) {
    const [tracao, carga] = s.pair;
    return `
      <div class="cc-intro reveal">
        <p class="copy">${esc(s.intro)}</p>
        <div class="cc-note">${esc(s.note)}</div>
      </div>
      <div class="cc-analogy-label reveal">${esc(s.analogyLabel)}</div>
      <div class="cc-analogy reveal">“${esc(s.analogy)}”</div>
      <div class="cc-pair reveal-stagger">
        <div class="cc-card tracao">
          <div class="cc-img"><img src="${esc(tracao.image)}" alt="${esc(tracao.label)}" loading="lazy" /></div>
          <span class="sub">${esc(tracao.sub)}</span>
          <h3>${esc(tracao.label)}</h3>
          <p>${esc(tracao.desc)}</p>
        </div>
        <div class="cc-card carga">
          <div class="cc-img"><img src="${esc(carga.image)}" alt="${esc(carga.label)}" loading="lazy" /></div>
          <span class="sub">${esc(carga.sub)}</span>
          <h3>${esc(carga.label)}</h3>
          <p>${esc(carga.desc)}</p>
        </div>
      </div>
      <div class="backpack reveal">
        <div class="backpack-label">${esc(s.backpack.label)}</div>
        <p class="backpack-intro">${esc(s.backpack.intro)}</p>
        <div class="backpack-tabs" role="tablist">
          ${s.backpack.options.map((o, i) => `
            <button class="backpack-tab${i === 0 ? " active" : ""}" data-idx="${i}" role="tab">
              <span class="ico">${o.icon}</span> ${esc(o.cargo)}
            </button>`).join("")}
        </div>
        <div class="backpack-display" id="backpackDisplay"></div>
      </div>
    `;
  }

  function wireCavaloCarroca(section, s) {
    const tabs = $$(".backpack-tab", section);
    const display = $("#backpackDisplay", section);
    const opts = s.backpack.options;
    function show(i) {
      const o = opts[i];
      display.classList.remove("swap");
      void display.offsetWidth;
      display.classList.add("swap");
      display.innerHTML = `
        <div class="big-ico">${o.icon}</div>
        <div>
          <div class="implement-name">${esc(o.implement)}</div>
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

  // ---------- 3. Portfolio ----------
  function renderPortfolio(s) {
    return `
      <p class="copy reveal" style="margin-bottom:26px;">${esc(s.intro)}</p>
      <div class="portfolio-media reveal">
        <img src="${esc(s.image)}" alt="${esc(s.imageAlt || "")}" loading="lazy" />
      </div>
      <div class="type-chips reveal-stagger">
        ${s.types.map(t => `<span class="type-chip">${esc(t)}</span>`).join("")}
      </div>
      <div class="reveal">
        <div class="portfolio-table-title">${esc(s.tableTitle)}</div>
        <div class="pt-grid">
          ${s.table.map((row, i) => `
            <div class="pt-card">
              <div class="k">Tipo de carga ${String(i + 1).padStart(2, "0")}</div>
              <div class="cargo">${esc(row.cargo)}</div>
              <span class="implemento">${esc(row.implemento)}</span>
              <p class="exemplo">${esc(row.exemplo)}</p>
            </div>`).join("")}
        </div>
      </div>
    `;
  }

  function wirePortfolio(section) {
    $$(".type-chip", section).forEach(chip => {
      chip.addEventListener("click", () => chip.classList.toggle("active"));
    });
  }

  // ---------- 4. Market ----------
  function renderMarket(s) {
    return `
      <div class="market-top reveal">
        <div class="market-stat">
          <div class="value" data-count="${s.stat.value}">0</div>
          <div class="label">${esc(s.stat.label)}</div>
        </div>
        <div class="market-lead">
          <p class="lead" style="margin-bottom:8px;">${esc(s.lead)}</p>
          <p class="copy">${esc(s.body)}</p>
        </div>
      </div>
      <div class="player-grid reveal-stagger">
        ${s.players.map(p => `
          <div class="player-card">
            <div class="player-flip">
              <div class="player-face player-front">
                <img src="${esc(p.logo)}" alt="${esc(p.name)}" loading="lazy" />
                <span class="hint">clique para ver o diferencial</span>
              </div>
              <div class="player-face player-back" style="--accent:${esc(p.accent)}">
                <div class="name">${esc(p.name)}</div>
                <div class="trait">${esc(p.trait)}</div>
              </div>
            </div>
          </div>`).join("")}
      </div>
      <p class="market-footer reveal">${esc(s.footer)}</p>
    `;
  }

  function wireMarket(section) {
    $$(".player-card", section).forEach(card => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
    });
  }

  // ---------- 5. Differentials ----------
  function renderDifferentials(s) {
    return `
      <div class="diff-grid reveal-stagger">
        ${s.cards.map(c => `
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

  // ---------- 6. Pinos ----------
  function renderPinos(s) {
    return `
      <div class="pinos-layout reveal">
        <div>
          <p class="copy">${esc(s.intro)}</p>
          <p class="copy" style="margin-top:12px;">${esc(s.body)}</p>
          <div class="pinos-rule">${esc(s.rule)}</div>
        </div>
        <div class="pinos-media"><img src="${esc(s.image)}" alt="${esc(s.imageAlt || "")}" loading="lazy" /></div>
      </div>

      <div class="comp-selector">
        ${s.compositions.map((c, i) => `
          <button class="comp-btn${i === 0 ? " active" : ""}" data-idx="${i}">${esc(c.name)}</button>
        `).join("")}
      </div>
      <div class="pin-display" id="pinDisplay"></div>
      <p class="copy" style="margin-top:20px;max-width:820px;">${esc(s.footnote)}</p>

      <div class="rodotrem-panel" style="margin-top:60px;">
        <div>
          <div class="rk">${esc(s.rodotrem.kicker)}</div>
          <h3>${esc(s.rodotrem.title)}</h3>
          <p class="intro">${esc(s.rodotrem.intro)}</p>
          <div class="pin-steps" id="pinSteps">
            ${s.rodotrem.pins.map((p, i) => `
              <div class="pin-step${i === 0 ? " active" : ""}" data-idx="${i}">
                <div class="num">${p.n}</div>
                <div class="label">${esc(p.label)}</div>
              </div>`).join("")}
          </div>
          <ul class="rodotrem-rules">
            ${s.rodotrem.rules.map(r => `<li>${esc(r)}</li>`).join("")}
          </ul>
        </div>
        <div class="rodotrem-media">
          <img src="${esc(s.rodotrem.image)}" alt="${esc(s.rodotrem.imageAlt || "")}" loading="lazy" />
        </div>
      </div>
    `;
  }

  function wirePinos(section, s) {
    const buttons = $$(".comp-btn", section);
    const display = $("#pinDisplay", section);
    function show(i) {
      const c = s.compositions[i];
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

    // rodotrem step highlight cycling on click
    const steps = $$(".pin-step", section);
    steps.forEach(step => {
      step.addEventListener("click", () => {
        steps.forEach(x => x.classList.remove("active"));
        step.classList.add("active");
      });
    });
  }

  // ---------- 7. Glossary ----------
  function renderGlossary(s) {
    return `
      <div class="glossary-grid reveal-stagger">
        ${s.terms.map(t => `
          <div class="term-card">
            <div class="term-flip">
              <div class="term-face term-front">
                ${t.image ? `<img class="mini-img" src="${esc(t.image)}" alt="" loading="lazy" />` : ""}
                <div>
                  <div class="term">${esc(t.term)}</div>
                  <div class="full">${esc(t.full)}</div>
                </div>
                <span class="flip-hint">clique ↻</span>
              </div>
              <div class="term-face term-back">
                <div class="term-mini">${esc(t.term)}</div>
                <p>${esc(t.def)}</p>
              </div>
            </div>
          </div>`).join("")}
      </div>
      <div class="checklist-box reveal">
        <div class="checklist-head">
          <h3>${esc(s.checklist.title)}</h3>
          <p>${esc(s.checklist.subtitle)}</p>
        </div>
        <span class="checklist-note">${esc(s.checklist.note)}</span>
        <div class="check-grid">
          ${s.checklist.items.map(item => `
            <div class="check-item">
              <span class="box">✓</span>${esc(item)}
            </div>`).join("")}
        </div>
      </div>
    `;
  }

  function wireGlossary(section) {
    $$(".term-card", section).forEach(card => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
    });
    $$(".check-item", section).forEach(item => {
      item.addEventListener("click", () => item.classList.toggle("checked"));
    });
  }

  // ---------- 8. Network ----------
  function renderNetwork(s) {
    return `
      <div class="network-layout reveal">
        <div class="network-media"><img src="${esc(s.image)}" alt="${esc(s.imageAlt || "")}" loading="lazy" /></div>
        <div>
          <p class="lead">${esc(s.lead)}</p>
          <p class="copy">${esc(s.body)}</p>
          <div class="resp-list">
            ${s.responsibilities.map((r, i) => `
              <div class="resp-item"><span class="idx">${i + 1}</span><p>${esc(r)}</p></div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // ---------- 9. Journey ----------
  function renderJourney(s) {
    return `
      <p class="copy reveal" style="margin-bottom:34px;">${esc(s.intro)}</p>
      <div class="journey-stepper reveal">
        <div class="journey-track" id="journeyTrack">
          <div class="journey-line"><div class="journey-line-fill" id="journeyFill"></div></div>
          ${s.steps.map((step, i) => `
            <div class="journey-step${i === 0 ? " active" : ""}" data-idx="${i}">
              <div class="dot">${step.n}</div>
              <div class="label">${esc(step.label)}</div>
            </div>`).join("")}
        </div>
        <div class="journey-detail">
          <div>
            <span class="step-of" id="journeyStepOf">Etapa 1 de ${s.steps.length}</span>
            <div class="big-label" id="journeyLabel">${esc(s.steps[0].label)}</div>
          </div>
          <div class="journey-controls">
            <button id="journeyPrev" disabled aria-label="Etapa anterior">←</button>
            <button id="journeyNext" aria-label="Próxima etapa">→</button>
          </div>
        </div>
      </div>
    `;
  }

  function wireJourney(section, s) {
    const steps = $$(".journey-step", section);
    const fill = $("#journeyFill", section);
    const label = $("#journeyLabel", section);
    const stepOf = $("#journeyStepOf", section);
    const prev = $("#journeyPrev", section);
    const next = $("#journeyNext", section);
    let current = 0;

    function render() {
      steps.forEach((el2, i) => {
        el2.classList.toggle("active", i === current);
        el2.classList.toggle("done", i < current);
      });
      fill.style.width = (current / (steps.length - 1)) * 100 + "%";
      label.textContent = s.steps[current].label;
      stepOf.textContent = `Etapa ${current + 1} de ${steps.length}`;
      prev.disabled = current === 0;
      next.disabled = current === steps.length - 1;
    }
    steps.forEach((el2, i) => {
      el2.addEventListener("click", () => { current = i; render(); });
    });
    prev.addEventListener("click", () => { if (current > 0) { current--; render(); } });
    next.addEventListener("click", () => { if (current < steps.length - 1) { current++; render(); } });
    render();
  }

  // ---------- 10. Association ----------
  function renderAssociation(s) {
    return `
      <p class="copy reveal" style="margin-bottom:28px;">${esc(s.intro)}</p>
      <div class="entity-grid reveal-stagger">
        ${s.entities.map(e => `
          <div class="entity-card">
            <div class="acronym">${esc(e.acronym)}</div>
            <p class="desc">${esc(e.desc)}</p>
          </div>`).join("")}
      </div>
      <p class="copy reveal" style="font-weight:700;margin-bottom:10px;">${esc(s.dataLabel)}</p>
      <div class="data-chip-row reveal-stagger">
        ${s.dataProvided.map(d => `<span class="data-chip">${esc(d)}</span>`).join("")}
      </div>
      <p class="copy reveal" style="font-weight:700;margin-bottom:6px;">${esc(s.normsLabel)}</p>
      <p class="copy reveal" style="margin-bottom:26px;">${esc(s.normsDesc)}</p>
      <div class="standards-grid reveal-stagger">
        ${s.standards.map(st => `
          <div class="standard-card">
            <div class="org">${esc(st.org)}</div>
            <p class="desc">${esc(st.desc)}</p>
          </div>`).join("")}
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // Closing
  // ---------------------------------------------------------------
  function renderClosing(data) {
    const c = data.closing;
    $("#closing").innerHTML = `
      <img class="logo reveal" src="${esc(data.meta.logo)}" alt="Librelato" />
      <p class="quote reveal">“${esc(c.quote)}”</p>
      <a class="back-cta reveal" href="#hero" data-nav="hero">${esc(c.cta)}</a>
    `;
  }

  // ---------------------------------------------------------------
  // Post-render wiring: interactivity per section, scrollspy, reveal, mobile nav
  // ---------------------------------------------------------------
  function afterRender(data) {
    data.sections.forEach((s) => {
      const section = $(`#chapter-${s.id}`);
      if (!section) return;
      if (s.type === "cavalo-carroca") wireCavaloCarroca(section, s);
      if (s.type === "portfolio") wirePortfolio(section);
      if (s.type === "market") wireMarket(section);
      if (s.type === "differentials") wireDifferentials(section);
      if (s.type === "pinos") wirePinos(section, s);
      if (s.type === "glossary") wireGlossary(section);
      if (s.type === "journey") wireJourney(section, s);
    });

    setupReveal();
    setupScrollspyAndProgress(data);
    setupMobileNav();
    setupSmoothAnchors();
    setupStatCount();
    setupTapHint();
  }

  function setupReveal() {
    const targets = $$(".reveal, .reveal-stagger");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -60px 0px" });
    targets.forEach((t) => io.observe(t));
  }

  function setupStatCount() {
    $$(".market-stat .value[data-count]").forEach((node) => {
      const target = parseInt(node.dataset.count, 10);
      if (Number.isNaN(target)) { node.textContent = node.dataset.count; return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          const dur = 1200;
          const start = performance.now();
          function tick(now) {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            node.textContent = Math.round(eased * target);
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.5 });
      io.observe(node);
    });
  }

  function setupScrollspyAndProgress(data) {
    const links = $$(".toc-list a");
    const chapters = data.sections.map(s => $(`#chapter-${s.id}`)).filter(Boolean);
    const progressFill = $("#progressFill");

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.dataset.chapter;
        const link = links.find(l => l.dataset.nav === id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    }, { threshold: 0, rootMargin: "-40% 0px -55% 0px" });
    chapters.forEach(c => io.observe(c));

    window.addEventListener("scroll", () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      progressFill.style.width = height > 0 ? (scrollTop / height) * 100 + "%" : "0%";
    }, { passive: true });
  }

  function setupMobileNav() {
    const toggle = $("#navToggle");
    const toc = $("#toc");
    toggle.addEventListener("click", () => {
      const open = toc.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$(".toc-list a, .toc-restart").forEach(a => {
      a.addEventListener("click", () => {
        toc.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function setupSmoothAnchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      const targetId = a.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function setupTapHint() {
    const hint = $("#tapHint");
    let hidden = false;
    window.addEventListener("scroll", () => {
      if (hidden) return;
      if (window.scrollY > 120) {
        hint.classList.add("hidden");
        hidden = true;
      }
    }, { passive: true });
  }
})();
