/**
 * health.js — 健康管理页面（体重 / 饮食 / 运动 / 厨房秘籍 / 智能食谱 / 养出好气血 / 各种记录）
 */
import { Store, formatDate, formatDateCN, getMonthDays, escapeHtml } from '../store.js';
import { renderVideoPlayer, bindVideoPlayers } from '../video.js';

let currentTab = 'weight';
let exerciseTab = 'checkin'; // checkin | video
let selectedDate = Store.today();
let weightView = 'month';
let weightYear, weightMonth;
let dietTab = 'water'; // water | calorie

export const HealthPage = {
  render(container) {
    const now = new Date();
    if (!weightYear) { weightYear = now.getFullYear(); weightMonth = now.getMonth(); }
    container.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${currentTab==='weight'?'active':''}" data-tab="weight">体重记录</button>
        <button class="sub-tab ${currentTab==='diet'?'active':''}" data-tab="diet">饮食管理</button>
        <button class="sub-tab ${currentTab==='exercise'?'active':''}" data-tab="exercise">运动训练</button>
        <button class="sub-tab ${currentTab==='kitchen'?'active':''}" data-tab="kitchen">厨房秘籍</button>
        <button class="sub-tab ${currentTab==='recipe'?'active':''}" data-tab="recipe">智能食谱</button>
        <button class="sub-tab ${currentTab==='qi'?'active':''}" data-tab="qi">养出好气血</button>
        <button class="sub-tab ${currentTab==='records'?'active':''}" data-tab="records">各种记录</button>
      </div>
      <div id="healthContent"></div>
    `;
    container.querySelectorAll('.sub-tab').forEach(tab => {
      tab.addEventListener('click', () => { currentTab = tab.dataset.tab; HealthPage.render(container); });
    });
    const content = document.getElementById('healthContent');
    if (currentTab === 'weight') renderWeight(content);
    else if (currentTab === 'diet') renderDiet(content);
    else if (currentTab === 'exercise') renderExercise(content);
    else if (currentTab === 'kitchen') renderKitchen(content, container);
    else if (currentTab === 'recipe') renderRecipe(content, container);
    else if (currentTab === 'qi') renderQi(content, container);
    else renderHealthRecords(content);
  }
};

// ========== 模块1: 体重记录 ==========
function renderWeight(el) {
  const records = Store.get('weightRecords', []);
  const now = new Date();
  const year = weightYear, month = weightMonth;
  const monthDays = getMonthDays(year, month);
  const recordMap = {};
  records.forEach(r => { recordMap[r.date] = r.value; });
  const recent = records.slice(-10);
  const recordDays = recent.length;
  let totalChange = 0;
  if (recent.length >= 2) totalChange = recent[recent.length-1].value - recent[0].value;
  const avgDailyChange = recordDays >= 2 ? (totalChange / (recordDays - 1)) : 0;
  const lastMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
  const lastMonthRecs = records.filter(r => r.date.startsWith(lastMonthStr));
  const lastMonthChange = lastMonthRecs.length >= 2 ? lastMonthRecs[lastMonthRecs.length-1].value - lastMonthRecs[0].value : 0;
  let upDays = 0, downDays = 0;
  for (let i = 1; i < records.length; i++) {
    if (records[i].value > records[i-1].value) upDays++;
    else if (records[i].value < records[i-1].value) downDays++;
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        月度体重日历
      </div>
      <div class="month-header">
        <button class="month-nav-btn" id="wPrevMonth"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div class="month-title">${year}年${month+1}月</div>
        <button class="month-nav-btn" id="wNextMonth"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div class="month-calendar" style="font-size:12px">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${monthDays.map(d => {
          const ds = formatDate(d.date); const val = recordMap[ds]; const isToday = ds === Store.today();
          let arrow = '';
          if (val) { const prevRecs = records.filter(r => r.date < ds); if (prevRecs.length > 0) { const prevVal = prevRecs[prevRecs.length-1].value; if (val > prevVal) arrow = '<span style="color:#d98a8a;font-size:10px">↑</span>'; else if (val < prevVal) arrow = '<span style="color:#7bc4a8;font-size:10px">↓</span>'; } }
          return `<div class="month-day ${d.otherMonth?'other-month':''} ${isToday?'today':''}" data-date="${ds}" style="cursor:${d.otherMonth?'default':'pointer'};font-size:12px">
            <span>${d.date.getDate()}</span>
            <div style="font-size:10px;color:${val?'var(--primary)':'var(--text-muted)'};margin-top:2px;min-height:14px">${val ? val + 'kg' + arrow : ''}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:12px"><div class="weight-input-row"><div class="form-group"><input class="form-input" type="number" step="0.1" id="weightInput" placeholder="今日体重 (kg)"></div><button class="btn btn-primary" id="saveWeightBtn">记录</button></div></div>
    </div>
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">体重记录 ${recordDays} 天</div>
        <div class="sub-tabs" style="margin-bottom:0">
          <button class="sub-tab ${weightView==='week'?'active':''}" data-view="week" style="padding:4px 12px;font-size:12px">按周</button>
          <button class="sub-tab ${weightView==='month'?'active':''}" data-view="month" style="padding:4px 12px;font-size:12px">按月</button>
        </div>
      </div>
      <div class="finance-summary">
        <div class="finance-stat"><div class="finance-stat-value" style="color:${totalChange>=0?'#d98a8a':'#7bc4a8'}">${totalChange>=0?'+':''}${totalChange.toFixed(1)}</div><div class="finance-stat-label">体重变化(kg)</div></div>
        <div class="finance-stat"><div class="finance-stat-value" style="color:${avgDailyChange>=0?'#d98a8a':'#7bc4a8'}">${avgDailyChange>=0?'+':''}${avgDailyChange.toFixed(2)}</div><div class="finance-stat-label">日均变化</div></div>
        <div class="finance-stat"><div class="finance-stat-value" style="color:${lastMonthChange>=0?'#d98a8a':'#7bc4a8'}">${lastMonthChange>=0?'+':''}${lastMonthChange.toFixed(1)}</div><div class="finance-stat-label">上月变化</div></div>
      </div>
      <div class="chart-container"><canvas id="weightChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">体重变化</div>
      <div style="display:flex;gap:20px;justify-content:center;padding:10px 0">
        <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#7bc4a8">↓${downDays}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">下降天数</div></div>
        <div style="width:1px;background:var(--border)"></div>
        <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#d98a8a">↑${upDays}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">上升天数</div></div>
      </div>
    </div>
  `;
  document.getElementById('wPrevMonth').addEventListener('click', () => { weightMonth--; if (weightMonth < 0) { weightMonth = 11; weightYear--; } renderWeight(el); });
  document.getElementById('wNextMonth').addEventListener('click', () => { weightMonth++; if (weightMonth > 11) { weightMonth = 0; weightYear++; } renderWeight(el); });
  el.querySelectorAll('[data-view]').forEach(btn => { btn.addEventListener('click', () => { weightView = btn.dataset.view; renderWeight(el); }); });
  el.querySelectorAll('.month-day:not(.other-month)').forEach(d => { d.addEventListener('click', () => { const date = d.dataset.date; const existing = recordMap[date]; showWeightInputModal(date, existing, () => renderWeight(el)); }); });
  document.getElementById('saveWeightBtn').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('weightInput').value); if (!val) return;
    const records = Store.get('weightRecords', []);
    const idx = records.findIndex(r => r.date === Store.today());
    if (idx >= 0) records[idx].value = val; else records.push({ id: Store.uid(), value: val, date: Store.today(), timestamp: Date.now() });
    records.sort((a,b) => a.date.localeCompare(b.date)); Store.set('weightRecords', records); renderWeight(el);
  });
  const chartRecords = weightView === 'week' ? records.slice(-7) : records.slice(-30);
  const ctx = document.getElementById('weightChart');
  if (ctx && typeof Chart !== 'undefined' && chartRecords.length > 1) {
    new Chart(ctx, { type: 'line', data: { labels: chartRecords.map(r => { const d = new Date(r.date); return `${d.getMonth()+1}/${d.getDate()}`; }), datasets: [{ label: '体重 (kg)', data: chartRecords.map(r => r.value), borderColor: '#7c9cbf', backgroundColor: 'rgba(124,156,191,0.1)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#7c9cbf' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#e8ecf1' }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } } } } });
  }
}

// ========== 模块2: 饮食管理 ==========
function renderDiet(el) {
  el.innerHTML = `
    <div class="sub-tabs">
      <button class="sub-tab ${dietTab==='water'?'active':''}" data-diet="water">💧 喝水打卡</button>
      <button class="sub-tab ${dietTab==='calorie'?'active':''}" data-diet="calorie">🔥 饮食热量</button>
    </div>
    <div id="dietContent"></div>
  `;
  el.querySelectorAll('.sub-tab[data-diet]').forEach(t => t.addEventListener('click', () => { dietTab = t.dataset.diet; renderDiet(el); }));
  const content = document.getElementById('dietContent');
  if (dietTab === 'water') renderWater(content);
  else renderCalorie(content);
}

// ========== 饮食·喝水打卡 ==========
function renderWater(el) {
  const goal = Store.get('waterGoal', 1500);
  const records = Store.get('waterRecords', []);
  const today = Store.today();
  const todayRecs = records.filter(r => r.date === today);
  const total = todayRecs.reduce((s, r) => s + r.amount, 0);
  const remain = Math.max(0, goal - total);
  const pct = goal > 0 ? Math.min(100, Math.round(total / goal * 100)) : 0;
  const C = 2 * Math.PI * 52; // 环形周长
  const offset = C * (1 - Math.min(1, total / goal));
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = formatDate(d); const sum = records.filter(r => r.date === ds).reduce((s, r) => s + r.amount, 0); days.push({ ds, sum, label: (d.getMonth() + 1) + '/' + d.getDate(), isToday: ds === today }); }
  const reminder = Store.get('waterReminder', { enabled: false, interval: 60 });

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0">💧 今日喝水</div>
        <button class="action-btn" id="editWaterGoal" title="设定目标"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
      </div>
      <div class="water-ring-wrap">
        <svg class="water-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg)" stroke-width="11"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--primary)" stroke-width="11" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${offset}" transform="rotate(-90 60 60)"/>
          <text x="60" y="54" text-anchor="middle" font-size="20" font-weight="700" fill="var(--text-primary)">${total}</text>
          <text x="60" y="74" text-anchor="middle" font-size="11" fill="var(--text-muted)">/ ${goal} ml</text>
        </svg>
        <div class="water-stats">
          <div class="water-stat"><span class="ws-num">${pct}%</span><span class="ws-label">完成度</span></div>
          <div class="water-stat"><span class="ws-num" style="color:var(--danger)">${remain}</span><span class="ws-label">还需喝(ml)</span></div>
        </div>
      </div>
      <div class="water-bar"><div class="water-bar-fill" style="width:${pct}%"></div></div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:6px">目标 ${goal}ml · 已喝 ${total}ml</div>
      <div class="water-cups">
        <button class="water-cup" data-amt="200">🥛 200</button>
        <button class="water-cup" data-amt="300">🥤 300</button>
        <button class="water-cup" data-amt="500">🍶 500</button>
      </div>
      <div class="flex-between" style="gap:8px;margin-top:8px">
        <input class="form-input" id="customWater" type="number" placeholder="手动输入毫升" style="flex:1">
        <button class="btn btn-primary btn-sm" id="addCustomWater" style="flex:0 0 auto">记录</button>
      </div>
      <div style="margin-top:10px">
        ${todayRecs.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);text-align:center">今天还没喝水记录～</div>' : todayRecs.slice().reverse().map(r => `<div class="water-log-item"><span>💧 +${r.amount}ml</span><span style="color:var(--text-muted)">${new Date(r.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}<button class="water-log-del" data-id="${r.id}" style="border:none;background:none;color:var(--danger);margin-left:6px;cursor:pointer">✕</button></span></div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">📈 最近 7 天喝水趋势</div>
      <canvas id="waterTrend" height="150"></canvas>
    </div>
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0">⏰ 定时喝水提醒</div>
        <label class="switch"><input type="checkbox" id="reminderOn" ${reminder.enabled?'checked':''}><span class="slider"></span></label>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;color:var(--text-secondary)">每</span>
        <input class="form-input" id="reminderInterval" type="number" value="${reminder.interval}" style="width:70px;flex:0 0 70px">
        <span style="font-size:13px;color:var(--text-secondary)">分钟提醒一次（页面打开时生效）</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">提示：静态站点无法后台常驻，提醒仅在页面打开期间生效；若允许通知，会额外弹出系统提醒。</div>
    </div>
  `;

  drawWaterTrend(days);
  document.getElementById('editWaterGoal').addEventListener('click', () => {
    const modal = document.getElementById('genericModal'); const c = document.getElementById('genericModalContent');
    c.innerHTML = `<div class="modal-title">设定每日喝水目标</div><div class="form-group"><label class="form-label">目标(ml)</label><input class="form-input" id="wgInput" type="number" value="${goal}"></div><div class="modal-actions"><button class="btn btn-secondary" id="wgCancel">取消</button><button class="btn btn-primary" id="wgSave">保存</button></div>`;
    modal.style.display = 'flex';
    document.getElementById('wgCancel').addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    document.getElementById('wgSave').addEventListener('click', () => { Store.set('waterGoal', Math.max(1, parseInt(document.getElementById('wgInput').value) || 1500)); modal.style.display = 'none'; renderWater(el); });
  });
  el.querySelectorAll('.water-cup').forEach(b => b.addEventListener('click', () => addWater(parseInt(b.dataset.amt), el)));
  document.getElementById('addCustomWater').addEventListener('click', () => { const v = parseInt(document.getElementById('customWater').value); if (v > 0) addWater(v, el); });
  el.querySelectorAll('.water-log-del').forEach(b => b.addEventListener('click', () => { let arr = Store.get('waterRecords', []); arr = arr.filter(x => x.id !== b.dataset.id); Store.set('waterRecords', arr); renderWater(el); }));
  const ro = document.getElementById('reminderOn'), ri = document.getElementById('reminderInterval');
  ro.addEventListener('change', () => setWaterReminder(ro.checked, parseInt(ri.value) || 60));
  ri.addEventListener('change', () => setWaterReminder(ro.checked, parseInt(ri.value) || 60));
}

function addWater(amount, el) {
  const w = Store.get('waterRecords', []);
  w.push({ id: Store.uid(), amount, date: Store.today(), timestamp: Date.now() });
  Store.set('waterRecords', w);
  renderWater(el);
}

function setWaterReminder(enabled, interval) {
  Store.set('waterReminder', { enabled, interval: Math.max(5, interval || 60) });
  if (window.__waterTimer) { clearInterval(window.__waterTimer); window.__waterTimer = null; }
  if (enabled) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} }
    window.__waterTimer = setInterval(() => {
      showToast('💧 该喝水啦～ 起身接杯水');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification('喝水提醒', { body: '该喝水啦，补充 ' + (Store.get('waterGoal', 1500)) + 'ml/天' }); } catch (e) {} }
    }, Math.max(5, interval) * 60 * 1000);
    showToast('已开启定时喝水提醒 ⏰');
  } else {
    showToast('已关闭喝水提醒');
  }
}

function drawWaterTrend(days) {
  const canvas = document.getElementById('waterTrend'); if (!canvas || typeof Chart === 'undefined') return;
  if (window.__waterChart) window.__waterChart.destroy();
  const ctx = canvas.getContext('2d');
  window.__waterChart = new Chart(ctx, {
    type: 'line',
    data: { labels: days.map(d => d.label), datasets: [{ label: '喝水量(ml)', data: days.map(d => d.sum), fill: true, backgroundColor: 'rgba(124,156,191,0.15)', borderColor: '#7c9cbf', tension: 0.35, pointBackgroundColor: days.map(d => d.isToday ? '#e8746b' : '#7c9cbf'), pointRadius: days.map(d => d.isToday ? 5 : 3) }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }, maintainAspectRatio: false }
  });
}

// ========== 饮食·热量记录 ==========
function renderCalorie(el) {
  const meals = Store.get('meals', []);
  const today = Store.today();
  const todayMeals = meals.filter(m => m.date === today);
  const goals = Store.get('nutritionGoals', { calories: 2000, carbs: 250, protein: 75, fat: 65 });
  let totalCal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;
  todayMeals.forEach(m => { totalCal += m.calories || 0; totalCarbs += m.carbs || 0; totalProtein += m.protein || 0; totalFat += m.fat || 0; });
  const remainCal = Math.max(0, goals.calories - totalCal);
  const macroKcal = { protein: totalProtein * 4, carbs: totalCarbs * 4, fat: totalFat * 9 };
  const macroSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat;
  const types = ['早餐', '午餐', '晚餐', '加餐'];

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0">🔥 今日摄入总览</div>
        <button class="btn btn-primary btn-sm" id="photoMealBtn">📷 拍照/上传</button>
      </div>
      <div class="cal-summary">
        <div class="cal-big"><span class="cal-num">${totalCal}</span><span class="cal-unit">kcal</span></div>
        <div class="cal-macros">
          <div class="cal-macro"><span>蛋白质</span><b>${totalProtein}g</b></div>
          <div class="cal-macro"><span>碳水</span><b>${totalCarbs}g</b></div>
          <div class="cal-macro"><span>脂肪</span><b>${totalFat}g</b></div>
        </div>
      </div>
      <div class="cal-bar"><div class="cal-bar-fill" style="width:${Math.min(100, totalCal / goals.calories * 100)}%"></div></div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:4px">目标 ${goals.calories}kcal · 还可吃 ${remainCal}kcal</div>
      <div style="margin-top:10px"><canvas id="macroDonut" height="150"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">🍽️ 按餐次记录</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        ${types.map(t => `<button class="quick-action-btn" data-meal="${t}"><div class="quick-action-icon">${t==='早餐'?'🌅':t==='午餐'?'☀️':t==='晚餐'?'🌙':'🍎'}</div><span>+ ${t}</span></button>`).join('')}
      </div>
      ${todayMeals.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div class="empty-state-text">今天还没吃东西记录～</div></div>' : ''}
      ${todayMeals.map(m => `<div class="meal-card">
        <div class="meal-icon" style="background:${m.type==='早餐'?'#fef3cd':m.type==='午餐'?'#d4edda':m.type==='晚餐'?'#cce5ff':'#f8d7da'}">${m.type==='早餐'?'🌅':m.type==='午餐'?'☀️':m.type==='晚餐'?'🌙':'🍎'}</div>
        ${m.photo ? `<img class="meal-photo" src="${m.photo}" alt="">` : ''}
        <div class="meal-info">
          <div class="meal-name">${escapeHtml(m.name)}${m.grams ? ' · '+m.grams+'g' : ''}</div>
          <div class="meal-time">${m.type} · ${new Date(m.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</div>
          <div class="meal-kcal">${m.calories} kcal</div>
          <div class="meal-macros"><span>碳水 ${m.carbs||0}g</span><span>蛋白质 ${m.protein||0}g</span><span>脂肪 ${m.fat||0}g</span></div>
        </div>
        <button class="action-btn meal-delete" data-id="${m.id}" style="opacity:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">⚙️ 营养目标</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label class="form-label">热量(kcal)</label><input class="form-input" type="number" id="goalCal" value="${goals.calories}"></div>
        <div class="form-group"><label class="form-label">碳水(g)</label><input class="form-input" type="number" id="goalCarbs" value="${goals.carbs}"></div>
        <div class="form-group"><label class="form-label">蛋白质(g)</label><input class="form-input" type="number" id="goalProtein" value="${goals.protein}"></div>
        <div class="form-group"><label class="form-label">脂肪(g)</label><input class="form-input" type="number" id="goalFat" value="${goals.fat}"></div>
      </div>
      <button class="btn btn-primary btn-sm mt-8" id="saveGoalsBtn">保存目标</button>
    </div>
    <input type="file" id="mealPhotoInput" accept="image/*" capture="environment" style="display:none">
  `;
  drawMacroDonut(macroKcal, macroSum);
  el.querySelectorAll('.quick-action-btn').forEach(b => b.addEventListener('click', () => showAddMealModal(b.dataset.meal, null)));
  el.querySelectorAll('.meal-delete').forEach(b => b.addEventListener('click', () => { let m = Store.get('meals', []); m = m.filter(x => x.id !== b.dataset.id); Store.set('meals', m); renderCalorie(el); }));
  document.getElementById('saveGoalsBtn').addEventListener('click', () => { Store.set('nutritionGoals', { calories: parseInt(document.getElementById('goalCal').value) || 2000, carbs: parseInt(document.getElementById('goalCarbs').value) || 250, protein: parseInt(document.getElementById('goalProtein').value) || 75, fat: parseInt(document.getElementById('goalFat').value) || 65 }); renderCalorie(el); });
  const photoBtn = document.getElementById('photoMealBtn');
  const photoInput = document.getElementById('mealPhotoInput');
  photoBtn.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    compressImage(file, 480, 0.7).then(dataUrl => { showAddMealModal(null, dataUrl); }).catch(() => showAddMealModal(null, null));
    photoInput.value = '';
  });
}

function drawMacroDonut(macroKcal, macroSum) {
  const canvas = document.getElementById('macroDonut'); if (!canvas) return;
  if (window.__macroChart) window.__macroChart.destroy();
  if (typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (macroSum <= 0) { ctx.clearRect(0,0,canvas.width,150); ctx.font='12px sans-serif'; ctx.fillStyle='#9aa5b1'; ctx.textAlign='center'; ctx.fillText('暂无数据', canvas.width/2, 75); return; }
  window.__macroChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['蛋白质', '碳水', '脂肪'], datasets: [{ data: [macroKcal.protein, macroKcal.carbs, macroKcal.fat], backgroundColor: ['#e8746b', '#f1c40f', '#5b9bd5'], borderWidth: 0 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } }, maintainAspectRatio: false, cutout: '62%' }
  });
}

function drawCalorieRing(consumed, goal, remain) {
  const canvas = document.getElementById('calorieRing'); if (!canvas) return;
  const ctx = canvas.getContext('2d'); const size = 100, center = size / 2, radius = 38, lineWidth = 8;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.strokeStyle = '#e8ecf1'; ctx.lineWidth = lineWidth; ctx.stroke();
  const progress = Math.min(1, consumed / goal);
  ctx.beginPath(); ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.strokeStyle = '#7c9cbf'; ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = '#2c3e50'; ctx.font = 'bold 18px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(remain, center, center + 2);
  ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = '#7f8c9b'; ctx.fillText('剩余kcal', center, center + 16);
}

// ========== 图片压缩（控制 localStorage 体积） ==========
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', quality || 0.7));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const FOOD_DB = {
  '米饭': { cal: 116, carbs: 25.6, protein: 2.6, fat: 0.3 },'白米饭': { cal: 116, carbs: 25.6, protein: 2.6, fat: 0.3 },'面条': { cal: 110, carbs: 22, protein: 3.5, fat: 0.3 },'馒头': { cal: 221, carbs: 44.2, protein: 7, fat: 1.1 },'鸡蛋': { cal: 144, carbs: 1.1, protein: 13.3, fat: 9.5 },'鸡胸肉': { cal: 133, carbs: 0, protein: 31, fat: 1.2 },'牛肉': { cal: 190, carbs: 0, protein: 26, fat: 9 },'猪肉': { cal: 143, carbs: 0, protein: 21, fat: 6 },'鱼肉': { cal: 104, carbs: 0, protein: 22, fat: 1.5 },'虾': { cal: 85, carbs: 0, protein: 18, fat: 1.2 },'豆腐': { cal: 73, carbs: 2.8, protein: 8, fat: 3.5 },'牛奶': { cal: 42, carbs: 5, protein: 3.4, fat: 1 },'酸奶': { cal: 72, carbs: 9, protein: 3.5, fat: 2.7 },'苹果': { cal: 52, carbs: 14, protein: 0.3, fat: 0.2 },'香蕉': { cal: 89, carbs: 23, protein: 1.1, fat: 0.3 },'西兰花': { cal: 34, carbs: 7, protein: 2.8, fat: 0.4 },'番茄': { cal: 18, carbs: 3.9, protein: 0.9, fat: 0.2 },'黄瓜': { cal: 15, carbs: 3.6, protein: 0.7, fat: 0.1 },'生菜': { cal: 15, carbs: 2.9, protein: 1.4, fat: 0.2 },'红薯': { cal: 86, carbs: 20, protein: 1.6, fat: 0.1 },'土豆': { cal: 77, carbs: 17, protein: 2, fat: 0.1 },'全麦面包': { cal: 247, carbs: 41, protein: 13, fat: 3.4 },'燕麦': { cal: 389, carbs: 66, protein: 17, fat: 7 },'花生': { cal: 567, carbs: 16, protein: 26, fat: 49 },'核桃': { cal: 654, carbs: 14, protein: 15, fat: 65 },'沙拉': { cal: 50, carbs: 5, protein: 2, fat: 2 },'炸鸡': { cal: 260, carbs: 15, protein: 18, fat: 15 },'薯条': { cal: 312, carbs: 41, protein: 3.4, fat: 15 },'可乐': { cal: 42, carbs: 11, protein: 0, fat: 0 },'奶茶': { cal: 68, carbs: 10, protein: 1.5, fat: 2.5 },'咖啡': { cal: 2, carbs: 0, protein: 0.3, fat: 0 },'包子': { cal: 226, carbs: 30, protein: 8, fat: 8 },'饺子': { cal: 200, carbs: 25, protein: 8, fat: 7 },'宫保鸡丁': { cal: 150, carbs: 8, protein: 12, fat: 8 },'麻婆豆腐': { cal: 100, carbs: 4, protein: 6, fat: 7 },'青椒肉丝': { cal: 120, carbs: 4, protein: 10, fat: 7 }
};

function estimateNutrition(foodName, grams) {
  const g = grams || 100; let match = null;
  for (const key of Object.keys(FOOD_DB)) { if (foodName.includes(key) || key.includes(foodName)) { match = FOOD_DB[key]; break; } }
  if (!match) return null;
  const ratio = g / 100;
  return { calories: Math.round(match.cal * ratio), carbs: Math.round(match.carbs * ratio * 10) / 10, protein: Math.round(match.protein * ratio * 10) / 10, fat: Math.round(match.fat * ratio * 10) / 10 };
}

function showAddMealModal(mealType, photo) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  const types = ['早餐', '午餐', '晚餐', '加餐'];
  const typeSel = mealType ? '' : `<div class="form-group"><label class="form-label">餐次</label><div style="display:flex;gap:8px">${types.map(t => `<button type="button" class="meal-type-pick ${t==='加餐'?'active':''}" data-type="${t}">${t}</button>`).join('')}</div></div>`;
  content.innerHTML = `
    <div class="modal-title">${photo ? '📷 识别食物' : '添加' + (mealType || '食物')}</div>
    ${photo ? `<img src="${photo}" style="width:100%;border-radius:10px;margin-bottom:10px;max-height:200px;object-fit:cover">` : ''}
    <div class="form-group"><label class="form-label">食物名称</label><input class="form-input" id="mealName" placeholder="如：鸡胸肉、米饭、鸡蛋"></div>
    <div style="margin-bottom:8px"><button type="button" class="btn btn-secondary btn-sm" id="foodDbBtn" style="width:100%">🔍 从食物库选择 / 搜索</button><div id="foodDbList" style="display:none;margin-top:6px"></div></div>
    <div class="form-group"><label class="form-label">克重 (g)</label><input class="form-input" type="number" id="mealGrams" placeholder="如：200" value="100"></div>
    ${typeSel}
    <div id="autoResult" style="padding:12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:12px;display:none"><div style="font-size:13px;font-weight:600;margin-bottom:6px">🤖 营养估算</div><div id="autoNutrition" style="font-size:13px;color:var(--text-secondary)"></div></div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;text-align:center">输入食物名称后点"计算"自动估算（纯静态站无视觉AI，需手动选食物/填数值）</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">热量(kcal)</label><input class="form-input" type="number" id="mealCal" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">碳水(g)</label><input class="form-input" type="number" id="mealCarbs" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">蛋白质(g)</label><input class="form-input" type="number" id="mealProtein" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">脂肪(g)</label><input class="form-input" type="number" id="mealFat" placeholder="自动或手动"></div>
    </div>
    <div class="modal-actions"><button class="btn btn-secondary" id="calcMealBtn" style="flex:0.7">计算</button><button class="btn btn-secondary" id="cancelMealBtn">取消</button><button class="btn btn-primary" id="saveMealBtn">保存</button></div>
  `;
  modal.style.display = 'flex';
  let pickedType = mealType || '加餐';
  content.querySelectorAll('.meal-type-pick').forEach(b => b.addEventListener('click', () => { content.querySelectorAll('.meal-type-pick').forEach(x => x.classList.remove('active')); b.classList.add('active'); pickedType = b.dataset.type; }));
  document.getElementById('foodDbBtn').addEventListener('click', () => {
    const list = document.getElementById('foodDbList');
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
    if (list.style.display === 'block' && !list.dataset.filled) {
      list.dataset.filled = '1';
      list.innerHTML = `<input class="form-input" id="foodSearch" placeholder="搜索食物，如：鸡" style="margin-bottom:6px"><div id="foodSearchRes" style="max-height:160px;overflow:auto">${Object.keys(FOOD_DB).map(k => `<div class="food-db-item" data-name="${k}">${k} · ${FOOD_DB[k].cal}kcal/100g</div>`).join('')}</div>`;
      document.getElementById('foodSearch').addEventListener('input', (e) => { const q = e.target.value.trim(); document.getElementById('foodSearchRes').innerHTML = Object.keys(FOOD_DB).filter(k => k.includes(q)).map(k => `<div class="food-db-item" data-name="${k}">${k} · ${FOOD_DB[k].cal}kcal/100g</div>`).join('') || '<div style="font-size:12px;color:var(--text-muted);padding:6px">无结果</div>'; });
      list.querySelectorAll('.food-db-item').forEach(it => it.addEventListener('click', () => { document.getElementById('mealName').value = it.dataset.name; list.style.display = 'none'; }));
    }
  });
  document.getElementById('calcMealBtn').addEventListener('click', () => {
    const name = document.getElementById('mealName').value.trim(); const grams = parseInt(document.getElementById('mealGrams').value) || 100; if (!name) return;
    const result = estimateNutrition(name, grams);
    if (result) { document.getElementById('mealCal').value = result.calories; document.getElementById('mealCarbs').value = result.carbs; document.getElementById('mealProtein').value = result.protein; document.getElementById('mealFat').value = result.fat; document.getElementById('autoResult').style.display = 'block'; document.getElementById('autoNutrition').textContent = `${name} ${grams}g → ${result.calories}kcal / 碳水${result.carbs}g / 蛋白质${result.protein}g / 脂肪${result.fat}g`; }
    else { document.getElementById('autoResult').style.display = 'block'; document.getElementById('autoNutrition').textContent = `未找到「${name}」的数据，请手动填写营养数值`; }
  });
  document.getElementById('cancelMealBtn').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('saveMealBtn').addEventListener('click', () => {
    const name = document.getElementById('mealName').value.trim(); if (!name) return;
    const meals = Store.get('meals', []);
    meals.push({ id: Store.uid(), name, type: pickedType, grams: parseInt(document.getElementById('mealGrams').value) || 0, calories: parseInt(document.getElementById('mealCal').value) || 0, carbs: parseFloat(document.getElementById('mealCarbs').value) || 0, protein: parseFloat(document.getElementById('mealProtein').value) || 0, fat: parseFloat(document.getElementById('mealFat').value) || 0, photo: photo || null, date: selectedDate, timestamp: Date.now() });
    Store.set('meals', meals); modal.style.display = 'none'; renderCalorie(document.getElementById('dietContent'));
  });
}

// ========== 模块3: 运动训练（训练打卡 + 视频跟练） ==========
function renderExercise(el) {
  el.innerHTML = `
    <div class="sub-tabs" style="margin-bottom:16px">
      <button class="sub-tab ${exerciseTab==='checkin'?'active':''}" data-etab="checkin">训练打卡</button>
      <button class="sub-tab ${exerciseTab==='video'?'active':''}" data-etab="video">视频跟练</button>
    </div>
    <div id="exerciseContent"></div>
  `;
  el.querySelectorAll('[data-etab]').forEach(b => b.addEventListener('click', () => { exerciseTab = b.dataset.etab; renderExercise(el); }));
  const content = document.getElementById('exerciseContent');
  if (exerciseTab === 'checkin') renderExerciseCheckin(content);
  else renderVideoFollow(content, el);
}

function renderExerciseCheckin(el) {
  const categories = Store.get('exerciseCategories', getDefaultCategories());
  const checkins = Store.get('exerciseCheckins', []);
  const today = Store.today();
  const todayCheckins = checkins.filter(c => c.date === today);
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCheckins = checkins.filter(c => c.date.startsWith(monthStr));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const uniqueDays = new Set(monthCheckins.map(c => c.date)).size;

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>今日训练</div>
        <span style="font-size:12px;color:var(--text-muted)">${todayCheckins.length} 项已完成</span>
      </div>
      ${categories.map(cat => {
        const catCheckins = todayCheckins.filter(c => c.category === cat.name);
        const allDone = cat.items.length > 0 && cat.items.every(item => catCheckins.some(c => c.item === item));
        return `<div style="margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px"><span>${cat.icon}</span> ${escapeHtml(cat.name)} ${allDone ? '<span style="font-size:11px;color:var(--success);background:rgba(123,196,168,0.1);padding:2px 8px;border-radius:10px">全部完成 ✓</span>' : ''}</div>
          ${cat.items.map(item => { const done = catCheckins.some(c => c.item === item); return `<div class="exercise-check-item" style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:all 0.2s" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}">
            <div class="todo-checkbox ${done?'checked':''}"></div>
            <span style="flex:1;font-size:14px;${done?'text-decoration:line-through;color:var(--text-muted)':''}">${escapeHtml(item)}</span>
            <button class="action-btn exercise-del-item" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}" style="opacity:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>`; }).join('')}
          <button class="add-btn exercise-add-item" data-category="${escapeHtml(cat.name)}" style="margin-top:4px;padding:8px;font-size:12px">+ 添加项目</button>
        </div>`;
      }).join('')}
      <button class="add-btn" id="addExCategoryBtn">+ 添加训练分类</button>
    </div>
    <div class="card">
      <div class="card-title">📊 本月训练进度</div>
      <div style="text-align:center;padding:10px 0"><div style="font-size:36px;font-weight:700;color:var(--primary)">${uniqueDays}</div><div style="font-size:13px;color:var(--text-muted);margin-top:4px">天 / ${daysInMonth} 天有训练记录</div><div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-top:12px"><div style="height:100%;width:${Math.round(uniqueDays/daysInMonth*100)}%;background:var(--primary);border-radius:4px;transition:width 0.5s"></div></div></div>
    </div>
    <div class="card">
      <div class="card-title">📋 训练历史记录</div>
      ${renderExerciseHistory(checkins)}
    </div>
  `;
  el.querySelectorAll('.exercise-check-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.exercise-del-item') || e.target.closest('.exercise-add-item')) return;
      const cat = item.dataset.category; const itemName = item.dataset.item;
      const checkins = Store.get('exerciseCheckins', []);
      const idx = checkins.findIndex(c => c.date === today && c.category === cat && c.item === itemName);
      if (idx >= 0) checkins.splice(idx, 1); else checkins.push({ id: Store.uid(), date: today, category: cat, item: itemName, timestamp: Date.now() });
      Store.set('exerciseCheckins', checkins); renderExerciseCheckin(el);
    });
  });
  el.querySelectorAll('.exercise-del-item').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const cat = btn.dataset.category; const item = btn.dataset.item; const categories = Store.get('exerciseCategories', getDefaultCategories()); const catObj = categories.find(c => c.name === cat); if (catObj) { catObj.items = catObj.items.filter(i => i !== item); Store.set('exerciseCategories', categories); renderExerciseCheckin(el); } }); });
  el.querySelectorAll('.exercise-add-item').forEach(btn => { btn.addEventListener('click', () => { showTextInputModal('添加训练项目', (item) => { if (!item) return; const categories = Store.get('exerciseCategories', getDefaultCategories()); const catObj = categories.find(c => c.name === btn.dataset.category); if (catObj) { catObj.items.push(item); Store.set('exerciseCategories', categories); renderExerciseCheckin(el); } }); }); });
  document.getElementById('addExCategoryBtn').addEventListener('click', () => { showDualInputModal('添加训练分类', '分类名称', '图标 (emoji)', '🏋️', (name, icon) => { if (!name) return; const categories = Store.get('exerciseCategories', getDefaultCategories()); categories.push({ name, icon: icon || '🏋️', items: [] }); Store.set('exerciseCategories', categories); renderExerciseCheckin(el); }); });
}

