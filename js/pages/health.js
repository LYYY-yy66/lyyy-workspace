/**
 * health.js — 健康管理页面（体重 + 饮食 + 运动）
 */
import { Store, formatDate, formatDateCN, getMonthDays, escapeHtml } from '../store.js';

let currentTab = 'weight';
let selectedDate = Store.today();
let weightView = 'month'; // month | week
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
    else renderHealthRecords(content);
  }
};

// ========== 模块1: 体重记录（全新设计） ==========
function renderWeight(el) {
  const records = Store.get('weightRecords', []);
  const now = new Date();
  const year = weightYear, month = weightMonth;
  const monthDays = getMonthDays(year, month);
  const recordMap = {};
  records.forEach(r => { recordMap[r.date] = r.value; });

  // Stats
  const recent = records.slice(-10);
  const recordDays = recent.length;
  let totalChange = 0;
  if (recent.length >= 2) totalChange = recent[recent.length-1].value - recent[0].value;
  const avgDailyChange = recordDays >= 2 ? (totalChange / (recordDays - 1)) : 0;

  // Last month comparison
  const lastMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
  const lastMonthRecs = records.filter(r => r.date.startsWith(lastMonthStr));
  const lastMonthChange = lastMonthRecs.length >= 2 ? lastMonthRecs[lastMonthRecs.length-1].value - lastMonthRecs[0].value : 0;

  // Up/down count
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
        <button class="month-nav-btn" id="wPrevMonth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-title">${year}年${month+1}月</div>
        <button class="month-nav-btn" id="wNextMonth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="month-calendar" style="font-size:12px">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${monthDays.map(d => {
          const ds = formatDate(d.date);
          const val = recordMap[ds];
          const isToday = ds === Store.today();
          // Find previous record for arrow
          let arrow = '';
          if (val) {
            const prevRecs = records.filter(r => r.date < ds);
            if (prevRecs.length > 0) {
              const prevVal = prevRecs[prevRecs.length-1].value;
              if (val > prevVal) arrow = '<span style="color:#d98a8a;font-size:10px">↑</span>';
              else if (val < prevVal) arrow = '<span style="color:#7bc4a8;font-size:10px">↓</span>';
            }
          }
          return `<div class="month-day ${d.otherMonth?'other-month':''} ${isToday?'today':''}" data-date="${ds}" style="cursor:${d.otherMonth?'default':'pointer'};font-size:12px">
            <span>${d.date.getDate()}</span>
            <div style="font-size:10px;color:${val?'var(--primary)':'var(--text-muted)'};margin-top:2px;min-height:14px">
              ${val ? val + 'kg' + arrow : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:12px">
        <div class="weight-input-row">
          <div class="form-group"><input class="form-input" type="number" step="0.1" id="weightInput" placeholder="今日体重 (kg)"></div>
          <button class="btn btn-primary" id="saveWeightBtn">记录</button>
        </div>
      </div>
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
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:${totalChange>=0?'#d98a8a':'#7bc4a8'}">${totalChange>=0?'+':''}${totalChange.toFixed(1)}</div>
          <div class="finance-stat-label">体重变化(kg)</div>
        </div>
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:${avgDailyChange>=0?'#d98a8a':'#7bc4a8'}">${avgDailyChange>=0?'+':''}${avgDailyChange.toFixed(2)}</div>
          <div class="finance-stat-label">日均变化</div>
        </div>
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:${lastMonthChange>=0?'#d98a8a':'#7bc4a8'}">${lastMonthChange>=0?'+':''}${lastMonthChange.toFixed(1)}</div>
          <div class="finance-stat-label">上月变化</div>
        </div>
      </div>
      <div class="chart-container"><canvas id="weightChart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">体重变化</div>
      <div style="display:flex;gap:20px;justify-content:center;padding:10px 0">
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:#7bc4a8">↓${downDays}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">下降天数</div>
        </div>
        <div style="width:1px;background:var(--border)"></div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:#d98a8a">↑${upDays}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">上升天数</div>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px">
        绿色↓代表体重下降，红色↑代表体重上升
      </div>
    </div>
  `;

  // Month nav
  document.getElementById('wPrevMonth').addEventListener('click', () => {
    weightMonth--; if (weightMonth < 0) { weightMonth = 11; weightYear--; }
    renderWeight(el);
  });
  document.getElementById('wNextMonth').addEventListener('click', () => {
    weightMonth++; if (weightMonth > 11) { weightMonth = 0; weightYear++; }
    renderWeight(el);
  });

  // View switch
  el.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => { weightView = btn.dataset.view; renderWeight(el); });
  });

  // Click day to record
  el.querySelectorAll('.month-day:not(.other-month)').forEach(d => {
    d.addEventListener('click', () => {
      const date = d.dataset.date;
      const existing = recordMap[date];
      showWeightInputModal(date, existing, () => renderWeight(el));
    });
  });

  // Save today weight
  document.getElementById('saveWeightBtn').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('weightInput').value);
    if (!val) return;
    const records = Store.get('weightRecords', []);
    const idx = records.findIndex(r => r.date === Store.today());
    if (idx >= 0) records[idx].value = val;
    else records.push({ id: Store.uid(), value: val, date: Store.today(), timestamp: Date.now() });
    records.sort((a,b) => a.date.localeCompare(b.date));
    Store.set('weightRecords', records);
    renderWeight(el);
  });

  // Chart
  const chartRecords = weightView === 'week' ? records.slice(-7) : records.slice(-30);
  const ctx = document.getElementById('weightChart');
  if (ctx && typeof Chart !== 'undefined' && chartRecords.length > 1) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartRecords.map(r => { const d = new Date(r.date); return `${d.getMonth()+1}/${d.getDate()}`; }),
        datasets: [{
          label: '体重 (kg)', data: chartRecords.map(r => r.value),
          borderColor: '#7c9cbf', backgroundColor: 'rgba(124,156,191,0.1)',
          fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#7c9cbf'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#e8ecf1' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } }
        }
      }
    });
  }
}

