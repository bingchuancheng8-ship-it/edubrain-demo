(() => {
  const APP_VERSION = "v0.9.1-demo";

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pct(n) { return `${Math.round(n)}%`; }

  // ---------- mock data (7天) ----------
  const DAYS = [
    { day: "周一", mastery: 68, layers: { A: 8, B: 15, C: 9 }, anomalies: [
      { id: "m1", title: "作业缺交激增", tag: "高风险", sub: "涉及 3 人（C组为主），建议当天跟进", students: ["王晨", "赵琪", "刘一诺"] },
      { id: "m2", title: "分数乘除错误率偏高", tag: "中风险", sub: "二题型错误率 38%，建议补救练习", students: ["陈浩", "李欣"] },
    ]},
    { day: "周二", mastery: 70, layers: { A: 9, B: 14, C: 9 }, anomalies: [
      { id: "t1", title: "课堂小测稳定性波动", tag: "中风险", sub: "同一知识点两极分化明显", students: ["周航", "林然"] },
    ]},
    { day: "周三", mastery: 66, layers: { A: 7, B: 15, C: 10 }, anomalies: [
      { id: "w1", title: "C组作业完成率下降", tag: "高风险", sub: "完成率 71% → 59%，建议分层提醒", students: ["王晨", "赵琪", "孙彤"] },
      { id: "w2", title: "应用题审题错误集中", tag: "中风险", sub: "出现共性误读题干现象", students: ["陈浩", "李欣", "周航"] },
    ]},
    { day: "周四", mastery: 71, layers: { A: 10, B: 14, C: 8 }, anomalies: [
      { id: "r1", title: "A组拔高题挑战不足", tag: "低风险", sub: "建议加发 2 道拓展题", students: ["宋扬", "许晴"] },
    ]},
    { day: "周五", mastery: 73, layers: { A: 9, B: 14, C: 9 }, anomalies: [
      { id: "f1", title: "分数应用题错误仍偏高", tag: "中风险", sub: "建议：线段图训练 + 变式题", students: ["陈浩", "李欣"] },
    ]},
    { day: "周六", mastery: 72, layers: { A: 10, B: 13, C: 9 }, anomalies: [
      { id: "s1", title: "学习时长异常下降", tag: "中风险", sub: "周末学习轨迹断点明显", students: ["赵琪"] },
    ]},
    { day: "周日", mastery: 74, layers: { A: 11, B: 13, C: 8 }, anomalies: [
      { id: "u1", title: "整体回升但C组仍需补救", tag: "中风险", sub: "建议：一客一策补救包推送", students: ["王晨", "孙彤"] },
    ]},
  ];

  const STUDENTS = [
    { name: "王晨", group: "C", mastery: 52, delta: -6 },
    { name: "赵琪", group: "C", mastery: 55, delta: -4 },
    { name: "刘一诺", group: "C", mastery: 58, delta: -2 },
    { name: "孙彤", group: "C", mastery: 60, delta: -1 },

    { name: "陈浩", group: "B", mastery: 72, delta: +1 },
    { name: "李欣", group: "B", mastery: 74, delta: +2 },
    { name: "周航", group: "B", mastery: 70, delta: -1 },
    { name: "林然", group: "B", mastery: 76, delta: +1 },

    { name: "宋扬", group: "A", mastery: 90, delta: +2 },
    { name: "许晴", group: "A", mastery: 88, delta: +1 },
    { name: "段可", group: "A", mastery: 92, delta: +1 },
    { name: "杨乐", group: "A", mastery: 87, delta: 0 },
  ];

  // ---------- state ----------
  const state = {
    view: "home",
    teacherMode: "prep",
    selectedDayIndex: 4, // 默认周五(掌握度73)
    selectedLayer: null, // 'A' | 'B' | 'C'
    selectedAnomalyId: null,
    ocrScanning: false
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

    // 首次渲染教师分析区（即使不在教师页也没问题）
    renderTeacherAnalytics();
    updateKpis();
    startGovFeed();
  });

  // ---------- router / nav ----------
  function bindNav(){
    $("#nav-menu").addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-item");
      if(!btn) return;
      const view = btn.dataset.view;
      switchView(view);
    });
  }

  function switchView(view){
    state.view = view;

    // active nav
    $$(".nav-item").forEach(x => x.classList.remove("active"));
    $(`.nav-item[data-view="${view}"]`)?.classList.add("active");

    // active view
    $$(".view").forEach(v => v.classList.remove("active"));
    $(`#view-${view}`)?.classList.add("active");

    // header title
    const titles = {
      home:"首页入口",
      teacher:"教师工作台",
      student:"学习伴侣",
      gov:"治理驾驶舱"
    };
    $("#page-title").textContent = titles[view] || "工作区";

    // gov header style
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

    // OCR click
    $("#ocr-interface").addEventListener("click", () => runOCR());

    // KPI anomaly click => open anomaly drawer
    $(".kpi-warn").addEventListener("click", () => {
      const day = DAYS[state.selectedDayIndex];
      if(!day?.anomalies?.length) return;
      openDrawerAnomaly(day.anomalies[0].id);
    });

    // Trend / Layer / Anomaly list interactions
    $("#trend-card").addEventListener("click", (e) => {
      const p = e.target.closest(".trend-point");
      if(!p) return;
      const idx = Number(p.dataset.idx);
      selectDay(idx);
    });

    $("#layers").addEventListener("click", (e) => {
      const it = e.target.closest(".layer-item");
      if(!it) return;
      const layer = it.dataset.layer;
      openDrawerLayer(layer);
    });

    $("#anomaly-list").addEventListener("click", (e) => {
      const it = e.target.closest(".anomaly-item");
      if(!it) return;
      const id = it.dataset.id;
      openDrawerAnomaly(id);
    });
  }

  function setTeacherMode(mode){
    state.teacherMode = mode;

    // button styles
    $("#btn-prep").className = "btn " + (mode === "prep" ? "btn-primary" : "btn-ghost");
    $("#btn-mark").className = "btn " + (mode === "mark" ? "btn-primary" : "btn-ghost");

    // view switch
    $("#prep-placeholder").style.display = (mode === "prep") ? "grid" : "none";
    $("#lesson-result").style.display = "none";
    $("#ocr-interface").style.display = (mode === "mark") ? "flex" : "none";

    // reset OCR
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

    // 简单模拟：如果问“异常”，直接打开抽屉
    if(text.includes("异常")) {
      addMsg("#chat-box", "ai", "我已为你汇总本周异常，建议优先从高风险项钻取。");
      const day = DAYS[state.selectedDayIndex];
      if(day?.anomalies?.length) openDrawerAnomaly(day.anomalies[0].id);
      return;
    }

    if(state.teacherMode === "prep") {
      addMsg("#chat-box", "ai", "正在生成《分数应用题》教学设计...");
      setTimeout(() => {
        $("#prep-placeholder").style.display = "none";
        $("#lesson-result").style.display = "block";
        renderLessonCard();
      }, 800);
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

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
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
      addMsg("#chat-box", "ai", "已为你生成 PPT 大纲（示例），可进一步按班级薄弱点自动加练。");
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

    // laser anim
    $("#scan-laser").style.opacity = "1";
    $("#scan-laser").animate(
      [{ transform:"translateY(0px)", opacity:0.1 }, { transform:"translateY(260px)", opacity:0 }],
      { duration: 1200, iterations: 1, easing: "linear" }
    );

    setTimeout(() => {
      $("#scan-laser").style.opacity = "0";
      $("#ocr-error").style.display = "block";
      addMsg("#chat-box", "ai", "OCR 扫描完成：第2题错误集中（38%），建议按 A/B/C 分层推送补救。");

      // 同时联动：打开异常钻取
      const day = DAYS[state.selectedDayIndex];
      const anomaly = day?.anomalies?.[0];
      if(anomaly) openDrawerAnomaly(anomaly.id);

      state.ocrScanning = false;
    }, 1300);
  }

  // ---------- Teacher Analytics (联动核心) ----------
  function renderTeacherAnalytics(){
    renderTrend();
    renderLayers();
    renderAnomalies();
  }

  function updateKpis(){
    const day = DAYS[state.selectedDayIndex];
    $("#kpi-mastery").textContent = String(day.mastery);
    $("#kpi-anomaly").textContent = String(day.anomalies.length);
  }

  function selectDay(idx){
    state.selectedDayIndex = clamp(idx, 0, DAYS.length - 1);
    updateKpis();
    renderTrend();
    renderLayers();
    renderAnomalies();

    addMsg("#chat-box", "ai", `已切换到 ${DAYS[state.selectedDayIndex].day} 的班级画像：掌握度 ${pct(DAYS[state.selectedDayIndex].mastery)}。`);
  }

  function renderTrend(){
    const svg = $("#trend-svg");
    const w = 520, h = 160;
    svg.innerHTML = "";

    const pad = { l: 24, r: 18, t: 20, b: 28 };
    const pts = DAYS.map((d, i) => {
      const x = pad.l + (i * (w - pad.l - pad.r) / (DAYS.length - 1));
      const yMin = 60, yMax = 80; // 显示更“稳定真实”的区间
      const yVal = clamp(d.mastery, yMin, yMax);
      const y = pad.t + (1 - (yVal - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);
      return { x, y, v: d.mastery, i };
    });

    // grid background
    const grid = document.createElementNS("http://www.w3.org/2000/svg","path");
    grid.setAttribute("d", `M${pad.l} ${h-pad.b} H${w-pad.r}`);
    grid.setAttribute("stroke", "rgba(79,70,229,.22)");
    grid.setAttribute("stroke-width", "2");
    grid.setAttribute("opacity", "0.7");
    svg.appendChild(grid);

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

    // points
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

      if(p.i === state.selectedDayIndex) g.classList.add("active");

      const label = document.createElementNS("http://www.w3.org/2000/svg","text");
      label.setAttribute("x", p.x);
      label.setAttribute("y", h - 10);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-weight", "900");
      label.setAttribute("fill", "rgba(15,23,42,.65)");
      label.textContent = DAYS[p.i].day;

      g.appendChild(c);
      svg.appendChild(g);
      svg.appendChild(label);
    });

    // right label (最新)
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

  function renderAnomalies(){
    const day = DAYS[state.selectedDayIndex];
    const root = $("#anomaly-list");
    root.innerHTML = "";

    if(!day.anomalies.length){
      root.innerHTML = `<div class="anomaly-item"><div class="an-title">暂无异常</div><div class="an-sub">保持当前节奏即可</div></div>`;
      return;
    }

    day.anomalies.forEach(a => {
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

  // ---------- Drawer (layer / anomaly drilldown) ----------
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

  function openDrawerLayer(layer){
    state.selectedLayer = layer;
    const day = DAYS[state.selectedDayIndex];

    const groupName = layer === "A" ? "领先" : layer === "B" ? "稳定" : "补救";
    const list = STUDENTS.filter(s => s.group === layer)
      .sort((a,b)=> b.mastery - a.mastery)
      .map(s => `
        <div class="drawer-sec" style="margin-bottom:10px;">
          <h4>${s.name} <span style="color:#64748b;font-weight:900;font-size:12px;">· ${layer}组</span></h4>
          <p>当前掌握度：<b>${s.mastery}%</b>（本周 ${s.delta>=0?`+${s.delta}`:s.delta}%）</p>
        </div>
      `).join("");

    const actions = `
      <div class="drawer-actions">
        <button class="btn btn-primary" data-act="push-task">一键推送分层作业</button>
        <button class="btn btn-ghost" data-act="create-plan">生成组内提升路径</button>
        <button class="btn btn-ghost" data-act="notify-parent">发起家校沟通</button>
      </div>
    `;

    openDrawer(
      `班级分层钻取：${layer}组 · ${groupName}`,
      `
        <div class="drawer-sec">
          <h4>组别概览（${day.day}）</h4>
          <p>人数：<b>${day.layers[layer]}</b> 人</p>
          <p style="margin-top:6px;">建议：${layer==="A"?"拔高拓展题 + 讲题分享":"B"===layer?"查漏补缺 + 错题归因":"补救包 + 高频易错训练"}</p>
          ${actions}
        </div>
        ${list}
      `
    );

    bindDrawerActions();
    addMsg("#chat-box", "ai", `已打开 ${layer} 组钻取：我会给你推荐可执行的分层动作。`);
  }

  function openDrawerAnomaly(anomalyId){
    state.selectedAnomalyId = anomalyId;
    const day = DAYS[state.selectedDayIndex];
    const a = day.anomalies.find(x => x.id === anomalyId);
    if(!a) return;

    const st = a.students.map(n => {
      const s = STUDENTS.find(x => x.name === n);
      const meta = s ? `（${s.group}组 · ${s.mastery}%）` : "";
      return `<li><b>${n}</b> <span style="color:#64748b;font-weight:900;font-size:12px;">${meta}</span></li>`;
    }).join("");

    const actions = `
      <div class="drawer-actions">
        <button class="btn btn-primary" data-act="push-remedy">推送补救练习</button>
        <button class="btn btn-ghost" data-act="reassign">生成变式题组</button>
        <button class="btn btn-ghost" data-act="coach">生成讲评话术</button>
      </div>
    `;

    openDrawer(
      `异常钻取：${a.title}`,
      `
        <div class="drawer-sec">
          <h4>异常说明</h4>
          <p>${a.sub}</p>
          <p style="margin-top:6px;">风险等级：<b>${a.tag}</b></p>
          ${actions}
        </div>

        <div class="drawer-sec">
          <h4>影响学生</h4>
          <ul style="margin:8px 0 0 18px; color:#0f172a; font-weight:900;">${st}</ul>
        </div>

        <div class="drawer-sec">
          <h4>建议动作（可执行）</h4>
          <p>1）先对 C 组推送 10 分钟补救包；2）B 组做错因归类；3）A 组加 2 道拓展题防止“吃不饱”。</p>
        </div>
      `
    );

    bindDrawerActions();
    addMsg("#chat-box", "ai", `已定位异常「${a.title}」：我建议按分层先推补救，再做错因归类。`);
  }

  function bindDrawerActions(){
    $$("#drawer-body [data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        if(act === "push-task") addMsg("#chat-box","ai","已生成 A/B/C 三套分层作业（示例），可一键下发。");
        if(act === "create-plan") addMsg("#chat-box","ai","已生成本周提升路径：目标→练习→反馈→复盘（示例）。");
        if(act === "notify-parent") addMsg("#chat-box","ai","已生成家校沟通要点（示例），可直接发送。");
        if(act === "push-remedy") addMsg("#chat-box","ai","补救练习包已推送（示例）：分数乘除法 3 组基础 + 2 题变式。");
        if(act === "reassign") addMsg("#chat-box","ai","已生成变式题组（示例）：同结构不同数字，强化建模。");
        if(act === "coach") addMsg("#chat-box","ai","讲评话术已生成（示例）：先复盘错因→再示范线段图→最后自测巩固。");
      }, { once:true });
    });
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
      }, 350);
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

  // ---------- GOV ----------
  let feedTimer = null;
  function bindGov(){
    // placeholder only
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
    }, 1600);
  }

})();
