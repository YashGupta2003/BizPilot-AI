"""
Multi-Currency + GST Auto-Calculation Service.

ARCHITECTURE:
1. Exchange Rate Fetching
   - Primary:  api.frankfurter.app  (ECB-backed, no key, ~30 currencies)
   - Fallback: cdn.jsdelivr.net     (fawazahmed0, 200+ currencies, no key)
   - Cache:    in-memory, 1-hour TTL
   - Hardcoded fallback rates if both APIs fail (demo always works)

2. GST Calculation
   - Correct Indian GST slabs: 0%, 5%, 12%, 18%, 28%
   - Export invoices (foreign currency): 0% GST automatically
   - CGST + SGST for intra-state, IGST for inter-state/export
   - SAC code lookup for common freelancer services
"""
import time
from typing import Optional
import httpx

# ---------------------------------------------------------------------------
# CURRENCY DATA
# ---------------------------------------------------------------------------

SUPPORTED_CURRENCIES = {
    "INR": {"name": "Indian Rupee", "symbol": "₹", "flag": "🇮🇳"},
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
    "EUR": {"name": "Euro", "symbol": "€", "flag": "🇪🇺"},
    "GBP": {"name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "flag": "🇦🇺"},
    "CAD": {"name": "Canadian Dollar", "symbol": "C$", "flag": "🇨🇦"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$", "flag": "🇸🇬"},
    "AED": {"name": "UAE Dirham", "symbol": "AED", "flag": "🇦🇪"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥", "flag": "🇯🇵"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF", "flag": "🇨🇭"},
    "NZD": {"name": "New Zealand Dollar", "symbol": "NZ$", "flag": "🇳🇿"},
    "SEK": {"name": "Swedish Krona", "symbol": "kr", "flag": "🇸🇪"},
    "NOK": {"name": "Norwegian Krone", "symbol": "kr", "flag": "🇳🇴"},
    "DKK": {"name": "Danish Krone", "symbol": "kr", "flag": "🇩🇰"},
}

# Hardcoded fallback rates (INR per 1 unit) — used only if both APIs fail
FALLBACK_RATES_TO_INR = {
    "USD": 83.50, "EUR": 90.25, "GBP": 105.80, "AUD": 54.30,
    "CAD": 61.20, "SGD": 61.90, "AED": 22.73, "JPY": 0.558,
    "CHF": 92.40, "NZD": 49.80, "SEK": 7.85, "NOK": 7.60,
    "DKK": 12.10, "INR": 1.0,
}

# ---------------------------------------------------------------------------
# GST DATA
# ---------------------------------------------------------------------------

GST_SLABS = [0, 5, 12, 18, 28]

SAC_GST_MAP = {
    "998313": {"rate": 18, "description": "IT design and development of customer's application"},
    "998314": {"rate": 18, "description": "IT infrastructure provisioning services"},
    "998315": {"rate": 18, "description": "Software testing and QA services"},
    "998316": {"rate": 18, "description": "IT support services"},
    "998331": {"rate": 18, "description": "Website design and development"},
    "998332": {"rate": 18, "description": "Website maintenance and support"},
    "998381": {"rate": 18, "description": "Graphic design services"},
    "998382": {"rate": 18, "description": "Logo design and branding services"},
    "998383": {"rate": 18, "description": "Packaging design services"},
    "998391": {"rate": 18, "description": "Content writing and copywriting services"},
    "998392": {"rate": 18, "description": "Translation services"},
    "998393": {"rate": 18, "description": "Editing and proofreading services"},
    "998311": {"rate": 18, "description": "Management consulting services"},
    "998312": {"rate": 18, "description": "Business analytics consulting"},
    "998361": {"rate": 18, "description": "Online advertising and marketing"},
    "998362": {"rate": 18, "description": "SEO and digital marketing services"},
    "999292": {"rate": 18, "description": "Online coaching and training"},
    "999293": {"rate": 18, "description": "Corporate training services"},
    "999641": {"rate": 18, "description": "Photography services"},
    "999642": {"rate": 18, "description": "Video production and editing"},
}

DEFAULT_FREELANCER_GST_RATE = 18

# ---------------------------------------------------------------------------
# IN-MEMORY RATE CACHE (1-hour TTL)
# ---------------------------------------------------------------------------

_rate_cache: dict = {}
_cache_timestamp: float = 0
CACHE_TTL_SECONDS = 3600


def _is_cache_valid() -> bool:
    return bool(_rate_cache) and (time.time() - _cache_timestamp) < CACHE_TTL_SECONDS


# ---------------------------------------------------------------------------
# EXCHANGE RATE FETCHING
# ---------------------------------------------------------------------------

async def _fetch_from_frankfurter() -> dict:
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get("https://api.frankfurter.app/latest", params={"from": "USD"})
        r.raise_for_status()
        data = r.json()
        rates = data["rates"]
        rates["USD"] = 1.0
        return rates


async def _fetch_from_fawazahmed() -> dict:
    url = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        data = r.json()
        return {k.upper(): v for k, v in data["usd"].items()}


async def get_rates_to_inr() -> dict:
    global _rate_cache, _cache_timestamp

    if _is_cache_valid():
        return _rate_cache

    usd_to_others: dict = {}

    try:
        usd_to_others = await _fetch_from_frankfurter()
    except Exception:
        try:
            usd_to_others = await _fetch_from_fawazahmed()
        except Exception:
            pass

    if usd_to_others and "INR" in usd_to_others:
        inr_per_usd = float(usd_to_others["INR"])
        rates_to_inr: dict = {"INR": 1.0}
        for currency in SUPPORTED_CURRENCIES:
            if currency == "INR":
                continue
            elif currency in usd_to_others:
                rates_to_inr[currency] = round(inr_per_usd / float(usd_to_others[currency]), 4)
            else:
                rates_to_inr[currency] = FALLBACK_RATES_TO_INR.get(currency, 1.0)

        _rate_cache = rates_to_inr
        _cache_timestamp = time.time()
        return _rate_cache

    _rate_cache = dict(FALLBACK_RATES_TO_INR)
    _cache_timestamp = time.time()
    return _rate_cache


def convert_to_inr(amount: float, from_currency: str, rates_to_inr: dict) -> float:
    if from_currency == "INR":
        return round(amount, 2)
    rate = rates_to_inr.get(from_currency, FALLBACK_RATES_TO_INR.get(from_currency, 1.0))
    return round(amount * rate, 2)


# ---------------------------------------------------------------------------
# GST CALCULATION ENGINE
# ---------------------------------------------------------------------------

def calculate_gst(
    subtotal: float,
    gst_rate: int,
    is_export: bool = False,
    is_inter_state: bool = True,
) -> dict:
    if is_export or gst_rate == 0:
        return {
            "gst_rate": 0, "cgst_rate": 0.0, "sgst_rate": 0.0, "igst_rate": 0.0,
            "cgst_amount": 0.0, "sgst_amount": 0.0, "igst_amount": 0.0,
            "total_gst": 0.0, "total_with_gst": round(subtotal, 2),
            "supply_type": "Export / Zero-rated supply", "is_export": True,
        }

    gst_amount = round(subtotal * gst_rate / 100, 2)

    if is_inter_state:
        return {
            "gst_rate": gst_rate, "cgst_rate": 0.0, "sgst_rate": 0.0,
            "igst_rate": float(gst_rate),
            "cgst_amount": 0.0, "sgst_amount": 0.0, "igst_amount": gst_amount,
            "total_gst": gst_amount, "total_with_gst": round(subtotal + gst_amount, 2),
            "supply_type": "Inter-state supply (IGST)", "is_export": False,
        }
    else:
        half = round(gst_amount / 2, 2)
        return {
            "gst_rate": gst_rate, "cgst_rate": gst_rate / 2, "sgst_rate": gst_rate / 2,
            "igst_rate": 0.0, "cgst_amount": half, "sgst_amount": half, "igst_amount": 0.0,
            "total_gst": round(half * 2, 2), "total_with_gst": round(subtotal + half * 2, 2),
            "supply_type": "Intra-state supply (CGST + SGST)", "is_export": False,
        }


def get_sac_suggestions(query: str) -> list:
    q = query.lower()
    return [
        {"sac_code": code, "description": info["description"], "gst_rate": info["rate"]}
        for code, info in SAC_GST_MAP.items()
        if q in info["description"].lower()
    ][:5]


async def calculate_invoice_taxes(
    subtotal_in_invoice_currency: float,
    currency: str,
    gst_rate: int,
    is_export: bool,
    is_inter_state: bool = True,
    sac_code: Optional[str] = None,
) -> dict:
    rates = await get_rates_to_inr()
    rate_to_inr = rates.get(currency, 1.0)

    effective_is_export = is_export or (currency != "INR")
    effective_gst_rate = 0 if effective_is_export else gst_rate

    gst = calculate_gst(
        subtotal_in_invoice_currency,
        effective_gst_rate,
        is_export=effective_is_export,
        is_inter_state=is_inter_state,
    )

    subtotal_inr = convert_to_inr(subtotal_in_invoice_currency, currency, rates)
    total_inr = convert_to_inr(gst["total_with_gst"], currency, rates)

    return {
        **gst,
        "currency": currency,
        "currency_symbol": SUPPORTED_CURRENCIES.get(currency, {}).get("symbol", currency),
        "subtotal": round(subtotal_in_invoice_currency, 2),
        "exchange_rate_to_inr": rate_to_inr,
        "subtotal_inr": subtotal_inr,
        "total_inr": total_inr,
        "sac_code": sac_code or "998314",
        "gst_compliance_note": (
            "GST not applicable — Export of services (zero-rated supply under IGST Act)"
            if effective_is_export
            else f"GST @ {effective_gst_rate}% applicable as per SAC {sac_code or '998314'}"
        ),
    }