#!/usr/bin/env python3


import sys
import re
import csv
import os
import argparse
import urllib.request
import gzip
from typing import Dict, Optional, List

# Constants
CSV_FILE = "poe.csv"
CSV_HEADERS = ["Provider", "Bot", "Version", "Points", "Introduction"]


# Colors for output
class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    NC = "\033[0m"  # No Color


def print_info(msg: str) -> None:
    print(f"{Colors.GREEN}[INFO]{Colors.NC} {msg}")


def print_warn(msg: str) -> None:
    print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}")


def print_error(msg: str) -> None:
    print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")


def extract_bot_name(url: str) -> str:
    """Extract bot name from Poe URL"""
    return url.split("/")[-1]


def validate_url(url: str) -> bool:
    """Validate Poe URL format"""
    return url.startswith("https://poe.com/") and len(url.split("/")) == 4


def fetch_poe_info(url: str) -> Optional[Dict[str, str]]:
    """Fetch bot information from Poe page"""
    try:
        req = urllib.request.Request(url)
        req.add_header(
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            raw_data = response.read()
            # Handle gzip compression
            if raw_data.startswith(b'\x1f\x8b'):
                content = gzip.decompress(raw_data).decode("utf-8")
            else:
                content = raw_data.decode("utf-8")

        # Extract points
        points_matches = re.findall(r"\b(\d+)\+?\s*points?\b", content, re.IGNORECASE)
        points = max(points_matches, key=int) if points_matches else ""
        if not points:
            print_error("Failed to extract points information")

        # Extract provider and version from "Powered by" text
        provider = ""
        version = ""

        powered_by_match = re.search(r'"poweredBy":"([^"]+)"', content)
        if powered_by_match:
            powered_by_text = powered_by_match.group(1)
            manual_match = re.search(r"Powered by ([^:]+):\s*(.+?)\.?$", powered_by_text)
            if manual_match:
                provider = manual_match.group(1).strip()
                version = manual_match.group(2).strip()
            else:
                print_error(f"Powered by format not recognized: {powered_by_text}")
        else:
            print_error("No 'Powered by' text found in content")

        # Extract introduction
        introduction = ""
        desc_patterns = [
            r'"description":\s*"([^"]{50,})"',
            r'<meta name="description" content="([^"]{50,})"',
        ]

        for pattern in desc_patterns:
            desc_match = re.search(pattern, content, re.IGNORECASE)
            if desc_match:
                desc = desc_match.group(1).strip()

                # Take only first paragraph (before any newline)
                desc = desc.replace("\\n", "\n").replace("\\r", "\n").split("\n")[0].strip()
                desc = re.sub(r"\s+", " ", desc)  # Normalize whitespace

                if len(desc) > 20:
                    introduction = desc
                    break

        if not introduction:
            print_error("Failed to extract introduction information")

        return {
            "provider": provider,
            "points": points,
            "version": version,
            "introduction": introduction,
        }

    except Exception as e:
        print_error(f"Error fetching page: {e}")
        return None


def read_csv() -> List[Dict[str, str]]:
    """Read existing CSV file"""
    if not os.path.exists(CSV_FILE):
        return []

    try:
        with open(CSV_FILE, "r", newline="", encoding="utf-8") as file:
            return list(csv.DictReader(file))
    except Exception as e:
        print_error(f"Error reading CSV file: {e}")
        return []


def write_csv(rows: List[Dict[str, str]]) -> bool:
    """Write rows to CSV file with sorting"""
    try:
        # Sort by provider first, then by bot name
        sorted_rows = sorted(rows, key=lambda row: (row["Provider"], extract_bot_name(row["Bot"])))

        with open(CSV_FILE, "w", newline="", encoding="utf-8") as file:
            file.write("Provider,Bot,Version,Points,Introduction\n")
            for row in sorted_rows:
                line = f'{row["Provider"]},{row["Bot"]},{row["Version"]},{row["Points"]},"{row["Introduction"]}"\n'
                file.write(line)
        return True
    except Exception as e:
        print_error(f"Error writing CSV file: {e}")
        return False




def update_bot(url: str, bot_info: Dict[str, str]) -> bool:
    """Update or add bot to CSV"""
    rows = read_csv()

    new_row = {
        "Provider": bot_info["provider"],
        "Bot": url,
        "Version": bot_info["version"],
        "Points": bot_info["points"],
        "Introduction": bot_info["introduction"],
    }

    # Find existing bot
    for i, row in enumerate(rows):
        if row.get("Bot") == url:
            rows[i] = new_row
            action = "updated"
            break
    else:
        rows.append(new_row)
        action = "added"

    if write_csv(rows):
        print_info(f"Successfully {action} bot: {extract_bot_name(url)}")
        return True
    return False


def update_all_bots() -> bool:
    """Update all bots in the CSV file"""
    rows = read_csv()
    if not rows:
        print_error("No bots found in CSV file")
        return False

    print_info(f"Updating {len(rows)} bots")
    success_count = 0

    for i, row in enumerate(rows):
        url = row.get("Bot")
        if not url:
            continue

        bot_name = extract_bot_name(url)
        print_info(f"Processing {i+1}/{len(rows)}: {bot_name}")

        bot_info = fetch_poe_info(url)
        if bot_info:
            rows[i] = {
                "Provider": bot_info["provider"],
                "Bot": url,
                "Version": bot_info["version"],
                "Points": bot_info["points"],
                "Introduction": bot_info["introduction"],
            }
            success_count += 1
        else:
            print_error(f"Failed to fetch information for {bot_name}")

    if write_csv(rows):
        print_info(f"Successfully updated {success_count}/{len(rows)} bots")
        return True
    return False


def main():
    parser = argparse.ArgumentParser(
        description="Update Poe bot information in poe.csv",
        epilog="Examples:\n  ./update_poe_bot.py https://poe.com/GPT-5\n  ./update_poe_bot.py -u",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("url", nargs="?", help="Poe bot URL")
    parser.add_argument("-u", "--update-all", action="store_true", help="Update all bots in CSV")

    args = parser.parse_args()

    if args.update_all:
        return 0 if update_all_bots() else 1

    if not args.url:
        print_error("URL is required when not using -u flag")
        parser.print_help()
        return 1

    if not validate_url(args.url):
        print_error("Invalid Poe URL format. Expected: https://poe.com/BotName")
        return 1

    bot_info = fetch_poe_info(args.url)
    if not bot_info:
        print_error("Failed to fetch bot information")
        return 1

    print_info(f"Extracted - Provider: {bot_info['provider']}, Points: {bot_info['points']}, Version: {bot_info['version']}")

    return 0 if update_bot(args.url, bot_info) else 1


if __name__ == "__main__":
    sys.exit(main())
