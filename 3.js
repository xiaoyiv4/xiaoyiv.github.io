// ...existing code...
const STORAGE_KEY = 'lightblog_posts_v1';

const el = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

/* 分页配置 */
const PAGE_SIZE = 6;
let currentPage = 1;

function loadPosts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return samplePosts();
    return JSON.parse(raw);
  }catch(e){
    return samplePosts();
  }
}

let posts = loadPosts();

/* DOM 元素 */
const postsList = el('postsList');
const paginationEl = el('pagination');
const emptyHint = el('emptyHint');
const searchInput = el('search');
const newPostBtn = el('newPostBtn');

const editorModal = el('editorModal');
const postForm = el('postForm');
const postTitle = el('postTitle');
const postTags = el('postTags');
const postContent = el('postContent');
const editorTitle = el('editorTitle');
const closeEditor = el('closeEditor');
const cancelEditor = el('cancelEditor');

const viewModal = el('viewModal');
const viewTitle = el('viewTitle');
const viewContent = el('viewContent');
const viewMeta = el('viewMeta');
const viewTags = el('viewTags');
const closeView = el('closeView');
const closeView2 = el('closeView2');
const deleteBtn = el('deleteBtn');
const editBtn = el('editBtn');

const postCountEl = el('postCount');
const lastUpdatedEl = el('lastUpdated');
const tagsListEl = el('tagsList');
const recentListEl = el('recentList');
const featuredEl = el('featured');

let editingId = null;
let viewingId = null;
let activeTag = '';

/* 事件绑定（判空） */
if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; render(searchInput.value.trim()); });
if (newPostBtn) newPostBtn.addEventListener('click', openNewEditor);
if (closeEditor) closeEditor.addEventListener('click', closeEditorModal);
if (cancelEditor) cancelEditor.addEventListener('click', closeEditorModal);
if (postForm) postForm.addEventListener('submit', onSavePost);
if (closeView) closeView.addEventListener('click', closeViewModal);
if (closeView2) closeView2.addEventListener('click', closeViewModal);
if (deleteBtn) deleteBtn.addEventListener('click', onDeleteViewing);
if (editBtn) editBtn.addEventListener('click', onEditViewing);

/* 打开只读文章页（跳转） */
function openRead(id){
  if(!id) return;
  window.location.href = `read.html?id=${encodeURIComponent(id)}`;
}

