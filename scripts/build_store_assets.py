#!/usr/bin/env python3
"""Render the Chrome Web Store images into store/

Screenshots (1280x800), the small promo tile (440x280), the marquee
(1400x560) and the 128x128 store icon. The screenshots are the real
index.html and popup-options.html, loaded with a fake chrome.* API
(scripts/store-assets/shim.js) and composed into mockups by
scripts/store-assets/mock.html. Edit that file to change the slides.

The Pixabay photos are not in git. The ones listed in
scripts/store-assets/photos.json are downloaded by id into
scripts/store-assets/photos/ (git-ignored) the first time, then reused.
With PIXABAY_API_KEY set they are looked up directly on the Pixabay API;
otherwise in the Simplite proxy's results for each photo's daypart, which
only works while the photo is still among those results.

Usage: python3 scripts/build_store_assets.py [--only 1,3,tile] [--keep] [--refresh-photos]
Needs Chrome or Chromium, ImageMagick (`magick`) and a network connection
(the headlines use a Google Font). Set CHROME=/path/to/chrome to pick one.
"""

import argparse
import functools
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'scripts' / 'store-assets'
PHOTOS = ASSETS / 'photos'
PHOTO_LIST = ASSETS / 'photos.json'
OUT = ROOT / 'store'

PIXABAY_API = 'https://pixabay.com/api/'
PROXY_MEDIA = 'https://simplite-backend.fitzxel.workers.dev/api/media'
USER_AGENT = 'simplite-store-assets'
# No timestamp chunks, so re-rendering identical images leaves git clean.
NO_DATES = ['-define', 'png:exclude-chunks=date,time']

# name -> (slide id in mock.html, width, height)
IMAGES = {
    'screenshot-1-1280x800.png': ('1', 1280, 800),
    'screenshot-2-1280x800.png': ('2', 1280, 800),
    'screenshot-3-1280x800.png': ('3', 1280, 800),
    'screenshot-4-1280x800.png': ('4', 1280, 800),
    'screenshot-5-1280x800.png': ('5', 1280, 800),
    'small-promo-440x280.png': ('tile', 440, 280),
    'marquee-1400x560.png': ('marquee', 1400, 560),
}

# The extension files the pages load, linked into the temporary site.
LINKED = ['src', '_locales', 'resources', 'manifest.json']
PAGES = ['index.html', 'popup-options.html']
BOOT_TAG = '<script src="src/boot.js"></script>'


def fail(message):
    sys.exit(f'build_store_assets: {message}')


