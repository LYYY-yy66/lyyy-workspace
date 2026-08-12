/**
 * english.js — 英语学习页面（单词打卡 + 外刊阅读 + 英语听力）
 * 纯打卡进度模式
 */
import { Store, formatDate, formatDateCN, getMonthDays, escapeHtml } from '../store.js';

let currentTab = 'words';

export const EnglishPage = {
  render(container) {
    container.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${currentTab==='words'?'active':''}" data-tab="words">单词打卡</button>
        <button class="sub-tab ${currentTab==='reading'?'active':''}" data-tab="reading">外刊阅读</button>
        <button class="sub-tab ${currentTab==='listening'?'active':''}" data-tab="listening">英语听力</button>
      </div>
      <div id="englishContent"></div>
    `;
    container.querySelectorAll('.sub-tab').forEach(tab => {
      tab.addEventListener('click', () => { currentTab = tab.dataset.tab; EnglishPage.render(container); });
    });
    const content = document.getElementById('englishContent');
    if (currentTab === 'words') renderCheckinPage(content, 'wordCheckins', '📖 单词打卡', '每日背单词打卡');
    else if (currentTab === 'reading') renderCheckinPage(content, 'readingCheckins', '📰 外刊阅读打卡', '每日阅读外刊文章打卡');
    else renderCheckinPage(content, 'listeningCheckins', '🎧 英语听力打卡', '每日英语听力磨耳朵打卡');
  }
};

function renderCheckinPage(el, storageKey, title, description) {
  const checkins = Store.get(storageKey, []);
  const today = Store.today();
  const isCheckedIn = checkins.includes(today);
  const streak = calculateStreak(checkins);
  const totalDays = checkins.length;
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCheckins = checkins.filter(d => d.startsWith(monthStr));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();

  // Weekly count (last 7 days)
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (checkins.includes(formatDate(d))) weekCount++;
  }

  // Daily quote for words page
  const quote = storageKey === 'wordCheckins' ? getDailyQuote() : null;

  el.innerHTML = `
    ${quote ? `<div class="quote-card">
      <div class="quote-text">${quote.text}</div>
      <div class="quote-author">— ${quote.author}</div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">${title}</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${description}</div>
      <div style="text-align:center;padding:16px 0">
        <button class="btn ${isCheckedIn ? 'btn-success' : 'btn-primary'} btn-lg" id="checkinBtn" ${isCheckedIn?'disabled':''}>
          ${isCheckedIn ? '✓ 今日已打卡' : '立即打卡'}
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📊 打卡统计</div>
      <div class="finance-summary">
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:var(--primary)">${streak}</div>
          <div class="finance-stat-label">连续天数</div>
        </div>
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:var(--primary)">${weekCount}</div>
          <div class="finance-stat-label">本周打卡</div>
        </div>
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:var(--primary)">${totalDays}</div>
          <div class="finance-stat-label">累计天数</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📅 本月打卡日历</div>
      <div style="text-align:center;margin-bottom:8px;font-size:13px;color:var(--text-muted)">
        ${now.getFullYear()}年${now.getMonth()+1}月 · 已打卡 ${monthCheckins.length}/${daysInMonth} 天
      </div>
      <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:16px">
        <div style="height:100%;width:${Math.round(monthCheckins.length/daysInMonth*100)}%;background:var(--primary);border-radius:4px;transition:width 0.5s"></div>
      </div>
      <div class="checkin-calendar">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${getMonthDays(now.getFullYear(), now.getMonth()).map(d => {
          const ds = formatDate(d.date);
          const isToday = ds === today;
          const checked = checkins.includes(ds);
          return `<div class="checkin-day ${d.otherMonth?'empty':''} ${isToday?'today':''} ${checked?'checked':''}">${d.date.getDate()}</div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">📋 打卡记录（近30天）</div>
      ${checkins.length === 0 ? '<div class="empty-state"><div class="empty-state-text">还没有打卡记录，点击上方按钮开始</div></div>' : ''}
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${checkins.slice(-30).reverse().map(d => `
          <span style="font-size:11px;padding:3px 8px;background:var(--bg);border-radius:8px;color:var(--text-secondary)">${formatDateCN(d)}</span>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('checkinBtn').addEventListener('click', () => {
    if (isCheckedIn) return;
    const arr = Store.get(storageKey, []);
    arr.push(today);
    Store.set(storageKey, arr);
    EnglishPage.render(el.closest('.page-container'));
  });
}

function calculateStreak(dates) {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const expected = formatDate(d);
    if (sorted[i] === expected) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function getDailyQuote() {
  const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" }
  ];
  return quotes[new Date().getDate() % quotes.length];
}
