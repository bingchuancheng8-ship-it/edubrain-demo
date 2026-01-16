/* =========================================================
   AI EduBrain Demo v0.9.2 (Role-based | 3 roles | 3 cards each)
   - 角色隔离：教师 / 学生 / 教育管理者
   - 首页每端 3 张卡：视觉协调
   - 教师端趋势-分层-异常联动钻取：弹窗内查看学生档案（不跳学生端）
   - 学生端：成长档案 / 即时答疑 / 错题巩固
   - 管理端：治理总览 / 风险预警 / 行为流督导（弹窗说明 + 驾驶舱背景）
   ========================================================= */

(function () {
  /** --------------------------
   *   App State (Mock)
   *  -------------------------- */
  const App = {
    version: "v0.9.2-role",
    role: null, // 'teacher' | 'student' | 'admin'
    view: "home",

    // teacher
    teacherMode: "ana", // prep | mark | ana
    trendIndex: 6, // 0..6
    tierFocus: null, // 'A' | 'B' | 'C' | null
    anomalyFilter: "all", // all | missing | error | time
    isScanning: false,

    // student
    studentTab: "growth", // growth | qa
    currentStudentId: "S-01",

    // gov
    govMode: "overview", // overview | risk | feed
    feedTimer: null,
  };

  const Trend = {
    labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    values: [62, 64, 60, 66, 68, 70, 73], // 掌握度
  };

  // “每天一份班级画像”，用于联动（趋势点 -> 分层 / 异常 / KPI）
  const DailyClassData = [
    buildDay(0, { A: 8, B: 12, C: 12 }, [
      { id: "S-01", name: "宋扬", tier: "C", type: "missing", reason: "本次作业缺交", impact: "掌握度回落", hint: "建议当日补交+错题复盘" },
      { id: "S-02", name: "高航", tier: "C", type: "error", reason: "分数÷分数错误率高", impact: "应用题建模失败", hint: "先做3组基础计算再迁移" },
    ]),
    buildDay(1, { A: 9, B: 13, C: 10 }, [
      { id: "S-03", name: "陈希", tier: "B", type: "time", reason: "完成时长异常偏长", impact: "卡在步骤转换", hint: "建议口头讲解+步骤模板" },
    ]),
    buildDay(2, { A: 7, B: 15, C: 10 }, [
      { id: "S-04", name: "王铭", tier: "B", type: "error", reason: "线段图建模不稳定", impact: "易错题集中", hint: "给2道同结构变式题" },
      { id: "S-05", name: "林安", tier: "C", type: "missing", reason: "两次缺交", impact: "掌握度下降风险", hint: "建议家校提醒 + 简化任务" },
    ]),
    buildDay(3, { A: 9, B: 14, C: 9 }, [
      { id: "S-06", name: "周一帆", tier: "A", type: "error", reason: "拔高题失分集中", impact: "冲A+受阻", hint: "补充两道综合题变式" },
    ]),
    buildDay(4, { A: 10, B: 14, C: 8 }, [
      { id: "S-07", name: "韩朔", tier: "C", type: "time", reason: "作业时长偏短", impact: "疑似敷衍/跳步", hint: "建议抽查过程+二次订正" },
    ]),
    buildDay(5, { A: 10, B: 15, C: 7 }, []),
    buildDay(6, { A: 9, B: 14, C: 9 }, [
      { id: "S-08", name: "高航", tier: "C", type: "error", reason: "分数应用题错误仍偏高", impact: "影响整体掌握度", hint: "优先跟进：错因→示范→自测巩固" },
    ]),
  ];

  function buildDay(dayIndex, tiers, anomalies) {
    const mastery = Trend.values[dayIndex];
    const total = tiers.A + tiers.B + tiers.C;
    const marked = Math.round(16 + (dayIndex * 2.2));
    return {
      dayIndex,
      mastery,
      marked,
      totalWork: 32,
      tiers,
      anomalies: Array.isArray(anomalies) ? [...anomalies] : [],
    };
  }

  /** --------------------------
   *  Student Mock Data
   *  -------------------------- */
  const Students = {
    "S-01": {
      id: "S-01",
      name: "宋扬",
      grade: "七年级",
      streak: 12,
      radar: {
        labels: ["计算", "建模", "几何推理", "阅读理解", "表达", "学习习惯"],
        current: [58, 52, 60, 66, 62, 63],
        target:  [70, 68, 72, 72, 70, 72],
      },
      weekly: {
        mastery: [68, 70, 69, 71, 73, 75, 76],
        wrong:   [3,  2,  4,  3,  3,  2,  1],
        minutes: [18, 22, 16, 20, 24, 21, 21],
      },
      gaps: [
        "本周「建模」偏弱：建议先用线段图把数量关系画清楚再列式。",
        "「计算」易在分数除法出错：先做 3 组基础计算再迁移应用题。",
        "学习习惯较稳定：建议保持每日 20 分钟巩固节奏。",
      ],
      archive: [
        { date: "第3周", title: "入学学段适配诊断", desc: "知识掌握度 62%，重点薄弱：分数除法与应用题建模。" },
        { date: "第4周", title: "能力对标与差距明确", desc: "对标七年级标准：建模/计算需提升，阅读理解达标。" },
        { date: "第5周", title: "周度学情复盘", desc: "错题集中在分数÷分数，建议优先补足基础计算。" },
      ],
      wrongbook: [
        { topic: "分数除法", count: 5, hint: "关键：乘以倒数；先化简再计算" },
        { topic: "应用题建模（线段图）", count: 3, hint: "先找单位 1，再找对应分率" },
      ],
    },

    "S-02": {
      id: "S-02",
      name: "高航",
      grade: "七年级",
      streak: 9,
      radar: {
        labels: ["计算", "建模", "几何推理", "阅读理解", "表达", "学习习惯"],
        current: [50, 48, 55, 60, 58, 55],
        target:  [70, 68, 72, 72, 70, 72],
      },
      weekly: {
        mastery: [60, 61, 60, 62, 64, 66, 65],
        wrong:   [5,  5,  6,  5,  4,  4,  4],
        minutes: [12, 16, 14, 15, 18, 18, 16],
      },
      gaps: [
        "分数除法错误率仍偏高：建议每日 10 分钟基础计算打底。",
        "建模存在跳步：建议按模板写清楚“已知/求/单位1”。",
        "学习时长略波动：建议固定在晚饭后 20 分钟完成巩固任务。",
      ],
      archive: [
        { date: "第3周", title: "入学学段适配诊断", desc: "掌握度 58%，薄弱点：分数除法与应用题。" },
        { date: "第4周", title: "动态学习支撑推送", desc: "推送：分数除法专项微课 + 变式题 2 组。" },
      ],
      wrongbook: [
        { topic: "分数÷分数", count: 6, hint: "先化简，再乘倒数；不要忘记约分" },
        { topic: "单位1识别", count: 4, hint: "先找“谁的几分之几”中的“谁”" },
      ],
    },

    "S-04": {
      id: "S-04",
      name: "王铭",
      grade: "七年级",
      streak: 14,
      radar: {
        labels: ["计算", "建模", "几何推理", "阅读理解", "表达", "学习习惯"],
        current: [66, 60, 65, 62, 60, 70],
        target:  [72, 70, 75, 72, 70, 74],
      },
      weekly: {
        mastery: [66, 67, 68, 70, 71, 72, 73],
        wrong:   [3,  3,  2,  2,  2,  1,  1],
        minutes: [20, 19, 22, 20, 24, 21, 20],
      },
      gaps: [
        "线段图建模偶发不稳定：建议多做 2 道同结构题巩固。",
        "几何推理稳步提升：可加入 1 道拔高题训练迁移。",
      ],
      archive: [
        { date: "第4周", title: "能力对标与差距明确", desc: "建模/表达需补齐，计算基本达标。" },
      ],
      wrongbook: [
        { topic: "线段图建模", count: 2, hint: "先画单位1，再标分率与对应量" },
      ],
    },

    "S-06": {
      id: "S-06",
      name: "周一帆",
      grade: "七年级",
      streak: 18,
      radar: {
        labels: ["计算", "建模", "几何推理", "阅读理解", "表达", "学习习惯"],
        current: [75, 72, 78, 74, 70, 76],
        target:  [78, 75, 82, 78, 75, 80],
      },
      weekly: {
        mastery: [72, 73, 74, 75, 76, 77, 78],
        wrong:   [2,  2,  2,  1,  2,  1,  1],
        minutes: [25, 24, 26, 25, 26, 24, 24],
      },
      gaps: [
        "拔高题失分集中：建议补 2 道综合变式（条件变化）训练稳态。",
        "表达较好：可尝试“讲题”训练，提高迁移能力。",
      ],
      archive: [
        { date: "第4周", title: "周度学情复盘", desc: "掌握度稳定上升，建议加强综合题变式训练。" },
      ],
      wrongbook: [
        { topic: "综合应用题（条件变化）", count: 2, hint: "先列关系式，再检查单位1是否一致" },
      ],
    },
  };

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
   *  Role Control
   *  -------------------------- */
  function showRoleGate() {
    const g = $("#role-gate");
    if (g) g.style.display = "flex";
  }

  function hideRoleGate() {
    const g = $("#role-gate");
    if (g) g.style.display = "none";
  }

  function roleAllowedViews(role) {
    if (role === "teacher") return ["home", "teacher"];
    if (role === "student") return ["home", "student"];
    if (role === "admin") return ["home", "gov"];
    return ["home"];
  }

  function applyRoleUI() {
    const role = App.role;
    const allowed = roleAllowedViews(role);

    // 左侧导航显示/隐藏
    const navTeacher = $("#nav-teacher");
    const navStudent = $("#nav-student");
    const navGov = $("#nav-gov");

    if (navTeacher) navTeacher.style.display = allowed.includes("teacher") ? "flex" : "none";
    if (navStudent) navStudent.style.display = allowed.includes("student") ? "flex" : "none";
    if (navGov) navGov.style.display = allowed.includes("gov") ? "flex" : "none";

    // 首页卡片按角色隐藏：每端 3 张
    const cPrep = $("#home-card-prep");
    const cMark = $("#home-card-mark");
    const cAna = $("#home-card-ana");

    const cGrowth = $("#home-card-growth");
    const cQA = $("#home-card-qa");
    const cWrong = $("#home-card-wrong");

    const cGovOverview = $("#home-card-gov-overview");
    const cGovRisk = $("#home-card-gov-risk");
    const cGovFeed = $("#home-card-gov-feed");

    if (cPrep) cPrep.style.display = role === "teacher" ? "block" : "none";
    if (cMark) cMark.style.display = role === "teacher" ? "block" : "none";
    if (cAna) cAna.style.display = role === "teacher" ? "block" : "none";

    if (cGrowth) cGrowth.style.display = role === "student" ? "block" : "none";
    if (cQA) cQA.style.display = role === "student" ? "block" : "none";
    if (cWrong) cWrong.style.display = role === "student" ? "block" : "none";

    if (cGovOverview) cGovOverview.style.display = role === "admin" ? "block" : "none";
    if (cGovRisk) cGovRisk.style.display = role === "admin" ? "block" : "none";
    if (cGovFeed) cGovFeed.style.display = role === "admin" ? "block" : "none";

    // 首页提示
    const tip = $("#home-role-tip");
    if (tip) {
      tip.style.display = "block";
      if (role === "teacher") tip.innerHTML = `当前身份：<b>教师</b>。你将仅看到教师相关入口（备课/批改/学情联动）。`;
      else if (role === "student") tip.innerHTML = `当前身份：<b>学生</b>。你将仅看到学生相关入口（成长档案/即时答疑/错题巩固）。`;
      else if (role === "admin") tip.innerHTML = `当前身份：<b>教育管理者</b>。你将仅看到管理相关入口（治理总览/风险预警/行为流督导）。`;
      else tip.style.display = "none";
    }

    // 右下角用户信息
    const avatar = $("#user-avatar");
    const name = $("#user-name");
    const sub = $("#user-sub");
    if (role === "teacher") {
      if (avatar) avatar.textContent = "李";
      if (name) name.textContent = "李老师";
      if (sub) sub.textContent = "数学组 · 七年级";
    } else if (role === "student") {
      const st = Students[App.currentStudentId] || Students["S-01"];
      if (avatar) avatar.textContent = st.name.slice(0, 1);
      if (name) name.textContent = st.name;
      if (sub) sub.textContent = `${st.grade} · 学生`;
    } else if (role === "admin") {
      if (avatar) avatar.textContent = "教";
      if (name) name.textContent = "教育管理者";
      if (sub) sub.textContent = "区县教育局 · 管理端";
    }
  }

  function setRole(role) {
    App.role = role;
    try { localStorage.setItem("edubrain_role", role); } catch (e) {}

    applyRoleUI();
    hideRoleGate();

    // 自动跳到角色主页面
    if (role === "teacher") {
      switchView("teacher", document.querySelector('[data-view="teacher"]'));
      setTeacherMode("ana");
      showToast("已以教师身份进入");
      return;
    }

    if (role === "student") {
      switchView("student", document.querySelector('[data-view="student"]'));
      setStudentTab("growth");
      ensureStudentMounted();
      showToast("已以学生身份进入");
      return;
    }

    if (role === "admin") {
      switchView("gov", document.querySelector('[data-view="gov"]'));
      showToast("已以教育管理者身份进入");
      return;
    }
  }

  function resetRole() {
    try { localStorage.removeItem("edubrain_role"); } catch (e) {}
    location.reload();
  }

  function ensureRoleReady() {
    const saved = (() => {
      try { return localStorage.getItem("edubrain_role"); } catch (e) { return null; }
    })();

    if (saved === "teacher" || saved === "student" || saved === "admin") {
      App.role = saved;
      applyRoleUI();
      hideRoleGate();

      // 刷新后回到角色默认页
      if (saved === "teacher") {
        switchView("teacher", document.querySelector('[data-view="teacher"]'));
        setTeacherMode("ana");
      } else if (saved === "student") {
        switchView("student", document.querySelector('[data-view="student"]'));
        setStudentTab("growth");
        ensureStudentMounted();
      } else {
        switchView("gov", document.querySelector('[data-view="gov"]'));
      }
      return;
    }

    // 未选择过身份：默认展示首页 + 弹窗引导
    App.view = "home";
    showRoleGate();
  }

  function isViewAllowed(viewId) {
    const allowed = roleAllowedViews(App.role);
    return allowed.includes(viewId);
  }

  /** --------------------------
   *  View Switch
   *  -------------------------- */
  function switchView(id, navEl) {
    // 角色隔离：不允许切入非本角色模块
    if (!isViewAllowed(id)) {
      showToast("当前身份无权访问该模块");
      const fallback =
        App.role === "student" ? "student" :
        App.role === "admin" ? "gov" :
        App.role === "teacher" ? "teacher" : "home";
      id = fallback;
    }

    App.view = id;

    // nav active
    $$(".nav-item").forEach((el) => el.classList.remove("active"));
    if (navEl && navEl.style.display !== "none") navEl.classList.add("active");
    else {
      const curNav = document.querySelector(`[data-view="${id}"]`);
      if (curNav) curNav.classList.add("active");
    }

    // view active
    $$(".view-container").forEach((el) => el.classList.remove("active"));
    const cur = $("#view-" + id);
    if (cur) cur.classList.add("active");

    // title
    const titles = { home: "首页入口", teacher: "教师工作台", student: "学习伴侣", gov: "治理驾驶舱" };
    setText("#page-title", titles[id] || "工作区");

    // gov behavior
    const topHeader = $("#top-header");
    if (id === "gov") {
      if (topHeader) topHeader.style.display = "none";
      initMap();
      startFeed();
    } else {
      if (topHeader) topHeader.style.display = "flex";
      stopFeed();
      clearMap();
    }

    // teacher init
    if (id === "teacher") ensureTeacherMounted();

    // student init
    if (id === "student") ensureStudentMounted();
  }

  /** --------------------------
   *  Home Scenario
   *  -------------------------- */
  function startScenario(type) {
    // 首页入口：按角色强制路由
    if (App.role === "admin") {
      enterGov("overview");
      return;
    }

    if (App.role === "student") {
      if (type === "qa") return enterStudent("qa");
      if (type === "wrong") return enterStudent("qa", "wrongbook");
      return enterStudent("growth");
    }

    // teacher
    switchView("teacher", document.querySelector('[data-view="teacher"]'));

    if (type === "prep") {
      setTeacherMode("prep");
      setTimeout(() => {
        const input = $("#teacher-input");
        if (input) input.value = "生成分数应用题教案并补齐薄弱点强化环节";
        triggerMsg();
      }, 220);
      return;
    }

    if (type === "mark") {
      setTeacherMode("mark");
      addMsg("ai", "已进入批改模式：点击右侧模拟扫描，将生成异常并联动到分析区。");
      return;
    }

    if (type === "ana") {
      setTeacherMode("ana");
      addMsg("ai", "已打开联动分析：点击趋势点位、分层卡片、异常列表可进行联动钻取。");
      renderTeacherLinkedArea();
      return;
    }

    setTeacherMode("ana");
  }

  function startScenarioFromHome() {
    const v = ($("#home-input")?.value || "").trim();

    // 未选身份时：先弹出身份选择
    if (!App.role) {
      showRoleGate();
      return;
    }

    // admin
    if (App.role === "admin") {
      if (v.includes("风险") || v.includes("预警")) return enterGov("risk");
      if (v.includes("行为") || v.includes("督导") || v.includes("流")) return enterGov("feed");
      return enterGov("overview");
    }

    // student
    if (App.role === "student") {
      if (v.includes("答疑") || v.includes("提问")) return enterStudent("qa");
      if (v.includes("错题") || v.includes("巩固")) return enterStudent("qa", "wrongbook");
      return enterStudent("growth");
    }

    // teacher
    if (!v) return startScenario("prep");
    if (v.includes("批改") || v.includes("作业")) return startScenario("mark");
    if (v.includes("趋势") || v.includes("分层") || v.includes("异常") || v.includes("分析")) return startScenario("ana");
    if (v.includes("备课") || v.includes("教案")) return startScenario("prep");

    return startScenario("ana");
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
      btnAna.className  = "btn " + (mode === "ana"  ? "btn-primary" : "btn-ghost");
    }

    // toggle views
    const map = { prep: "#prep-view", mark: "#mark-view", ana: "#ana-view" };
    Object.values(map).forEach((v) => {
      const el = $(v);
      if (el) el.classList.remove("active");
    });
    const active = $(map[mode]);
    if (active) active.classList.add("active");

    if (mode === "mark") resetOCR();
    if (mode === "prep") renderLessonCard(false);
    if (mode === "ana") renderTeacherLinkedArea();
  }

  /** --------------------------
   *  Chat (Teacher)
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
        addMsg("ai", "已加载近7天趋势与班级画像。点击趋势点位将联动刷新分层与异常列表。");
        setTeacherMode("ana");
        renderTeacherLinkedArea();
        return;
      }

      if (q.includes("教案") || q.includes("备课") || q.includes("分数")) {
        addMsg("ai", "已生成《分数应用题》教学设计（示例），并根据班级薄弱点插入强化环节。");
        setTeacherMode("prep");
        renderLessonCard(true);
        return;
      }

      if (q.includes("批改") || q.includes("作业")) {
        addMsg("ai", "已进入作业批改模式。点击右侧模拟扫描（OCR）触发异常并联动到分析区。");
        setTeacherMode("mark");
        return;
      }

      addMsg("ai", "收到。我已为你更新右侧联动分析区（趋势/分层/异常）。");
      setTeacherMode("ana");
      renderTeacherLinkedArea();
    }, 320);
  }

  /** --------------------------
   *  Lesson Card
   *  -------------------------- */
  function renderLessonCard(showResult = false) {
    const placeholder = $("#prep-placeholder");
    const result = $("#lesson-result");
    if (!placeholder || !result) return;

    if (!showResult) {
      placeholder.style.display = "flex";
      result.style.display = "none";
      return;
    }

    placeholder.style.display = "none";
    result.style.display = "block";
    result.innerHTML = `
      <div class="lesson-card">
        <h2>📘 教学设计：分数应用题（示例）</h2>
        <div class="timeline">
          <div class="tl-item">
            <div class="tl-title">00:00 课堂导入</div>
            <div class="tl-sub">生活“切蛋糕”情境，引入“单位1”概念</div>
          </div>
          <div class="tl-item">
            <div class="tl-title">05:00 核心探究</div>
            <div class="tl-sub">画线段图 → 识别单位1 → 列式求解</div>
          </div>
          <div class="tl-item">
            <div class="tl-title">15:00 薄弱点强化</div>
            <div class="tl-sub">分数÷分数：先化简 → 再乘倒数（3组基础计算）</div>
          </div>
          <div class="tl-item">
            <div class="tl-title">25:00 变式训练</div>
            <div class="tl-sub">2道同结构变式题：条件变化与单位1对齐</div>
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:12px;"
          onclick="showToast('已模拟导出：PPT（演示）')">✨ 导出 PPT</button>
      </div>
    `;
  }

  /** --------------------------
   *  Teacher Linked Area (Trend <-> Tier <-> Anomaly)
   *  -------------------------- */
  function ensureTeacherMounted() {
    renderTeacherLinkedArea();
  }

  function renderTeacherLinkedArea() {
    const day = DailyClassData[App.trendIndex];
    if (!day) return;

    setText("#kpi-marked", String(day.marked));
    setText("#kpi-mastery", `${day.mastery}%`);
    setText("#kpi-anomaly", String(day.anomalies.length));

    setText("#trend-day-label", Trend.labels[day.dayIndex]);
    setText("#trend-value-label", `${day.mastery}%`);

    // tiers
    const total = day.tiers.A + day.tiers.B + day.tiers.C;
    const rateA = Math.round((day.tiers.A / total) * 100);
    const rateB = Math.round((day.tiers.B / total) * 100);
    const rateC = 100 - rateA - rateB;

    setText("#tier-a-count", String(day.tiers.A));
    setText("#tier-b-count", String(day.tiers.B));
    setText("#tier-c-count", String(day.tiers.C));

    setText("#tier-a-rate", `${rateA}%`);
    setText("#tier-b-rate", `${rateB}%`);
    setText("#tier-c-rate", `${rateC}%`);

    // bar width
    const barA = $("#tier-a-bar");
    const barB = $("#tier-b-bar");
    const barC = $("#tier-c-bar");
    if (barA) barA.style.width = `${Math.max(8, rateA)}%`;
    if (barB) barB.style.width = `${Math.max(8, rateB)}%`;
    if (barC) barC.style.width = `${Math.max(8, rateC)}%`;

    // active tier highlight
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

    function xAt(i) {
      return pad.l + (cw * i) / (Trend.values.length - 1);
    }
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
    };
  }

  function selectTier(tier) {
    App.tierFocus = App.tierFocus === tier ? null : tier;
    renderAnomalyList();

    const day = DailyClassData[App.trendIndex];
    if (!day) return;
    const count = day.tiers[tier];

    if (App.tierFocus) {
      addMsg("ai", `已聚焦 <b>${tier}组</b>（${count}人）。异常列表已按分层联动过滤。`);
    } else {
      addMsg("ai", "已取消分层聚焦，异常列表恢复为全班维度。");
    }
    renderTeacherLinkedArea();
  }

  function setAnomalyFilter(filter, el) {
    App.anomalyFilter = filter;
    $$(".chip").forEach((c) => c.classList.remove("active"));
    if (el) el.classList.add("active");
    renderAnomalyList();
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
          <li>建议生成 2 道同结构变式题（先基础→再迁移），并在课堂抽查关键步骤。</li>
          <li>若连续 2 次出现该异常，建议触发「家校协同提醒 + 低门槛补救任务」。</li>
        </ul>

        <div style="margin-top:14px;padding:12px;border-radius:16px;border:1px dashed rgba(79,70,229,0.22);background:#f7f8ff;">
          <b>一键生成话术（示例）</b><br/>
          “我发现你在 <b>${x.reason}</b> 这里卡住了，我们先用 3 组基础计算把手感找回来，再做 2 道迁移应用题。你只要把第一步写清楚就成功一半了。”
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
          <button class="btn btn-primary btn-sm" onclick="openStudentProfile('${x.id}')">查看学生成长档案</button>
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟下发：补救练习（演示）')">下发补救练习</button>
        </div>
      `;
    }

    openModal();
    addMsg("ai", `已打开 <b>${x.name}</b> 异常钻取；可在教师侧弹窗中查看学生档案。`);
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
          ${day.anomalies.map((a) => `<li><b>${a.name}</b> · ${tagFor(a.type).text} · ${a.reason}</li>`).join("")}
        </ul>
      `;
    }
    openModal();
  }

  /** --------------------------
   *  OCR Simulation
   *  -------------------------- */
  function resetOCR() {
    const tip = $("#ocr-tip");
    const laser = $("#ocr-laser");
    const err = $("#ocr-error");
    if (tip) tip.style.display = "block";
    if (laser) laser.style.display = "none";
    if (err) err.style.display = "none";
    App.isScanning = false;
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

      // 模拟：扫描触发一个新的异常进入当天数据（联动体现）
      const day = DailyClassData[App.trendIndex];
      if (day) {
        day.anomalies = [
          ...day.anomalies,
          { id: "S-01", name: "宋扬", tier: "C", type: "error", reason: "分数÷分数步骤写错", impact: "应用题列式错误", hint: "先做基础计算 3 组再做 2 道迁移题" },
        ];
      }

      addMsg("ai", "已完成扫描：检测到共性错误（分数÷分数）与个体异常（补救层）。建议进入分析联动查看。");
      showToast("扫描完成：异常已生成并联动");
      App.isScanning = false;

      setTeacherMode("ana");
      renderTeacherLinkedArea();
    }, 2000);
  }

  /** --------------------------
   *  Modal
   *  -------------------------- */
  function openModal() {
    const m = $("#modal");
    if (m) m.style.display = "block";
  }
  function closeModal() {
    const m = $("#modal");
    if (m) m.style.display = "none";
  }

  /** --------------------------
   *  Student: Mount & Render
   *  -------------------------- */
  function ensureStudentMounted() {
    const s = Students[App.currentStudentId] || Students["S-01"];
    if (!s) return;

    // 同步 select
    const sel = $("#student-select");
    if (sel) sel.value = s.id;

    setText("#student-streak", String(s.streak));
    setStudentTab(App.studentTab);

    renderStudentGrowth();
    renderStudentQA();

    // 角色=学生时，侧边信息显示学生
    if (App.role === "student") applyRoleUI();
  }

  function onStudentChange(id) {
    App.currentStudentId = id;
    ensureStudentMounted();
    showToast("已切换学生档案");
  }

  function setStudentTab(tab) {
    App.studentTab = tab;

    const gBtn = $("#tab-growth");
    const qBtn = $("#tab-qa");
    if (gBtn && qBtn) {
      gBtn.classList.toggle("active", tab === "growth");
      qBtn.classList.toggle("active", tab === "qa");
    }

    const growth = $("#student-growth");
    const qa = $("#student-qa");
    if (growth) growth.classList.toggle("active", tab === "growth");
    if (qa) qa.classList.toggle("active", tab === "qa");
  }

  function renderStudentGrowth() {
    const st = Students[App.currentStudentId];
    if (!st) return;

    // gap list
    const gap = $("#gap-list");
    if (gap) gap.innerHTML = st.gaps.map((x) => `<li>${x}</li>`).join("");

    // weekly KPIs
    const m = st.weekly.mastery[st.weekly.mastery.length - 1];
    const w = st.weekly.wrong.reduce((a, b) => a + b, 0);
    const min = st.weekly.minutes.reduce((a, b) => a + b, 0);
    setText("#wk-mastery", `${m}%`);
    setText("#wk-wrong", String(w));
    setText("#wk-min", String(min));

    // archive
    const arc = $("#archive-list");
    if (arc) {
      arc.innerHTML = st.archive.map((a) => `
        <div class="archive-item">
          <div class="archive-title">${a.date} · ${a.title}</div>
          <div class="archive-sub">${a.desc}</div>
        </div>
      `).join("");
    }

    // resources init
    const rr = $("#resource-row");
    if (rr && !rr.dataset.inited) {
      rr.dataset.inited = "1";
      rr.innerHTML = "";
    }

    drawRadarChart($("#radar-canvas"), st);
    drawWeekChart($("#week-canvas"), st);
  }

  function drawRadarChart(canvas, st) {
    if (!canvas || !st) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2 + 6;
    const r = Math.min(W, H) * 0.34;
    const labels = st.radar.labels;
    const n = labels.length;

    // rings
    ctx.save();
    ctx.strokeStyle = "rgba(226,232,240,1)";
    ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      const rr = (r * k) / 4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + rr * Math.cos(ang);
        const y = cy + rr * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // axes
    ctx.save();
    ctx.strokeStyle = "rgba(226,232,240,1)";
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      ctx.stroke();
    }
    ctx.restore();

    function poly(vals, stroke, fill) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const vv = vals[i] / 100;
        const x = cx + r * vv * Math.cos(ang);
        const y = cy + r * vv * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // target
    poly(st.radar.target, "rgba(148,163,184,1)", "rgba(148,163,184,0.08)");
    // current
    poly(st.radar.current, "rgba(79,70,229,1)", "rgba(79,70,229,0.16)");

    // labels
    ctx.save();
    ctx.fillStyle = "rgba(100,116,139,1)";
    ctx.font = "bold 12px -apple-system,BlinkMacSystemFont,PingFang SC";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + (r + 18) * Math.cos(ang);
      const y = cy + (r + 18) * Math.sin(ang);
      ctx.fillText(labels[i], x, y);
    }
    ctx.restore();
  }

  function drawWeekChart(canvas, st) {
    if (!canvas || !st) return;

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

    const values = st.weekly.mastery;
    const minY = 55, maxY = 85;

    function xAt(i) {
      return pad.l + (cw * i) / (values.length - 1);
    }
    function yAt(v) {
      const t = (v - minY) / (maxY - minY);
      return pad.t + ch * (1 - t);
    }

    // area
    ctx.save();
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(xAt(values.length - 1), pad.t + ch);
    ctx.lineTo(xAt(0), pad.t + ch);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    grad.addColorStop(0, "rgba(99,102,241,0.22)");
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
    values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // points
    ctx.save();
    values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      ctx.fillStyle = "rgba(79,70,229,1)";
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // x labels
    ctx.save();
    ctx.fillStyle = "rgba(100,116,139,1)";
    ctx.font = "bold 11px -apple-system,BlinkMacSystemFont,PingFang SC";
    ctx.textAlign = "center";
    Trend.labels.forEach((lb, i) => {
      ctx.fillText(lb.replace("周", ""), xAt(i), H - 10);
    });
    ctx.restore();
  }

  function generateWeeklyReview() {
    const st = Students[App.currentStudentId];
    if (!st) return;

    const last = st.weekly.mastery[st.weekly.mastery.length - 1];
    const wrongSum = st.weekly.wrong.reduce((a, b) => a + b, 0);

    st.archive = [
      ...st.archive,
      {
        date: "本周",
        title: "周度学情复盘（自动生成）",
        desc: `本周掌握度 ${last}%，错题 ${wrongSum} 道。建议：优先巩固分数÷分数基础计算，再挑战 2 道迁移应用题。`,
      },
    ];

    renderStudentGrowth();
    showToast("周度复盘已沉淀到成长档案");
  }

  function recommendResources() {
    const rr = $("#resource-row");
    const st = Students[App.currentStudentId];
    if (!rr || !st) return;

    rr.innerHTML = `
      <div class="res-card">
        <div class="res-title">几何推理专项微课</div>
        <div class="res-sub">适配七年级 · 10分钟</div>
        <div class="res-tag">推荐学习</div>
      </div>
      <div class="res-card">
        <div class="res-title">分数除法基础计算</div>
        <div class="res-sub">3组巩固练习 · 8分钟</div>
        <div class="res-tag">优先补救</div>
      </div>
      <div class="res-card">
        <div class="res-title">同结构变式题（2道）</div>
        <div class="res-sub">应用题迁移训练 · 12分钟</div>
        <div class="res-tag">进阶挑战</div>
      </div>
    `;
    showToast("已推送资源到本周学习计划");
  }

  function askArchive() {
    const st = Students[App.currentStudentId];
    if (!st) return;
    openModal();
    setText("#modal-title", `档案查询 · ${st.name}`);
    const body = $("#modal-body");
    if (body) {
      body.innerHTML = `
        <div style="font-weight:1000;margin-bottom:8px;">本学期能力提升情况（示例）</div>
        <div style="color:#334155;margin-bottom:10px;">
          你在「学习习惯」与「几何推理」提升明显；「建模」仍是下一阶段重点。
        </div>
        <div style="padding:12px;border-radius:16px;background:#f8fafc;border:1px dashed rgba(79,70,229,0.18);">
          建议路径：<b>基础计算 → 建模模板 → 迁移变式</b><br/>
          每周目标：错题 ≤ 6，道道订正并能复述关键步骤。
        </div>
      `;
    }
  }

  /** --------------------------
   *  Student QA
   *  -------------------------- */
  function renderStudentQA() {
    const st = Students[App.currentStudentId];
    if (!st) return;

    // wrongbook
    const wb = $("#wrongbook");
    if (wb) {
      wb.innerHTML = st.wrongbook.map((x) => `
        <div class="wb-item">
          <div class="wb-title">${x.topic} · ${x.count}题</div>
          <div class="wb-sub">${x.hint}</div>
          <div class="wb-btn" onclick="showToast('已开始巩固练习（演示）')">一键巩固</div>
        </div>
      `).join("");
    }

    // extend reco
    const ex = $("#extend-reco");
    if (ex) {
      ex.innerHTML = `
        <div class="wb-item">
          <div class="wb-title">推荐：分数除法关键步骤</div>
          <div class="wb-sub">先化简 → 再乘倒数 → 约分检查</div>
          <div class="wb-btn" onclick="showToast('已打开微课（演示）')">查看微课</div>
        </div>
        <div class="wb-item">
          <div class="wb-title">推荐：单位1识别练习</div>
          <div class="wb-sub">适合应用题建模补齐</div>
          <div class="wb-btn" onclick="showToast('已推送练习（演示）')">推送练习</div>
        </div>
      `;
    }
  }

  function qaAdd(role, html) {
    const box = $("#qa-chat");
    if (!box) return;
    const div = document.createElement("div");
    div.className = `qa-msg ${role}`;
    div.innerHTML = `<div class="qa-bubble">${html}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function sendQA() {
    const input = $("#qa-input");
    if (!input || !input.value.trim()) return;
    const q = input.value.trim();
    input.value = "";

    qaAdd("user", q);

    setTimeout(() => {
      if (q.includes("÷") || q.includes("除法") || q.includes("3/4") || q.includes("20")) {
        qaAdd(
          "ai",
          `分步解析（示例）：<br/>
          ① 把 “20 ÷ 3/4” 看成 “20 ÷ (3/4)”<br/>
          ② 除以分数 = 乘以倒数 → 20 × 4/3<br/>
          ③ 先化简再乘：20 × 4/3 = 80/3<br/><br/>
          <b>易错点：</b>不要把 3/4 直接变成 4/3 后忘记“乘”。<br/>
          我已把这类错题归档到错题本，建议你做 3 道同结构巩固题。`
        );
        showToast("答疑完成：错题已归档（演示）");
        return;
      }

      if (q.includes("作文") || q.includes("通顺") || q.includes("修改")) {
        qaAdd(
          "ai",
          `作文评改（示例）：<br/>
          ① 结构：建议补充“起因→经过→结果”三段式<br/>
          ② 语言：把重复词替换为同义表达，减少口语化<br/>
          ③ 逻辑：段落之间加“因此/同时/最后”衔接词<br/><br/>
          你可以继续追问：<b>“帮我重写第2段”</b>`
        );
        showToast("已生成评改建议（演示）");
        return;
      }

      qaAdd("ai", `我理解你的问题。建议先明确：<b>已知条件</b>、<b>求什么</b>、<b>单位1</b>。你也可以发我题目关键步骤，我帮你逐步纠错。`);
    }, 350);
  }

  function quickAsk(text) {
    const input = $("#qa-input");
    if (!input) return;
    input.value = text;
    sendQA();
  }

  /** --------------------------
   *  Teacher -> Student Profile Drill
   *  -------------------------- */
  function openStudentProfile(studentId) {
    // 教师侧：弹窗内钻取学生档案，不跳学生端
    if (App.role === "teacher") {
      const st = Students[studentId] || Students["S-01"];
      setText("#modal-title", `学生档案 · ${st.name}`);
      const body = $("#modal-body");
      if (body) {
        body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:1000;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                ${st.name.slice(0,1)}
              </div>
              <div>
                <div style="font-weight:1000;">${st.name}</div>
                <div style="color:#64748b;font-weight:800;font-size:12px;margin-top:2px;">${st.grade} · 打卡 ${st.streak} 天</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" onclick="showToast('已模拟下发：补救任务（演示）')">下发补救任务</button>
              <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟家校提醒（演示）')">家校提醒</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns: 1fr 1fr; gap:12px;">
            <div style="border:1px solid rgba(226,232,240,0.9);border-radius:16px;padding:12px;background:#fff;">
              <div style="font-weight:1000;margin-bottom:8px;">能力雷达（示例）</div>
              <canvas id="modal-radar" width="320" height="230"></canvas>
              <div style="margin-top:8px;color:#64748b;font-weight:800;font-size:12px;">
                说明：蓝色=当前，灰色=目标
              </div>
            </div>

            <div style="border:1px solid rgba(226,232,240,0.9);border-radius:16px;padding:12px;background:#fff;">
              <div style="font-weight:1000;margin-bottom:8px;">周度掌握度趋势</div>
              <canvas id="modal-week" width="320" height="230"></canvas>
              <div style="margin-top:8px;color:#64748b;font-weight:800;font-size:12px;">
                建议：优先补齐“计算/建模”，再做迁移变式
              </div>
            </div>
          </div>

          <div style="margin-top:12px;padding:12px;border-radius:16px;background:#f8fafc;border:1px dashed rgba(79,70,229,0.18);">
            <div style="font-weight:1000;margin-bottom:8px;">差距提示（通俗版）</div>
            <ul style="margin:0;padding-left:18px;color:#334155;font-weight:800;font-size:13px;line-height:1.5;">
              ${st.gaps.map(g => `<li>${g}</li>`).join("")}
            </ul>
          </div>
        `;
      }

      openModal();

      // modal 内绘图
      setTimeout(() => {
        drawRadarChart($("#modal-radar"), st);
        drawWeekChart($("#modal-week"), st);
      }, 40);

      showToast("已在教师侧弹窗打开学生档案");
      return;
    }

    // 学生侧：允许进入学生端
    if (studentId && Students[studentId]) App.currentStudentId = studentId;
    switchView("student", document.querySelector('[data-view="student"]'));
    setStudentTab("growth");
    ensureStudentMounted();
    showToast("已打开成长档案");
  }

  /** --------------------------
   *  Student / Gov Entry from Home Cards
   *  -------------------------- */
  function enterStudent(tab = "growth", scrollToId = "") {
    if (App.role !== "student") {
      setRole("student");
      setTimeout(() => {
        setStudentTab(tab);
        ensureStudentMounted();
        if (scrollToId) {
          document.getElementById(scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 90);
      return;
    }

    switchView("student", document.querySelector('[data-view="student"]'));
    setStudentTab(tab);
    ensureStudentMounted();
    if (scrollToId) {
      document.getElementById(scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function enterGov(mode = "overview") {
    if (App.role !== "admin") {
      setRole("admin");
      setTimeout(() => enterGov(mode), 120);
      return;
    }

    App.govMode = mode;
    switchView("gov", document.querySelector('[data-view="gov"]'));

    openModal();

    if (mode === "overview") {
      setText("#modal-title", "治理总览 · 区县态势（示例）");
      const body = $("#modal-body");
      if (body) {
        body.innerHTML = `
          <div style="color:#334155;margin-bottom:10px;">
            汇总全区关键态势：活跃、作业量、掌握度、异常分布，用于领导总览与督导。
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="border:1px solid #e7ecf5;border-radius:14px;padding:12px;">
              <div style="font-weight:1000;">活跃教师</div>
              <div style="font-size:22px;font-weight:1100;margin-top:6px;">1,284</div>
              <div style="color:#64748b;font-size:12px;margin-top:4px;">周环比 +12%</div>
            </div>
            <div style="border:1px solid #e7ecf5;border-radius:14px;padding:12px;">
              <div style="font-weight:1000;">风险预警</div>
              <div style="font-size:22px;font-weight:1100;margin-top:6px;">37</div>
              <div style="color:#64748b;font-size:12px;margin-top:4px;">需关注学校 8 所</div>
            </div>
            <div style="border:1px solid #e7ecf5;border-radius:14px;padding:12px;">
              <div style="font-weight:1000;">平均掌握度</div>
              <div style="font-size:22px;font-weight:1100;margin-top:6px;">73%</div>
              <div style="color:#64748b;font-size:12px;margin-top:4px;">7日趋势上升</div>
            </div>
            <div style="border:1px solid #e7ecf5;border-radius:14px;padding:12px;">
              <div style="font-weight:1000;">作业覆盖</div>
              <div style="font-size:22px;font-weight:1100;margin-top:6px;">92%</div>
              <div style="color:#64748b;font-size:12px;margin-top:4px;">班级提交稳定</div>
            </div>
          </div>
          <div style="margin-top:12px;padding:12px;border-radius:14px;background:#f8fafc;border:1px dashed rgba(79,70,229,0.18);">
            <b>可下钻：</b>学校 → 年级 → 班级 → 异常类型（缺交/错误率/作业量/薄弱点集中）
          </div>
        `;
      }
      showToast("已进入治理总览");
      return;
    }

    if (mode === "risk") {
      setText("#modal-title", "风险预警 · 异常聚合（示例）");
      const body = $("#modal-body");
      if (body) {
        body.innerHTML = `
          <div style="color:#334155;margin-bottom:10px;">
            将“缺交、错误率、作业量、薄弱点集中”等预警聚合，支持一键督导与处置闭环。
          </div>
          <ul style="margin:0;padding-left:18px;color:#334155;line-height:1.6;">
            <li><b>[实验小学]</b> 作业缺交连续 2 天上升，建议触发家校协同提醒</li>
            <li><b>[第一中学]</b> 七年级数学“分数应用题”错误率偏高，建议教研专题</li>
            <li><b>[育才学校]</b> 作业量异常偏高，存在负担风险，建议适度调控</li>
            <li><b>[高新一小]</b> 课堂互动覆盖率低于阈值，建议重点督导</li>
          </ul>
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="showToast('已模拟下发：督导任务（演示）')">下发督导任务</button>
            <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟生成：风险周报（演示）')">生成风险周报</button>
          </div>
        `;
      }
      showToast("已进入风险预警");
      return;
    }

    // feed
    setText("#modal-title", "行为流督导 · 实时动态（示例）");
    const body = $("#modal-body");
    if (body) {
      body.innerHTML = `
        <div style="color:#334155;margin-bottom:10px;">
          汇聚教师侧关键行为（备课/组卷/批改/查看档案/下发补救）形成实时流，支撑过程督导。
        </div>
        <div style="padding:12px;border-radius:14px;border:1px solid #e7ecf5;">
          <div style="font-weight:1000;margin-bottom:8px;">示例关注点</div>
          <ul style="margin:0;padding-left:18px;color:#334155;line-height:1.6;">
            <li>重点学校是否按计划完成教案生成与作业分层</li>
            <li>异常出现后是否触发补救任务与家校提醒</li>
            <li>学生档案查看频次是否与教学调整闭环匹配</li>
          </ul>
        </div>
      `;
    }
    showToast("已进入行为流督导");
  }

  /** --------------------------
   *  Gov Background (demo)
   *  -------------------------- */
  function initMap() {
    const grid = $("#map-grid");
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i < 60; i++) {
      const bar = document.createElement("div");
      const isWarn = Math.random() > 0.85;
      const h = Math.random() * 250 + 50;
      bar.className = "data-bar " + (isWarn ? "warning" : "");
      bar.style.left = Math.random() * 1100 + 50 + "px";
      bar.style.top = Math.random() * 1100 + 50 + "px";
      grid.appendChild(bar);

      setTimeout(() => {
        bar.style.height = h + "px";
        bar.style.transform = `translateZ(${h}px)`;
      }, 100 + Math.random() * 1000);
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
      d.innerHTML = `<span style="color:#38bdf8;font-weight:900;">[${s}]</span> 李老师 ${a}`;
      list.prepend(d);
      if (list.children.length > 5) list.removeChild(list.lastChild);
    }, 1800);
  }

  function stopFeed() {
    if (App.feedTimer) clearInterval(App.feedTimer);
    App.feedTimer = null;
  }

  /** --------------------------
   *  Expose to window (for inline onclick)
   *  -------------------------- */
  window.setRole = setRole;
  window.resetRole = resetRole;

  window.switchView = switchView;
  window.setTeacherMode = setTeacherMode;
  window.startScenario = startScenario;
  window.startScenarioFromHome = startScenarioFromHome;
  window.triggerMsg = triggerMsg;

  window.selectTier = selectTier;
  window.setAnomalyFilter = setAnomalyFilter;
  window.openAnomalyDrawer = openAnomalyDrawer;
  window.runOCR = runOCR;

  window.openModal = openModal;
  window.closeModal = closeModal;

  window.onStudentChange = onStudentChange;
  window.setStudentTab = setStudentTab;
  window.generateWeeklyReview = generateWeeklyReview;
  window.recommendResources = recommendResources;
  window.askArchive = askArchive;

  window.sendQA = sendQA;
  window.quickAsk = quickAsk;

  window.openStudentProfile = openStudentProfile;
  window.showToast = showToast;

  window.enterStudent = enterStudent;
  window.enterGov = enterGov;

  /** --------------------------
   *  Boot
   *  -------------------------- */
  function boot() {
    const ver = $("#app-version");
    if (ver) ver.textContent = App.version;

    // 初始化 role
    ensureRoleReady();

    // 初始补渲染
    if ($("#trend-canvas") && App.role === "teacher") renderTeacherLinkedArea();
    if ($("#radar-canvas") && App.role === "student") ensureStudentMounted();
  }

  boot();
})();