def find_chrome():
    candidates = [os.environ.get('CHROME'), 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']
    for name in filter(None, candidates):
        path = shutil.which(name)
        if path:
            return path
    fail('Chrome/Chromium not found (set CHROME=/path/to/chrome)')


def http_get(url, attempts=4):
    """GET with retries: the proxy rate-limits and Pixabay fails now and then."""
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == attempts:
                raise
            wait = 15 if getattr(error, 'code', None) == 429 else 3 * attempt
            time.sleep(wait)


def is_complete_jpeg(data):
    return data[:2] == b'\xff\xd8' and data.rstrip(b'\x00')[-2:] == b'\xff\xd9'


def photo_url(entry, key, proxy_hits):
    """Download URL (1280px) for one photos.json entry."""
    if key:
        query = urllib.parse.urlencode({'key': key, 'id': entry['id']})
        hits = json.loads(http_get(f'{PIXABAY_API}?{query}')).get('hits', [])
    else:
        daypart = entry['daypart']
        if daypart not in proxy_hits:
            query = urllib.parse.urlencode({'type': 'photo', 'daypart': daypart})
            proxy_hits[daypart] = json.loads(http_get(f'{PROXY_MEDIA}?{query}')).get('hits', [])
        hits = [hit for hit in proxy_hits[daypart] if hit.get('id') == entry['id']]
    if not hits:
        return None
    return hits[0].get('largeImageURL') or hits[0].get('webformatURL')


def fetch_photos(refresh):
    """Download the photos mock.html uses that are not cached yet."""
    entries = {name: entry for name, entry in json.loads(PHOTO_LIST.read_text(encoding='utf-8')).items()
               if not name.startswith('_')}
    PHOTOS.mkdir(exist_ok=True)
    wanted = [name for name in entries if refresh or not (PHOTOS / name).exists()]
    if not wanted:
        return

    key = os.environ.get('PIXABAY_API_KEY')
    print(f'Downloading {len(wanted)} photo(s) from Pixabay ({"API" if key else "Simplite proxy"})...')
    proxy_hits = {}
    missing = []
    for name in wanted:
        entry = entries[name]
        url = photo_url(entry, key, proxy_hits)
        if not url:
            missing.append(f'{name} (id {entry["id"]}, {entry["page"]})')
            continue
        for _ in range(3):
            data = http_get(url)
            if is_complete_jpeg(data):
                break
        else:
            fail(f'{name}: the download keeps arriving truncated')
        (PHOTOS / name).write_bytes(data)
        print(f'  photos/{name}')

    if missing:
        fail('not found:\n  ' + '\n  '.join(missing) + '\n'
             'The proxy only returns the current top results for each daypart. Set PIXABAY_API_KEY '
             'to look photos up by id, or replace them in photos.json and mock.html.')


def build_site(site):
    for name in LINKED:
        (site / name).symlink_to(ROOT / name)
    (site / 'photos').symlink_to(ASSETS / 'photos')
    for name in ['mock.html', 'shim.js']:
        shutil.copy(ASSETS / name, site / name)
    # The real pages, with the shim in place of boot.js (it applies the same settings).
    for page in PAGES:
        html = (ROOT / page).read_text(encoding='utf-8')
        if BOOT_TAG not in html:
            fail(f'{page} no longer loads src/boot.js; update the shim injection')
        (site / page).write_text(html.replace(BOOT_TAG, '<script src="shim.js"></script>'), encoding='utf-8')


def serve(site):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(site)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def render(chrome, port, slide, width, height, out):
    url = f'http://127.0.0.1:{port}/mock.html?s={slide}&w={width}&h={height}'
    subprocess.run([
        chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        f'--window-size={width},{height}', '--timeout=7000', '--run-all-compositor-stages-before-draw',
        f'--screenshot={out}', url,
    ], check=True, capture_output=True)
    if not out.exists():
        fail(f'Chrome did not write {out.name}')


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--only', help='comma-separated slide ids to render (1-5, tile, marquee, icon)')
    parser.add_argument('--keep', action='store_true', help='keep the temporary site and print its path')
    parser.add_argument('--refresh-photos', action='store_true', help='download the photos again even if cached')
    args = parser.parse_args()

    only = set(args.only.split(',')) if args.only else None
    chrome = find_chrome()
    magick = shutil.which('magick') or fail('ImageMagick (magick) not found')
    fetch_photos(args.refresh_photos)
    OUT.mkdir(exist_ok=True)

    site = Path(tempfile.mkdtemp(prefix='simplite-store-'))
    build_site(site)
    server = serve(site)
    port = server.server_address[1]
    try:
        for name, (slide, width, height) in IMAGES.items():
            if only and slide not in only:
                continue
            raw = site / f'raw-{name}'
            render(chrome, port, slide, width, height, raw)
            # The store wants JPEG or 24-bit PNG: drop the alpha channel.
            subprocess.run([magick, raw, '-alpha', 'off', '-define', 'png:color-type=2', *NO_DATES, OUT / name], check=True)
            print(f'  store/{name}')

        if not only or 'icon' in only:
            # 96x96 artwork centred in 128x128 with transparent padding, as the store asks.
            subprocess.run([magick, '-background', 'none', '-density', '600', ROOT / 'resources' / 'icon.svg',
                            '-resize', '96x96', '-gravity', 'center', '-extent', '128x128', *NO_DATES,
                            OUT / 'store-icon-128.png'], check=True)
            print('  store/store-icon-128.png')
    finally:
        server.shutdown()
        if args.keep:
            print(f'Site kept at {site} (serve it to preview mock.html?s=1)')
        else:
            shutil.rmtree(site)


if __name__ == '__main__':
    main()
