/**
 * outfit.js — 穿搭助手（衣橱管理 / 今日穿搭 / AI穿搭小助手）
 * 天气取广州实时数据（Open-Meteo 免费接口）。图片本地压缩后存入 localStorage。
 */
import { Store, formatDate, formatDateCN, escapeHtml } from '../store.js';

let outfitTab = 'closet'; // closet | today | ai
const GZ = { lat: 23.13, lon: 113.27 };
let weatherCache = null;

export const OutfitPage = {
  render(container) {
    container.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${outfitTab==='closet'?'active':''}" data-ot="closet">👗 衣橱管理</button>
        <button class="sub-tab ${outfitTab==='today'?'active':''}" data-ot="today">📸 今日穿搭</button>
        <button class="sub-tab ${outfitTab==='ai'?'active':''}" data-ot="ai">🤖 AI小助手</button>
      </div>
      <div id="outfitWeather" class="outfit-weather"></div>
      <div id="outfitContent"></div>
    `;
    container.querySelectorAll('.sub-tab[data-ot]').forEach(t => t.addEventListener('click', () => { outfitTab = t.dataset.ot; OutfitPage.render(container); }));
    refreshWeather(document.getElementById('outfitWeather'));
    const content = document.getElementById('outfitContent');
    if (outfitTab === 'closet') renderCloset(content);
    else if (outfitTab === 'today') renderToday(content);
    else renderAI(content);
  }
};

// ========== 天气 ==========
function wmoText(code) {
  const m = { 0:'晴', 1:'晴间多云', 2:'局部多云', 3:'阴', 45:'雾', 48:'雾凇', 51:'毛毛雨', 53:'小雨', 55:'中雨', 61:'小雨', 63:'中雨', 65:'大雨', 71:'小雪', 73:'中雪', 75:'大雪', 80:'阵雨', 81:'阵雨', 82:'强阵雨', 95:'雷阵雨', 96:'雷阵雨伴雹' };
  return m[code] || '未知';
}
function tempSeason(t) { return t < 10 ? '冬' : t < 18 ? '春秋' : t < 26 ? '春秋' : '夏'; }

async function refreshWeather(box) {
  if (!box) return;
  box.innerHTML = `<div style="font-size:12px;color:var(--text-muted)">🌤️ 正在获取广州天气…</div>`;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${GZ.lat}&longitude=${GZ.lon}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    const data = await res.json();
    const t = Math.round(data.current.temperature_2m);
    const txt = wmoText(data.current.weather_code);
    weatherCache = { temp: t, text: txt, season: tempSeason(t) };
    box.innerHTML = `<div class="ow-card"><span class="ow-temp">${t}°C</span><span class="ow-cond">${txt}</span><span class="ow-loc">📍 广州 · 实时</span><button class="ow-refresh" id="owRefresh">刷新</button></div>`;
    const r = document.getElementById('owRefresh');
    if (r) r.addEventListener('click', () => refreshWeather(box));
    // 若当前在今日/AI页，重渲以应用天气
    if (outfitTab !== 'closet') { const c = document.getElementById('outfitContent'); if (c) { if (outfitTab === 'today') renderToday(c); else renderAI(c); } }
  } catch (e) {
    weatherCache = { temp: 24, text: '晴', season: '夏' };
    box.innerHTML = `<div class="ow-card"><span class="ow-temp">24°C</span><span class="ow-cond">晴(默认)</span><span class="ow-loc">📍 广州</span><button class="ow-refresh" id="owRefresh">重试</button></div><div style="font-size:11px;color:var(--text-muted);text-align:center">天气获取失败，已用默认值（请检查网络）</div>`;
    const r = document.getElementById('owRefresh');
    if (r) r.addEventListener('click', () => refreshWeather(box));
  }
}

// ========== 图片压缩 ==========
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, maxSize / Math.max(img.width, img.height)); const w = Math.round(img.width * s), h = Math.round(img.height * s); const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); resolve(cv.toDataURL('image/jpeg', quality || 0.7)); }; img.onerror = reject; img.src = reader.result; };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

const CATEGORIES = ['上装', '下装', '外套', '鞋', '配饰'];
const SEASONS = ['春', '夏', '秋', '冬'];
const STYLES = ['通勤', '休闲', '运动', '甜美', '简约', '复古'];

// ========== 衣橱管理 ==========
function renderCloset(el) {
  const items = Store.get('wardrobe', []);
  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-8"><div class="card-title" style="margin-bottom:0">👗 我的衣橱（${items.length} 件）</div><button class="btn btn-primary btn-sm" id="addItemBtn">+ 添加衣物</button></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">支持拍照/相册上传，录入品类·颜色·季节·风格；可标记闲置 / 常穿。</div>
      ${items.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">👕</div><div class="empty-state-text">衣橱还是空的，点右上角添加第一件</div></div>' : ''}
      <div class="closet-grid">${items.map(it => `
        <div class="closet-item ${it.status==='idle'?'idle':''} ${it.status==='often'?'often':''}">
          ${it.image ? `<img class="closet-img" src="${it.image}" alt="">` : `<div class="closet-img closet-img-empty">${categoryEmoji(it.category)}</div>`}
          <div class="closet-meta">
            <div class="closet-name">${escapeHtml(it.name)}</div>
            <div class="closet-tags"><span>${escapeHtml(it.category)}</span><span style="color:${it.color}">●${escapeHtml(it.color)}</span><span>${escapeHtml(it.season)}</span><span>${escapeHtml(it.style)}</span></div>
            <div class="closet-actions">
              <button class="closet-tag-btn ${it.status==='often'?'active':''}" data-act="often" data-id="${it.id}">常穿</button>
              <button class="closet-tag-btn ${it.status==='idle'?'active':''}" data-act="idle" data-id="${it.id}">闲置</button>
              <button class="closet-tag-btn" data-act="edit" data-id="${it.id}">编辑</button>
              <button class="closet-tag-btn del" data-act="del" data-id="${it.id}">删除</button>
            </div>
          </div>
        </div>`).join('')}</div>
    </div>
  `;
  document.getElementById('addItemBtn').addEventListener('click', () => showItemModal(null, el));
  el.querySelectorAll('.closet-tag-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id, act = b.dataset.act; let arr = Store.get('wardrobe', []);
    const it = arr.find(x => x.id === id); if (!it) return;
    if (act === 'del') { arr = arr.filter(x => x.id !== id); }
    else if (act === 'edit') { showItemModal(it, el); return; }
    else { it.status = (it.status === act) ? 'normal' : act; }
    Store.set('wardrobe', arr); renderCloset(el);
  }));
}

