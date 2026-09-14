// Старт-панель v1.2 — плитки, группы, темы, свой фон из файла
// Фон-картинка — отдельно от темы, работает с любой темой.
// 5 стилей часов, стекло с бликами.

let data = {
  groups: [
    { id: 'default', name: 'Основные', color: '#007aff' },
  ],
  tiles: [
    { id: 't1', title: 'Google', url: 'https://google.com', group: 'default', icon: '', color: '#e8eaf6', transparent: true },
    { id: 't2', title: 'YouTube', url: 'https://youtube.com', group: 'default', icon: '', color: '#ffe0b2', transparent: true },
    { id: 't3', title: 'GitHub', url: 'https://github.com', group: 'default', icon: '', color: '#c8e6c9', transparent: true },
  ],
  settings: {
    clock: true,
    search: true,
    autoFavicon: true,
    theme: 'light',
    accentColor: '#007aff',
    clockStyle: 'default',
    clockColor: 'auto',
    bgData: '',
  },
  activeGroup: 'default',
}

let nextId = 100
let editingTileId = null
let editingGroupId = null

function uid() { return 'id-' + nextId++ }

// localStorage
function save() {
  try {
    localStorage.setItem('startpanel_data', JSON.stringify(data))
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      toast('Картинка слишком большая, данные сохранены без неё')
      const bg = data.settings.bgData
      data.settings.bgData = ''
      try { localStorage.setItem('startpanel_data', JSON.stringify(data)) } catch (_) {}
      data.settings.bgData = bg
    }
  }
  syncGroups()
}

// синхронизируем группы в chrome.storage — для подменю при правом клике
function syncGroups() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.storage.local.set({ startpanel_groups: data.groups }, () => {
        void chrome.runtime.lastError
      })
    }
  } catch (e) {}
}

function load() {
  const raw = localStorage.getItem('startpanel_data')
  if (!raw) return
  try {
    const p = JSON.parse(raw)
    data.groups = p.groups || data.groups
    data.tiles = (p.tiles || []).map(t => ({ ...t, transparent: t.transparent !== false })) // true по умолчанию
    data.settings = { ...data.settings, ...(p.settings || {}) }
    data.activeGroup = p.activeGroup || 'default'
    const nums = []
    for (const t of p.tiles || []) {
      const n = parseInt(t.id.replace('id-', ''))
      if (!isNaN(n)) nums.push(n)
    }
    if (nums.length) nextId = Math.max(...nums) + 1
  } catch (e) {}
}

// рендер
function renderAll() {
  renderTabs()
  renderGrid()
  renderClock()
  renderSearch()
  applySettings()
}

function renderTabs() {
  const el = document.getElementById('tabs')
  el.innerHTML = data.groups.map(g => {
    const txtColor = textColor(g.color || '#007aff')
    return `
    <button class="tab${g.id === data.activeGroup ? ' active' : ''}"
      style="--tab-color:${g.color || '#007aff'};--tab-text:${txtColor}"
      data-gid="${g.id}">${esc(g.name)}</button>
  `}).join('') + `<button class="tab tab-add" title="Создать группу">+</button>`
  el.querySelectorAll('.tab').forEach(b => {
    b.addEventListener('click', () => {
      if (b.classList.contains('tab-add')) {
        openGroupModal(null)
        return
      }
      data.activeGroup = b.dataset.gid
      save()
      renderAll()
    })
  })
}

