/* Router Hub — 100% client-side, no remote API or telemetry. */
(() => {
  'use strict';
  const STORAGE_KEY = 'router-hub-devices-v1';
  const THEME_KEY = 'router-hub-theme-v1';
  const MAX_DEVICES = 250;
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    star: '<path d="m12 2 3.1 6.3 7 1-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-1L12 2Z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    moon: '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    import: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    export: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    router: '<rect x="3" y="12" width="18" height="9" rx="2"/><path d="M7 12V5m10 7V5M5 16h.01M9 16h.01"/>',
    wifi: '<path d="M2 9a16 16 0 0 1 20 0M5 12.5a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>',
    network: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v5M5 16v-3h14v3"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="10.9" cy="10.9" r="7.4"/><path d="m16.5 16.5 5 5"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 5 7 7-7 7"/>',
    ellipsis: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    'external-link': '<path d="M13 4h7v7M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
    pencil: '<path d="m15 5 4 4M4 20l4.5-1 11-11a2.83 2.83 0 0 0-4-4l-11 11L4 20Z"/>',
    trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a16 16 0 0 1 0 20M12 2a16 16 0 0 0 0 20"/>'
  };
  const icon = (name) => `<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.router}</svg>`;
  const $ = (id) => document.getElementById(id);
  const state = { routers: [], scope: 'all', type: 'all', query: '', editingId: null, toastTimeout: null };

  function showToast(message, isError = false) {
    const el = $('toast');
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.hidden = false;
    window.clearTimeout(state.toastTimeout);
    state.toastTimeout = window.setTimeout(() => { el.hidden = true; }, 3500);
  }
  function newId() {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `r-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  function limited(value, n) { return String(value ?? '').trim().slice(0, n); }
  function validUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    if (value.length > 2048) throw new Error('管理地址过长（最多 2048 字符）');
    let url;
    try { url = new URL(value); } catch { throw new Error('管理地址不是有效 URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password)
      throw new Error('管理地址只能使用 http:// 或 https://，且不能包含账号密码');
    return url.href;
  }
  function normalized(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('设备数据格式不正确');
    const name = limited(raw.name, 60);
    const location = limited(raw.location, 36);
    if (!name || !location) throw new Error('设备名称和地区不能为空');
    return {
      id: typeof raw.id === 'string' && raw.id.length <= 100 && raw.id ? raw.id : newId(),
      name, location, type: limited(raw.type, 36) || '其他',
      url: validUrl(raw.url), note: limited(raw.note, 220), favorite: raw.favorite === true
    };
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, routers: state.routers })); return true; }
    catch { showToast('无法保存到浏览器，请确认未禁用本地存储，及时导出备份。', true); return false; }
  }
  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const obj = JSON.parse(stored);
      const rows = Array.isArray(obj) ? obj : obj?.routers;
      if (!Array.isArray(rows)) return [];
      return rows.slice(0, MAX_DEVICES).flatMap(row => { try { return [normalized(row)]; } catch { return []; } });
    } catch { return []; }
  }
  function setText(id, content) { $(id).textContent = String(content); }
  function mountIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  function uniqueLocations() { return [...new Set(state.routers.map(r => r.location))].sort((a, b) => a.localeCompare(b, 'zh-CN')); }
  function visibleDevices() {
    const q = state.query.toLocaleLowerCase();
    return state.routers.filter(r => (state.scope === 'all' || (state.scope === 'favorites' ? r.favorite : r.location === state.scope))
      && (state.type === 'all' || r.type === state.type)
      && (!q || [r.name, r.location, r.type, r.url, r.note].some(s => s.toLocaleLowerCase().includes(q))));
  }
  function makeButton(label, title, ico, className, handler) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = className;
    el.title = title; el.setAttribute('aria-label', title); el.innerHTML = icon(ico);
    el.addEventListener('click', handler);
    return el;
  }
  function div(cls, text) {
    const el = document.createElement('div'); el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function renderSidebar() {
    setText('countAll', state.routers.length);
    setText('countFavorites', state.routers.filter(r => r.favorite).length);
    ['navAll', 'navFavorites'].forEach((id, i) => {
      const active = state.scope === (i ? 'favorites' : 'all');
      $(id).classList.toggle('active', active);
      if (active) $(id).setAttribute('aria-current', 'page'); else $(id).removeAttribute('aria-current');
    });
    const locationNav = $('locationNav'); locationNav.replaceChildren();
    uniqueLocations().forEach(location => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'nav-link' + (state.scope === location ? ' active' : '');
      button.innerHTML = `<span class="nav-icon">${icon('map-pin')}</span>`;
      const name = document.createElement('span'); name.textContent = location;
      const count = div('nav-count', state.routers.filter(r => r.location === location).length);
      button.append(name, count);
      if (state.scope === location) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => { state.scope = location; closeSidebar(); render(); });
      locationNav.appendChild(button);
    });
  }
  function renderTypeFilter() {
    const typeFilter = $('typeFilter');
    const types = [...new Set(state.routers.map(r => r.type))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
    if (state.type !== 'all' && !types.includes(state.type)) state.type = 'all';
    typeFilter.replaceChildren(new Option('全部固件', 'all'));
    types.forEach(type => typeFilter.add(new Option(type, type)));
    typeFilter.value = state.type;
  }
  function cardFor(router) {
    const card = document.createElement('article'); card.className = 'device-card';
    const top = div('card-top');
    const pict = div('card-icon');
    const type = router.type.toLowerCase();
    if (type.includes('padavan') || type.includes('老毛子')) pict.classList.add('padavan');
    else if (type.includes('tp-link') || type.includes('tp link')) pict.classList.add('tplink');
    else if (!type.includes('openwrt')) pict.classList.add('other');
    pict.innerHTML = icon(type.includes('openwrt') ? 'wifi' : 'router');
    const actions = div('card-actions');
    actions.append(
      makeButton('收藏', router.favorite ? '取消收藏' : '加入收藏', 'star', `icon-button${router.favorite ? ' is-favorite' : ''}`, () => {
        router.favorite = !router.favorite; save(); render(); showToast(router.favorite ? '已加入收藏' : '已取消收藏');
      }),
      makeButton('编辑', `编辑 ${router.name}`, 'pencil', 'icon-button', () => openEditor(router)),
      makeButton('删除', `删除 ${router.name}`, 'trash', 'icon-button', () => {
        if (!window.confirm(`确定删除「${router.name}」吗？\n删除后无法撤销，请先导出备份。`)) return;
        state.routers = state.routers.filter(r => r.id !== router.id);
        save(); render(); showToast('设备已删除');
      })
    );
    top.append(pict, actions);
    const title = div('device-title', router.name);
    const subtitle = div('device-subtitle'); subtitle.innerHTML = icon('map-pin'); subtitle.append(document.createTextNode(router.location));
    const note = div('device-note', router.url ? displayUrl(router.url) : '尚未配置管理地址');
    note.title = router.url || '尚未配置管理地址';
    const divider = div('card-divider');
    const bottom = div('card-bottom');
    const typeTag = document.createElement('span'); typeTag.className = 'firmware-badge'; typeTag.textContent = router.type;
    let link;
    if (router.url) {
      link = document.createElement('a'); link.className = 'card-link'; link.href = router.url;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
      link.append(document.createTextNode('打开后台')); link.insertAdjacentHTML('beforeend', icon('external-link'));
      link.setAttribute('aria-label', `新窗口打开 ${router.name} 的管理后台`);
    } else {
      link = document.createElement('button'); link.type = 'button'; link.className = 'card-link';
      link.style.background = 'none'; link.style.border = '0'; link.style.padding = '0';
      link.append(document.createTextNode('补充地址')); link.insertAdjacentHTML('beforeend', icon('pencil'));
      link.addEventListener('click', () => openEditor(router));
    }
    bottom.append(typeTag, link); card.append(top, title, subtitle, note, divider, bottom);
    if (router.note) card.title = router.note;
    return card;
  }
  function displayUrl(url) {
    try { const parsed = new URL(url); return parsed.host + (parsed.pathname === '/' ? '' : parsed.pathname) + parsed.search + parsed.hash; }
    catch { return url; }
  }
  function render() {
    const devices = visibleDevices();
    renderSidebar(); renderTypeFilter();
    setText('statDevices', state.routers.length);
    setText('statLocations', uniqueLocations().length);
    setText('statFavorites', state.routers.filter(r=>r.favorite).length);
    setText('viewCount', devices.length);
    setText('inventoryTitle', state.scope === 'all' ? '全部路由器' : state.scope === 'favorites' ? '我的收藏' : state.scope);
    const grid = $('deviceGrid'); grid.replaceChildren();
    const empty = $('emptyState');
    empty.hidden = devices.length > 0; grid.hidden = devices.length === 0;
    $('exportButton').disabled = state.routers.length === 0;
    if (!devices.length) {
      const pristine = state.routers.length === 0;
      setText('emptyTitle', pristine ? '这里还没有路由器' : '没有找到匹配的设备');
      setText('emptyDescription', pristine ? '添加第一台设备，或导入已有的设备清单。' : '试试其他地区、固件或搜索关键词。');
      $('emptyAdd').hidden = !pristine; $('emptyImport').hidden = !pristine;
      return;
    }
    const groups = new Map();
    for (const r of devices) { if (!groups.has(r.location)) groups.set(r.location, []); groups.get(r.location).push(r); }
    [...groups.keys()].sort((a, b)=>a.localeCompare(b,'zh-CN')).forEach(location => {
      const heading = document.createElement('h3'); heading.className = 'group-header';
      const marker = document.createElement('span'); marker.className = 'group-marker';
      heading.append(marker, document.createTextNode(location));
      const count = document.createElement('small'); count.textContent = ` ${groups.get(location).length} 台设备`; heading.append(count);
      grid.append(heading);
      groups.get(location).sort((a,b)=>Number(b.favorite)-Number(a.favorite) || a.name.localeCompare(b.name,'zh-CN')).forEach(r => grid.append(cardFor(r)));
    });
  }
  function openEditor(router = null) {
    closeSidebar();
    state.editingId = router?.id ?? null;
    setText('modalTitle', router ? '编辑路由器' : '添加路由器');
    const form = $('deviceForm'); form.reset();
    form.elements.name.value = router?.name ?? '';
    form.elements.location.value = router?.location ?? '';
    form.elements.type.value = ['OpenWrt','Padavan','TP-Link','华硕','小米','其他'].includes(router?.type) ? router.type : '其他';
    form.elements.url.value = router?.url ?? '';
    form.elements.note.value = router?.note ?? '';
    $('formError').hidden = true;
    const datalist = $('locationSuggestions'); datalist.replaceChildren();
    uniqueLocations().forEach(location => datalist.append(new Option(location, location)));
    $('deviceDialog').showModal();
    $('deviceName').focus();
  }
  function closeDialog() { $('deviceDialog').close(); }
  function submitDevice(e) {
    e.preventDefault();
    const form = $('deviceForm');
    const old = state.routers.find(r => r.id === state.editingId);
    let newRow;
    try {
      newRow = normalized({
        id: old?.id ?? newId(), name: form.elements.name.value, location: form.elements.location.value,
        type: form.elements.type.value, url: form.elements.url.value,
        note: form.elements.note.value, favorite: old?.favorite ?? false
      });
    } catch (err) {
      const msg = $('formError'); msg.textContent = err.message; msg.hidden = false; return;
    }
    if (!old && state.routers.length >= MAX_DEVICES) {
      const msg = $('formError'); msg.textContent = `最多支持 ${MAX_DEVICES} 台设备`; msg.hidden = false; return;
    }
    if (old) Object.assign(old, newRow);
    else state.routers.push(newRow);
    save(); closeDialog();
    // Ensure newly-added item is visible even if an old filter was active.
    state.scope = 'all'; state.type = 'all'; state.query = ''; $('searchInput').value = '';
    render(); showToast(old ? '设备信息已更新' : '路由器已添加');
  }
  function downloadFile(filename, contents) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportDevices() {
    if (!state.routers.length) { showToast('还没有设备可以导出'); return; }
    const data = { version: 1, exportedAt: new Date().toISOString(), routers: state.routers };
    const date = new Date().toLocaleDateString('sv-SE');
    downloadFile(`router-hub-backup-${date}.json`, JSON.stringify(data, null, 2) + '\n');
    showToast('配置已导出。备份包含真实管理地址，请妥善保管。');
  }
  async function importDevices(file) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('文件不能超过 1 MB');
      const json = JSON.parse(await file.text());
      const rows = Array.isArray(json) ? json : json?.routers;
      if (!Array.isArray(rows)) throw new Error('JSON 应为设备数组，或包含 routers 数组的对象');
      if (rows.length > MAX_DEVICES) throw new Error(`单次导入最多 ${MAX_DEVICES} 台设备`);
      const imported = rows.map((r, i) => { try { return normalized(r); } catch (e) { throw new Error(`第 ${i + 1} 台设备：${e.message}`); } });
      const merged = state.routers.map(r => ({ ...r }));
      let inserted = 0, updated = 0;
      for (const incoming of imported) {
        const idx = merged.findIndex(r => r.id === incoming.id || (
          r.name === incoming.name && r.location === incoming.location && r.url === incoming.url));
        if (idx >= 0) { merged[idx] = { ...incoming, id: merged[idx].id }; updated++; }
        else { if (merged.length >= MAX_DEVICES) throw new Error(`合并后不能超过 ${MAX_DEVICES} 台设备`); merged.push(incoming); inserted++; }
      }
      state.routers = merged;
      state.scope = 'all'; state.type = 'all'; state.query = ''; $('searchInput').value = '';
      save(); render();
      showToast(`导入完成：新增 ${inserted} 台，更新 ${updated} 台`);
    } catch (error) { showToast(`导入失败：${error.message}`, true); }
    finally { $('importFile').value = ''; }
  }
  function showSettings() { $('settingsDialog').showModal(); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebarScrim').hidden = true; }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const ico = $('themeButton').querySelector('[data-icon]');
    ico.dataset.icon = theme === 'dark' ? 'sun' : 'moon'; ico.innerHTML = icon(ico.dataset.icon);
    $('themeButton').title = theme === 'dark' ? '切换浅色模式' : '切换深色模式';
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* theme is optional */ }
  }
  function init() {
    mountIcons();
    state.routers = load();
    let savedTheme;
    try { savedTheme = localStorage.getItem(THEME_KEY); } catch { /* local-only persistence can be blocked */ }
    setTheme(['light','dark'].includes(savedTheme) ? savedTheme : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    $('navAll').addEventListener('click', () => { state.scope = 'all'; closeSidebar(); render(); });
    $('navFavorites').addEventListener('click', () => { state.scope = 'favorites'; closeSidebar(); render(); });
    ['heroAdd', 'addButton', 'emptyAdd'].forEach(id => $(id).addEventListener('click', () => openEditor()));
    const openImport = () => { if ($('settingsDialog').open) $('settingsDialog').close(); $('importFile').click(); };
    ['heroImport','emptyImport','settingsImport'].forEach(id => $(id).addEventListener('click', openImport));
    $('importFile').addEventListener('change', e => importDevices(e.target.files?.[0]));
    ['exportButton','settingsExport'].forEach(id => $(id).addEventListener('click', () => {
      if ($('settingsDialog').open) $('settingsDialog').close(); exportDevices();
    }));
    $('moreButton').addEventListener('click', showSettings);
    $('closeSettings').addEventListener('click', () => $('settingsDialog').close());
    ['closeDialog','cancelDialog'].forEach(id => $(id).addEventListener('click', closeDialog));
    $('deviceForm').addEventListener('submit', submitDevice);
    $('searchInput').addEventListener('input', e => { state.query = e.target.value.trim(); render(); });
    $('typeFilter').addEventListener('change', e => { state.type = e.target.value; render(); });
    $('themeButton').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
    $('menuButton').addEventListener('click', () => { $('sidebar').classList.add('open'); $('sidebarScrim').hidden = false; });
    $('sidebarScrim').addEventListener('click', closeSidebar);
    document.addEventListener('keydown', e => {
      const t = e.target;
      const editing = t.matches('input,textarea,select,[contenteditable="true"]') || $('deviceDialog').open || $('settingsDialog').open;
      if (e.key === '/' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); $('searchInput').focus(); }
      if (e.key === 'Escape') closeSidebar();
    });
    render();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
