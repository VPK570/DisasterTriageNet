import threading
import time
from lib.logging_config import get_logger

logger = get_logger('triage.task_queue')

class TaskQueue:
    """Lightweight in-memory task queue with debouncing and retry support.

    Designed as a drop-in replacement for Celery in single-node deployments.
    Supports per-task debouncing, max retries, and exponential backoff.
    Uses a simple list + Event for signalling to avoid eventlet monkey-patch issues.
    """

    def __init__(self, max_workers=4):
        self._tasks = []
        self._lock = threading.Lock()
        self._event = threading.Event()
        self._workers = []
        self._debounce_lock = threading.Lock()
        self._debounce_state = {}
        self._running = False

        self._running = True
        for i in range(max_workers):
            t = threading.Thread(target=self._worker, daemon=True, name=f'task-queue-worker-{i}')
            t.start()
            self._workers.append(t)

        logger.info("TaskQueue started with %d workers", max_workers)

    def _worker(self):
        while self._running:
            self._event.wait(timeout=0.1)
            self._event.clear()

            task = None
            with self._lock:
                if self._tasks:
                    task = self._tasks.pop(0)

            if task is None:
                continue

            try:
                task['fn'](*task['args'], **task.get('kwargs', {}))
            except Exception as e:
                retries = task.get('retries', 0)
                max_retries = task.get('max_retries', 3)
                if retries < max_retries:
                    delay = task.get('backoff_base', 2) ** retries
                    logger.warning("Task %s failed (attempt %d/%d), retrying in %.1fs: %s",
                                   task.get('name', 'unknown'), retries + 1, max_retries, delay, str(e))
                    time.sleep(delay)
                    with self._lock:
                        self._tasks.append({**task, 'retries': retries + 1})
                    self._event.set()
                else:
                    logger.error("Task %s failed after %d attempts: %s",
                                 task.get('name', 'unknown'), max_retries, str(e), exc_info=True)

    def submit(self, fn, args=(), kwargs=None, name=None, debounce_key=None, debounce_seconds=0, max_retries=3, backoff_base=2):
        if debounce_key and debounce_seconds > 0:
            with self._debounce_lock:
                if debounce_key in self._debounce_state:
                    self._debounce_state[debounce_key]['pending'] = True
                    return
                self._debounce_state[debounce_key] = {'pending': False, 'timer': None}

            def _release_debounce():
                time.sleep(debounce_seconds)
                with self._debounce_lock:
                    state = self._debounce_state.pop(debounce_key, None)
                    if state and state['pending']:
                        self._enqueue(fn, args, kwargs, name, max_retries, backoff_base)

            timer = threading.Thread(target=_release_debounce, daemon=True)
            timer.start()
            with self._debounce_lock:
                self._debounce_state[debounce_key]['timer'] = timer
        else:
            self._enqueue(fn, args, kwargs, name, max_retries, backoff_base)

    def _enqueue(self, fn, args, kwargs, name, max_retries, backoff_base):
        with self._lock:
            self._tasks.append({
                'fn': fn,
                'args': args,
                'kwargs': kwargs or {},
                'name': name or fn.__name__,
                'max_retries': max_retries,
                'backoff_base': backoff_base,
                'retries': 0,
            })
        self._event.set()

    def shutdown(self, wait=True):
        self._running = False
        if wait:
            for w in self._workers:
                w.join(timeout=5)