function renderGrid() {
  const el = document.getElementById('grid')
  const tiles = data.tiles.filter(t => t.group === data.activeGroup)
  const hint = document.getElementById('empty-hint')

  if (!tiles.length) {
    hint.classList.remove('hidden')
    el.innerHTML = renderAddTileBtn()
  } else {
    hint.classList.add('hidden')
    el.innerHTML = tiles.map(t => {
      const ico = t.icon
        ? `<img src="${esc(t.icon)}" alt="">`
        : t.title.charAt(0).toUpperCase()
      const icoStyle = t.transparent ? 'color:inherit;background:transparent' : `background:${t.color || '#e8eaf6'};color:${textColor(t.color)}`
      return `
        <a href="${esc(t.url)}" class="tile" draggable="true" data-tid="${t.id}">
          <div class="ico" style="${icoStyle}">${ico}</div>
          <span class="name">${esc(t.title)}</span>
          <button class="x" data-tid="${t.id}" title="Удалить">✕</button>
        </a>
      `
    }).join('') + renderAddTileBtn()
  }

  el.querySelectorAll('.add-tile-btn').forEach(b => {
    b.addEventListener('click', () => openTileModal(null))
  })

  if (!tiles.length) return

  let dragTid = null
  el.querySelectorAll('.tile[draggable]').forEach(a => {
    a.addEventListener('dragstart', e => {
      dragTid = a.dataset.tid
      a.classList.add('dragging')
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', a.dataset.tid)
    })
    a.addEventListener('dragend', () => {
      a.classList.remove('dragging')
      dragTid = null
    })
    a.querySelector('.x').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation()
      deleteTile(a.dataset.tid)
    })
  })

  el.addEventListener('dragover', e => e.preventDefault())
  el.addEventListener('drop', e => {
    e.preventDefault()
    if (!dragTid) return
    const target = e.target.closest('.tile')
    if (!target || target.dataset.tid === dragTid) return
    const fromIdx = data.tiles.findIndex(t => t.id === dragTid)
    const toIdx = data.tiles.findIndex(t => t.id === target.dataset.tid)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = data.tiles.splice(fromIdx, 1)
    const newTo = data.tiles.findIndex(t => t.id === target.dataset.tid)
    data.tiles.splice(newTo, 0, moved)
    save()
    renderAll()
  })
}

function renderAddTileBtn() {
  return `
    <div class="add-tile-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>Добавить</span>
    </div>
  `
}

// часы
function renderClock() {
  const wrap = document.querySelector('.clock-wrap')
  wrap.style.display = data.settings.clock ? '' : 'none'
  if (!data.settings.clock) return

  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  document.getElementById('clock').textContent = h + ':' + m

  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
  document.getElementById('date').textContent =
    days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()]

  document.body.classList.forEach(c => { if (c.startsWith('clock-')) document.body.classList.remove(c) })
  if (data.settings.clockStyle && data.settings.clockStyle !== 'default') {
    document.body.classList.add('clock-' + data.settings.clockStyle)
  }
  document.body.classList.remove('clockwhite', 'clockdark')
  if (data.settings.clockColor === 'white') document.body.classList.add('clockwhite')
  else if (data.settings.clockColor === 'dark') document.body.classList.add('clockdark')
}

// поиск
function renderSearch() {
  const wrap = document.getElementById('search-wrap')
  wrap.style.display = data.settings.search ? '' : 'none'
}

document.getElementById('search-form').addEventListener('submit', e => {
  e.preventDefault()
  const q = document.getElementById('search-input').value.trim()
  if (q) window.location.href = 'https://google.com/search?q=' + encodeURIComponent(q)
})

// Google Suggest
document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.trim()
  const box = document.getElementById('suggestions')
  if (q.length < 2) { box.classList.add('hidden'); return }

  try {
    fetch('https://www.google.com/complete/search?client=chrome&q=' + encodeURIComponent(q))
      .then(r => r.json())
      .then(data => {
        box.innerHTML = (data[1] || []).map(s => {
          const safeUrl = s ? encodeURIComponent(s) : ''
          return `<div><img src="https://www.google.com/s2/favicons?sz=16&domain=${safeUrl}" loading="lazy">${esc(s || '')}</div>`
        }).join('')
        box.querySelectorAll('div').forEach(d => {
          d.addEventListener('click', () => {
            document.getElementById('search-input').value = d.textContent.trim()
            document.getElementById('search-form').dispatchEvent(new Event('submit'))
          })
        })
        box.classList.remove('hidden')
      })
      .catch(() => {})
  } catch (e) {}
})

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) {
    document.getElementById('suggestions').classList.add('hidden')
  }
})

// Google Lens
const lensMenu = document.getElementById('lens-menu')

const btnLens = document.getElementById('btn-lens')
const lensFileBtn = document.getElementById('lens-file')
const lensUrlBtn = document.getElementById('lens-url')

if (lensMenu && btnLens) {
  btnLens.addEventListener('click', e => {
    e.stopPropagation()
    lensMenu.classList.toggle('hidden')
  })
}

