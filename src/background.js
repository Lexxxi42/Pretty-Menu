// контекстное меню 

function buildMenu(groups) {
  if (!chrome.contextMenus) return
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'addTile_parent',
      title: 'Добавить сайт в плитки',
      contexts: ['page', 'link'],
    })
    ;(groups || []).forEach(g => {
      if (g && g.id) {
        chrome.contextMenus.create({
          id: 'g_' + g.id,
          parentId: 'addTile_parent',
          title: g.name || 'Группа',
          contexts: ['page', 'link'],
        })
      }
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('startpanel_groups', (res) => {
    buildMenu(res.startpanel_groups)
  })
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.startpanel_groups) {
    buildMenu(changes.startpanel_groups.newValue)
  }
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId || '')

  let groupId = null
  if (id.startsWith('g_')) {
    groupId = id.replace('g_', '')
  } else if (id === 'addTile_parent') {
    chrome.storage.local.get('startpanel_groups', (res) => {
      const groups = res.startpanel_groups || []
      addTileFromContext(groups.length > 0 ? groups[0].id : 'default', info, tab)
    })
    return
  }
  if (!groupId) return

  addTileFromContext(groupId, info, tab)
})

function addTileFromContext(groupId, info, tab) {
  const url = info.linkUrl || (tab && tab.url) || ''
  if (!url) return

  const cleanUrl = url.split(/[?#]/)[0]
  let domain = ''
  try { domain = new URL(cleanUrl).hostname } catch (e) {}

  let title = info.selectionText ? info.selectionText.trim() : (tab ? tab.title : '')
  if (!title || title.length < 2) title = domain || cleanUrl
  title = title.slice(0, 30)

  const tile = {
    id: 'ext-' + Date.now(),
    title,
    url: cleanUrl,
    group: groupId,
    icon: domain ? 'https://www.google.com/s2/favicons?sz=64&domain=' + domain : '',
    color: '#e8eaf6',
    transparent: false,
  }

  chrome.storage.local.get('startpanel_pending', (res) => {
    const pending = res.startpanel_pending || []
    pending.push(tile)
    chrome.storage.local.set({ startpanel_pending: pending })
  })
}

// Google Lens
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'lensOpenUrl' && msg.url) {
    chrome.tabs.create({ url: msg.url })
    sendResponse({ ok: true })
  }
  if (msg && msg.type === 'lensUploadFile' && msg.bytes) {
    const blob = new Blob([new Uint8Array(msg.bytes)], { type: msg.mime || 'image/jpeg' })
    const fd = new FormData()
    fd.append('encoded_image', blob, 'image.jpg')
    fetch('https://www.google.com/searchbyimage/upload', {
      method: 'POST',
      body: fd,
      redirect: 'follow',
      credentials: 'include',
    })
      .then(r => {
        chrome.tabs.create({ url: r.url })
        sendResponse({ ok: true })
      })
      .catch(() => sendResponse({ ok: false }))
    return true
  }
})