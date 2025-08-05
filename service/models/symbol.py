import re
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow


class SecurityType(Enum):
    COMMON_STOCK = "STOCK"
    ETP = "ETP"
    INDEX = "INDEX"
    GDR = "GDR"
    CRYPTO = "CRYPTO"
    BOND = "BOND"

    @classmethod
    def from_str(cls, security_type: str) -> "SecurityType":
        match security_type.upper():
            case "STOCK" | "COMMON STOCK" | "ST" | "EQUITY" | "CSRT" | "PR" | "PREFERRED" | "PREFERRED STOCK":
                # alpha-vantage uses equity for stocks
                return cls.COMMON_STOCK
            case "ETP" | "ETF" | "FUND":
                return cls.ETP
            case "GDR":
                return cls.GDR
            case "EQUITY INDEX" | "COMMODITY INDEX" | "INDEX":
                return cls.INDEX
            case "CRYPTO":
                return cls.CRYPTO
            case "BOND" | "BND":
                return cls.BOND
            case _:
                raise ValueError(f"Unknown security type: {security_type}")


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

    @classmethod
    def from_str(cls, market_sector: str) -> "MarketSector":
        match market_sector.upper():
            case "COMDTY":
                return cls.COMMODITY
            case "CORP":
                return cls.CORPORATE
            case "CURNCY":
                return cls.CURRENCY
            case "EQUITY":
                return cls.EQUITY
            case "GOVT":
                return cls.GOVERNMENT
            case "INDEX":
                return cls.INDEX
            case "M-MKT":
                return cls.MONEY_MARKET
            case "MTGE":
                return cls.MORTGAGE
            case "MUNI":
                return cls.MUNICIPAL
            case "PFD":
                return cls.PREFERRED
            case _:
                raise ValueError(f"Unknown market sector: {market_sector}")


@dataclass
class Symbol:
    ticker: str
    display_name: str
    name: str
    currency: str
    source: str
    security_type: SecurityType
    id: str = ""
    picture: str | None = None
    market_sector: MarketSector | None = None
    isin: str | None = None
    figi: str | None = None
    region: str | None = None
    manual_price: float | None = None
    is_user_created: bool = False

    def __eq__(self, value: object, /) -> bool:
        return isinstance(value, Symbol) and self.ticker == value.ticker

    def __hash__(self) -> int:
        return hash(self.ticker)

    def merge(self, other: "Symbol") -> "Symbol":
        return Symbol(
            id=self.id,
            display_name=self.display_name or other.display_name,
            ticker=self.ticker or other.ticker,
            name=self.name or other.name,
            currency=self.currency or other.currency,
            source=self.source or other.source,
            security_type=self.security_type or other.security_type,
            picture=self.picture or other.picture,
            market_sector=self.market_sector or other.market_sector,
            isin=self.isin or other.isin,
            figi=self.figi or other.figi,
            region=self.region or other.region,
            manual_price=self.manual_price or other.manual_price,
            is_user_created=self.is_user_created or other.is_user_created,
        )

    @classmethod
    def from_row(cls, row: RealDictRow) -> "Symbol":
        return cls(
            id=row["symbol_id"] if "symbol_id" in row else row["id"],
            display_name=row["display_name"],
            ticker=row["ticker"],
            name=row["name"],
            currency=row["symbol_currency"] if "symbol_currency" in row else row["currency"],
            source=row["source"],
            security_type=SecurityType(row["security_type"]),
            market_sector=MarketSector(row["market_sector"]) if row["market_sector"] else None,
            isin=row["isin"],
            figi=row["figi"],
            picture=row["picture"],
            manual_price=row["manual_price"] if "manual_price" in row else None,
            is_user_created=row["user_created"],
        )

    @classmethod
    def from_dict(cls, **kwargs) -> "Symbol":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "security_type" in kwargs and kwargs["security_type"]:
            item.security_type = SecurityType(kwargs["security_type"])
        if "market_sector" in kwargs and kwargs["market_sector"]:
            item.market_sector = MarketSector(kwargs["market_sector"])
        return item

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ticker": self.ticker,
            "display_name": self.display_name,
            "name": self.name,
            "currency": self.currency,
            "source": self.source,
            "security_type": self.security_type.value,
            "picture": self.picture,
            "market_sector": self.market_sector.value if self.market_sector else None,
            "isin": self.isin,
            "figi": self.figi,
            "region": self.region,
            "manual_price": self.manual_price,
            "is_user_created": self.is_user_created,
        }


def build_symbol_picture_url(item: Symbol) -> str | None:
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


def is_supported_ticker(ticker: str) -> bool:
    """
    Checks if the ticker is supported by the system.
    """
    if not ticker:
        return False
    ticker = ticker.strip().upper()

    is_supported = "." not in ticker[1:]
    is_supported &= not re.search(r"^-?\d+X SHORT\b", ticker)
    is_supported &= not re.search(r"^-?\d+X LONG\b", ticker)
    is_supported &= not re.search(r"^LS \d+X\b", ticker)

    return is_supported


def search_symbol(db: Connection, query: str) -> list[Symbol]:
    like_query = f"%{query}%"
    sql = """
        SELECT id, ticker, display_name, name, currency, source, security_type, market_sector,
               isin, figi, picture, user_created
        FROM symbols
        WHERE NOT user_created AND (
            ticker ILIKE %s OR
            name ILIKE %s OR
            isin ILIKE %s OR
            figi ILIKE %s
        )
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (like_query,) * 4)
        rows = cursor.fetchall()

    return [Symbol.from_row(row) for row in rows]


def get_symbol_by_ticker(db: Connection, ticker: str) -> Symbol:
    """
    Gets a symbol by its ticker from the database.
    """
    if not ticker:
        raise HTTPException(status_code=400, detail=required_msg("ticker"))

    sql = """
        SELECT id, ticker, display_name, name, currency, source, security_type, market_sector,
               isin, figi, picture, user_created
        FROM symbols
        WHERE NOT user_created AND ticker = %s
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (ticker,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail=f"Symbol {ticker} not found")

    return Symbol.from_row(result)


def create_symbol(db: Connection, symbol: Symbol) -> Symbol:
    """
    Creates a symbol in the database.
    """
    if not symbol.ticker:
        raise HTTPException(status_code=400, detail=required_msg("symbol.ticker"))
    if not symbol.name:
        raise HTTPException(status_code=400, detail=required_msg("symbol.name"))
    if not symbol.currency:
        raise HTTPException(status_code=400, detail=required_msg("symbol.currency"))
    if not symbol.source:
        raise HTTPException(status_code=400, detail=required_msg("symbol.source"))
    if not symbol.security_type:
        raise HTTPException(status_code=400, detail=required_msg("symbol.security_type"))

    sql = """
        INSERT INTO symbols (
            ticker, name, currency, source, security_type,
            market_sector, isin, figi, picture, user_created
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(
            sql,
            (
                symbol.ticker,
                symbol.name,
                symbol.currency,
                symbol.source,
                symbol.security_type.value,
                symbol.market_sector.value if symbol.market_sector else None,
                symbol.isin,
                symbol.figi,
                symbol.picture,
                symbol.is_user_created,
            ),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Failed to create symbol")

    symbol.id = row[0]
    db.commit()
    return symbol