function renderExerciseHistory(checkins) {
  if (checkins.length === 0) return '<div class="empty-state"><div class="empty-state-text">暂无训练记录</div></div>';
  const groups = Store.groupByDate(checkins);
  return groups.slice(0, 10).map(([date, items]) => `<div class="date-fold"><div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')"><svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>${formatDateCN(date)}<span class="date-fold-count">${items.length} 项</span></div><div class="date-fold-body">${items.map(c => `<div class="todo-item completed"><div class="todo-checkbox checked"></div><div class="todo-content"><div class="todo-text">${escapeHtml(c.category)} · ${escapeHtml(c.item)}</div></div></div>`).join('')}</div></div>`).join('');
}

function getDefaultCategories() {
  return [
    { name: '有氧', icon: '🏃', items: ['跑步30分钟', '跳绳15分钟', '快走40分钟'] },
    { name: '无氧/力量', icon: '💪', items: ['深蹲3组x15', '俯卧撑3组x12', '哑铃划船3组x12'] },
    { name: '体态矫正', icon: '🧘', items: ['开肩拉伸10分钟', '核心激活5分钟', '泡沫轴放松10分钟'] },
    { name: '拉伸放松', icon: '🤸', items: ['全身拉伸15分钟', '瑜伽20分钟'] }
  ];
}

