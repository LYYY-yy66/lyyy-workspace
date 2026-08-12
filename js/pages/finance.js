/**
 * finance.js — 存钱计划页面（4321存钱法 + 周收支 + 月统计）
 */
import { Store, formatDate, formatDateCN, escapeHtml } from '../store.js';

let currentTab = 'plan'; // plan | weekly | monthly

export const FinancePage = {
  render(container) {
    container.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${currentTab==='plan'?'active':''}" data-tab="plan">存钱计划</button>
        <button class="sub-tab ${currentTab==='weekly'?'active':''}" data-tab="weekly">周收支</button>
        <button class="sub-tab ${currentTab==='monthly'?'active':''}" data-tab="monthly">月度统计</button>
      </div>
      <div id="financeContent"></div>
    `;
    container.querySelectorAll('.sub-tab').forEach(tab => {
      tab.addEventListener('click', () => { currentTab = tab.dataset.tab; FinancePage.render(container); });
    });
    const content = document.getElementById('financeContent');
    if (currentTab === 'plan') renderPlan(content);
    else if (currentTab === 'weekly') renderWeekly(content);
    else renderMonthly(content);
  }
};

// ========== 存钱计划（4321法则） ==========
function renderPlan(el) {
  const plan = Store.get('savingsPlan', { monthlyIncome: 0, monthlyGoal: 0 });
  const savings = Store.get('savingsRecords', []);
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthSavings = savings.filter(s => s.date.startsWith(monthStr));
  const totalSaved = monthSavings.reduce((s, r) => s + r.amount, 0);

  // 4321 rule: 40% savings, 30% living, 20% investment, 10% insurance/emergency
  const income = plan.monthlyIncome;
  const alloc40 = Math.round(income * 0.4);
  const alloc30 = Math.round(income * 0.3);
  const alloc20 = Math.round(income * 0.2);
  const alloc10 = Math.round(income * 0.1);
  const goal = plan.monthlyGoal || alloc40;
  const progress = goal > 0 ? Math.min(100, Math.round(totalSaved / goal * 100)) : 0;
  const remaining = Math.max(0, goal - totalSaved);

  el.innerHTML = `
    <div class="card">
      <div class="card-title">💰 4321 存钱法</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;margin-bottom:16px">
        将月收入按比例分配：<br>
        <b>40%</b> 储蓄/还贷 · <b>30%</b> 生活开销 · <b>20%</b> 投资理财 · <b>10%</b> 保险/应急
      </div>
      ${income > 0 ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius);text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--primary)">¥${alloc40}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">40% 储蓄</div>
        </div>
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius);text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--info)">¥${alloc30}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">30% 生活</div>
        </div>
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius);text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--success)">¥${alloc20}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">20% 投资</div>
        </div>
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius);text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--warning)">¥${alloc10}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">10% 保险</div>
        </div>
      </div>` : '<div style="text-align:center;color:var(--text-muted);font-size:13px;margin-bottom:16px">请先设置月收入以启用4321分配</div>'}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label class="form-label">月收入 (元)</label><input class="form-input" type="number" id="incomeInput" value="${income||''}" placeholder="输入月收入"></div>
        <div class="form-group"><label class="form-label">月存钱目标 (元)</label><input class="form-input" type="number" id="goalInput" value="${goal||''}" placeholder="默认40%收入"></div>
      </div>
      <button class="btn btn-primary btn-sm" id="savePlanBtn">保存计划</button>
    </div>

    <div class="card">
      <div class="card-title">📊 本月存钱进度</div>
      <div style="text-align:center;padding:16px 0">
        <div style="position:relative;width:140px;height:140px;margin:0 auto">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" fill="none" stroke="#e8ecf1" stroke-width="10"/>
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--primary)" stroke-width="10"
              stroke-dasharray="${377}" stroke-dashoffset="${377 * (1 - progress/100)}"
              transform="rotate(-90 70 70)" stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:28px;font-weight:700;color:var(--primary)">${progress}%</div>
            <div style="font-size:11px;color:var(--text-muted)">完成度</div>
          </div>
        </div>
      </div>
      <div class="finance-summary" style="margin-top:12px">
        <div class="finance-stat stat-income">
          <div class="finance-stat-value">¥${totalSaved}</div>
          <div class="finance-stat-label">已存</div>
        </div>
        <div class="finance-stat stat-expense">
          <div class="finance-stat-value">¥${remaining}</div>
          <div class="finance-stat-label">还差</div>
        </div>
        <div class="finance-stat stat-balance">
          <div class="finance-stat-value">¥${goal}</div>
          <div class="finance-stat-label">月目标</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">💵 本月存款记录</div>
      ${monthSavings.length === 0 ? '<div class="empty-state"><div class="empty-state-text">暂无存款记录</div></div>' : ''}
      ${monthSavings.map(s => `<div class="finance-item">
        <div class="finance-item-icon">💰</div>
        <div class="finance-item-info">
          <div class="finance-item-category">${escapeHtml(s.note || '存款')}</div>
          <div class="finance-item-note">${formatDateCN(s.date)}</div>
        </div>
        <div class="finance-item-amount income">+¥${s.amount}</div>
        <button class="action-btn savings-delete" data-id="${s.id}" style="opacity:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('')}
      <button class="add-btn" id="addSavingsBtn">+ 记录一笔存款</button>
    </div>
  `;

  document.getElementById('savePlanBtn').addEventListener('click', () => {
    Store.set('savingsPlan', {
      monthlyIncome: parseFloat(document.getElementById('incomeInput').value) || 0,
      monthlyGoal: parseFloat(document.getElementById('goalInput').value) || 0
    });
    renderPlan(el);
  });

  document.getElementById('addSavingsBtn').addEventListener('click', () => {
    const modal = document.getElementById('genericModal');
    const content = document.getElementById('genericModalContent');
    content.innerHTML = `
      <div class="modal-title">记录一笔存款</div>
      <div class="form-group"><label class="form-label">金额 (元)</label><input class="form-input" type="number" id="savingsAmount" placeholder="0" style="font-size:24px;text-align:center;font-weight:700" autofocus></div>
      <div class="form-group"><label class="form-label">备注（可选）</label><input class="form-input" id="savingsNote" placeholder="存款" value="存款"></div>
      <div class="modal-actions"><button class="btn btn-secondary" id="cancelSavingsBtn">取消</button><button class="btn btn-primary" id="saveSavingsBtn">保存</button></div>
    `;
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('savingsAmount').focus(), 100);
    document.getElementById('cancelSavingsBtn').addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    document.getElementById('saveSavingsBtn').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('savingsAmount').value);
      if (!amount || amount <= 0) return;
      const note = document.getElementById('savingsNote').value.trim() || '存款';
      const savings = Store.get('savingsRecords', []);
      savings.push({ id: Store.uid(), amount, note, date: Store.today(), timestamp: Date.now() });
      Store.set('savingsRecords', savings);
      modal.style.display = 'none';
      renderPlan(el);
    });
  });

  el.querySelectorAll('.savings-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      let s = Store.get('savingsRecords', []);
      s = s.filter(x => x.id !== btn.dataset.id);
      Store.set('savingsRecords', s);
      renderPlan(el);
    });
  });
}

// ========== 周收支记录 ==========
function renderWeekly(el) {
  const weeklyRecords = Store.get('weeklyRecords', []);
  const now = new Date();

  // Get current week (Mon-Sun)
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = formatDate(monday);
  const weekEnd = formatDate(sunday);

  const weekRecords = weeklyRecords.filter(r => r.date >= weekStart && r.date <= weekEnd);
  const weekIncome = weekRecords.filter(r => r.type === 'income').reduce((s,r) => s + r.amount, 0);
  const weekExpense = weekRecords.filter(r => r.type === 'expense').reduce((s,r) => s + r.amount, 0);

  // Get all weeks grouped
  const allWeeks = {};
  weeklyRecords.forEach(r => {
    const d = new Date(r.date);
    const dow = d.getDay();
    const weekMon = new Date(d);
    weekMon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const wk = formatDate(weekMon);
    if (!allWeeks[wk]) allWeeks[wk] = [];
    allWeeks[wk].push(r);
  });

  const sortedWeeks = Object.entries(allWeeks).sort((a,b) => b[0].localeCompare(a[0]));

  el.innerHTML = `
    <div class="card">
      <div class="card-title">📅 本周收支 (${monday.getMonth()+1}/${monday.getDate()} - ${sunday.getMonth()+1}/${sunday.getDate()})</div>
      <div class="finance-summary">
        <div class="finance-stat stat-income">
          <div class="finance-stat-value">¥${weekIncome}</div>
          <div class="finance-stat-label">收入</div>
        </div>
        <div class="finance-stat stat-expense">
          <div class="finance-stat-value">¥${weekExpense}</div>
          <div class="finance-stat-label">支出</div>
        </div>
        <div class="finance-stat stat-balance">
          <div class="finance-stat-value">¥${weekIncome - weekExpense}</div>
          <div class="finance-stat-label">结余</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📝 本周记录</div>
      ${weekRecords.length === 0 ? '<div class="empty-state"><div class="empty-state-text">本周暂无收支记录</div></div>' : ''}
      ${weekRecords.map(r => `<div class="finance-item">
        <div class="finance-item-icon">${r.type === 'income' ? '💰' : '💸'}</div>
        <div class="finance-item-info">
          <div class="finance-item-category">${escapeHtml(r.category || r.note || (r.type==='income'?'收入':'支出'))}</div>
          <div class="finance-item-note">${formatDateCN(r.date)}</div>
        </div>
        <div class="finance-item-amount ${r.type}">${r.type==='income'?'+':'-'}¥${r.amount}</div>
        <button class="action-btn weekly-delete" data-id="${r.id}" style="opacity:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('')}
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px">
      <button class="add-btn" id="addIncomeBtn" style="flex:1">+ 收入</button>
      <button class="add-btn" id="addExpenseBtn" style="flex:1">+ 支出</button>
    </div>

    <div class="card">
      <div class="card-title">📋 历史周记录</div>
      ${sortedWeeks.length === 0 ? '<div class="empty-state"><div class="empty-state-text">暂无历史记录</div></div>' : ''}
      ${sortedWeeks.map(([wkStart, items]) => {
        const ws = new Date(wkStart);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        const wIncome = items.filter(r => r.type==='income').reduce((s,r)=>s+r.amount,0);
        const wExpense = items.filter(r => r.type==='expense').reduce((s,r)=>s+r.amount,0);
        return `<div class="date-fold">
          <div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')">
            <svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            ${ws.getMonth()+1}/${ws.getDate()} - ${we.getMonth()+1}/${we.getDate()}
            <span class="date-fold-count">收${wIncome} 支${wExpense}</span>
          </div>
          <div class="date-fold-body">
            ${items.map(r => `<div class="finance-item">
              <div class="finance-item-icon">${r.type==='income'?'💰':'💸'}</div>
              <div class="finance-item-info">
                <div class="finance-item-category">${escapeHtml(r.category || r.note || '')}</div>
                <div class="finance-item-note">${formatDateCN(r.date)}</div>
              </div>
              <div class="finance-item-amount ${r.type}">${r.type==='income'?'+':'-'}¥${r.amount}</div>
            </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  el.querySelectorAll('.weekly-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      let r = Store.get('weeklyRecords', []); r = r.filter(x => x.id !== btn.dataset.id); Store.set('weeklyRecords', r);
      renderWeekly(el);
    });
  });

  document.getElementById('addIncomeBtn').addEventListener('click', () => showAddWeeklyModal('income', el));
  document.getElementById('addExpenseBtn').addEventListener('click', () => showAddWeeklyModal('expense', el));
}

function showAddWeeklyModal(type, el) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  const categories = type === 'income'
    ? ['工资', '兼职', '理财收益', '红包', '退款', '其他']
    : ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '日用品', '其他'];

  content.innerHTML = `
    <div class="modal-title">记录${type==='income'?'收入':'支出'}</div>
    <div class="form-group">
      <label class="form-label">金额 (元)</label>
      <input class="form-input" type="number" step="0.01" id="wkAmount" placeholder="0.00" style="font-size:24px;text-align:center;font-weight:700">
    </div>
    <div class="form-group">
      <label class="form-label">分类</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${categories.map((c, i) => `<button class="btn btn-sm wk-cat-btn ${i===0?'btn-primary':'btn-secondary'}" data-cat="${c}" style="margin:2px">${c}</button>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">备注（可选）</label>
      <input class="form-input" id="wkNote" placeholder="备注信息">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelWkBtn">取消</button>
      <button class="btn btn-primary" id="saveWkBtn">保存</button>
    </div>
  `;
  modal.style.display = 'flex';

  let selectedCat = categories[0];

  content.querySelectorAll('.wk-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCat = btn.dataset.cat;
      content.querySelectorAll('.wk-cat-btn').forEach(b => {
        b.className = `btn btn-sm wk-cat-btn ${b.dataset.cat === selectedCat ? 'btn-primary' : 'btn-secondary'}`;
      });
    });
  });

  document.getElementById('cancelWkBtn').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('saveWkBtn').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('wkAmount').value);
    if (!amount || amount <= 0) return;
    const records = Store.get('weeklyRecords', []);
    records.push({
      id: Store.uid(), type, amount, category: selectedCat,
      note: document.getElementById('wkNote').value.trim(),
      date: Store.today(), timestamp: Date.now()
    });
    Store.set('weeklyRecords', records);
    modal.style.display = 'none';
    renderWeekly(el);
  });
}

