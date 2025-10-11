const STORAGE_KEY = 'lightblog_posts_v1';
const qs = sel => document.querySelector(sel);
const idFromQuery = () => {
  const m = location.search.match(/[?&]id=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

function loadPosts(){
  try{ const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }catch(e){ return []; }
}
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderSimple(text){
  const lines = String(text||'').split(/\n\s*\n/).map(p => {
    const html = escapeHtml(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  });
  return lines.join('');
}
function formatDate(ts){ const d=new Date(ts); return d.toLocaleString(); }

(function(){
  const id = idFromQuery();
  const posts = loadPosts();
  const rootTitle = qs('#rTitle');
  const rootMeta = qs('#rMeta');
  const rootTags = qs('#rTags');
  const rootContent = qs('#rContent');

  if(!id){ rootTitle.textContent = '无效文章 ID'; rootContent.textContent = '未指定文章。'; return; }
  const p = posts.find(x=>x.id===id);
  if(!p){ rootTitle.textContent = '未找到文章'; rootContent.textContent = '找不到指定的文章或已被删除。'; return; }

  rootTitle.textContent = p.title;
  rootMeta.textContent = `创建：${formatDate(p.createdAt)} · 更新：${formatDate(p.updatedAt)}`;
  rootTags.innerHTML = (p.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  rootContent.innerHTML = renderSimple(p.content);
})();