document.addEventListener('click', e => {
  if (lensMenu && !e.target.closest('.search-wrap')) lensMenu.classList.add('hidden')
})

// TODO: загрузка из файла, пока открывается только форма гугла, если загружать напрямую - exception windows.open  
if (lensFileBtn) {
  lensFileBtn.addEventListener('click', () => {
    lensMenu.classList.add('hidden')
    const url = 'https://www.google.com/imghp'
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ type: 'lensOpenUrl', url })
    } else {
      window.open(url, '_blank')
    }
  })
}

// поиск по URL картинки
if (lensUrlBtn) {
  lensUrlBtn.addEventListener('click', () => {
    lensMenu.classList.add('hidden')
    const u = prompt('Вставьте ссылку на изображение:', 'https://')
    if (u && u.trim()) {
      const url = 'https://www.google.com/searchbyimage?image_url=' + encodeURIComponent(u.trim())
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'lensOpenUrl', url })
      } else {
        window.open(url, '_blank')
      }
    }
  })
}

// CRUD
function addTile(title, url, icon, color, group, transparent) {
  data.tiles.push({ id: uid(), title, url, icon: icon || '', color: color || '#e8eaf6', transparent: true, group })
  save(); renderAll()
}

function updateTile(id, title, url, icon, color, transparent) {
  const t = data.tiles.find(t => t.id === id)
  if (!t) return
  t.title = title; t.url = url; t.icon = icon || ''; t.color = color || '#e8eaf6'; t.transparent = !!transparent
  save(); renderAll()
}

function deleteTile(id) {
  data.tiles = data.tiles.filter(t => t.id !== id)
  save(); renderAll()
}

function addGroup(name, color) {
  const id = uid()
  data.groups.push({ id, name, color: color || '#007aff' })
  data.activeGroup = id
  save(); renderAll()
}

function updateGroup(id, name, color) {
  const g = data.groups.find(g => g.id === id)
  if (!g) return
  g.name = name; g.color = color || '#007aff'
  save(); renderAll()
}

function deleteGroup(id) {
  if (data.groups.length <= 1) { toast('Нельзя удалить последнюю группу'); return }
  data.groups = data.groups.filter(g => g.id !== id)
  const first = data.groups[0].id
  data.tiles.forEach(t => { if (t.group === id) t.group = first })
  data.activeGroup = first
  save(); renderAll()
}

function moveGroup(from, to) {
  const [g] = data.groups.splice(from, 1)
  data.groups.splice(to, 0, g)
  save(); renderAll()
}

// модалка плитки
const modalTile = document.getElementById('modal-tile')

function openTileModal(tile) {
  editingTileId = tile ? tile.id : null
  document.getElementById('tile-modal-title').textContent = tile ? 'Редактировать' : 'Новая плитка'
  document.getElementById('tile-delete').classList.toggle('hidden', !tile)
  document.getElementById('f-title').value = tile ? tile.title : ''
  document.getElementById('f-url').value = tile ? tile.url : ''
  document.getElementById('f-color').value = tile ? tile.color : '#e8eaf6'
  document.getElementById('f-group').value = tile ? tile.group : data.activeGroup
  document.getElementById('f-favicon').checked = tile ? !tile.icon : data.settings.autoFavicon
  document.getElementById('f-noiconbg').checked = tile ? !!tile.transparent : true
  buildIconPicker(tile ? tile.icon : '')
  modalTile.classList.remove('hidden')
  document.getElementById('f-title').focus()
}

// выбор иконки из набора
function collectKnownIcons() {
  const seen = {}
  data.tiles.forEach(t => { if (t.icon && !seen[t.icon]) seen[t.icon] = true })
  return Object.keys(seen)
}

