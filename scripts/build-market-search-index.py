#!/usr/bin/env python3

from __future__ import annotations

import csv
import html
import json
import re
import urllib.request
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "src" / "data" / "market-search-index.json"

NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt"
SP500_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
IBEX35_URL = "https://en.wikipedia.org/wiki/IBEX_35"


@dataclass
class SearchEntry:
    ticker: str
    market: str
    symbol: str
    name: str
    tags: set[str] = field(default_factory=set)

    def add_tag(self, value: str) -> None:
        if value:
            self.tags.add(value)

    def to_json(self) -> dict[str, object]:
        tags = sorted(self.tags)
        search_parts = [self.ticker, self.symbol, self.name, *tags]
        return {
            "ticker": self.ticker,
            "market": self.market,
            "symbol": self.symbol,
            "name": self.name,
            "tags": tags,
            "searchText": " ".join(search_parts),
        }


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def clean_name(value: str) -> str:
    cleaned = html.unescape(value or "")
    cleaned = re.sub(r"\s+", " ", cleaned.replace("\xa0", " ")).strip()
    return cleaned


def strip_tags(value: str) -> str:
    without_refs = re.sub(r"<sup\b.*?</sup>", "", value, flags=re.S | re.I)
    without_breaks = re.sub(r"<br\s*/?>", " ", without_refs, flags=re.I)
    without_tags = re.sub(r"<[^>]+>", "", without_breaks)
    return clean_name(without_tags)


def parse_pipe_text(raw_text: str) -> list[dict[str, str]]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if not lines:
        return []
    reader = csv.DictReader(lines, delimiter="|")
    rows = []
    for row in reader:
        if not row:
            continue
        first_value = next(iter(row.values()), "")
        if isinstance(first_value, str) and first_value.startswith("File Creation Time"):
            continue
        rows.append({str(key): str(value or "").strip() for key, value in row.items() if key})
    return rows


def find_table_after(html_text: str, marker: str) -> str:
    marker_index = html_text.find(marker)
    if marker_index < 0:
        raise RuntimeError(f"Table marker not found: {marker}")
    table_start = html_text.find("<table", marker_index)
    table_end = html_text.find("</table>", table_start)
    if table_start < 0 or table_end < 0:
        raise RuntimeError(f"Table not found after marker: {marker}")
    return html_text[table_start : table_end + len("</table>")]


def iter_table_rows(table_html: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for row_html in re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, flags=re.S | re.I):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, flags=re.S | re.I)
        cleaned_cells = [strip_tags(cell) for cell in cells]
        if cleaned_cells:
            rows.append(cleaned_cells)
    return rows


def normalize_symbol(value: str) -> str:
    symbol = clean_name(value).upper()
    return symbol.replace("\u2212", "-")


def build_ticker(market: str, symbol: str) -> str:
    return f"{market}:{symbol}"


def load_sp500_constituents() -> dict[tuple[str, str], str]:
    html_text = fetch_text(SP500_URL)
    match = re.search(r'<table[^>]*id="constituents"[^>]*>(.*?)</table>', html_text, flags=re.S | re.I)
    if not match:
        raise RuntimeError("S&P 500 constituents table not found")
    table_html = match.group(0)
    members: dict[tuple[str, str], str] = {}
    for row_html in re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, flags=re.S | re.I):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, flags=re.S | re.I)
        if len(cells) < 2:
            continue
        symbol = normalize_symbol(strip_tags(cells[0]))
        if symbol in {"SYMBOL", ""}:
            continue
        name = clean_name(strip_tags(cells[1]))
        first_cell = cells[0].upper()
        market = "NYSE"
        if "XNAS:" in first_cell or "NASDAQ" in first_cell:
            market = "NASDAQ"
        members[(market, symbol)] = name
    return members


def load_ibex35_constituents() -> list[tuple[str, str]]:
    html_text = fetch_text(IBEX35_URL)
    table_html = find_table_after(html_text, '<h2 id="Components">')
    members: list[tuple[str, str]] = []
    for row in iter_table_rows(table_html):
        if len(row) < 2:
            continue
        symbol = normalize_symbol(row[0])
        if not symbol.endswith(".MC"):
            continue
        members.append((symbol[:-3], clean_name(row[1])))
    return members


def register_entry(
    entries: dict[tuple[str, str], SearchEntry],
    *,
    market: str,
    symbol: str,
    name: str,
    tag: str | None = None,
) -> SearchEntry:
    normalized_market = market.upper().strip()
    normalized_symbol = normalize_symbol(symbol)
    key = (normalized_market, normalized_symbol)
    entry = entries.get(key)
    if entry is None:
        entry = SearchEntry(
            ticker=build_ticker(normalized_market, normalized_symbol),
            market=normalized_market,
            symbol=normalized_symbol,
            name=clean_name(name),
        )
        entries[key] = entry
    elif name and len(clean_name(name)) < len(entry.name):
        entry.name = clean_name(name)
    if tag:
        entry.add_tag(tag)
    entry.add_tag(normalized_market)
    return entry


def build_index() -> dict[str, object]:
    entries: dict[tuple[str, str], SearchEntry] = {}

    for row in parse_pipe_text(fetch_text(NASDAQ_LISTED_URL)):
        symbol = normalize_symbol(row.get("Symbol", ""))
        name = clean_name(row.get("Security Name", ""))
        if not symbol or symbol.startswith("FILE CREATION TIME"):
            continue
        register_entry(entries, market="NASDAQ", symbol=symbol, name=name, tag="NASDAQ")

    for row in parse_pipe_text(fetch_text(OTHER_LISTED_URL)):
        if row.get("Exchange", "").upper() != "N":
            continue
        symbol = normalize_symbol(row.get("ACT Symbol", ""))
        name = clean_name(row.get("Security Name", ""))
        if not symbol:
            continue
        register_entry(entries, market="NYSE", symbol=symbol, name=name, tag="NYSE")

    for (market, symbol), sp_name in load_sp500_constituents().items():
        register_entry(entries, market=market, symbol=symbol, name=sp_name, tag="SP500")

    for symbol, name in load_ibex35_constituents():
        register_entry(entries, market="BME", symbol=symbol, name=name, tag="IBEX35")

    serialized_entries = [
        entry.to_json()
        for entry in sorted(entries.values(), key=lambda item: (item.market, item.symbol))
    ]

    return {
        "generatedAt": date.today().isoformat(),
        "sources": [
            NASDAQ_LISTED_URL,
            OTHER_LISTED_URL,
            SP500_URL,
            IBEX35_URL,
        ],
        "entryCount": len(serialized_entries),
        "entries": serialized_entries,
    }


def main() -> None:
    index_payload = build_index()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(index_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {index_payload['entryCount']} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
