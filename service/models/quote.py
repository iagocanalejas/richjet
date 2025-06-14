from dataclasses import dataclass


@dataclass
class StockQuote:
    symbol: str
    current: float
    high: float
    low: float
    open: float
    previous_close: float
    currency: str | None = None