function buildIconPicker(current) {
  const box = document.getElementById('icon-picker')
  box.innerHTML = ''

  const presets = [
    { name: 'Google', url: 'https://www.google.com/s2/favicons?sz=64&domain=google.com' },
    { name: 'YouTube', url: 'https://www.google.com/s2/favicons?sz=64&domain=youtube.com' },
    { name: 'GitHub', url: 'https://www.google.com/s2/favicons?sz=64&domain=github.com' },
    { name: 'Gmail', url: 'https://www.google.com/s2/favicons?sz=64&domain=gmail.com' },
    { name: 'Telegram', url: 'https://www.google.com/s2/favicons?sz=64&domain=telegram.org' },
    { name: 'VK', url: 'https://www.google.com/s2/favicons?sz=64&domain=vk.com' },
    { name: 'X', url: 'https://www.google.com/s2/favicons?sz=64&domain=x.com' },
    { name: 'Wikipedia', url: 'https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org' },
  ]
  // свои иконки из существующих плиток
  const used = collectKnownIcons().filter(u => !presets.some(p => p.url === u)).slice(0, 12)

  const options = [...presets.map(p => p.url), ...used]

  function makeBtn(iconUrl, label) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'icon-opt' + (iconUrl === current ? ' active' : '')
    b.title = label
    const img = document.createElement('img')
    img.src = iconUrl
    img.loading = 'lazy'
    img.onerror = () => { b.style.visibility = 'hidden'; b.style.width = '0'; b.style.height = '0'; b.style.border = 'none'; b.style.padding = '0'; b.style.margin = '0' }
    b.appendChild(img)
    b.addEventListener('click', () => {
      box.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('active'))
      b.classList.add('active')
      document.getElementById('f-favicon').checked = false
      val = iconUrl
    })
    return b
  }

  let val = current
  options.forEach(u => box.appendChild(makeBtn(u, u)))

  const custom = document.createElement('button')
  custom.type = 'button'
  custom.className = 'icon-opt icon-custom'
  custom.textContent = '+'
  custom.title = 'Своя ссылка на иконку'
  custom.addEventListener('click', () => {
    const u = prompt('Введите ссылку на иконку (URL):', 'https://')
    if (u && u.trim()) {
      const nu = u.trim()
      box.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('active'))
      custom.classList.add('active')
      document.getElementById('f-favicon').checked = false
      val = nu
    }
  })
  box.appendChild(custom)
  box._val = () => val
}

document.getElementById('tile-form').addEventListener('submit', e => {
  e.preventDefault()
  let title = document.getElementById('f-title').value.trim()
  let url = document.getElementById('f-url').value.trim()
  const color = document.getElementById('f-color').value
  const group = document.getElementById('f-group').value || data.activeGroup
  const autoFav = document.getElementById('f-favicon').checked
  const transparent = document.getElementById('f-noiconbg').checked
  if (!title || !url) return
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
  let icon = ''
  if (autoFav) {
    icon = 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(url)
  } else {
    const picker = document.getElementById('icon-picker')
    icon = picker._val ? picker._val() : ''
  }
  if (editingTileId) updateTile(editingTileId, title, url, icon, color, transparent)
  else addTile(title, url, icon, color, group, transparent)
  modalTile.classList.add('hidden')
})

document.addEventListener('dblclick', e => {
  const tile = e.target.closest('.tile')
  if (!tile) return
  e.preventDefault()
  const t = data.tiles.find(t => t.id === tile.dataset.tid)
  if (t) openTileModal(t)
})

document.getElementById('tile-delete').addEventListener('click', () => {
  if (editingTileId) deleteTile(editingTileId)
  modalTile.classList.add('hidden')
})

// модалка группы
const modalGroup = document.getElementById('modal-group')

function openGroupModal(group) {
  editingGroupId = group ? group.id : null
  document.getElementById('group-modal-title').textContent = group ? 'Редактировать группу' : 'Новая группа'
  document.getElementById('group-delete').classList.toggle('hidden', !group)
  document.getElementById('g-name').value = group ? group.name : ''
  document.getElementById('g-color').value = group ? group.color : '#007aff'
  modalGroup.classList.remove('hidden')
  document.getElementById('g-name').focus()
}

document.getElementById('group-form').addEventListener('submit', e => {
  e.preventDefault()
  const name = document.getElementById('g-name').value.trim()
  const color = document.getElementById('g-color').value
  if (!name) return
  if (editingGroupId) updateGroup(editingGroupId, name, color)
  else addGroup(name, color)
  modalGroup.classList.add('hidden')
})

