# Pretty-Menu ※ Google homepage extension

![Main page](materials/img/main_page.png)

Fed up with the empty Chrome homepage or running out of tiles for all your notes? Missing grouping features? Me too. So, I created my own dashboard featuring tiles, groups, and search. Everything runs locally; no data leaks to the web—except to Google, if you specifically ask it to.

It all started with a simple thought: "Why can't I save tons of bookmarks on my homepage and group them?" Now, my inner neat freak is at peace.

---

## Features

- **Tiles** - Large tiles with icons (default site icons or custom ones). Quickly save sites to your homepage without manually saving links or typing names—just use the right mouse button.
- **Groups** - Folder-like tabs: "Work," "Study," "Entertainment." Rename, recolor, delete, or reorder them via drag-and-drop.
- **Search** - Search bar with Google Suggest.
- **Image Search** - Camera button: upload a file (opens Google Images) or paste an image URL.
- **Clock** - 5 styles and 2 color options.
- **Themes** - Light, dark, and glass modes, plus custom background images from files.
- **Colors** - Interface accent color and individual group colors.
- **Backup** - Save all tiles, groups, and settings to a JSON file and restore them later.

---

## Installation

1. Download and extract the `src` folder to a secure location.
2. Open `chrome://extensions/`.
3. Enable **"Developer mode"**.
4. Click **"Load unpacked"** and select the `src` folder. 5. Open a new tab.

Updating after code changes: click ⟳ on the extensions page. Sometimes, after updates to permissions, you may need to remove the extension and reload it.

---

## Structure

- **manifest.json** - tells Chrome this is an extension, specifies required permissions, and overrides the new tab page (`chrome_url_overrides`).
- **index.html + style.css** - the dashboard page itself and its visual styling.
- **app.js** - all the logic: tiles, groups, themes, search, and saving. Uses `localStorage` so data isn't lost when restarting the browser.
- **background.js** - background service: handles the "Add site to tiles" context menu (right-click on any site → select group) and opens Google links.

---

## Known Limitations

- **File upload for image search** - opens Google Images, where you select the file yourself. Automatic uploading via the extension is blocked by Chrome's security measures ("window.open blocked due to active file chooser").

---

## Planned Features

- English language.
- Drag-and-drop tiles between groups (currently done via right-click).
- Import from Chrome system bookmarks.
- Dark mode that switches automatically based on the time of day.

Found a bug or have a feature idea? Feel free to share—the code is open source.

> **Disclaimer:** This is a local extension that you install yourself. All data stays on your computer.