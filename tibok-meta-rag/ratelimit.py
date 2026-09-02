"""Minimal async sliding-window rate limiter (no external dependency)."""

from __future__ import annotations

import asyncio
import time


class AsyncRateLimiter:
    """Caps concurrent callers to at most `rate` acquisitions per `period` seconds.

    A sliding window of timestamps is kept under a lock; a caller that would
    exceed the window sleeps until the oldest timestamp falls out of it.
    """

    def __init__(self, rate: float, period: float = 1.0) -> None:
        if rate <= 0:
            raise ValueError("rate must be > 0")
        self._rate = rate
        self._period = period
        self._lock = asyncio.Lock()
        self._timestamps: list[float] = []

    async def acquire(self) -> None:
        while True:
            async with self._lock:
                now = time.monotonic()
                window_start = now - self._period
                self._timestamps = [t for t in self._timestamps if t > window_start]
                if len(self._timestamps) < self._rate:
                    self._timestamps.append(now)
                    return
                sleep_for = self._timestamps[0] + self._period - now
            await asyncio.sleep(max(sleep_for, 0.01))
