/**
 * todo.js — 每日Todo页面（周日历 + 待办 + 月安排 + 时间可视化）
 */
import { Store, formatDate, formatDateCN, getWeekDays, getMonthDays, getRelativeDate, escapeHtml } from '../store.js';

let currentTab = 'daily';
let selectedDate = Store.today();

export const TodoPage = {
  render(container) {
    container.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${currentTab==='daily'?'active':''}" data-tab="daily">每日todo</button>
        <button class="sub-tab ${currentTab==='month'?'active':''}" data-tab="month">月安排</button>
        <button class="sub-tab ${currentTab==='time'?'active':''}" data-tab="time">时间可视化</button>
      </div>
      <div id="todoContent"></div>
    `;
    container.querySelectorAll('.sub-tab').forEach(tab => {
      tab.addEventListener('click', () => { currentTab = tab.dataset.tab; TodoPage.render(container); });
    });
    const content = document.getElementById('todoContent');
    if (currentTab === 'daily') renderDaily(content);
    else if (currentTab === 'month') renderMonth(content);
    else renderTime(content);
  }
};

// ========== 模块1: 每日Todo ==========
function renderDaily(el) {
  const weekDays = getWeekDays();
  const today = Store.today();
  const todos = Store.get('todos', []);
  const pending = todos.filter(t => !t.completed && t.date <= today);
  const todayNew = todos.filter(t => !t.completed && t.date === today);
  const overdue = todos.filter(t => !t.completed && t.date < today);

  // Carried-over tasks: uncompleted tasks from past dates
  const carriedOver = pending.filter(t => t.date < today);

  el.innerHTML = `
    <div class="card">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        本周日程
      </div>
      <div class="week-calendar" id="weekCalendar">
        ${weekDays.map(d => {
          const ds = formatDate(d);
          const dayTodos = todos.filter(t => t.date === ds);
          const colors = ['#7c9cbf','#7bc4a8','#e8b86d','#d98a8a','#a8c4e0'];
          return `<div class="week-day ${ds===today?'today':''} ${ds===selectedDate?'selected':''}" data-date="${ds}">
            <div class="week-day-name">${['一','二','三','四','五','六','日'][d.getDay()===0?6:d.getDay()-1]}</div>
            <div class="week-day-num">${d.getDate()}</div>
            <div class="week-day-dots">
              ${dayTodos.slice(0,3).map((_,i) => `<div class="week-day-dot" style="background:${colors[i%5]}"></div>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          待办事项
        </div>
        <span style="font-size:12px;color:var(--text-muted)">${pending.length} 项未完成</span>
      </div>
      <div class="todo-list" id="todoList">
        ${pending.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无待办事项，点击下方添加</div></div>' : ''}
        ${carriedOver.map(t => renderTodoItem(t, true)).join('')}
        ${todayNew.map(t => renderTodoItem(t, false)).join('')}
      </div>
      <button class="add-btn" id="addTodoBtn">+ 添加新待办</button>
    </div>

    ${renderCompletedFold(todos)}
  `;

  // Events
  el.querySelectorAll('.week-day').forEach(d => {
    d.addEventListener('click', () => { selectedDate = d.dataset.date; TodoPage.render(el.closest('.page-container')); });
  });

  el.querySelectorAll('.todo-checkbox').forEach(cb => {
    cb.addEventListener('click', () => toggleTodo(cb.dataset.id));
  });
  el.querySelectorAll('.todo-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTodo(btn.dataset.id));
  });
  document.getElementById('addTodoBtn').addEventListener('click', () => showAddTodoModal());
}

function renderTodoItem(t, isOverdue) {
  return `<div class="todo-item ${t.completed?'completed':''}" data-id="${t.id}">
    <div class="todo-checkbox ${t.completed?'checked':''}" data-id="${t.id}"></div>
    <div class="todo-content">
      <div class="todo-text">${t.emoji||''} ${escapeHtml(t.text)}</div>
      <div class="todo-meta">
        <span class="todo-date">${isOverdue ? '⚠️ 逾期 · ' : ''}${getRelativeDate(t.date)}</span>
        ${t.priority ? `<span class="todo-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]}</span>` : ''}
      </div>
    </div>
    <div class="todo-actions">
      <button class="action-btn todo-delete" data-id="${t.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  </div>`;
}

function renderCompletedFold(todos) {
  const completed = todos.filter(t => t.completed);
  if (completed.length === 0) return '';
  const groups = Store.groupByDate(completed);
  return `<div class="card">
    <div class="card-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      已完成记录
    </div>
    ${groups.map(([date, items]) => `
      <div class="date-fold">
        <div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')">
          <svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          ${formatDateCN(date)}
          <span class="date-fold-count">${items.length} 项</span>
        </div>
        <div class="date-fold-body">
          ${items.map(t => `<div class="todo-item completed">
            <div class="todo-checkbox checked"></div>
            <div class="todo-content">
              <div class="todo-text">${t.emoji||''} ${escapeHtml(t.text)}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;
}

function toggleTodo(id) {
  const todos = Store.get('todos', []);
  const idx = todos.findIndex(t => t.id === id);
  if (idx >= 0) {
    todos[idx].completed = !todos[idx].completed;
    if (todos[idx].completed) todos[idx].completedDate = Store.today();
    Store.set('todos', todos);
    refreshCurrent();
  }
}

function deleteTodo(id) {
  let todos = Store.get('todos', []);
  todos = todos.filter(t => t.id !== id);
  Store.set('todos', todos);
  refreshCurrent();
}

function showAddTodoModal() {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加待办事项</div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <input class="form-input" id="todoTextInput" placeholder="输入待办内容..." autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">日期</label>
      <input class="form-input" type="date" id="todoDateInput" value="${selectedDate}">
    </div>
    <div class="form-group">
      <label class="form-label">优先级</label>
      <select class="form-select" id="todoPriorityInput">
        <option value="">无</option>
        <option value="high">高优先级</option>
        <option value="medium">中优先级</option>
        <option value="low">低优先级</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">小图标（可选）</label>
      <input class="form-input" id="todoEmojiInput" placeholder="输入 emoji 如 📚🏃‍♀️✏️" maxlength="4">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelTodoBtn">取消</button>
      <button class="btn btn-primary" id="saveTodoBtn">添加</button>
    </div>
  `;
  modal.style.display = 'flex';

  document.getElementById('cancelTodoBtn').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('saveTodoBtn').addEventListener('click', () => {
    const text = document.getElementById('todoTextInput').value.trim();
    if (!text) return;
    const todos = Store.get('todos', []);
    todos.push({
      id: Store.uid(),
      text,
      date: document.getElementById('todoDateInput').value || Store.today(),
      priority: document.getElementById('todoPriorityInput').value || null,
      emoji: document.getElementById('todoEmojiInput').value || '',
      completed: false,
      createdAt: Date.now()
    });
    Store.set('todos', todos);
    modal.style.display = 'none';
    refreshCurrent();
  });
}

// ========== 模块2: 月安排 ==========
let currentMonth = new Date();

function renderMonth(el) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getMonthDays(year, month);
  const today = Store.today();
  const todos = Store.get('todos', []);
  const weekdays = ['一','二','三','四','五','六','日'];
  const colors = ['#7c9cbf','#7bc4a8','#e8b86d','#d98a8a','#a8c4e0'];

  el.innerHTML = `
    <div class="card">
      <div class="month-header">
        <button class="month-nav-btn" id="prevMonth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-title">${year}年${month+1}月</div>
        <button class="month-nav-btn" id="nextMonth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="month-calendar">
        ${weekdays.map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${days.map(d => {
          const ds = formatDate(d.date);
          const dayTodos = todos.filter(t => t.date === ds);
          return `<div class="month-day ${ds===today?'today':''} ${d.otherMonth?'other-month':''}" data-date="${ds}">
            <span>${d.date.getDate()}</span>
            <div class="month-day-tags">
              ${dayTodos.slice(0,3).map((_,i) => `<div class="month-day-tag" style="background:${colors[i%5]}"></div>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card" id="monthDayDetail" style="display:none">
      <div class="card-title" id="monthDayTitle"></div>
      <div id="monthDayList"></div>
    </div>
    <button class="add-btn" id="addMonthEventBtn">+ 添加月安排事项</button>
  `;

  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth = new Date(year, month - 1, 1);
    renderMonth(el);
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth = new Date(year, month + 1, 1);
    renderMonth(el);
  });

  el.querySelectorAll('.month-day').forEach(d => {
    d.addEventListener('click', () => {
      selectedDate = d.dataset.date;
      showMonthDayDetail(d.dataset.date, todos);
    });
  });

  document.getElementById('addMonthEventBtn').addEventListener('click', () => showAddTodoModal());
}

function showMonthDayDetail(date, todos) {
  const detail = document.getElementById('monthDayDetail');
  const dayTodos = todos.filter(t => t.date === date);
  document.getElementById('monthDayTitle').textContent = formatDateCN(date) + ' 的事项';
  const list = document.getElementById('monthDayList');
  if (dayTodos.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-text">当天无事项</div></div>';
  } else {
    list.innerHTML = dayTodos.map(t => `<div class="todo-item ${t.completed?'completed':''}">
      <div class="todo-checkbox ${t.completed?'checked':''}" data-id="${t.id}"></div>
      <div class="todo-content">
        <div class="todo-text">${t.emoji||''} ${escapeHtml(t.text)}</div>
      </div>
    </div>`).join('');
    list.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('click', () => { toggleTodo(cb.dataset.id); });
    });
  }
  detail.style.display = 'block';
}

// ========== 模块3: 时间可视化 ==========
function renderTime(el) {
  const records = Store.get('timerRecords', []);
  const today = Store.today();
  const todayRecords = records.filter(r => r.date === today);
  const totalToday = todayRecords.reduce((s, r) => s + r.duration, 0);

  // Group by taskName for summary
  const nameTotals = {};
  records.forEach(r => {
    const name = r.taskName || '未命名';
    nameTotals[name] = (nameTotals[name] || 0) + r.duration;
  });
  const sortedNames = Object.entries(nameTotals).sort((a,b) => b[1] - a[1]);

  // Group by date for bar chart (last 7 days)
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = formatDate(d);
    const dayRecs = records.filter(r => r.date === ds);
    last7.push({ date: ds, label: `${d.getMonth()+1}/${d.getDate()}`, total: dayRecs.reduce((s,r) => s+r.duration, 0) });
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        今日专注
      </div>
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:36px;font-weight:700;color:var(--primary)">${totalToday}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">分钟 · 共 ${todayRecords.length} 次专注</div>
      </div>
    </div>

    ${sortedNames.length > 0 ? `<div class="card">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
        任务耗时汇总
      </div>
      ${sortedNames.map(([name, mins], i) => {
        const colors = ['#7c9cbf','#7bc4a8','#e8b86d','#d98a8a','#a8c4e0','#c4a8e0'];
        const maxMins = sortedNames[0][1];
        return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:500">${escapeHtml(name)}</span>
            <span style="color:var(--text-muted)">${mins >= 60 ? Math.floor(mins/60)+'h'+mins%60+'m' : mins+'分钟'}</span>
          </div>
          <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.round(mins/maxMins*100)}%;background:${colors[i%6]};border-radius:4px;transition:width 0.5s"></div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        近7日专注时长
      </div>
      <div class="chart-container"><canvas id="timeChart"></canvas></div>
    </div>
    ${renderTimeHistory(records)}
  `;

  // Render chart
  const ctx = document.getElementById('timeChart');
  if (ctx && typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: last7.map(d => d.label),
        datasets: [{
          label: '专注时长(分钟)',
          data: last7.map(d => d.total),
          backgroundColor: 'rgba(124,156,191,0.6)',
          borderColor: 'rgba(124,156,191,1)',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e8ecf1' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  // Bind time edit buttons
  el.querySelectorAll('.time-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const records = Store.get('timerRecords', []);
      const rec = records.find(r => r.id === btn.dataset.id);
      if (!rec) return;
      const modal = document.getElementById('genericModal');
      const content = document.getElementById('genericModalContent');
      content.innerHTML = `
        <div class="modal-title">编辑任务名称</div>
        <div class="form-group"><input class="form-input" id="timeEditInput" value="${escapeHtml(rec.taskName||'')}" placeholder="任务名称"></div>
        <div class="modal-actions"><button class="btn btn-secondary" id="timeEditCancel">取消</button><button class="btn btn-primary" id="timeEditSave">保存</button></div>
      `;
      modal.style.display = 'flex';
      document.getElementById('timeEditCancel').addEventListener('click', () => modal.style.display = 'none');
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
      document.getElementById('timeEditSave').addEventListener('click', () => {
        rec.taskName = document.getElementById('timeEditInput').value.trim();
        Store.set('timerRecords', records);
        modal.style.display = 'none';
        refreshCurrent();
      });
    });
  });
}

function renderTimeHistory(records) {
  if (records.length === 0) return '';
  const groups = Store.groupByDate(records);
  return `<div class="card">
    <div class="card-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
      专注记录
    </div>
    ${groups.map(([date, items]) => `
      <div class="date-fold">
        <div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')">
          <svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          ${formatDateCN(date)}
          <span class="date-fold-count">${items.length} 次 · ${items.reduce((s,r)=>s+r.duration,0)}分钟</span>
        </div>
        <div class="date-fold-body">
          ${items.map(r => `<div class="todo-item">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0"></div>
            <div class="todo-content">
              <div class="todo-text">${r.type === 'work' ? '🍅' : '☕'} ${escapeHtml(r.taskName || (r.type === 'work' ? '工作专注' : '休息'))}</div>
              <div class="todo-meta"><span class="todo-date">${r.duration}分钟</span></div>
            </div>
            <button class="action-btn time-edit-btn" data-id="${r.id}" style="opacity:1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>`).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;
}

function refreshCurrent() {
  const container = document.getElementById('pageContainer');
  TodoPage.render(container);
}