function categoryEmoji(cat) { return ({ '上装':'👕', '下装':'👖', '外套':'🧥', '鞋':'👟', '配饰':'👜' })[cat] || '👚'; }

function showItemModal(item, el) {
  const modal = document.getElementById('genericModal'); const c = document.getElementById('genericModalContent');
  const it = item || {};
  c.innerHTML = `
    <div class="modal-title">${item ? '编辑衣物' : '添加衣物'}</div>
    <input type="file" id="itemPhoto" accept="image/*" capture="environment" style="display:none">
    <button class="btn btn-secondary btn-sm" id="itemPhotoBtn" style="width:100%;margin-bottom:8px">📷 拍照/上传图片</button>
    <div id="itemPreview" style="text-align:center;margin-bottom:8px">${it.image ? `<img src="${it.image}" style="max-height:140px;border-radius:8px">` : ''}</div>
    <div class="form-group"><label class="form-label">名称</label><input class="form-input" id="iName" placeholder="如：白色衬衫" value="${it.name||''}"></div>
    <div class="form-group"><label class="form-label">品类</label><select class="form-input" id="iCat">${CATEGORIES.map(x => `<option ${it.category===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">颜色</label><input class="form-input" id="iColor" placeholder="如：白/黑/藏青" value="${it.color||''}"></div>
      <div class="form-group"><label class="form-label">季节</label><select class="form-input" id="iSeason">${SEASONS.map(x => `<option ${it.season===x?'selected':''}>${x}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">风格</label><select class="form-input" id="iStyle">${STYLES.map(x => `<option ${it.style===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="modal-actions"><button class="btn btn-secondary" id="iCancel">取消</button><button class="btn btn-primary" id="iSave">保存</button></div>
  `;
  modal.style.display = 'flex';
  let photo = it.image || null;
  document.getElementById('iCancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('itemPhotoBtn').addEventListener('click', () => document.getElementById('itemPhoto').click());
  document.getElementById('itemPhoto').addEventListener('change', () => { const f = document.getElementById('itemPhoto').files[0]; if (!f) return; compressImage(f, 480, 0.7).then(d => { photo = d; document.getElementById('itemPreview').innerHTML = `<img src="${d}" style="max-height:140px;border-radius:8px">`; }).catch(() => showToast('图片读取失败')); });
  document.getElementById('iSave').addEventListener('click', () => {
    const name = document.getElementById('iName').value.trim(); if (!name) { showToast('请填写名称'); return; }
    const arr = Store.get('wardrobe', []);
    if (item) { Object.assign(item, { name, category: document.getElementById('iCat').value, color: document.getElementById('iColor').value.trim(), season: document.getElementById('iSeason').value, style: document.getElementById('iStyle').value, image: photo }); }
    else arr.push({ id: Store.uid(), name, category: document.getElementById('iCat').value, color: document.getElementById('iColor').value.trim(), season: document.getElementById('iSeason').value, style: document.getElementById('iStyle').value, image: photo, status: 'normal', timestamp: Date.now() });
    Store.set('wardrobe', arr); modal.style.display = 'none'; renderCloset(el);
  });
}

// ========== 今日穿搭 ==========
function renderToday(el) {
  const items = Store.get('wardrobe', []);
  const history = Store.get('outfitHistory', []);
  const w = weatherCache;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">📸 记录今日穿搭</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">上传当日穿搭照片，勾选用到的衣橱单品，AI 会按当天天气评估是否合适并给出优化建议。</div>
      <input type="file" id="todayPhoto" accept="image/*" capture="environment" style="display:none">
      <button class="btn btn-secondary btn-sm" id="todayPhotoBtn" style="width:100%;margin-bottom:8px">📷 拍照/上传穿搭照片</button>
      <div id="todayPreview" style="text-align:center;margin-bottom:8px"></div>
      <div style="font-size:13px;font-weight:600;margin:6px 0">绑定衣橱单品</div>
      ${items.length === 0 ? '<div style="font-size:12px;color:var(--text-muted)">还没有衣橱单品，先去「衣橱管理」添加。</div>' : '<div class="today-pick">'+items.map(it => `<label class="today-pick-item"><input type="checkbox" data-id="${it.id}"><span>${it.image?`<img src="${it.image}" class="tp-thumb">`:categoryEmoji(it.category)} ${escapeHtml(it.name)}</span></label>`).join('')+'</div>'}
      <button class="btn btn-primary btn-sm" id="todayEval" style="width:100%;margin-top:10px">✨ AI 评估并保存</button>
    </div>
    <div id="todayResult"></div>
    <div class="card">
      <div class="card-title">📅 穿搭历史</div>
      ${history.length === 0 ? '<div class="empty-state"><div class="empty-state-text">还没有记录</div></div>' : history.slice(0, 12).map(h => `<div class="date-fold"><div class="date-fold-header" onclick="this.parentElement.classList.toggle('open')"><svg class="date-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>${formatDateCN(h.date)}<span class="date-fold-count">${h.items.length}件</span></div><div class="date-fold-body">${h.photo?`<img src="${h.photo}" style="max-width:100%;border-radius:8px;margin-bottom:6px">`:''}<div style="font-size:13px;color:var(--text-secondary)">${escapeHtml(h.items.map(id=>{const x=items.find(i=>i.id===id);return x?x.name:'';}).filter(Boolean).join('、')||'—')}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">${escapeHtml(h.advice||'')}</div><div style="font-size:13px;color:var(--primary);margin-top:4px">${escapeHtml(h.cheer||'')}</div></div></div>`).join('')}
    </div>
  `;
  let photo = null;
  document.getElementById('todayPhotoBtn').addEventListener('click', () => document.getElementById('todayPhoto').click());
  document.getElementById('todayPhoto').addEventListener('change', () => { const f = document.getElementById('todayPhoto').files[0]; if (!f) return; compressImage(f, 640, 0.72).then(d => { photo = d; document.getElementById('todayPreview').innerHTML = `<img src="${d}" style="max-height:200px;border-radius:8px">`; }).catch(() => showToast('图片读取失败')); });
  document.getElementById('todayEval').addEventListener('click', () => {
    const ids = [...el.querySelectorAll('.today-pick-item input:checked')].map(x => x.dataset.id);
    const picked = items.filter(i => ids.includes(i.id));
    const ev = evaluateOutfit(picked, w);
    const record = { id: Store.uid(), date: Store.today(), photo, items: ids, advice: ev.advice, cheer: ev.cheer, timestamp: Date.now() };
    const hist = Store.get('outfitHistory', []); hist.unshift(record); Store.set('outfitHistory', hist);
    document.getElementById('todayResult').innerHTML = `<div class="card ai-result-card"><div class="card-title">🤖 穿搭评估</div><div style="font-size:13px;color:var(--text-secondary);white-space:pre-line">${escapeHtml(ev.advice)}</div><div class="cheer">${escapeHtml(ev.cheer)}</div></div>`;
    showToast('已记录今日穿搭 ✅');
    renderToday(el);
  });
}

function evaluateOutfit(items, w) {
  const t = w ? w.temp : 24; const season = w ? w.season : '夏'; const cond = w ? w.text : '晴';
  const lines = [`📍 今日广州 ${t}°C · ${cond}`];
  let fitCount = 0;
  items.forEach(it => { const ok = (it.season === season) || (season === '春秋' && (it.season === '春' || it.season === '秋')) || (t >= 26 && (it.season === '夏')) || (t < 10 && it.season === '冬'); if (ok) fitCount++; else lines.push(`⚠️ 「${it.name}」标注季节为${it.season}，与今日${season}略有出入，可视体感调整。`); });
  if (items.length === 0) lines.push('未绑定单品，无法评估具体搭配。');
  else if (fitCount === items.length) lines.push('✅ 季节契合度很好，放心穿～');
  // 天气建议
  if (t < 10) lines.push('🧥 偏冷：建议叠穿，外套/羽绒+内搭，注意颈胸保暖。');
  else if (t < 18) lines.push('🧥 微凉：长袖/薄针织+外套刚好，早晚加一件。');
  else if (t > 28) lines.push('☀️ 炎热：选透气短袖/阔腿裤，浅色更凉快，记得防晒。');
  else lines.push('🌤️ 舒适：薄外套+长裤/裙皆宜，体感刚好。');
  if (/雨/.test(cond)) lines.push('☂️ 有雨：鞋子选防泼水，带伞。');
  const cheers = ['今天的你，刚刚好 ✨', '这一身很有你的味道 🌟', '自信就是最好的配饰 💫', '清爽利落，状态在线 🌿', '穿搭自由，心情也自由 🌈'];
  return { advice: lines.join('\n'), cheer: cheers[Math.floor(Math.random() * cheers.length)] };
}

// ========== AI 穿搭小助手 ==========
function renderAI(el) {
  const items = Store.get('wardrobe', []);
  const chat = Store.get('outfitChat', []);
  const w = weatherCache;
  const plans = generateOutfits(items, w);
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🤖 今日搭配方案${w?`（${w.temp}°C·${w.text}）`:''}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">根据衣橱现有单品 + 实时天气，自动生成多套方案。</div>
      ${items.length === 0 ? '<div class="empty-state"><div class="empty-state-text">衣橱为空，先去添加衣物才能生成方案</div></div>' : plans.map((p, i) => `<div class="outfit-plan"><div class="op-head">方案 ${i+1} · ${p.scene}</div><div class="op-items">${p.items.map(n=>`<span class="op-item">${escapeHtml(n)}</span>`).join('')}</div><div class="op-tip">${escapeHtml(p.tip)}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">💬 自由问问搭配</div>
      <div class="chat-box" id="chatBox">${chat.length === 0 ? '<div class="chat-empty">试着问：热天通勤怎么穿？约会穿什么？我有黑色连衣裙怎么搭？</div>' : chat.map(m => `<div class="chat-msg ${m.role}">${escapeHtml(m.text)}</div>`).join('')}</div>
      <div class="flex-between" style="gap:8px;margin-top:8px">
        <input class="form-input" id="chatInput" placeholder="输入你的问题…" style="flex:1">
        <button class="btn btn-primary btn-sm" id="chatSend">发送</button>
      </div>
    </div>
  `;
  const box = document.getElementById('chatBox'); const input = document.getElementById('chatInput');
  const send = () => { const q = input.value.trim(); if (!q) return; const c = Store.get('outfitChat', []); c.push({ role: 'me', text: q }); const ans = aiReply(q, items, w); c.push({ role: 'ai', text: ans }); Store.set('outfitChat', c.slice(-40)); renderAI(el); };
  document.getElementById('chatSend').addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}

function classifyCat(name) {
  const n = name || '';
  if (/外套|大衣|羽绒|风衣|夹克|西装外套/.test(n)) return '外套';
  if (/裤|裙/.test(n)) return '下装';
  if (/鞋|靴/.test(n)) return '鞋';
  if (/包|帽|围巾|项链|耳环|眼镜|腰带/.test(n)) return '配饰';
  return '上装';
}

function generateOutfits(items, w) {
  const season = (w && w.season) || '夏';
  const t = w ? w.temp : 24;
  const cand = items.filter(it => it.status !== 'idle');
  const byCat = (cat) => cand.filter(it => classifyCat(it.name) === cat || it.category === cat);
  const plans = [];
  const scenes = t > 28 ? ['清凉通勤', '周末休闲'] : t < 12 ? ['保暖通勤', '周末暖搭'] : ['通勤利落', '周末休闲', '轻约会'];
  scenes.forEach(scene => {
    const tops = byCat('上装'); const bots = byCat('下装'); const outs = byCat('外套'); const shoes = byCat('鞋');
    const pick = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)].name : '（衣橱缺该类，待补充）';
    const needOuter = (t < 18);
    const parts = [pick(tops), pick(bots)];
    if (needOuter) parts.push(pick(outs));
    parts.push(pick(shoes));
    const tip = t > 28 ? '天气热，优先透气浅色；可加配饰提亮点。' : t < 12 ? '低温叠穿更暖，外套选羽绒/大衣。' : '体感舒适，上浅下深更显高。';
    plans.push({ scene, items: parts, tip });
  });
  return plans;
}

function aiReply(q, items, w) {
  const t = w ? w.temp : 24; const season = w ? w.season : '夏'; const cond = w ? w.text : '晴';
  const Q = q.toLowerCase();
  const has = (kw) => q.includes(kw);
  if (has('热') || has('夏天') || has('高温') || t > 28) return `广州今天 ${t}°C 偏热，建议：透气短袖/真丝衬衫 + 阔腿裤/裙，浅色更凉快；户外记得防晒帽/墨镜。你衣橱里偏夏的单品（标注"夏"）现在最合适。`;
  if (has('冷') || has('冬天') || has('降温') || t < 12) return `今天 ${t}°C 偏冷，推荐叠穿：内搭毛衣/高领 + 羽绒或呢大衣 + 围巾，下身厚裤/加绒裤。你衣橱里标注"冬"的单品用起来。`;
  if (has('通勤') || has('上班')) return `通勤建议简约得体：衬衫/针织 + 烟管裤/直筒裤 + 乐福鞋或低跟；外套选中性色大衣/西装。避免过于运动或拖地长裙。`;
  if (has('约会') || has('聚会')) return `约会可以稍微亮一点：合身上衣 + 半裙/修身裤，加一件配饰（项链/丝巾）点睛；颜色上选让你气色好的，不必全身一个色。`;
  if (has('运动')) return `运动选透气速干套装 + 运动鞋，外搭轻薄防晒衣；出汗后及时换下，避免着凉。`;
  if (has('面试')) return `面试走"安全牌"：纯色衬衫/西装 + 深色西裤/及膝裙 + 黑色皮鞋，干净利落最稳。配饰少而精。`;
  if (has('颜色') || has('配色') || has('搭配')) return `配色法则：同色系显高显瘦；上浅下深最稳妥；全身不超过 3 个主色。亮色单品做点睛，别俩亮色互撞。`;
  if (has('风格')) return `你衣橱里偏「${[...new Set(items.map(i=>i.style))].join('/')||'—'}」风格。想换风格就从一件基础款（白衬衫/直筒裤）开始，它几乎适配所有风格。`;
  // 衣橱单品相关
  const matched = items.filter(i => q.includes(i.name) || i.name.includes(q.replace(/[怎么搭怎么穿搭配]/g,'')));
  if (matched.length) return `「${matched[0].name}」可以这样搭：作为${classifyCat(matched[0].name)}，配${season}季的下装/外套，颜色走同色系或上浅下深。需要更具体可以告诉我场景（通勤/约会/周末）。`;
  return `我可以帮你按「${season}季·${t}°C·${cond}」给搭配建议～ 试试问我：热天通勤怎么穿？约会穿什么？或者"我有XX怎么搭？"（XX 用你衣橱里的单品名）。`;
}
