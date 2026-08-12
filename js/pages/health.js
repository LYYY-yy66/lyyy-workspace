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
  const meals = Store.get('meals', []);
  const waterRecords = Store.get('waterRecords', []);
  const todayMeals = meals.filter(m => m.date === selectedDate);
  const todayWater = waterRecords.filter(w => w.date === selectedDate);
  const waterGoal = Store.get('waterGoal', 2000);
  const totalWater = todayWater.reduce((s, w) => s + w.amount, 0);
  const goals = Store.get('nutritionGoals', { calories: 2000, carbs: 250, protein: 75, fat: 65 });
  let totalCal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;
  todayMeals.forEach(m => { totalCal += m.calories||0; totalCarbs += m.carbs||0; totalProtein += m.protein||0; totalFat += m.fat||0; });
  const remainCal = Math.max(0, goals.calories - totalCal);
  const dateItems = [];
  for (let i = -3; i <= 3; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateItems.push(d); }

  el.innerHTML = `
    <div class="date-picker-h" id="dietDatePicker">
      ${dateItems.map(d => { const ds = formatDate(d); const isToday = ds === Store.today(); return `<div class="date-picker-item ${isToday?'today':''} ${ds===selectedDate?'selected':''}" data-date="${ds}"><div class="dp-weekday">${['日','一','二','三','四','五','六'][d.getDay()]}</div><div class="dp-day">${d.getDate()}</div></div>`; }).join('')}
    </div>
    <div class="card">
      <div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>营养总览</div>
      <div class="nutrition-overview">
        <div class="nutrition-ring"><canvas id="calorieRing" width="100" height="100"></canvas></div>
        <div class="nutrition-bars">
          <div class="nutrition-bar-item"><div class="nutrition-bar-label"><span>碳水化合物</span><span>${totalCarbs}/${goals.carbs}g</span></div><div class="nutrition-bar"><div class="nutrition-bar-fill bar-carbs" style="width:${Math.min(100,totalCarbs/goals.carbs*100)}%"></div></div></div>
          <div class="nutrition-bar-item"><div class="nutrition-bar-label"><span>蛋白质</span><span>${totalProtein}/${goals.protein}g</span></div><div class="nutrition-bar"><div class="nutrition-bar-fill bar-protein" style="width:${Math.min(100,totalProtein/goals.protein*100)}%"></div></div></div>
          <div class="nutrition-bar-item"><div class="nutrition-bar-label"><span>脂肪</span><span>${totalFat}/${goals.fat}g</span></div><div class="nutrition-bar"><div class="nutrition-bar-fill bar-fat" style="width:${Math.min(100,totalFat/goals.fat*100)}%"></div></div></div>
        </div>
      </div>
      <div class="quick-actions">
        ${[{n:'早餐',i:'🌅'},{n:'午餐',i:'☀️'},{n:'晚餐',i:'🌙'},{n:'加餐',i:'🍎'},{n:'运动',i:'🏃'}].map(x => `<button class="quick-action-btn" data-meal="${x.n}"><div class="quick-action-icon">${x.i}</div><span>+ ${x.n}</span></button>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>喝水记录</div></div>
      <div class="water-tracker"><div class="water-progress"><div class="water-progress-fill" style="width:${Math.min(100,totalWater/waterGoal*100)}%"></div></div><div class="water-amount">${totalWater}/${waterGoal}ml</div><button class="water-add-btn" id="addWaterBtn">+</button></div>
    </div>
    <div class="card">
      <div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>今日记录</div>
      ${todayMeals.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div class="empty-state-text">暂无饮食记录</div></div>' : ''}
      ${todayMeals.map(m => `<div class="meal-card">
        <div class="meal-icon" style="background:${m.type==='早餐'?'#fef3cd':m.type==='午餐'?'#d4edda':m.type==='晚餐'?'#cce5ff':m.type==='加餐'?'#f8d7da':'#e2d9f3'}">${m.type==='早餐'?'🌅':m.type==='午餐'?'☀️':m.type==='晚餐'?'🌙':m.type==='加餐'?'🍎':'🏃'}</div>
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
  `;
  drawCalorieRing(totalCal, goals.calories, remainCal);
  el.querySelectorAll('.date-picker-item').forEach(d => { d.addEventListener('click', () => { selectedDate = d.dataset.date; HealthPage.render(el.closest('.page-container')); }); });
  el.querySelectorAll('.quick-action-btn').forEach(btn => { btn.addEventListener('click', () => showAddMealModal(btn.dataset.meal)); });
  document.getElementById('addWaterBtn').addEventListener('click', () => { const w = Store.get('waterRecords', []); w.push({ id: Store.uid(), amount: 250, date: Store.today(), timestamp: Date.now() }); Store.set('waterRecords', w); HealthPage.render(el.closest('.page-container')); });
  el.querySelectorAll('.meal-delete').forEach(btn => { btn.addEventListener('click', () => { let m = Store.get('meals', []); m = m.filter(x => x.id !== btn.dataset.id); Store.set('meals', m); HealthPage.render(el.closest('.page-container')); }); });
  document.getElementById('saveGoalsBtn').addEventListener('click', () => { Store.set('nutritionGoals', { calories: parseInt(document.getElementById('goalCal').value)||2000, carbs: parseInt(document.getElementById('goalCarbs').value)||250, protein: parseInt(document.getElementById('goalProtein').value)||75, fat: parseInt(document.getElementById('goalFat').value)||65 }); });
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

function showAddMealModal(mealType) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加${mealType}</div>
    <div class="form-group"><label class="form-label">食物名称</label><input class="form-input" id="mealName" placeholder="如：鸡胸肉、米饭、鸡蛋"></div>
    <div class="form-group"><label class="form-label">克重 (g)</label><input class="form-input" type="number" id="mealGrams" placeholder="如：200" value="100"></div>
    <div id="autoResult" style="padding:12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:12px;display:none"><div style="font-size:13px;font-weight:600;margin-bottom:6px">🤖 智能估算结果</div><div id="autoNutrition" style="font-size:13px;color:var(--text-secondary)"></div></div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;text-align:center">输入食物名称后点击"计算"自动估算营养</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">热量(kcal)</label><input class="form-input" type="number" id="mealCal" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">碳水(g)</label><input class="form-input" type="number" id="mealCarbs" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">蛋白质(g)</label><input class="form-input" type="number" id="mealProtein" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">脂肪(g)</label><input class="form-input" type="number" id="mealFat" placeholder="自动或手动"></div>
    </div>
    <div class="modal-actions"><button class="btn btn-secondary" id="calcMealBtn" style="flex:0.7">计算</button><button class="btn btn-secondary" id="cancelMealBtn">取消</button><button class="btn btn-primary" id="saveMealBtn">保存</button></div>
  `;
  modal.style.display = 'flex';
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
    meals.push({ id: Store.uid(), name, type: mealType, grams: parseInt(document.getElementById('mealGrams').value) || 0, calories: parseInt(document.getElementById('mealCal').value) || 0, carbs: parseFloat(document.getElementById('mealCarbs').value) || 0, protein: parseFloat(document.getElementById('mealProtein').value) || 0, fat: parseFloat(document.getElementById('mealFat').value) || 0, date: selectedDate, timestamp: Date.now() });
    Store.set('meals', meals); modal.style.display = 'none'; HealthPage.render(document.getElementById('pageContainer'));
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

// ========== 模块3b: 视频跟练（教程库 + 内置计时器 + 打卡解锁奖励 + 全平台视频） ==========
function renderVideoFollow(el, container) {
  const videos = Store.get('exerciseVideos', []);
  const today = Store.today();
  const allDone = videos.flatMap(v => v.doneDates || []);
  const totalDone = allDone.length;
  const uniqueDays = new Set(allDone).size;
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthUniqueDays = new Set(allDone.filter(d => d.startsWith(monthStr))).size;
  const doneCats = new Set(videos.filter(v => (v.doneDates||[]).length > 0).map(v => v.category));
  const catCount = new Set(videos.map(v => v.category)).size;

  const rewards = [
    { emoji: '🌟', name: '初次跟练', desc: '完成第一次跟练', unlocked: totalDone >= 1 },
    { emoji: '🔥', name: '七日之约', desc: '累计跟练满 7 天', unlocked: uniqueDays >= 7 },
    { emoji: '💎', name: '自律达人', desc: '累计完成 30 次', unlocked: totalDone >= 30 },
    { emoji: '🏆', name: '全能选手', desc: '每个分类都跟练过', unlocked: catCount > 0 && doneCats.size >= catCount },
    { emoji: '🎯', name: '月度全勤', desc: '本月打卡 ≥ 20 天', unlocked: monthUniqueDays >= 20 },
    { emoji: '🌈', name: '百日筑基', desc: '累计跟练满 100 次', unlocked: totalDone >= 100 }
  ];

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">🎬 视频跟练教程库</div>
        <button class="btn btn-primary btn-sm" id="addTutorialBtn">+ 添加教程</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">收纳你的运动教程，支持 B站/YouTube/腾讯/优酷等全平台视频链接。点「跟练」内置计时器，完成后打卡解锁奖励。</div>
      ${videos.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🏋️</div><div class="empty-state-text">还没有教程，点击右上角添加</div></div>' : ''}
      <div style="display:flex;flex-direction:column;gap:14px">
        ${videos.map(v => {
          const doneToday = (v.doneDates || []).includes(today);
          return `<div class="follow-item" data-id="${v.id}">
            <div class="flex-between mb-8">
              <div style="font-size:14px;font-weight:600">${escapeHtml(v.title)} <span style="font-size:11px;color:var(--text-muted);font-weight:400">· ${escapeHtml(v.category)}</span></div>
              <button class="action-btn follow-del" data-id="${v.id}" style="opacity:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
            ${v.duration ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">⏱ 建议时长 ${v.duration} 分钟</div>` : ''}
            ${renderVideoPlayer(v.url, v.title)}
            ${v.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">${escapeHtml(v.note)}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn btn-primary btn-sm follow-start" data-id="${v.id}" style="flex:1">▶ 跟练计时</button>
              <button class="btn ${doneToday?'btn-success':'btn-secondary'} btn-sm follow-done" data-id="${v.id}" style="flex:1" ${doneToday?'disabled':''}>${doneToday?'✓ 今日已打卡':'完成打卡'}</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">🏅 奖励解锁</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${rewards.map(r => `<div class="reward-badge ${r.unlocked?'unlocked':''}"><div class="reward-emoji">${r.unlocked ? r.emoji : '🔒'}</div><div class="reward-name">${r.name}</div><div class="reward-desc">${r.desc}</div></div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:10px">累计完成 ${totalDone} 次 · 累计 ${uniqueDays} 天 · 本月 ${monthUniqueDays} 天</div>
    </div>
  `;

  document.getElementById('addTutorialBtn').addEventListener('click', () => showTutorialModal(container));
  el.querySelectorAll('.follow-del').forEach(btn => { btn.addEventListener('click', () => { let arr = Store.get('exerciseVideos', []); arr = arr.filter(x => x.id !== btn.dataset.id); Store.set('exerciseVideos', arr); renderVideoFollow(el, container); }); });
  el.querySelectorAll('.follow-start').forEach(btn => { btn.addEventListener('click', () => { const v = Store.get('exerciseVideos', []).find(x => x.id === btn.dataset.id); if (v) openFollowTimer(v, container); }); });
  el.querySelectorAll('.follow-done').forEach(btn => { btn.addEventListener('click', () => { markTutorialDone(btn.dataset.id, container); }); });
  bindVideoPlayers(el);
}

function markTutorialDone(id, container) {
  const videos = Store.get('exerciseVideos', []);
  const v = videos.find(x => x.id === id); if (!v) return;
  v.doneDates = v.doneDates || [];
  if (v.doneDates.includes(Store.today())) return;
  v.doneDates.push(Store.today());
  Store.set('exerciseVideos', videos);
  showToast('打卡成功！继续加油 💪');
  renderVideoFollow(document.getElementById('exerciseContent'), container);
}

function openFollowTimer(tutorial, container) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  const secs = (tutorial.duration && tutorial.duration > 0 ? tutorial.duration : 15) * 60;
  content.innerHTML = `
    <div class="modal-title">▶ 跟练计时 · ${escapeHtml(tutorial.title)}</div>
    <div class="timer-display"><div class="timer-circle" id="followCircle">
      <span class="timer-time" id="followTime">${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}</span>
      <span class="timer-label" id="followLabel">跟练中</span>
    </div></div>
    <div class="timer-controls">
      <button class="btn btn-secondary" id="followStop">终止</button>
      <button class="btn btn-primary btn-lg" id="followToggle">开始</button>
    </div>
  `;
  modal.style.display = 'flex';
  let remaining = secs, running = false, interval = null;
  const circle = document.getElementById('followCircle');
  const timeEl = document.getElementById('followTime');
  const toggleBtn = document.getElementById('followToggle');
  const label = document.getElementById('followLabel');
  function update() { const m = Math.floor(remaining/60), s = remaining%60; timeEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function finish() { clearInterval(interval); running = false; label.textContent = '完成！'; toggleBtn.textContent = '开始'; circle.classList.add('rest'); showToast('跟练完成，已打卡 🎉'); markTutorialDone(tutorial.id, container); modal.style.display = 'none'; }
  toggleBtn.addEventListener('click', () => {
    if (running) { clearInterval(interval); running = false; toggleBtn.textContent = '继续'; label.textContent = '已暂停'; }
    else { running = true; toggleBtn.textContent = '暂停'; label.textContent = '跟练中'; interval = setInterval(() => { remaining--; update(); if (remaining <= 0) finish(); }, 1000); }
  });
  document.getElementById('followStop').addEventListener('click', () => { clearInterval(interval); modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) { clearInterval(interval); modal.style.display = 'none'; } });
}

function showTutorialModal(container) {
  const modal = document.getElementById('genericModal'); const content = document.getElementById('genericModalContent');
  const categories = Store.get('exerciseVideos', []).reduce((s, v) => { if (!s.includes(v.category)) s.push(v.category); return s; }, ['有氧','力量','拉伸']);
  content.innerHTML = `
    <div class="modal-title">添加跟练教程</div>
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
    videos.unshift({ id: Store.uid(), title, category: document.getElementById('tutCat').value.trim() || '有氧', url, duration: parseInt(document.getElementById('tutDur').value) || 0, note: document.getElementById('tutNote').value.trim(), doneDates: [], timestamp: Date.now() });
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
const QI_QUESTIONS = [
  { id: 'cold', q: '是否经常手脚冰凉 / 怕冷？', opts: ['否', '偶尔', '经常'] },
  { id: 'tired', q: '是否容易疲劳、乏力、没精神？', opts: ['否', '偶尔', '经常'] },
  { id: 'sleep', q: '睡眠质量如何？', opts: ['好', '一般', '失眠/差'] },
  { id: 'period', q: '（女性）是否月经量少 / 痛经？', opts: ['否/不适用', '偶尔', '经常'] },
  { id: 'face', q: '面色是否萎黄、唇色偏淡？', opts: ['否', '偶尔', '经常'] },
  { id: 'hair', q: '是否脱发、掉发明显？', opts: ['否', '偶尔', '经常'] },
  { id: 'mood', q: '是否容易生气、焦虑、郁结？', opts: ['否', '偶尔', '经常'] },
  { id: 'appetite', q: '是否食欲不振、消化不良？', opts: ['否', '偶尔', '经常'] }
];

function renderQi(el, container) {
  const logs = Store.get('qiLogs', []);
  const todayLog = logs.find(l => l.date === Store.today());
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🌿 气血状态测评</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">回答以下问题，从中医角度评估你的气血状态并给出调养建议（仅供参考，不替代医疗诊断）。</div>
      <div id="qiQuestions">
        ${QI_QUESTIONS.map(qu => `<div class="qi-question"><div class="qi-q-text">${escapeHtml(qu.q)}</div><div class="qi-opts">${qu.opts.map((o, i) => `<button class="qi-opt" data-qid="${qu.id}" data-val="${i}">${o}</button>`).join('')}</div></div>`).join('')}
      </div>
      <button class="btn btn-primary btn-lg" id="qiAssessBtn" style="width:100%;margin-top:8px">测评我的状态</button>
    </div>
    <div id="qiResult"></div>
    <div class="card">
      <div class="card-title">📝 今日记录（睡眠 / 食饮）</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">纯静态页面无法直接读取手机健康APP数据，可在此手动记录；如需自动同步，需配合浏览器扩展或后端服务。</div>
      <div class="form-group"><label class="form-label">睡眠状态</label><select class="form-input" id="qiSleep"><option ${todayLog?.sleep==='好'?'selected':''}>好</option><option ${todayLog?.sleep==='一般'?'selected':''}>一般</option><option ${todayLog?.sleep==='差'?'selected':''}>差</option><option ${todayLog?.sleep==='失眠'?'selected':''}>失眠</option></select></div>
      <div class="form-group"><label class="form-label">今日饮茶 / 食饮</label><input class="form-input" id="qiDiet" value="${todayLog?.diet||''}" placeholder="如：喝了红枣枸杞茶、吃了牛羊肉"></div>
      <div class="form-group"><label class="form-label">今日是否泡脚</label><select class="form-input" id="qiFoot"><option value="否" ${todayLog?.foot==='否'||!todayLog?'selected':''}>否</option><option value="是" ${todayLog?.foot==='是'?'selected':''}>是</option></select></div>
      <button class="btn btn-success btn-sm" id="qiSaveLog" style="width:100%">保存今日记录</button>
    </div>
    <div class="card">
      <div class="card-title">📅 近期记录</div>
      ${logs.length === 0 ? '<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>' : logs.slice(0, 10).map(l => `<div class="date-fold"><div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')"><svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>${formatDateCN(l.date)}<span class="date-fold-count">${l.foot==='是'?'泡脚✓':''}</span></div><div class="date-fold-body"><div style="font-size:13px;color:var(--text-secondary);padding:8px 0">😴 睡眠：${l.sleep||'-'}<br>🍵 食饮：${escapeHtml(l.diet||'-')}</div></div></div>`).join('')}
    </div>
  `;
  const answers = {};
  el.querySelectorAll('.qi-opt').forEach(btn => btn.addEventListener('click', () => {
    const qid = btn.dataset.qid; answers[qid] = parseInt(btn.dataset.val);
    el.querySelectorAll(`.qi-opt[data-qid="${qid}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }));
  document.getElementById('qiAssessBtn').addEventListener('click', () => {
    if (Object.keys(answers).length < QI_QUESTIONS.length) { showToast('请答完所有问题'); return; }
    renderQiResult(document.getElementById('qiResult'), answers);
  });
  document.getElementById('qiSaveLog').addEventListener('click', () => {
    const all = Store.get('qiLogs', []);
    const idx = all.findIndex(l => l.date === Store.today());
    const entry = { date: Store.today(), sleep: document.getElementById('qiSleep').value, diet: document.getElementById('qiDiet').value.trim(), foot: document.getElementById('qiFoot').value, timestamp: Date.now() };
    if (idx >= 0) all[idx] = entry; else all.unshift(entry);
    Store.set('qiLogs', all); showToast('已保存今日记录 ✅'); renderQi(el, container);
  });
}

function renderQiResult(area, a) {
  const cold = a.cold, tired = a.tired, sleep = a.sleep, period = a.period, face = a.face, hair = a.hair, mood = a.mood, appetite = a.appetite;
  const qiXu = tired >= 1 || face >= 1 || hair >= 1;     // 气虚/血虚
  const han = cold >= 1;                                  // 阳虚怕冷
  const yu = mood >= 1;                                   // 肝郁
  let title = '状态良好', advice = '继续保持规律作息与均衡饮食。';
  if (qiXu && han) { title = '气血两虚·偏寒'; advice = '以温补气血为主，忌生冷。'; }
  else if (qiXu) { title = '气血不足'; advice = '重在补气血、健脾养胃。'; }
  else if (han) { title = '阳虚怕冷'; advice = '温阳驱寒，多注意保暖与泡脚。'; }
  else if (yu) { title = '肝郁气滞'; advice = '疏肝理气，调畅情志。'; }

  const teas = [];
  if (qiXu || han) teas.push('红枣枸杞茶', '桂圆红枣茶', '黄芪当归茶');
  if (yu) teas.push('玫瑰花茶', '陈皮茶');
  if (sleep === 2) teas.push('酸枣仁百合茶');
  if (!teas.length) teas.push('枸杞菊花茶');

  const exercises = han ? ['八段锦·双手托天理三焦', '踮脚提踵促循环', '睡前温水泡脚后搓脚心'] : ['八段锦', '拍八虚（肘窝/腘窝）', '舒展拉伸'];

  const acupoints = [];
  if (qiXu || han) acupoints.push('足三里（健脾）', '三阴交（调血）', '关元穴（培元）');
  if (yu) acupoints.push('太冲穴（疏肝）', '期门穴');
  if (hair >= 1 || face >= 1) acupoints.push('血海穴（养血）');
  if (!acupoints.length) acupoints.push('足三里', '三阴交');

  const foot = han ? '生姜花椒水泡脚（水温约40-42℃，15-20分钟，微微出汗即可）' : '温水泡脚 15-20 分钟，引血下行助眠';

  area.innerHTML = `
    <div class="card qi-result-card">
      <div class="card-title">🩺 测评结果：${title}</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">${advice}</div>
      <div class="qi-rec-block"><div class="qi-rec-head">🍵 推荐茶饮</div>${teas.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
      <div class="qi-rec-block"><div class="qi-rec-head">🤸 推荐健身操</div>${exercises.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
      <div class="qi-rec-block"><div class="qi-rec-head">💆 穴位按摩</div>${acupoints.map(t => `<div class="qi-rec-item">${t}</div>`).join('')}</div>
      <div class="qi-rec-block"><div class="qi-rec-head">🦶 泡脚建议</div><div class="qi-rec-item">${foot}</div></div>
    </div>
  `;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========== 模块7: 各种记录（自定义打卡 + 日期下显示项目emoji） ==========
function renderHealthRecords(el) {
  const categories = Store.get('healthRecordCategories', getDefaultHealthRecords());
  const records = Store.get('healthRecords', []);
  const emojis = Store.get('healthItemEmojis', {});
  const today = Store.today();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const dateItems = [];
  for (let i = -3; i <= 3; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateItems.push(d); }
  const dayRecords = records.filter(r => r.date === selectedDate);
  const monthRecords = records.filter(r => r.date.startsWith(monthStr));
  const monthDayEmojis = {};
  monthRecords.forEach(r => { const key = r.category + '|' + r.item; (monthDayEmojis[r.date] = monthDayEmojis[r.date] || new Set()); const e = emojis[key]; if (e) monthDayEmojis[r.date].add(e); });

  el.innerHTML = `
    <div class="date-picker-h" id="recordDatePicker">
      ${dateItems.map(d => { const ds = formatDate(d); const isToday = ds === today; return `<div class="date-picker-item ${isToday?'today':''} ${ds===selectedDate?'selected':''}" data-date="${ds}"><div class="dp-weekday">${['日','一','二','三','四','五','六'][d.getDay()]}</div><div class="dp-day">${d.getDate()}</div></div>`; }).join('')}
    </div>
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0">📝 ${formatDateCN(selectedDate)} 记录</div><span style="font-size:12px;color:var(--text-muted)">${dayRecords.length} 条</span></div>
      ${categories.map(cat => {
        const catRecords = dayRecords.filter(r => r.category === cat.name);
        return `<div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"><span>${cat.icon}</span> ${escapeHtml(cat.name)}</div>
            <button class="action-btn health-cat-del" data-name="${escapeHtml(cat.name)}" style="opacity:1;color:var(--text-muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${cat.items.map(item => {
              const done = catRecords.some(r => r.item === item);
              const e = emojis[cat.name + '|' + item] || '';
              return `<div class="record-row" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}">
                <button class="record-emoji-btn" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}" title="点击设置emoji">${e || '➕'}</button>
                <button class="record-chip ${done?'active':''}">${escapeHtml(item)} ${done ? '✓' : ''}</button>
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
    <div class="card"><div class="card-title">📋 历史记录</div>${renderHealthRecordHistory(records)}</div>
  `;
  el.querySelectorAll('.date-picker-item').forEach(d => { d.addEventListener('click', () => { selectedDate = d.dataset.date; renderHealthRecords(el); }); });
  el.querySelectorAll('.record-chip').forEach(chip => { chip.addEventListener('click', () => { const row = chip.closest('.record-row'); const cat = row.dataset.category; const item = row.dataset.item; const allRecords = Store.get('healthRecords', []); const idx = allRecords.findIndex(r => r.date === selectedDate && r.category === cat && r.item === item); if (idx >= 0) allRecords.splice(idx, 1); else allRecords.push({ id: Store.uid(), date: selectedDate, category: cat, item, timestamp: Date.now() }); Store.set('healthRecords', allRecords); renderHealthRecords(el); }); });
  el.querySelectorAll('.record-emoji-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const cat = btn.dataset.category, item = btn.dataset.item; const emojis = Store.get('healthItemEmojis', {}); showEmojiPicker(emojis[cat + '|' + item] || '', (emo) => { emojis[cat + '|' + item] = emo; Store.set('healthItemEmojis', emojis); renderHealthRecords(el); }); }); });
  el.querySelectorAll('.health-add-item').forEach(btn => { btn.addEventListener('click', () => { showHealthItemModal(btn.dataset.category, '', '', (name, emoji) => { if (!name) return; const cats = Store.get('healthRecordCategories', getDefaultHealthRecords()); const cat = cats.find(c => c.name === btn.dataset.category); if (cat) { cat.items.push(name); if (emoji) { const emojis = Store.get('healthItemEmojis', {}); emojis[cat.name + '|' + name] = emoji; Store.set('healthItemEmojis', emojis); } Store.set('healthRecordCategories', cats); renderHealthRecords(el); } }); }); });
  el.querySelectorAll('.health-cat-del').forEach(btn => { btn.addEventListener('click', () => { const name = btn.dataset.name; let cats = Store.get('healthRecordCategories', getDefaultHealthRecords()); cats = cats.filter(c => c.name !== name); Store.set('healthRecordCategories', cats); renderHealthRecords(el); }); });
  document.getElementById('addHealthCatBtn').addEventListener('click', () => { showDualInputModal('添加记录分类', '分类名称', '图标 (emoji)', '📝', (name, icon) => { if (!name) return; const cats = Store.get('healthRecordCategories', getDefaultHealthRecords()); cats.push({ name, icon: icon || '📝', items: [] }); Store.set('healthRecordCategories', cats); renderHealthRecords(el); }); });
}

function renderHealthRecordHistory(records) {
  if (records.length === 0) return '<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>';
  const emojis = Store.get('healthItemEmojis', {});
  const groups = Store.groupByDate(records);
  return groups.slice(0, 15).map(([date, items]) => `<div class="date-fold"><div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')"><svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>${formatDateCN(date)}<span class="date-fold-count">${items.length} 条</span></div><div class="date-fold-body">${items.map(r => `<div class="todo-item"><div style="font-size:16px;margin-right:4px">${emojis[r.category+'|'+r.item]||''}</div><div class="todo-content"><div class="todo-text">${escapeHtml(r.category)} · ${escapeHtml(r.item)}</div></div></div>`).join('')}</div></div>`).join('');
}

function getDefaultHealthRecords() {
  return [
    { name: '大便', icon: '💩', items: ['正常', '便秘', '腹泻', '未记录'] },
    { name: '月经', icon: '🩸', items: ['经期第1天', '经期第2天', '经期第3天', '经期第4天', '经期第5天', '经前症状'] },
    { name: '奶茶/饮品', icon: '🧋', items: ['喝了奶茶', '喝了咖啡', '喝了饮料', '今天没喝'] },
    { name: '睡眠', icon: '😴', items: ['睡够8小时', '熬夜了', '失眠', '午睡'] },
    { name: '心情', icon: '😊', items: ['开心', '一般', '低落', '焦虑', '生气'] }
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
