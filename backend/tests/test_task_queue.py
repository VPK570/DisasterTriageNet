import unittest
import sys
import os
import time
import threading

sys.path.insert(0, os.path.dirname(__file__))

from lib.task_queue import TaskQueue


class TestTaskQueue(unittest.TestCase):

    def test_task_executes(self):
        results = []
        q = TaskQueue(max_workers=1)
        q.submit(lambda: results.append(1))
        time.sleep(0.5)
        self.assertEqual(results, [1])
        q.shutdown()

    def test_debounce_prevents_duplicate_execution(self):
        results = []
        q = TaskQueue(max_workers=1)
        for _ in range(5):
            q.submit(
                lambda: results.append(1),
                debounce_key='test',
                debounce_seconds=0.2,
            )
        time.sleep(0.6)
        self.assertEqual(len(results), 1)
        q.shutdown()

    def test_retry_on_failure(self):
        call_count = 0
        def flaky():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("not yet")
        
        q = TaskQueue(max_workers=1)
        q.submit(flaky, max_retries=3, backoff_base=0.05)
        time.sleep(2.0)
        self.assertGreaterEqual(call_count, 3)
        q.shutdown()

    def test_multiple_workers(self):
        results = []
        lock = threading.Lock()
        def add(n):
            with lock:
                results.append(n)
        
        q = TaskQueue(max_workers=4)
        for i in range(8):
            q.submit(lambda n=i: add(n))
        time.sleep(1.0)
        self.assertEqual(sorted(results), list(range(8)))
        q.shutdown()


if __name__ == '__main__':
    unittest.main()
