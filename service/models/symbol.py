from dataclasses import dataclass
from enum import Enum


class SecurityType(Enum):
    COMMON_STOCK = "STOCK"
    ETP = "ETP"
    EQUITY_INDEX = "EQUITY_INDEX"
    COMMODITY_INDEX = "COMMODITY_INDEX"
    GDR = "GDR"
    CRYPTO = "CRYPTO"
    BOND = "BOND"


class MarketSector(Enum):
    COMMODITY = "COMMODITY"
    CORPORATE = "CORPORATE"
    CURRENCY = "CURRENCY"
    EQUITY = "EQUITY"
    GOVERNMENT = "GOVERNMENT"
    INDEX = "INDEX"
    MONEY_MARKET = "MONEY_MARKET"
    MORTGAGE = "MORTGAGE"
    MUNICIPAL = "MUNICIPAL"
    PREFERRED = "PREFERRED"


def build_symbol_picture_url(item: "Symbol") -> str | None:
    if item.isin:
        return f"https://assets.parqet.com/logos/isin/{item.isin}"
    else:
        ttype = {
            SecurityType.COMMON_STOCK: "symbol",
            SecurityType.ETP: "symbol",
            SecurityType.GDR: "symbol",
            SecurityType.CRYPTO: "crypto",
        }.get(item.security_type, "unknown")
        if ttype != "unknown":
            return f"https://assets.parqet.com/logos/{ttype}/{item.ticker}"


@dataclass
class Symbol:
    ticker: str
    name: str
    currency: str
    source: str
    security_type: SecurityType
    id: int = 0
    picture: str | None = None
    market_sector: MarketSector | None = None
    isin: str | None = None
    figi: str | None = None
    manual_price: float | None = None

    @classmethod
    def from_dict(cls, **kwargs) -> "Symbol":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "security_type" in kwargs:
            item.security_type = SecurityType(kwargs["security_type"])
        if "market_sector" in kwargs:
            item.market_sector = MarketSector(kwargs["market_sector"])
        if "picture" not in kwargs:
            item.picture = kwargs.get("picture", build_symbol_picture_url(item))
        return item

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ticker": self.ticker,
            "name": self.name,
            "currency": self.currency,
            "source": self.source,
            "security_type": self.security_type.value,
            "picture": self.picture,
            "market_sector": self.market_sector.value if self.market_sector else None,
            "isin": self.isin,
            "figi": self.figi,
            "manual_price": self.manual_price,
        }


def get_or_create_symbol(db, symbol: Symbol) -> Symbol:
    """
    Gets a symbol from the database or creates it if it doesn't exist.
    """
    assert symbol, "Symbol object cannot be None"
    assert symbol.ticker, "Ticker cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, name, currency, source, security_type, market_sector, isin, figi, picture
            FROM symbols
            WHERE id = %s
                OR (ticker = %s AND (isin IS NULL OR isin = %s) AND (figi IS NULL OR figi = %s))
            """,
            (symbol.id, symbol.ticker, symbol.isin, symbol.figi),
        )
        result = cursor.fetchone()

        if result:
            return Symbol(
                id=result[0],
                ticker=symbol.ticker,
                name=result[1],
                currency=result[2],
                source=result[3],
                security_type=SecurityType(result[4]),
                market_sector=MarketSector(result[5]) if result[5] else None,
                isin=result[6],
                figi=result[7],
                picture=result[8],
                manual_price=result[9],
            )

        return create_symbol(db, symbol)


def create_symbol(db, symbol: Symbol) -> Symbol:
    """
    Creates a symbol in the database.
    """
    assert symbol, "Symbol object cannot be None"
    assert symbol.ticker, "Ticker cannot be None"
    assert symbol.name, "Name cannot be None"
    assert symbol.currency, "Currency cannot be None"
    assert symbol.source, "Source cannot be None"
    assert symbol.security_type, "Security type cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO symbols (ticker, name, currency, source, security_type, market_sector, isin, figi, picture)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                symbol.ticker,
                symbol.name,
                symbol.currency,
                symbol.source,
                symbol.security_type.value,
                symbol.market_sector.value if symbol.market_sector else None,
                symbol.isin,
                symbol.figi,
                symbol.picture if symbol.picture else build_symbol_picture_url(symbol),
            ),
        )
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to create symbol")

        symbol.id = result[0]
        db.commit()
    return symbol
