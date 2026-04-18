import time
import threading
from functools import wraps
from flask import request, jsonify
from lib.logging_config import get_logger

logger = get_logger('triage.rate_limiter')

class RateLimiter:
    """Sliding window rate limiter with per-key tracking."""

    def __init__(self):
        self._locks = {}
        self._windows = {}

    def _get_key(self, key):
        if key not in self._windows:
            self._windows[key] = []
            self._locks[key] = threading.Lock()
        return key

    def is_allowed(self, key, max_requests, window_seconds):
        key = self._get_key(key)
        now = time.time()
        with self._locks[key]:
            self._windows[key] = [t for t in self._windows[key] if now - t < window_seconds]
            if len(self._windows[key]) >= max_requests:
                return False
            self._windows[key].append(now)
            return True

    def cleanup(self, max_age=3600):
        now = time.time()
        stale = [k for k, v in self._windows.items() if not v or now - v[-1] > max_age]
        for k in stale:
            self._windows.pop(k, None)
            self._locks.pop(k, None)

_rate_limiter = RateLimiter()

def rate_limit(max_requests=10, window_seconds=60, key_func=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if key_func:
                key = key_func()
            else:
                key = request.remote_addr or 'unknown'
            endpoint = f.__name__
            full_key = f"{endpoint}:{key}"

            if not _rate_limiter.is_allowed(full_key, max_requests, window_seconds):
                logger.warning("Rate limit exceeded for %s", full_key)
                return jsonify({"error": "Rate limit exceeded. Try again later."}), 429
            return f(*args, **kwargs)
        return decorated_function
    return decorator