// ========== 月度统计 ==========
function renderMonthly(el) {
  const savings = Store.get('savingsRecords', []);
  const weeklyRecords = Store.get('weeklyRecords', []);
  const plan = Store.get('savingsPlan', { monthlyIncome: 0, monthlyGoal: 0 });
  const now = new Date();

  // Last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ms = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const mSavings = savings.filter(s => s.date.startsWith(ms));
    const mWeekRecords = weeklyRecords.filter(r => r.date.startsWith(ms));
    const saved = mSavings.reduce((s,r) => s + r.amount, 0);
    const income = mWeekRecords.filter(r => r.type==='income').reduce((s,r) => s + r.amount, 0);
    const expense = mWeekRecords.filter(r => r.type==='expense').reduce((s,r) => s + r.amount, 0);
    months.push({
      label: `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`,
      saved, income, expense,
      goal: plan.monthlyGoal || Math.round(plan.monthlyIncome * 0.4),
      reached: saved >= (plan.monthlyGoal || Math.round(plan.monthlyIncome * 0.4))
    });
  }

  const currentMonth = months[months.length - 1];

  el.innerHTML = `
    <div class="card">
      <div class="card-title">📊 月度存钱总结</div>
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">${currentMonth.label}</div>
        <div style="font-size:36px;font-weight:700;color:var(--primary)">¥${currentMonth.saved}</div>
        <div style="font-size:13px;color:${currentMonth.reached?'var(--success)':'var(--danger)'};margin-top:4px">
          ${currentMonth.reached ? '✓ 已达成目标！' : `还差 ¥${Math.max(0, currentMonth.goal - currentMonth.saved)}`}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📈 近6个月对比</div>
      <div class="chart-container"><canvas id="monthlyChart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">📋 月度明细</div>
      ${months.slice().reverse().map(m => `
        <div style="display:flex;align-items:center;padding:12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:8px">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">${m.label}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
              收入¥${m.income} · 支出¥${m.expense}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:700;color:var(--primary)">¥${m.saved}</div>
            <div style="font-size:11px;color:${m.reached?'var(--success)':'var(--danger)'}">${m.reached ? '✓ 达标' : '未达标'}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const ctx = document.getElementById('monthlyChart');
  if (ctx && typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          { label: '存款', data: months.map(m => m.saved), backgroundColor: 'rgba(124,156,191,0.7)', borderRadius: 6, barThickness: 20 },
          { label: '目标', data: months.map(m => m.goal), type: 'line', borderColor: '#d98a8a', borderDash: [5,5], pointRadius: 3, fill: false, tension: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e8ecf1' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }
}
