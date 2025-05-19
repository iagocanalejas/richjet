from dataclasses import dataclass

from models.symbol import MarketSector, SecurityType


@dataclass
class StockSymbol:
    symbol: str
    name: str
    security_type: "SecurityType"
    currency: str
    source: str
    region: str | None = None
    market_sector: "MarketSector | None" = None
    isin: str | None = None
    figi: str | None = None

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


def normalize_market_sector(market_sector: str) -> MarketSector:
    match market_sector.upper():
        case "COMDTY":
            return MarketSector.COMMODITY
        case "CORP":
            return MarketSector.CORPORATE
        case "CURNCY":
            return MarketSector.CURRENCY
        case "EQUITY":
            return MarketSector.EQUITY
        case "GOVT":
            return MarketSector.GOVERNMENT
        case "INDEX":
            return MarketSector.INDEX
        case "M-MKT":
            return MarketSector.MONEY_MARKET
        case "MTGE":
            return MarketSector.MORTGAGE
        case "MUNI":
            return MarketSector.MUNICIPAL
        case "PFD":
            return MarketSector.PREFERRED
        case _:
            raise ValueError(f"Unknown market sector: {market_sector}")


def normalize_security_type(security_type: str) -> SecurityType:
    match security_type.upper():
        case "STOCK" | "COMMON STOCK" | "EQUITY":
            # alpha-vantage uses equity for stocks
            return SecurityType.COMMON_STOCK
        case "ETP" | "ETF":
            return SecurityType.ETP
        case "GDR":
            return SecurityType.GDR
        case "EQUITY INDEX":
            return SecurityType.EQUITY_INDEX
        case "COMMODITY INDEX":
            return SecurityType.COMMODITY_INDEX
        case "CRYPTO":
            return SecurityType.CRYPTO
        case "BOND":
            return SecurityType.BOND
        case _:
            raise ValueError(f"Unknown security type: {security_type}")
