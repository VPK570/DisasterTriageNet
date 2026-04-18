import logging
import sys

_logger_initialized = False
_root_logger = None

def setup_logging():
    global _logger_initialized, _root_logger
    if _logger_initialized:
        return _root_logger

    log_format = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(log_format)

    _root_logger = logging.getLogger()
    _root_logger.setLevel(logging.INFO)
    _root_logger.addHandler(handler)

    logging.getLogger('socketio').setLevel(logging.WARNING)
    logging.getLogger('engineio').setLevel(logging.WARNING)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)

    _logger_initialized = True
    return _root_logger

def get_logger(name):
    setup_logging()
    return logging.getLogger(name)
