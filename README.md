![Screenshot Cover](https://fitzxel.github.io/simpliteNewTab/screenshots/capture.png)

## Simplite New Tab

# A simple and light new tab.

With Simplite you have a new tab made for those who do without icons, apps, news and articles on their new tab page.<br>

## Promotional preview

[![Promotional preview](https://img.youtube.com/vi/53DB23PFcog/mqdefault.jpg)](https://youtu.be/53DB23PFcog)

# Features:

- Search using the search provider configured in your browser. If browser search is unavailable or a search fails, the new tab shows a localized message; it never switches providers automatically.
- Four search bar styles: **Glass** (default), **Solid**, **Classic** (the 2.0 design) or **No bar**, with adjustable corners from square to pill.
- Backgrounds: a solid color of your choice, the default wallpaper, your own image, or dynamic photos and videos from the [Pixabay](https://pixabay.com) platform that change throughout the day.
- Light, dark or automatic theme.
- Settings save instantly and apply to open new tabs without reloading.
- Quickly load the new tab.
- Minimalist design.
- Accessible use and configuration, available in 11 languages.

# Keyboard shortcuts:

- `Ctrl` + `K`: focus the search bar.
- `Alt` + `N`: get a new dynamic photo or video background.

# What's new in 2.1.0:

- Redesigned settings popup: background previews, options that only show when they apply, instant saving and a theme setting.
- New search bar styles (Glass, Solid, No bar) and a corner radius slider. Users updating from 2.0 can switch back to the classic bar from the settings popup.
- The solid color background now works, and background position also applies to videos.
- `Alt` + `N` replaces `Ctrl` + `F` for a new background, so the browser's find bar works again.
- An occasional, dismissible card to support Simplite; it can be turned off in Settings > Advanced.

# Building the store package:

```sh
python3 scripts/build_zip.py
```

Runs the tests and writes `dist/simplite-new-tab-<version>.zip`. Only the files listed in `INCLUDE` at the top of the script are packaged, so add new runtime files there.

# Store images:

```sh
python3 scripts/build_store_assets.py            # everything
python3 scripts/build_store_assets.py --only 2,tile
```

Renders the Chrome Web Store images into `store/`: five 1280x800 screenshots, the 440x280 small promo tile (the thumbnail shown in store search and lists), the 1400x560 marquee and the 128x128 store icon. The screenshots are the real new tab and settings pages, loaded with a fake `chrome.*` API (`scripts/store-assets/shim.js`) and composed by `scripts/store-assets/mock.html`; edit that file to change the slides. The Pixabay photos are not in git: they are listed and credited in `scripts/store-assets/photos.json` and downloaded by id into `scripts/store-assets/photos/` (git-ignored) on the first run. With `PIXABAY_API_KEY` set they are looked up on the Pixabay API; otherwise in the Simplite proxy's current results for each photo's daypart. `--refresh-photos` downloads them again. Needs Chrome or Chromium and ImageMagick. Neither `store/` nor `scripts/` goes into the zip.

# Get extension:
- [Get for Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/gcnndkgggdjgfkkmokfpifaehabocfgo)
