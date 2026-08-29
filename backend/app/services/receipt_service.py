import re
import shutil
import subprocess
from datetime import date


RECEIPT_CATEGORIES = [
    "Makan", "Transport", "Belanja", "Tagihan", "Hiburan",
    "Kesehatan", "Pendidikan", "Lainnya",
]
PAYMENT_METHODS = ["Cash", "Debit Card", "Credit Card", "E-Wallet", "Transfer Bank"]


def _parse_number(value: str) -> float | None:
    cleaned = re.sub(r"[^0-9,.]", "", value)
    if not cleaned:
        return None
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        decimals = cleaned.rsplit(",", 1)[-1]
        cleaned = cleaned.replace(",", "." if len(decimals) <= 2 else "")
    elif cleaned.count(".") > 1 or ("." in cleaned and len(cleaned.rsplit(".", 1)[-1]) == 3):
        cleaned = cleaned.replace(".", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _ocr_image(content: bytes) -> str:
    executable = shutil.which("tesseract")
    if not executable:
        raise RuntimeError("Tesseract OCR belum terpasang pada server")
    process = subprocess.run(
        [executable, "stdin", "stdout", "-l", "eng", "--psm", "6"],
        input=content,
        capture_output=True,
        timeout=45,
        check=False,
    )
    text = process.stdout.decode("utf-8", errors="replace").strip()
    if process.returncode != 0 or not text:
        raise RuntimeError("OCR tidak menemukan teks. Gunakan foto yang lebih terang dan fokus.")
    return text


def _find_date(text: str) -> str | None:
    patterns = (
        r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b",
        r"\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b",
    )
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        first, second, third = match.groups()
        if len(first) == 4:
            year, month, day = int(first), int(second), int(third)
        else:
            day, month, year = int(first), int(second), int(third)
            year += 2000 if year < 100 else 0
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            continue
    return None


def _find_money(lines: list[str], terms: tuple[str, ...]) -> float | None:
    for line in reversed(lines):
        normalized = line.lower()
        if not any(term in normalized for term in terms):
            continue
        candidates = re.findall(r"(?:rp\.?\s*)?\d[\d.,]*", line, flags=re.IGNORECASE)
        values = [_parse_number(candidate) for candidate in candidates]
        values = [value for value in values if value is not None]
        if values:
            return max(values)
    return None


def _merchant(lines: list[str]) -> str:
    ignored = ("tanggal", "date", "receipt", "struk", "invoice", "alamat", "telp", "phone")
    for line in lines[:8]:
        lowered = line.lower()
        if len(line) >= 3 and not any(word in lowered for word in ignored) and not re.fullmatch(r"[\W\d_]+", line):
            return line[:120]
    return lines[0][:120] if lines else ""


def _payment_method(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ("qris", "gopay", "ovo", "dana", "shopeepay", "e-wallet")):
        return "E-Wallet"
    if "credit" in lowered or "kredit" in lowered:
        return "Credit Card"
    if "debit" in lowered:
        return "Debit Card"
    if any(word in lowered for word in ("transfer", "bank transfer")):
        return "Transfer Bank"
    return "Cash"


def _category(text: str) -> str:
    lowered = text.lower()
    keywords = {
        "Makan": ("restaurant", "restoran", "warung", "kopi", "coffee", "food", "nasi", "ayam", "cafe", "bakso"),
        "Transport": ("pertamina", "shell", "bensin", "parkir", "parking", "tol", "grab", "gojek"),
        "Tagihan": ("pln", "listrik", "internet", "telepon", "pdam", "tagihan"),
        "Kesehatan": ("apotek", "pharmacy", "klinik", "hospital", "obat"),
        "Pendidikan": ("school", "sekolah", "buku", "course", "kursus"),
        "Hiburan": ("cinema", "bioskop", "game", "karaoke"),
    }
    return next((category for category, words in keywords.items() if any(word in lowered for word in words)), "Belanja")


def _receipt_number(lines: list[str]) -> str:
    for line in lines:
        if re.search(r"\b(no\.?|nomor|invoice|transaksi|receipt)\b", line, flags=re.IGNORECASE):
            match = re.search(r"[:#]\s*([A-Z0-9/-]{3,})", line, flags=re.IGNORECASE)
            if match:
                return match.group(1)
    return ""


def _line_items(lines: list[str]) -> list[dict]:
    ignored = ("total", "subtotal", "pajak", "tax", "ppn", "diskon", "discount", "bayar", "tanggal", "date", "transaksi", "invoice", "alamat", "address", "jl.", "jalan")
    items = []
    for line in lines:
        lowered = line.lower()
        if any(word in lowered for word in ignored):
            continue
        prices = re.findall(r"(?:rp\.?\s*)?\d[\d.,]*", line, flags=re.IGNORECASE)
        if not prices or not re.search(r"[a-zA-Z]{2,}", line):
            continue
        total = _parse_number(prices[-1])
        if total is None or total <= 0:
            continue
        quantity_match = re.search(r"\b(\d+)\s*[xX@]\s*", line)
        quantity = int(quantity_match.group(1)) if quantity_match else 1
        name_end = quantity_match.start() if quantity_match else line.lower().find(prices[-1].lower())
        name = re.sub(r"[^\w\s&+./-]", "", line[:name_end]).strip(" -.")
        if len(name) < 2:
            continue
        items.append({
            "name": name[:100],
            "quantity": quantity,
            "unit_price": total / quantity if quantity else total,
            "total": total,
        })
    return items[:30]


def scan_receipts(images: list[tuple[bytes, str]]) -> dict:
    texts = [_ocr_image(content) for content, _mime_type in images]
    # Pertahankan teks unik dari setiap close-up agar area lipatan saling melengkapi.
    lines = []
    seen = set()
    for text in texts:
        for raw_line in text.splitlines():
            line = raw_line.strip()
            key = re.sub(r"\s+", " ", line.lower())
            if line and key not in seen:
                seen.add(key)
                lines.append(line)
    raw_text = "\n".join(lines)
    total = _find_money(lines, ("grand total", "total bayar", "jumlah bayar", "amount due", "total"))
    tax = _find_money(lines, ("pajak", "tax", "ppn", "vat"))
    discount = _find_money(lines, ("diskon", "discount", "potongan"))
    line_items = _line_items(lines)
    item_summary = ", ".join(item["name"] for item in line_items[:8])
    return {
        "merchant": _merchant(lines),
        "date": _find_date(raw_text),
        "amount": total,
        "payment_method": _payment_method(raw_text),
        "category": _category(raw_text),
        "notes": (f"Item: {item_summary}" if item_summary else "Hasil scan OCR lokal")[:400],
        "receipt_number": _receipt_number(lines),
        "tax": tax,
        "discount": discount,
        "line_items": line_items,
        "raw_text": raw_text,
    }


def scan_receipt(content: bytes, mime_type: str) -> dict:
    return scan_receipts([(content, mime_type)])
