/**
 * english.js — 英语学习页面（单词打卡 + 外刊阅读 + 英语听力）
 */
import { Store, formatDate, formatDateCN, getMonthDays, escapeHtml } from '../store.js';
import { renderVideoPlayer, bindVideoPlayers } from '../video.js';

let currentTab = 'words';
let currentReadingId = null;

export const EnglishPage = {
  render(container) {
    currentReadingId = currentReadingId || (Store.get('readingArticles', [])[0] || {}).id || null;
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
    if (currentTab === 'words') renderWordsPage(content);
    else if (currentTab === 'reading') renderReadingPage(content, container);
    else renderListeningPage(content, container);
  }
};

// ========== 单词打卡（保留原功能） ==========
function renderWordsPage(el) {
  renderCheckinPage(el, 'wordCheckins', '📖 单词打卡', '每日背单词打卡');
}

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
  let weekCount = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (checkins.includes(formatDate(d))) weekCount++; }
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
        <div class="finance-stat"><div class="finance-stat-value" style="color:var(--primary)">${streak}</div><div class="finance-stat-label">连续天数</div></div>
        <div class="finance-stat"><div class="finance-stat-value" style="color:var(--primary)">${weekCount}</div><div class="finance-stat-label">本周打卡</div></div>
        <div class="finance-stat"><div class="finance-stat-value" style="color:var(--primary)">${totalDays}</div><div class="finance-stat-label">累计天数</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📅 本月打卡日历</div>
      <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:16px">
        <div style="height:100%;width:${Math.round(monthCheckins.length/daysInMonth*100)}%;background:var(--primary);border-radius:4px;transition:width 0.5s"></div>
      </div>
      <div class="checkin-calendar">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${getMonthDays(now.getFullYear(), now.getMonth()).map(d => {
          const ds = formatDate(d.date); const isToday = ds === today; const checked = checkins.includes(ds);
          return `<div class="checkin-day ${d.otherMonth?'empty':''} ${isToday?'today':''} ${checked?'checked':''}">${d.date.getDate()}</div>`;
        }).join('')}
      </div>
    </div>
  `;
  document.getElementById('checkinBtn').addEventListener('click', () => {
    if (isCheckedIn) return;
    const arr = Store.get(storageKey, []); arr.push(today); Store.set(storageKey, arr);
    EnglishPage.render(el.closest('.page-container'));
  });
}

function calculateStreak(dates) {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 0; const d = new Date();
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === formatDate(d)) { streak++; d.setDate(d.getDate() - 1); } else break;
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
    { text: "The beautiful thing about learning is that no one can take away from you.", author: "B.B. King" }
  ];
  return quotes[new Date().getDate() % quotes.length];
}

// ========== 外刊阅读（逐句自动翻译 + 隐藏/显示） ==========
function splitSentences(text) {
  return text.split(/\n+/).map(p => p.trim()).filter(Boolean).flatMap(para => {
    const arr = []; let cur = '';
    for (const ch of para) {
      cur += ch;
      if (/[.!?。！？]/.test(ch) && cur.trim()) { arr.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) arr.push(cur.trim());
    return arr;
  });
}

async function translateText(text) {
  const cache = Store.get('readingTranslations', {});
  if (cache[text] != null) return cache[text];
  try {
    const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|zh-CN');
    const j = await r.json();
    const t = (j && j.responseData && j.responseData.translatedText) || '';
    cache[text] = t; Store.set('readingTranslations', cache);
    return t;
  } catch (e) { return ''; }
}

function renderReadingPage(el, container) {
  const articles = Store.get('readingArticles', []);
  const article = articles.find(a => a.id === currentReadingId) || articles[0] || null;

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">📰 外刊阅读</div>
        <button class="btn btn-secondary btn-sm" id="addArticleBtn">+ 添加文章</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">粘贴每日英语原文，点击句子即可显示/隐藏中文翻译（自动翻译，可手动补充）</div>
      ${articles.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">还没有文章，点击右上角添加</div></div>' : ''}
      <div style="display:flex;flex-direction:column;gap:8px">
        ${articles.map(a => `<div class="reading-article-item ${a.id===article?.id?'active':''}" data-id="${a.id}">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(a.title||'未命名')}</div>
            <div style="font-size:11px;color:var(--text-muted)">${formatDateCN(a.date)} · ${splitSentences(a.content).length} 句</div>
          </div>
          <button class="action-btn reading-del" data-id="${a.id}" style="opacity:1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>`).join('')}
      </div>
    </div>
    ${article ? renderArticleView(article) : ''}
  `;

  document.getElementById('addArticleBtn').addEventListener('click', () => showArticleModal(container));
  el.querySelectorAll('.reading-article-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.reading-del')) return;
      currentReadingId = item.dataset.id; EnglishPage.render(container);
    });
  });
  el.querySelectorAll('.reading-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      let arr = Store.get('readingArticles', []); arr = arr.filter(a => a.id !== btn.dataset.id);
      Store.set('readingArticles', arr);
      if (currentReadingId === btn.dataset.id) currentReadingId = (arr[0] || {}).id || null;
      EnglishPage.render(container);
    });
  });

  if (article) bindArticleView(el, article, container);
}

function renderArticleView(article) {
  const sentences = splitSentences(article.content);
  const manual = article.translations || {};
  return `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">${escapeHtml(article.title || '未命名')}</div>
        <button class="btn btn-secondary btn-sm" id="toggleAllBtn">显示全部</button>
      </div>
      <div class="reading-list" id="readingList">
        ${sentences.map((s, i) => `
          <div class="reading-sentence" data-idx="${i}" data-text="${encodeURIComponent(s)}">
            <div class="reading-en">${escapeHtml(s)}</div>
            <div class="reading-zh"></div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function bindArticleView(el, article, container) {
  const sentences = splitSentences(article.content);
  const manual = article.translations || {};

  el.querySelector('#toggleAllBtn').addEventListener('click', () => {
    const list = el.querySelector('#readingList');
    const shown = list.querySelectorAll('.reading-sentence.show-translation').length;
    const willShow = shown < sentences.length;
    list.querySelectorAll('.reading-sentence').forEach(s => s.classList.toggle('show-translation', willShow));
    el.querySelector('#toggleAllBtn').textContent = willShow ? '隐藏全部' : '显示全部';
    if (willShow) list.querySelectorAll('.reading-sentence').forEach(s => ensureTranslation(s, article, sentences));
  });

  el.querySelectorAll('.reading-sentence').forEach(s => {
    const idx = parseInt(s.dataset.idx);
    const text = decodeURIComponent(s.dataset.text);
    // 已有手动/缓存翻译先填充
    const cached = (article.translations && article.translations[text]) || Store.get('readingTranslations', {})[text];
    if (cached) { s.querySelector('.reading-zh').textContent = cached; s.classList.add('show-translation'); }
    s.addEventListener('click', () => {
      s.classList.toggle('show-translation');
      const btn = el.querySelector('#toggleAllBtn');
      const list = el.querySelector('#readingList');
      btn.textContent = list.querySelectorAll('.reading-sentence.show-translation').length === sentences.length ? '隐藏全部' : '显示全部';
      if (s.classList.contains('show-translation')) ensureTranslation(s, article, sentences);
    });
  });
}

function ensureTranslation(sentenceEl, article, sentences) {
  const text = decodeURIComponent(sentenceEl.dataset.text);
  const zhEl = sentenceEl.querySelector('.reading-zh');
  if (zhEl.dataset.loaded === '1') return;
  const manual = (article.translations && article.translations[text]);
  if (manual) { zhEl.textContent = manual; zhEl.dataset.loaded = '1'; return; }
  const cache = Store.get('readingTranslations', {});
  if (cache[text] != null) { zhEl.textContent = cache[text]; zhEl.dataset.loaded = '1'; return; }
  zhEl.innerHTML = '<span class="reading-loading">翻译中…</span>';
  translateText(text).then(t => {
    if (t) { zhEl.textContent = t; }
    else {
      zhEl.innerHTML = `<span class="reading-manual">自动翻译失败，手动输入：</span><input class="form-input reading-manual-input" placeholder="输入中文翻译" style="margin-top:6px">`;
      const input = zhEl.querySelector('.reading-manual-input');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const v = input.value.trim(); if (!v) return;
          const arts = Store.get('readingArticles', []);
          const a = arts.find(x => x.id === article.id);
          a.translations = a.translations || {}; a.translations[text] = v; Store.set('readingArticles', arts);
          zhEl.textContent = v; zhEl.dataset.loaded = '1';
        }
      });
    }
    zhEl.dataset.loaded = '1';
  });
}

function showArticleModal(container) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加外刊文章</div>
    <div class="form-group"><label class="form-label">标题（可选）</label><input class="form-input" id="artTitle" placeholder="如：2026-08-12 经济学人"></div>
    <div class="form-group"><label class="form-label">英语原文</label><textarea class="form-textarea" id="artContent" placeholder="粘贴英文文章，系统会自动按句拆分并翻译" style="min-height:160px"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="artCancel">取消</button>
      <button class="btn btn-primary" id="artSave">保存</button>
    </div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('artContent').focus(), 100);
  document.getElementById('artCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('artSave').addEventListener('click', () => {
    const content_text = document.getElementById('artContent').value.trim();
    if (!content_text) return;
    const title = document.getElementById('artTitle').value.trim() || formatDateCN(Store.today());
    const articles = Store.get('readingArticles', []);
    const id = Store.uid();
    articles.unshift({ id, title, content: content_text, date: Store.today(), translations: {}, timestamp: Date.now() });
    Store.set('readingArticles', articles);
    currentReadingId = id;
    modal.style.display = 'none';
    EnglishPage.render(document.getElementById('pageContainer'));
  });
}

// ========== 英语听力（全平台视频链接 + 每日打卡） ==========
function renderListeningPage(el, container) {
  const videos = Store.get('listeningVideos', []);
  const checkins = Store.get('listeningCheckins', []);
  const today = Store.today();
  const isCheckedIn = checkins.includes(today);
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCheckins = checkins.filter(d => d.startsWith(monthStr));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8">
        <div class="card-title" style="margin-bottom:0">🎧 英语听力</div>
        <button class="btn ${isCheckedIn?'btn-success':'btn-primary'} btn-sm" id="listenCheckinBtn" ${isCheckedIn?'disabled':''}>${isCheckedIn?'✓ 今日已听':'今日打卡'}</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">粘贴任意平台听力链接（B站/YouTube/腾讯/优酷等），点击即可跟听</div>
      <button class="add-btn" id="addListenBtn">+ 添加听力材料</button>
    </div>
    <div class="card">
      <div class="card-title">📚 听力材料库 (${videos.length})</div>
      ${videos.length === 0 ? '<div class="empty-state"><div class="empty-state-text">还没有听力材料</div></div>' : ''}
      <div style="display:flex;flex-direction:column;gap:14px">
        ${videos.map(v => `
          <div class="listening-item" data-id="${v.id}">
            <div class="flex-between mb-8">
              <div style="font-size:14px;font-weight:600">${escapeHtml(v.title||'未命名')}</div>
              <button class="action-btn listening-del" data-id="${v.id}" style="opacity:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
            ${renderVideoPlayer(v.url, v.title)}
            ${v.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">${escapeHtml(v.note)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">📅 本月打卡</div>
      <div style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:12px">已听 ${monthCheckins.length}/${daysInMonth} 天</div>
      <div class="checkin-calendar">
        ${['一','二','三','四','五','六','日'].map(w => `<div class="month-weekday">${w}</div>`).join('')}
        ${getMonthDays(now.getFullYear(), now.getMonth()).map(d => {
          const ds = formatDate(d.date); const isToday = ds === today; const checked = checkins.includes(ds);
          return `<div class="checkin-day ${d.otherMonth?'empty':''} ${isToday?'today':''} ${checked?'checked':''}">${d.date.getDate()}</div>`;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('addListenBtn').addEventListener('click', () => showListenModal(container));
  document.getElementById('listenCheckinBtn').addEventListener('click', () => {
    if (isCheckedIn) return;
    const arr = Store.get('listeningCheckins', []); arr.push(today); Store.set('listeningCheckins', arr);
    EnglishPage.render(container);
  });
  el.querySelectorAll('.listening-del').forEach(btn => {
    btn.addEventListener('click', () => {
      let arr = Store.get('listeningVideos', []); arr = arr.filter(x => x.id !== btn.dataset.id);
      Store.set('listeningVideos', arr); EnglishPage.render(container);
    });
  });
  bindVideoPlayers(el);
}

function showListenModal(container) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加听力材料</div>
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="lvTitle" placeholder="如：TED演讲 / BBC六分钟"></div>
    <div class="form-group"><label class="form-label">视频/音频链接（全平台）</label><input class="form-input" id="lvUrl" placeholder="https://..."></div>
    <div class="form-group"><label class="form-label">备注（可选）</label><input class="form-input" id="lvNote" placeholder="如：重点练连读"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="lvCancel">取消</button>
      <button class="btn btn-primary" id="lvSave">保存</button>
    </div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('lvTitle').focus(), 100);
  document.getElementById('lvCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('lvSave').addEventListener('click', () => {
    const url = document.getElementById('lvUrl').value.trim();
    if (!url) return;
    const videos = Store.get('listeningVideos', []);
    videos.unshift({ id: Store.uid(), title: document.getElementById('lvTitle').value.trim() || '未命名', url, note: document.getElementById('lvNote').value.trim(), date: Store.today(), timestamp: Date.now() });
    Store.set('listeningVideos', videos);
    modal.style.display = 'none';
    EnglishPage.render(document.getElementById('pageContainer'));
  });
}
