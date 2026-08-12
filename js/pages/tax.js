/**
 * tax.js — 税务师备考进度页面
 */
import { Store, formatDateCN, escapeHtml } from '../store.js';

export const TaxPage = {
  render(container) {
    const subjects = Store.get('taxSubjects', getDefaultSubjects());
    const notes = Store.get('taxNotes', []);

    container.innerHTML = `
      <div class="card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          税务师备考科目
        </div>
        ${subjects.map((subj, si) => {
          const doneCount = subj.chapters.filter(c => c.done).length;
          const total = subj.chapters.length;
          const percent = total > 0 ? Math.round(doneCount / total * 100) : 0;
          return `
          <div class="tax-subject" data-index="${si}">
            <div class="tax-subject-header">
              <div>
                <div class="tax-subject-name">${subj.icon} ${escapeHtml(subj.name)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${doneCount}/${total} 章节完成 · ${percent}%</div>
              </div>
              <div style="position:relative;width:44px;height:44px">
                <svg width="44" height="44" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#e8ecf1" stroke-width="4"/>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="var(--primary)" stroke-width="4"
                    stroke-dasharray="${113.1}" stroke-dashoffset="${113.1 * (1 - percent/100)}"
                    transform="rotate(-90 22 22)" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary)">${percent}%</div>
              </div>
            </div>
            <div class="tax-chapters" style="display:none">
              ${subj.chapters.map((ch, ci) => `
                <div class="tax-chapter">
                  <div class="tax-chapter-check ${ch.done?'done':''}" data-subject="${si}" data-chapter="${ci}"></div>
                  <span style="flex:1">${escapeHtml(ch.name)}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${ch.duration || ''}</span>
                </div>
              `).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>

      <button class="add-btn" id="addSubjectBtn">+ 添加科目/章节</button>

      <div class="card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          备考笔记
        </div>
        ${notes.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无笔记</div></div>' : ''}
        ${notes.slice().reverse().map((n, i) => `
          <div class="meal-card">
            <div class="meal-icon" style="background:#e2d9f3">📝</div>
            <div class="meal-info">
              <div class="meal-name">${escapeHtml(n.title)}</div>
              <div class="meal-time">${formatDateCN(n.date)}</div>
              <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${escapeHtml(n.content).substring(0, 100)}${n.content.length > 100 ? '...' : ''}</div>
            </div>
            <button class="action-btn note-delete" data-id="${n.id}" style="opacity:1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `).join('')}
        <button class="add-btn" id="addNoteBtn">+ 添加笔记</button>
      </div>
    `;

    // Toggle chapters
    container.querySelectorAll('.tax-subject').forEach(subj => {
      subj.addEventListener('click', (e) => {
        if (e.target.closest('.tax-chapter-check')) return;
        const chapters = subj.querySelector('.tax-chapters');
        chapters.style.display = chapters.style.display === 'none' ? 'flex' : 'none';
      });
    });

    // Toggle chapter completion
    container.querySelectorAll('.tax-chapter-check').forEach(check => {
      check.addEventListener('click', () => {
        const si = parseInt(check.dataset.subject);
        const ci = parseInt(check.dataset.chapter);
        const subjects = Store.get('taxSubjects', getDefaultSubjects());
        subjects[si].chapters[ci].done = !subjects[si].chapters[ci].done;
        Store.set('taxSubjects', subjects);
        TaxPage.render(container);
      });
    });

    document.getElementById('addSubjectBtn').addEventListener('click', () => showAddSubjectModal());
    document.getElementById('addNoteBtn').addEventListener('click', () => showAddNoteModal());

    container.querySelectorAll('.note-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        let notes = Store.get('taxNotes', []);
        notes = notes.filter(n => n.id !== btn.dataset.id);
        Store.set('taxNotes', notes);
        TaxPage.render(container);
      });
    });
  }
};

function getDefaultSubjects() {
  return [
    {
      name: '税法一', icon: '📘',
      chapters: [
        { name: '第一章 税法基本原理', done: false, duration: '3h' },
        { name: '第二章 增值税法', done: false, duration: '6h' },
        { name: '第三章 消费税法', done: false, duration: '4h' },
        { name: '第四章 附加税与烟叶税', done: false, duration: '2h' },
        { name: '第五章 资源税', done: false, duration: '3h' },
        { name: '第六章 车辆购置税', done: false, duration: '2h' },
        { name: '第七章 土地增值税', done: false, duration: '3h' },
        { name: '第八章 关税', done: false, duration: '2h' }
      ]
    },
    {
      name: '税法二', icon: '📗',
      chapters: [
        { name: '第一章 企业所得税', done: false, duration: '6h' },
        { name: '第二章 个人所得税', done: false, duration: '5h' },
        { name: '第三章 国际税收', done: false, duration: '3h' },
        { name: '第四章 印花税', done: false, duration: '2h' },
        { name: '第五章 房产税', done: false, duration: '2h' },
        { name: '第六章 车船税', done: false, duration: '1h' },
        { name: '第七章 契税', done: false, duration: '1h' },
        { name: '第八章 城镇土地使用税', done: false, duration: '2h' }
      ]
    },
    {
      name: '涉税服务实务', icon: '📙',
      chapters: [
        { name: '第一章 导论', done: false, duration: '2h' },
        { name: '第二章 税收征收管理', done: false, duration: '4h' },
        { name: '第三章 涉税专业服务', done: false, duration: '4h' },
        { name: '第四章 税务登记', done: false, duration: '3h' },
        { name: '第五章 发票管理', done: false, duration: '3h' }
      ]
    },
    {
      name: '涉税服务相关法律', icon: '📕',
      chapters: [
        { name: '第一章 行政法律制度', done: false, duration: '4h' },
        { name: '第二章 民商法律制度', done: false, duration: '5h' },
        { name: '第三章 刑事法律制度', done: false, duration: '4h' },
        { name: '第四章 诉讼法律制度', done: false, duration: '3h' }
      ]
    },
    {
      name: '财务与会计', icon: '📒',
      chapters: [
        { name: '第一章 财务管理概论', done: false, duration: '3h' },
        { name: '第二章 财务预测和预算', done: false, duration: '4h' },
        { name: '第三章 会计基础', done: false, duration: '4h' },
        { name: '第四章 财务报表', done: false, duration: '3h' },
        { name: '第五章 非流动资产', done: false, duration: '4h' }
      ]
    }
  ];
}

function showAddSubjectModal() {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加章节</div>
    <div class="form-group">
      <label class="form-label">选择科目</label>
      <select class="form-select" id="subjectSelect">
        ${Store.get('taxSubjects', getDefaultSubjects()).map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">章节名称</label><input class="form-input" id="chapterName" placeholder="如：第六章 关税"></div>
    <div class="form-group"><label class="form-label">预计时长</label><input class="form-input" id="chapterDuration" placeholder="如：3h"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelChBtn">取消</button>
      <button class="btn btn-primary" id="saveChBtn">添加</button>
    </div>
  `;
  modal.style.display = 'flex';
  document.getElementById('cancelChBtn').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('saveChBtn').addEventListener('click', () => {
    const si = parseInt(document.getElementById('subjectSelect').value);
    const name = document.getElementById('chapterName').value.trim();
    if (!name) return;
    const subjects = Store.get('taxSubjects', getDefaultSubjects());
    subjects[si].chapters.push({ name, done: false, duration: document.getElementById('chapterDuration').value || '' });
    Store.set('taxSubjects', subjects);
    modal.style.display = 'none';
    TaxPage.render(document.getElementById('pageContainer'));
  });
}

function showAddNoteModal() {
  const modal = document.getElementById('genericModal');
  const content = document.getElementById('genericModalContent');
  content.innerHTML = `
    <div class="modal-title">添加备考笔记</div>
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="noteTitle" placeholder="笔记标题"></div>
    <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="noteContent" rows="5" placeholder="笔记内容..."></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelNoteBtn">取消</button>
      <button class="btn btn-primary" id="saveNoteBtn">保存</button>
    </div>
  `;
  modal.style.display = 'flex';
  document.getElementById('cancelNoteBtn').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('saveNoteBtn').addEventListener('click', () => {
    const title = document.getElementById('noteTitle').value.trim();
    if (!title) return;
    const notes = Store.get('taxNotes', []);
    notes.push({ id: Store.uid(), title, content: document.getElementById('noteContent').value, date: Store.today(), timestamp: Date.now() });
    Store.set('taxNotes', notes);
    modal.style.display = 'none';
    TaxPage.render(document.getElementById('pageContainer'));
  });
}
