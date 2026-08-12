/**
 * app.js — 主应用入口、路由、侧边栏、计时器
 */
import { Store } from './store.js';
import { initSync, maybeShowOnboarding } from './sync.js';
import { TodoPage } from './pages/todo.js';
import { HealthPage } from './pages/health.js';
import { EnglishPage } from './pages/english.js';
import { TaxPage } from './pages/tax.js';
import { FinancePage } from './pages/finance.js';

const pages = { todo: TodoPage, health: HealthPage, english: EnglishPage, tax: TaxPage, finance: FinancePage };
let currentPage = 'todo';

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initTimer();
  navigateTo(Store.get('currentPage', 'todo'));
  // 跨设备云端同步（若有 token 则自动拉取；点击顶栏/侧栏状态可设置）
  initSync(() => navigateTo(currentPage));
  // 首次访问引导：教用户怎么开电脑/手机同步（看过或已连接则不再弹）
  maybeShowOnboarding();
});

// ========== 路由导航 ==========
function navigateTo(page) {
  currentPage = page;
  Store.set('currentPage', page);

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Render page
  const container = document.getElementById('pageContainer');
  container.style.animation = 'none';
  container.offsetHeight; // trigger reflow
  container.style.animation = 'fadeIn 0.3s ease';

  if (pages[page]) {
    pages[page].render(container);
  }

  // Show/hide timer FAB
  document.getElementById('timerFab').style.display = page === 'todo' ? 'flex' : 'none';

  // Close sidebar on mobile
  closeSidebar();
}

// ========== 侧边栏 ==========
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuBtn = document.getElementById('menuToggle');

  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ========== 番茄计时器 ==========
let timerState = { running: false, isWork: true, seconds: 25 * 60, interval: null, taskName: '' };

function initTimer() {
  const fab = document.getElementById('timerFab');
  const modal = document.getElementById('timerModal');
  const toggleBtn = document.getElementById('timerToggle');
  const stopBtn = document.getElementById('timerStop');
  const closeBtn = document.getElementById('timerClose');

  fab.addEventListener('click', () => { modal.style.display = 'flex'; });
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  toggleBtn.addEventListener('click', () => {
    if (timerState.running) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  stopBtn.addEventListener('click', () => {
    resetTimer();
  });
}

function startTimer() {
  if (timerState.isWork && !timerState.taskName) {
    showTaskNameModal((name) => {
      timerState.taskName = name || '未命名';
      doStartTimer();
    });
    return;
  }
  doStartTimer();
}

function showTaskNameModal(callback) {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">这次专注什么？</div>
    <div class="form-group">
      <label class="form-label">任务名称</label>
      <input class="form-input" id="taskNameInput" placeholder="如：学英语、写代码、看书" autofocus>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelTaskNameBtn">取消</button>
      <button class="btn btn-primary" id="confirmTaskNameBtn">开始专注</button>
    </div>
  `;
  modal.style.display = 'flex';
  const input = document.getElementById('taskNameInput');
  setTimeout(() => input.focus(), 100);
  document.getElementById('cancelTaskNameBtn').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('confirmTaskNameBtn').addEventListener('click', () => {
    const name = input.value.trim();
    modal.style.display = 'none';
    callback(name);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { document.getElementById('confirmTaskNameBtn').click(); }
  });
}

function doStartTimer() {
  timerState.running = true;
  document.getElementById('timerToggle').textContent = '暂停';
  document.getElementById('timerLabel').textContent = timerState.isWork ? timerState.taskName : '休息时间';
  timerState.interval = setInterval(() => {
    timerState.seconds--;
    updateTimerDisplay();
    if (timerState.seconds <= 0) {
      timerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  timerState.running = false;
  clearInterval(timerState.interval);
  document.getElementById('timerToggle').textContent = '继续';
}

function resetTimer() {
  clearInterval(timerState.interval);
  timerState.running = false;
  timerState.isWork = true;
  timerState.taskName = '';
  timerState.seconds = 25 * 60;
  document.getElementById('timerToggle').textContent = '开始';
  document.getElementById('timerLabel').textContent = '工作时间';
  document.getElementById('timerCircle').classList.remove('rest');
  updateTimerDisplay();
}

function timerComplete() {
  clearInterval(timerState.interval);
  timerState.running = false;

  // Save timer record
  if (timerState.isWork) {
    const records = Store.get('timerRecords', []);
    records.push({
      id: Store.uid(),
      type: 'work',
      taskName: timerState.taskName,
      duration: 25,
      date: Store.today(),
      timestamp: Date.now()
    });
    Store.set('timerRecords', records);
  }

  // Switch mode
  if (timerState.isWork) {
    timerState.isWork = false;
    timerState.seconds = 5 * 60;
    document.getElementById('timerLabel').textContent = '休息时间';
    document.getElementById('timerCircle').classList.add('rest');
    showToast('工作完成！休息 5 分钟 ☕');
  } else {
    timerState.isWork = true;
    timerState.taskName = '';
    timerState.seconds = 25 * 60;
    document.getElementById('timerLabel').textContent = '工作时间';
    document.getElementById('timerCircle').classList.remove('rest');
    showToast('休息结束！开始新一轮工作 💪');
  }

  document.getElementById('timerToggle').textContent = '开始';
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const min = Math.floor(timerState.seconds / 60);
  const sec = timerState.seconds % 60;
  document.getElementById('timerTime').textContent =
    `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ========== Toast 提示 ==========
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: var(--text-primary); color: #fff; padding: 12px 24px;
    border-radius: 24px; font-size: 14px; z-index: 9999;
    animation: fadeIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => toast.remove(), 3000);
}

export { showToast };
window.showToast = showToast;
window.navigateToCurrentPage = () => navigateTo(currentPage);
