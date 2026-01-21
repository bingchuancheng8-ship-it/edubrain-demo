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
    version: "v1.0.0-portal",
    role: null, // 'teacher' | 'student' | 'admin' | 'parent'
    view: "portal",

    // sidebar
    sidebarCollapsed: false,
    drawerOpen: false,

    // teacher
    teacherMode: "ana", // prep | mark | ana | research | growth
    trendIndex: 6, // 0..6
    tierFocus: null, // 'A' | 'B' | 'C' | null
    anomalyFilter: "all", // all | missing | error | time
    isScanning: false,

// teacher extend (教研 / 成长)
researchTab: "topic", // topic | video
growthTab: "title", // title | master
selectedProjectId: "R-001",
videoAnalysisReady: false,
promotionPackReady: false,
selectedPromotionLevel: "一级教师",
    // student
    studentTab: "growth", // growth | qa
    currentStudentId: "S-01",

    // gov
    govMode: "overview", // overview | risk | feed
    feedTimer: null,
  

// portal / agents
pendingAction: null, // function to run after role selection
agentsTag: "全部",
agentsQuery: "",

// knowledge base (demo)
kbItems: [
  { id: "KB-001", category: "办事指南", title: "课后服务选课指南", status: "已发布", updatedAt: "2026-01-15", hits: 42 },
  { id: "KB-002", category: "通知公告", title: "本周家长会参会入口与注意事项", status: "已发布", updatedAt: "2026-01-18", hits: 31 },
  { id: "KB-003", category: "制度规范", title: "学生请假与到校管理规范", status: "已发布", updatedAt: "2026-01-10", hits: 18 },
],
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
    // portal/home/agents 对各角色开放（未选身份时由 Role Gate 遮罩拦截）
    const base = ["portal", "home", "agents"];
    if (role === "teacher") return [...base, "teacher"];
    if (role === "student") return [...base, "student"];
    if (role === "admin") return [...base, "gov", "kb"];
    if (role === "parent") return base;
    return base;
  }

  function applyRoleUI() {
    const role = App.role;
    const allowed = roleAllowedViews(role);

    // 左侧导航显示/隐藏
    const navPortal = $("#nav-portal");
const navHome = $("#nav-home");
const navAgents = $("#nav-agents");
const navTeacher = $("#nav-teacher");
const navStudent = $("#nav-student");
const navGov = $("#nav-gov");
const navKB = $("#nav-kb");

if (navPortal) navPortal.style.display = allowed.includes("portal") ? "flex" : "none";
if (navHome) navHome.style.display = allowed.includes("home") ? "flex" : "none";
if (navAgents) navAgents.style.display = allowed.includes("agents") ? "flex" : "none";
if (navTeacher) navTeacher.style.display = allowed.includes("teacher") ? "flex" : "none";
if (navStudent) navStudent.style.display = allowed.includes("student") ? "flex" : "none";
if (navGov) navGov.style.display = allowed.includes("gov") ? "flex" : "none";
if (navKB) navKB.style.display = allowed.includes("kb") ? "flex" : "none";

    // 首页卡片按角色隐藏：每端 3 张
    const cPrep = $("#home-card-prep");
    const cMark = $("#home-card-mark");
    const cAna = $("#home-card-ana");

    const cPNotice = $("#home-card-parent-notice");
    const cPService = $("#home-card-parent-service");
    const cPReport = $("#home-card-parent-report");

    const cGrowth = $("#home-card-growth");
    const cQA = $("#home-card-qa");
    const cWrong = $("#home-card-wrong");

    const cGovOverview = $("#home-card-gov-overview");
    const cGovRisk = $("#home-card-gov-risk");
    const cGovFeed = $("#home-card-gov-feed");

    if (cPrep) cPrep.style.display = role === "teacher" ? "block" : "none";
    if (cMark) cMark.style.display = role === "teacher" ? "block" : "none";
    if (cAna) cAna.style.display = role === "teacher" ? "block" : "none";

    if (cPNotice) cPNotice.style.display = role === "parent" ? "block" : "none";
    if (cPService) cPService.style.display = role === "parent" ? "block" : "none";
    if (cPReport) cPReport.style.display = role === "parent" ? "block" : "none";

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
      if (role === "teacher") tip.innerHTML = `当前身份：<b>教师</b>。你将仅看到教师相关入口（备课/批改/学情联动/教研/成长）。`;
      else if (role === "student") tip.innerHTML = `当前身份：<b>学生</b>。你将仅看到学生相关入口（成长档案/即时答疑/错题巩固）。`;
      else if (role === "admin") tip.innerHTML = `当前身份：<b>教育管理者</b>。你将仅看到管理相关入口（治理总览/风险预警/行为流督导）。`;
      else if (role === "parent") tip.innerHTML = `当前身份：<b>家长</b>。你将看到门户与共育相关入口（通知公告/校务办理/学情解读）。`;
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
    } else if (role === "parent") {
      if (avatar) avatar.textContent = "家";
      if (name) name.textContent = "家长";
      if (sub) sub.textContent = "家校协同 · 门户";
    } else {
      if (avatar) avatar.textContent = "访";
      if (name) name.textContent = "访客";
      if (sub) sub.textContent = "未选择身份 · 可先体验AI智能门户";
    }
  }



  /** --------------------------
   *  Sidebar Drawer / Collapse
   *  -------------------------- */
  function isDrawerMode() {
    try {
      return window.matchMedia && window.matchMedia("(max-width: 980px)").matches;
    } catch (e) {
      return window.innerWidth <= 980;
    }
  }

  function syncSidebarUI() {
    const body = document.body;
    if (!body) return;

    if (isDrawerMode()) {
      // drawer mode
      body.classList.remove("sidebar-collapsed");
      if (App.drawerOpen) body.classList.add("drawer-open");
      else body.classList.remove("drawer-open");
    } else {
      // desktop mode
      body.classList.remove("drawer-open");
      if (App.sidebarCollapsed) body.classList.add("sidebar-collapsed");
      else body.classList.remove("sidebar-collapsed");
    }
  }

  function toggleSidebar() {
    if (isDrawerMode()) App.drawerOpen = !App.drawerOpen;
    else App.sidebarCollapsed = !App.sidebarCollapsed;
    syncSidebarUI();
  }

  function closeDrawer() {
    App.drawerOpen = false;
    syncSidebarUI();
  }

  function openDrawer() {
    App.drawerOpen = true;
    syncSidebarUI();
  }
  function setRole(role) {
    App.role = role;
    try { localStorage.setItem("edubrain_role", role); } catch (e) {}

    applyRoleUI();
    hideRoleGate();

    // 若存在待执行动作（例如从智能体中心进入），优先执行
    if (typeof App.pendingAction === "function") {
      const fn = App.pendingAction;
      App.pendingAction = null;
      fn();
      return;
    }


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

    if (role === "parent") {
      switchView("portal", document.querySelector('[data-view="portal"]'));
      showToast("已以家长身份进入");
      return;
    }
  }

  function resetRole() {
    try { localStorage.removeItem("edubrain_role"); } catch (e) {}
    App.role = null;
    applyRoleUI();
    hideRoleGate();
    switchView("portal", document.querySelector('[data-view="portal"]'));
    showRoleGate();
    showToast("已退出身份，可重新选择");
  }

  function ensureRoleReady() {
    const saved = (() => {
      try { return localStorage.getItem("edubrain_role"); } catch (e) { return null; }
    })();

    if (saved === "teacher" || saved === "student" || saved === "admin" || saved === "parent") {
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
      } else if (saved === "parent") {
        switchView("portal", document.querySelector('[data-view="portal"]'));
      } else {
        switchView("gov", document.querySelector('[data-view="gov"]'));
      }
      return;
    }

    // 未选择过身份：进入即要求选择身份（Role Gate 遮罩）
    App.role = null;
    applyRoleUI();
    switchView("portal", document.querySelector('[data-view="portal"]'));
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
    // 任何页面切换都收起抽屉（移动端）
    try { closeDrawer(); } catch (e) {}
    // 角色隔离：不允许切入非本角色模块
    if (!isViewAllowed(id)) {
      showToast("当前身份无权访问该模块");
      const fallback =
        App.role === "student" ? "student" :
        App.role === "admin" ? "gov" :
        App.role === "teacher" ? "teacher" : "portal";
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
    const titles = { portal: "AI智能门户", home: "首页入口", agents: "智能体中心", teacher: "教师工作台", student: "学习伴侣", gov: "治理驾驶舱", kb: "知识库管理" };
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

    // portal / agents / kb init
    if (id === "agents") renderAgents();
    if (id === "kb") renderKB();
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

if (type === "research") {
  setTeacherMode("research");
  addMsg("ai", "已进入教研协同：跨校课题管理、成果共享与授课视频复盘（演示）。");
  return;
}

if (type === "growth") {
  setTeacherMode("growth");
  addMsg("ai", "已进入教师成长：职称材料智能梳理与跨区域名师联动（演示）。");
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

// 教研
if (v.includes("教研") || v.includes("课题") || v.includes("成果") || v.includes("复盘") || v.includes("视频")) {
  switchView("teacher", document.querySelector('[data-view="teacher"]'));
  setTeacherMode("research");
  addMsg("ai", "已进入教研协同：可进行跨校课题管理、成果共享与授课视频复盘（演示）。");
  return;
}

// 成长
if (v.includes("职称") || v.includes("晋升") || v.includes("名师") || v.includes("工作室") || v.includes("业绩")) {
  switchView("teacher", document.querySelector('[data-view="teacher"]'));
  setTeacherMode("growth");
  addMsg("ai", "已进入教师成长：职称材料梳理与名师工作联动（演示）。");
  return;
}

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
const btnResearch = $("#btn-research");
const btnGrowth = $("#btn-growth");

const setBtn = (btn, active) => {
  if (!btn) return;
  btn.className = "btn " + (active ? "btn-primary" : "btn-ghost");
};

setBtn(btnPrep, mode === "prep");
setBtn(btnMark, mode === "mark");
setBtn(btnAna, mode === "ana");
setBtn(btnResearch, mode === "research");
setBtn(btnGrowth, mode === "growth");

// toggle views

    const map = { prep: "#prep-view", mark: "#mark-view", ana: "#ana-view", research: "#research-view", growth: "#growth-view" };
    Object.values(map).forEach((v) => {
      const el = $(v);
      if (el) el.classList.remove("active");
    });
    const active = $(map[mode]);
    if (active) active.classList.add("active");

    if (mode === "mark") resetOCR();
    if (mode === "prep") renderLessonCard(false);
    if (mode === "ana") renderTeacherLinkedArea();
    if (mode === "research") renderTeacherResearch(true);
    if (mode === "growth") renderTeacherGrowth(true);
  

    // 教研/成长：默认放大工作区，避免与左侧对话面板挤压
    const split = document.querySelector('#view-teacher .split-layout');
    if (split) {
      if (mode === 'research' || mode === 'growth') split.classList.add('wide');
      else split.classList.remove('wide');
    }
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
  // 教研：跨校协同 + 视频复盘
  if (q.includes("教研") || q.includes("课题") || q.includes("成果") || q.includes("成果共享") || q.includes("复盘") || q.includes("视频")) {
    addMsg("ai", "已进入教研协同：可进行跨校课题管理、成果共享，并支持授课视频行为分析生成复盘报告。");
    setTeacherMode("research");
    return;
  }

  // 成长：职称晋升 + 名师联动
  if (q.includes("职称") || q.includes("晋升") || q.includes("名师") || q.includes("工作室") || q.includes("业绩")) {
    addMsg("ai", "已进入教师成长：支持职称材料智能梳理与跨区域名师工作联动（经验沉淀与资源共享）。");
    setTeacherMode("growth");
    return;
  }

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
      <div class="lesson-head-row">
        <div>
          <h2 style="margin:0">📘 教学设计生成（模板驱动 · 演示）</h2>
          <div class="lesson-sub">模板卡片 + 参数标签 + 结构化输出 + 可导出（对标市级特供智能体交互范式）</div>
        </div>
        <div class="lesson-export">
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟导出：Word（演示）')">导出 Word</button>
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟导出：PDF（演示）')">导出 PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟导出：PPT（演示）')">导出 PPT</button>
        </div>
      </div>

      <div class="prep-builder card" style="box-shadow:none; border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02); margin-top:12px;">
        <div class="builder-row">
          <div class="builder-label">模板</div>
          <div class="tpl-grid" id="prep-tpl-grid">
            <div class="tpl-card" data-tpl="同步授新课" onclick="setPrepTemplate('同步授新课')">同步授新课</div>
            <div class="tpl-card" data-tpl="问题链教学" onclick="setPrepTemplate('问题链教学')">问题链教学</div>
            <div class="tpl-card" data-tpl="项目式学习" onclick="setPrepTemplate('项目式学习')">项目式学习</div>
            <div class="tpl-card" data-tpl="复习讲评课" onclick="setPrepTemplate('复习讲评课')">复习讲评课</div>
          </div>
        </div>

        <div class="builder-row">
          <div class="builder-label">关键参数</div>
          <div class="builder-fields">
            <select id="prep-grade" class="mini-select">
              <option>小学四年级</option>
              <option>小学五年级</option>
              <option>七年级</option>
              <option selected>高一</option>
            </select>
            <select id="prep-subject" class="mini-select">
              <option selected>数学</option>
              <option>语文</option>
              <option>英语</option>
            </select>
            <select id="prep-version" class="mini-select">
              <option selected>人教版</option>
              <option>北师大版</option>
              <option>苏教版</option>
            </select>
            <select id="prep-duration" class="mini-select">
              <option>35分钟</option>
              <option selected>40分钟</option>
              <option>45分钟</option>
            </select>
            <select id="prep-level" class="mini-select">
              <option>基础偏弱</option>
              <option selected>中等混合</option>
              <option>基础较强</option>
            </select>
            <label class="mini-check">
              <input type="checkbox" id="prep-deep" />
              深度推理
            </label>
          </div>
        </div>

        <div class="builder-row">
          <div class="builder-label">补充要求</div>
          <input id="prep-extra" class="magic-input" placeholder="如：补齐薄弱点强化环节/分层作业/课堂互动…" value="补齐薄弱点强化环节，生成分层练习与评价要点" />
        </div>

        <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="prepGenerate()">一键生成</button>
        <div class="compliance-tip">合规提示：输出仅用于教学参考，避免包含未成年人隐私与敏感信息（演示）。</div>
      </div>

      <div id="prep-generated" class="prep-generated"></div>
    </div>
  `;

  // 首次进入默认生成一版
  setTimeout(() => prepInit(), 0);
}

  /*
/** --------------------------
 *  Teacher: Research (教研) & Growth (成长)
 *  -------------------------- */

const TeacherResearchProjects = [
  {
    id: "R-001",
    title: "分层作业策略优化（跨校）",
    status: "进行中",
    schools: ["朝阳一小", "通州二中"],
    updated: "2026-01-18",
    owner: "李老师",
    goal: "以班级画像为依据，形成“分层作业 + 讲评课问题链”共案，并验证对薄弱点掌握度提升的效果。",
  },
  {
    id: "R-002",
    title: "项目式学习任务设计（语文/综合）",
    status: "立项中",
    schools: ["海淀实验中学", "西城四小"],
    updated: "2026-01-12",
    owner: "张老师",
    goal: "围绕“项目式学习”模板沉淀任务包与评价量规，实现跨校复用。",
  },
  {
    id: "R-003",
    title: "课堂提问质量提升（视频循证）",
    status: "复盘中",
    schools: ["东城七中", "顺义一中"],
    updated: "2026-01-08",
    owner: "王老师",
    goal: "通过授课视频分析识别提问类型、等待时间与学生参与度，形成可执行改进建议。",
  },
];

const ResearchArtifacts = {
  "R-001": [
    { name: "共案教案（v0.3）", type: "教案", updated: "2026-01-18" },
    { name: "分层练习包（A/B/C）", type: "资源包", updated: "2026-01-17" },
    { name: "教研纪要（第2次）", type: "纪要", updated: "2026-01-16" },
  ],
  "R-002": [
    { name: "项目任务书（模板）", type: "模板", updated: "2026-01-12" },
    { name: "评价量规（Rubric）", type: "评价", updated: "2026-01-12" },
  ],
  "R-003": [
    { name: "视频复盘报告（样例）", type: "报告", updated: "2026-01-08" },
  ],
};

function setResearchTab(tab) {
  App.researchTab = tab;
  renderTeacherResearch(true);
}

function selectResearchProject(id) {
  App.selectedProjectId = id;
  renderTeacherResearch(true);
}

function researchCreateProject() {
  showToast("已模拟创建课题（演示）");
}

function researchShareArtifact(name) {
  showToast(`已模拟共享成果：${name}（演示）`);
}

function startVideoAnalysis() {
  if (App.videoAnalysisReady) {
    showToast("已存在分析结果（演示）");
    return;
  }
  showToast("开始分析授课视频：课堂结构 / 提问质量 / 参与度（演示）");
  const btn = $("#btn-video-analyze");
  if (btn) btn.disabled = true;

  setTimeout(() => {
    App.videoAnalysisReady = true;
    renderTeacherResearch(true);
    showToast("分析完成：已生成课堂复盘报告（演示）");
  }, 900);
}

function renderTeacherResearch(showUI = true) {
  const placeholder = $("#research-placeholder");
  const root = $("#research-root");
  if (!placeholder || !root) return;

  if (!showUI) {
    placeholder.style.display = "flex";
    root.style.display = "none";
    return;
  }

  placeholder.style.display = "none";
  root.style.display = "block";

  // keep selection sane
  const selected =
    TeacherResearchProjects.find((p) => p.id === App.selectedProjectId) || TeacherResearchProjects[0];
  App.selectedProjectId = selected.id;

  const tab = App.researchTab || "topic";
  const tabTopic = tab === "topic";
  const tabVideo = tab === "video";

  const projectList = TeacherResearchProjects.map((p) => {
    const active = p.id === selected.id ? "active" : "";
    return `
      <div class="research-item ${active}" onclick="selectResearchProject('${p.id}')">
        <div class="ri-top">
          <div class="ri-title">${p.title}</div>
          <div class="ri-status ${p.status === "进行中" ? "s-on" : p.status === "立项中" ? "s-new" : "s-review"}">${p.status}</div>
        </div>
        <div class="ri-sub">${p.schools.join(" · ")} · 负责人：${p.owner}</div>
        <div class="ri-sub">最近更新：${p.updated}</div>
      </div>
    `;
  }).join("");

  const artifacts = (ResearchArtifacts[selected.id] || []).map((a) => {
    return `
      <div class="archive-item">
        <div class="archive-title">${a.name}</div>
        <div class="archive-sub">类型：${a.type} · 更新：${a.updated}</div>
        <div class="archive-footer">
          <button class="btn btn-ghost btn-sm" onclick="researchShareArtifact('${a.name.replace(/'/g, "\\'")}')">共享</button>
          <button class="btn btn-primary btn-sm" onclick="showToast('已模拟下载：${a.name}（演示）')">下载</button>
        </div>
      </div>
    `;
  }).join("");

  const videoPanel = (() => {
    if (!App.videoAnalysisReady) {
      return `
        <div class="res-card">
          <div class="res-title">授课视频分析（行为数据化复盘）</div>
          <div class="res-sub">上传/选择授课视频 → 自动识别课堂环节、提问类型、学生参与度，生成可执行复盘建议。</div>
          <div class="teacher-actions-row">
            <button class="btn btn-ghost" onclick="showToast('已模拟上传授课视频（演示）')">上传视频</button>
            <button class="btn btn-primary" id="btn-video-analyze" onclick="startVideoAnalysis()">开始分析（演示）</button>
          </div>
          <div class="compliance-tip" style="margin-top:10px;">合规提示：视频仅用于教学行为分析，需取得授权并脱敏处理（演示）。</div>
        </div>
      `;
    }

    return `
      <div class="res-card">
        <div class="res-title">复盘报告（已生成 · 演示）</div>
        <div class="res-sub">课堂结构识别 + 提问质量评估 + 参与度异常定位（可导出）。</div>

        <div class="mini-kpi-row">
          <div class="mini-kpi">
            <div class="mk-l">有效教学时长</div>
            <div class="mk-v">37 min</div>
          </div>
          <div class="mini-kpi">
            <div class="mk-l">互动次数</div>
            <div class="mk-v">18</div>
          </div>
          <div class="mini-kpi">
            <div class="mk-l">高阶问题占比</div>
            <div class="mk-v">22%</div>
          </div>
          <div class="mini-kpi">
            <div class="mk-l">低参与学生</div>
            <div class="mk-v">5</div>
          </div>
        </div>

        <div class="gap-box" style="margin-top:12px;">
          <div class="gap-title">关键发现（示例）</div>
          <ul class="gap-list">
            <li>导入环节偏长（11min），建议将“情境导入”压缩至 6–7min。</li>
            <li>提问以“识记/理解”为主，高阶追问不足；建议加入 3 轮“为什么/如果/对比”追问。</li>
            <li>第 3 排与后排出现持续低参与（≥ 8min），建议增加小组协作与点名反馈频率。</li>
          </ul>
        </div>

        <div class="teacher-actions-row" style="margin-top:12px;">
          <button class="btn btn-ghost" onclick="showToast('已模拟生成：课堂时间轴（演示）')">查看时间轴</button>
          <button class="btn btn-ghost" onclick="showToast('已模拟定位：低参与学生名单（演示）')">定位异常学生</button>
          <button class="btn btn-primary" onclick="showToast('已模拟导出：复盘报告 PDF（演示）')">导出报告</button>
        </div>
      </div>
    `;
  })();

  root.innerHTML = `
    <div class="lesson-card teacher-extra-shell">
      <div class="lesson-head-row">
        <div>
          <h2 style="margin:0">🧪 跨校教研协同（课题管理 + 成果共享）</h2>
          <div class="lesson-sub">“平台 + 智能体”模式：从课题到共案到循证复盘，沉淀可复用教研资产（演示）</div>
        </div>
        <div class="lesson-export">
          <button class="btn btn-ghost btn-sm" onclick="researchCreateProject()">新建课题</button>
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟：发起跨校教研会议（演示）')">发起教研会议</button>
          <button class="btn btn-primary btn-sm" onclick="showToast('已模拟导出：教研成果包（演示）')">导出成果包</button>
        </div>
      </div>

      <div class="student-tabs" style="margin-top:12px;">
        <div class="tab-btn ${tabTopic ? "active" : ""}" onclick="setResearchTab('topic')">课题协同</div>
        <div class="tab-btn ${tabVideo ? "active" : ""}" onclick="setResearchTab('video')">授课视频分析</div>
      </div>

      <div class="teacher-extra-grid">
        <div>
          <div class="res-card">
            <div class="res-title">课题列表（跨校）</div>
            <div class="res-sub">选择课题 → 查看目标、成员与成果（演示）。</div>
            <div class="research-list">${projectList}</div>
          </div>
        </div>

        <div>
          ${tabTopic ? `
            <div class="res-card">
              <div class="res-title">课题详情：${selected.title}</div>
              <div class="res-sub">${selected.schools.join(" · ")} · 负责人：${selected.owner} · 更新：${selected.updated}</div>

              <div class="gap-box" style="margin-top:10px;">
                <div class="gap-title">目标与产出（示例）</div>
                <ul class="gap-list">
                  <li>${selected.goal}</li>
                  <li>形成“共案教案 + 分层练习 + 评价量规 + 复盘报告”标准化资产。</li>
                </ul>
              </div>

              <div class="teacher-actions-row" style="margin-top:12px;">
                <button class="btn btn-ghost" onclick="showToast('已模拟：添加成员/学校（演示）')">添加协同学校</button>
                <button class="btn btn-ghost" onclick="showToast('已模拟：发布任务清单（演示）')">发布任务清单</button>
                <button class="btn btn-primary" onclick="showToast('已模拟：AI生成教研纪要（演示）')">AI生成纪要</button>
              </div>
            </div>

            <div style="height:12px;"></div>

            <div class="res-card">
              <div class="res-title">成果共享（可复用资产）</div>
              <div class="res-sub">统一结构化封装：版本、来源、适用学段/教材、可量化成效（演示）。</div>
              <div class="archive-list" style="margin-top:10px;">${artifacts || '<div class="empty-sub">暂无成果（演示）</div>'}</div>
            </div>
          ` : videoPanel}
        </div>
      </div>
    </div>
  `;
}

function setGrowthTab(tab) {
  App.growthTab = tab;
  renderTeacherGrowth(true);
}

function setPromotionLevel(v) {
  App.selectedPromotionLevel = v;
}

function buildPromotionPack() {
  App.promotionPackReady = true;
  showToast("已生成职称材料清单与缺失项提示（演示）");
  renderTeacherGrowth(true);
}

function growthSyncToKB(title) {
  const item = {
    id: "KB-" + Math.random().toString(16).slice(2, 8),
    title: title,
    type: "教研成果",
    status: "已发布",
    updated: "2026-01-21",
  };
  App.kbItems.unshift(item);
  showToast("已沉淀到区级知识库（演示）");
}

function renderTeacherGrowth(showUI = true) {
  const placeholder = $("#growth-placeholder");
  const root = $("#growth-root");
  if (!placeholder || !root) return;

  if (!showUI) {
    placeholder.style.display = "flex";
    root.style.display = "none";
    return;
  }

  placeholder.style.display = "none";
  root.style.display = "block";

  const tab = App.growthTab || "title";
  const tabTitle = tab === "title";
  const tabMaster = tab === "master";

  const level = App.selectedPromotionLevel || "一级教师";

  const titlePanel = `
    <div class="res-card">
      <div class="res-title">职称晋升材料智能梳理</div>
      <div class="res-sub">业绩成果聚合 + 证明材料归档 + 缺失项提示 + 一键打包导出（演示）。</div>

      <div class="teacher-form-row">
        <select class="mini-select" onchange="setPromotionLevel(this.value)">
          <option ${level === "二级教师" ? "selected" : ""}>二级教师</option>
          <option ${level === "一级教师" ? "selected" : ""}>一级教师</option>
          <option ${level === "高级教师" ? "selected" : ""}>高级教师</option>
        </select>
        <select class="mini-select">
          <option>近3年</option>
          <option selected>近5年</option>
          <option>近8年</option>
        </select>
        <select class="mini-select">
          <option selected>教学业绩</option>
          <option>教研成果</option>
          <option>竞赛辅导</option>
          <option>培训与讲座</option>
        </select>
        <button class="btn btn-ghost" onclick="showToast('已模拟上传：证明材料（演示）')">上传证明</button>
        <button class="btn btn-primary" onclick="buildPromotionPack()">一键梳理</button>
      </div>

      ${App.promotionPackReady ? `
        <div class="gap-box" style="margin-top:12px;">
          <div class="gap-title">材料清单（${level} · 示例）</div>
          <ul class="gap-list">
            <li>教学业绩：学期教学任务书、教学效果数据（学情报告/质量监测）、公开课证明</li>
            <li>教研成果：课题立项/结题证明、论文/案例、校本课程/资源包</li>
            <li>荣誉奖励：区级以上奖项、竞赛指导获奖证明</li>
            <li>继续教育：培训学时、研修证书、名师工作室活动证明</li>
          </ul>
        </div>

        <div class="gap-box" style="margin-top:12px;">
          <div class="gap-title">缺失项提示（示例）</div>
          <ul class="gap-list">
            <li>近两学期“学情改进闭环”证据不足：建议补充“改进方案 + 前后对比数据”。</li>
            <li>公开课材料缺“听评课记录”：建议从教研平台一键补齐并签章归档。</li>
          </ul>
        </div>

        <div class="teacher-actions-row" style="margin-top:12px;">
          <button class="btn btn-ghost" onclick="showToast('已模拟生成：申报表自动填充（演示）')">自动填表</button>
          <button class="btn btn-ghost" onclick="showToast('已模拟：材料按条目自动归档（演示）')">自动归档</button>
          <button class="btn btn-primary" onclick="showToast('已模拟导出：职称申报材料包（演示）')">导出申报包</button>
        </div>
      ` : `
        <div class="compliance-tip" style="margin-top:10px;">提示：材料梳理需对接校务系统/档案系统；演示中仅展示交互范式。</div>
      `}
    </div>
  `;

  const masterPanel = `
    <div class="res-card">
      <div class="res-title">跨区域名师工作联动</div>
      <div class="res-sub">经验沉淀（可检索）+ 资源共享（可复用）+ 活动协同（可量化）（演示）。</div>

      <div class="mini-kpi-row" style="margin-top:10px;">
        <div class="mini-kpi">
          <div class="mk-l">工作室成员</div>
          <div class="mk-v">38</div>
        </div>
        <div class="mini-kpi">
          <div class="mk-l">共享资源包</div>
          <div class="mk-v">126</div>
        </div>
        <div class="mini-kpi">
          <div class="mk-l">联合教研活动</div>
          <div class="mk-v">12</div>
        </div>
        <div class="mini-kpi">
          <div class="mk-l">复用次数</div>
          <div class="mk-v">1,240</div>
        </div>
      </div>

      <div class="gap-box" style="margin-top:12px;">
        <div class="gap-title">本周协同计划（示例）</div>
        <ul class="gap-list">
          <li>周三 19:30：跨区同课异构（数学：函数图像）</li>
          <li>周五 15:00：课堂视频循证复盘（提问链优化）</li>
        </ul>
      </div>

      <div class="teacher-actions-row" style="margin-top:12px;">
        <button class="btn btn-ghost" onclick="showToast('已模拟：发起跨区共备（演示）')">发起共备</button>
        <button class="btn btn-ghost" onclick="showToast('已模拟：共享资源包（演示）')">共享资源包</button>
        <button class="btn btn-primary" onclick="growthSyncToKB('名师工作室 · 课堂提问链最佳实践')">沉淀到知识库</button>
      </div>

      <div class="archive-list" style="margin-top:12px;">
        <div class="archive-item">
          <div class="archive-title">最佳实践：问题链教学（模板 + 案例）</div>
          <div class="archive-sub">适用：初中数学 · 版本：v1.1 · 复用：268 次</div>
        </div>
        <div class="archive-item">
          <div class="archive-title">资源包：分层练习（A/B/C）+ 讲评课脚本</div>
          <div class="archive-sub">适用：七年级数学 · 复用：412 次</div>
        </div>
        <div class="archive-item">
          <div class="archive-title">循证复盘：课堂互动提升路径（含指标口径）</div>
          <div class="archive-sub">输出：复盘报告模板 · 复用：197 次</div>
        </div>
      </div>
    </div>
  `;

  root.innerHTML = `
    <div class="lesson-card teacher-extra-shell">
      <div class="lesson-head-row">
        <div>
          <h2 style="margin:0">🏅 教师成长（职称晋升 + 名师联动）</h2>
          <div class="lesson-sub">以“证据链”组织材料，以“知识库”沉淀经验，以“协同”放大名师价值（演示）</div>
        </div>
        <div class="lesson-export">
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟：同步校务档案（演示）')">同步档案</button>
          <button class="btn btn-ghost btn-sm" onclick="showToast('已模拟：生成年度业绩汇总（演示）')">生成汇总</button>
          <button class="btn btn-primary btn-sm" onclick="showToast('已模拟导出：成长档案包（演示）')">导出档案包</button>
        </div>
      </div>

      <div class="student-tabs" style="margin-top:12px;">
        <div class="tab-btn ${tabTitle ? "active" : ""}" onclick="setGrowthTab('title')">职称晋升材料</div>
        <div class="tab-btn ${tabMaster ? "active" : ""}" onclick="setGrowthTab('master')">名师工作联动</div>
      </div>

      ${tabTitle ? titlePanel : masterPanel}
    </div>
  `;
}

  /** --------------------------
   *  Teacher Linked Area (Trend <-> Tier <-> Anomaly)
   *  -------------------------- */
  function ensureTeacherMounted() {
  if (App.teacherMode === "ana") {
    renderTeacherLinkedArea();
    return;
  }
  if (App.teacherMode === "prep") {
    renderLessonCard(false);
    return;
  }
  if (App.teacherMode === "research") {
    renderTeacherResearch(true);
    return;
  }
  if (App.teacherMode === "growth") {
    renderTeacherGrowth(true);
    return;
  }
  // default
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
 *  Portal / Agents / KB
 *  -------------------------- */

const AgentCatalog = [
  {
    id: "portal",
    name: "AI智能门户",
    badge: "统一入口",
    desc: "门户（结构化）+ 数字人（对话）双通道，承载校园动态、办事指南与家校协同。",
    tags: ["市级特供", "助管", "门户"],
    recommendedRole: null,
    action: () => switchView("portal", document.querySelector('[data-view="portal"]')),
  },
  {
    id: "teacher_prep",
    name: "小学数学教学设计智能体",
    badge: "助教",
    desc: "模板驱动生成教案/课标分析/教学活动与评价建议，并支持导出。",
    tags: ["市级特供", "助教", "模板驱动"],
    recommendedRole: "teacher",
    action: () => startScenario("prep"),
  },
  {
    id: "homeroom",
    name: "班主任智能体",
    badge: "助育",
    desc: "通知公告生成、家校沟通话术、批量评语与个性化提醒（演示）。",
    tags: ["市级特供", "助育", "助评"],
    recommendedRole: "teacher",
    action: () => startScenario("mark"),
  },
  {
    id: "english_write",
    name: "小学英语读写写作智能体",
    badge: "助学",
    desc: "分层写作引导、范文改写与语言要点提示（演示）。",
    tags: ["市级特供", "助学", "多轮引导"],
    recommendedRole: "student",
    action: () => enterStudent("qa"),
  },
  {
    id: "pbl_chinese",
    name: "初中语文学科项目式学习智能体",
    badge: "项目式",
    desc: "从驱动问题—任务拆解—成果评价，生成可执行的项目式学习方案（演示）。",
    tags: ["市级特供", "助教", "项目式"],
    recommendedRole: "teacher",
    action: () => startScenario("prep"),
  },
  {
    id: "math_high",
    name: "高中数学教学助手",
    badge: "工作台式",
    desc: "模板卡片 + 参数标签 + 结构化输出，强调可控与可导出（演示）。",
    tags: ["市级特供", "助教", "工作台"],
    recommendedRole: "teacher",
    action: () => startScenario("prep"),
  },
  {
    id: "gov_overview",
    name: "校长/管理者智能体",
    badge: "助管",
    desc: "问数据、看预警、给抓手：治理总览与风险督导联动（演示）。",
    tags: ["市级特供", "助管", "治理"],
    recommendedRole: "admin",
    action: () => enterGov("overview"),
  },
  {
    id: "kb",
    name: "学校私有知识库管理",
    badge: "底座",
    desc: "上传/维护/发布学校私域内容，支撑数字人问答与智能体稳定输出。",
    tags: ["平台能力", "知识库", "合规"],
    recommendedRole: "admin",
    action: () => switchView("kb", document.querySelector('[data-view="kb"]')),
  },
];

const AgentTags = (() => {
  const s = new Set();
  AgentCatalog.forEach(a => (a.tags || []).forEach(t => s.add(t)));
  return ["全部", ...Array.from(s)];
})();

function openAgent(agentId) {
  const agent = AgentCatalog.find(a => a.id === agentId);
  if (!agent) return showToast("未找到该智能体");

  // 推荐身份引导（未选择身份时直接弹窗）
  if (agent.recommendedRole && App.role !== agent.recommendedRole) {
    App.pendingAction = () => openAgent(agentId);
    showRoleGate();
    showToast(`建议选择“${agent.recommendedRole === "teacher" ? "教师" : agent.recommendedRole === "student" ? "学生" : "教育管理者"}”身份体验该智能体`);
    return;
  }

  agent.action();
}

function setAgentsTag(tag) {
  App.agentsTag = tag;
  renderAgents();
}

function renderAgents() {
  const qEl = $("#agents-search");
  App.agentsQuery = (qEl?.value || "").trim();

  // tags
  const tagsWrap = $("#agents-tags");
  if (tagsWrap && !tagsWrap.dataset.mounted) {
    tagsWrap.dataset.mounted = "1";
    tagsWrap.innerHTML = AgentTags.map(t => `<button class="chip ${t === App.agentsTag ? "chip-active" : ""}" onclick="setAgentsTag('${t}')">${t}</button>`).join("");
  } else if (tagsWrap) {
    // refresh active state
    Array.from(tagsWrap.querySelectorAll("button.chip")).forEach(btn => {
      const t = btn.textContent.trim();
      btn.classList.toggle("chip-active", t === App.agentsTag);
    });
  }

  const list = $("#agents-grid");
  if (!list) return;

  const query = App.agentsQuery.toLowerCase();
  const filtered = AgentCatalog.filter(a => {
    const hitQ = !query || (a.name + " " + a.desc + " " + (a.tags || []).join(" ")).toLowerCase().includes(query);
    const hitT = App.agentsTag === "全部" || (a.tags || []).includes(App.agentsTag);
    return hitQ && hitT;
  });

  list.innerHTML = filtered.map(a => `
    <div class="agent-card card" onclick="openAgent('${a.id}')">
      <div class="agent-top">
        <div>
          <div class="agent-name">${a.name}</div>
          <div class="agent-badge">${a.badge || ""}</div>
        </div>
        <div class="agent-role">${a.recommendedRole ? (a.recommendedRole === "teacher" ? "教师" : a.recommendedRole === "student" ? "学生" : "管理") : "通用"}</div>
      </div>
      <div class="agent-desc">${a.desc}</div>
      <div class="agent-tags">
        ${(a.tags || []).slice(0, 4).map(t => `<span class="tag-pill">${t}</span>`).join("")}
      </div>
    </div>
  `).join("");
}

function portalGo(key) {
  const sec = $("#portal-section");
  if (!sec) return;

  if (key === "news") {
    sec.innerHTML = `
      <div class="section-title">校园动态</div>
      <div class="section-list">
        <div class="section-item">校运动会：报名通道已开启（示例）</div>
        <div class="section-item">心理健康月：线上课程与测评安排（示例）</div>
        <div class="section-item">本周班级活动：志愿服务与实践记录（示例）</div>
      </div>
    `;
    return;
  }

  if (key === "service") {
    sec.innerHTML = `
      <div class="section-title">办事指南</div>
      <div class="section-list">
        <div class="section-item">课后服务：选课入口、时间与常见问题（示例）</div>
        <div class="section-item">入学报名：材料清单与办理流程（示例）</div>
        <div class="section-item">校服订购：尺码、支付与售后（示例）</div>
      </div>
    `;
    return;
  }

  if (key === "homeSchool") {
    sec.innerHTML = `
      <div class="section-title">家校沟通</div>
      <div class="section-list">
        <div class="section-item">家长会：参会入口、议程与提问方式（示例）</div>
        <div class="section-item">学情解读：家长版建议与学习陪伴提示（示例）</div>
        <div class="section-item">活动确认：一键确认/请假/留言（示例）</div>
      </div>
    `;
    return;
  }
}

function portalAsk(q) {
  const chat = $("#portal-chat");
  if (!chat) return;

  const safe = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  chat.innerHTML += `<div class="dh-bubble user">${safe(q)}</div>`;
  chat.scrollTop = chat.scrollHeight;

  const text = q || "";
  let answer = "我已收到。你可以选择身份进入演示系统，体验更完整的教学、学情与治理智能体。";

  // KB 轻量命中（按标题关键词）
  const hit = App.kbItems.find(it => (text.includes("课后") && it.title.includes("课后")) ||
    (text.includes("家长会") && it.title.includes("家长会")) ||
    (text.includes("请假") && it.title.includes("请假")) ||
    (text.includes("入学") && it.title.includes("入学")) ||
    (text.includes("校服") && it.title.includes("校服"))
  );

  if (text.includes("课后")) {
    answer = "课后服务一般按“选课入口 → 选择课程 → 确认支付/提交 → 查看排课”完成。你也可以在左侧“办事指南”查看详细步骤（演示）。";
  } else if (text.includes("入学")) {
    answer = "入学报名通常需要：户口/居住证明、监护关系材料、预防接种/体检等（以学校实际要求为准）。我可以为你列出材料清单与办理时间（演示）。";
  } else if (text.includes("家长会")) {
    answer = "家长会入口一般在“通知公告/班级通知”中，包含会议链接与议程。若你希望，我可以生成一份“参会提醒+提问模板”（演示）。";
  } else if (text.includes("校服")) {
    answer = "校服订购通常包含：尺码采集、在线支付、到货试穿与售后。你可以问我“如何测量尺码/如何退换”（演示）。";
  } else if (hit) {
    answer = `已为你命中知识库条目：《${hit.title}》（${hit.category}）。你可以在“知识库管理”中查看与维护（演示）。`;
  }

  setTimeout(() => {
    chat.innerHTML += `<div class="dh-bubble ai">${safe(answer)}</div>`;
    chat.scrollTop = chat.scrollHeight;
  }, 260);
}

function portalSend() {
  const input = $("#portal-input");
  if (!input || !input.value.trim()) return;
  const q = input.value.trim();
  input.value = "";
  portalAsk(q);
}


// --- Prep Builder (template + parameters) ---
function prepInit() {
  // 默认模板
  if (!App.prepTemplate) App.prepTemplate = "同步授新课";
  setPrepTemplate(App.prepTemplate);
  prepGenerate(true);
}

function setPrepTemplate(tpl) {
  App.prepTemplate = tpl;
  const grid = $("#prep-tpl-grid");
  if (grid) {
    Array.from(grid.querySelectorAll(".tpl-card")).forEach(el => {
      el.classList.toggle("tpl-active", el.getAttribute("data-tpl") === tpl);
    });
  }
}

function prepGenerate(silent = false) {
  const grade = ($("#prep-grade")?.value || "高一").trim();
  const subject = ($("#prep-subject")?.value || "数学").trim();
  const version = ($("#prep-version")?.value || "人教版").trim();
  const duration = ($("#prep-duration")?.value || "40分钟").trim();
  const level = ($("#prep-level")?.value || "中等混合").trim();
  const deep = !!$("#prep-deep")?.checked;
  const extra = ($("#prep-extra")?.value || "").trim();

  const topic =
    subject === "数学" ? "函数的概念与表示（示例）" :
    subject === "语文" ? "《落花生》文本解读（示例）" :
    "My Weekend Plan 写作（示例）";

  const focus =
    level.includes("偏弱") ? "关键概念夯实 + 典型例题拆步" :
    level.includes("较强") ? "综合探究 + 变式提升" :
    "基础—提升分层 + 当堂反馈纠偏";

  const gen = $("#prep-generated");
  if (!gen) return;

  gen.innerHTML = `
    <div class="gen-head">
      <div>
        <div class="gen-title">${subject} · ${grade} · ${topic}</div>
        <div class="gen-sub">模板：<b>${App.prepTemplate}</b> ｜ 版本：${version} ｜ 时长：${duration} ｜ 班情：${level} ${deep ? "｜ 深度推理：开启" : ""}</div>
      </div>
      <div class="gen-cta">
        <button class="btn btn-ghost btn-sm" onclick="showToast('已同步到：作业/测评（演示）')">同步到作业</button>
        <button class="btn btn-ghost btn-sm" onclick="showToast('已生成：家长版沟通稿（演示）')">生成家长版</button>
      </div>
    </div>

    <div class="gen-block">
      <div class="block-title">一、教学目标（结构化）</div>
      <ul class="block-list">
        <li>知识与技能：掌握本课核心概念与典型方法，完成2道当堂检测（示例）。</li>
        <li>思维与方法：通过“问题链/例题变式”形成迁移策略，聚焦：${focus}。</li>
        <li>评价与反馈：当堂形成性评价 + 课后分层作业，输出掌握度与薄弱点（演示）。</li>
      </ul>
    </div>

    <div class="gen-block">
      <div class="block-title">二、课堂流程（${duration}）</div>
      <div class="timeline">
        <div class="tl-item">
          <div class="tl-title">0–5’ 复盘导入</div>
          <div class="tl-sub">用1道诊断题快速定位易错点，形成“教学抓手清单”。</div>
        </div>
        <div class="tl-item">
          <div class="tl-title">5–20’ 核心讲解</div>
          <div class="tl-sub">按模板“${App.prepTemplate}”组织知识点—例题—反思，给出板书结构（示例）。</div>
        </div>
        <div class="tl-item">
          <div class="tl-title">20–35’ 分层练习</div>
          <div class="tl-sub">A/B/C三层任务：基础巩固→标准达成→挑战提升，并给出讲评顺序。</div>
        </div>
        <div class="tl-item">
          <div class="tl-title">35–40’ 当堂评价</div>
          <div class="tl-sub">2分钟小测 + 口头追问，自动形成“薄弱点名单 + 下一步建议”（演示）。</div>
        </div>
      </div>
    </div>

    <div class="gen-block">
      <div class="block-title">三、分层作业与评价要点</div>
      <div class="pill-row">
        <span class="tag-pill">A层：必做 6 题</span>
        <span class="tag-pill">B层：选做 4 题</span>
        <span class="tag-pill">C层：挑战 2 题</span>
        <span class="tag-pill">评价：过程性 + 结果性</span>
      </div>
      <div class="block-note">补充要求：${extra ? extra : "—"}</div>
    </div>

    <div class="gen-block">
      <div class="block-title">四、联动建议（对接学情/治理）</div>
      <ul class="block-list">
        <li>课后自动生成：掌握雷达 + 错因聚类 + 复习路径（对接学生端错题巩固）。</li>
        <li>异常触发：缺交/用时异常/高错题 → 自动进“趋势分层异常”联动钻取（教师端分析）。</li>
      </ul>
      <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:10px;" onclick="startScenario('ana')">🔎 打开趋势分层异常联动</button>
    </div>
  `;

  if (!silent) showToast("已生成教学设计（演示）");
}

  function renderKB() {
  const list = $("#kb-list");
  if (!list) return;

  list.innerHTML = App.kbItems
    .slice()
    .sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map(it => `
      <div class="kb-item">
        <div class="kb-item-top">
          <div class="kb-item-title">${it.title}</div>
          <div class="kb-item-status ${it.status === "已发布" ? "st-live" : "st-pending"}">${it.status}</div>
        </div>
        <div class="kb-item-sub">
          <span class="tag-pill">${it.category}</span>
          <span class="kb-meta">更新：${it.updatedAt}</span>
          <span class="kb-meta">命中：${it.hits || 0}</span>
        </div>
      </div>
    `).join("");
}

function kbAdd() {
  const title = ($("#kb-title")?.value || "").trim();
  const content = ($("#kb-content")?.value || "").trim();
  const category = ($("#kb-category")?.value || "办事指南").trim();
  if (!title || !content) return showToast("请填写标题与内容");

  const id = "KB-" + String(Math.floor(Math.random() * 900) + 100);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  App.kbItems.unshift({ id, category, title, status: "待审核", updatedAt: `${y}-${m}-${d}`, hits: 0 });
  ($("#kb-title")).value = "";
  ($("#kb-content")).value = "";
  renderKB();
  showToast("已提交审核（演示）");

  // 模拟审核通过
  setTimeout(() => {
    const it = App.kbItems.find(x => x.id === id);
    if (it) it.status = "已发布";
    renderKB();
    showToast("审核通过，已发布（演示）");
  }, 1200);
}

/** --------------------------
   *  Expose to window (for inline onclick)
   *  -------------------------- */
  window.setRole = setRole;
  window.resetRole = resetRole;

  window.showRoleGate = showRoleGate;
  window.hideRoleGate = hideRoleGate;

  window.portalGo = portalGo;
  window.portalAsk = portalAsk;
  window.portalSend = portalSend;

  window.openAgent = openAgent;
  window.renderAgents = renderAgents;
  window.setAgentsTag = setAgentsTag;

  window.renderKB = renderKB;
  window.kbAdd = kbAdd;

  window.setPrepTemplate = setPrepTemplate;
  window.prepGenerate = prepGenerate;

  window.switchView = switchView;
  window.setTeacherMode = setTeacherMode;
  window.startScenario = startScenario;
  window.startScenarioFromHome = startScenarioFromHome;
  window.triggerMsg = triggerMsg;

  window.selectTier = selectTier;
  window.setAnomalyFilter = setAnomalyFilter;
  window.openAnomalyDrawer = openAnomalyDrawer;
  window.runOCR = runOCR;

// 教研 / 成长
window.setResearchTab = setResearchTab;
window.selectResearchProject = selectResearchProject;
window.startVideoAnalysis = startVideoAnalysis;
window.researchCreateProject = researchCreateProject;
window.researchShareArtifact = researchShareArtifact;

window.setGrowthTab = setGrowthTab;
window.setPromotionLevel = setPromotionLevel;
window.buildPromotionPack = buildPromotionPack;
window.growthSyncToKB = growthSyncToKB;

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

  window.toggleSidebar = toggleSidebar;
  window.closeDrawer = closeDrawer;
  window.openDrawer = openDrawer;

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

    // Sidebar 初始化与自适应
    syncSidebarUI();
    window.addEventListener("resize", () => syncSidebarUI());

    // 初始补渲染
    if ($("#trend-canvas") && App.role === "teacher") renderTeacherLinkedArea();
    if ($("#radar-canvas") && App.role === "student") ensureStudentMounted();
  }

  boot();
})();
