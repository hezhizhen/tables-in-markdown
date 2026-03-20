#!/usr/bin/env python3
"""Fetch Poe models from API and generate data/poe.csv."""

import csv
import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone

API_URL = "https://api.poe.com/v1/models"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "data", "poe.csv")
COLUMNS = [
    "Provider",
    "Model",
    "Link",
    "Input ($/M tokens)",
    "Output ($/M tokens)",
    "Input Modalities",
    "Context Window",
    "Max Output",
    "Created",
]

# Models known to be text-capable even if not tagged as such
KNOWN_TEXT_MODELS = {"gpt-5.4"}

MONTHS_CUTOFF = 6


def fetch_models():
    req = urllib.request.Request(API_URL, headers={"User-Agent": "poe-csv-updater"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["data"]


def is_text_model(model):
    output_modalities = model.get("architecture", {}).get("output_modalities", [])
    if "text" in output_modalities:
        return True
    return model["id"] in KNOWN_TEXT_MODELS


def created_date(model):
    ts = model["created"] / 1000
    return datetime.fromtimestamp(ts, tz=timezone.utc).date()


def format_price(price_per_token):
    if price_per_token is None:
        return "0"
    per_million = float(price_per_token) * 1_000_000
    if per_million == 0:
        return "0"
    # Remove unnecessary trailing zeros
    return f"{per_million:g}"


def to_row(model):
    pricing = model.get("pricing") or {}
    ctx = model.get("context_window") or {}
    return {
        "Provider": model.get("owned_by", ""),
        "Model": model.get("metadata", {}).get("display_name", model["id"]),
        "Link": model.get("metadata", {}).get("url", f"https://poe.com/{model['id']}"),
        "Input ($/M tokens)": format_price(pricing.get("prompt")),
        "Output ($/M tokens)": format_price(pricing.get("completion")),
        "Input Modalities": ", ".join(model.get("architecture", {}).get("input_modalities", [])),
        "Context Window": ctx.get("context_length", ""),
        "Max Output": ctx.get("max_output_tokens", ""),
        "Created": created_date(model).isoformat(),
    }


def main():
    cutoff = datetime.now(tz=timezone.utc).date() - timedelta(days=MONTHS_CUTOFF * 30)

    models = fetch_models()
    rows = []
    for m in models:
        if not is_text_model(m):
            continue
        if created_date(m) < cutoff:
            continue
        rows.append(to_row(m))

    # Sort: Provider ascending, then Created descending within each provider
    rows.sort(key=lambda r: r["Provider"])
    # Within each provider, sort by Created descending
    from itertools import groupby

    sorted_rows = []
    for _, group in groupby(rows, key=lambda r: r["Provider"]):
        provider_rows = list(group)
        provider_rows.sort(key=lambda r: r["Created"], reverse=True)
        sorted_rows.extend(provider_rows)

    output_path = os.path.normpath(OUTPUT)
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(sorted_rows)

    print(f"Wrote {len(sorted_rows)} models to {output_path}")


if __name__ == "__main__":
    main()
