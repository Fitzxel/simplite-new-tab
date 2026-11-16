#!/usr/bin/env python3
"""Build the store package: dist/simplite-new-tab-<version>.zip

Only the paths in INCLUDE go into the zip, so anything else in the repo
(.git, tests/, odd/, .atl/, .codegraph/, README.md, ...) can never end up in
the extension by accident. When you add a file or folder the extension needs
at runtime, add it to INCLUDE.

Usage: python3 scripts/build_zip.py [--skip-tests]
Only uses the Python standard library; the tests need Node.js.
"""

import argparse
import fnmatch
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent

# Files and folders the browser loads. Folders are added whole, minus EXCLUDE.
INCLUDE = [
    'manifest.json',
    'background.js',
    'index.html',
    'popup-options.html',
    'LICENSE',
    '_locales',
    'src',
    'resources/default_wallpaper.jpg',
    'resources/icon.svg',
    'resources/icon_x16.png',
    'resources/icon_x32.png',
    'resources/icon_x48.png',
    'resources/icon_x128.png',
]

# Never packaged, even inside an included folder (matched against each name).
EXCLUDE = ['.*', '*.test.*', '*.map', '*.md']

# Must never appear anywhere in the zip; a last line of defence.
FORBIDDEN_DIRS = {'tests', 'odd', 'node_modules', 'dist', 'scripts'}

HTML_PAGES = ['index.html', 'popup-options.html']
HTML_REF = re.compile(r'(?:src|href)="([^"#?]+)"')
SRC_REF = re.compile(r"""(?:url\(['"]?|import\s[^'"]*['"]|import\s*\(\s*['"])(\.{1,2}/[^'")]+)""")


def fail(message):
    sys.exit(f'build_zip: {message}')


def excluded(path):
    return any(fnmatch.fnmatch(part, pattern) for part in path.parts for pattern in EXCLUDE)


def collect_files():
    files = []
    for entry in INCLUDE:
        path = ROOT / entry
        if not path.exists():
            fail(f'listed in INCLUDE but missing: {entry}')
        candidates = sorted(p for p in path.rglob('*') if p.is_file()) if path.is_dir() else [path]
        files += [p.relative_to(ROOT) for p in candidates if not excluded(p.relative_to(ROOT))]
    return files


def local_references(manifest):
    """Every local file the manifest and the pages point to."""
    refs = set(manifest.get('icons', {}).values())
    refs.add(manifest.get('background', {}).get('service_worker'))
    refs.add(manifest.get('action', {}).get('default_popup'))
    refs.add(manifest.get('options_ui', {}).get('page'))
    refs.update(manifest.get('chrome_url_overrides', {}).values())

    for page in HTML_PAGES:
        for ref in HTML_REF.findall((ROOT / page).read_text(encoding='utf-8')):
            if not re.match(r'^[a-z]+:', ref, re.I):
                refs.add(ref)

    for source in (ROOT / 'src').iterdir():
        if source.suffix in {'.js', '.mjs', '.css'}:
            for ref in SRC_REF.findall(source.read_text(encoding='utf-8')):
                refs.add(str(PurePosixPath('src', ref)))

    # Normalise "src/../resources/x" to "resources/x".
    normalised = set()
    for ref in filter(None, refs):
        parts = []
        for part in PurePosixPath(ref).parts:
            if part == '..':
                parts.pop()
            elif part != '.':
                parts.append(part)
        normalised.add('/'.join(parts))
    return normalised


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--skip-tests', action='store_true', help='do not run the test suite first')
    args = parser.parse_args()

    if not args.skip_tests:
        print('Running tests...')
        tests = sorted(str(p) for p in (ROOT / 'tests').glob('*.mjs'))
        result = subprocess.run(['node', '--test', *tests], cwd=ROOT, capture_output=True, text=True)
        if result.returncode != 0:
            print(result.stdout[-3000:], file=sys.stderr)
            fail('tests failed (run: node --test tests/*.mjs)')

    try:
        manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    except json.JSONDecodeError as error:
        fail(f'manifest.json is not valid JSON: {error}')
    version = manifest.get('version') or fail('manifest.json has no version')

    files = collect_files()
    packaged = {path.as_posix() for path in files}

    missing = sorted(ref for ref in local_references(manifest) if ref not in packaged)
    if missing:
        for ref in missing:
            print(f'  missing: {ref}', file=sys.stderr)
        fail('the package is missing files the extension uses (see above)')

    bad = sorted(p for p in packaged if any(part.startswith('.') or part in FORBIDDEN_DIRS for part in p.split('/')))
    if bad:
        fail('forbidden paths would be packaged: ' + ', '.join(bad))

    out = ROOT / 'dist' / f'simplite-new-tab-{version}.zip'
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(ROOT / path, path.as_posix())

    with zipfile.ZipFile(out) as archive:
        if 'manifest.json' not in archive.namelist():
            fail('manifest.json is not at the root of the zip')
        if archive.testzip() is not None:
            fail('the zip is corrupt')

    size_kb = out.stat().st_size / 1024
    print(f'Built {out.relative_to(ROOT)} ({len(files)} files, {size_kb:.0f} KB)')


if __name__ == '__main__':
    main()
