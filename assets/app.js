(() => {
  const APP_VERSION = "v0.9.2-demo";

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pct(n) { return `${Math.round(n)}%`; }
  function escapeHtml(s){
    return s.replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  // ---------- mock data ----------
  const ANOMALY_TYPES = [
    { key: "all", label: "全部" },
    { key: "missing", label: "缺交" },
    { key: "error", label: "错误率" },
    { key: "time", label: "时长" },
    { key: "polarize", label: "两极分化" },
  ];

  const DAYS = [
    { day: "周一", mastery: 68, layers: { A: 8, B: 15, C: 9 }, anomalies: [
      { id: "m1", type:"missing", title: "作业缺交激增", tag: "高风险", sub: "涉及 3 人（C组为主），建议当天跟进", students: ["王晨", "赵琪", "刘一诺"] },
      { id: "m2", type:"error", title: "分数乘除错误率偏高", tag: "中风险", sub: "二题型错误率 38%，建议补救练习", students: ["陈浩", "李欣"] },
    ]},
    { day: "周二", mastery: 70, layers: { A: 9, B: 14, C: 9 }, anomalies: [
      { id: "t1", type:"polarize", title: "课堂小测稳定性波动", tag: "中风险", sub: "同一知识点两极分化明显", students: ["周航", "林然"] },
    ]},
    { day: "周三", mastery: 66, layers: { A: 7, B: 15, C: 10 }, anomalies: [
      { id: "w1", type:"missing", title: "C组作业完成率下降", tag: "高风险", sub: "完成率 71% → 59%，建议分层提醒", students: ["王晨", "赵琪", "孙彤"] },
      { id: "w2", type:"error", title: "应用题审题错误集中", tag: "中风险", sub: "出现共性误读题干现象", students: ["陈浩", "李欣", "周航"] },
    ]},
    { day: "周四", mastery: 71, layers: { A: 10, B: 14, C: 8 }, anomalies: [
      { id: "r1", type:"polarize", title: "A组拔高题挑战不足", tag: "低风险", sub: "建议加发 2 道拓展题", students: ["宋扬", "许晴"] },
    ]},
    { day: "周五", mastery: 73, layers: { A: 9, B: 14, C: 9 }, anomalies: [
      { id: "f1", type:"error", title: "分数应用题错误仍偏高", tag: "中风险", sub: "建议：线段图训练 + 变式题", students: ["陈浩", "李欣"] },
    ]},
    { day: "周六", mastery: 72, layers: { A: 10, B: 13, C: 9 }, anomalies: [
      { id: "s1", type:"time", title: "学习时长异常下降", tag: "中风险", sub: "周末学习轨迹断点明显", students: ["赵琪"] },
    ]},
    { day: "周日", mastery: 74, layers: { A: 11, B: 13, C: 8 }, anomalies: [
      { id: "u1", type:"missing", title: "整体回升但C组仍需补救", tag: "中风险", sub: "建议：一客一策补救包推送", students: ["王晨", "孙彤"] },
    ]},
  ];

  // 班级名单（示例）
  const STUDENTS = [
    { name: "王晨", group: "C", mastery: 52, delta: -6, wrong: 18, streak: 5 },
    { name: "赵琪", group: "C", mastery: 55, delta: -4, wrong: 16, streak: 2 },
    { name: "刘一诺", group: "C", mastery: 58, delta: -2, wrong: 15, streak: 3 },
    { name: "孙彤", group: "C", mastery: 60, delta: -1, wrong: 14, streak: 4 },

    { name: "陈浩", group: "B", mastery: 72, delta: +1, wrong: 10, streak: 10 },
    { name: "李欣", group: "B", mastery: 74, delta: +2, wrong: 9, streak: 12 },
    { name: "周航", group: "B", mastery: 70, delta: -1, wrong: 11, streak: 8 },
    { name: "林然", group: "B", mastery: 76, delta: +1, wrong: 8, streak: 9 },

    { name: "宋扬", group: "A", mastery: 90, delta: +2, wrong: 3, streak: 14 },
    { name: "许晴", group: "A", mastery: 88, delta: +1, wrong: 4, streak: 13 },
    { name: "段可", group: "A", mastery: 92, delta: +1, wrong: 2, streak: 15 },
    { name: "杨乐", group: "A", mastery: 87, delta: 0, wrong: 5, streak: 11 },
  ];

  // ---------- state ----------
  const state = {
    view: "home",
    teacherMode: "prep",
    selectedDayIndex: 4,        // 默认周五
    anomalyType: "all",         // 异常筛选
    rosterFilter: null,         // A/B/C
    rosterSearch: "",
    highlightNames: new Set(),  // 异常高亮
    ocrScanning: false,

    selectedStudent: "小明",    // 学生端视角
  };

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", () => {
    $("#app-version").textContent = APP_VERSION;

    bindNav();
    bindHome();
    bindTeacher();
    bindStudent();
    bindGov();
    bindDrawer();

    renderTeacherAnalytics();
    updateKpis();
    renderStudentView(state.selectedStudent);

    startGovFeed();
  });

  // ---------- router / nav ----------
  function bindNav(){
    $("#nav-menu").addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-item");
      if(!btn) return;
      switchView(btn.dataset.view);
    });
  }

  function switchView(view){
    state.view = view;

    $$(".nav-item").forEach(x => x.classList.remove("active"));
    $(`.nav-item[data-view="${view}"]`)?.classList.add("active");

    $$(".view").forEach(v => v.classList.remove("active"));
    $(`#view-${view}`)?.classList.add("active");

    const titles = { home:"首页入口", teacher:"教师工作台", student:"学习伴侣", gov:"治理驾驶舱" };
    $("#page-title").textContent = titles[view] || "工作区";

    $("#top-header").style.display = (view === "gov") ? "none" : "flex";
  }

  // ---------- HOME ----------
  function bindHome(){
    $("#home-go").addEventListener("click", () => {
      const v = $("#home-input").value.trim();
      if(v.includes("批改")) {
        switchView("teacher");
        setTeacherMode("mark");
      } else {
        switchView("teacher");
        setTeacherMode("prep");
        if(v) {
          $("#teacher-input").value = v;
          sendTeacherMsg();
        }
      }
    });

    $("#home-input").addEventListener("keydown", (e) => {
      if(e.key === "Enter") $("#home-go").click();
    });

    $$(".feature-card").forEach(card => {
      card.addEventListener("click", () => {
        const act = card.dataset.action;
        if(act === "goto-teacher-prep") { switchView("teacher"); setTeacherMode("prep"); }
        if(act === "goto-teacher-mark") { switchView("teacher"); setTeacherMode("mark"); }
        if(act === "goto-student") { switchView("student"); }
      });
    });
  }

  // ---------- TEACHER ----------
  function bindTeacher(){
    $("#btn-prep").addEventListener("click", () => setTeacherMode("prep"));
    $("#btn-mark").addEventListener("click", () => setTeacherMode("mark"));

    $("#teacher-send").addEventListener("click", sendTeacherMsg);
    $("#teacher-input").addEventListener("keydown", (e) => {
      if(e.key === "Enter") sendTeacherMsg();
    });

    $("#ocr-interface").addEventListener("click", () => runOCR());

    // KPI anomaly click => open first anomaly
    $(".kpi-warn").addEventListener("click", () => {
      const list = getFilteredAnomalies();
      if(!list.length) return;
      openDrawerAnomaly(list[0].id);
    });

    // Trend click
    $("#trend-card").addEventListener("click", (e) => {
      const p = e.target.closest(".trend-point");
      if(!p) return;
      selectDay(Number(p.dataset.idx));
    });

    // Layer click => drill
    $("#layers").addEventListener("click", (e) => {
      const it = e.target.closest(".layer-item");
      if(!it) return;
      openDrawerLayer(it.dataset.layer);
    });

    // Anomaly click => drill
    $("#anomaly-list").addEventListener("click", (e) => {
      const it = e.target.closest(".anomaly-item");
      if(!it) return;
      openDrawerAnomaly(it.dataset.id);
    });

    // chips click
    $("#anomaly-filters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if(!chip) return;
      state.anomalyType = chip.dataset.type;
      renderAnomalyChips();
      renderAnomalies();
      // 刷新高亮
      state.highlightNames = new Set();
      renderRoster();
    });

    // roster search
    $("#roster-search").addEventListener("input", (e) => {
      state.rosterSearch = e.target.value.trim();
      renderRoster();
    });

    $("#roster").addEventListener("click", (e) => {
      const it = e.target.closest(".roster-item");
      if(!it) return;
      openDrawerStudent(it.dataset.name);
    });

    $("#btn-clear-filter").addEventListener("click", () => {
      state.rosterFilter = null;
      state.highlightNames = new Set();
      state.rosterSearch = "";
      $("#roster-search").value = "";
      renderRoster();
      addMsg("#chat-box","ai","已清除筛选：恢复显示全班学生。");
    });
  }

  function setTeacherMode(mode){
    state.teacherMode = mode;

    $("#btn-prep").className = "btn " + (mode === "prep" ? "btn-primary" : "btn-ghost");
    $("#btn-mark").className = "btn " + (mode === "mark" ? "btn-primary" : "btn-ghost");

    $("#prep-placeholder").style.display = (mode === "prep") ? "grid" : "none";
    $("#lesson-result").style.display = "none";
    $("#ocr-interface").style.display = (mode === "mark") ? "flex" : "none";

    $("#ocr-tip").style.display = "block";
    $("#scan-laser").style.opacity = "0";
    $("#ocr-error").style.display = "none";
    state.ocrScanning = false;
  }

  function sendTeacherMsg(){
    const input = $("#teacher-input");
    const text = input.value.trim();
    if(!text) return;

    addMsg("#chat-box", "user", text);
    input.value = "";

    if(text.includes("异常")) {
      addMsg("#chat-box", "ai", "我已为你汇总本周异常：可先按类型筛选，再钻取到学生层面。");
      return;
    }

    if(state.teacherMode === "prep") {
      addMsg("#chat-box", "ai", "正在生成《分数应用题》教学设计...");
      setTimeout(() => {
        $("#prep-placeholder").style.display = "none";
        $("#lesson-result").style.display = "block";
        renderLessonCard();
      }, 700);
    } else {
      addMsg("#chat-box", "ai", "已进入批改模式：点击右侧试卷区域开始扫描。");
    }
  }

  function addMsg(boxSel, role, text){
    const box = $(boxSel);
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;
    wrap.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function renderLessonCard(){
    $("#lesson-result").innerHTML = `
      <div class="drawer-sec" style="margin:0;">
        <h4>📘 教学设计：分数应用题（示例）</h4>
        <p><b>00:00 课堂导入</b>：用“切蛋糕/分披萨”引入分数意义与数量关系</p>
        <p style="margin-top:8px;"><b>05:00 核心探究</b>：线段图建模 → 量的关系 → 规范表达</p>
        <div class="drawer-actions">
          <button class="btn btn-primary" id="btn-export">✨ 导出 PPT</button>
          <button class="btn btn-ghost" id="btn-add-weak">➕ 插入薄弱点强化</button>
        </div>
      </div>
    `;
    $("#btn-export")?.addEventListener("click", () => {
      addMsg("#chat-box", "ai", "已生成 PPT 大纲（示例）：可进一步按班级薄弱点自动加练。");
    });
    $("#btn-add-weak")?.addEventListener("click", () => {
      addMsg("#chat-box", "ai", "已补充“分数乘除法易错点”强化环节，并追加 2 道变式题。");
    });
  }

  // ---------- OCR ----------
  function runOCR(){
    if(state.teacherMode !== "mark") return;
    if(state.ocrScanning) return;

    state.ocrScanning = true;
    $("#ocr-tip").style.display = "none";

    $("#scan-laser").style.opacity = "1";
    $("#scan-laser").animate(
      [{ transform:"translateY(0px)", opacity:0.12 }, { transform:"translateY(260px)", opacity:0 }],
      { duration: 1100, iterations: 1, easing: "linear" }
    );

    setTimeout(() => {
      $("#scan-laser").style.opacity = "0";
      $("#ocr-error").style.display = "block";

      addMsg("#chat-box", "ai", "OCR 扫描完成：第2题错误集中（38%），建议按分层推送补救包。");

      // 触发一个异常钻取（保持联动体验）
      const list = getFilteredAnomalies();
      if(list.length) openDrawerAnomaly(list[0].id);

      state.ocrScanning = false;
    }, 1200);
  }

  // ---------- Teacher Analytics ----------
  function updateKpis(){
    const day = DAYS[state.selectedDayIndex];
    $("#kpi-mastery").textContent = String(day.mastery);
    $("#kpi-anomaly").textContent = String(day.anomalies.length);
  }

  function selectDay(idx){
    state.selectedDayIndex = clamp(idx, 0, DAYS.length - 1);

    // 选新日期：保留异常类型筛选，但刷新高亮与分层筛选
    state.highlightNames = new Set();
    state.rosterFilter = null;
    $("#roster-search").value = "";
    state.rosterSearch = "";

    updateKpis();
    renderTrend();
    renderLayers();
    renderAnomalyChips();
    renderAnomalies();
    renderRoster();

    addMsg("#chat-box", "ai", `已切换到 ${DAYS[state.selectedDayIndex].day}：掌握度 ${pct(DAYS[state.selectedDayIndex].mastery)}。`);
  }

  function getFilteredAnomalies(){
    const day = DAYS[state.selectedDayIndex];
    if(state.anomalyType === "all") return day.anomalies;
    return day.anomalies.filter(a => a.type === state.anomalyType);
  }

  function renderTeacherAnalytics(){
    renderTrend();
    renderLayers();
    renderAnomalyChips();
    renderAnomalies();
    renderRoster();
  }

  function renderTrend(){
    const svg = $("#trend-svg");
    const w = 520, h = 160;
    svg.innerHTML = "";

    const pad = { l: 24, r: 18, t: 20, b: 28 };
    const pts = DAYS.map((d, i) => {
      const x = pad.l + (i * (w - pad.l - pad.r) / (DAYS.length - 1));
      const yMin = 60, yMax = 80;
      const yVal = clamp(d.mastery, yMin, yMax);
      const y = pad.t + (1 - (yVal - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);
      return { x, y, v: d.mastery, i, hasAnomaly: d.anomalies.length > 0 };
    });

    // baseline
    const base = document.createElementNS("http://www.w3.org/2000/svg","path");
    base.setAttribute("d", `M${pad.l} ${h-pad.b} H${w-pad.r}`);
    base.setAttribute("stroke", "rgba(79,70,229,.22)");
    base.setAttribute("stroke-width", "2");
    base.setAttribute("opacity", "0.7");
    svg.appendChild(base);

    // area
    const areaD = [
      `M ${pts[0].x} ${h-pad.b}`,
      `L ${pts[0].x} ${pts[0].y}`,
      ...pts.slice(1).map(p => `L ${p.x} ${p.y}`),
      `L ${pts[pts.length-1].x} ${h-pad.b}`,
      "Z"
    ].join(" ");
    const area = document.createElementNS("http://www.w3.org/2000/svg","path");
    area.setAttribute("d", areaD);
    area.setAttribute("fill", "rgba(99,102,241,.18)");
    svg.appendChild(area);

    // line
    const lineD = `M ${pts.map(p => `${p.x} ${p.y}`).join(" L ")}`;
    const line = document.createElementNS("http://www.w3.org/2000/svg","path");
    line.setAttribute("d", lineD);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "#4f46e5");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);

    // points + labels
    pts.forEach(p => {
      const g = document.createElementNS("http://www.w3.org/2000/svg","g");
      g.classList.add("trend-point");
      g.dataset.idx = String(p.i);

      const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
      c.setAttribute("cx", p.x);
      c.setAttribute("cy", p.y);
      c.setAttribute("r", p.i === state.selectedDayIndex ? "6" : "4.5");
      c.setAttribute("fill", "#ffffff");
      c.setAttribute("stroke", "#4f46e5");
      c.setAttribute("stroke-width", p.i === state.selectedDayIndex ? "3" : "2");

      // tooltip
      const t = document.createElementNS("http://www.w3.org/2000/svg","title");
      t.textContent = `${DAYS[p.i].day} · 掌握度 ${DAYS[p.i].mastery}% · 异常 ${DAYS[p.i].anomalies.length} 项`;
      g.appendChild(t);

      if(p.i === state.selectedDayIndex) g.classList.add("active");

      // anomaly marker (small orange dot)
      if(p.hasAnomaly){
        const m = document.createElementNS("http://www.w3.org/2000/svg","circle");
        m.setAttribute("cx", p.x + 8);
        m.setAttribute("cy", p.y - 8);
        m.setAttribute("r", "3");
        m.setAttribute("fill", "#f59e0b");
        m.setAttribute("opacity", "0.85");
        g.appendChild(m);
      }

      g.appendChild(c);
      svg.appendChild(g);

      const label = document.createElementNS("http://www.w3.org/2000/svg","text");
      label.setAttribute("x", p.x);
      label.setAttribute("y", h - 10);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-weight", "900");
      label.setAttribute("fill", "rgba(15,23,42,.65)");
      label.textContent = DAYS[p.i].day;
      svg.appendChild(label);
    });

    // right label
    const last = pts[pts.length-1];
    const txt = document.createElementNS("http://www.w3.org/2000/svg","text");
    txt.setAttribute("x", last.x);
    txt.setAttribute("y", last.y - 10);
    txt.setAttribute("text-anchor", "end");
    txt.setAttribute("font-size", "12");
    txt.setAttribute("font-weight", "1000");
    txt.setAttribute("fill", "#0f172a");
    txt.textContent = `最新 ${DAYS[pts.length-1].mastery}%`;
    svg.appendChild(txt);
  }

  function renderLayers(){
    const day = DAYS[state.selectedDayIndex];
    const total = day.layers.A + day.layers.B + day.layers.C;
    const root = $("#layers");
    root.innerHTML = "";

    const mk = (layer, label, desc) => {
      const count = day.layers[layer];
      const ratio = total ? (count/total) : 0;
      const el = document.createElement("div");
      el.className = "layer-item";
      el.dataset.layer = layer;
      el.innerHTML = `
        <div class="layer-top">
          <div class="layer-name">${layer} 组 · ${label}</div>
          <div class="layer-meta">${count} 人 · ${(ratio*100).toFixed(0)}%</div>
        </div>
        <div class="layer-bar"><div style="width:${(ratio*100).toFixed(0)}%"></div></div>
        <div class="layer-meta" style="margin-top:6px;">${desc}</div>
      `;
      return el;
    };

    root.appendChild(mk("A","领先","综合掌握高，可提升拔高题"));
    root.appendChild(mk("B","稳定","基础较稳，建议查漏补缺"));
    root.appendChild(mk("C","补救","薄弱集中，建议分层补救"));
  }

  function renderAnomalyChips(){
    const root = $("#anomaly-filters");
    root.innerHTML = "";
    ANOMALY_TYPES.forEach(t => {
      const el = document.createElement("button");
      el.className = `chip ${state.anomalyType === t.key ? "active" : ""}`;
      el.dataset.type = t.key;
      el.textContent = t.label;
      root.appendChild(el);
    });
  }

  function renderAnomalies(){
    const root = $("#anomaly-list");
    root.innerHTML = "";

    const list = getFilteredAnomalies();
    if(!list.length){
      root.innerHTML = `
        <div class="anomaly-item" style="cursor:default;">
          <div class="an-title">暂无匹配异常</div>
          <div class="an-sub">可切换筛选类型或选择其它日期</div>
        </div>
      `;
      return;
    }

    list.forEach(a => {
      const el = document.createElement("div");
      el.className = "anomaly-item";
      el.dataset.id = a.id;
      el.innerHTML = `
        <div class="an-row">
          <div class="an-title">${a.title}</div>
          <div class="an-tag">${a.tag}</div>
        </div>
        <div class="an-sub">${a.sub}</div>
      `;
      root.appendChild(el);
    });
  }

  function renderRoster(){
    const root = $("#roster");
    const q = state.rosterSearch;
    const hl = state.highlightNames;

    // 默认按掌握度降序
    let list = [...STUDENTS].sort((a,b) => b.mastery - a.mastery);

    // 分层筛选
    if(state.rosterFilter) list = list.filter(s => s.group === state.rosterFilter);

    // 搜索
    if(q) list = list.filter(s => s.name.includes(q));

    root.innerHTML = "";

    if(!list.length){
      root.innerHTML = `
        <div class="roster-item" style="cursor:default;">
          <div class="roster-row">
            <div class="roster-name">未找到匹配学生</div>
            <div class="roster-meta">尝试换个关键词</div>
          </div>
        </div>
      `;
      return;
    }

    list.forEach(s => {
      const el = document.createElement("div");
      el.className = "roster-item" + (hl.has(s.name) ? " hl" : "");
      el.dataset.name = s.name;
      el.innerHTML = `
        <div class="roster-row">
          <div class="roster-name">
            <span class="group-badge">${s.group}</span>
            ${s.name}
          </div>
          <div class="roster-meta">${s.mastery}%（${s.delta>=0?`+${s.delta}`:s.delta}%）</div>
        </div>
      `;
      root.appendChild(el);
    });
  }

  // ---------- Drawer ----------
  function bindDrawer(){
    $("#drawer-close").addEventListener("click", closeDrawer);
    $("#drawer-backdrop").addEventListener("click", closeDrawer);
  }

  function openDrawer(title, bodyHtml){
    $("#drawer-title").textContent = title;
    $("#drawer-body").innerHTML = bodyHtml;
    $("#drawer-backdrop").classList.add("show");
    $("#drawer").classList.add("show");
  }

  function closeDrawer(){
    $("#drawer-backdrop").classList.remove("show");
    $("#drawer").classList.remove("show");
  }

  function bindDrawerActions(){
    $$("#drawer-body [data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;

        if(act === "push-task") addMsg("#chat-box","ai","已生成 A/B/C 三套分层作业（示例），可一键下发。");
        if(act === "create-plan") addMsg("#chat-box","ai","已生成本周提升路径：目标→练习→反馈→复盘（示例）。");
        if(act === "notify-parent") addMsg("#chat-box","ai","已生成家校沟通要点（示例），可直接发送。");

        if(act === "push-remedy") addMsg("#chat-box","ai","补救练习包已推送（示例）：基础 3 组 + 2 道变式。");
        if(act === "reassign") addMsg("#chat-box","ai","已生成变式题组（示例）：同结构不同数字，强化建模。");
        if(act === "coach") addMsg("#chat-box","ai","讲评话术已生成（示例）：错因→示范→自测巩固。");

        if(act === "to-student") {
          const name = btn.dataset.name;
          if(name) {
            state.selectedStudent = name;
            renderStudentView(name);
            switchView("student");
            closeDrawer();
            addMsg("#qa-box","ai",`已切换到 ${name} 的学习伴侣视角：我会按你的薄弱点给出本周计划（示例）。`);
          }
        }
      }, { once:true });
    });
  }

  function openDrawerLayer(layer){
    state.rosterFilter = layer;
    state.highlightNames = new Set();
    renderRoster();

    const day = DAYS[state.selectedDayIndex];
    const groupName = layer === "A" ? "领先" : layer === "B" ? "稳定" : "补救";

    openDrawer(
      `班级分层钻取：${layer}组 · ${groupName}`,
      `
        <div class="drawer-sec">
          <h4>组别概览（${day.day}）</h4>
          <p>人数：<b>${day.layers[layer]}</b> 人</p>
          <p style="margin-top:6px;">建议：${layer==="A"?"拔高拓展题 + 讲题分享":layer==="B"?"查漏补缺 + 错题归因":"补救包 + 高频易错训练"}</p>
          <div class="drawer-actions">
            <button class="btn btn-primary" data-act="push-task">一键推送分层作业</button>
            <button class="btn btn-ghost" data-act="create-plan">生成组内提升路径</button>
            <button class="btn btn-ghost" data-act="notify-parent">发起家校沟通</button>
          </div>
        </div>
        <div class="drawer-sec">
          <h4>联动说明</h4>
          <p>左侧名单已自动筛选为 <b>${layer}组</b>，你可直接点击学生钻取画像。</p>
        </div>
      `
    );

    bindDrawerActions();
    addMsg("#chat-box","ai",`已按 ${layer} 组筛选班级名单：你可以继续钻取到学生画像层面。`);
  }

  function openDrawerAnomaly(anomalyId){
    const day = DAYS[state.selectedDayIndex];
    const list = getFilteredAnomalies();
    const a = list.find(x => x.id === anomalyId) || day.anomalies.find(x => x.id === anomalyId);
    if(!a) return;

    // 高亮受影响学生
    state.highlightNames = new Set(a.students);
    renderRoster();

    const st = a.students.map(n => {
      const s = STUDENTS.find(x => x.name === n);
      const meta = s ? `（${s.group}组 · ${s.mastery}%）` : "";
      return `<li><b>${n}</b> <span style="color:#64748b;font-weight:900;font-size:12px;">${meta}</span></li>`;
    }).join("");

    openDrawer(
      `异常钻取：${a.title}`,
      `
        <div class="drawer-sec">
          <h4>异常说明</h4>
          <p>${a.sub}</p>
          <p style="margin-top:6px;">风险等级：<b>${a.tag}</b></p>
          <div class="drawer-actions">
            <button class="btn btn-primary" data-act="push-remedy">推送补救练习</button>
            <button class="btn btn-ghost" data-act="reassign">生成变式题组</button>
            <button class="btn btn-ghost" data-act="coach">生成讲评话术</button>
          </div>
        </div>

        <div class="drawer-sec">
          <h4>影响学生（名单已高亮）</h4>
          <ul style="margin:8px 0 0 18px; color:#0f172a; font-weight:900;">${st}</ul>
        </div>

        <div class="drawer-sec">
          <h4>建议动作（可执行）</h4>
          <p>1）先对 C 组推送 10 分钟补救包；2）B 组做错因归类；3）A 组加 2 道拓展题防止“吃不饱”。</p>
        </div>
      `
    );

    bindDrawerActions();
    addMsg("#chat-box","ai",`已定位异常「${a.title}」：名单已高亮，建议优先跟进受影响学生。`);
  }

  function openDrawerStudent(name){
    const s = STUDENTS.find(x => x.name === name);
    if(!s) return;

    const focus = s.group === "C"
      ? "优先补救：分数乘除基础计算 + 应用题建模"
      : s.group === "B"
        ? "稳定提升：错因归类 + 变式训练"
        : "拔高挑战：综合题 + 分享讲题";

    openDrawer(
      `学生画像：${s.name}`,
      `
        <div class="drawer-sec">
          <h4>关键指标</h4>
          <p>分层：<b>${s.group}组</b> ｜ 掌握度：<b>${s.mastery}%</b>（本周 ${s.delta>=0?`+${s.delta}`:s.delta}%）</p>
          <p style="margin-top:6px;">本周错题：<b>${s.wrong}</b> ｜ 连续打卡：<b>${s.streak}</b> 天</p>
          <div class="drawer-actions">
            <button class="btn btn-primary" data-act="to-student" data-name="${s.name}">切换到学生端视角</button>
            <button class="btn btn-ghost" data-act="push-remedy">推送个性化练习</button>
            <button class="btn btn-ghost" data-act="notify-parent">生成家校沟通要点</button>
          </div>
        </div>

        <div class="drawer-sec">
          <h4>本周重点建议</h4>
          <p>${focus}</p>
        </div>

        <div class="drawer-sec">
          <h4>可执行动作（示例）</h4>
          <p>✅ 今日：10分钟基础计算<br/>✅ 明日：2道变式应用题<br/>✅ 周末：错题复盘 + 小测验证</p>
        </div>
      `
    );

    bindDrawerActions();
    addMsg("#chat-box","ai",`已打开 ${s.name} 学生画像：可一键切换到学生端视角查看成长档案。`);
  }

  // ---------- STUDENT ----------
  function bindStudent(){
    $("#student-send").addEventListener("click", () => {
      const v = $("#student-input").value.trim();
      if(!v) return;
      addMsg("#qa-box","user",v);
      $("#student-input").value = "";
      setTimeout(() => {
        addMsg("#qa-box","ai","我先给你分步骤思路，再补充相关知识点与同类练习（示例）。");
      }, 320);
    });

    $("#student-input").addEventListener("keydown",(e)=>{
      if(e.key==="Enter") $("#student-send").click();
    });

    $("#btn-student-ask")?.addEventListener("click",()=>{
      addMsg("#qa-box","ai","你可以直接发题目照片/文字，我会按学段标准给你讲解（示例）。");
    });

    $("#btn-student-review")?.addEventListener("click",()=>{
      addMsg("#qa-box","ai","已打开错题本（示例）：本周集中在分数乘除与应用题建模。");
    });
  }

  function renderStudentView(name){
    const s = STUDENTS.find(x => x.name === name) || { name, group:"B", mastery:76, wrong:14, streak:12 };

    $("#student-name").textContent = s.name;
    $("#student-streak").textContent = `🔥 打卡 ${s.streak} 天`;
    $("#st-math").textContent = String(s.mastery);
    $("#st-wrong").textContent = String(s.wrong);
    $("#st-group").textContent = s.group;

    const timeline = $("#student-timeline");
    timeline.innerHTML = "";

    const tl = buildStudentTimeline(s);
    tl.forEach(item => {
      const div = document.createElement("div");
      div.className = "tl-item";
      div.innerHTML = `
        <div class="tl-dot"></div>
        <div class="tl-main">
          <div class="tl-title">${item.title}</div>
          <div class="tl-sub">${item.sub}</div>
        </div>
      `;
      timeline.appendChild(div);
    });
  }

  function buildStudentTimeline(s){
    if(s.group === "C") {
      return [
        { title: "周度复盘：基础计算波动", sub: "建议：先做 3 组基础计算，再挑战综合题型" },
        { title: "能力对标：应用题建模待加强", sub: "建议：线段图训练每日 2 题" },
        { title: "资源推送：微课《分数乘除法》", sub: "已匹配练习包与错题复盘卡片" },
      ];
    }
    if(s.group === "A") {
      return [
        { title: "周度复盘：稳定提升", sub: "建议：每周 2 道拔高综合题，训练迁移能力" },
        { title: "能力对标：推理表达更精炼", sub: "建议：每题补一句“为何这么做”" },
        { title: "资源推送：拓展题《变式应用》", sub: "已匹配挑战包 + 讲题分享任务" },
      ];
    }
    return [
      { title: "周度复盘：错因归类有效", sub: "建议：错题按“概念/计算/建模”三类整理" },
      { title: "能力对标：综合题仍可提升", sub: "建议：每天 1 题变式练习巩固迁移" },
      { title: "资源推送：练习《应用题变式》", sub: "已匹配适配难度与练习包" },
    ];
  }

  // ---------- GOV ----------
  let feedTimer = null;
  function bindGov(){
    $("#gov-map").textContent = "（示例）区域态势图：学情分布 / 异常热力 / 资源覆盖";
  }

  function startGovFeed(){
    const list = $("#feed-list");
    if(!list) return;

    const schools = ["第一中学","实验小学","育才学校","高新一小"];
    const acts = ["生成了数学教案","发布了分层作业","触发了作业量预警","查看了学生成长档案"];
    if(feedTimer) clearInterval(feedTimer);

    feedTimer = setInterval(() => {
      const s = schools[Math.floor(Math.random()*schools.length)];
      const a = acts[Math.floor(Math.random()*acts.length)];
      const div = document.createElement("div");
      div.className = "feed-item";
      div.innerHTML = `<span style="color:#0ea5e9;">[${s}]</span> 李老师 ${a}`;
      list.prepend(div);
      while(list.children.length > 6) list.removeChild(list.lastChild);
    }, 1500);
  }

})();
