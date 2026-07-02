/* ============================================
   橘子蘋果 GEO v6.7 狀態管理（localStorage + JSON 匯入/匯出）
   修改前請先跟 Posh 確認
============================================ */

const STORAGE_KEY = 'oa-geo-v67-state';

const ROLES = ['待定', 'Posh', 'COO', '數位廣告投手', '多媒體影音製作人', '電銷組長', '董事長', 'CEO', '顧問', '其他'];
const STATUSES = ['未開始', '進行中', '卡住', '完成'];

const TASK_DEFAULTS = {
  "01": {title:"Wikipedia 條目建立", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:1, geo:"+8~13", budget:"$0", budgetMin:0, budgetMax:0},
  "02": {title:"PR 子 B 記者主動採訪", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:1, geo:"+5~8", budget:"≈1 萬", budgetMin:1, budgetMax:1},
  "03": {title:"真實家長社群 + 親子部落格", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:2, geo:"+5~8", budget:"~42 萬", budgetMin:40, budgetMax:42},
  "04": {title:"PR 子 A 付費深度報導", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:2, geo:"+3~5", budget:"35 萬", budgetMin:35, budgetMax:35},
  "05": {title:"話語權工程", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:1, geo:"+25~40", budget:"~15 萬", budgetMin:13, budgetMax:18},
  "06": {title:"GBP 11 直營完整化", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:2, geo:"+4", budget:"~2 萬", budgetMin:1, budgetMax:2},
  "07": {title:"Local Citation 品保協會曝光", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:3, geo:"+3~5", budget:"~1 萬", budgetMin:0, budgetMax:1},
  "08": {title:"合規 KOL 業配 Miula 模式", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:2, geo:"+6~10", budget:"50 萬", budgetMin:50, budgetMax:50},
  "09": {title:"影片 4 軌 + Medium 重啟", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:2, geo:"+4~6", budget:"~10 萬", budgetMin:3, budgetMax:13},
  "10": {title:"產業獎項 HolonIQ 全曝光", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:3, geo:"+1~3", budget:"5-6 萬", budgetMin:5, budgetMax:6},
  "11": {title:"學術引用 5 篇 + CEO 論文", owner:"待定", status:"未開始", progress:0, lastUpdate:"", note:"", priority:3, geo:"+3~5", budget:"1-3 萬", budgetMin:1, budgetMax:3}
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
    "01":"wikipedia", "02":"pr-records", "03":"parents-bloggers", "04":"paid-reports",
    "05":"authority", "06":"gbp", "07":"citation", "08":"kol",
    "09":"video", "10":"awards", "11":"academic"
  };
  return slugs[id] || id;
}

