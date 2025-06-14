import contextlib
import logging
import sys
from collections.abc import Generator
from typing import IO, Any

logger = logging.getLogger("richjet")

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
SUBTLE = "\033[2m"
NORMAL = "\033[m"


LOG_LEVEL_COLORS = {
    "DEBUG": "",
    "INFO": "",
    "WARNING": YELLOW,
    "ERROR": RED,
}


def format_color(text: str, color: str, use_color_setting: bool) -> str:
    """Format text with color.

    Args:
        text - Text to be formatted with color if `use_color`
        color - The color start string
        use_color_setting - Whether or not to color
    """
    if use_color_setting:
        return f"{color}{text}{NORMAL}"
    else:
        return text


def write_line_b(
    s: bytes | None = None,
    stream: IO[bytes] = sys.stdout.buffer,
    logfile_name: str | None = None,
) -> None:
    with contextlib.ExitStack() as exit_stack:
        output_streams = [stream]
        if logfile_name:
            stream = exit_stack.enter_context(open(logfile_name, "ab"))
            output_streams.append(stream)

        for output_stream in output_streams:
            if s is not None:
                output_stream.write(s)
            output_stream.write(b"\n")
            output_stream.flush()


def write_line(s: str | None = None, **kwargs: Any) -> None:
    write_line_b(s.encode() if s is not None else s, **kwargs)


class LoggingHandler(logging.Handler):
    def __init__(self, use_color: bool) -> None:
        super().__init__()
        self.use_color = use_color

    def emit(self, record: logging.LogRecord) -> None:
        level_msg = format_color(
            f"[{record.levelname}]",
            LOG_LEVEL_COLORS[record.levelname],
            self.use_color,
        )
        write_line(f"{level_msg} {record.getMessage()}")


@contextlib.contextmanager
def logging_handler(use_color: bool) -> Generator[None]:
    handler = LoggingHandler(use_color)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    try:
        yield
    finally:
        logger.removeHandler(handler)