document.addEventListener('dblclick', e => {
  const tab = e.target.closest('.tab')
  if (!tab || !tab.dataset.gid) return
  const g = data.groups.find(g => g.id === tab.dataset.gid)
  if (!g) return
  openGroupModal(g)
})

document.getElementById('group-delete').addEventListener('click', () => {
  if (editingGroupId) deleteGroup(editingGroupId)
  modalGroup.classList.add('hidden')
})

// настройки
const modalSettings = document.getElementById('modal-settings')

document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('s-clock').checked = data.settings.clock
  document.getElementById('s-search').checked = data.settings.search
  document.getElementById('s-favicon').checked = data.settings.autoFavicon
  // темы
  document.querySelectorAll('.theme-btn[data-theme]').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === data.settings.theme)
  })
  // акцентный цвет
  const curAccent = data.settings.accentColor || '#007aff'
  document.querySelectorAll('.accent-picker').forEach(b => {
    b.classList.toggle('active', b.dataset.accent === curAccent)
  })
  document.getElementById('s-accent').value = curAccent
  // стиль часов
  document.querySelectorAll('.theme-btn[data-clock]').forEach(b => {
    b.classList.toggle('active', b.dataset.clock === data.settings.clockStyle)
  })
  // цвет часов
  document.querySelectorAll('.theme-btn[data-clockcolor]').forEach(b => {
    b.classList.toggle('active', b.dataset.clockcolor === data.settings.clockColor)
  })
  // превью фона
  updateBgPreview()
  modalSettings.classList.remove('hidden')
})

// выбор темы
document.querySelectorAll('.theme-btn[data-theme]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn[data-theme]').forEach(bb => bb.classList.remove('active'))
    b.classList.add('active')
    data.settings.theme = b.dataset.theme
    save()
    applySettings()
  })
})

// акцентный цвет — пресеты
document.querySelectorAll('.accent-picker').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.accent-picker').forEach(bb => bb.classList.remove('active'))
    b.classList.add('active')
    const c = b.dataset.accent
    data.settings.accentColor = c
    document.getElementById('s-accent').value = c
    save()
    applySettings()
  })
})
// акцентный цвет — свой
document.getElementById('s-accent').addEventListener('input', function () {
  document.querySelectorAll('.accent-picker').forEach(bb => bb.classList.remove('active'))
  data.settings.accentColor = this.value
  save()
  applySettings()
})

// стиль часов
document.querySelectorAll('.theme-btn[data-clock]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn[data-clock]').forEach(bb => bb.classList.remove('active'))
    b.classList.add('active')
    data.settings.clockStyle = b.dataset.clock
    save()
    renderClock()
  })
})

// цвет часов
document.querySelectorAll('.theme-btn[data-clockcolor]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn[data-clockcolor]').forEach(bb => bb.classList.remove('active'))
    b.classList.add('active')
    data.settings.clockColor = b.dataset.clockcolor
    save()
    renderClock()
  })
})

// загрузка картинки из файла
document.getElementById('s-bgfile').addEventListener('change', function () {
  const file = this.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = function (e) {
    const img = new Image()
    img.onload = function () {
      const maxW = 1920
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > maxW) { h = h * maxW / w; w = maxW }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      data.settings.bgData = c.toDataURL('image/jpeg', 0.8)
      updateBgPreview()
      save()
      applySettings()
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
})

document.getElementById('s-bgclear').addEventListener('click', () => {
  data.settings.bgData = ''
  updateBgPreview()
  save()
  applySettings()
})

function updateBgPreview() {
  const preview = document.getElementById('bg-preview')
  const clearBtn = document.getElementById('s-bgclear')
  if (data.settings.bgData) {
    preview.style.backgroundImage = `url(${data.settings.bgData})`
    preview.classList.remove('hidden')
    clearBtn.classList.remove('hidden')
  } else {
    preview.classList.add('hidden')
    clearBtn.classList.add('hidden')
  }
}

// чекбоксы
document.getElementById('s-clock').addEventListener('change', () => {
  data.settings.clock = document.getElementById('s-clock').checked
  save(); renderAll()
})
document.getElementById('s-search').addEventListener('change', () => {
  data.settings.search = document.getElementById('s-search').checked
  save(); renderAll()
})
document.getElementById('s-favicon').addEventListener('change', () => {
  data.settings.autoFavicon = document.getElementById('s-favicon').checked
  save()
})

// применение темы + фона
function applySettings() {
  const s = data.settings
  // очищаем всё
  document.body.classList.remove('dark', 'glass', 'hasImage')

  // тема
  if (s.theme === 'dark') document.body.classList.add('dark')
  else if (s.theme === 'glass') document.body.classList.add('glass')
  // light — ничего не добавляем, это дефолт

  // акцентный цвет
  if (s.accentColor && s.accentColor !== '#007aff') {
    document.body.style.setProperty('--accent', s.accentColor)
    document.body.style.setProperty('--accent-hover', s.accentColor + 'dd')
  } else {
    document.body.style.removeProperty('--accent')
    document.body.style.removeProperty('--accent-hover')
  }

  // фоновая картинка поверх темы
  if (s.bgData) {
    document.body.classList.add('hasImage')
    document.getElementById('bg-layer').style.backgroundImage = `url(${s.bgData})`
  } else {
    document.getElementById('bg-layer').style.backgroundImage = ''
  }
}

// бэкап
document.getElementById('btn-backup').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'startpanel-backup-' + new Date().toISOString().slice(0, 10) + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
  toast('Бэкап скачан')
})

