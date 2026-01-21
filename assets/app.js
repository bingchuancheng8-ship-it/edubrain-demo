(function () {
  /** --------------------------
   * State & Mock Data
   * -------------------------- */
  const App = {
    role: null, // 'teacher' | 'homeroom' | 'student' | 'parent' | 'admin'
    view: "portal",
    // 模拟数据
    kbItems: [],
    govFeedTimer: null,
    parentChildId: "S-01",
  };

  const Students = {
    "S-01": { name: "宋扬", grade: "七年级", mastery: 76, tasks: 3, done: 2 },
  };

  /** --------------------------
   * Helpers
   * -------------------------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  
  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.style.display = "block";
    setTimeout(() => t.style.display = "none", 2000);
  }

  function openModal(title, html) {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal").style.display = "flex";
  }
  window.closeModal = () => $("#modal").style.display = "none";

  /** --------------------------
   * Role & Navigation Logic
   * -------------------------- */
  
  // 核心：设置角色并刷新侧边栏
  window.setRole = function(role) {
    App.role = role;
    localStorage.setItem("edubrain_role", role);
    $("#role-gate").style.display = "none";
    updateSidebar();
    
    // 路由跳转
    if (role === 'teacher') switchView('teacher');
    else if (role === 'homeroom') switchView('homeroom');
    else if (role === 'student') switchView('student');
    else if (role === 'parent') switchView('parent');
    else if (role === 'admin') switchView('gov');
    else switchView('portal');

    updateUserProfile();
    showToast(`已切换身份：${getRoleName(role)}`);
  };

  function getRoleName(r) {
    const map = { teacher:"学科教师", homeroom:"班主任", student:"学生", parent:"家长", admin:"管理者" };
    return map[r] || "访客";
  }

  window.showRoleGate = () => $("#role-gate").style.display = "flex";
  window.hideRoleGate = () => $("#role-gate").style.display = "none";

  // 核心：侧边栏动态显示规则
  function updateSidebar() {
    // 1. 公共区始终显示
    // 2. 工作区根据角色显示
    const grp = $("#workspace-group");
    const navs = {
      teacher: $("#nav-teacher"),
      homeroom: $("#nav-homeroom"),
      student: $("#nav-student"),
      parent: $("#nav-parent"),
      admin: [$("#nav-gov"), $("#nav-kb")]
    };

    // Reset
    grp.style.display = "none";
    Object.values(navs).flat().forEach(el => { if(el) el.style.display = "none"; });

    if (!App.role) return; // 没选身份，不显示工作区

    grp.style.display = "block";
    if (App.role === 'teacher') navs.teacher.style.display = "flex";
    if (App.role === 'homeroom') navs.homeroom.style.display = "flex";
    if (App.role === 'student') navs.student.style.display = "flex";
    if (App.role === 'parent') navs.parent.style.display = "flex";
    if (App.role === 'admin') navs.admin.forEach(el => el.style.display = "flex");
  }

  function updateUserProfile() {
    const name = $("#user-name");
    const sub = $("#user-sub");
    const av = $("#user-avatar");
    
    if (!App.role) {
      name.textContent = "访客模式";
      sub.textContent = "未登录";
      av.textContent = "访";
      return;
    }
    
    const map = {
      teacher: ["李老师", "数学 · 七年级", "李"],
      homeroom: ["张老师", "七年级(2)班", "张"],
      student: ["宋扬", "七年级学生", "宋"],
      parent: ["宋扬家长", "家校协同", "家"],
      admin: ["教务主任", "区教育局", "管"]
    };
    const d = map[App.role];
    name.textContent = d[0];
    sub.textContent = d[1];
    av.textContent = d[2];
  }

  /** --------------------------
   * View Switching
   * -------------------------- */
  window.switchView = function(viewId, navEl) {
    App.view = viewId;
    
    // UI Active State
    $$(".nav-item").forEach(e => e.classList.remove("active"));
    if (navEl) navEl.classList.add("active");
    else {
      const el = document.querySelector(`[data-view="${viewId}"]`);
      if (el) el.classList.add("active");
    }

    $$(".view-container").forEach(e => e.classList.remove("active"));
    const target = $("#view-" + viewId);
    if (target) target.classList.add("active");

    // Title
    const titles = {
      portal: "AI智能门户", teacher: "教师工作台", homeroom: "班主任工作台",
      student: "学生学习中心", parent: "家校协同", gov: "治理驾驶舱", agents: "智能体中心"
    };
    $("#page-title").textContent = titles[viewId] || "工作区";

    // View specific logic
    if (viewId === 'gov') startGovFeed(); else stopGovFeed();
    if (viewId === 'teacher') renderTeacherAna(); 
    if (viewId === 'student') renderStudentGrowth();
  };

  /** --------------------------
   * Logic: Teacher (Subject)
   * -------------------------- */
  window.setTeacherMode = (mode) => {
    // 简化版：仅展示Toast和切换聊天提示
    const tips = {
      prep: "已进入智能备课：生成教案/课件...",
      mark: "已进入作业批改：OCR扫描/学情采集...",
      ana: "已进入学情分析：查看班级薄弱点...",
      research: "已进入教研协同：跨校备课/听评课...",
      growth: "已进入职称成长：资料梳理/研修..."
    };
    showToast(tips[mode]);
    // 实际应切换右侧视图，此处略
  };

  window.triggerTeacherMsg = () => {
    const inp = $("#teacher-input");
    const val = inp.value;
    if(!val) return;
    inp.value = "";
    appendMsg("#chat-box-teacher", "user", val);
    setTimeout(() => {
      appendMsg("#chat-box-teacher", "ai", "收到。正在为您生成相关教学资源/分析报告（演示）。");
    }, 600);
  };

  /** --------------------------
   * Logic: Homeroom Teacher
   * -------------------------- */
  window.triggerHomeroomMsg = () => {
    const inp = $("#homeroom-input");
    const val = inp.value;
    if(!val) return;
    inp.value = "";
    appendMsg("#chat-box-homeroom", "user", val);
    setTimeout(() => {
      let reply = "好的，已为您生成。";
      if(val.includes("通知")) reply = "已生成《关于防溺水安全致家长的一封信》草稿，是否一键分发？";
      if(val.includes("评语")) reply = "已根据本周考勤与作业数据，生成全班42人的个性化周评。";
      appendMsg("#chat-box-homeroom", "ai", reply);
    }, 600);
  };

  window.hrAction = (type) => {
    if(type === 'notice') openModal("生成班级通知", "<p>AI已生成以下通知模板：</p><textarea class='magic-input' style='height:100px'>各位家长：\n近期气温升高，请务必教育孩子注意防溺水安全...</textarea><button class='btn btn-primary' style='margin-top:10px' onclick='showToast(\"已分发到家长端\")'>一键分发</button>");
    if(type === 'comment') showToast("已批量生成42条学生评语");
  };

  /** --------------------------
   * Logic: Parent
   * -------------------------- */
  window.openParentDetail = (type) => {
    if(type === 'growth') openModal("孩子成长报告", "<h3>本周学情摘要</h3><p>数学：掌握度 76% (需关注几何)</p><p>英语：掌握度 92% (表现优秀)</p><p>体质：运动时长达标</p>");
    if(type === 'task') openModal("今日作业", "<ul><li>数学：习题册P12 (未完成)</li><li>语文：背诵古诗 (已完成)</li><li>英语：口语打卡 (已完成)</li></ul>");
    if(type === 'msg') openModal("家校通知", "<div class='feed-item' style='color:#333'><b>[班主任] 防溺水安全提醒</b><br>请各位家长周末注意孩子去向...</div>");
    if(type === 'service') openModal("生活服务", "<p>本周午餐食谱：</p><ul><li>周一：红烧肉、素三鲜</li><li>周二：鸡腿、西红柿炒蛋</li></ul>");
  };

  window.parentSend = () => {
    const inp = $("#parent-input");
    const val = inp.value;
    if(!val) return;
    inp.value = "";
    const box = $("#parent-chat");
    box.innerHTML += `<div class="dh-bubble user" style="margin-left:auto;background:#f59e0b;color:#fff">${val}</div>`;
    setTimeout(() => {
      box.innerHTML += `<div class="dh-bubble ai">收到您的咨询。针对孩子的情况，建议您可以...（家庭教育AI顾问演示）</div>`;
      box.scrollTop = box.scrollHeight;
    }, 600);
  };

  /** --------------------------
   * Logic: Student
   * -------------------------- */
  function renderStudentGrowth() {
    $("#student-growth").innerHTML = `
      <div class="card-grid" style="grid-template-columns:1fr 1fr;">
        <div class="feature-card"><h3>能力雷达</h3><p>几何推理能力提升明显</p></div>
        <div class="feature-card"><h3>本周复盘</h3><p>错题主要集中在函数章节</p></div>
      </div>
    `;
  }
  
  // Tab logic for student
  window.setStudentTab = (t) => {
    $$(".student-page").forEach(e => e.classList.remove("active"));
    $$(".tab-btn").forEach(e => e.classList.remove("active"));
    $("#student-"+t).classList.add("active");
    $("#stab-"+t).classList.add("active");
  };

  /** --------------------------
   * Logic: Gov & Common
   * -------------------------- */
  function startGovFeed() {
    if(App.govFeedTimer) return;
    initMap();
    App.govFeedTimer = setInterval(() => {
       const list = $("#feed-list");
       if(list) list.innerHTML = `<div class="feed-item">[实时] 某校触发作业量预警</div>` + list.innerHTML;
    }, 2000);
  }
  function stopGovFeed() { clearInterval(App.govFeedTimer); App.govFeedTimer = null; }
  
  function initMap() {
    const g = $("#map-grid");
    if(!g || g.innerHTML) return;
    for(let i=0; i<40; i++) {
       const d = document.createElement("div");
       d.className = "data-bar";
       d.style.left = Math.random()*100 + "%";
       d.style.top = Math.random()*100 + "%";
       d.style.height = Math.random()*100 + 20 + "px";
       g.appendChild(d);
    }
  }

  // Common Chat Appender
  function appendMsg(sel, role, text) {
    const box = $(sel);
    if(!box) return;
    box.innerHTML += `<div class="msg ${role}"><div class="msg-bubble">${text}</div></div>`;
    box.scrollTop = box.scrollHeight;
  }

  // Init
  window.toggleSidebar = () => document.body.classList.toggle("sidebar-collapsed");
  window.portalGo = (t) => showToast("正在前往："+t);
  window.portalSend = () => showToast("数字人回复：已收到您的问题");
  window.runOCR = () => showToast("模拟扫描中...已提取数据");
  window.kbAdd = () => showToast("已提交知识库条目");
  
  // Render Agents (Simplified)
  window.renderAgents = () => {
     $("#agents-grid").innerHTML = `
       <div class="feature-card" onclick="setRole('teacher')"><h3>📘 小学数学备课智能体</h3><p>生成教案/课件/分层作业</p></div>
       <div class="feature-card" onclick="setRole('student')"><h3>🇬🇧 英语口语陪练</h3><p>沉浸式对话练习</p></div>
       <div class="feature-card" onclick="setRole('admin')"><h3>🛡️ 校园安全预警</h3><p>视频流识别与风险提示</p></div>
     `;
  };

  // Boot
  const savedRole = localStorage.getItem("edubrain_role");
  if(savedRole) setRole(savedRole);
  else updateSidebar(); // default state

})();
