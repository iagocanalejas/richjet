from dataclasses import dataclass


@dataclass
class StockSymbol:
    symbol: str
    name: str
    currency: str
    type: str
    region: str
    source: str

    def __eq__(self, value: object, /) -> bool:
        return isinstance(value, StockSymbol) and self.symbol == value.symbol

    def __hash__(self) -> int:
        return hash(self.symbol)


@dataclass
class StockQuote:
    symbol: str
    current: float
    high: float
    low: float
    open: float
    previous_close: float
