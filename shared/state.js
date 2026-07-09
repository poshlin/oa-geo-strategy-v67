/* ============================================
   橘子蘋果 GEO v6.7 狀態管理（localStorage + JSON 匯入/匯出）
   修改前請先跟 Posh 確認
============================================ */

const STORAGE_KEY = 'oa-geo-v67-state';

const ROLES = ['待定', 'Posh', 'Trance', 'Jinjin', 'Albert'];
const STATUSES = ['未開始', '進行中', '卡住', '完成'];
const HANDOFF_STATUSES = {
  draft: '草稿中',
  research: '僅可資料整理',
  review: '待 Posh 核准',
  assignable: '可交辦',
  assigned: '已交辦'
};

const TASK_DEFAULTS = {
  "01": {title:"Wikipedia 條目建立", owner:"待定", status:"未開始", handoffStatus:"review", progress:0, lastUpdate:"", note:"", priority:1, geo:"影響高", budget:"待核", budgetMin:0, budgetMax:0},
  "02": {title:"PR 子 B 記者主動採訪", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:1, geo:"影響中高", budget:"待核", budgetMin:0, budgetMax:0},
  "03": {title:"真實家長社群 UGC（3A）", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:2, geo:"影響中高", budget:"待核", budgetMin:0, budgetMax:0},
  "03b": {title:"親子部落格邀稿（3B）", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:2, geo:"影響中高", budget:"待核", budgetMin:0, budgetMax:0},
  "04": {title:"PR 子 A 付費深度報導", owner:"待定", status:"未開始", handoffStatus:"review", progress:0, lastUpdate:"", note:"", priority:2, geo:"影響中", budget:"待核", budgetMin:0, budgetMax:0},
  "05": {title:"話語權工程", owner:"待定", status:"未開始", handoffStatus:"review", progress:0, lastUpdate:"", note:"", priority:1, geo:"影響高", budget:"待核", budgetMin:0, budgetMax:0},
  "06": {title:"GBP 11 直營完整化", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:2, geo:"影響中", budget:"待核", budgetMin:0, budgetMax:0},
  "07": {title:"Local Citation 品保協會曝光", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:3, geo:"影響中", budget:"待核", budgetMin:0, budgetMax:0},
  "08": {title:"合規 KOL 業配", owner:"待定", status:"未開始", handoffStatus:"review", progress:0, lastUpdate:"", note:"", priority:2, geo:"影響中高", budget:"待核", budgetMin:0, budgetMax:0},
  "09": {title:"影片 4 軌 + Medium 重啟", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:2, geo:"影響中", budget:"待核", budgetMin:0, budgetMax:0},
  "10": {title:"產業獎項 HolonIQ 全曝光", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:3, geo:"影響補強", budget:"待核", budgetMin:0, budgetMax:0},
  "11": {title:"學術引用 5 篇 + CEO 研究", owner:"待定", status:"未開始", handoffStatus:"research", progress:0, lastUpdate:"", note:"", priority:3, geo:"影響中", budget:"待核", budgetMin:0, budgetMax:0}
};

function loadState(){
  try{
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored){
      const data = JSON.parse(stored);
      // 合併預設值（避免缺欄位）
      const merged = {tasks: {}, lastSaved: data.lastSaved || ''};
      for(const id in TASK_DEFAULTS){
        merged.tasks[id] = Object.assign({}, TASK_DEFAULTS[id], data.tasks?.[id] || {});
      }
      return merged;
    }
  }catch(e){console.warn('讀取狀態失敗、用預設值', e);}
  return {tasks: JSON.parse(JSON.stringify(TASK_DEFAULTS)), lastSaved:''};
}

function saveState(state){
  state.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

/* 下載目前狀態為 JSON 檔（給組員拿來分享、放 Google Drive） */
function downloadStateJson(){
  const state = loadState();
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'oa-geo-state-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  }, 200);
}

/* 從 JSON 檔匯入狀態 */
function uploadStateJson(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result);
      if(!data.tasks){ throw new Error('檔案格式錯誤、缺 tasks 欄位'); }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      alert('✅ 載入成功、頁面即將重整');
      location.reload();
    }catch(err){
      alert('❌ 檔案格式錯誤：\n' + err.message);
    }
  };
  reader.readAsText(file);
}