// ========== 模块3b: 视频跟练（记录链接 + 全平台视频 + 在源站打开） ==========
function renderVideoFollow(el, container) {
  const videos = Store.get('exerciseVideos', []);
  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">🎬 运动视频 · 记录链接</div>
        <button class="btn btn-primary btn-sm" id="addTutorialBtn">+ 添加链接</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">收录你的运动教程链接（B站/YouTube/腾讯/优酷等全平台）。点「在源站打开」直接去平台跟练，无需在此打卡。</div>
      ${videos.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🏋️</div><div class="empty-state-text">还没有链接，点击右上角添加</div></div>' : ''}
      <div style="display:flex;flex-direction:column;gap:14px">
        ${videos.map(v => `
          <div class="follow-item" data-id="${v.id}">
            <div class="flex-between mb-8">
              <div style="font-size:14px;font-weight:600">${escapeHtml(v.title)} <span style="font-size:11px;color:var(--text-muted);font-weight:400">· ${escapeHtml(v.category)}</span></div>
              <button class="action-btn follow-del" data-id="${v.id}" style="opacity:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
            ${v.duration ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">⏱ 建议时长 ${v.duration} 分钟</div>` : ''}
            ${renderVideoPlayer(v.url, v.title)}
            ${v.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">${escapeHtml(v.note)}</div>` : ''}
            <div style="margin-top:10px">
              <button class="btn btn-primary btn-sm follow-open" data-id="${v.id}" style="width:100%">↗ 在源站打开跟练</button>
            </div>
          </div>`).join('')}
      </div>
    </div>
  `;

  document.getElementById('addTutorialBtn').addEventListener('click', () => showTutorialModal(container));
  el.querySelectorAll('.follow-del').forEach(btn => { btn.addEventListener('click', () => { let arr = Store.get('exerciseVideos', []); arr = arr.filter(x => x.id !== btn.dataset.id); Store.set('exerciseVideos', arr); renderVideoFollow(el, container); }); });
  el.querySelectorAll('.follow-open').forEach(btn => { btn.addEventListener('click', () => { const v = Store.get('exerciseVideos', []).find(x => x.id === btn.dataset.id); if (v && v.url) window.open(v.url, '_blank', 'noopener'); else showToast('该教程还没有链接'); }); });
  bindVideoPlayers(el);
}

function showTutorialModal(container) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  const categories = Store.get('exerciseVideos', []).reduce((s, v) => { if (!s.includes(v.category)) s.push(v.category); return s; }, ['有氧','力量','拉伸']);
  content.innerHTML = `
    <div class="modal-title">添加运动视频链接</div>
    <div class="form-group"><label class="form-label">教程名称</label><input class="form-input" id="tutTitle" placeholder="如：帕梅拉 10分钟全身燃脂"></div>
    <div class="form-group"><label class="form-label">分类</label><input class="form-input" id="tutCat" list="tutCatList" placeholder="如：有氧" value="有氧"><datalist id="tutCatList">${categories.map(c => `<option value="${escapeHtml(c)}">`).join('')}</datalist></div>
    <div class="form-group"><label class="form-label">视频链接（全平台）</label><input class="form-input" id="tutUrl" placeholder="https://..."></div>
    <div class="form-group"><label class="form-label">建议时长 (分钟)</label><input class="form-input" type="number" id="tutDur" placeholder="如：15"></div>
    <div class="form-group"><label class="form-label">备注（可选）</label><input class="form-input" id="tutNote" placeholder="如：无跳跃版"></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="tutCancel">取消</button><button class="btn btn-primary" id="tutSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('tutTitle').focus(), 100);
  document.getElementById('tutCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('tutSave').addEventListener('click', () => {
    const title = document.getElementById('tutTitle').value.trim(); const url = document.getElementById('tutUrl').value.trim();
    if (!title) return;
    const videos = Store.get('exerciseVideos', []);
    videos.unshift({ id: Store.uid(), title, category: document.getElementById('tutCat').value.trim() || '有氧', url, duration: parseInt(document.getElementById('tutDur').value) || 0, note: document.getElementById('tutNote').value.trim(), timestamp: Date.now() });
    Store.set('exerciseVideos', videos); modal.style.display = 'none'; renderVideoFollow(document.getElementById('exerciseContent'), container);
  });
}

// ========== 模块4: 厨房秘籍（菜品/食材/调料 + 视频链接 + 卡路里 + 价格） ==========
let kitchenFilter = '全部';
function renderKitchen(el, container) {
  const items = Store.get('kitchenItems', []);
  const types = ['全部', '菜品', '食材', '调料'];
  const filtered = kitchenFilter === '全部' ? items : items.filter(i => i.type === kitchenFilter);
  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">🍳 厨房秘籍</div>
        <button class="btn btn-primary btn-sm" id="addKitchenBtn">+ 添加</button>
      </div>
      <div class="sub-tabs" style="margin-bottom:12px">
        ${types.map(t => `<button class="sub-tab ${kitchenFilter===t?'active':''}" data-ktype="${t}" style="padding:6px 14px;font-size:13px">${t}</button>`).join('')}
      </div>
      ${filtered.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🍳</div><div class="empty-state-text">还没有收录，点击右上角添加</div></div>' : ''}
      <div style="display:flex;flex-direction:column;gap:12px">
        ${filtered.map(it => `
          <div class="kitchen-item" data-id="${it.id}">
            <div class="flex-between mb-8">
              <div><span class="kitchen-type-tag type-${it.type}">${it.type}</span> <span style="font-size:14px;font-weight:600">${escapeHtml(it.name)}</span></div>
              <button class="action-btn kitchen-del" data-id="${it.id}" style="opacity:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
            ${it.url ? renderVideoPlayer(it.url, it.name) : ''}
            <div class="kitchen-meta">
              ${it.calories ? `<span>🔥 ${it.calories} kcal</span>` : ''}
              ${it.price ? `<span>💰 ¥${it.price}</span>` : ''}
            </div>
            ${it.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">${escapeHtml(it.note)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>
  `;
  document.getElementById('addKitchenBtn').addEventListener('click', () => showKitchenModal(container));
  el.querySelectorAll('[data-ktype]').forEach(b => b.addEventListener('click', () => { kitchenFilter = b.dataset.ktype; renderKitchen(el, container); }));
  el.querySelectorAll('.kitchen-del').forEach(btn => { btn.addEventListener('click', () => { let arr = Store.get('kitchenItems', []); arr = arr.filter(x => x.id !== btn.dataset.id); Store.set('kitchenItems', arr); renderKitchen(el, container); }); });
  bindVideoPlayers(el);
}

function showKitchenModal(container) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加厨房秘籍</div>
    <div class="form-group"><label class="form-label">分类</label><select class="form-input" id="kType"><option>菜品</option><option>食材</option><option>调料</option></select></div>
    <div class="form-group"><label class="form-label">名称</label><input class="form-input" id="kName" placeholder="如：番茄炒蛋 / 鸡胸肉 / 生抽"></div>
    <div class="form-group"><label class="form-label">教程链接（全平台视频，可选）</label><input class="form-input" id="kUrl" placeholder="https://..."></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">卡路里 (kcal)</label><input class="form-input" type="number" id="kCal"></div>
      <div class="form-group"><label class="form-label">价格 (¥)</label><input class="form-input" type="number" id="kPrice"></div>
    </div>
    <div class="form-group"><label class="form-label">备注（可选）</label><input class="form-input" id="kNote" placeholder="如：低卡做法"></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="kCancel">取消</button><button class="btn btn-primary" id="kSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('kName').focus(), 100);
  document.getElementById('kCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('kSave').addEventListener('click', () => {
    const name = document.getElementById('kName').value.trim(); if (!name) return;
    const items = Store.get('kitchenItems', []);
    items.unshift({ id: Store.uid(), type: document.getElementById('kType').value, name, url: document.getElementById('kUrl').value.trim(), calories: parseInt(document.getElementById('kCal').value) || 0, price: parseFloat(document.getElementById('kPrice').value) || 0, note: document.getElementById('kNote').value.trim(), timestamp: Date.now() });
    Store.set('kitchenItems', items); modal.style.display = 'none'; renderKitchen(document.getElementById('healthContent'), container);
  });
}

// ========== 模块5: 智能食谱（BMI/TDEE + 3天食谱生成） ==========
let recipeProfile = null;
function renderRecipe(el, container) {
  recipeProfile = recipeProfile || Store.get('recipeProfile', null);
  const hasProfile = !!recipeProfile;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🥗 智能食谱 · 身体数据</div>
      ${hasProfile ? `
        <div class="recipe-profile-summary">
          <div class="recipe-stat"><div class="recipe-stat-value">${recipeProfile.gender === '男' ? '♂' : '♀'}</div><div class="recipe-stat-label">${recipeProfile.gender} · ${recipeProfile.age}岁</div></div>
          <div class="recipe-stat"><div class="recipe-stat-value">${recipeProfile.height}</div><div class="recipe-stat-label">身高 cm</div></div>
          <div class="recipe-stat"><div class="recipe-stat-value">${recipeProfile.weight}</div><div class="recipe-stat-label">体重 kg</div></div>
        </div>
        <div class="recipe-metrics">
          <div class="recipe-metric"><div class="recipe-metric-value">${calcBMI(recipeProfile).value}</div><div class="recipe-metric-label">BMI · ${calcBMI(recipeProfile).cat}</div></div>
          <div class="recipe-metric"><div class="recipe-metric-value">${calcTDEE(recipeProfile)}</div><div class="recipe-metric-label">TDEE (kcal)</div></div>
          <div class="recipe-metric"><div class="recipe-metric-value">${Math.round(calcTDEE(recipeProfile) * goalFactor(recipeProfile.goal))}</div><div class="recipe-metric-label">目标热量 · ${goalLabel(recipeProfile.goal)}</div></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-secondary btn-sm" id="editProfileBtn" style="flex:1">修改数据</button>
          <button class="btn btn-primary btn-sm" id="genPlanBtn" style="flex:1">🎲 生成3天食谱</button>
        </div>
      ` : `<button class="btn btn-primary btn-lg" id="setupProfileBtn" style="width:100%">录入身体数据</button>`}
    </div>
    <div id="recipePlanArea"></div>
  `;
  if (hasProfile) {
    document.getElementById('editProfileBtn').addEventListener('click', () => showProfileModal(container));
    document.getElementById('genPlanBtn').addEventListener('click', () => { const plan = generateMealPlan(recipeProfile); renderPlan(document.getElementById('recipePlanArea'), plan, recipeProfile, container); });
    const savedPlan = Store.get('recipePlan', null);
    if (savedPlan) renderPlan(document.getElementById('recipePlanArea'), savedPlan, recipeProfile, container);
  } else {
    document.getElementById('setupProfileBtn').addEventListener('click', () => showProfileModal(container));
  }
}

function calcBMI(p) { const v = p.weight / Math.pow(p.height/100, 2); let cat = '正常'; if (v < 18.5) cat = '偏瘦'; else if (v < 24) cat = '正常'; else if (v < 28) cat = '偏胖'; else cat = '肥胖'; return { value: v.toFixed(1), cat }; }
function activityFactor(a) { return { '久坐': 1.2, '轻度活动': 1.375, '中度活动': 1.55, '高强度': 1.725, '运动员': 1.9 }[a] || 1.2; }
function goalFactor(g) { return { '减脂': 0.85, '维持': 1.0, '增肌': 1.1 }[g] || 1.0; }
function goalLabel(g) { return { '减脂': '减脂', '维持': '维持', '增肌': '增肌' }[g] || '维持'; }
function calcTDEE(p) {
  const bmr = p.gender === '男' ? 10*p.weight + 6.25*p.height - 5*p.age + 5 : 10*p.weight + 6.25*p.height - 5*p.age - 161;
  return Math.round(bmr * activityFactor(p.activity));
}

function showProfileModal(container) {
  const p = recipeProfile || {};
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">录入身体数据</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">性别</label><select class="form-input" id="pGender"><option ${p.gender==='男'?'selected':''}>男</option><option ${p.gender==='女'?'selected':''}>女</option></select></div>
      <div class="form-group"><label class="form-label">年龄</label><input class="form-input" type="number" id="pAge" value="${p.age||''}" placeholder="如：25"></div>
      <div class="form-group"><label class="form-label">身高 (cm)</label><input class="form-input" type="number" id="pHeight" value="${p.height||''}"></div>
      <div class="form-group"><label class="form-label">体重 (kg)</label><input class="form-input" type="number" id="pWeight" value="${p.weight||''}"></div>
    </div>
    <div class="form-group"><label class="form-label">活动量</label><select class="form-input" id="pActivity"><option ${p.activity==='久坐'?'selected':''}>久坐</option><option ${p.activity==='轻度活动'?'selected':''}>轻度活动</option><option ${p.activity==='中度活动'?'selected':''}>中度活动</option><option ${p.activity==='高强度'?'selected':''}>高强度</option><option ${p.activity==='运动员'?'selected':''}>运动员</option></select></div>
    <div class="form-group"><label class="form-label">目标</label><select class="form-input" id="pGoal"><option ${p.goal==='减脂'?'selected':''}>减脂</option><option ${p.goal==='维持'?'selected':''}>维持</option><option ${p.goal==='增肌'?'selected':''}>增肌</option></select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">每日预算 (¥)</label><input class="form-input" type="number" id="pBudget" value="${p.budget||''}" placeholder="如：40"></div>
      <div class="form-group"><label class="form-label">固定食材 (逗号分隔)</label><input class="form-input" id="pFixed" value="${(p.fixed||[]).join('、')}" placeholder="如：鸡蛋、鸡胸肉"></div>
    </div>
    <div class="modal-actions"><button class="btn btn-secondary" id="pCancel">取消</button><button class="btn btn-primary" id="pSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  document.getElementById('pCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('pSave').addEventListener('click', () => {
    const profile = {
      gender: document.getElementById('pGender').value, age: parseInt(document.getElementById('pAge').value) || 0,
      height: parseInt(document.getElementById('pHeight').value) || 0, weight: parseFloat(document.getElementById('pWeight').value) || 0,
      activity: document.getElementById('pActivity').value, goal: document.getElementById('pGoal').value,
      budget: parseFloat(document.getElementById('pBudget').value) || 0,
      fixed: document.getElementById('pFixed').value.split(/[、,，]/).map(s => s.trim()).filter(Boolean)
    };
    if (!profile.height || !profile.weight) { showToast('请填写身高体重'); return; }
    recipeProfile = profile; Store.set('recipeProfile', profile); modal.style.display = 'none'; renderRecipe(document.getElementById('healthContent'), container);
  });
}

const RECIPE_POOL = [
  { name: '燕麦牛奶', cal: 250, cost: 4, meals: ['早餐'] }, { name: '水煮蛋×2', cal: 140, cost: 2, meals: ['早餐'] }, { name: '全麦面包+花生酱', cal: 280, cost: 5, meals: ['早餐'] }, { name: '紫薯+无糖酸奶', cal: 220, cost: 6, meals: ['早餐'] }, { name: '蔬菜蛋饼', cal: 240, cost: 4, meals: ['早餐'] }, { name: '小米粥+咸菜', cal: 180, cost: 3, meals: ['早餐'] },
  { name: '糙米饭+清蒸鱼', cal: 380, cost: 12, meals: ['午餐','晚餐'] }, { name: '鸡胸肉藜麦碗', cal: 420, cost: 14, meals: ['午餐','晚餐'] }, { name: '番茄炒蛋+米饭', cal: 400, cost: 8, meals: ['午餐','晚餐'] }, { name: '西兰花炒牛肉', cal: 360, cost: 15, meals: ['午餐','晚餐'] }, { name: '豆腐蔬菜汤+杂粮饭', cal: 320, cost: 7, meals: ['午餐','晚餐'] }, { name: '青椒肉丝+米饭', cal: 440, cost: 11, meals: ['午餐','晚餐'] }, { name: '凉拌鸡丝荞麦面', cal: 380, cost: 10, meals: ['午餐','晚餐'] }, { name: '虾仁蒸蛋+米饭', cal: 340, cost: 13, meals: ['午餐','晚餐'] },
  { name: '希腊酸奶+蓝莓', cal: 150, cost: 9, meals: ['加餐'] }, { name: '苹果', cal: 95, cost: 3, meals: ['加餐'] }, { name: '香蕉+核桃', cal: 200, cost: 6, meals: ['加餐'] }, { name: '坚果一小把', cal: 170, cost: 7, meals: ['加餐'] }, { name: '无糖豆浆', cal: 60, cost: 3, meals: ['加餐'] }, { name: '黄瓜胡萝卜条', cal: 50, cost: 2, meals: ['加餐'] }
];

function generateMealPlan(p) {
  const target = Math.round(calcTDEE(p) * goalFactor(p.goal));
  const perMeal = { '早餐': target * 0.25, '午餐': target * 0.35, '晚餐': target * 0.30, '加餐': target * 0.10 };
  const budget = p.budget || 0;
  const fixed = p.fixed || [];
  const days = [];
  for (let d = 0; d < 3; d++) {
    const plan = { day: d + 1, meals: {}, dayCal: 0, dayCost: 0 };
    for (const meal of ['早餐', '午餐', '晚餐', '加餐']) {
      const items = []; let cal = 0, cost = 0;
      if (fixed.length && Math.random() < 0.7) { const ing = fixed[Math.floor(Math.random() * fixed.length)]; items.push({ name: ing + '(自带)', cal: 0, cost: 0 }); }
      const pool = RECIPE_POOL.filter(x => x.meals.includes(meal));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const x of shuffled) { if (cal >= perMeal[meal] * 0.95) break; if (budget && cost + x.cost > budget) continue; items.push({ name: x.name, cal: x.cal, cost: x.cost }); cal += x.cal; cost += x.cost; }
      if (items.length === 0) items.push({ name: '自由搭配', cal: Math.round(perMeal[meal]), cost: 0 });
      plan.meals[meal] = { items, cal: Math.round(cal), cost: Math.round(cost) };
      plan.dayCal += cal; plan.dayCost += cost;
    }
    days.push(plan);
  }
  Store.set('recipePlan', days);
  return days;
}

