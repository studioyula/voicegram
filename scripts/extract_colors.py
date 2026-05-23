#!/usr/bin/env python3
"""Extract Jessica Poundstone Color Space palettes for VOICEGRAM.

This utility is intentionally standalone: it downloads source artwork images
locally, extracts per-artwork palettes with KMeans, and writes JSON plus a
small JavaScript palette object that can be copied into the Mosaic mode.
"""

import argparse
import datetime as dt
import json
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    import numpy as np
    import requests
    from bs4 import BeautifulSoup
    from PIL import Image
    from sklearn.cluster import KMeans
except ImportError as exc:
    missing = getattr(exc, "name", "a required package")
    print(
        "Missing dependency: {0}\n"
        "Install with: python3 -m pip install requests beautifulsoup4 pillow numpy scikit-learn".format(
            missing
        ),
        file=sys.stderr,
    )
    raise SystemExit(1)


BASE_URL = "https://www.jessicapoundstone.com"
COLLECTION_URL = BASE_URL + "/color-space-collection"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
)

EXCLUDED_SERIES = (
    "gradient",
    "radiance",
    "interaction",
    "aura",
    "portal",
)

HUE_GROUPS = (
    ("coral", 0, 30),
    ("orange", 30, 60),
    ("yellow", 60, 90),
    ("green", 90, 150),
    ("teal", 150, 200),
    ("blue", 200, 260),
    ("purple", 260, 310),
    ("pink", 310, 360),
)


def request_page(url, timeout):
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    resp.raise_for_status()
    return resp


def slug_to_name(slug):
    parts = [part for part in slug.split("-") if part]
    return " ".join(part.capitalize() for part in parts)


def clean_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def clean_artwork_name(value):
    name = clean_text(value)
    name = re.sub(r"\s+from\s+\$[\d,.]+.*$", "", name, flags=re.IGNORECASE)
    return name


def normalize_url(url, base_url=BASE_URL):
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    return urljoin(base_url, url)


def is_target_artwork_url(url):
    parsed = urlparse(url)
    path = parsed.path.lower().rstrip("/")
    if any(series in path for series in EXCLUDED_SERIES):
        return False
    return bool(re.search(r"/color-space-collection/color-space-\d+", path))


def image_url_with_format(url, width=1000):
    parsed = urlparse(url)
    clean_url = url.split("?")[0]
    if "squarespace" in parsed.netloc:
        return clean_url + "?format={0}w".format(width)
    return clean_url


def parse_srcset(srcset):
    urls = []
    for chunk in (srcset or "").split(","):
        item = chunk.strip().split(" ")
        if item and item[0]:
            urls.append(item[0])
    return urls


def get_artwork_urls(collection_url=COLLECTION_URL, timeout=15):
    """Collect Color Space numbered artwork pages from the collection page."""
    resp = request_page(collection_url, timeout)
    soup = BeautifulSoup(resp.text, "html.parser")
    artworks = []
    seen = set()

    for a in soup.find_all("a", href=True):
        url = normalize_url(a["href"], collection_url)
        if not is_target_artwork_url(url) or url in seen:
            continue

        seen.add(url)
        slug = urlparse(url).path.rstrip("/").split("/")[-1]
        name = clean_artwork_name(a.get_text(" ")) or slug_to_name(slug)
        artworks.append({"name": name, "url": url, "slug": slug})

    artworks.sort(key=lambda item: item["url"])
    return artworks


def is_candidate_image(url):
    if not url:
        return False
    lowered = url.lower()
    if "favicon" in lowered or "logo" in lowered:
        return False
    if "static1.squarespace" in lowered or "images.squarespace" in lowered:
        return True
    return bool(re.search(r"\.(jpg|jpeg|png|webp)(\?|$)", lowered))


def get_image_url(artwork_url, timeout=15):
    """Extract the likely main artwork image from a Squarespace artwork page."""
    resp = request_page(artwork_url, timeout)
    soup = BeautifulSoup(resp.text, "html.parser")
    candidates = []

    for meta in soup.find_all("meta"):
        content = meta.get("content") or ""
        prop = meta.get("property") or meta.get("name") or ""
        if prop.lower() in ("og:image", "twitter:image") and is_candidate_image(content):
            candidates.append(content)

    for img in soup.find_all("img"):
        for attr in ("data-src", "data-image", "data-original", "src"):
            src = img.get(attr)
            if is_candidate_image(src):
                candidates.append(src)
        for src in parse_srcset(img.get("srcset")) + parse_srcset(img.get("data-srcset")):
            if is_candidate_image(src):
                candidates.append(src)

    seen = set()
    for src in candidates:
        url = image_url_with_format(normalize_url(src, artwork_url))
        if url and url not in seen:
            seen.add(url)
            return url

    return None


