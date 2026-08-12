/**
 * sync.js — 跨设备云端同步（基于 GitHub Gist）
 *
 * 痛点：localStorage 是单设备存储，电脑上记的数据手机上看不到。
 * 方案：用 GitHub Gist 作为云端存储，按 key 时间戳做合并（避免后写的覆盖先写的），
 *       启动时拉取、每次 Store.set 自动防抖上传。token 仅存于本机 localStorage。
 *
 * 注意：token 需要 gist 权限（fine-grained token 勾选 Gist: Read and write）。
 */

import { Store } from './store.js';

const PREFIX = 'lyyy_';
const GIST_FILE = 'lyyy-workspace-data.json';

let token = '';
let gistId = '';
let enabled = false;
let pushTimer = null;
let seenRev = 0;
let keyTimes = {};

// ========== 初始化 ==========
export function initSync(onPulled) {
  token = Store.get('syncToken', '');
  gistId = Store.get('syncGistId', '');
  keyTimes = Store.get('syncMeta', {});
  wireStore();
  bindUI(onPulled);
  if (token && gistId) {
    enabled = true;
    setIndicator('syncing', '同步中…');
    pullAll(onPulled);
  } else {
    setIndicator('local', '本地');
  }
}

// 包装 Store.set：本地写入后立即记录时间戳并安排上传
function wireStore() {
  const orig = Store.set.bind(Store);
  Store.set = (k, v) => {
    orig(k, v);
    if (enabled && k !== 'syncMeta') {
      keyTimes[k] = Date.now();
      schedulePush();
    }
  };
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushAll, 1200);
}

// ========== 上传（防抖触发） ==========
async function pushAll() {
  if (!enabled || !token) return;
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i);
    if (full && full.startsWith(PREFIX)) {
      const k = full.slice(PREFIX.length);
      try { data[k] = JSON.parse(localStorage.getItem(full)); }
      catch { data[k] = localStorage.getItem(full); }
    }
  }
  const body = { rev: seenRev + 1, data, meta: keyTimes };
  try {
    const res = await fetch('https://api.github.com/gists/' + gistId, {
      method: 'PATCH',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(body) } } })
    });
    if (res.status === 404) { await createGist(body); }
    else if (!res.ok) { setIndicator('error', '同步失败'); }
    else { seenRev = body.rev; saveMeta(); setIndicator('synced', '已同步'); }
  } catch (e) {
    setIndicator('error', '同步失败');
  }
}

async function createGist(body) {
  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ public: false, files: { [GIST_FILE]: { content: JSON.stringify(body) } } })
    });
    if (!res.ok) { setIndicator('error', '创建失败'); return; }
    const gist = await res.json();
    gistId = gist.id;
    Store.set('syncGistId', gistId);
    seenRev = body.rev;
    saveMeta();
    setIndicator('synced', '已同步');
  } catch (e) {
    setIndicator('error', '创建失败');
  }
}

// ========== 拉取 ==========
async function pullAll(onPulled) {
  try {
    const res = await fetch('https://api.github.com/gists/' + gistId, {
      headers: { 'Authorization': 'token ' + token }
    });
    if (!res.ok) { setIndicator('error', '同步失败'); return; }
    const gist = await res.json();
    const raw = gist.files && gist.files[GIST_FILE] ? gist.files[GIST_FILE].content : null;
    if (!raw) { setIndicator('synced', '已同步'); return; }
    const remote = JSON.parse(raw);
    if (remote.rev > seenRev) {
      applyRemote(remote);
      seenRev = remote.rev;
      setIndicator('synced', '已同步');
      if (onPulled) onPulled();
    } else {
      setIndicator('synced', '已同步');
    }
  } catch (e) {
    setIndicator('error', '同步失败');
  }
}

