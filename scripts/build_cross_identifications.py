#!/usr/bin/env python3
"""Build a compact SIMBAD cross-identification overlay.

The public app stays static: this script queries SIMBAD during preprocessing
and writes a small JSON file that the browser can load next to the Gaia catalog.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request


SIMBAD_TAP_SYNC = "https://simbad.cds.unistra.fr/simbad/sim-tap/sync"

GREEK_NAMES = {
    "alf": "Alpha",
    "bet": "Beta",
    "gam": "Gamma",
    "del": "Delta",
    "eps": "Epsilon",
    "zet": "Zeta",
    "eta": "Eta",
    "tet": "Theta",
    "iot": "Iota",
    "kap": "Kappa",
    "lam": "Lambda",
    "mu.": "Mu",
    "nu.": "Nu",
    "ksi": "Xi",
    "omi": "Omicron",
    "pi.": "Pi",
    "rho": "Rho",
    "sig": "Sigma",
    "tau": "Tau",
    "ups": "Upsilon",
    "phi": "Phi",
    "khi": "Chi",
    "psi": "Psi",
    "ome": "Omega",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build SIMBAD cross-identification JSON")
    parser.add_argument("--catalog", default="data/star-catalog.json")
    parser.add_argument("--output", default="data/star-crossids.json")
    parser.add_argument("--max-g-mag", type=float, default=8.5)
    parser.add_argument("--chunk-size", type=int, default=80)
    parser.add_argument("--sleep", type=float, default=0.15)
    return parser.parse_args()


def load_catalog(path: pathlib.Path, max_g_mag: float) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    stars = payload.get("stars", [])
    return [star for star in stars if float(star.get("gMag", 99)) <= max_g_mag]


def build_query(source_ids: list[str]) -> str:
    gaia_ids = ", ".join(adql_string(f"Gaia DR3 {source_id}") for source_id in source_ids)
    return f"""
SELECT
  g.id AS gaia_id,
  b.main_id,
  b.otype,
  i.id
FROM basic AS b
JOIN ident AS g ON b.oid = g.oidref
JOIN ident AS i ON b.oid = i.oidref
WHERE g.id IN ({gaia_ids})
ORDER BY 1, 4
"""


def adql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def fetch_simbad_csv(query: str) -> str:
    body = urllib.parse.urlencode(
        {
            "REQUEST": "doQuery",
            "LANG": "ADQL",
            "FORMAT": "csv",
            "MAXREC": "200000",
            "QUERY": query,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        SIMBAD_TAP_SYNC,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Birthday-Starlight/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        text = response.read().decode("utf-8", errors="replace")
    head = text[:1000].lstrip()
    if head.startswith("<") or head.upper().startswith("ERROR") or "Exception" in head:
        raise RuntimeError(text[:2000])
    return text


def chunks(items: list[dict[str, object]], size: int) -> list[list[dict[str, object]]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def collect_rows(stars: list[dict[str, object]], chunk_size: int, sleep_seconds: float) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = {}
    batches = chunks(stars, chunk_size)
    for index, batch in enumerate(batches, start=1):
        ids = [str(star["id"]) for star in batch]
        csv_text = fetch_simbad_csv(build_query(ids))
        row_count = 0
        for row in csv.DictReader(csv_text.splitlines()):
            gaia_id = row.get("gaia_id", "").removeprefix("Gaia DR3 ").strip()
            if not gaia_id:
                continue
            entry = grouped.setdefault(
                gaia_id,
                {
                    "simbadMainId": clean_identifier(row.get("main_id", "")),
                    "otype": clean_identifier(row.get("otype", "")),
                    "ids": [],
                },
            )
            identifier = clean_identifier(row.get("id", ""))
            if identifier:
                entry["ids"].append(identifier)
                row_count += 1
        print(f"SIMBAD chunk {index}/{len(batches)}: {len(batch)} Gaia ids, {row_count} identifiers", file=sys.stderr)
        if sleep_seconds > 0 and index < len(batches):
            time.sleep(sleep_seconds)
    return grouped


def clean_identifier(value: str | None) -> str:
    return " ".join((value or "").strip().strip('"').split())


def compact_entry(entry: dict[str, object]) -> dict[str, str]:
    identifiers = [str(identifier) for identifier in entry.get("ids", [])]
    main_id = str(entry.get("simbadMainId", ""))
    compact: dict[str, str] = {}

    common_name = first_match(identifiers, lambda item: item.startswith("NAME "))
    bayer = first_match([main_id, *identifiers], is_bayer_or_flamsteed)
    hip = first_match(identifiers, lambda item: re.fullmatch(r"HIP\s+\d+[A-Z]?", item) is not None)
    hd = first_match(identifiers, lambda item: re.fullmatch(r"HD\s+\d+[A-Z]?", item) is not None)
    hr = first_match(identifiers, lambda item: re.fullmatch(r"HR\s+\d+[A-Z]?", item) is not None)
    gj = first_match(identifiers, lambda item: re.fullmatch(r"GJ\s+[\d.]+[A-Z]?", item) is not None)

    if common_name:
        compact["commonName"] = common_name.removeprefix("NAME ").strip()
    if bayer:
        compact["bayerName"] = human_bayer_or_flamsteed(bayer)
        compact["bayerDesignation"] = bayer
    if hip:
        compact["hip"] = hip
    if hd:
        compact["hd"] = hd
    if hr:
        compact["hr"] = hr
    if gj:
        compact["gj"] = gj
    if main_id:
        compact["simbadMainId"] = main_id
    otype = str(entry.get("otype", ""))
    if otype:
        compact["otype"] = otype

    return compact


def first_match(items: list[str], predicate) -> str | None:
    seen: set[str] = set()
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        if predicate(item):
            return item
    return None


def is_bayer_or_flamsteed(identifier: str) -> bool:
    if not identifier.startswith("* "):
        return False
    value = identifier.removeprefix("* ").strip()
    if value.startswith("V*"):
        return False
    return re.fullmatch(r"([a-z]{2,3}|[0-9]{1,3})\s+[A-Z][a-zA-Z]{2}(?:\s+[A-Z0-9]+)?", value) is not None


def human_bayer_or_flamsteed(identifier: str) -> str:
    value = identifier.removeprefix("* ").strip()
    parts = value.split()
    if len(parts) < 2:
        return value
    prefix, constellation = parts[0], parts[1]
    suffix = " ".join(parts[2:])
    return " ".join(part for part in [GREEK_NAMES.get(prefix, prefix), constellation, suffix] if part)


def main() -> int:
    args = parse_args()
    catalog = pathlib.Path(args.catalog)
    output = pathlib.Path(args.output)
    stars = load_catalog(catalog, args.max_g_mag)
    grouped = collect_rows(stars, args.chunk_size, args.sleep)
    aliases = {
        gaia_id: compact
        for gaia_id, compact in sorted((gaia_id, compact_entry(entry)) for gaia_id, entry in grouped.items())
        if compact
    }

    payload = {
        "meta": {
            "title": "Birthday Starlight SIMBAD Cross-identifications",
            "source": "SIMBAD TAP ident and basic tables",
            "generatedAtUtc": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat(),
            "maxGMag": args.max_g_mag,
            "inputCount": len(stars),
            "matchedCount": len(aliases),
            "usage": "Static public-site alias overlay; do not query SIMBAD per visitor.",
        },
        "aliases": aliases,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(aliases):,} aliases for {len(stars):,} stars to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