def safe_filename(value):
    value = re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip().lower())
    return re.sub(r"_+", "_", value).strip("_") or "artwork"


def download_images(artworks, output_dir, delay=1.0, timeout=15, force=False):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    downloaded = []

    for idx, artwork in enumerate(artworks):
        image_url = artwork.get("image_url")
        if not image_url:
            print("Skipping {0}: no image URL".format(artwork["url"]))
            continue

        filename = "{0:03d}_{1}.jpg".format(idx + 1, safe_filename(artwork["slug"]))
        filepath = output / filename

        if filepath.exists() and not force:
            print("Using cached: {0}".format(filepath))
        else:
            try:
                resp = requests.get(
                    image_url,
                    headers={"User-Agent": USER_AGENT},
                    timeout=timeout,
                )
                resp.raise_for_status()
                filepath.write_bytes(resp.content)
                print("Downloaded: {0}".format(filepath))
            except Exception as exc:
                print("Failed: {0} - {1}".format(image_url, exc))
                time.sleep(delay)
                continue

        item = dict(artwork)
        item["image_path"] = str(filepath)
        downloaded.append(item)
        time.sleep(delay)

    return downloaded


def rgb_to_hsb(r, g, b):
    r2, g2, b2 = r / 255.0, g / 255.0, b / 255.0
    mx = max(r2, g2, b2)
    mn = min(r2, g2, b2)
    diff = mx - mn

    bri = mx * 100
    sat = 0 if mx == 0 else (diff / mx) * 100

    if diff == 0:
        hue = 0
    elif mx == r2:
        hue = 60 * (((g2 - b2) / diff) % 6)
    elif mx == g2:
        hue = 60 * (((b2 - r2) / diff) + 2)
    else:
        hue = 60 * (((r2 - g2) / diff) + 4)

    return {"h": round(hue), "s": round(sat), "b": round(bri)}


def color_entry(rgb, ratio):
    rgb = [int(max(0, min(255, round(channel)))) for channel in rgb]
    return {
        "hex": "#{0:02x}{1:02x}{2:02x}".format(rgb[0], rgb[1], rgb[2]),
        "rgb": rgb,
        "hsb": rgb_to_hsb(rgb[0], rgb[1], rgb[2]),
        "ratio": round(float(ratio), 3),
    }


def is_pastel_color(color, min_brightness=68, min_saturation=8, max_saturation=82):
    hsb = color["hsb"]
    return (
        hsb["b"] >= min_brightness
        and hsb["s"] >= min_saturation
        and hsb["s"] <= max_saturation
    )


def pastel_score(color):
    hsb = color["hsb"]
    brightness_score = hsb["b"] / 100.0
    # Pastel sits around medium saturation, but gentle vivid colors are allowed.
    saturation_score = 1.0 - min(abs(hsb["s"] - 42) / 42.0, 1.0)
    return brightness_score * 0.7 + saturation_score * 0.3


def filter_pastel_palette(
    palette,
    n_colors,
    min_brightness=68,
    min_saturation=8,
    max_saturation=82,
):
    filtered = [
        color
        for color in palette
        if is_pastel_color(color, min_brightness, min_saturation, max_saturation)
    ]
    filtered.sort(
        key=lambda color: (pastel_score(color) * 0.75) + (color["ratio"] * 0.25),
        reverse=True,
    )
    return filtered[:n_colors]


