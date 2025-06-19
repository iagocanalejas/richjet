import re
from dataclasses import dataclass
from enum import Enum


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
            case "STOCK" | "COMMON STOCK" | "EQUITY" | "CSRT":
                # alpha-vantage uses equity for stocks
                return cls.COMMON_STOCK
            case "ETP" | "ETF":
                return cls.ETP
            case "GDR":
                return cls.GDR
            case "EQUITY INDEX" | "COMMODITY INDEX" | "INDEX":
                return cls.INDEX
            case "CRYPTO":
                return cls.CRYPTO
            case "BOND":
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


@dataclass
class Symbol:
    ticker: str
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
    def from_dict(cls, **kwargs) -> "Symbol":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "security_type" in kwargs and kwargs["security_type"]:
            item.security_type = SecurityType(kwargs["security_type"])
        if "market_sector" in kwargs and kwargs["market_sector"]:
            item.market_sector = MarketSector(kwargs["market_sector"])
        if "picture" not in kwargs or not kwargs["picture"]:
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
            "region": self.region,
            "manual_price": self.manual_price,
            "is_user_created": self.is_user_created,
        }


def get_or_create_symbol(db, symbol: Symbol, user_created: bool = False) -> Symbol:
    """
    Gets a symbol from the database or creates it if it doesn't exist.
    """
    assert symbol, "Symbol object cannot be None"
    assert symbol.ticker, "Ticker cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, name, currency, source, security_type, market_sector, isin, figi, picture, user_created
            FROM symbols
            WHERE (
                id = %s::uuid OR
                (ticker = %s AND (isin IS NULL OR isin = %s) AND (figi IS NULL OR figi = %s))
            ) AND user_created = %s
            """,
            (
                symbol.id or "00000000-0000-0000-0000-000000000000",
                symbol.ticker,
                symbol.isin,
                symbol.figi,
                user_created,
            ),
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
                is_user_created=result[9],
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
            INSERT INTO symbols (
                ticker, name, currency, source, security_type, market_sector, isin, figi, picture, user_created
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                symbol.is_user_created,
            ),
        )
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to create symbol")

        symbol.id = result[0]
        db.commit()
    return symbol