/* 渲染文章列表（含分页） */
function render(filter = '') {
  if (!postsList) return;
  postsList.innerHTML = '';

  const filtered = (posts || [])
    .filter(p => (!filter || (p.title + ' ' + p.content).toLowerCase().includes(filter.toLowerCase())) &&
                 (!activeTag || (p.tags||[]).includes(activeTag)))
    .sort((a,b)=>b.updatedAt - a.updatedAt);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  if (postCountEl) postCountEl.textContent = (posts || []).length;
  if (lastUpdatedEl) lastUpdatedEl.textContent = (posts && posts.length) ? formatDate(Math.max(...posts.map(p=>p.updatedAt))) : '—';
  if (emptyHint) emptyHint.style.display = pageData.length === 0 ? 'block' : 'none';

  if (featuredEl) {
    if (!filter && !activeTag && filtered.length > 0) {
      const f = filtered[0];
      featuredEl.style.display = 'block';
      featuredEl.innerHTML = `<h3>精选：${escapeHtml(f.title)}</h3><p class="meta">更新：${formatDate(f.updatedAt)} · 标签：${(f.tags||[]).map(t=>`<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ')}</p><div class="preview">${escapeHtml(truncate(f.content, 260))}</div>`;
    } else {
      featuredEl.style.display = 'none';
    }
  }

  for (const p of pageData) {
    const card = document.createElement('article');
    card.className = 'card';
    const tagsHtml = (p.tags||[]).map(t=>`<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ');
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(truncate(p.content, 140))}</p>
      <div class="meta">${formatDate(p.updatedAt)}</div>
      <div class="tags">${tagsHtml}</div>
    `;
    // 点击卡片跳转只读页（访客不可编辑）
    card.addEventListener('click', (e)=> {
      if (e.target && e.target.dataset && e.target.dataset.tag) {
        e.stopPropagation();
        setActiveTag(e.target.dataset.tag);
        return;
      }
      openRead(p.id);
    });
    postsList.appendChild(card);
  }

  renderPagination(totalPages);
  renderSidebar();
}

/* 渲染分页控件 */
function renderPagination(totalPages){
  if(!paginationEl) return;
  paginationEl.innerHTML = '';
  const createBtn = (text, cls, cb, disabled) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.className = cls || 'btn';
    if(disabled) b.disabled = true;
    b.addEventListener('click', cb);
    return b;
  };

  // 上一页
  paginationEl.appendChild(createBtn('« 上一页', 'btn', ()=>{ if(currentPage>1){ currentPage--; render(searchInput ? searchInput.value.trim() : ''); } }, currentPage===1));

  // 页码（最多显示 7 个，居中当前）
  const maxButtons = 7;
  let start = Math.max(1, currentPage - Math.floor(maxButtons/2));
  let end = Math.min(totalPages, start + maxButtons - 1);
  if(end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

  for(let i=start;i<=end;i++){
    const btn = createBtn(i.toString(), i===currentPage ? 'btn primary' : 'btn', ()=>{ currentPage = i; render(searchInput ? searchInput.value.trim() : ''); });
    paginationEl.appendChild(btn);
  }

  // 下一页
  paginationEl.appendChild(createBtn('下一页 »', 'btn', ()=>{ if(currentPage<totalPages){ currentPage++; render(searchInput ? searchInput.value.trim() : ''); } }, currentPage===totalPages));
}

/* 打开新建编辑器 */
function openNewEditor(){
  editingId = null;
  if (editorTitle) editorTitle.textContent = '新建文章';
  if (postTitle) postTitle.value = '';
  if (postTags) postTags.value = '';
  if (postContent) postContent.value = '';
  openModal(editorModal);
}

/* 保存文章 */
function onSavePost(e){
  if (e && e.preventDefault) e.preventDefault();
  const title = (postTitle && postTitle.value || '').trim();
  const content = (postContent && postContent.value || '').trim();
  const tags = (postTags && postTags.value || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!title || !content) return alert('标题和正文不能为空');

  if (editingId) {
    const idx = posts.findIndex(p=>p.id===editingId);
    if (idx>=0){
      posts[idx].title = title;
      posts[idx].content = content;
      posts[idx].tags = tags;
      posts[idx].updatedAt = Date.now();
    }
  } else {
    posts.push({
      id: genId(),
      title, content,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  savePosts();
  closeEditorModal();
  if (searchInput) render(searchInput.value.trim()); else render();
}

/* 查看文章（管理端模态） */
function openView(id){
  const p = (posts || []).find(x=>x.id===id);
  if(!p) return;
  viewingId = id;
  if (viewTitle) viewTitle.textContent = p.title;
  if (viewContent) viewContent.innerHTML = renderSimple(p.content);
  if (viewMeta) viewMeta.textContent = `创建：${formatDate(p.createdAt)} · 更新：${formatDate(p.updatedAt)}`;
  if (viewTags) viewTags.innerHTML = (p.tags||[]).map(t=>`<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ');
  if (viewTags) {
    Array.from(viewTags.querySelectorAll('.tag')).forEach(n=> n.addEventListener('click',(e)=>{ setActiveTag(e.target.dataset.tag); closeViewModal(); }));
  }
  openModal(viewModal);
}

/* 编辑正在查看的文章 */
function onEditViewing(){
  const p = (posts || []).find(x=>x.id===viewingId);
  if(!p) return;
  editingId = p.id;
  if (editorTitle) editorTitle.textContent = '编辑文章';
  if (postTitle) postTitle.value = p.title;
  if (postTags) postTags.value = (p.tags||[]).join(', ');
  if (postContent) postContent.value = p.content;
  closeViewModal();
  openModal(editorModal);
}

/* 删除正在查看的文章 */
function onDeleteViewing(){
  if (!viewingId) return;
  if (!confirm('确认删除此文章？')) return;
  posts = (posts || []).filter(p=>p.id !== viewingId);
  savePosts();
  closeViewModal();
  if (searchInput) render(searchInput.value.trim()); else render();
}

/* 存储 */
function savePosts(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }catch(e){}
}

/* Helpers */
function genId(){ return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleString();
}
function truncate(s, n){ s = String(s||''); return s.length>n ? s.slice(0,n-1) + '…' : s; }
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function renderSimple(text) {
  const lines = String(text||'').split(/\n\s*\n/).map(p => {
    const html = escapeHtml(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  });
  return lines.join('');
}

/* 模态管理 */
function openModal(node){
  if(!node) return;
  node.classList.remove('hidden'); node.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}
function closeEditorModal(){ if(editorModal){ editorModal.classList.add('hidden'); editorModal.setAttribute('aria-hidden','true'); } document.body.style.overflow=''; editingId=null;}
function closeViewModal(){ if(viewModal){ viewModal.classList.add('hidden'); viewModal.setAttribute('aria-hidden','true'); } document.body.style.overflow=''; viewingId=null;}

/* 预置示例文章（首次使用） */
function samplePosts(){
  return [
    { id: genId(), title: '欢迎使用轻量博客', content: '这是示例文章。你可以新建、编辑、删除文章，数据保存在浏览器的 localStorage 中。\n\n**提示**：可以添加标签，点击标签会筛选相关文章。', tags:['示例','说明'], createdAt: Date.now()-86400000, updatedAt: Date.now()-86400000 },
    { id: genId(), title: '前端笔记：CSS 布局技巧', content: '本文记录一些常用的 CSS 布局技巧：\n\n- 使用 flex 对齐项\n- 使用 grid 做响应式网格\n\n更多内容可自行扩展。', tags:['前端','CSS'], createdAt: Date.now()-7200000, updatedAt: Date.now()-7200000 },
    { id: genId(), title: '写作指南：如何写好一篇短文', content: '写短文的要点：\n\n1. 明确主题\n2. 简洁表达\n3. 使用小标题和段落来组织内容\n\n练习写作可以提高表达能力。', tags:['写作','指南'], createdAt: Date.now()-3600000, updatedAt: Date.now()-3600000 }
  ];
}

/* 点击空白处关闭模态 */
window.addEventListener('click', (e)=>{
  if(e.target === editorModal) closeEditorModal();
  if(e.target === viewModal) closeViewModal();
});

/* 搜索快捷键 */
if (searchInput) searchInput.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') { searchInput.value = ''; activeTag = ''; render(); }
});

/* 侧边栏渲染 */
function renderSidebar(){
  if (!tagsListEl || !recentListEl) return;
  const tagMap = {};
  (posts||[]).forEach(p => (p.tags||[]).forEach(t => tagMap[t] = (tagMap[t]||0) + 1));
  tagsListEl.innerHTML = Object.keys(tagMap).sort().map(t => `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)} (${tagMap[t]})</span>`).join(' ');
  Array.from(tagsListEl.querySelectorAll('.tag')).forEach(n => n.addEventListener('click', e=> setActiveTag(e.target.dataset.tag)));

  const recent = (posts||[]).slice().sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,5);
  recentListEl.innerHTML = recent.map(p => `<div class="item" data-id="${p.id}">${escapeHtml(p.title)}</div>`).join('');
  Array.from(recentListEl.querySelectorAll('.item')).forEach(n => n.addEventListener('click', e=> openRead(e.target.dataset.id)));
}

/* 设置活动标签并重新渲染 */
function setActiveTag(tag){
  activeTag = tag;
  if (searchInput) searchInput.value = '';
  currentPage = 1;
  render();
}

/* 初始渲染 */
render();
renderSidebar();
// ...existing code...