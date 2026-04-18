"""
extensions.py — Shared Flask extension instances.

Initialised here without an app so they can be imported by route modules
without creating a circular dependency (routes → app → routes).
Call socketio.init_app(app, ...) and api.init_app(app) in app.py.
"""
from flask_socketio import SocketIO
from flask_smorest import Api
from lib.task_queue import TaskQueue

socketio = SocketIO()
api = Api()
task_queue = TaskQueue(max_workers=2)