def extract_palette(
    image_path,
    n_colors=7,
    crop_pct=0.12,
    resize=200,
    candidate_colors=24,
    pastel_only=True,
    min_brightness=68,
    min_saturation=8,
    max_saturation=82,
):
    """Extract major colors from one image."""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size

    crop = int(min(w, h) * crop_pct)
    if crop > 0 and w > crop * 2 and h > crop * 2:
        img = img.crop((crop, crop, w - crop, h - crop))

    img = img.resize((resize, resize))
    pixels = np.array(img).reshape(-1, 3)

    # Remove near-white border or page background.
    mask = ~((pixels[:, 0] > 240) & (pixels[:, 1] > 240) & (pixels[:, 2] > 240))
    pixels = pixels[mask]

    cluster_count = max(n_colors, candidate_colors if pastel_only else n_colors)

    if len(pixels) < cluster_count:
        return []

    kmeans = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
    kmeans.fit(pixels)

    labels = kmeans.labels_
    counts = Counter(labels)
    total = float(len(labels))
    palette = []

    for label, count in counts.most_common():
        center = kmeans.cluster_centers_[label]
        palette.append(color_entry(center, count / total))

    if pastel_only:
        return filter_pastel_palette(
            palette,
            n_colors,
            min_brightness=min_brightness,
            min_saturation=min_saturation,
            max_saturation=max_saturation,
        )

    return palette[:n_colors]


def build_combined_palette(artworks, top_n=20):
    colors = []
    weights = []

    for artwork in artworks:
        for color in artwork.get("palette", []):
            colors.append(color["rgb"])
            weights.append(float(color.get("ratio", 0)))

    if not colors:
        return []

    colors_np = np.array(colors, dtype=float)
    weights_np = np.array(weights, dtype=float)
    if weights_np.sum() <= 0:
        weights_np = np.ones(len(colors_np), dtype=float)

    n_clusters = min(top_n, len(colors_np))
    if n_clusters == len(colors_np):
        order = np.argsort(weights_np)[::-1]
        total = weights_np.sum()
        return [color_entry(colors_np[i], weights_np[i] / total) for i in order[:top_n]]

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(colors_np, sample_weight=weights_np)
    labels = kmeans.labels_

    cluster_weights = defaultdict(float)
    for idx, label in enumerate(labels):
        cluster_weights[label] += weights_np[idx]

    total_weight = sum(cluster_weights.values()) or 1.0
    ordered = sorted(cluster_weights.items(), key=lambda item: item[1], reverse=True)
    return [
        color_entry(kmeans.cluster_centers_[label], weight / total_weight)
        for label, weight in ordered
    ]


def hue_group_for_color(color):
    hue = color["hsb"]["h"] % 360
    for name, start, end in HUE_GROUPS:
        if start <= hue < end:
            return name
    return "pink"


def pick_light_mid_deep(colors):
    if not colors:
        return []

    # Still ordered for Mosaic mapping, but restricted to the pastel-filtered set.
    ordered = sorted(
        colors,
        key=lambda color: (color["hsb"]["b"], color["hsb"]["s"]),
        reverse=True,
    )
    if len(ordered) == 1:
        return [ordered[0]["hex"], ordered[0]["hex"], ordered[0]["hex"]]

    mid_idx = len(ordered) // 2
    return [ordered[0]["hex"], ordered[mid_idx]["hex"], ordered[-1]["hex"]]


def build_voicegram_palette(colors):
    grouped = defaultdict(list)
    for color in colors:
        grouped[hue_group_for_color(color)].append(color)

    palette = {}
    for name, _, _ in HUE_GROUPS:
        picked = pick_light_mid_deep(grouped.get(name, []))
        if picked:
            palette[name] = picked
    return palette


def write_voicegram_js(path, palette):
    lines = [
        "// Generated by scripts/extract_colors.py",
        "// Pastel-only. Order per group: light edge, middle, deeper pastel center.",
        "var POUNDSTONE_COLORS = {",
    ]
    for name in sorted(palette.keys()):
        colors = ", ".join(json.dumps(color) for color in palette[name])
        lines.append("  {0}: [{1}],".format(name, colors))
    lines.append("};")
    lines.append("")
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def escape_html(value):
    value = str(value)
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def color_card(color):
    label = "{0} RGB({1}, {2}, {3}) HSB({4}, {5}, {6})".format(
        color["hex"],
        color["rgb"][0],
        color["rgb"][1],
        color["rgb"][2],
        color["hsb"]["h"],
        color["hsb"]["s"],
        color["hsb"]["b"],
    )
    return (
        '<div class="swatch" title="{label}">'
        '<div class="chip" style="background:{hex};"></div>'
        '<div class="meta"><strong>{hex}</strong><span>{ratio}</span></div>'
        "</div>"
    ).format(
        label=escape_html(label),
        hex=escape_html(color["hex"]),
        ratio=escape_html("ratio {0}".format(color.get("ratio", "-"))),
    )


