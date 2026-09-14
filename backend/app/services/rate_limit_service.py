from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from ..models.rate_limit import RateLimitBucket


def _client_address(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def enforce_rate_limit(
    request: Request,
    db: Session,
    action: str,
    limit: int,
    window_seconds: int,
    identity: str = "",
) -> None:
    raw_key = f"{_client_address(request)}:{identity.strip().lower()}"
    key_hash = sha256(raw_key.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.query(RateLimitBucket).filter(
        RateLimitBucket.window_started_at < now - timedelta(days=2)
    ).delete(synchronize_session=False)
    bucket = db.query(RateLimitBucket).filter(
        RateLimitBucket.key_hash == key_hash,
        RateLimitBucket.action == action,
    ).with_for_update().first()
    if not bucket:
        bucket = RateLimitBucket(
            key_hash=key_hash, action=action, window_started_at=now, request_count=1,
        )
        db.add(bucket)
    elif now - bucket.window_started_at >= timedelta(seconds=window_seconds):
        bucket.window_started_at = now
        bucket.request_count = 1
    else:
        bucket.request_count += 1
        if bucket.request_count > limit:
            db.rollback()
            retry_after = max(1, window_seconds - int((now - bucket.window_started_at).total_seconds()))
            raise HTTPException(
                status_code=429,
                detail="Terlalu banyak permintaan. Silakan coba lagi nanti.",
                headers={"Retry-After": str(retry_after)},
            )
    db.commit()