// 按 key 时间戳合并：仅当远端该 key 更新时覆盖本地
function applyRemote(remote) {
  const meta = remote.meta || {};
  for (const k in remote.data) {
    const rt = meta[k] || 0;
    const lt = keyTimes[k] || 0;
    if (rt > lt) {
      localStorage.setItem(PREFIX + k, JSON.stringify(remote.data[k]));
      keyTimes[k] = rt;
    }
  }
  saveMeta();
}

function saveMeta() { Store.set('syncMeta', keyTimes); }

// ========== UI 指示 ==========
function setIndicator(state, text) {
  const dot = document.querySelector('#syncIndicator .sync-dot');
  const txt = document.querySelector('#syncIndicator .sync-text');
  if (txt) txt.textContent = text;
  if (dot) dot.className = 'sync-dot ' + state;
  const full = document.getElementById('syncStatusFull');
  if (full) {
    const fdot = full.querySelector('.sync-dot');
    const ftxt = full.querySelector('span:last-child');
    if (ftxt) ftxt.textContent = text;
    if (fdot) fdot.className = 'sync-dot ' + state;
  }
}

function bindUI(onPulled) {
  const ind = document.getElementById('syncIndicator');
  const full = document.getElementById('syncStatusFull');
  if (ind) ind.style.cursor = 'pointer';
  if (ind) ind.addEventListener('click', () => openSyncSettings(onPulled));
  if (full) full.style.cursor = 'pointer';
  if (full) full.addEventListener('click', () => openSyncSettings(onPulled));
}

// ========== 同步设置弹窗 ==========
function openSyncSettings(onPulled) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  const cur = enabled ? '已连接 · 数据将自动在设备间同步' : '未连接 · 数据仅存于本机';
  content.innerHTML = `
    <div class="modal-title">☁️ 跨设备同步设置</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${cur}。<br>用 GitHub Gist 作云端。需要一个有 <b>gist</b> 权限的 Personal Access Token（fine-grained 勾选 Gist: Read and write）。Token 仅存于本机浏览器。</div>
    <div class="form-group"><label class="form-label">GitHub Token</label><input class="form-input" id="syncToken" type="password" placeholder="github_pat_..." value="${token}"></div>
    <div class="form-group"><label class="form-label">Gist ID（留空则自动创建）</label><input class="form-input" id="syncGist" placeholder="可选，留空自动新建" value="${gistId}"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-primary btn-sm" id="syncSave" style="flex:1">保存并连接</button>
      <button class="btn btn-secondary btn-sm" id="syncNow" style="flex:1">立即同步</button>
      <button class="btn btn-secondary btn-sm" id="syncDisconnect" style="flex:1">断开</button>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:12px">说明：同步按数据项时间戳合并，正常交替使用不会丢数据；若两设备同时离线各改各的，同一项的后改覆盖先改。用完建议撤销该 token。</div>
  `;
  modal.style.display = 'flex';
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('syncSave').addEventListener('click', () => {
    token = document.getElementById('syncToken').value.trim();
    gistId = document.getElementById('syncGist').value.trim();
    if (!token) { showSyncToast('请填写 Token'); return; }
    Store.set('syncToken', token);
    if (gistId) Store.set('syncGistId', gistId);
    enabled = true;
    modal.style.display = 'none';
    setIndicator('syncing', '同步中…');
    pullAll(onPulled).then(() => pushAll());
  });
  document.getElementById('syncNow').addEventListener('click', () => {
    if (!enabled) { showSyncToast('请先保存并连接'); return; }
    setIndicator('syncing', '同步中…');
    pullAll(onPulled).then(() => pushAll());
  });
  document.getElementById('syncDisconnect').addEventListener('click', () => {
    enabled = false;
    Store.set('syncToken', '');
    Store.set('syncGistId', '');
    token = ''; gistId = '';
    modal.style.display = 'none';
    setIndicator('local', '本地');
    showSyncToast('已断开，数据仅存本机');
  });
}

function showSyncToast(msg) {
  // 复用 app.js 全局 toast（若存在）
  if (typeof window.showToast === 'function') window.showToast(msg);
  else alert(msg);
}