function getTaskShortTitle(title){
  const map = {
    "Wikipedia 條目建立":"Wiki",
    "PR 子 B 記者主動採訪":"PR-B 記者",
    "真實家長社群 + 親子部落格":"家長社群",
    "PR 子 A 付費深度報導":"PR-A 深度",
    "話語權工程":"話語權",
    "GBP 11 直營完整化":"GBP",
    "Local Citation 品保協會曝光":"Citation",
    "合規 KOL 業配 Miula 模式":"KOL",
    "影片 4 軌 + Medium 重啟":"影片 4 軌",
    "產業獎項 HolonIQ 全曝光":"獎項",
    "學術引用 5 篇 + CEO 論文":"學術"
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
    const m = href.match(/(\d{2})-/);
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
   預算明細加總（動態 · 可輸入）
============================================ */
function renderBudgetTable(targetId){
  const wrap = document.getElementById(targetId || 'budget-table-dynamic');
  if(!wrap) return;
  const state = loadState();

  let rowsHtml = '';
  let totalMin = 0, totalMax = 0;
  // 任務按編號排序（避免 11 跑到最前）
  const taskIds = Object.keys(state.tasks).sort();
  taskIds.forEach(id => {
    const t = state.tasks[id];
    const min = parseInt(t.budgetMin || 0);
    const max = parseInt(t.budgetMax || 0);
    totalMin += min;
    totalMax += max;
    rowsHtml += `
      <tr data-task-id="${id}">
        <td class="bt-task">
          <a href="tasks/${id}-${getTaskSlug(id)}.html" style="color:var(--ink);font-weight:700;text-decoration:none;">
            <span class="bt-num">${parseInt(id)}</span> ${getTaskShortTitle(t.title)}
          </a>
        </td>
        <td class="bt-input">
          <input type="number" min="0" step="1" value="${min}" data-budget-min="${id}">
          <span class="bt-unit">萬</span>
        </td>
        <td class="bt-input">
          <input type="number" min="0" step="1" value="${max}" data-budget-max="${id}" class="max">
          <span class="bt-unit">萬</span>
        </td>
        <td class="bt-geo">${t.geo}</td>
      </tr>
    `;
  });

  // GEO 終分推估
  function geoEstimate(minV, maxV){
    const avg = (minV + maxV) / 2;
    if(avg < 30) return '60-75';
    if(avg < 80) return '75-85';
    if(avg < 140) return '82-90';
    if(avg < 200) return '88-95';
    return '95-100';
  }

  wrap.innerHTML = `
    <div class="budget-summary-cards">
      <div class="bsc-card"><div class="bsc-label">下限合計</div><div class="bsc-num" id="budget-total-min">${totalMin}</div><div class="bsc-unit">萬 / 年</div></div>
      <div class="bsc-card highlight"><div class="bsc-label">上限合計</div><div class="bsc-num" id="budget-total-max">${totalMax}</div><div class="bsc-unit">萬 / 年</div></div>
      <div class="bsc-card geo"><div class="bsc-label">GEO 終分預估</div><div class="bsc-num" id="budget-geo-est">${geoEstimate(totalMin, totalMax)}</div><div class="bsc-unit">分</div></div>
    </div>
    <div class="budget-table-wrap">
      <table class="budget-tbl">
        <colgroup>
          <col style="width:36%;">
          <col style="width:23%;">
          <col style="width:23%;">
          <col style="width:18%;">
        </colgroup>
        <thead>
          <tr><th class="left">任務</th><th>下限預算</th><th>上限預算</th><th>GEO 加分</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr class="bt-total">
            <td class="left">合計（自動計算）</td>
            <td><span id="budget-total-min-row">${totalMin}</span> 萬</td>
            <td><span id="budget-total-max-row">${totalMax}</span> 萬</td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p style="font-size:13px;color:var(--mute);margin-top:14px;line-height:1.8;text-align:center;">
      💡 <strong>每個數字可直接修改</strong>、合計與 GEO 終分自動更新。修改後存在瀏覽器、要分享請按「💾 下載狀態」上傳 Google Drive。<br>
      📊 <strong>GEO 終分預估</strong>（2026-07-01 效率重估校準）：&lt; 30 萬 → 60-75 ｜ 30-80 萬 → 75-85 ｜ 80-140 萬 → 82-90 ｜ 140-200 萬 → 88-95 ｜ &gt; 200 萬 → 95-100
    </p>
  `;

  // 綁定 input event
  wrap.querySelectorAll('input[data-budget-min]').forEach(input => {
    input.addEventListener('input', () => {
      const id = input.getAttribute('data-budget-min');
      const val = parseInt(input.value || 0);
      const st = loadState();
      st.tasks[id].budgetMin = val;
      saveState(st);
      recalcTotals(wrap);
    });
  });
  wrap.querySelectorAll('input[data-budget-max]').forEach(input => {
    input.addEventListener('input', () => {
      const id = input.getAttribute('data-budget-max');
      const val = parseInt(input.value || 0);
      const st = loadState();
      st.tasks[id].budgetMax = val;
      saveState(st);
      recalcTotals(wrap);
    });
  });

  function recalcTotals(w){
    let tMin = 0, tMax = 0;
    const st = loadState();
    for(const id in st.tasks){
      tMin += parseInt(st.tasks[id].budgetMin || 0);
      tMax += parseInt(st.tasks[id].budgetMax || 0);
    }
    const setT = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    setT('budget-total-min', tMin);
    setT('budget-total-max', tMax);
    setT('budget-total-min-row', tMin + ' 萬');
    setT('budget-total-max-row', tMax + ' 萬');
    setT('budget-geo-est', geoEstimate(tMin, tMax));
  }
}

/* ============================================
   主責分工矩陣（動態 · 根據 state.owner）
============================================ */
function renderMatrixGrid(targetId){
  const wrap = document.getElementById(targetId || 'matrix-grid-dynamic');
  if(!wrap) return;
  const state = loadState();
  const cols = ['Posh','COO','數位廣告投手','多媒體影音製作人','電銷組長','董事長','CEO','顧問'];
  const colDisplay = {'數位廣告投手':'數位投手','多媒體影音製作人':'多媒體'};

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
