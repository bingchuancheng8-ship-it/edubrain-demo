/* =========================================================
   AI EduBrain Demo v0.9.2
   - 稳定基线 + 教师页「趋势图 + 班级分层 + 异常钻取」真联动
   ========================================================= */

(function () {
  /** --------------------------
   *   App State (Mock)
   *  -------------------------- */
  const App = {
    version: "v0.9.2-demo",
    view: "home",
    teacherMode: "prep", // prep | mark | ana
    trendIndex: 6, // 0..6
    tierFocus: null, // 'A' | 'B' | 'C' | null
    anomalyFilter: "all", // all | missing | error | time
    isScanning: false,
    feedTimer: null,
  };

  const Trend = {
    labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    values: [62, 64, 60, 66, 68, 70, 73], // 掌握度
  };

  // “每天一份班级画像”，用于联动（趋势点 -> 分层 / 异常 / KPI）
  const DailyClassData = [
    buildDay(0, { A: 8, B: 12, C: 12 }, [
      { id: "S-01", name: "宋扬", tier: "C", type: "missing", reason: "本次作业缺交", impact: "掌握度回落", hint: "建议当日补交 + 错题复盘" },
      { id: "S-02", name: "高航", tier: "C", type: "error", reason: "分数÷分数错误率高", impact: "应用题建模失败", hint: "先做3组基础计算再迁移" },
    ]),
    buildDay(1, { A: 9, B: 13, C: 10 }, [
      { id: "S-03", name: "陈希", tier: "B", type: "time", reason: "完成时长异常偏长", impact: "卡在步骤转换", hint: "建议口头讲解 + 步骤模板" },
    ]),
    buildDay(2, { A: 7, B: 15, C: 10 }, [
      { id: "S-04", name: "王铭", tier: "B", type: "error", reason: "线段图建模不稳定", impact: "易错题集中", hint: "给2道同结构变式题" },
      { id: "S-05", name: "林安", tier: "C", type: "missing", reason: "两次缺交", impact: "掌握度下降风险", hint: "建议家校提醒 + 简化任务" },
    ]),
    buildDay(3, { A: 9, B: 14, C: 9 }, [
      { id: "S-06", name: "周一帆", tier: "A", type: "error", reason: "拔高题失分集中", impact: "冲A+受阻", hint: "补充两道综合题变式" },
    ]),
    buildDay(4, { A: 10, B: 14, C: 8 }, [
      { id: "S-07", name: "韩朔", tier: "C", type: "time", reason: "作业时长偏短", impact: "疑似敷衍/跳步", hint: "建议抽查过程 + 二次订正" },
    ]),
    buildDay(5, { A: 10, B: 15, C: 7 }, []),
    buildDay(6, { A: 9, B: 14, C: 9 }, [
      { id: "S-08", name: "高航", tier: "C", type: "error", reason: "分数应用题错误仍偏高", impact: "影响整体掌握度", hint: "优先跟进：错因→示范→自测巩固" },
    ]),
  ];

  function buildDay(dayIndex, tiers, anomalies) {
    const mastery = Trend.values[dayIndex];
    const marked = Math.round(16 + (dayIndex * 2.2));
    return {
      dayIndex,
      mastery,
      marked,
      totalWork: 32,
      tiers,
      anomalies,
    };
  }

  /** --------------------------
   *  DOM Helpers
   *  -------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  }

  function showToast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      t.style.display = "none";
    }, 1500);
  }

  /** --------------------------
   *  Modal
   *  -------------------------- */
  function openModal() {
    const m = $("#modal");
    if (m) m.style.display = "flex";
  }

  function closeModal() {
    const m = $("#modal");
    if (m) m.style.display = "none";
  }

  /** --------------------------
   *  View Switch
   *  -------------------------- */
  function switchView(id, navEl) {
    App.view = id;

    // nav active
    $$(".nav-item").forEach((el) => el.classList.remove("active"));
    if (navEl) navEl.classList.add("active");

    // view active
    $$(".view-container").forEach((el) => el.classList.remove("active"));
    const cur = $("#view-" + id);
    if (cur) cur.classList.add("active");

    // title
    const titles = { home: "首页入口", teacher: "教师工作台", student: "学习伴侣", gov: "治理驾驶舱" };
    setText("#page-title", titles[id] || "工作区");

    // gov behavior
    const top = $("#top-header");
    if (id === "gov") {
      if (top) top.style.display = "none";
      initMap();
      startFeed();
    } else {
      if (top) top.style.display = "flex";
      stopFeed();
      clearMap();
    }

    // teacher init
    if (id === "teacher") {
      ensureTeacherMounted();
    }
  }

  /** --------------------------
   *  Teacher Modes
   *  -------------------------- */
  function setTeacherMode(mode) {
    App.teacherMode = mode;

    // toggle buttons
    const btnPrep = $("#btn-prep");
    const btnMark = $("#btn-mark");
    const btnAna = $("#btn-ana");

    if (btnPrep && btnMark && btnAna) {
      btnPrep.className = "btn " + (mode === "prep" ? "btn-primary" : "btn-ghost");
      btnMark.className = "btn " + (mode === "mark" ? "btn-primary" : "btn-ghost");
      btnAna.className = "btn " + (mode === "ana" ? "btn-primary" : "btn-ghost");
    }

    // toggle views
    const views = {
      prep: "#prep-view",
      mark: "#mark-view",
      ana: "#ana-view",
    };
    Object.values(views).forEach((v) => {
      const el = $(v);
      if (el) el.classList.remove("active");
    });
    const active = $(views[mode]);
    if (active) active.classList.add("active");

    if (mode === "mark") resetOCR();
    renderTeacherLinkedArea();
  }

  /** --------------------------
   *  Home Scenario
   *  -------------------------- */
  function startScenario(type) {
    const teacherNav = document.querySelector('[data-view="teacher"]') || $$(".nav-item")[1];
    switchView("teacher", teacherNav);

    if (type === "prep") {
      setTeacherMode("prep");
      setTimeout(() => {
        const input = $("#teacher-input");
        if (input) input.value = "生成分数应用题教案并补齐薄弱点强化环节";
        triggerMsg();
      }, 260);
    } else if (type === "mark") {
      setTeacherMode("mark");
      addMsg("ai", "已进入批改模式：点击右侧模拟扫描，会生成异常并联动到趋势/分层/异常钻取。");
    } else {
      setTeacherMode("prep");
    }
  }

  function startScenarioFromHome() {
    const v = ($("#home-input")?.value || "").trim();
    if (!v) return startScenario("prep");

    if (v.includes("批改") || v.includes("作业")) return startScenario("mark");
    if (v.includes("趋势") || v.includes("分层") || v.includes("异常") || v.includes("分析")) {
      const teacherNav = document.querySelector('[data-view="teacher"]') || $$(".nav-item")[1];
      switchView("teacher", teacherNav);
      setTeacherMode("ana");
      addMsg("ai", "已为你打开联动分析：点击趋势点位、分层卡片、异常列表，可进行联动钻取。");
      return;
    }

    startScenario("prep");
  }

  /** --------------------------
   *  Chat
   *  -------------------------- */
  function addMsg(role, text) {
    const box = $("#chat-box");
    if (!box) return;
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="msg-bubble">${text}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function triggerMsg() {
    const input = $("#teacher-input");
    if (!input || !input.value.trim()) return;

    const q = input.value.trim();
    addMsg("user", q);
    input.value = "";

    setTimeout(() => {
      if (q.includes("趋势") || q.includes("分层") || q.includes("异常") || q.includes("分析")) {
        addMsg("ai", "已加载近7天趋势与班级画像。你可以点击折线点位联动查看分层变化与异常列表。");
        setTeacherMode("ana");
        renderTeacherLinkedArea();
        return;
      }

      if (q.includes("教案") || q.includes("备课") || q.includes("分数")) {
        addMsg("ai", "已生成《分数应用题》教学设计（示例），并根据班级薄弱点插入强化环节。");
        renderTeacherLinkedArea();
        return;
      }

      addMsg("ai", "收到。我已为你更新右侧联动分析区（趋势/分层/异常）。");
      renderTeacherLinkedArea();
    }, 320);
  }

  /** --------------------------
   *  Teacher Linked Area
   *  -------------------------- */
  function ensureTeacherMounted() {
    // version badge
    const ver = $("#app-version");
    if (ver) ver.textContent = App.version;

    renderTeacherLinkedArea();
    bindTeacherSideEventsOnce();
  }

  function renderTeacherLinkedArea() {
    const day = DailyClassData[App.trendIndex];
    if (!day) return;

    // KPI
    setText("#kpi-marked", String(day.marked));
    setText("#kpi-mastery", `${day.mastery}%`);
    setText("#kpi-anomaly", String(day.anomalies.length));

    // Trend label
    setText("#trend-day-label", Trend.labels[day.dayIndex]);
    setText("#trend-value-label", `${day.mastery}%`);

    // tiers
    const total = day.tiers.A + day.tiers.B + day.tiers.C;
    const rateA = Math.round((day.tiers.A / total) * 100);
    const rateB = Math.round((day.tiers.B / total) * 100);
    const rateC = Math.max(0, 100 - rateA - rateB);

    setText("#tier-a-count", String(day.tiers.A));
    setText("#tier-b-count", String(day.tiers.B));
    setText("#tier-c-count", String(day.tiers.C));

    setText("#tier-a-rate", `${rateA}%`);
    setText("#tier-b-rate", `${rateB}%`);
    setText("#tier-c-rate", `${rateC}%`);

    const barA = $("#tier-a-bar");
    const barB = $("#tier-b-bar");
    const barC = $("#tier-c-bar");
    if (barA) barA.style.width = `${Math.max(8, rateA)}%`;
    if (barB) barB.style.width = `${Math.max(8, rateB)}%`;
    if (barC) barC.style.width = `${Math.max(8, rateC)}%`;

    // tier highlight
    $$(".tier-row").forEach((el) => el.classList.remove("active"));
    if (App.tierFocus) {
      const idx = App.tierFocus === "A" ? 0 : App.tierFocus === "B" ? 1 : 2;
      const row = $$(".tier-row")[idx];
      if (row) row.classList.add("active");
    }

    renderAnomalyList();
    drawTrendChart();
  }

  function drawTrendChart() {
    const canvas = $("#trend-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 34, r: 18, t: 16, b: 30 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;

    // grid
    ctx.save();
    ctx.strokeStyle = "rgba(231,236,245,1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ch * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
    }
    ctx.restore();

    const minY = 50;
    const maxY = 80;
    function xAt(i) { return pad.l + (cw * i) / (Trend.values.length - 1); }
    function yAt(v) {
      const t = (v - minY) / (maxY - minY);
      return pad.t + ch * (1 - t);
    }

    // area
    ctx.save();
    ctx.beginPath();
    Trend.values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(xAt(Trend.values.length - 1), pad.t + ch);
    ctx.lineTo(xAt(0), pad.t + ch);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    grad.addColorStop(0, "rgba(99,102,241,0.28)");
    grad.addColorStop(1, "rgba(99,102,241,0.02)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // line
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(79,70,229,1)";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    Trend.values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // points
    const hitPoints = [];
    Trend.values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      const isActive = i === App.trendIndex;

      ctx.save();
      ctx.fillStyle = isActive ? "rgba(79,70,229,1)" : "rgba(148,163,184,1)";
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (isActive) {
        ctx.save();
        ctx.fillStyle = "rgba(79,70,229,1)";
        ctx.font = "bold 12px -apple-system,BlinkMacSystemFont,PingFang SC";
        ctx.textAlign = "left";
        ctx.fillText(`${v}%`, x + 10, y - 10);
        ctx.restore();
      }

      hitPoints.push({ i, x, y, r: 10 });
    });

    // x labels
    ctx.save();
    ctx.fillStyle = "rgba(100,116,139,1)";
    ctx.font = "bold 11px -apple-system,BlinkMacSystemFont,PingFang SC";
    ctx.textAlign = "center";
    Trend.labels.forEach((lb, i) => {
      ctx.fillText(lb.replace("周", ""), xAt(i), H - 10);
    });
    ctx.restore();

    canvas.onclick = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
      const my = ((ev.clientY - rect.top) / rect.height) * canvas.height;

      const hit = hitPoints.find((p) => (mx - p.x) ** 2 + (my - p.y) ** 2 <= p.r ** 2);
      if (!hit) return;

      App.trendIndex = hit.i;
      App.tierFocus = null;
      renderTeacherLinkedArea();

      addMsg("ai", `已切换到 <b>${Trend.labels[hit.i]}</b>：掌握度 <b>${Trend.values[hit.i]}%</b>。分层与异常已联动刷新。`);
      showToast(`联动刷新：${Trend.labels[hit.i]} · ${Trend.values[hit.i]}%`);
    };
  }

  function selectTier(tier) {
    App.tierFocus = App.tierFocus === tier ? null : tier;
    renderTeacherLinkedArea();

    const day = DailyClassData[App.trendIndex];
    if (!day) return;

    if (App.tierFocus) {
      addMsg("ai", `已聚焦 <b>${tier}组</b>（${day.tiers[tier]}人）。异常列表已按分层联动过滤。`);
      showToast(`分层聚焦：${tier}组`);
    } else {
      addMsg("ai", "已取消分层聚焦，异常列表恢复为全班维度。");
      showToast("分层聚焦：已取消");
    }
  }

  function setAnomalyFilter(filter, el) {
    App.anomalyFilter = filter;
    $$(".chip").forEach((c) => c.classList.remove("active"));
    if (el) el.classList.add("active");
    renderAnomalyList();
    showToast(`异常筛选：${tagFor(filter).text || "全部"}`);
  }

  function renderAnomalyList() {
    const list = $("#anomaly-list");
    if (!list) return;
    list.innerHTML = "";

    const day = DailyClassData[App.trendIndex];
    if (!day) return;

    let items = [...day.anomalies];

    if (App.anomalyFilter !== "all") items = items.filter((x) => x.type === App.anomalyFilter);
    if (App.tierFocus) items = items.filter((x) => x.tier === App.tierFocus);

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "anomaly-item";
      empty.style.cursor = "default";
      empty.innerHTML = `
        <div class="anomaly-top">
          <div class="anomaly-name">暂无匹配异常</div>
          <div class="anomaly-tag blue">已收敛</div>
        </div>
        <div class="anomaly-sub">你可以切换趋势点位 / 分层 / 筛选条件查看异常。</div>
      `;
      list.appendChild(empty);
      return;
    }

    items.forEach((x) => {
      const item = document.createElement("div");
      item.className = "anomaly-item";

      const tag = tagFor(x.type);
      item.innerHTML = `
        <div class="anomaly-top">
          <div class="anomaly-name">${x.name} <span style="color:#64748b;font-weight:900;">· ${x.tier}组</span></div>
          <div class="anomaly-tag ${tag.cls}">${tag.text}</div>
        </div>
        <div class="anomaly-sub">${x.reason} · 影响：${x.impact}</div>
      `;
      item.onclick = () => openAnomalyDetail(x);
      list.appendChild(item);
    });
  }

  function tagFor(type) {
    if (type === "missing") return { text: "缺交", cls: "orange" };
    if (type === "error") return { text: "错误率", cls: "red" };
    if (type === "time") return { text: "时长", cls: "blue" };
    if (type === "all") return { text: "全部", cls: "blue" };
    return { text: "异常", cls: "red" };
  }

  function openAnomalyDetail(x) {
    const day = DailyClassData[App.trendIndex];
    const dayLabel = Trend.labels[day.dayIndex];

    setText("#modal-title", `异常详情 · ${x.name}`);

    const body = $("#modal-body");
    if (body) {
      body.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <span style="padding:8px 10px;border-radius:999px;border:1px solid #e7ecf5;font-weight:1000;">日期：${dayLabel}</span>
          <span style="padding:8px 10px;border-radius:999px;border:1px solid #e7ecf5;font-weight:1000;">分层：${x.tier}组</span>
          <span style="padding:8px 10px;border-radius:999px;border:1px solid #e7ecf5;font-weight:1000;">类型：${tagFor(x.type).text}</span>
          <span style="padding:8px 10px;border-radius:999px;border:1px solid #e7ecf5;font-weight:1000;">当日掌握度：${day.mastery}%</span>
        </div>

        <div style="font-weight:1000;margin-bottom:6px;">异常描述</div>
        <div style="color:#334155;margin-bottom:12px;">${x.reason}</div>

        <div style="font-weight:1000;margin-bottom:6px;">影响评估</div>
        <div style="color:#334155;margin-bottom:12px;">${x.impact}</div>

        <div style="font-weight:1000;margin-bottom:6px;">建议动作（可落地）</div>
        <ul style="margin:0;padding-left:18px;color:#334155;">
          <li>${x.hint}</li>
          <li>生成 2 道同结构变式题（先基础→再迁移），并在课堂抽查关键步骤。</li>
          <li>若连续 2 次出现该异常，触发「家校协同提醒 + 低门槛补救任务」。</li>
        </ul>

        <div style="margin-top:14px;padding:12px;border-radius:16px;border:1px dashed rgba(79,70,229,0.22);background:#f7f8ff;">
          <b>一键生成话术（示例）</b><br/>
          “我发现你在 <b>${x.reason}</b> 这里卡住了，我们先用 3 组基础计算把手感找回来，再做 2 道迁移应用题。你只要把第一步写清楚就成功一半了。”
        </div>
      `;
    }

    openModal();
    addMsg("ai", `已为你打开 <b>${x.name}</b> 的异常钻取详情（联动示例）。`);
  }

  function openAnomalyDrawer() {
    const day = DailyClassData[App.trendIndex];
    setText("#modal-title", `异常预警 · ${Trend.labels[day.dayIndex]}（共${day.anomalies.length}条）`);

    const body = $("#modal-body");
    if (body) {
      body.innerHTML = `
        <div style="color:#334155;margin-bottom:10px;">
          你可以从右侧「异常钻取」列表点具体学生进入详情；此处为汇总视图。
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <span style="padding:8px 10px;border-radius:999px;border:1px solid #e7ecf5;font-weight:1000;">掌握度：${day.mastery}%</span>
          <span style="padding:8px 10px;border-radius:999px;border:1px solid #e7ecf5;font-weight:1000;">分层：A${day.tiers.A}/B${day.tiers.B}/C${day.tiers.C}</span>
        </div>
        <div style="font-weight:1000;margin-bottom:6px;">异常摘要</div>
        <ul style="margin:0;padding-left:18px;color:#334155;">
          ${
            day.anomalies.length
              ? day.anomalies.map((a) => `<li><b>${a.name}</b> · ${tagFor(a.type).text} · ${a.reason}</li>`).join("")
              : "<li>暂无异常</li>"
          }
        </ul>
      `;
    }

    openModal();
  }

  /** --------------------------
   *  OCR Simulation
   *  -------------------------- */
  function resetOCR() {
    App.isScanning = false;
    const tip = $("#ocr-tip");
    const laser = $("#ocr-laser");
    const err = $("#ocr-error");
    if (tip) tip.style.display = "block";
    if (laser) laser.style.display = "none";
    if (err) err.style.display = "none";
  }

  function runOCR() {
    if (App.isScanning) return;
    App.isScanning = true;

    const tip = $("#ocr-tip");
    const laser = $("#ocr-laser");
    const err = $("#ocr-error");

    if (tip) tip.style.display = "none";
    if (laser) laser.style.display = "block";
    if (err) err.style.display = "none";

    setTimeout(() => {
      if (laser) laser.style.display = "none";
      if (err) err.style.display = "block";

      // 写入“当日异常”
      const day = DailyClassData[App.trendIndex];
      if (day) {
        const exists = day.anomalies.some((a) => a.id === "OCR-01");
        if (!exists) {
          day.anomalies.unshift({
            id: "OCR-01",
            name: "赵宁",
            tier: "C",
            type: "error",
            reason: "第2题分数除法步骤错误（OCR识别）",
            impact: "同类题迁移失败，易形成连错",
            hint: "建议：错因定位→示范→同结构变式题巩固",
          });
        }
      }

      addMsg("ai", "OCR 扫描完成：检测到共性错误（第2题分数除法）。已生成异常并联动到分析区。");
      showToast("OCR：异常已写入并联动刷新");

      // 自动切到分析页
      setTeacherMode("ana");
      renderTeacherLinkedArea();

      App.isScanning = false;
    }, 2000);
  }

  /** --------------------------
   *  Teacher Events
   *  -------------------------- */
  function bindTeacherSideEventsOnce() {
    if (bindTeacherSideEventsOnce._done) return;
    bindTeacherSideEventsOnce._done = true;

    // tier click
    const rowA = $("#tier-a");
    const rowB = $("#tier-b");
    const rowC = $("#tier-c");
    if (rowA) rowA.onclick = () => selectTier("A");
    if (rowB) rowB.onclick = () => selectTier("B");
    if (rowC) rowC.onclick = () => selectTier("C");

    // anomaly filter chips
    $$(".chip").forEach((chip) => {
      chip.onclick = () => setAnomalyFilter(chip.dataset.filter || "all", chip);
    });

    // KPI anomaly click -> summary modal
    const kpiAn = $("#kpi-anomaly-card");
    if (kpiAn) kpiAn.onclick = () => openAnomalyDrawer();

    // modal close
    const closeBtn = $("#modal-close");
    if (closeBtn) closeBtn.onclick = closeModal;

    const modal = $("#modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // OCR click
    const ocrStage = $("#ocr-stage");
    if (ocrStage) ocrStage.onclick = runOCR;
  }

  /** --------------------------
   *  Student
   *  -------------------------- */
  function openVoiceModal() {
    const m = $("#voice-modal");
    if (m) m.style.display = "flex";
  }
  function closeVoiceModal() {
    const m = $("#voice-modal");
    if (m) m.style.display = "none";
    alert("评分：98分！（示例）");
  }

  /** --------------------------
   *  Gov Dashboard
   *  -------------------------- */
  function initMap() {
    const grid = $("#map-grid");
    if (!grid) return;

    grid.innerHTML = "";
    for (let i = 0; i < 56; i++) {
      const bar = document.createElement("div");
      const isWarn = Math.random() > 0.84;
      const h = Math.random() * 220 + 40;

      bar.className = "data-bar" + (isWarn ? " warning" : "");
      bar.style.left = Math.random() * 1100 + 50 + "px";
      bar.style.top = Math.random() * 1100 + 50 + "px";
      bar.style.height = "10px";
      grid.appendChild(bar);

      setTimeout(() => {
        bar.style.height = h + "px";
      }, 100 + Math.random() * 800);
    }
  }

  function clearMap() {
    const grid = $("#map-grid");
    if (grid) grid.innerHTML = "";
  }

  function startFeed() {
    const list = $("#feed-list");
    if (!list) return;

    const schools = ["第一中学", "实验小学", "育才学校", "高新一小"];
    const acts = ["生成了数学教案", "发布了分层作业", "触发了作业量预警", "查看了学生档案"];

    stopFeed();
    App.feedTimer = setInterval(() => {
      const d = document.createElement("div");
      d.className = "feed-item";
      const s = schools[Math.floor(Math.random() * schools.length)];
      const a = acts[Math.floor(Math.random() * acts.length)];
      d.innerHTML = `<span style="color:#38bdf8">[${s}]</span> 李老师 ${a}`;
      list.prepend(d);
      if (list.children.length > 5) list.removeChild(list.lastChild);
    }, 1800);
  }

  function stopFeed() {
    if (App.feedTimer) {
      clearInterval(App.feedTimer);
      App.feedTimer = null;
    }
  }

  /** --------------------------
   *  Init
   *  -------------------------- */
  function bindGlobal() {
    const homeInput = $("#home-input");
    if (homeInput) {
      homeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") startScenarioFromHome();
      });
    }

    const teacherInput = $("#teacher-input");
    if (teacherInput) {
      teacherInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") triggerMsg();
      });
    }
  }

  function boot() {
    const ver = $("#app-version");
    if (ver) ver.textContent = App.version;

    bindGlobal();

    if ($("#view-teacher")?.classList.contains("active")) ensureTeacherMounted();
    if ($("#view-gov")?.classList.contains("active")) {
      initMap();
      startFeed();
    }
  }

  // expose to inline onclick
  window.switchView = switchView;
  window.setTeacherMode = setTeacherMode;
  window.startScenario = startScenario;
  window.startScenarioFromHome = startScenarioFromHome;
  window.triggerMsg = triggerMsg;
  window.runOCR = runOCR;

  window.openVoiceModal = openVoiceModal;
  window.closeVoiceModal = closeVoiceModal;

  window.closeModal = closeModal;

  document.addEventListener("DOMContentLoaded", boot);
})();
