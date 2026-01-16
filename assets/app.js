/* =========================================================
   AI EduBrain Demo - app.js
   v0.9.3-demo (Trend + Tiering + Drilldown linked)
   ========================================================= */

(() => {
  const APP_VERSION = "v0.9.3-demo";

  /* ---------------------------
   *  Utils
   * --------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pct = (n) => `${Math.round(n)}%`;

  function safeText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function safeHTML(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  function toast(msg) {
    // 轻量 toast：不依赖 CSS 也能看见
    let el = $("#__toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__toast";
      el.style.cssText =
        "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;" +
        "background:rgba(15,23,42,0.92);color:#fff;padding:10px 14px;border-radius:12px;" +
        "font-size:12px;max-width:70vw;box-shadow:0 14px 40px rgba(0,0,0,.25);" +
        "opacity:0;transition:opacity .2s ease;";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el.__t);
    el.__t = setTimeout(() => (el.style.opacity = "0"), 1400);
  }

  /* ---------------------------
   *  Mock Data (真实感更强)
   * --------------------------- */
  const DATA = {
    className: "初二（3）班",
    subject: "数学",
    days: [
      { label: "周一", date: "01-10", mastery: 66, accuracy: 71, stability: 78, marked: 26 },
      { label: "周二", date: "01-11", mastery: 68, accuracy: 73, stability: 77, marked: 28 },
      { label: "周三", date: "01-12", mastery: 65, accuracy: 70, stability: 74, marked: 30 },
      { label: "周四", date: "01-13", mastery: 72, accuracy: 78, stability: 80, marked: 31 },
      { label: "周五", date: "01-14", mastery: 74, accuracy: 79, stability: 82, marked: 32 },
      { label: "周六", date: "01-15", mastery: 75, accuracy: 80, stability: 83, marked: 32 },
      { label: "周日", date: "01-16", mastery: 73, accuracy: 78, stability: 81, marked: 32 },
    ],
    roster: [
      { id: 1, name: "宋扬", mastery: 88, miss: 0, err: 12, time: 32 },
      { id: 2, name: "张涵", mastery: 84, miss: 0, err: 16, time: 29 },
      { id: 3, name: "李泽", mastery: 80, miss: 1, err: 18, time: 24 },
      { id: 4, name: "周晴", mastery: 77, miss: 0, err: 22, time: 21 },
      { id: 5, name: "陈昊", mastery: 74, miss: 0, err: 28, time: 18 },
      { id: 6, name: "王杨", mastery: 72, miss: 0, err: 26, time: 16 },
      { id: 7, name: "孙悦", mastery: 69, miss: 0, err: 30, time: 15 },
      { id: 8, name: "赵宁", mastery: 67, miss: 2, err: 35, time: 10 },
      { id: 9, name: "刘一", mastery: 64, miss: 1, err: 34, time: 12 },
      { id: 10, name: "高宇", mastery: 60, miss: 3, err: 39, time: 9 },
      { id: 11, name: "林冉", mastery: 58, miss: 2, err: 41, time: 8 },
      { id: 12, name: "许然", mastery: 55, miss: 1, err: 45, time: 11 },
      { id: 13, name: "唐琪", mastery: 52, miss: 0, err: 46, time: 9 },
      { id: 14, name: "冯博", mastery: 50, miss: 2, err: 48, time: 7 },
      { id: 15, name: "韩依", mastery: 49, miss: 1, err: 52, time: 8 },
      { id: 16, name: "谢晨", mastery: 47, miss: 0, err: 54, time: 6 },
      { id: 17, name: "梁辰", mastery: 46, miss: 2, err: 55, time: 7 },
      { id: 18, name: "郑可", mastery: 44, miss: 1, err: 56, time: 6 },
      { id: 19, name: "蒋涛", mastery: 43, miss: 0, err: 58, time: 6 },
      { id: 20, name: "邓楠", mastery: 41, miss: 2, err: 60, time: 5 },
      { id: 21, name: "顾欣", mastery: 39, miss: 1, err: 62, time: 5 },
      { id: 22, name: "魏然", mastery: 38, miss: 0, err: 63, time: 4 },
      { id: 23, name: "叶辰", mastery: 36, miss: 2, err: 65, time: 4 },
      { id: 24, name: "沈杰", mastery: 35, miss: 1, err: 66, time: 3 },
      { id: 25, name: "田雪", mastery: 33, miss: 0, err: 68, time: 3 },
      { id: 26, name: "卢宁", mastery: 31, miss: 2, err: 70, time: 2 },
      { id: 27, name: "何帆", mastery: 30, miss: 1, err: 71, time: 2 },
      { id: 28, name: "方颖", mastery: 29, miss: 3, err: 72, time: 2 },
      { id: 29, name: "杜文", mastery: 27, miss: 2, err: 73, time: 2 },
      { id: 30, name: "蔡昕", mastery: 26, miss: 1, err: 75, time: 1 },
      { id: 31, name: "郭晨", mastery: 25, miss: 0, err: 76, time: 1 },
      { id: 32, name: "邵宁", mastery: 24, miss: 2, err: 78, time: 1 },
    ],
  };

  /* ---------------------------
   *  App State
   * --------------------------- */
  const state = {
    currentView: "home",
    teacherMode: "prep",
    selectedDayIndex: DATA.days.length - 1, // 默认今天
    selectedTier: "ALL", // ALL/A/B/C
    selectedAnomalyFilter: "all", // all/missing/error/time
  };

  /* ---------------------------
   *  View Switch (兼容 onclick/事件绑定)
   * --------------------------- */
  function switchView(viewId, navEl) {
    state.currentView = viewId;

    // Sidebar active
    $$(".nav-item").forEach((el) => el.classList.remove("active"));
    if (navEl) navEl.classList.add("active");

    // View container active
    $$(".view-container").forEach((el) => el.classList.remove("active"));
    const view = $("#view-" + viewId);
    if (view) view.classList.add("active");

    // Page title
    const titleMap = {
      home: "首页入口",
      teacher: "教师工作台",
      student: "学习伴侣",
      gov: "治理驾驶舱",
    };
    safeText($("#page-title"), titleMap[viewId] || "工作区");

    // Gov header hide/show
    const topHeader = $("#top-header");
    if (viewId === "gov") {
      if (topHeader) topHeader.style.display = "none";
      // 你原有 gov 初始化逻辑若在旧代码里，这里不干预
    } else {
      if (topHeader) topHeader.style.display = "flex";
    }

    // 进入教师页时刷新联动组件
    if (viewId === "teacher") {
      renderTeacherAnalytics();
    }
  }

  // 把 switchView 暴露给 inline onclick（兼容你旧版）
  window.switchView = switchView;

  /* ---------------------------
   *  Teacher Mode
   * --------------------------- */
  function setTeacherMode(mode) {
    state.teacherMode = mode;

    const btnPrep = $("#btn-prep");
    const btnMark = $("#btn-mark");

    if (btnPrep && btnMark) {
      if (mode === "prep") {
        btnPrep.className = "btn btn-primary";
        btnMark.className = "btn btn-ghost";
      } else {
        btnPrep.className = "btn btn-ghost";
        btnMark.className = "btn btn-primary";
      }
    }

    // 这里不强行改你右侧大工作区结构，只做最小控制
    const prep = $("#prep-placeholder");
    const lesson = $("#lesson-result");
    const ocr = $("#ocr-interface");

    if (mode === "prep") {
      if (prep) prep.style.display = "block";
      if (lesson) lesson.style.display = "none";
      if (ocr) ocr.style.display = "none";
    } else {
      if (prep) prep.style.display = "none";
      if (lesson) lesson.style.display = "none";
      if (ocr) ocr.style.display = "block";
    }
  }

  window.setTeacherMode = setTeacherMode;

  /* ---------------------------
   *  Chat helpers (你已有聊天区就复用)
   * --------------------------- */
  function addMsg(role, text) {
    const box = $("#chat-box");
    if (!box) return;

    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="msg-bubble">${escapeHTML(text)}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  window.addMsg = addMsg;

  /* ---------------------------
   *  Teacher Analytics - Linked Widgets
   * --------------------------- */

  function getTier(mastery) {
    // A: >= 75, B: 55~74, C: <55
    if (mastery >= 75) return "A";
    if (mastery >= 55) return "B";
    return "C";
  }

  function computeTierStats() {
    const groups = { A: [], B: [], C: [] };
    DATA.roster.forEach((s) => groups[getTier(s.mastery)].push(s));
    return groups;
  }

  function computeAnomalies() {
    // 规则：缺交 miss>=1；错误率 err>=50；时长 time<=6
    return DATA.roster.map((s) => {
      const tier = getTier(s.mastery);
      const flags = {
        missing: s.miss >= 1,
        error: s.err >= 50,
        time: s.time <= 6,
      };
      const score =
        (flags.missing ? 2 : 0) + (flags.error ? 2 : 0) + (flags.time ? 1 : 0);

      let reason = [];
      if (flags.missing) reason.push(`缺交 ${s.miss} 次`);
      if (flags.error) reason.push(`错误率偏高（${s.err}%）`);
      if (flags.time) reason.push(`完成时长偏短（${s.time}min）`);

      let suggestion = "建议：安排基础巩固练习（3组）+ 1道变式题";
      if (tier === "A") suggestion = "建议：补充 2 道拔高题 + 讲评强化";
      if (tier === "C") suggestion = "建议：先做基础计算纠错（10分钟）→再进阶";

      return {
        ...s,
        tier,
        flags,
        risk: score, // 0~5
        reason: reason.join(" · ") || "暂无明显异常",
        suggestion,
      };
    });
  }

  function filterAnomalyList(items) {
    // tier
    let arr = items;
    if (state.selectedTier !== "ALL") {
      arr = arr.filter((x) => x.tier === state.selectedTier);
    }
    // filter type
    if (state.selectedAnomalyFilter !== "all") {
      arr = arr.filter((x) => x.flags[state.selectedAnomalyFilter]);
    }
    // 排序：风险高优先
    arr = arr
      .filter((x) => x.risk > 0)
      .sort((a, b) => b.risk - a.risk || b.err - a.err);

    return arr;
  }

  function updateKPI() {
    // KPI 取 selectedDayIndex
    const d = DATA.days[state.selectedDayIndex];

    // 尽量兼容你现有结构：先找 data-kpi，再找 id
    const kpiMarked = $('[data-kpi="marked"]') || $("#kpi-marked");
    const kpiMastery = $('[data-kpi="mastery"]') || $("#kpi-mastery");
    const kpiAnomaly = $('[data-kpi="anomaly"]') || $("#kpi-anomaly");

    safeText(kpiMarked, String(d.marked ?? 18));
    safeText(kpiMastery, pct(d.mastery));

    const anomalies = filterAnomalyList(computeAnomalies());
    safeText(kpiAnomaly, String(anomalies.length || 0));
  }

  function renderTrendChart() {
    const root = $("#trendChart");
    if (!root) return;

    const w = 360;
    const h = 160;
    const pad = 24;

    const values = DATA.days.map((x) => x.mastery);
    const minV = Math.min(...values) - 5;
    const maxV = Math.max(...values) + 5;

    const xStep = (w - pad * 2) / (DATA.days.length - 1);
    const yScale = (v) => {
      const t = (v - minV) / (maxV - minV);
      return h - pad - t * (h - pad * 2);
    };

    const points = DATA.days.map((d, i) => ({
      i,
      x: pad + xStep * i,
      y: yScale(d.mastery),
      v: d.mastery,
      label: d.label,
      date: d.date,
    }));

    const path = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    // Selected highlight
    const sel = points[state.selectedDayIndex];

    // SVG
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:800;color:#0f172a;">📈 班级趋势（近7天掌握度）</div>
        <div style="font-size:12px;color:#64748b;">点击折线点位 · ${sel.date}</div>
      </div>
      <svg width="100%" viewBox="0 0 ${w} ${h}" style="background:#fff;border-radius:14px;border:1px solid #eef2ff;overflow:hidden;">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(99,102,241,0.28)"></stop>
            <stop offset="100%" stop-color="rgba(99,102,241,0.00)"></stop>
          </linearGradient>
        </defs>

        <!-- grid -->
        ${[0, 1, 2, 3].map((k) => {
          const y = pad + (k * (h - pad * 2)) / 3;
          return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(100,116,139,0.12)" />`;
        }).join("")}

        <!-- area -->
        <path d="${path} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z" fill="url(#areaGrad)"></path>

        <!-- line -->
        <path d="${path}" fill="none" stroke="rgba(79,70,229,1)" stroke-width="2.5" stroke-linecap="round"></path>

        <!-- points -->
        ${points.map((p) => {
          const isSel = p.i === state.selectedDayIndex;
          return `
            <g class="trend-pt" data-i="${p.i}" style="cursor:pointer;">
              <circle cx="${p.x}" cy="${p.y}" r="${isSel ? 5.2 : 4.0}" fill="${isSel ? "rgba(79,70,229,1)" : "rgba(99,102,241,0.75)"}"></circle>
              ${isSel ? `<circle cx="${p.x}" cy="${p.y}" r="9" fill="rgba(99,102,241,0.12)"></circle>` : ""}
            </g>
          `;
        }).join("")}

        <!-- selected label -->
        <g>
          <rect x="${clamp(sel.x - 38, 8, w - 86)}" y="${clamp(sel.y - 38, 8, h - 50)}" rx="10" ry="10"
                width="78" height="28" fill="rgba(15,23,42,0.92)"></rect>
          <text x="${clamp(sel.x, 18, w - 18)}" y="${clamp(sel.y - 19, 22, h - 28)}" text-anchor="middle"
                fill="#fff" font-size="12" font-weight="700">${sel.v}%</text>
        </g>

        <!-- x labels -->
        ${points.map((p) => {
          return `<text x="${p.x}" y="${h - 8}" text-anchor="middle" fill="rgba(100,116,139,0.9)" font-size="11">${p.label}</text>`;
        }).join("")}
      </svg>
    `;

    // Bind click
    $$(".trend-pt", root).forEach((g) => {
      g.addEventListener("click", () => {
        const idx = Number(g.dataset.i);
        state.selectedDayIndex = idx;
        renderTeacherAnalytics("trend");
      });
    });
  }

  function renderTierPanel() {
    const root = $("#tierPanel");
    if (!root) return;

    const tiers = computeTierStats();
    const total = DATA.roster.length;
    const a = tiers.A.length;
    const b = tiers.B.length;
    const c = tiers.C.length;

    const tipMap = {
      A: "综合掌握高，可提升拔高题",
      B: "基础稳定，建议补齐薄弱点",
      C: "需优先打牢基础与错题复盘",
    };

    const row = (tier, count) => {
      const ratio = Math.round((count / total) * 100);
      const active = state.selectedTier === tier;
      return `
        <div class="tier-row ${active ? "active" : ""}" data-tier="${tier}"
             style="padding:14px 14px;border-radius:14px;border:1px solid ${active ? "#c7d2fe" : "#eef2ff"};
                    background:${active ? "rgba(238,242,255,0.9)" : "#fff"};
                    cursor:pointer;transition:.18s;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:28px;height:28px;border-radius:10px;display:grid;place-items:center;
                          background:${tier === "A" ? "rgba(16,185,129,.12)" : tier === "B" ? "rgba(245,158,11,.14)" : "rgba(239,68,68,.12)"};
                          color:${tier === "A" ? "#10b981" : tier === "B" ? "#f59e0b" : "#ef4444"};
                          font-weight:900;">${tier}</div>
              <div style="font-weight:800;color:#0f172a;">${tier} 组</div>
              <div style="font-size:12px;color:#64748b;">${tipMap[tier]}</div>
            </div>
            <div style="display:flex;align-items:baseline;gap:8px;">
              <div style="font-weight:900;font-size:18px;color:#0f172a;">${count}</div>
              <div style="font-size:12px;color:#64748b;">人 · ${ratio}%</div>
            </div>
          </div>
          <div style="margin-top:10px;height:8px;border-radius:999px;background:#f1f5f9;overflow:hidden;">
            <div style="height:100%;width:${ratio}%;border-radius:999px;background:rgba(79,70,229,0.9);"></div>
          </div>
        </div>
      `;
    };

    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:800;color:#0f172a;">👥 班级分层（A/B/C）</div>
        <div style="font-size:12px;color:#64748b;">点击分层联动钻取</div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <button class="btn btn-ghost tier-all-btn ${state.selectedTier === "ALL" ? "btn-active" : ""}"
                style="padding:8px 12px;font-size:12px;" data-tier="ALL">全部</button>
        <button class="btn btn-ghost tier-all-btn ${state.selectedTier === "A" ? "btn-active" : ""}"
                style="padding:8px 12px;font-size:12px;" data-tier="A">A组</button>
        <button class="btn btn-ghost tier-all-btn ${state.selectedTier === "B" ? "btn-active" : ""}"
                style="padding:8px 12px;font-size:12px;" data-tier="B">B组</button>
        <button class="btn btn-ghost tier-all-btn ${state.selectedTier === "C" ? "btn-active" : ""}"
                style="padding:8px 12px;font-size:12px;" data-tier="C">C组</button>
      </div>

      <div style="display:grid;gap:10px;">
        ${row("A", a)}
        ${row("B", b)}
        ${row("C", c)}
      </div>
    `;

    // Bind
    $$(".tier-row", root).forEach((el) => {
      el.addEventListener("click", () => {
        state.selectedTier = el.dataset.tier;
        renderTeacherAnalytics("tier");
      });
    });

    $$(".tier-all-btn", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.selectedTier = btn.dataset.tier;
        renderTeacherAnalytics("tier");
      });
    });
  }

  function renderAnomalyPanel() {
    const panel = $("#anomalyPanel");
    const list = $("#anomalyList");
    if (!panel || !list) return;

    const all = computeAnomalies();
    const filtered = filterAnomalyList(all);

    const counts = {
      all: all.filter((x) => x.risk > 0).length,
      missing: all.filter((x) => x.flags.missing).length,
      error: all.filter((x) => x.flags.error).length,
      time: all.filter((x) => x.flags.time).length,
    };

    const chip = (key, label) => {
      const active = state.selectedAnomalyFilter === key;
      return `
        <button class="anomaly-chip ${active ? "active" : ""}" data-filter="${key}"
          style="padding:8px 10px;border-radius:999px;border:1px solid ${active ? "#c7d2fe" : "#e2e8f0"};
                 background:${active ? "rgba(238,242,255,0.9)" : "#fff"};
                 font-weight:700;font-size:12px;color:${active ? "#4f46e5" : "#475569"};
                 cursor:pointer;">
          ${label} <span style="margin-left:6px;color:#64748b;font-weight:800;">${counts[key]}</span>
        </button>
      `;
    };

    // Header
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:800;color:#0f172a;">⚠️ 异常钻取</div>
        <div style="font-size:12px;color:#64748b;">点异常 → 进入详情与建议动作</div>
      </div>

      <div id="anomalyFilters" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
        ${chip("all", "全部")}
        ${chip("missing", "缺交")}
        ${chip("error", "错误率")}
        ${chip("time", "时长")}
      </div>

      <div style="background:#fff;border:1px solid #eef2ff;border-radius:14px;padding:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 6px 10px 6px;">
          <div style="font-size:12px;color:#64748b;">
            当前：<b style="color:#0f172a;">${DATA.days[state.selectedDayIndex].date}</b> · 分层：<b style="color:#0f172a;">${state.selectedTier}</b>
          </div>
          <button id="drillQuickAction" class="btn btn-ghost" style="padding:8px 10px;font-size:12px;">
            一键生成补救任务
          </button>
        </div>

        <div id="anomalyList" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    `;

    // List items
    const target = $("#anomalyList", panel);
    if (!target) return;

    if (filtered.length === 0) {
      target.innerHTML = `
        <div style="padding:12px;border-radius:12px;border:1px dashed #e2e8f0;color:#64748b;background:#f8fafc;">
          当前筛选下暂无异常。你可以切换日期 / 分层 / 筛选条件继续查看。
        </div>
      `;
    } else {
      target.innerHTML = filtered.slice(0, 8).map((x) => {
        const badgeColor =
          x.risk >= 4 ? "#ef4444" : x.risk >= 2 ? "#f59e0b" : "#64748b";

        return `
          <div class="anomaly-row" data-id="${x.id}"
            style="display:flex;gap:10px;align-items:flex-start;
                   padding:10px;border-radius:12px;border:1px solid #eef2ff;
                   cursor:pointer;transition:.18s;background:#fff;">
            <div style="width:34px;height:34px;border-radius:12px;display:grid;place-items:center;
                        background:rgba(79,70,229,0.12);color:#4f46e5;font-weight:900;">
              ${x.name.slice(0, 1)}
            </div>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="font-weight:900;color:#0f172a;">${x.name}
                  <span style="margin-left:8px;font-size:12px;color:#64748b;font-weight:800;">${x.tier}组</span>
                </div>
                <div style="font-size:12px;font-weight:900;color:${badgeColor};">
                  风险 ${x.risk}/5
                </div>
              </div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">
                ${x.reason}
              </div>
              <div style="font-size:12px;color:#334155;margin-top:6px;">
                ${x.suggestion}
              </div>
            </div>
          </div>
        `;
      }).join("");
    }

    // Bind filters
    $$(".anomaly-chip", panel).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedAnomalyFilter = btn.dataset.filter;
        renderTeacherAnalytics("filter");
      });
    });

    // Bind row click
    $$(".anomaly-row", panel).forEach((row) => {
      row.addEventListener("click", () => {
        const id = Number(row.dataset.id);
        openDrillModal(id);
      });
    });

    // Quick action
    const quick = $("#drillQuickAction", panel);
    if (quick) {
      quick.addEventListener("click", () => {
        addMsg("ai", "已根据异常人群自动生成补救任务包：基础计算3组 + 变式题2道 + 错题复盘引导。");
        toast("已生成补救任务包（示例）");
      });
    }
  }

  /* ---------------------------
   *  Drilldown Modal (抽屉)
   * --------------------------- */
  function ensureDrillModal() {
    let modal = $("#drillModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "drillModal";
    modal.style.cssText =
      "position:fixed;inset:0;z-index:9998;display:none;" +
      "background:rgba(15,23,42,0.45);backdrop-filter:blur(6px);";

    modal.innerHTML = `
      <div id="drillDrawer" style="
        position:absolute;right:0;top:0;height:100%;width:min(440px, 92vw);
        background:#fff;border-left:1px solid #e2e8f0;
        box-shadow:-20px 0 60px rgba(0,0,0,.18);
        transform:translateX(8px);
        display:flex;flex-direction:column;
      ">
        <div style="padding:16px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:900;color:#0f172a;">异常详情</div>
          <button id="drillClose" class="btn btn-ghost" style="padding:8px 10px;font-size:12px;">关闭</button>
        </div>

        <div id="drillBody" style="padding:16px;overflow:auto;flex:1;"></div>

        <div style="padding:14px 16px;border-top:1px solid #f1f5f9;display:flex;gap:10px;">
          <button id="drillAssign" class="btn btn-primary" style="flex:1;justify-content:center;">一键布置补救</button>
          <button id="drillMsg" class="btn btn-ghost" style="flex:1;justify-content:center;">生成家校话术</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    $("#drillClose", modal).addEventListener("click", closeDrillModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeDrillModal();
    });

    $("#drillAssign", modal).addEventListener("click", () => {
      addMsg("ai", "已为该学生生成补救练习：基础计算10题 + 变式题2题 + 错题复盘提示。");
      toast("补救任务已生成（示例）");
      closeDrillModal();
    });

    $("#drillMsg", modal).addEventListener("click", () => {
      addMsg("ai", "家校话术建议：今天作业中发现孩子在分数应用题上有共性薄弱点，我已推送针对性练习，建议晚间完成10分钟基础纠错。");
      toast("家校话术已生成（示例）");
    });

    return modal;
  }

  function openDrillModal(studentId) {
    const modal = ensureDrillModal();
    const all = computeAnomalies();
    const s = all.find((x) => x.id === studentId);
    if (!s) return;

    const body = $("#drillBody", modal);
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:42px;height:42px;border-radius:16px;display:grid;place-items:center;
                    background:rgba(79,70,229,.12);color:#4f46e5;font-weight:900;font-size:16px;">
          ${s.name.slice(0, 1)}
        </div>
        <div style="flex:1;">
          <div style="font-weight:900;color:#0f172a;font-size:16px;">${s.name}</div>
          <div style="font-size:12px;color:#64748b;">${DATA.className} · ${DATA.subject} · ${s.tier}组</div>
        </div>
        <div style="font-weight:900;color:${s.risk >= 4 ? "#ef4444" : s.risk >= 2 ? "#f59e0b" : "#64748b"};">
          风险 ${s.risk}/5
        </div>
      </div>

      <div style="background:#f8fafc;border:1px solid #eef2ff;border-radius:14px;padding:12px;margin-bottom:12px;">
        <div style="font-weight:900;color:#0f172a;margin-bottom:6px;">异常原因</div>
        <div style="font-size:13px;color:#334155;line-height:1.6;">${s.reason}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div style="border:1px solid #eef2ff;border-radius:14px;padding:12px;">
          <div style="font-size:12px;color:#64748b;">掌握度</div>
          <div style="font-weight:900;font-size:18px;color:#0f172a;">${s.mastery}%</div>
        </div>
        <div style="border:1px solid #eef2ff;border-radius:14px;padding:12px;">
          <div style="font-size:12px;color:#64748b;">错误率</div>
          <div style="font-weight:900;font-size:18px;color:#0f172a;">${s.err}%</div>
        </div>
        <div style="border:1px solid #eef2ff;border-radius:14px;padding:12px;">
          <div style="font-size:12px;color:#64748b;">缺交次数</div>
          <div style="font-weight:900;font-size:18px;color:#0f172a;">${s.miss}</div>
        </div>
        <div style="border:1px solid #eef2ff;border-radius:14px;padding:12px;">
          <div style="font-size:12px;color:#64748b;">完成时长</div>
          <div style="font-weight:900;font-size:18px;color:#0f172a;">${s.time}min</div>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #eef2ff;border-radius:14px;padding:12px;">
        <div style="font-weight:900;color:#0f172a;margin-bottom:6px;">建议动作</div>
        <div style="font-size:13px;color:#334155;line-height:1.6;">${s.suggestion}</div>

        <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">
          <div style="font-size:12px;color:#64748b;">系统建议“下一步”</div>
          <ul style="margin:8px 0 0 18px;padding:0;color:#334155;font-size:13px;line-height:1.7;">
            <li>先做 10 分钟基础纠错（对应错因）</li>
            <li>再做 2 道同结构变式题巩固迁移</li>
            <li>明天随堂 3 分钟口测回查</li>
          </ul>
        </div>
      </div>
    `;

    modal.style.display = "block";
  }

  function closeDrillModal() {
    const modal = $("#drillModal");
    if (!modal) return;
    modal.style.display = "none";
  }

  /* ---------------------------
   *  Main render for Teacher
   * --------------------------- */
  function renderTeacherAnalytics(from = "") {
    updateKPI();
    renderTrendChart();
    renderTierPanel();
    renderAnomalyPanel();

    // 联动提示（更像真实产品）
    if (from === "trend") {
      const d = DATA.days[state.selectedDayIndex];
      addMsg("ai", `已切换到 ${d.label}（${d.date}）数据：掌握度 ${d.mastery}% · 正确率 ${d.accuracy}% · 稳定性 ${d.stability}%。`);
      toast(`趋势联动：${d.date} · 掌握度 ${d.mastery}%`);
    }

    if (from === "tier") {
      addMsg("ai", `已切换班级分层视图：${state.selectedTier} 组。异常钻取将优先展示该分层学生。`);
      toast(`分层联动：${state.selectedTier}组`);
    }

    if (from === "filter") {
      const map = { all: "全部", missing: "缺交", error: "错误率", time: "时长" };
      toast(`异常筛选：${map[state.selectedAnomalyFilter]}`);
    }
  }

  /* ---------------------------
   *  Init bindings
   * --------------------------- */
  function bindNavClick() {
    // 如果你已经用 inline onclick，也不会冲突；
    // 这里额外让“纯静态无 onclick”的 nav 也能点
    const items = $$(".nav-item");
    items.forEach((el) => {
      // 允许 data-view="home/teacher/..."
      const viewId = el.dataset.view;
      if (viewId) {
        el.addEventListener("click", () => switchView(viewId, el));
      }
    });
  }

  function bindHomeCards() {
    // 兼容：如果首页卡片写了 data-go / data-action
    const cards = $$(".feature-card");
    cards.forEach((c) => {
      const go = c.dataset.go;
      if (go) c.addEventListener("click", () => switchView(go, null));
    });
  }

  function boot() {
    // set version badge
    safeText($("#app-version"), APP_VERSION);

    bindNavClick();
    bindHomeCards();

    // 默认初始化教师联动（避免首次进入空）
    renderTeacherAnalytics();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
