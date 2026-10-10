import json
import os
from datetime import date

CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))

_cache = {}

def load_json_config(filename: str) -> dict | list:
    if filename in _cache:
        return _cache[filename]
    filepath = os.path.join(CONFIG_DIR, filename)
    with open(filepath, 'r') as f:
        data = json.load(f)
    _cache[filename] = data
    return data

def load_fy_config(fy: str) -> dict:
    """Loads the right JSON by FY string, e.g., '2026-27'."""
    filename = f"fy_{fy.replace('-', '_')}.json"
    try:
        return load_json_config(filename)
    except FileNotFoundError:
        # Fallback to the latest available or handle as needed
        raise ValueError(f"Configuration for financial year {fy} not found.")

def get_gst_rates(supply_date: date) -> dict:
    """Returns applicable GST rates for a given supply date."""
    data = load_json_config("gst_rates.json")
    for period in data.get("effective_periods", []):
        from_date = date.fromisoformat(period["from"]) if period["from"] else date.min
        to_date = date.fromisoformat(period["to"]) if period["to"] else date.max
        if from_date <= supply_date <= to_date:
            return period
    return {}

def get_filing_dates() -> dict:
    return load_json_config("filing_dates.json")

def get_sac_codes() -> list:
    return load_json_config("sac_codes.json")