def write_html_preview(path, result):
    artworks_html = []
    for artwork in result["artworks"]:
        swatches = "\n".join(color_card(color) for color in artwork["palette"])
        image = artwork.get("image_path") or artwork.get("image_url") or ""
        image_html = (
            '<img src="{0}" alt="{1}">'.format(
                escape_html(image), escape_html(artwork["name"])
            )
            if image
            else ""
        )
        artworks_html.append(
            '<section class="artwork">{image}<div><h2>{name}</h2>'
            '<a href="{url}">{url}</a><div class="swatches">{swatches}</div>'
            "</div></section>".format(
                image=image_html,
                name=escape_html(artwork["name"]),
                url=escape_html(artwork.get("url", "")),
                swatches=swatches,
            )
        )

    combined = "\n".join(
        color_card(color) for color in result["combined_palette"]["colors"]
    )

    voicegram_groups = []
    for name, colors in sorted(result["voicegram_palette"]["colors"].items()):
        chips = "\n".join(
            '<div class="voice-chip" style="background:{0};"><span>{0}</span></div>'.format(
                escape_html(color)
            )
            for color in colors
        )
        voicegram_groups.append(
            '<div class="voice-group"><h3>{0}</h3><div class="voice-row">{1}</div></div>'.format(
                escape_html(name), chips
            )
        )

    html = """<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Poundstone Palette Preview</title>
  <style>
    body { margin: 0; padding: 32px; background: #f7f4ef; color: #202020; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 0 0 6px; font-size: 20px; }
    h3 { margin: 0 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
    a { display: block; margin-bottom: 14px; color: #666; font-size: 12px; word-break: break-all; }
    .summary { margin-bottom: 30px; color: #666; }
    .panel, .artwork { margin-bottom: 24px; padding: 18px; background: white; border-radius: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.07); }
    .artwork { display: grid; grid-template-columns: 170px 1fr; gap: 18px; align-items: start; }
    .artwork img { width: 170px; border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
    .swatch { overflow: hidden; border-radius: 12px; background: #f2f2f2; border: 1px solid rgba(0,0,0,.08); }
    .chip { height: 74px; }
    .meta { display: flex; justify-content: space-between; gap: 8px; padding: 9px 10px; font-size: 12px; }
    .meta span { color: #777; }
    .voice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .voice-group { padding: 14px; background: #fafafa; border-radius: 14px; border: 1px solid rgba(0,0,0,.06); }
    .voice-row { display: grid; grid-template-columns: repeat(3, 1fr); min-height: 86px; overflow: hidden; border-radius: 12px; }
    .voice-chip { display: flex; align-items: end; padding: 8px; color: rgba(0,0,0,.72); font-size: 11px; font-weight: 700; text-shadow: 0 1px 10px rgba(255,255,255,.55); }
    @media (max-width: 720px) {
      body { padding: 18px; }
      .artwork { grid-template-columns: 1fr; }
      .artwork img { width: 100%; max-width: 260px; }
    }
  </style>
</head>
<body>
  <h1>Jessica Poundstone Color Space Palette Preview</h1>
  <p class="summary">Extracted at __DATE__. Bright pastel artwork palettes, combined colors, and VOICEGRAM hue groups.</p>
  <section class="panel">
    <h2>VOICEGRAM Groups</h2>
    <p class="summary">Each group is ordered as light edge, middle, deeper pastel center.</p>
    <div class="voice-grid">__VOICEGRAM__</div>
  </section>
  <section class="panel">
    <h2>Combined Palette</h2>
    <div class="swatches">__COMBINED__</div>
  </section>
  __ARTWORKS__
</body>
</html>
    )
"""
    html = (
        html.replace("__DATE__", escape_html(result["extracted_at"]))
        .replace("__VOICEGRAM__", "\n".join(voicegram_groups))
        .replace("__COMBINED__", combined)
        .replace("__ARTWORKS__", "\n".join(artworks_html))
    )
    Path(path).write_text(html, encoding="utf-8")


def collect_from_web(args):
    artworks = get_artwork_urls(args.collection_url, args.timeout)
    if args.limit:
        artworks = artworks[: args.limit]

    print("Found {0} Color Space artwork pages".format(len(artworks)))
    for artwork in artworks:
        try:
            artwork["image_url"] = get_image_url(artwork["url"], args.timeout)
            print("Image: {0}".format(artwork["image_url"] or "not found"))
        except Exception as exc:
            artwork["image_url"] = None
            print("Failed page: {0} - {1}".format(artwork["url"], exc))
        time.sleep(args.delay)

    return download_images(
        artworks,
        args.image_dir,
        delay=args.delay,
        timeout=args.timeout,
        force=args.force,
    )


