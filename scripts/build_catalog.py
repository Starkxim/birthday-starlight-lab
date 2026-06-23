#!/usr/bin/env python3
"""Build the static nearby-star catalog used by Birthday Starlight.

The script intentionally uses only Python's standard library so it can run
unchanged on GitHub Actions. Gaia is queried once during preprocessing; the
public site reads the generated JSON instead of querying Gaia per visitor.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import math
import pathlib
import sys
import time
import urllib.parse
import urllib.request


LY_PER_PARALLAX_MAS = 3261.563777
GAIA_TAP_SYNC = "https://gea.esac.esa.int/tap-server/tap/sync"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build static Gaia nearby-star catalog")
    parser.add_argument("--max-distance-ly", type=float, default=150.0)
    parser.add_argument("--max-g-mag", type=float, default=14.0)
    parser.add_argument("--min-parallax-over-error", type=float, default=20.0)
    parser.add_argument("--maxrec", type=int, default=50000)
    parser.add_argument("--output", default="data/star-catalog.json")
    return parser.parse_args()


def as_float(row: dict[str, str], key: str) -> float | None:
    value = row.get(key)
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def round_or_none(value: float | None, digits: int) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    return round(value, digits)


def color_class(bp_rp: float | None) -> str:
    if bp_rp is None:
        return "unknown"
    if bp_rp < 0.0:
        return "blue-white"
    if bp_rp < 0.55:
        return "white"
    if bp_rp < 0.9:
        return "yellow-white"
    if bp_rp < 1.45:
        return "orange"
    return "red"


def build_query(max_distance_ly: float, max_g_mag: float, min_snr: float) -> str:
    min_parallax = LY_PER_PARALLAX_MAS / max_distance_ly
    return f"""
SELECT
  source_id,
  designation,
  ra,
  dec,
  parallax,
  parallax_error,
  parallax_over_error,
  pmra,
  pmdec,
  phot_g_mean_mag,
  phot_bp_mean_mag,
  phot_rp_mean_mag,
  bp_rp,
  ruwe
FROM gaiadr3.gaia_source
WHERE parallax >= {min_parallax:.10f}
  AND parallax_over_error >= {min_snr:.4f}
  AND phot_g_mean_mag <= {max_g_mag:.4f}
  AND ra IS NOT NULL
  AND dec IS NOT NULL
  AND parallax IS NOT NULL
  AND phot_g_mean_mag IS NOT NULL
ORDER BY parallax DESC
"""


def fetch_gaia_csv(query: str, maxrec: int) -> str:
    params = urllib.parse.urlencode(
        {
            "REQUEST": "doQuery",
            "LANG": "ADQL",
            "FORMAT": "csv",
            "MAXREC": str(maxrec),
            "QUERY": query,
        }
    )
    request = urllib.request.Request(
        f"{GAIA_TAP_SYNC}?{params}",
        headers={"User-Agent": "Birthday-Starlight/1.0"},
    )
    start = time.time()
    with urllib.request.urlopen(request, timeout=180) as response:
        text = response.read().decode("utf-8", errors="replace")
    elapsed = time.time() - start
    print(f"Gaia query returned {len(text):,} bytes in {elapsed:.1f}s", file=sys.stderr)
    head = text[:1000].lstrip()
    if head.startswith("<") or head.upper().startswith("ERROR") or "Exception" in head:
        raise RuntimeError(text[:2000])
    return text


def transform(csv_text: str) -> list[dict[str, object]]:
    stars: list[dict[str, object]] = []
    for row in csv.DictReader(csv_text.splitlines()):
        parallax = as_float(row, "parallax")
        parallax_error = as_float(row, "parallax_error")
        g_mag = as_float(row, "phot_g_mean_mag")
        ra = as_float(row, "ra")
        dec = as_float(row, "dec")
        if parallax is None or parallax <= 0 or g_mag is None or ra is None or dec is None:
            continue

        distance_ly = LY_PER_PARALLAX_MAS / parallax
        if parallax_error is not None and 0 < parallax_error < parallax:
            distance_min_ly = LY_PER_PARALLAX_MAS / (parallax + parallax_error)
            distance_max_ly = LY_PER_PARALLAX_MAS / (parallax - parallax_error)
        else:
            distance_min_ly = distance_ly
            distance_max_ly = distance_ly

        source_id = str(row.get("source_id", "")).strip()
        designation = row.get("designation", "").strip() or f"Gaia DR3 {source_id}"
        bp_rp = as_float(row, "bp_rp")

        stars.append(
            {
                "id": source_id,
                "designation": designation,
                "ra": round(ra, 7),
                "dec": round(dec, 7),
                "parallaxMas": round(parallax, 6),
                "parallaxErrorMas": round_or_none(parallax_error, 6),
                "parallaxSnr": round_or_none(as_float(row, "parallax_over_error"), 2),
                "distanceLy": round(distance_ly, 4),
                "distanceMinLy": round(distance_min_ly, 4),
                "distanceMaxLy": round(distance_max_ly, 4),
                "gMag": round(g_mag, 3),
                "bpMag": round_or_none(as_float(row, "phot_bp_mean_mag"), 3),
                "rpMag": round_or_none(as_float(row, "phot_rp_mean_mag"), 3),
                "bpRp": round_or_none(bp_rp, 3),
                "colorClass": color_class(bp_rp),
                "pmRa": round_or_none(as_float(row, "pmra"), 3),
                "pmDec": round_or_none(as_float(row, "pmdec"), 3),
                "ruwe": round_or_none(as_float(row, "ruwe"), 3),
            }
        )

    stars.sort(key=lambda item: (item["distanceLy"], item["gMag"]))
    return stars


def main() -> int:
    args = parse_args()
    query = build_query(args.max_distance_ly, args.max_g_mag, args.min_parallax_over_error)
    csv_text = fetch_gaia_csv(query, args.maxrec)
    stars = transform(csv_text)

    output = pathlib.Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta": {
            "title": "Birthday Starlight Nearby Star Catalog",
            "source": "Gaia DR3 via ESA Gaia Archive TAP+",
            "generatedAtUtc": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat(),
            "maxDistanceLy": args.max_distance_ly,
            "maxGMag": args.max_g_mag,
            "minParallaxOverError": args.min_parallax_over_error,
            "count": len(stars),
            "distanceFormula": "distance_ly = 3261.563777 / parallax_mas",
            "usage": "Static public-site catalog; do not query Gaia per visitor.",
        },
        "stars": stars,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(stars):,} stars to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