document.getElementById('s-backupfile').addEventListener('change', function () {
  const file = this.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result)
      if (!imported.groups || !imported.tiles || !imported.settings) {
        toast('Неправильный формат бэкапа')
        return
      }
      data = imported
      save()
      renderAll()
      toast('Данные восстановлены')
    } catch (err) {
      toast('Ошибка при чтении файла')
    }
  }
  reader.readAsText(file)
  this.value = ''
})

// навигация по подсказкам поиска стрелками
document.getElementById('search-input').addEventListener('keydown', function (e) {
  const box = document.getElementById('suggestions')
  const items = box.querySelectorAll('div')

  // если подсказок нет и нажали ↓ — сами запускаем поиск
  if (!items.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault()
    // форсируем input-обработчик
    this.dispatchEvent(new Event('input'))
    return
  }

  if (!items.length || box.classList.contains('hidden')) return

  const active = box.querySelector('.s-active')
  let idx = -1
  if (active) idx = Array.from(items).indexOf(active)

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (active) active.classList.remove('s-active')
    idx = Math.min(idx + 1, items.length - 1)
    items[idx].classList.add('s-active')
    items[idx].scrollIntoView({ block: 'nearest' })
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (active) active.classList.remove('s-active')
    idx = Math.max(idx - 1, 0)
    items[idx].classList.add('s-active')
    items[idx].scrollIntoView({ block: 'nearest' })
  } else if (e.key === 'Enter' && active) {
    e.preventDefault()
    this.value = active.textContent.trim()
    document.getElementById('search-form').dispatchEvent(new Event('submit'))
  }
})

// контекстное меню
const ctxMenu = document.getElementById('ctx-menu')

// одна функция для показа — создаём элементы под конкретный случай
function showCtxMenu(items, x, y) {
  // items: [{ label, icon?, danger?, action }]
  ctxMenu.innerHTML = ''
  items.forEach((item, i) => {
    if (item.divider) {
      const div = document.createElement('div')
      div.className = 'ctx-divider'
      ctxMenu.appendChild(div)
      return
    }
    const btn = document.createElement('button')
    btn.className = 'ctx-item' + (item.danger ? ' danger' : '')
    btn.innerHTML = (item.icon ? item.icon + ' ' : '') + esc(item.label)
    btn.addEventListener('click', e => { e.stopPropagation(); item.action(); hideCtxMenu() })
    ctxMenu.appendChild(btn)
  })
  ctxMenu.style.left = x + 'px'
  ctxMenu.style.top = y + 'px'
  ctxMenu.classList.remove('hidden')
  // HACK: чтобы меню не уезжало за край окна
  const rect = ctxMenu.getBoundingClientRect()
  if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 8) + 'px'
  if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 8) + 'px'
}

function hideCtxMenu() {
  ctxMenu.classList.add('hidden')
}

document.addEventListener('click', e => {
  if (!e.target.closest('.ctx-menu')) hideCtxMenu()
})