def collect_from_images(paths):
    artworks = []
    for path in paths:
        filepath = Path(path)
        slug = safe_filename(filepath.stem)
        artworks.append(
            {
                "name": slug_to_name(slug.replace("_", "-")),
                "url": "",
                "slug": slug,
                "image_url": "",
                "image_path": str(filepath),
            }
        )
    return artworks


def build_output(artworks, args):
    extracted = []
    for artwork in artworks:
        palette = extract_palette(
            artwork["image_path"],
            n_colors=args.colors,
            crop_pct=args.crop_pct,
            resize=args.resize,
            candidate_colors=args.candidate_colors,
            pastel_only=not args.no_pastel_filter,
            min_brightness=args.min_brightness,
            min_saturation=args.min_saturation,
            max_saturation=args.max_saturation,
        )
        item = {
            "name": artwork["name"],
            "url": artwork["url"],
            "image_url": artwork.get("image_url", ""),
            "image_path": artwork["image_path"],
            "palette": palette,
        }
        extracted.append(item)
        print("Palette: {0} ({1} colors)".format(artwork["name"], len(palette)))

    combined = build_combined_palette(extracted, top_n=args.combined_colors)
    voicegram = build_voicegram_palette(combined)

    return {
        "source": "Jessica Poundstone - Color Space series",
        "url": args.collection_url,
        "extracted_at": dt.date.today().isoformat(),
        "settings": {
            "colors_per_artwork": args.colors,
            "crop_pct": args.crop_pct,
            "resize": args.resize,
            "combined_colors": args.combined_colors,
            "pastel_filter": not args.no_pastel_filter,
            "candidate_colors": args.candidate_colors,
            "min_brightness": args.min_brightness,
            "min_saturation": args.min_saturation,
            "max_saturation": args.max_saturation,
        },
        "artworks": extracted,
        "combined_palette": {
            "description": "Top colors clustered from all extracted artwork palettes",
            "colors": combined,
        },
        "voicegram_palette": {
            "description": "Pastel hue groups ordered as light edge, middle, deeper pastel center",
            "colors": voicegram,
        },
    }


def parse_args():
    parser = argparse.ArgumentParser(
        description="Extract Jessica Poundstone Color Space palettes."
    )
    parser.add_argument("--collection-url", default=COLLECTION_URL)
    parser.add_argument("--image-dir", default="poundstone_images")
    parser.add_argument("--output", default="poundstone_palettes.json")
    parser.add_argument("--js-output", default="poundstone_colors.js")
    parser.add_argument("--html-output", default="poundstone_palette_preview.html")
    parser.add_argument("--colors", type=int, default=7, help="Per-artwork colors.")
    parser.add_argument(
        "--candidate-colors",
        type=int,
        default=24,
        help="KMeans candidates before pastel filtering.",
    )
    parser.add_argument("--combined-colors", type=int, default=20)
    parser.add_argument(
        "--no-pastel-filter",
        action="store_true",
        help="Keep dark and saturated colors instead of filtering to pastels.",
    )
    parser.add_argument("--min-brightness", type=int, default=68)
    parser.add_argument("--min-saturation", type=int, default=8)
    parser.add_argument("--max-saturation", type=int, default=82)
    parser.add_argument("--crop-pct", type=float, default=0.12)
    parser.add_argument("--resize", type=int, default=200)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=15)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true", help="Re-download images.")
    parser.add_argument(
        "--from-images",
        nargs="*",
        default=None,
        help="Skip scraping and extract from existing image files.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.colors < 5 or args.colors > 8:
        raise SystemExit("--colors should be between 5 and 8 for the target palette.")

    if args.from_images is not None:
        artworks = collect_from_images(args.from_images)
    else:
        artworks = collect_from_web(args)

    if not artworks:
        raise SystemExit("No artworks or images found.")

    result = build_output(artworks, args)
    Path(args.output).write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    write_voicegram_js(args.js_output, result["voicegram_palette"]["colors"])
    write_html_preview(args.html_output, result)

    print("Wrote JSON: {0}".format(args.output))
    print("Wrote JS: {0}".format(args.js_output))
    print("Wrote HTML preview: {0}".format(args.html_output))


if __name__ == "__main__":
    main()
