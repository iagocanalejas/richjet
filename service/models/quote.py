from dataclasses import dataclass


@dataclass
class StockQuote:
    symbol: str
    current: float
    previous_close: float | None = None
    currency: str | None = None