/* 重置所有狀態 */
function resetState(){
  if(!confirm('⚠️ 確定重置所有任務狀態？\n（這會清掉所有主責 / 進度 / 備註）')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/* ============================================
   任務頁初始化
============================================ */
function initTaskPage(taskId){
  const state = loadState();
  const task = state.tasks[taskId];
  if(!task){ console.error('Unknown task id:', taskId); return; }

  const ownerSelect = document.getElementById('task-owner');
  const statusSelect = document.getElementById('task-status');
  const progressInput = document.getElementById('task-progress');
  const progressDisplay = document.getElementById('progress-display');
  const noteInput = document.getElementById('task-note');
  const updateDisplay = document.getElementById('task-last-update');

  // 填入主責下拉選項
  if(ownerSelect){
    ownerSelect.innerHTML = '';
    ROLES.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      if(r === task.owner) opt.selected = true;
      ownerSelect.appendChild(opt);
    });
  }

  // 填入狀態下拉選項
  if(statusSelect){
    statusSelect.innerHTML = '';
    STATUSES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      if(s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
  }

  if(progressInput) progressInput.value = task.progress || 0;
  if(progressDisplay) progressDisplay.textContent = (task.progress || 0) + '%';
  if(noteInput) noteInput.value = task.note || '';
  if(updateDisplay) updateDisplay.textContent = task.lastUpdate || '尚未更新';

  function persist(){
    task.owner = ownerSelect?.value || task.owner;
    task.status = statusSelect?.value || task.status;
    task.progress = parseInt(progressInput?.value || 0);
    task.note = noteInput?.value || '';
    task.lastUpdate = todayStr();
    saveState(state);
    if(updateDisplay) updateDisplay.textContent = task.lastUpdate;
    if(progressDisplay) progressDisplay.textContent = task.progress + '%';
  }

  function refreshOwnerDisplay(){
    const box = document.getElementById('current-owner-display');
    if(!box) return;
    if(task.owner === '待定' || !task.owner){
      box.innerHTML = '<strong>📍 目前實際指派：</strong><span style="color:#6e7681;font-weight:800;">⚪ 待指派</span>　<small style="color:#8B8BA7;">（請在上方綠色進度追蹤區設定主責、設定後會立即更新）</small>';
      box.style.borderLeftColor = '#8B8BA7';
      box.style.background = 'linear-gradient(135deg,rgba(139,139,167,0.10),rgba(255,255,255,0.5))';
    } else {
      box.innerHTML = `<strong>📍 目前實際指派：</strong><span style="color:#FF6B35;font-weight:900;font-size:15px;">✦ ${task.owner}</span>`;
      box.style.borderLeftColor = '#FF6B35';
      box.style.background = 'linear-gradient(135deg,rgba(255,107,53,0.10),rgba(255,255,255,0.5))';
    }
  }
  refreshOwnerDisplay();

  function persistAndRefresh(){
    persist();
    refreshOwnerDisplay();
  }

  if(ownerSelect) ownerSelect.addEventListener('change', persistAndRefresh);
  if(statusSelect) statusSelect.addEventListener('change', persist);
  if(progressInput) progressInput.addEventListener('input', () => {
    if(progressDisplay) progressDisplay.textContent = progressInput.value + '%';
  });
  if(progressInput) progressInput.addEventListener('change', persist);
  if(noteInput) noteInput.addEventListener('blur', persist);
}

/* ============================================
   Dashboard 初始化
============================================ */
function initDashboard(){
  const state = loadState();
  const grid = document.getElementById('dash-grid');
  if(!grid) return;

  let totalProgress = 0, stuckCount = 0, doneCount = 0, inProgressCount = 0, notStartedCount = 0;

  const tasks = state.tasks;
  for(const id in tasks){
    const t = tasks[id];
    totalProgress += (t.progress || 0);
    if(t.status === '卡住') stuckCount++;
    else if(t.status === '完成') doneCount++;
    else if(t.status === '進行中') inProgressCount++;
    else notStartedCount++;

    const card = document.createElement('a');
    card.className = 'dash-task' + (t.status === '卡住' ? ' stuck' : '') + (t.status === '完成' ? ' done' : '');
    card.href = 'tasks/' + id + '-' + getTaskSlug(id) + '.html';
    card.innerHTML = `
      <div class="dash-task-head">
        <span class="dash-task-num">#${id}</span>
        <span class="status-pill s-${t.status}">${t.status}</span>
      </div>
      <div class="dash-task-title">${t.title}</div>
      <div class="dash-task-note" style="margin-top:8px;">🔐 交辦權限：${HANDOFF_STATUSES[t.handoffStatus] || t.handoffStatus || '待確認'}</div>
      <div class="pbar"><div class="pbar-fill" style="width:${t.progress}%"></div></div>
      <div class="dash-task-meta">
        <span>📊 ${t.progress}%</span>
        <span>👤 ${t.owner}</span>
        <span>📅 ${t.lastUpdate || '未更新'}</span>
      </div>
      ${t.note ? `<div class="dash-task-note">📝 ${t.note}</div>` : ''}
    `;
    grid.appendChild(card);
  }

  // 統計區
  const avgProgress = Math.round(totalProgress / Object.keys(tasks).length);
  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setText('dash-total-progress', avgProgress + '%');
  setText('dash-stuck-count', stuckCount);
  setText('dash-done-count', doneCount);
  setText('dash-inprogress-count', inProgressCount);
  setText('dash-notstarted-count', notStartedCount);
}

function getTaskSlug(id){
  const slugs = {
    "01":"wikipedia", "02":"pr-records", "03":"parents-bloggers", "03b":"parents-bloggers-3b", "04":"paid-reports",
    "05":"authority", "06":"gbp", "07":"citation", "08":"kol",
    "09":"video", "10":"awards", "11":"academic"
  };
  return slugs[id] || id;
}

function getTaskShortTitle(title){
  const map = {
    "Wikipedia 條目建立":"Wiki",
    "PR 子 B 記者主動採訪":"PR-B 記者",
    "真實家長社群 UGC（3A）":"家長社群 3A",
    "親子部落格邀稿（3B）":"部落格邀稿 3B",
    "PR 子 A 付費深度報導":"PR-A 深度",
    "話語權工程":"話語權",
    "GBP 11 直營完整化":"GBP",
    "Local Citation 品保協會曝光":"Citation",
    "合規 KOL 業配 Miula 模式":"KOL",
    "影片 4 軌 + Medium 重啟":"影片 4 軌",
    "產業獎項 HolonIQ 全曝光":"獎項",
    "學術引用 5 篇 + CEO 研究":"學術"
  };
  return map[title] || title;
}

/* ============================================
   總覽頁任務卡片主責徽章（動態 · 根據 state.owner）
============================================ */
function updateTaskCardOwners(){
  const state = loadState();
  document.querySelectorAll('a.task-card').forEach(card => {
    const href = card.getAttribute('href') || '';
    const m = href.match(/(\d{2}[a-z]?)-/);
    if(!m) return;
    const id = m[1];
    const t = state.tasks[id];
    if(!t) return;
    const ownerBadge = card.querySelector('.b-owner');
    if(!ownerBadge) return;
    if(t.owner === '待定' || !t.owner){
      ownerBadge.textContent = '⚪ 待指派';
      ownerBadge.style.background = 'rgba(139,139,167,0.18)';
      ownerBadge.style.color = '#6e7681';
    } else {
      ownerBadge.textContent = '✦ ' + t.owner;
      ownerBadge.style.background = 'linear-gradient(135deg,#FF6B35,#E63946)';
      ownerBadge.style.color = '#fff';
    }
  });
}

/* ============================================
   預算控管（組員協作版 · 不公開精準數字）
============================================ */
function renderBudgetTable(targetId){
  const wrap = document.getElementById(targetId || 'budget-table-dynamic');
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="budget-summary-cards">
      <div class="bsc-card"><div class="bsc-label">協作版</div><div class="bsc-num">不公開</div><div class="bsc-unit">精準預算</div></div>
      <div class="bsc-card highlight"><div class="bsc-label">狀態</div><div class="bsc-num">待核</div><div class="bsc-unit">由 Posh 確認</div></div>
      <div class="bsc-card geo"><div class="bsc-label">用途</div><div class="bsc-num">控管</div><div class="bsc-unit">交辦風險</div></div>
    </div>
    <div class="budget-table-wrap">
      <table class="budget-tbl">
        <thead>
          <tr><th class="left">類型</th><th>協作版處理</th><th>交辦規則</th></tr>
        </thead>
        <tbody>
          <tr><td class="left">資料整理</td><td>組員可執行</td><td>補來源、截圖、欄位、缺口表</td></tr>
          <tr><td class="left">需外部支出</td><td>只標「待核」</td><td>不得自行詢價、承諾、下訂或簽約</td></tr>
          <tr><td class="left">KOL / PR / 媒體</td><td>先做候選與條件表</td><td>預算與合約需 Posh 確認</td></tr>
          <tr><td class="left">高層 / 政府 / 學術合作</td><td>先做一頁提案</td><td>不得自行對外接洽</td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:13px;color:var(--mute);margin-top:14px;line-height:1.8;text-align:center;">
      💡 完整預算模型保留於本機完整內部版。協作版只用來確認任務是否可交辦、是否需要審核、是否可能產生外部支出。
    </p>
  `;
}

/* ============================================
   主責分工矩陣（動態 · 根據 state.owner）
============================================ */
function renderMatrixGrid(targetId){
  const wrap = document.getElementById(targetId || 'matrix-grid-dynamic');
  if(!wrap) return;
  const state = loadState();
  const cols = ['Posh','主管 / 審核者','內容整理','影音整理','資料補鏈','高層待確認','其他'];
  const colDisplay = {'主管 / 審核者':'審核者','內容整理':'內容','影音整理':'影音','資料補鏈':'補鏈','高層待確認':'待高層'};

  // CSS grid 設定
  wrap.style.gridTemplateColumns = `120px repeat(${cols.length}, minmax(80px, 1fr))`;

  let html = '<div class="matrix-cell matrix-head">任務</div>';
  cols.forEach(c => {
    html += `<div class="matrix-cell matrix-head">${colDisplay[c] || c}</div>`;
  });

  for(const id in state.tasks){
    const t = state.tasks[id];
    const short = getTaskShortTitle(t.title);
    const isPending = t.owner === '待定' || !t.owner;
    const pendingClass = isPending ? ' pending-row' : '';
    html += `<a href="tasks/${id}-${getTaskSlug(id)}.html" class="matrix-cell matrix-row-head${pendingClass}" style="text-decoration:none;color:inherit;">${parseInt(id)} ${short}</a>`;
    cols.forEach(c => {
      const isOwner = (t.owner === c);
      if(isOwner){
        html += `<div class="matrix-cell m-lead">✦ 主責</div>`;
      } else {
        html += `<div class="matrix-cell">—</div>`;
      }
    });
  }

  wrap.innerHTML = html;
}

/* 共用：狀態彙整顯示 */
function renderStateActions(){
  const wrap = document.getElementById('state-actions');
  if(!wrap) return;
  wrap.innerHTML = `
    <button class="btn btn-primary" onclick="downloadStateJson()">💾 下載狀態（給其他人）</button>
    <label class="btn btn-ghost" style="cursor:pointer;">
      📂 載入他人狀態
      <input type="file" accept=".json" style="display:none;" onchange="uploadStateJson(this.files[0])">
    </label>
    <button class="btn btn-ghost" onclick="resetState()">🗑 重置全部狀態</button>
  `;
}
