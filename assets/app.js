/* ======================================================
   AI EduBrain Demo - app.js (Teacher linkage version)
   功能：
   - 侧边栏切换（SPA）
   - 教师：趋势图（可点）、班级分层 A/B/C（可点联动）、异常列表（可点钻取抽屉）
   - OCR 扫描
   - 学生端语音弹窗
   - 治理驾驶舱动效
====================================================== */

(() => {
  "use strict";

  const APP_VERSION = "v0.9.1-demo";

  // ---------------- Utils ----------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function safeText(el, text) {
    if (!el) return;
    el.innerText = text;
  }

  function fmtPct(n) {
    return `${Math.round(n)}%`;
  }

  function fmtDelta(n) {
    const v = Math.round(n);
    if (v > 0) return `↑${v}%`;
    if (v < 0) return `↓${Math.abs(v)}%`;
    return "—";
  }

  // ---------------- App State ----------------
  const state = {
    teacher: {
      selectedGroup: "A", // A/B/C
      selectedDayIndex: 6, // 0..6
      selectedAnomalyId: null,
      drawerOpen: false,
      drawerTab: "overview", // overview | students | actions
      drawerMode: "group", // group | anomaly | student
      selectedStudentId: null,
    },
  };

  // ---------------- Mock Data (Deterministic-ish) ----------------
  function createTeacherData() {
    // 固定班级信息
    const classMeta = {
      className: "初二（3）班",
      subject: "数学",
      total: 36,
    };

    // 7日班级趋势（掌握度）
    const classTrend7 = [66, 68, 64, 69, 71, 72, 73];

    // 学生列表（按掌握度分层）
    const namesA = ["张晨", "林悦", "陈子涵", "王嘉铭", "李雨桐", "周泽宇", "宋依然", "郭子睿", "许清扬"];
    const namesB = [
      "赵一诺",
      "徐昊",
      "杨思雨",
      "唐嘉豪",
      "冯欣怡",
      "高子墨",
      "邱语彤",
      "蒋浩然",
      "邵可欣",
      "任子轩",
      "顾一帆",
      "彭思远",
      "韩雨欣",
      "钟可可",
    ];
    const namesC = [
      "刘子涵",
      "孙浩",
      "魏思琪",
      "邓子铭",
      "谢若曦",
      "贾天宇",
      "梁语晴",
      "孟浩然",
      "乔可欣",
      "范子墨",
      "叶昕",
      "苏子睿",
      "蔡雨桐",
    ];

    // 随机但稳定的 7日变化
    function genTrend(base) {
      const arr = [];
      for (let i = 0; i < 7; i++) {
        const wave = Math.sin((i + 1) * 0.9) * 1.8;
        arr.push(clamp(base + wave + (i - 3) * 0.6, 35, 98));
      }
      return arr.map((x) => Math.round(x));
    }

    const students = [];
    let id = 1;

    const pushGroup = (arr, group, baseMin, baseMax) => {
      arr.forEach((name, idx) => {
        const base = baseMin + ((baseMax - baseMin) * idx) / Math.max(1, arr.length - 1);
        const trend = genTrend(base);
        const mastery = trend[6];
        const delta7 = mastery - trend[0];

        students.push({
          id: `S${id++}`,
          name,
          group,
          mastery,
          delta7,
          accuracy: clamp(mastery + (group === "A" ? 6 : group === "B" ? 2 : -3), 35, 99),
          stability: clamp(mastery - (group === "A" ? 4 : group === "B" ? 1 : -2), 30, 98),
          weakPoints:
            group === "A"
              ? ["综合应用题", "几何推理提升"]
              : group === "B"
              ? ["单位 1 识别", "分数乘除法易错"]
              : ["基础计算", "题意理解", "单位 1 判定"],
          trend7: trend,
        });
      });
    };

    pushGroup(namesA, "A", 78, 92);
    pushGroup(namesB, "B", 60, 74);
    pushGroup(namesC, "C", 42, 58);

    // 异常列表（可钻取）
    const anomalies = [
      {
        id: "ANOM-001",
        level: "high",
        title: "作业量预警",
        desc: "近 2 天作业耗时显著偏高（疑似超时/题量偏多）",
        metric: "平均耗时 +18%",
        impacted: ["B", "C"],
        students: students.filter((s) => s.group !== "A").slice(0, 10).map((s) => s.id),
        hint: "建议：减少计算重复题，增加“单位 1 判定”专项 10 分钟训练",
      },
      {
        id: "ANOM-002",
        level: "mid",
        title: "掌握度下滑",
        desc: "B 组近 7 天波动增加，部分学生出现回落",
        metric: "B组 7日 -4%",
        impacted: ["B"],
        students: students
          .filter((s) => s.group === "B" && s.delta7 < 0)
          .slice(0, 8)
          .map((s) => s.id),
        hint: "建议：用 3 题快速诊断 + 1 张错因卡片，避免盲目刷题",
      },
      {
        id: "ANOM-003",
        level: "mid",
        title: "错题集中：单位 1 判定",
        desc: "第 2 题错误集中，主要是单位 1 识别错误导致列式偏差",
        metric: "错因占比 38%",
        impacted: ["B", "C"],
        students: students
          .filter((s) => s.group !== "A")
          .slice(6, 18)
          .map((s) => s.id),
        hint: "建议：课堂加入“单位 1 快速判断”微活动（1分钟 × 3轮）",
      },
    ];

    return {
      classMeta,
      classTrend7,
      students,
      anomalies,
    };
  }

  const teacherData = createTeacherData();

  // ---------------- View Switch ----------------
  function switchView(id, navEl) {
    // nav active
    $$(".nav-item").forEach((el) => el.classList.remove("active"));
    if (navEl) navEl.classList.add("active");

    // view active
    $$(".view-container").forEach((el) => el.classList.remove("active"));
    const current = $("#view-" + id);
    if (current) current.classList.add("active");

    // header title
    const titles = {
      home: "首页入口",
      teacher: "教师工作台",
      student: "学习伴侣",
      gov: "治理驾驶舱",
    };
    safeText($("#page-title"), titles[id] || id);

    // gov mode header toggle
    const topHeader = $("#top-header");
    if (id === "gov") {
      if (topHeader) topHeader.style.display = "none";
      requestAnimationFrame(initMap);
    } else {
      if (topHeader) topHeader.style.display = "flex";
      const grid = $("#map-grid");
      if (grid) grid.innerHTML = "";
      stopFeed();
    }

    // 进入教师页：确保教师联动面板已挂载
    if (id === "teacher") {
      ensureTeacherDashboard();
      renderTeacherDashboard();
    }
  }

  // ---------------- Home shortcuts ----------------
  function startScenario(type) {
    const navTeacher = $$(".nav-item")[1];
    switchView("teacher", navTeacher);

    if (type === "prep") {
      setTeacherMode("prep");
      setTimeout(() => {
        const input = $("#teacher-input");
        if (input) {
          input.value = "帮我生成一节《分数应用题》的教学设计";
          triggerMsg();
        }
      }, 350);
    }

    if (type === "mark") {
      setTeacherMode("mark");
    }
  }

  // ---------------- Teacher Mode ----------------
  function setTeacherMode(mode) {
    const btnPrep = $("#btn-prep");
    const btnMark = $("#btn-mark");

    const prepPlaceholder = $("#prep-placeholder");
    const lessonResult = $("#lesson-result");
    const ocr = $("#ocr-interface");

    // 让 dashboard 永远在上面存在
    ensureTeacherDashboard();

    if (mode === "prep") {
      if (btnPrep) btnPrep.className = "btn btn-primary";
      if (btnMark) btnMark.className = "btn btn-ghost";

      if (prepPlaceholder) prepPlaceholder.style.display = "block";
      if (lessonResult) lessonResult.style.display = "none";
      if (ocr) ocr.style.display = "none";
    } else {
      if (btnPrep) btnPrep.className = "btn btn-ghost";
      if (btnMark) btnMark.className = "btn btn-primary";

      if (prepPlaceholder) prepPlaceholder.style.display = "none";
      if (lessonResult) lessonResult.style.display = "none";
      if (ocr) ocr.style.display = "block";

      // reset OCR
      if (ocr) {
        const tip = $("#ocr-tip", ocr);
        const laser = $(".scan-laser", ocr);
        const spot = $(".error-spot", ocr);
        if (tip) tip.style.display = "block";
        if (laser) laser.style.display = "none";
        if (spot) spot.style.display = "none";
      }
    }

    renderTeacherDashboard();
  }

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

    const text = input.value.trim();
    addMsg("user", text);
    input.value = "";

    setTimeout(() => {
      addMsg("ai", "收到，我正在生成教学设计与课堂环节建议…");
      setTimeout(() => {
        const prepPlaceholder = $("#prep-placeholder");
        const lessonResult = $("#lesson-result");
        if (prepPlaceholder) prepPlaceholder.style.display = "none";
        if (lessonResult) {
          lessonResult.style.display = "block";
          renderLessonCard();
        }
        addMsg("ai", "已生成：含导入、探究、分层练习与作业建议。你也可以结合班级分层做差异化布置。");
      }, 900);
    }, 450);
  }

  function renderLessonCard() {
    const target = $("#lesson-result");
    if (!target) return;

    target.innerHTML = `
      <div style="
        background:#fff;
        border:1px solid #eef2ff;
        border-radius:22px;
        padding:18px;
        box-shadow: 0 10px 30px rgba(15,23,42,0.06);
      ">
        <h2 style="
          margin:0 0 10px 0;
          font-size:18px;
          font-weight:900;
          background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        ">📘 教学设计：分数应用题（联动学情版）</h2>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
          <span style="font-size:12px; font-weight:800; color:#4f46e5; background:#eef2ff; padding:6px 10px; border-radius:999px; border:1px solid #e0e7ff;">重点错因：单位1判定</span>
          <span style="font-size:12px; font-weight:800; color:#0f766e; background:#ecfdf5; padding:6px 10px; border-radius:999px; border:1px solid rgba(16,185,129,0.25);">建议：B/C 组加 10 分钟微训练</span>
        </div>

        <div style="color:#64748b; font-size:13px; margin-bottom:12px;">
          教学目标：理解数量关系、建立线段图模型、掌握“单位 1”的迁移推理
        </div>

        <div style="position:relative; padding-left:16px;">
          <div style="position:absolute; left:6px; top:6px; bottom:-8px; width:2px; background:#e2e8f0;"></div>
          ${timelineItem("00:00 课堂导入", "生活“折扣/切蛋糕”引入")}
          ${timelineItem("06:00 核心探究", "线段图 → 单位1 → 列式")}
          ${timelineItem("18:00 分层练习", "A 拔高 / B 变式 / C 基础巩固")}
          ${timelineItem("35:00 课堂小测", "2题诊断：单位1识别 + 逆向推理")}
        </div>

        <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:14px;"
          onclick="alert('Demo：导出可接 PPT/Word 生成服务')">
          ✨ 导出 PPT
        </button>
      </div>
    `;
  }

  function timelineItem(title, sub) {
    return `
      <div style="position:relative; padding-left:22px; margin-bottom:12px;">
        <div style="position:absolute; left:0; top:3px; width:12px; height:12px; border-radius:50%; background:#fff; border:3px solid #4f46e5;"></div>
        <div style="font-weight:900; color:#111827; font-size:13px;">${title}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">${sub}</div>
      </div>
    `;
  }

  // ---------------- Teacher: Dashboard (联动核心) ----------------
  function ensureTeacherDashboard() {
    const workspace = $("#workspace");
    if (!workspace) return;

    let dash = $("#teacher-dashboard");
    if (dash) return;

    dash = document.createElement("div");
    dash.id = "teacher-dashboard";
    dash.style.cssText = `
      margin-bottom:14px;
      background:#fff;
      border:1px solid #eef2ff;
      border-radius:22px;
      box-shadow: 0 10px 30px rgba(15,23,42,0.06);
      overflow:hidden;
    `;

    dash.innerHTML = `
      <div style="padding:14px 16px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between;">
        <div style="font-weight:950; color:#111827;">📊 班级画像（趋势 · 分层 · 异常钻取）</div>
        <div style="font-size:12px; color:#64748b;">${teacherData.classMeta.className} · ${teacherData.classMeta.subject}</div>
      </div>

      <div style="padding:14px 16px;">
        <!-- KPI -->
        <div id="kpi-row" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:14px;"></div>

        <!-- Trend + Stratification -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:12px; align-items:stretch;">
          <div id="trend-card" style="border:1px solid #eef2ff; border-radius:18px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.04);"></div>
          <div id="group-card" style="border:1px solid #eef2ff; border-radius:18px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.04);"></div>
        </div>

        <!-- Anomaly -->
        <div style="margin-top:12px; border:1px solid #eef2ff; border-radius:18px; overflow:hidden;">
          <div style="padding:10px 12px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:950; color:#111827;">⚠️ 异常列表（可点击钻取）</div>
            <div style="font-size:12px; color:#64748b;">点击异常 → 打开钻取抽屉</div>
          </div>
          <div id="anomaly-list" style="padding:6px 0;"></div>
        </div>
      </div>
    `;

    // 插入到 workspace 顶部（不影响原结构）
    workspace.prepend(dash);

    // 创建钻取抽屉（全局一次）
    ensureTeacherDrawer();
  }

  function renderTeacherDashboard() {
    // KPI
    renderKpiRow();
    // 趋势
    renderTrendCard();
    // 分层
    renderGroupCard();
    // 异常
    renderAnomalyList();
    // 若抽屉开着：刷新抽屉内容
    if (state.teacher.drawerOpen) renderTeacherDrawer();
  }

  function renderKpiRow() {
    const row = $("#kpi-row");
    if (!row) return;

    const day = state.teacher.selectedDayIndex;
    const trend = teacherData.classTrend7;

    const today = trend[day];
    const yesterday = day > 0 ? trend[day - 1] : trend[day];
    const delta = today - yesterday;

    // 假数据：正确率/稳定性基于掌握度
    const accuracy = clamp(today + 5, 35, 98);
    const stability = clamp(today - 3, 30, 98);

    row.innerHTML = `
      ${kpiCard("综合掌握度", fmtPct(today), `较昨日 ${fmtDelta(delta)}`)}
      ${kpiCard("正确率", fmtPct(accuracy), "客观题/主观题综合")}
      ${kpiCard("稳定性", fmtPct(stability), "波动越小越稳定")}
    `;
  }

  function kpiCard(title, value, sub) {
    return `
      <div style="background:#fff; border:1px solid #eef2ff; border-radius:18px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.04);">
        <div style="font-size:12px; color:#64748b; font-weight:850;">${title}</div>
        <div style="margin-top:6px; font-size:22px; font-weight:950; color:#111827;">${value}</div>
        <div style="margin-top:4px; font-size:12px; color:#64748b;">${sub}</div>
      </div>
    `;
  }

  // ---- Trend Card (clickable) ----
  function renderTrendCard() {
    const el = $("#trend-card");
    if (!el) return;

    const trend = teacherData.classTrend7;
    const day = state.teacher.selectedDayIndex;

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div>
          <div style="font-weight:950; color:#111827;">📈 班级趋势（近7天掌握度）</div>
          <div style="font-size:12px; color:#64748b; margin-top:4px;">点击折线上的某一天 → 联动 KPI & 摘要</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; color:#64748b;">当前</div>
          <div style="font-size:18px; font-weight:950; color:#4f46e5;">${fmtPct(trend[day])}</div>
        </div>
      </div>

      <div style="margin-top:10px;">
        ${renderSparklineSVG(trend, day)}
      </div>

      <div id="trend-summary" style="margin-top:10px; padding:10px 12px; background:#f8fafc; border:1px solid #eef2ff; border-radius:14px; color:#334155; font-size:13px; line-height:1.5;">
        今日掌握度 <b style="color:#111827;">${fmtPct(trend[day])}</b>，
        主要波动来自 <b>单位 1 判定</b> 与 <b>分数乘除法易错</b>。
        建议：B/C 组用 10 分钟做“单位 1 快速判断”微训练。
      </div>
    `;

    // 绑定点位点击
    for (let i = 0; i < 7; i++) {
      const btn = $(`#trend-pt-${i}`);
      if (!btn) continue;
      btn.addEventListener("click", () => {
        state.teacher.selectedDayIndex = i;
        renderTeacherDashboard();
      });
    }
  }

  function renderSparklineSVG(data, activeIndex) {
    // 尺寸
    const W = 520;
    const H = 150;
    const padX = 20;
    const padY = 16;

    const min = Math.min(...data) - 2;
    const max = Math.max(...data) + 2;

    const x = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
    const y = (v) => {
      const t = (v - min) / (max - min);
      return (H - padY) - t * (H - padY * 2);
    };

    const pts = data.map((v, i) => [x(i), y(v), v]);

    const linePath = pts
      .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
      .join(" ");

    const areaPath = `${linePath} L ${x(data.length - 1)} ${H - padY} L ${x(0)} ${H - padY} Z`;

    return `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="150" style="display:block; background:#fff; border-radius:14px; border:1px solid #eef2ff;">
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(79,70,229,0.20)"/>
            <stop offset="100%" stop-color="rgba(79,70,229,0.02)"/>
          </linearGradient>
        </defs>

        <!-- Grid -->
        ${[0, 1, 2].map((k) => {
          const yy = padY + (k * (H - padY * 2)) / 2;
          return `<line x1="${padX}" y1="${yy}" x2="${W - padX}" y2="${yy}" stroke="rgba(148,163,184,0.25)" stroke-width="1" />`;
        }).join("")}

        <path d="${areaPath}" fill="url(#fillGrad)"></path>
        <path d="${linePath}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>

        <!-- Points -->
        ${pts.map((p, i) => {
          const isActive = i === activeIndex;
          return `
            <g style="cursor:pointer;">
              <circle id="trend-pt-${i}" cx="${p[0]}" cy="${p[1]}" r="${isActive ? 6 : 4}"
                fill="${isActive ? "#4f46e5" : "#fff"}"
                stroke="#4f46e5" stroke-width="2" />
              <text x="${p[0]}" y="${p[1] - 10}" text-anchor="middle"
                font-size="11" font-weight="800" fill="${isActive ? "#4f46e5" : "rgba(100,116,139,0.0)"}">${Math.round(p[2])}%</text>
            </g>
          `;
        }).join("")}
      </svg>
    `;
  }

  // ---- Group Stratification (A/B/C clickable) ----
  function renderGroupCard() {
    const el = $("#group-card");
    if (!el) return;

    const g = state.teacher.selectedGroup;
    const countA = teacherData.students.filter((s) => s.group === "A").length;
    const countB = teacherData.students.filter((s) => s.group === "B").length;
    const countC = teacherData.students.filter((s) => s.group === "C").length;

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-weight:950; color:#111827;">👥 班级分层（A/B/C）</div>
          <div style="font-size:12px; color:#64748b; margin-top:4px;">点击分层 → 抽屉展示名单与建议</div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
        ${groupItem("A", "领尖", countA, "综合掌握高，可提升拔高题", g === "A")}
        ${groupItem("B", "稳定", countB, "核心题型需巩固，避免波动", g === "B")}
        ${groupItem("C", "基础", countC, "基础计算与题意理解优先", g === "C")}
      </div>
    `;

    // 绑定点击
    ["A", "B", "C"].forEach((grp) => {
      const node = $(`#grp-${grp}`);
      if (!node) return;
      node.addEventListener("click", () => {
        state.teacher.selectedGroup = grp;
        // 打开钻取抽屉（分层）
        state.teacher.drawerMode = "group";
        state.teacher.drawerOpen = true;
        state.teacher.drawerTab = "students";
        state.teacher.selectedStudentId = null;
        renderTeacherDashboard();
      });
    });
  }

  function groupItem(grp, label, count, desc, active) {
    return `
      <div id="grp-${grp}" style="
        display:flex; align-items:center; justify-content:space-between; gap:12px;
        padding:12px 12px; border-radius:16px;
        border:1px solid ${active ? "#c7d2fe" : "#eef2ff"};
        background:${active ? "rgba(79,70,229,0.06)" : "#fff"};
        cursor:pointer;
        transition:0.18s ease;
      ">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="
            width:34px; height:34px; border-radius:12px;
            background:${grp === "A" ? "#eef2ff" : grp === "B" ? "#ecfeff" : "#fef2f2"};
            display:flex; align-items:center; justify-content:center;
            font-weight:950; color:${grp === "A" ? "#4f46e5" : grp === "B" ? "#0ea5e9" : "#ef4444"};
          ">${grp}</div>
          <div>
            <div style="font-weight:950; color:#111827;">${grp} 组 · ${label}</div>
            <div style="font-size:12px; color:#64748b; margin-top:3px;">${desc}</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:12px; color:#64748b;">${count} 人</div>
          <div style="width:60px; height:8px; border-radius:999px; background:#e2e8f0; overflow:hidden;">
            <div style="height:100%; width:${clamp(count * 3, 18, 100)}%; background:${grp === "A" ? "#4f46e5" : grp === "B" ? "#0ea5e9" : "#ef4444"};"></div>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Anomaly List (click to drilldown) ----
  function renderAnomalyList() {
    const list = $("#anomaly-list");
    if (!list) return;

    list.innerHTML = teacherData.anomalies
      .map((a) => {
        const color =
          a.level === "high"
            ? { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.30)", fg: "#ef4444" }
            : { bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.25)", fg: "#f59e0b" };

        return `
          <div class="anomaly-row" data-id="${a.id}" style="
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            padding:10px 12px;
            cursor:pointer;
            border-top:1px solid #f1f5f9;
          ">
            <div style="display:flex; align-items:flex-start; gap:10px; min-width:0;">
              <span style="
                background:${color.bg};
                border:1px solid ${color.bd};
                color:${color.fg};
                padding:4px 10px; border-radius:999px;
                font-weight:950; font-size:12px;
                flex-shrink:0;
              ">${a.level === "high" ? "高" : "中"}</span>

              <div style="min-width:0;">
                <div style="font-weight:950; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.title}</div>
                <div style="font-size:12px; color:#64748b; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.desc}</div>
              </div>
            </div>

            <div style="text-align:right; flex-shrink:0;">
              <div style="font-size:12px; color:#64748b;">${a.metric}</div>
              <div style="font-size:12px; color:#4f46e5; font-weight:850;">影响 ${a.students.length} 人 →</div>
            </div>
          </div>
        `;
      })
      .join("");

    // bind click
    $$(".anomaly-row", list).forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        state.teacher.selectedAnomalyId = id;
        state.teacher.drawerMode = "anomaly";
        state.teacher.drawerOpen = true;
        state.teacher.drawerTab = "overview";
        state.teacher.selectedStudentId = null;
        renderTeacherDashboard();
      });
    });
  }

  // ---------------- Teacher Drawer (Drilldown) ----------------
  function ensureTeacherDrawer() {
    if ($("#teacher-drawer-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "teacher-drawer-overlay";
    overlay.style.cssText = `
      position:fixed; inset:0;
      background:rgba(15,23,42,0.38);
      backdrop-filter: blur(4px);
      z-index:9999;
      display:none;
    `;

    const drawer = document.createElement("div");
    drawer.id = "teacher-drawer";
    drawer.style.cssText = `
      position:absolute; right:0; top:0;
      width:420px; max-width:92vw; height:100%;
      background:#fff;
      border-left:1px solid #e2e8f0;
      box-shadow:-20px 0 50px rgba(15,23,42,0.18);
      display:flex; flex-direction:column;
    `;

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      // 点击蒙层关闭（点抽屉内部不关闭）
      if (e.target === overlay) {
        closeTeacherDrawer();
      }
    });
  }

  function openTeacherDrawer(mode) {
    state.teacher.drawerMode = mode;
    state.teacher.drawerOpen = true;

    const overlay = $("#teacher-drawer-overlay");
    if (overlay) overlay.style.display = "block";

    renderTeacherDrawer();
  }

  function closeTeacherDrawer() {
    state.teacher.drawerOpen = false;
    state.teacher.selectedStudentId = null;

    const overlay = $("#teacher-drawer-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function renderTeacherDrawer() {
    const overlay = $("#teacher-drawer-overlay");
    const drawer = $("#teacher-drawer");
    if (!overlay || !drawer) return;

    if (!state.teacher.drawerOpen) {
      overlay.style.display = "none";
      return;
    }
    overlay.style.display = "block";

    const mode = state.teacher.drawerMode;
    const tab = state.teacher.drawerTab;

    let headerTitle = "钻取详情";
    let headerSub = "";

    if (mode === "group") {
      headerTitle = `班级分层 · ${state.teacher.selectedGroup} 组`;
      headerSub = "用于差异化作业与精准补救";
    } else if (mode === "anomaly") {
      const a = teacherData.anomalies.find((x) => x.id === state.teacher.selectedAnomalyId);
      headerTitle = a ? `异常钻取 · ${a.title}` : "异常钻取";
      headerSub = a ? a.metric : "";
    } else if (mode === "student") {
      const s = teacherData.students.find((x) => x.id === state.teacher.selectedStudentId);
      headerTitle = s ? `学生画像 · ${s.name}` : "学生画像";
      headerSub = s ? `${s.group} 组 · 掌握度 ${fmtPct(s.mastery)}` : "";
    }

    drawer.innerHTML = `
      <div style="padding:14px 14px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:950; color:#111827; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${headerTitle}</div>
          <div style="font-size:12px; color:#64748b; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${headerSub}</div>
        </div>
        <button class="btn btn-ghost" style="padding:8px 10px;" id="drawer-close-btn">✕</button>
      </div>

      <div style="padding:10px 12px; display:flex; gap:8px; border-bottom:1px solid #f1f5f9;">
        ${tabBtn("overview", "概览", tab === "overview")}
        ${tabBtn("students", "学生名单", tab === "students")}
        ${tabBtn("actions", "建议动作", tab === "actions")}
      </div>

      <div style="flex:1; overflow:auto; padding:12px;" id="drawer-body"></div>
    `;

    $("#drawer-close-btn")?.addEventListener("click", closeTeacherDrawer);

    // tabs
    ["overview", "students", "actions"].forEach((t) => {
      const b = $(`#tab-${t}`);
      if (!b) return;
      b.addEventListener("click", () => {
        state.teacher.drawerTab = t;
        renderTeacherDrawer();
      });
    });

    // body
    const body = $("#drawer-body");
    if (!body) return;

    if (mode === "group") {
      renderDrawerGroup(body, tab);
    } else if (mode === "anomaly") {
      renderDrawerAnomaly(body, tab);
    } else {
      renderDrawerStudent(body, tab);
    }
  }

  function tabBtn(id, label, active) {
    return `
      <button id="tab-${id}" class="btn ${active ? "btn-primary" : "btn-ghost"}" style="padding:8px 12px; border-radius:12px; font-size:12px;">
        ${label}
      </button>
    `;
  }

  function renderDrawerGroup(body, tab) {
    const grp = state.teacher.selectedGroup;
    const list = teacherData.students
      .filter((s) => s.group === grp)
      .sort((a, b) => b.mastery - a.mastery);

    if (tab === "overview") {
      const avg = Math.round(list.reduce((sum, s) => sum + s.mastery, 0) / Math.max(1, list.length));
      body.innerHTML = `
        ${infoBlock(`本组人数`, `${list.length} 人`)}
        ${infoBlock(`平均掌握度`, `${avg}%`)}
        ${divider()}
        ${textBlock("核心建议", grp === "A"
          ? "A 组建议：给 2～3 道综合题作为拔高挑战，强化几何推理与迁移。"
          : grp === "B"
          ? "B 组建议：围绕“单位 1 判定 + 分数乘除法易错”做 10 分钟微训练，再做 3 题变式巩固。"
          : "C 组建议：先保证基础计算正确率，再用 2 个线段图模板训练题意理解与列式。")}
      `;
    }

    if (tab === "students") {
      body.innerHTML = `
        <div style="font-size:12px; color:#64748b; margin-bottom:10px;">点击学生 → 进入个人画像</div>
        ${list.map((s) => studentRow(s)).join("")}
      `;
      bindStudentRows(body);
    }

    if (tab === "actions") {
      body.innerHTML = `
        ${actionCard("一键生成分层作业", "按 A/B/C 自动生成作业：基础巩固 / 变式迁移 / 拔高挑战（Demo）")}
        ${actionCard("推送微训练", "单位 1 快速判断（1分钟×3轮）+ 3 题巩固")}
        ${actionCard("错因卡片", "自动生成错因总结卡：单位 1、列式偏差、题意误读")}
      `;
    }
  }

  function renderDrawerAnomaly(body, tab) {
    const a = teacherData.anomalies.find((x) => x.id === state.teacher.selectedAnomalyId);
    if (!a) {
      body.innerHTML = `<div style="color:#64748b;">未找到异常数据</div>`;
      return;
    }

    const impactedStudents = teacherData.students.filter((s) => a.students.includes(s.id));

    if (tab === "overview") {
      body.innerHTML = `
        ${textBlock("异常说明", a.desc)}
        ${divider()}
        ${infoBlock("影响人数", `${a.students.length} 人`)}
        ${infoBlock("影响分层", `${a.impacted.join(" / ")} 组`)}
        ${divider()}
        ${textBlock("处理建议", a.hint)}
      `;
    }

    if (tab === "students") {
      body.innerHTML = `
        <div style="font-size:12px; color:#64748b; margin-bottom:10px;">影响学生（点击查看画像）</div>
        ${impactedStudents.map((s) => studentRow(s, true)).join("")}
      `;
      bindStudentRows(body);
    }

    if (tab === "actions") {
      body.innerHTML = `
        ${actionCard("下发补救任务", "针对影响学生推送 3 题专项 + 1 题迁移（Demo）")}
        ${actionCard("课堂补讲卡片", "1 张“单位 1 判定”板书卡 + 例题拆解")}
        ${actionCard("自动复盘", "自动生成：异常原因 → 学生分布 → 下一步动作（Demo）")}
      `;
    }
  }

  function renderDrawerStudent(body, tab) {
    const s = teacherData.students.find((x) => x.id === state.teacher.selectedStudentId);
    if (!s) {
      body.innerHTML = `<div style="color:#64748b;">未选择学生</div>`;
      return;
    }

    if (tab === "overview") {
      body.innerHTML = `
        ${infoBlock("分层", `${s.group} 组`)}
        ${infoBlock("掌握度", `${fmtPct(s.mastery)}（7日 ${fmtDelta(s.delta7)}）`)}
        ${infoBlock("正确率", fmtPct(s.accuracy))}
        ${infoBlock("稳定性", fmtPct(s.stability))}
        ${divider()}
        ${textBlock("薄弱点", s.weakPoints.map((w) => `• ${w}`).join("<br/>"))}
        ${divider()}
        <div style="font-weight:950; color:#111827; margin-bottom:8px;">7日趋势</div>
        <div>${renderMiniTrend(s.trend7)}</div>
      `;
    }

    if (tab === "students") {
      body.innerHTML = `
        <div style="font-weight:950; color:#111827; margin-bottom:8px;">同组对比（Top 6）</div>
        ${teacherData.students
          .filter((x) => x.group === s.group)
          .sort((a, b) => b.mastery - a.mastery)
          .slice(0, 6)
          .map((x) => studentRow(x, false, x.id === s.id))
          .join("")}
      `;
      bindStudentRows(body);
    }

    if (tab === "actions") {
      body.innerHTML = `
        ${actionCard("生成个性化练习", `${s.name}：按薄弱点生成 6 题练习（Demo）`)}
        ${actionCard("推送讲解微课", `推荐：${s.weakPoints[0]} 专项微课 + 2 个例题拆解`)}
        ${actionCard("教师跟进提醒", `下节课点名口头检查“单位 1 判定”流程（Demo）`)}
      `;
    }
  }

  function infoBlock(k, v) {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border:1px solid #eef2ff; border-radius:14px; margin-bottom:10px;">
        <div style="font-size:12px; color:#64748b; font-weight:850;">${k}</div>
        <div style="font-size:13px; color:#111827; font-weight:950;">${v}</div>
      </div>
    `;
  }

  function textBlock(title, html) {
    return `
      <div style="margin-bottom:10px;">
        <div style="font-weight:950; color:#111827; margin-bottom:6px;">${title}</div>
        <div style="font-size:13px; color:#334155; line-height:1.6;">${html}</div>
      </div>
    `;
  }

  function divider() {
    return `<div style="height:1px; background:#f1f5f9; margin:12px 0;"></div>`;
  }

  function studentRow(s, isImpacted = false, highlight = false) {
    return `
      <div class="student-row" data-id="${s.id}" style="
        display:flex; align-items:center; justify-content:space-between; gap:12px;
        padding:10px 12px;
        border-radius:14px;
        border:1px solid ${highlight ? "#c7d2fe" : "#eef2ff"};
        background:${highlight ? "rgba(79,70,229,0.06)" : "#fff"};
        margin-bottom:10px;
        cursor:pointer;
      ">
        <div style="min-width:0;">
          <div style="font-weight:950; color:#111827;">${s.name} ${isImpacted ? `<span style="font-size:12px; color:#ef4444; font-weight:950; margin-left:6px;">● 影响</span>` : ""}</div>
          <div style="font-size:12px; color:#64748b; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            薄弱：${s.weakPoints.slice(0, 2).join(" / ")}
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-weight:950; color:#111827;">${fmtPct(s.mastery)}</div>
          <div style="font-size:12px; color:${s.delta7 < 0 ? "#ef4444" : "#10b981"};">7日 ${fmtDelta(s.delta7)}</div>
        </div>
      </div>
    `;
  }

  function bindStudentRows(root) {
    $$(".student-row", root).forEach((row) => {
      row.addEventListener("click", () => {
        const sid = row.dataset.id;
        state.teacher.selectedStudentId = sid;
        state.teacher.drawerMode = "student";
        state.teacher.drawerTab = "overview";
        state.teacher.drawerOpen = true;
        renderTeacherDrawer();
      });
    });
  }

  function actionCard(title, desc) {
    return `
      <div style="
        border:1px solid #eef2ff;
        border-radius:16px;
        padding:12px 12px;
        margin-bottom:10px;
        background:#fff;
      ">
        <div style="font-weight:950; color:#111827;">${title}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px; line-height:1.6;">${desc}</div>
        <button class="btn btn-primary" style="margin-top:10px; width:100%; justify-content:center;"
          onclick="alert('Demo：这里可接后端生成/下发服务')">
          立即执行（Demo）
        </button>
      </div>
    `;
  }

  function renderMiniTrend(data) {
    // mini svg
    const W = 360;
    const H = 90;
    const padX = 16;
    const padY = 12;
    const min = Math.min(...data) - 2;
    const max = Math.max(...data) + 2;

    const x = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
    const y = (v) => {
      const t = (v - min) / (max - min);
      return (H - padY) - t * (H - padY * 2);
    };
    const pts = data.map((v, i) => [x(i), y(v)]);

    const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
    return `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="90" style="display:block; border:1px solid #eef2ff; border-radius:14px; background:#fff;">
        <path d="${path}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
        ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="#4f46e5" stroke-width="2"></circle>`).join("")}
      </svg>
    `;
  }

  // 打开抽屉（由 dashboard 点击触发）
  function openFromDashboard() {
    const mode = state.teacher.drawerMode;
    openTeacherDrawer(mode);
  }

  // 当 state.teacher.drawerOpen=true 时：显示抽屉
  function syncDrawerVisibility() {
    const overlay = $("#teacher-drawer-overlay");
    if (!overlay) return;
    overlay.style.display = state.teacher.drawerOpen ? "block" : "none";
  }

  // 统一：dashboard 触发抽屉打开
  function openDrawerIfNeeded() {
    if (state.teacher.drawerOpen) {
      syncDrawerVisibility();
      renderTeacherDrawer();
    }
  }

  // 在 renderDashboard 后，如果抽屉标记打开，则渲染抽屉
  function afterDashboardRender() {
    openDrawerIfNeeded();
  }

  // 让 renderTeacherDashboard 末尾自动打开抽屉
  const _renderTeacherDashboard = renderTeacherDashboard;
  renderTeacherDashboard = function () {
    _renderTeacherDashboard();
    afterDashboardRender();
  };

  // ---------------- OCR ----------------
  let isScanning = false;
  function runOCR(el) {
    if (isScanning) return;
    isScanning = true;

    const tip = $("#ocr-tip", el);
    const laser = $(".scan-laser", el);
    const spot = $(".error-spot", el);

    if (tip) tip.style.display = "none";
    if (laser) laser.style.display = "block";

    setTimeout(() => {
      if (laser) laser.style.display = "none";
      if (spot) spot.style.display = "block";

      addMsg("ai", "检测到共性错误：38% 学生在第 2 题（单位 1 判定）出错。");
      addMsg("ai", "我已把该异常写入【异常列表】，可点击进行钻取查看影响学生与建议动作。");

      // 同步选中异常并打开抽屉
      state.teacher.selectedAnomalyId = "ANOM-003";
      state.teacher.drawerMode = "anomaly";
      state.teacher.drawerOpen = true;
      state.teacher.drawerTab = "overview";
      renderTeacherDashboard();

      isScanning = false;
    }, 1800);
  }

  // ---------------- Student modal ----------------
  function openVoiceModal() {
    const modal = $("#voice-modal");
    if (modal) modal.style.display = "flex";
  }

  function closeVoiceModal() {
    const modal = $("#voice-modal");
    if (modal) modal.style.display = "none";
    alert("🎉 评分：98分！（Demo）");
  }

  // ---------------- Gov Map ----------------
  let feedTimer = null;

  function initMap() {
    const grid = $("#map-grid");
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 0; i < 60; i++) {
      const bar = document.createElement("div");
      const isWarn = Math.random() > 0.86;
      const h = Math.floor(Math.random() * 260 + 40);

      bar.className = "data-bar" + (isWarn ? " warning" : "");
      bar.style.left = Math.floor(Math.random() * 1080 + 50) + "px";
      bar.style.top = Math.floor(Math.random() * 1080 + 50) + "px";
      bar.style.transform = "translateZ(0px)";
      bar.title = isWarn ? "预警：作业量偏高" : "正常";

      bar.onclick = () => {
        alert(isWarn ? "钻取：该校作业量预警（Demo）" : "钻取：该校掌握度趋势（Demo）");
      };

      grid.appendChild(bar);

      setTimeout(() => {
        bar.style.height = h + "px";
        bar.style.transform = `translateZ(${h}px)`;
      }, 80 + Math.random() * 700);
    }

    startFeed();
  }

  function startFeed() {
    const list = $("#feed-list");
    if (!list) return;

    const schools = ["第一中学", "实验小学", "育才学校", "高新一小"];
    const acts = ["生成了数学教案", "发布了分层作业", "触发了作业量预警", "查看了学生档案"];

    stopFeed();
    feedTimer = setInterval(() => {
      const d = document.createElement("div");
      d.className = "feed-item";

      const s = schools[Math.floor(Math.random() * schools.length)];
      const a = acts[Math.floor(Math.random() * acts.length)];

      d.innerHTML = `<span style="color:#38bdf8">[${s}]</span> 李老师 ${a}`;
      list.prepend(d);

      if (list.children.length > 5) {
        list.removeChild(list.lastChild);
      }
    }, 1600);
  }

  function stopFeed() {
    if (feedTimer) clearInterval(feedTimer);
    feedTimer = null;
  }

  // ---------------- Boot ----------------
  function boot() {
    // version badge
    const v = $("#app-version");
    if (v && (!v.innerText || !v.innerText.trim())) {
      v.innerText = APP_VERSION;
    }

    // default teacher mode
    setTeacherMode("prep");

    // ensure home active
    if (!$("#view-home")?.classList.contains("active")) {
      const navHome = $$(".nav-item")[0];
      switchView("home", navHome);
    }

    // 如果页面一开始就在 teacher（例如刷新）
    if ($("#view-teacher")?.classList.contains("active")) {
      ensureTeacherDashboard();
      renderTeacherDashboard();
    }

    // 抽屉显隐同步
    syncDrawerVisibility();
  }

  // ---------------- Global Mount (关键：inline onclick) ----------------
  window.switchView = switchView;
  window.startScenario = startScenario;
  window.setTeacherMode = setTeacherMode;
  window.triggerMsg = triggerMsg;
  window.runOCR = runOCR;
  window.openVoiceModal = openVoiceModal;
  window.closeVoiceModal = closeVoiceModal;
  window.initMap = initMap;

  // 抽屉控制（可选：调试用）
  window.__openTeacherDrawer = openTeacherDrawer;
  window.__closeTeacherDrawer = closeTeacherDrawer;

  // DOM ready
  document.addEventListener("DOMContentLoaded", boot);
})();