function renderPlan(area, days, p, container) {
  const target = Math.round(calcTDEE(p) * goalFactor(p.goal));
  area.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">📋 专属 3 天食谱</div>
        <button class="btn btn-secondary btn-sm" id="regenBtn">🔄 换一批</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">目标热量 ${target} kcal/天${p.budget ? ' · 预算 ¥' + p.budget + '/天' : ''}${p.fixed && p.fixed.length ? ' · 含固定食材：' + p.fixed.join('、') : ''}</div>
      ${days.map(plan => `
        <div class="recipe-day">
          <div class="recipe-day-head">第 ${plan.day} 天 <span style="font-size:12px;color:var(--text-muted)">· ${plan.dayCal} kcal · ¥${plan.dayCost}</span></div>
          ${['早餐','午餐','晚餐','加餐'].map(meal => `
            <div class="recipe-meal">
              <div class="recipe-meal-name">${meal === '加餐' ? '🍎' : meal === '早餐' ? '🌅' : meal === '午餐' ? '☀️' : '🌙'} ${meal}</div>
              <div class="recipe-meal-items">
                ${plan.meals[meal].items.map(it => `<span class="recipe-food">${escapeHtml(it.name)} <i>${it.cal}kcal${it.cost ? ' ·¥' + it.cost : ''}</i></span>`).join('')}
              </div>
            </div>`).join('')}
        </div>`).join('')}
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">※ 食谱为按热量与预算的启发式搭配，仅供参考，具体分量请按感受调整。</div>
    </div>
  `;
  document.getElementById('regenBtn').addEventListener('click', () => { const np = generateMealPlan(recipeProfile); renderPlan(area, np, recipeProfile, container); });
}

// ========== 模块6: 养出好气血（测评 + 推荐 + 记录） ==========
const QI_KB = {
  '养胃': { teas:['山药小米粥','红枣生姜茶','陈皮普洱茶','茯苓白术茶'], foods:['南瓜','山药','小米','莲子','木瓜'], exercises:['饭后散步15分钟','顺时针揉腹36圈','八段锦·调理脾胃须单举'], acupoints:['中脘穴（健胃）','足三里（健脾）','天枢穴（调肠）'], foot:'艾叶生姜水泡脚，温胃散寒，15-20分钟' },
  '养肝': { teas:['菊花枸杞茶','玫瑰陈皮茶','决明子茶','柴胡疏肝茶'], foods:['菠菜','芹菜','枸杞','胡萝卜','西兰花'], exercises:['八段锦·摇头摆尾去心火','侧腰拉伸','拉伸肝胆经'], acupoints:['太冲穴（疏肝）','期门穴','肝俞穴'], foot:'花椒水泡脚，疏肝理气' },
  '养气血': { teas:['红枣枸杞茶','桂圆红枣茶','黄芪当归茶','西洋参茶'], foods:['红枣','桂圆','猪肝','瘦肉','黑芝麻','当归炖鸡'], exercises:['八段锦·双手托天理三焦','温和瑜伽','气血操'], acupoints:['足三里（健脾生血）','三阴交（调血）','血海穴（养血）','关元穴（培元）'], foot:'生姜艾叶水泡脚，温补气血，微微出汗' },
  '养目': { teas:['枸杞菊花茶','决明子茶','桑叶菊花茶'], foods:['胡萝卜','蓝莓','枸杞','猪肝','菠菜'], exercises:['眼保健操','远眺5分钟','转眼球操','热敷眼周'], acupoints:['睛明穴','攒竹穴','太阳穴','风池穴'], foot:'温水泡脚，引血下行缓解眼疲劳' },
  '养肾': { teas:['黑豆核桃茶','杜仲茶','五味子茶'], foods:['黑豆','黑芝麻','核桃','海参','枸杞'], exercises:['踮脚提踵','搓腰（肾俞）','八段锦·双手攀足固肾腰'], acupoints:['涌泉穴（补肾）','太溪穴','肾俞穴'], foot:'盐水泡脚，温肾助阳' },
  '安神': { teas:['酸枣仁百合茶','桂圆莲子茶','薰衣草茶'], foods:['莲子','百合','牛奶','核桃','小米'], exercises:['睡前冥想10分钟','腹式呼吸','静坐调息'], acupoints:['神门穴（安神）','三阴交','涌泉穴'], foot:'薰衣草或花椒水泡脚，安神助眠' }
};

function getDefaultQiDirections() { return ['养胃', '养肝', '养气血', '养目', '养肾', '安神']; }

function weekMonday() {
  const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
  return { str: formatDate(d), obj: d };
}

function renderQi(el, container) {
  const directions = Store.get('qiDirections', getDefaultQiDirections());
  const selected = Store.get('qiSelected', directions.slice());
  const week = weekMonday();
  const savedWeek = Store.get('qiWeek', null);
  const weekPlan = (savedWeek && savedWeek.weekStart === week.str) ? savedWeek : null;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🌿 养生方向</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">点选你想调养的方向（可自由增减）。本模块按<b>双休上班族</b>节奏，生成一周（周一~周日）养生计划：工作日精简、周末充裕可加料。</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="qiDirWrap">
        ${directions.map(d => `<span class="qi-dir-chip ${selected.includes(d)?'active':''}" data-dir="${escapeHtml(d)}"><span class="qi-dir-text">${escapeHtml(d)}</span>${selected.includes(d)?'<span class="qi-dir-check">✓</span>':''}<button class="qi-dir-del" data-dir="${escapeHtml(d)}" title="删除该方向">×</button></span>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-secondary btn-sm" id="qiAddDir" style="flex:1">+ 添加方向</button>
        <button class="btn btn-primary btn-sm" id="qiGen" style="flex:1">🎲 生成本周7天计划</button>
      </div>
    </div>
    <div id="qiPlanResult">${weekPlan ? qiWeekHtml(weekPlan, week.str) : '<div class="empty-state"><div class="empty-state-icon">🌿</div><div class="empty-state-text">选择方向后，点「生成本周7天计划」</div></div>'}</div>
  `;
  el.querySelectorAll('.qi-dir-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.closest('.qi-dir-del')) return;
      const d = chip.dataset.dir; const sel = Store.get('qiSelected', directions.slice());
      const i = sel.indexOf(d); if (i >= 0) sel.splice(i, 1); else sel.push(d);
      Store.set('qiSelected', sel); renderQi(el, container);
    });
  });
  el.querySelectorAll('.qi-dir-del').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const d = btn.dataset.dir; let dirs = Store.get('qiDirections', getDefaultQiDirections()); dirs = dirs.filter(x => x !== d); Store.set('qiDirections', dirs); let sel = Store.get('qiSelected', dirs.slice()); sel = sel.filter(x => x !== d); Store.set('qiSelected', sel); renderQi(el, container); }); });
  document.getElementById('qiAddDir').addEventListener('click', () => showTextInputModal('添加养生方向', (name) => { if (!name) return; const dirs = Store.get('qiDirections', getDefaultQiDirections()); if (!dirs.includes(name)) { dirs.push(name); Store.set('qiDirections', dirs); const sel = Store.get('qiSelected', dirs.slice()); sel.push(name); Store.set('qiSelected', sel); } renderQi(el, container); }));
  document.getElementById('qiGen').addEventListener('click', () => {
    const w = generateQiWeek(); if (!w) return;
    Store.set('qiWeek', w);
    const area = document.getElementById('qiPlanResult');
    area.innerHTML = qiWeekHtml(w, week.str);
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('已生成本周 7 天养生计划 🌿');
  });
  const regen = document.getElementById('qiRegen');
  if (regen) regen.addEventListener('click', () => {
    const w = generateQiWeek(); if (!w) return;
    Store.set('qiWeek', w);
    document.getElementById('qiPlanResult').innerHTML = qiWeekHtml(w, week.str);
    showToast('已重新生成本周计划 🌿');
  });
}

function generateQiWeek() {
  const directions = Store.get('qiDirections', getDefaultQiDirections());
  const selected = Store.get('qiSelected', directions.slice()).filter(d => directions.includes(d));
  if (selected.length === 0) { showToast('请至少选择一个养生方向'); return null; }
  const pick = (arr, n) => { const c = [...arr]; const out = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return out; };
  const week = weekMonday();
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(week.obj); dt.setDate(dt.getDate() + i);
    const isWeekend = i >= 5;
    const teas = new Set(), foods = new Set(), exercises = new Set(), acupoints = new Set(); let foot = ''; const unknown = [];
    selected.forEach(d => {
      const kb = QI_KB[d]; if (!kb) { unknown.push(d); return; }
      pick(kb.teas, isWeekend ? 2 : 1).forEach(x => teas.add(x));
      pick(kb.foods, isWeekend ? 3 : 2).forEach(x => foods.add(x));
      pick(kb.exercises, isWeekend ? 2 : 1).forEach(x => exercises.add(x));
      pick(kb.acupoints, isWeekend ? 2 : 1).forEach(x => acupoints.add(x));
      if (!foot) foot = kb.foot;
    });
    days.push({
      label: names[i], date: formatDate(dt), isWeekend,
      teas: [...teas], foods: [...foods], exercises: [...exercises], acupoints: [...acupoints],
      foot: foot || '温水泡脚 15-20 分钟', unknown
    });
  }
  return { weekStart: week.str, dirs: selected, days, unknown };
}

function qiWeekHtml(w, weekStart) {
  const today = Store.today();
  return `<div class="card" style="padding:14px"><div class="card-title">🌿 本周养生计划（${w.dirs.join(' / ')}）</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${formatDateCN(weekStart)} 起 · 工作日精简、周末（${w.dirs.includes('养气血') ? '可加煲汤/艾灸' : '可加料'}）更充裕 · 仅供参考不替代医疗诊断</div>
    <div class="qi-week">${w.days.map(d => `
      <div class="qi-day ${d.date === today ? 'today' : ''} ${d.isWeekend ? 'weekend' : ''}">
        <div class="qi-day-head"><span class="qi-day-name">${d.label}</span><span class="qi-day-date">${d.date.slice(5)}</span>${d.isWeekend ? '<span class="qi-day-tag">周末</span>' : ''}</div>
        <div class="qi-rec-block"><div class="qi-rec-head">🍵 茶饮</div>${d.teas.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
        <div class="qi-rec-block"><div class="qi-rec-head">🥗 食饮</div>${d.foods.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
        <div class="qi-rec-block"><div class="qi-rec-head">🤸 健身操</div>${d.exercises.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
        <div class="qi-rec-block"><div class="qi-rec-head">💆 穴位</div>${d.acupoints.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
        <div class="qi-rec-block"><div class="qi-rec-head">🦶 泡脚</div><div class="qi-rec-item">${d.foot}</div></div>
      </div>`).join('')}</div>
    ${w.unknown && w.unknown.length ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">自定义方向（${w.unknown.join('、')}）暂无内置资料，建议自行查阅。</div>` : ''}
    <button class="btn btn-secondary btn-sm" id="qiRegen" style="width:100%;margin-top:10px">🔄 重新生成本周计划</button>
  </div>`;
}

// ========== 模块7: 各种记录（仅"有/无"布尔 + 日期下显示项目 emoji） ==========
function normalizeHealthRecords(cats) {
  return (cats || []).map(c => ({
    name: c.name,
    icon: c.icon || '📝',
    items: (c.items || []).map(it => typeof it === 'string' ? { name: it, emoji: '' } : { name: it.name, emoji: it.emoji || '' })
  }));
}

function findItemEmoji(categories, catName, itemName) {
  const cat = categories.find(c => c.name === catName);
  if (!cat) return '';
  const it = cat.items.find(i => i.name === itemName);
  return it ? it.emoji : '';
}

function renderHealthRecords(el) {
  const categories = normalizeHealthRecords(Store.get('healthRecordCategories', getDefaultHealthRecords()));
  const records = Store.get('healthRecords', []);
  const today = Store.today();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const dateItems = [];
  for (let i = -3; i <= 3; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateItems.push(d); }
  const dayRecords = records.filter(r => r.date === selectedDate);
  const monthRecords = records.filter(r => r.date.startsWith(monthStr));
  // 当月每天收集该项目 emoji（找不到则用分类图标兜底）
  const monthDayEmojis = {};
  monthRecords.forEach(r => {
    const e = findItemEmoji(categories, r.category, r.item) || (categories.find(c => c.name === r.category) || {}).icon || '✅';
    (monthDayEmojis[r.date] = monthDayEmojis[r.date] || new Set()).add(e);
  });

  el.innerHTML = `
    <div class="date-picker-h" id="recordDatePicker">
      ${dateItems.map(d => { const ds = formatDate(d); const isToday = ds === today; return `<div class="date-picker-item ${isToday?'today':''} ${ds===selectedDate?'selected':''}" data-date="${ds}"><div class="dp-weekday">${['日','一','二','三','四','五','六'][d.getDay()]}</div><div class="dp-day">${d.getDate()}</div></div>`; }).join('')}
    </div>
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0">📝 ${formatDateCN(selectedDate)} 记录</div><span style="font-size:12px;color:var(--text-muted)">${dayRecords.length} 条 · 点一下=有，再点=取消</span></div>
      ${categories.map(cat => {
        const catRecords = dayRecords.filter(r => r.category === cat.name);
        return `<div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"><span>${cat.icon}</span> ${escapeHtml(cat.name)}</div>
            <button class="action-btn health-cat-del" data-name="${escapeHtml(cat.name)}" style="opacity:1;color:var(--text-muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${cat.items.map(item => {
              const done = catRecords.some(r => r.item === item.name);
              const e = item.emoji || cat.icon;
              return `<div class="record-row" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item.name)}">
                <button class="record-emoji-btn" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item.name)}" title="点击设置emoji">${e}</button>
                <button class="record-chip ${done?'active':''}">${escapeHtml(item.name)} ${done ? '✓' : ''}</button>
              </div>`;
            }).join('')}
          </div>
          <button class="add-btn health-add-item" data-category="${escapeHtml(cat.name)}" style="margin-top:6px;padding:6px;font-size:12px">+ 添加项</button>
        </div>`;
      }).join('')}
      <button class="add-btn" id="addHealthCatBtn">+ 添加记录分类</button>
    </div>
    <div class="card">
      <div class="card-title">📅 本月打卡日历（显示项目 emoji）</div>
      <div class="rec-cal">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${getMonthDays(now.getFullYear(), now.getMonth()).map(d => {
          const ds = formatDate(d.date); const isToday = ds === today; const hasRec = records.some(r => r.date === ds);
          const emSet = monthDayEmojis[ds]; const emojisArr = emSet ? [...emSet].slice(0, 6) : [];
          return `<div class="rec-cal-day ${d.otherMonth?'other-month':''} ${isToday?'today':''} ${hasRec?'has-rec':''}">
            <div class="rec-cal-num">${d.date.getDate()}</div>
            <div class="rec-cal-emojis">${emojisArr.map(e => `<span>${e}</span>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card"><div class="card-title">📋 历史记录</div>${renderHealthRecordHistory(records, categories)}</div>
  `;
  el.querySelectorAll('.date-picker-item').forEach(d => { d.addEventListener('click', () => { selectedDate = d.dataset.date; renderHealthRecords(el); }); });
  el.querySelectorAll('.record-chip').forEach(chip => { chip.addEventListener('click', () => { const row = chip.closest('.record-row'); const cat = row.dataset.category; const item = row.dataset.item; const allRecords = Store.get('healthRecords', []); const idx = allRecords.findIndex(r => r.date === selectedDate && r.category === cat && r.item === item); if (idx >= 0) allRecords.splice(idx, 1); else allRecords.push({ id: Store.uid(), date: selectedDate, category: cat, item, timestamp: Date.now() }); Store.set('healthRecords', allRecords); renderHealthRecords(el); }); });
  el.querySelectorAll('.record-emoji-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const cat = btn.dataset.category, item = btn.dataset.item; const cats = normalizeHealthRecords(Store.get('healthRecordCategories', getDefaultHealthRecords())); const c = cats.find(x => x.name === cat); const it = c ? c.items.find(x => x.name === item) : null; showEmojiPicker(it ? it.emoji : '', (emo) => { const stored = Store.get('healthRecordCategories', getDefaultHealthRecords()); const sc = stored.find(x => x.name === cat); if (sc) { const si = sc.items.find(x => x.name === item); if (si) si.emoji = emo; } Store.set('healthRecordCategories', stored); renderHealthRecords(el); }); }); });
  el.querySelectorAll('.health-add-item').forEach(btn => { btn.addEventListener('click', () => { showHealthItemModal(btn.dataset.category, '', '', (name, emoji) => { if (!name) return; const cats = Store.get('healthRecordCategories', getDefaultHealthRecords()); const cat = cats.find(c => c.name === btn.dataset.category); if (cat) { cat.items.push({ name, emoji: emoji || '' }); Store.set('healthRecordCategories', cats); renderHealthRecords(el); } }); }); });
  el.querySelectorAll('.health-cat-del').forEach(btn => { btn.addEventListener('click', () => { const name = btn.dataset.name; let cats = Store.get('healthRecordCategories', getDefaultHealthRecords()); cats = cats.filter(c => c.name !== name); Store.set('healthRecordCategories', cats); renderHealthRecords(el); }); });
  document.getElementById('addHealthCatBtn').addEventListener('click', () => { showDualInputModal('添加记录分类', '分类名称', '图标 (emoji)', '📝', (name, icon) => { if (!name) return; const cats = Store.get('healthRecordCategories', getDefaultHealthRecords()); cats.push({ name, icon: icon || '📝', items: [] }); Store.set('healthRecordCategories', cats); renderHealthRecords(el); }); });
}

function renderHealthRecordHistory(records, categories) {
  if (records.length === 0) return '<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>';
  const groups = Store.groupByDate(records);
  return groups.slice(0, 15).map(([date, items]) => `<div class="date-fold"><div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')"><svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>${formatDateCN(date)}<span class="date-fold-count">${items.length} 条</span></div><div class="date-fold-body">${items.map(r => `<div class="todo-item"><div style="font-size:16px;margin-right:4px">${findItemEmoji(categories, r.category, r.item) || '✅'}</div><div class="todo-content"><div class="todo-text">${escapeHtml(r.category)} · ${escapeHtml(r.item)}</div></div></div>`).join('')}</div></div>`).join('');
}

function getDefaultHealthRecords() {
  return [
    { name: '每日打卡', icon: '📌', items: [
      { name: '喝水', emoji: '💧' }, { name: '吃早餐', emoji: '🍳' }, { name: '吃水果', emoji: '🍎' },
      { name: '运动', emoji: '🏃' }, { name: '泡脚', emoji: '🦶' }, { name: '早睡', emoji: '😴' }
    ]},
    { name: '身体状态', icon: '🌿', items: [
      { name: '大便正常', emoji: '💩' }, { name: '心情好', emoji: '😊' }, { name: '皮肤好', emoji: '✨' }
    ]},
    { name: '饮品', icon: '🧋', items: [
      { name: '奶茶', emoji: '🧋' }, { name: '咖啡', emoji: '☕' }, { name: '养生茶', emoji: '🍵' }
    ]}
  ];
}

// ========== Emoji 选择器 ==========
const EMOJI_PALETTE = ['🍎','🍌','🍊','🍉','🍇','🍓','🫐','🍑','🥝','🍅','🥕','🥦','🥬','🌽','🥔','🍞','🍚','🍜','🍝','🍣','🥚','🥛','🧃','🍵','☕','🧋','🍰','🍪','🍩','🍫','💊','💧','🔥','⚡','🌟','✨','🌈','💪','🏃','🧘','😴','😊','😢','😡','🤒','🩸','💩','🌿','🍃','🌸','🌞','🌙','❤️','💗','🥗','🍗','🐟','🥩','🌰','🍯','🧂','🫚','🍋','🥒'];
function showEmojiPicker(current, cb) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">选择 emoji</div>
    <div class="emoji-grid">
      ${EMOJI_PALETTE.map(e => `<button class="emoji-cell ${e===current?'selected':''}" data-emoji="${e}">${e}</button>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="emoClear">清除</button>
      <button class="btn btn-secondary" id="emoCancel">取消</button>
    </div>
  `;
  modal.style.display = 'flex';
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  content.querySelectorAll('.emoji-cell').forEach(b => b.addEventListener('click', () => { modal.style.display = 'none'; cb(b.dataset.emoji); }));
  document.getElementById('emoClear').addEventListener('click', () => { modal.style.display = 'none'; cb(''); });
  document.getElementById('emoCancel').addEventListener('click', () => modal.style.display = 'none');
}

function showHealthItemModal(category, name, emoji, cb) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加「${escapeHtml(category)}」项目</div>
    <div class="form-group"><label class="form-label">项目名称</label><input class="form-input" id="hiName" placeholder="如：喝了奶茶" autofocus></div>
    <div class="form-group"><label class="form-label">emoji（点击选择）</label><div class="emoji-grid" id="hiEmojiGrid">
      ${EMOJI_PALETTE.map(e => `<button class="emoji-cell ${e===emoji?'selected':''}" data-emoji="${e}">${e}</button>`).join('')}
    </div></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="hiCancel">取消</button><button class="btn btn-primary" id="hiSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  let chosen = emoji || '';
  setTimeout(() => document.getElementById('hiName').focus(), 100);
  content.querySelectorAll('.emoji-cell').forEach(b => b.addEventListener('click', () => { chosen = b.dataset.emoji; content.querySelectorAll('.emoji-cell').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); }));
  document.getElementById('hiCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('hiSave').addEventListener('click', () => { modal.style.display = 'none'; cb(document.getElementById('hiName').value.trim(), chosen); });
}

// ========== Modal / Toast Helpers ==========
function showWeightInputModal(date, existing, callback) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">${formatDateCN(date)} 体重</div>
    <div class="form-group"><label class="form-label">体重 (kg)</label><input class="form-input" type="number" step="0.1" id="modalWeightInput" value="${existing||''}" placeholder="输入体重"></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="modalWeightCancel">取消</button><button class="btn btn-primary" id="modalWeightSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  document.getElementById('modalWeightCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('modalWeightSave').addEventListener('click', () => { const v = parseFloat(document.getElementById('modalWeightInput').value); if (!v) return; const records = Store.get('weightRecords', []); const idx = records.findIndex(r => r.date === date); if (idx >= 0) records[idx].value = v; else records.push({ id: Store.uid(), value: v, date, timestamp: Date.now() }); records.sort((a,b) => a.date.localeCompare(b.date)); Store.set('weightRecords', records); modal.style.display = 'none'; callback(); });
}

function showTextInputModal(title, callback) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">${escapeHtml(title)}</div>
    <div class="form-group"><input class="form-input" id="modalTextInput" placeholder="输入内容..." autofocus></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="modalTextCancel">取消</button><button class="btn btn-primary" id="modalTextSave">确定</button></div>
  `;
  modal.style.display = 'flex';
  const input = document.getElementById('modalTextInput'); setTimeout(() => input.focus(), 100);
  document.getElementById('modalTextCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('modalTextSave').addEventListener('click', () => { modal.style.display = 'none'; callback(input.value.trim()); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('modalTextSave').click(); });
}

function showDualInputModal(title, label1, label2, default2, callback) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">${escapeHtml(title)}</div>
    <div class="form-group"><label class="form-label">${escapeHtml(label1)}</label><input class="form-input" id="modalDualInput1" autofocus></div>
    <div class="form-group"><label class="form-label">${escapeHtml(label2)}</label><input class="form-input" id="modalDualInput2" value="${default2||''}"></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="modalDualCancel">取消</button><button class="btn btn-primary" id="modalDualSave">确定</button></div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('modalDualInput1').focus(), 100);
  document.getElementById('modalDualCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('modalDualSave').addEventListener('click', () => { modal.style.display = 'none'; callback(document.getElementById('modalDualInput1').value.trim(), document.getElementById('modalDualInput2').value.trim()); });
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--text-primary);color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;z-index:9999;animation:fadeIn 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
  toast.textContent = msg; document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => toast.remove(), 3000);
}