// ========== 模块2: 饮食管理（智能热量计算） ==========
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
      ${dateItems.map(d => {
        const ds = formatDate(d); const isToday = ds === Store.today();
        return `<div class="date-picker-item ${isToday?'today':''} ${ds===selectedDate?'selected':''}" data-date="${ds}">
          <div class="dp-weekday">${['日','一','二','三','四','五','六'][d.getDay()]}</div>
          <div class="dp-day">${d.getDate()}</div>
        </div>`;
      }).join('')}
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
        ${[{n:'早餐',i:'🌅'},{n:'午餐',i:'☀️'},{n:'晚餐',i:'🌙'},{n:'加餐',i:'🍎'},{n:'运动',i:'🏃'}].map(x => `
          <button class="quick-action-btn" data-meal="${x.n}"><div class="quick-action-icon">${x.i}</div><span>+ ${x.n}</span></button>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>喝水记录</div></div>
      <div class="water-tracker">
        <div class="water-progress"><div class="water-progress-fill" style="width:${Math.min(100,totalWater/waterGoal*100)}%"></div></div>
        <div class="water-amount">${totalWater}/${waterGoal}ml</div>
        <button class="water-add-btn" id="addWaterBtn">+</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>今日记录</div>
      ${todayMeals.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div class="empty-state-text">暂无饮食记录</div></div>' : ''}
      ${todayMeals.map(m => `<div class="meal-card">
        <div class="meal-icon" style="background:${m.type==='早餐'?'#fef3cd':m.type==='午餐'?'#d4edda':m.type==='晚餐'?'#cce5ff':m.type==='加餐'?'#f8d7da':'#e2d9f3'}">
          ${m.type==='早餐'?'🌅':m.type==='午餐'?'☀️':m.type==='晚餐'?'🌙':m.type==='加餐'?'🍎':'🏃'}
        </div>
        <div class="meal-info">
          <div class="meal-name">${escapeHtml(m.name)}${m.grams ? ' · '+m.grams+'g' : ''}</div>
          <div class="meal-time">${m.type} · ${new Date(m.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</div>
          <div class="meal-kcal">${m.calories} kcal</div>
          <div class="meal-macros"><span>碳水 ${m.carbs||0}g</span><span>蛋白质 ${m.protein||0}g</span><span>脂肪 ${m.fat||0}g</span></div>
        </div>
        <button class="action-btn meal-delete" data-id="${m.id}" style="opacity:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
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
  document.getElementById('addWaterBtn').addEventListener('click', () => {
    const w = Store.get('waterRecords', []); w.push({ id: Store.uid(), amount: 250, date: Store.today(), timestamp: Date.now() }); Store.set('waterRecords', w);
    HealthPage.render(el.closest('.page-container'));
  });
  el.querySelectorAll('.meal-delete').forEach(btn => { btn.addEventListener('click', () => {
    let m = Store.get('meals', []); m = m.filter(x => x.id !== btn.dataset.id); Store.set('meals', m); HealthPage.render(el.closest('.page-container'));
  }); });
  document.getElementById('saveGoalsBtn').addEventListener('click', () => {
    Store.set('nutritionGoals', { calories: parseInt(document.getElementById('goalCal').value)||2000, carbs: parseInt(document.getElementById('goalCarbs').value)||250, protein: parseInt(document.getElementById('goalProtein').value)||75, fat: parseInt(document.getElementById('goalFat').value)||65 });
  });
}

function drawCalorieRing(consumed, goal, remain) {
  const canvas = document.getElementById('calorieRing');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 100, center = size / 2, radius = 38, lineWidth = 8;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.strokeStyle = '#e8ecf1'; ctx.lineWidth = lineWidth; ctx.stroke();
  const progress = Math.min(1, consumed / goal);
  ctx.beginPath(); ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.strokeStyle = '#7c9cbf'; ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = '#2c3e50'; ctx.font = 'bold 18px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(remain, center, center + 2);
  ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = '#7f8c9b'; ctx.fillText('剩余kcal', center, center + 16);
}

// 内置常见食物营养数据库（每100g）
const FOOD_DB = {
  '米饭': { cal: 116, carbs: 25.6, protein: 2.6, fat: 0.3 },
  '白米饭': { cal: 116, carbs: 25.6, protein: 2.6, fat: 0.3 },
  '面条': { cal: 110, carbs: 22, protein: 3.5, fat: 0.3 },
  '馒头': { cal: 221, carbs: 44.2, protein: 7, fat: 1.1 },
  '鸡蛋': { cal: 144, carbs: 1.1, protein: 13.3, fat: 9.5 },
  '鸡胸肉': { cal: 133, carbs: 0, protein: 31, fat: 1.2 },
  '牛肉': { cal: 190, carbs: 0, protein: 26, fat: 9 },
  '猪肉': { cal: 143, carbs: 0, protein: 21, fat: 6 },
  '鱼肉': { cal: 104, carbs: 0, protein: 22, fat: 1.5 },
  '虾': { cal: 85, carbs: 0, protein: 18, fat: 1.2 },
  '豆腐': { cal: 73, carbs: 2.8, protein: 8, fat: 3.5 },
  '牛奶': { cal: 42, carbs: 5, protein: 3.4, fat: 1 },
  '酸奶': { cal: 72, carbs: 9, protein: 3.5, fat: 2.7 },
  '苹果': { cal: 52, carbs: 14, protein: 0.3, fat: 0.2 },
  '香蕉': { cal: 89, carbs: 23, protein: 1.1, fat: 0.3 },
  '西兰花': { cal: 34, carbs: 7, protein: 2.8, fat: 0.4 },
  '番茄': { cal: 18, carbs: 3.9, protein: 0.9, fat: 0.2 },
  '黄瓜': { cal: 15, carbs: 3.6, protein: 0.7, fat: 0.1 },
  '生菜': { cal: 15, carbs: 2.9, protein: 1.4, fat: 0.2 },
  '红薯': { cal: 86, carbs: 20, protein: 1.6, fat: 0.1 },
  '土豆': { cal: 77, carbs: 17, protein: 2, fat: 0.1 },
  '全麦面包': { cal: 247, carbs: 41, protein: 13, fat: 3.4 },
  '燕麦': { cal: 389, carbs: 66, protein: 17, fat: 7 },
  '花生': { cal: 567, carbs: 16, protein: 26, fat: 49 },
  '核桃': { cal: 654, carbs: 14, protein: 15, fat: 65 },
  '沙拉': { cal: 50, carbs: 5, protein: 2, fat: 2 },
  '炸鸡': { cal: 260, carbs: 15, protein: 18, fat: 15 },
  '薯条': { cal: 312, carbs: 41, protein: 3.4, fat: 15 },
  '可乐': { cal: 42, carbs: 11, protein: 0, fat: 0 },
  '奶茶': { cal: 68, carbs: 10, protein: 1.5, fat: 2.5 },
  '咖啡': { cal: 2, carbs: 0, protein: 0.3, fat: 0 },
  '包子': { cal: 226, carbs: 30, protein: 8, fat: 8 },
  '饺子': { cal: 200, carbs: 25, protein: 8, fat: 7 },
  '宫保鸡丁': { cal: 150, carbs: 8, protein: 12, fat: 8 },
  '麻婆豆腐': { cal: 100, carbs: 4, protein: 6, fat: 7 },
  '青椒肉丝': { cal: 120, carbs: 4, protein: 10, fat: 7 },
};

function estimateNutrition(foodName, grams) {
  const g = grams || 100;
  // Fuzzy match food name
  let match = null;
  for (const key of Object.keys(FOOD_DB)) {
    if (foodName.includes(key) || key.includes(foodName)) { match = FOOD_DB[key]; break; }
  }
  if (!match) return null;
  const ratio = g / 100;
  return {
    calories: Math.round(match.cal * ratio),
    carbs: Math.round(match.carbs * ratio * 10) / 10,
    protein: Math.round(match.protein * ratio * 10) / 10,
    fat: Math.round(match.fat * ratio * 10) / 10
  };
}

function showAddMealModal(mealType) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加${mealType}</div>
    <div class="form-group"><label class="form-label">食物名称</label><input class="form-input" id="mealName" placeholder="如：鸡胸肉、米饭、鸡蛋"></div>
    <div class="form-group"><label class="form-label">克重 (g)</label><input class="form-input" type="number" id="mealGrams" placeholder="如：200" value="100"></div>
    <div id="autoResult" style="padding:12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:12px;display:none">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">🤖 智能估算结果</div>
      <div id="autoNutrition" style="font-size:13px;color:var(--text-secondary)"></div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;text-align:center">输入食物名称后点击"计算"自动估算营养</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">热量(kcal)</label><input class="form-input" type="number" id="mealCal" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">碳水(g)</label><input class="form-input" type="number" id="mealCarbs" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">蛋白质(g)</label><input class="form-input" type="number" id="mealProtein" placeholder="自动或手动"></div>
      <div class="form-group"><label class="form-label">脂肪(g)</label><input class="form-input" type="number" id="mealFat" placeholder="自动或手动"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="calcMealBtn" style="flex:0.7">计算</button>
      <button class="btn btn-secondary" id="cancelMealBtn">取消</button>
      <button class="btn btn-primary" id="saveMealBtn">保存</button>
    </div>
  `;
  modal.style.display = 'flex';

  document.getElementById('calcMealBtn').addEventListener('click', () => {
    const name = document.getElementById('mealName').value.trim();
    const grams = parseInt(document.getElementById('mealGrams').value) || 100;
    if (!name) return;
    const result = estimateNutrition(name, grams);
    if (result) {
      document.getElementById('mealCal').value = result.calories;
      document.getElementById('mealCarbs').value = result.carbs;
      document.getElementById('mealProtein').value = result.protein;
      document.getElementById('mealFat').value = result.fat;
      document.getElementById('autoResult').style.display = 'block';
      document.getElementById('autoNutrition').textContent = `${name} ${grams}g → ${result.calories}kcal / 碳水${result.carbs}g / 蛋白质${result.protein}g / 脂肪${result.fat}g`;
    } else {
      document.getElementById('autoResult').style.display = 'block';
      document.getElementById('autoNutrition').textContent = `未找到「${name}」的数据，请手动填写营养数值`;
    }
  });

  document.getElementById('cancelMealBtn').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('saveMealBtn').addEventListener('click', () => {
    const name = document.getElementById('mealName').value.trim();
    if (!name) return;
    const meals = Store.get('meals', []);
    meals.push({
      id: Store.uid(), name, type: mealType,
      grams: parseInt(document.getElementById('mealGrams').value) || 0,
      calories: parseInt(document.getElementById('mealCal').value) || 0,
      carbs: parseFloat(document.getElementById('mealCarbs').value) || 0,
      protein: parseFloat(document.getElementById('mealProtein').value) || 0,
      fat: parseFloat(document.getElementById('mealFat').value) || 0,
      date: selectedDate, timestamp: Date.now()
    });
    Store.set('meals', meals);
    modal.style.display = 'none';
    HealthPage.render(document.getElementById('pageContainer'));
  });
}

// ========== 模块3: 运动训练（打卡制） ==========
function renderExercise(el) {
  const categories = Store.get('exerciseCategories', getDefaultCategories());
  const checkins = Store.get('exerciseCheckins', []);
  const today = Store.today();
  const todayCheckins = checkins.filter(c => c.date === today);
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCheckins = checkins.filter(c => c.date.startsWith(monthStr));

  // Monthly progress
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
        const allDone = cat.items.every(item => catCheckins.some(c => c.item === item));
        return `<div style="margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px">
            <span>${cat.icon}</span> ${escapeHtml(cat.name)}
            ${allDone ? '<span style="font-size:11px;color:var(--success);background:rgba(123,196,168,0.1);padding:2px 8px;border-radius:10px">全部完成 ✓</span>' : ''}
          </div>
          ${cat.items.map(item => {
            const done = catCheckins.some(c => c.item === item);
            return `<div class="exercise-check-item" style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:all 0.2s" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}">
              <div class="todo-checkbox ${done?'checked':''}"></div>
              <span style="flex:1;font-size:14px;${done?'text-decoration:line-through;color:var(--text-muted)':''}">${escapeHtml(item)}</span>
              <button class="action-btn exercise-del-item" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}" style="opacity:1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>`;
          }).join('')}
          <button class="add-btn exercise-add-item" data-category="${escapeHtml(cat.name)}" style="margin-top:4px;padding:8px;font-size:12px">+ 添加项目</button>
        </div>`;
      }).join('')}
      <button class="add-btn" id="addExCategoryBtn">+ 添加训练分类</button>
    </div>

    <div class="card">
      <div class="card-title">📊 本月训练进度</div>
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:36px;font-weight:700;color:var(--primary)">${uniqueDays}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">天 / ${daysInMonth} 天有训练记录</div>
        <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-top:12px">
          <div style="height:100%;width:${Math.round(uniqueDays/daysInMonth*100)}%;background:var(--primary);border-radius:4px;transition:width 0.5s"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📅 本月打卡日历</div>
      <div class="checkin-calendar">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${getMonthDays(now.getFullYear(), now.getMonth()).map(d => {
          const ds = formatDate(d.date);
          const isToday = ds === today;
          const hasCheckin = checkins.some(c => c.date === ds);
          return `<div class="checkin-day ${d.otherMonth?'empty':''} ${isToday?'today':''} ${hasCheckin?'checked':''}">${d.date.getDate()}</div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">📋 训练历史记录</div>
      ${renderExerciseHistory(checkins)}
    </div>
  `;

  // Toggle check-in
  el.querySelectorAll('.exercise-check-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.exercise-del-item') || e.target.closest('.exercise-add-item')) return;
      const cat = item.dataset.category;
      const itemName = item.dataset.item;
      const checkins = Store.get('exerciseCheckins', []);
      const idx = checkins.findIndex(c => c.date === today && c.category === cat && c.item === itemName);
      if (idx >= 0) checkins.splice(idx, 1);
      else checkins.push({ id: Store.uid(), date: today, category: cat, item: itemName, timestamp: Date.now() });
      Store.set('exerciseCheckins', checkins);
      renderExercise(el);
    });
  });

  // Delete item from category
  el.querySelectorAll('.exercise-del-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cat = btn.dataset.category;
      const item = btn.dataset.item;
      const categories = Store.get('exerciseCategories', getDefaultCategories());
      const catObj = categories.find(c => c.name === cat);
      if (catObj) {
        catObj.items = catObj.items.filter(i => i !== item);
        Store.set('exerciseCategories', categories);
        renderExercise(el);
      }
    });
  });

  // Add item to category
  el.querySelectorAll('.exercise-add-item').forEach(btn => {
    btn.addEventListener('click', () => {
      showTextInputModal('添加训练项目', (item) => {
        if (!item) return;
        const categories = Store.get('exerciseCategories', getDefaultCategories());
        const catObj = categories.find(c => c.name === btn.dataset.category);
        if (catObj) { catObj.items.push(item); Store.set('exerciseCategories', categories); renderExercise(el); }
      });
    });
  });

  // Add category
  document.getElementById('addExCategoryBtn').addEventListener('click', () => {
    showDualInputModal('添加训练分类', '分类名称', '图标 (emoji)', '🏋️', (name, icon) => {
      if (!name) return;
      const categories = Store.get('exerciseCategories', getDefaultCategories());
      categories.push({ name, icon: icon || '🏋️', items: [] });
      Store.set('exerciseCategories', categories);
      renderExercise(el);
    });
  });
}

function renderExerciseHistory(checkins) {
  if (checkins.length === 0) return '<div class="empty-state"><div class="empty-state-text">暂无训练记录</div></div>';
  const groups = Store.groupByDate(checkins);
  return groups.slice(0, 10).map(([date, items]) => `
    <div class="date-fold">
      <div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')">
        <svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        ${formatDateCN(date)}
        <span class="date-fold-count">${items.length} 项</span>
      </div>
      <div class="date-fold-body">
        ${items.map(c => `<div class="todo-item completed"><div class="todo-checkbox checked"></div><div class="todo-content"><div class="todo-text">${escapeHtml(c.category)} · ${escapeHtml(c.item)}</div></div></div>`).join('')}
      </div>
    </div>
  `).join('');
}

function getDefaultCategories() {
  return [
    { name: '有氧', icon: '🏃', items: ['跑步30分钟', '跳绳15分钟', '快走40分钟'] },
    { name: '无氧/力量', icon: '💪', items: ['深蹲3组x15', '俯卧撑3组x12', '哑铃划船3组x12'] },
    { name: '体态矫正', icon: '🧘', items: ['开肩拉伸10分钟', '核心激活5分钟', '泡沫轴放松10分钟'] },
    { name: '拉伸放松', icon: '🤸', items: ['全身拉伸15分钟', '瑜伽20分钟'] }
  ];
}

// ========== Modal Helpers ==========
function showWeightInputModal(date, existing, callback) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">${formatDateCN(date)} 体重</div>
    <div class="form-group"><label class="form-label">体重 (kg)</label><input class="form-input" type="number" step="0.1" id="modalWeightInput" value="${existing||''}" placeholder="输入体重"></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="modalWeightCancel">取消</button><button class="btn btn-primary" id="modalWeightSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  document.getElementById('modalWeightCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('modalWeightSave').addEventListener('click', () => {
    const v = parseFloat(document.getElementById('modalWeightInput').value);
    if (!v) return;
    const records = Store.get('weightRecords', []);
    const idx = records.findIndex(r => r.date === date);
    if (idx >= 0) records[idx].value = v;
    else records.push({ id: Store.uid(), value: v, date, timestamp: Date.now() });
    records.sort((a,b) => a.date.localeCompare(b.date));
    Store.set('weightRecords', records);
    modal.style.display = 'none';
    callback();
  });
}

function showTextInputModal(title, callback) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">${escapeHtml(title)}</div>
    <div class="form-group"><input class="form-input" id="modalTextInput" placeholder="输入内容..." autofocus></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="modalTextCancel">取消</button><button class="btn btn-primary" id="modalTextSave">确定</button></div>
  `;
  modal.style.display = 'flex';
  const input = document.getElementById('modalTextInput');
  setTimeout(() => input.focus(), 100);
  document.getElementById('modalTextCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('modalTextSave').addEventListener('click', () => { modal.style.display = 'none'; callback(input.value.trim()); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('modalTextSave').click(); });
}

function showDualInputModal(title, label1, label2, default2, callback) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
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
  document.getElementById('modalDualSave').addEventListener('click', () => {
    modal.style.display = 'none';
    callback(document.getElementById('modalDualInput1').value.trim(), document.getElementById('modalDualInput2').value.trim());
  });
}

// ========== 模块4: 各种记录（自定义打卡 + 详情） ==========
function renderHealthRecords(el) {
  const categories = Store.get('healthRecordCategories', getDefaultHealthRecords());
  const records = Store.get('healthRecords', []);
  const today = Store.today();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Date picker (7 days)
  const dateItems = [];
  for (let i = -3; i <= 3; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateItems.push(d); }

  const dayRecords = records.filter(r => r.date === selectedDate);
  const monthRecords = records.filter(r => r.date.startsWith(monthStr));

  el.innerHTML = `
    <div class="date-picker-h" id="recordDatePicker">
      ${dateItems.map(d => {
        const ds = formatDate(d); const isToday = ds === today;
        return `<div class="date-picker-item ${isToday?'today':''} ${ds===selectedDate?'selected':''}" data-date="${ds}">
          <div class="dp-weekday">${['日','一','二','三','四','五','六'][d.getDay()]}</div>
          <div class="dp-day">${d.getDate()}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">📝 ${formatDateCN(selectedDate)} 记录</div>
        <span style="font-size:12px;color:var(--text-muted)">${dayRecords.length} 条</span>
      </div>
      ${categories.map(cat => {
        const catRecords = dayRecords.filter(r => r.category === cat.name);
        return `<div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px">
              <span>${cat.icon}</span> ${escapeHtml(cat.name)}
            </div>
            <button class="action-btn health-cat-del" data-name="${escapeHtml(cat.name)}" style="opacity:1;color:var(--text-muted)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${cat.items.map(item => {
              const done = catRecords.some(r => r.item === item);
              return `<button class="record-chip ${done?'active':''}" data-category="${escapeHtml(cat.name)}" data-item="${escapeHtml(item)}">
                ${escapeHtml(item)} ${done ? '✓' : ''}
              </button>`;
            }).join('')}
          </div>
          <button class="add-btn health-add-item" data-category="${escapeHtml(cat.name)}" style="margin-top:6px;padding:6px;font-size:12px">+ 添加项</button>
        </div>`;
      }).join('')}
      <button class="add-btn" id="addHealthCatBtn">+ 添加记录分类</button>
    </div>

    <div class="card">
      <div class="card-title">📅 本月打卡日历</div>
      <div style="text-align:center;margin-bottom:8px;font-size:13px;color:var(--text-muted)">
        ${now.getFullYear()}年${now.getMonth()+1}月 · ${monthRecords.length} 条记录
      </div>
      <div class="checkin-calendar">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${getMonthDays(now.getFullYear(), now.getMonth()).map(d => {
          const ds = formatDate(d.date);
          const isToday = ds === today;
          const hasRec = records.some(r => r.date === ds);
          return `<div class="checkin-day ${d.otherMonth?'empty':''} ${isToday?'today':''} ${hasRec?'checked':''}">${d.date.getDate()}</div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">📋 历史记录</div>
      ${renderHealthRecordHistory(records)}
    </div>
  `;

  // Date picker
  el.querySelectorAll('.date-picker-item').forEach(d => {
    d.addEventListener('click', () => { selectedDate = d.dataset.date; renderHealthRecords(el); });
  });

  // Chip toggle
  el.querySelectorAll('.record-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category;
      const item = chip.dataset.item;
      const allRecords = Store.get('healthRecords', []);
      const idx = allRecords.findIndex(r => r.date === selectedDate && r.category === cat && r.item === item);
      if (idx >= 0) allRecords.splice(idx, 1);
      else allRecords.push({ id: Store.uid(), date: selectedDate, category: cat, item, timestamp: Date.now() });
      Store.set('healthRecords', allRecords);
      renderHealthRecords(el);
    });
  });

  // Add item to category
  el.querySelectorAll('.health-add-item').forEach(btn => {
    btn.addEventListener('click', () => {
      showTextInputModal('添加记录项', (val) => {
        if (!val) return;
        const cats = Store.get('healthRecordCategories', getDefaultHealthRecords());
        const cat = cats.find(c => c.name === btn.dataset.category);
        if (cat) { cat.items.push(val); Store.set('healthRecordCategories', cats); renderHealthRecords(el); }
      });
    });
  });

  // Delete category
  el.querySelectorAll('.health-cat-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      let cats = Store.get('healthRecordCategories', getDefaultHealthRecords());
      cats = cats.filter(c => c.name !== name);
      Store.set('healthRecordCategories', cats);
      renderHealthRecords(el);
    });
  });

  // Add category
  document.getElementById('addHealthCatBtn').addEventListener('click', () => {
    showDualInputModal('添加记录分类', '分类名称', '图标 (emoji)', '📝', (name, icon) => {
      if (!name) return;
      const cats = Store.get('healthRecordCategories', getDefaultHealthRecords());
      cats.push({ name, icon: icon || '📝', items: [] });
      Store.set('healthRecordCategories', cats);
      renderHealthRecords(el);
    });
  });
}

function renderHealthRecordHistory(records) {
  if (records.length === 0) return '<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>';
  const groups = Store.groupByDate(records);
  return groups.slice(0, 15).map(([date, items]) => `
    <div class="date-fold">
      <div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')">
        <svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        ${formatDateCN(date)}
        <span class="date-fold-count">${items.length} 条</span>
      </div>
      <div class="date-fold-body">
        ${items.map(r => `<div class="todo-item">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0"></div>
          <div class="todo-content">
            <div class="todo-text">${escapeHtml(r.category)} · ${escapeHtml(r.item)}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  `).join('');
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