// контекстное меню на плитке
document.getElementById('grid').addEventListener('contextmenu', e => {
  const tile = e.target.closest('.tile')
  if (tile) {
    e.preventDefault()
    const t = data.tiles.find(t => t.id === tile.dataset.tid)
    if (!t) return
    const items = [
      { label: 'Редактировать', icon: '✎', action: () => openTileModal(t) },
    ]
    // переместить в другую группу
    const otherGroups = data.groups.filter(g => g.id !== t.group)
    if (otherGroups.length) {
      items.push({ divider: true })
      otherGroups.forEach(g => {
        items.push({
          label: 'Переместить → ' + g.name,
          icon: '▸',
          action: () => { t.group = g.id; save(); renderAll() },
        })
      })
    }
    items.push({ divider: true })
    items.push({ label: 'Удалить', icon: '✕', danger: true, action: () => deleteTile(t.id) })
    showCtxMenu(items, e.clientX, e.clientY)
    return
  }
  // клик по пустому месту в сетке — добавить плитку
  if (e.target.closest('.grid') || e.target.closest('#empty-hint')) {
    e.preventDefault()
    showCtxMenu([
      { label: 'Добавить плитку', icon: '+', action: () => openTileModal(null) },
    ], e.clientX, e.clientY)
  }
})

// контекстное меню на вкладке группы
document.getElementById('tabs').addEventListener('contextmenu', e => {
  const tab = e.target.closest('.tab')
  if (!tab || tab.classList.contains('tab-add')) return
  e.preventDefault()
  const g = data.groups.find(g => g.id === tab.dataset.gid)
  if (!g) return
  const idx = data.groups.indexOf(g)
  const items = [
    { label: 'Редактировать', icon: '✎', action: () => openGroupModal(g) },
  ]
  if (idx > 0) {
    items.push({ label: 'Влево', icon: '←', action: () => moveGroup(idx, idx - 1) })
  }
  if (idx < data.groups.length - 1) {
    items.push({ label: 'Вправо', icon: '→', action: () => moveGroup(idx, idx + 1) })
  }
  items.push({ divider: true })
  items.push({ label: 'Удалить группу', icon: '✕', danger: true, action: () => deleteGroup(g.id) })
  showCtxMenu(items, e.clientX, e.clientY)
})

// закрытие модалок
document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', () => { b.closest('.modal').classList.add('hidden') })
})
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden') })
})

// helpers
function esc(s) {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

// HACK: грубая прикидка яркости цвета — если фон светлый, буква тёмная, и наоборот
function textColor(bg) {
  if (!bg) return '#fff'
  const hex = bg.replace('#', '')
  const r = parseInt(hex.slice(0,2), 16), g = parseInt(hex.slice(2,4), 16), b = parseInt(hex.slice(4,6), 16)
  // относительная яркость по формуле WCAG
  return (0.299*r + 0.587*g + 0.114*b) > 160 ? '#333' : '#fff'
}

let toastTimer = null
function toast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.remove('hidden')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500)
}

// часы каждые 30 сек
setInterval(renderClock, 30000)

// старт
load()
// миграция: раньше картинка была темой, теперь это отдельный фон
if (data.settings.theme === 'image') data.settings.theme = 'light'

// подхватываем плитки, добавленные из контекстного меню Chrome
function processPendingTiles() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return
  try {
    chrome.storage.local.get('startpanel_pending', (res) => {
      const pending = res.startpanel_pending || []
      if (!pending.length) return
      pending.forEach(t => {
        t.transparent = t.transparent !== false // true по умолчанию
        data.tiles.push(t)
        nextId = Math.max(nextId, parseInt(t.id.replace(/^\D+/g, '')) || 0) + 1
      })
      chrome.storage.local.set({ startpanel_pending: [] })
      save()
      renderAll()
    })
  } catch (e) {}
}

// сообщение от фонового скрипта — добавить плитку без перезагрузки
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'addTileFromExt' && msg.tile) {
        data.tiles.push(msg.tile)
        save()
        renderAll()
        if (sendResponse) sendResponse({ ok: true })
      }
    })
  } catch (e) {}
}

renderAll()
processPendingTiles()