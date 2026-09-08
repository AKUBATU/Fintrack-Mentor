from pathlib import Path

import httpx

from ..core.config import settings


PREFIX = "supabase:"


def _configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def _headers(content_type: str | None = None) -> dict[str, str]:
    key = settings.SUPABASE_SERVICE_ROLE_KEY or ""
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    if content_type:
        headers["Content-Type"] = content_type
        headers["x-upsert"] = "true"
    return headers


def store_receipt(object_key: str, content: bytes, content_type: str) -> str:
    if not _configured():
        settings.RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)
        target = settings.RECEIPTS_DIR / object_key.replace("/", "-")
        target.write_bytes(content)
        return str(target)

    url = (
        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/"
        f"{settings.SUPABASE_RECEIPTS_BUCKET}/{object_key}"
    )
    response = httpx.post(url, content=content, headers=_headers(content_type), timeout=30)
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase Storage menolak upload ({response.status_code})")
    return f"{PREFIX}{object_key}"


def read_receipt(reference: str) -> bytes:
    if not reference.startswith(PREFIX):
        path = Path(reference)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(reference)
        return path.read_bytes()

    object_key = reference.removeprefix(PREFIX)
    url = (
        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/"
        f"{settings.SUPABASE_RECEIPTS_BUCKET}/{object_key}"
    )
    response = httpx.get(url, headers=_headers(), timeout=30)
    if response.status_code == 404:
        raise FileNotFoundError(reference)
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase Storage gagal membaca file ({response.status_code})")
    return response.content


def delete_receipt(reference: str | None) -> None:
    if not reference:
        return
    if not reference.startswith(PREFIX):
        path = Path(reference)
        if path.exists() and path.is_file():
            path.unlink()
        return
    object_key = reference.removeprefix(PREFIX)
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_RECEIPTS_BUCKET}"
    response = httpx.request("DELETE", url, json={"prefixes": [object_key]}, headers=_headers(), timeout=30)
    if response.status_code >= 400 and response.status_code != 404:
        raise RuntimeError(f"Supabase Storage gagal menghapus file ({response.status_code})")
