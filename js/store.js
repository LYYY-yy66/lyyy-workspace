/**
 * store.js — localStorage 数据持久化层
 * 所有数据的读写、自动保存、日期折叠逻辑
 */

const STORAGE_PREFIX = 'lyyy_';

export const Store = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch { return defaultValue; }
  },

  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) { console.warn('Storage write failed:', e); }
  },

  remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  // 生成唯一ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 获取今天日期字符串 YYYY-MM-DD
  today() {
    return formatDate(new Date());
  },

  // 按日期分组折叠
  groupByDate(items, dateField = 'date') {
    const groups = {};
    items.forEach(item => {
      const d = item[dateField] || 'unknown';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }
};

export function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateCN(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function getWeekDays(baseDate = new Date()) {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - (day === 0 ? 6 : day - 1));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

export function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days = [];
  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, otherMonth: true });
  }
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), otherMonth: false });
  }
  // Next month padding
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), otherMonth: true });
  }
  return days;
}

export function getRelativeDate(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff === -1) return '昨天';
  if (diff > 2 && diff <= 7) return `${diff}天后`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)}天前`;
  return formatDateCN(dateStr);
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
