from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from models.session import Session
from models.symbol import Symbol
from models.transactions import (
    Transaction,
    TransactionType,
    _validate_sell_transaction,
    _validate_transaction_by_type,
    update_transaction,
)
from models.user import User


@pytest.fixture
def sample_row():
    return {
        "transaction_id": "tx-123",
        "user_id": "user-1",
        "account_id": "acc-1",
        "symbol_id": "sym-1",
        "quantity": 10,
        "price": 100,
        "commission": 1,
        "transaction_currency": "USD",
        "transaction_type": "BUY",
        "date": "2024-01-01",
        "created_at": "2024-01-02",
        "name": "Test Symbol",
        "ticker": "TST",
        "display_name": "Test Symbol",
        "symbol_currency": "USD",
        "source": "manual",
        "security_type": "STOCK",
        "market_sector": "COMMODITY",
        "isin": "ISIN123",
        "figi": "FIGI123",
        "picture": None,
        "user_created": True,
        "account_name": "Brokerage",
        "account_type": "BROKER",
        "balance": 1000,
        "currency": "USD",
    }


session = Session(
    session_id="sess-1",
    user=User(
        id="u1",
        email="",
        given_name="Test",
        family_name="User",
        picture="",
    ),
    currency="USD",
    tokens={},
    expires=1700000000.0,
)


@pytest.mark.parametrize(
    "ttype, price, qty, expect_error",
    [
        (TransactionType.DIVIDEND, 0, 0, True),  # qty must be > 0
        (TransactionType.DIVIDEND_CASH, 0, 1, True),  # price must be > 0 & qty must be 0
        (TransactionType.DIVIDEND, 0, 1, False),
        (TransactionType.DIVIDEND_CASH, 10, 0, False),
    ],
)
@pytest.mark.asyncio
async def test_validate_transaction_types(ttype, price, qty, expect_error):
    db = MagicMock()
    with patch(
        "models.transactions.get_transactions_by_user",
        return_value=[
            Transaction(
                user_id="u1",
                symbol=Symbol(
                    id="sym-1",
                    ticker="TST",
                    name="TEST",
                    display_name="Test",
                    currency="USD",
                    source="manual",
                ),
                quantity=1,
                price=10,
                commission=0,
                currency="USD",
                transaction_type=TransactionType.BUY,
                date="2024-01-01",
            )
        ],
    ):
        tx = Transaction(
            user_id="u1",
            symbol_id="sym-1",
            quantity=qty,
            price=price,
            commission=0,
            currency="USD",
            transaction_type=ttype,
            date="2024-01-01",
        )
        if expect_error:
            with pytest.raises(HTTPException):
                await _validate_transaction_by_type(db, session, tx)
        else:
            await _validate_transaction_by_type(db, session, tx)


@pytest.mark.asyncio
async def test_validate_sell_transaction_not_enough():
    db = MagicMock()
    with patch(
        "models.transactions.get_transactions_by_user_and_symbol_and_account",
        return_value=[
            Transaction(
                user_id="u1",
                symbol=Symbol(
                    id="sym-1",
                    ticker="TST",
                    name="TEST",
                    display_name="Test",
                    currency="USD",
                    source="manual",
                ),
                quantity=5,
                price=10,
                commission=0,
                currency="USD",
                transaction_type=TransactionType.BUY,
                date="2024-01-01",
            )
        ],
    ):
        tx = Transaction(
            user_id="u1",
            symbol_id="sym-1",
            account_id="a1",
            quantity=10,
            price=10,
            commission=0,
            currency="USD",
            transaction_type=TransactionType.SELL,
            date="2024-01-01",
        )
        with pytest.raises(HTTPException):
            await _validate_sell_transaction(db, session, tx)


@pytest.mark.asyncio
async def test_update_sell_transaction_beyond_limits():
    db = MagicMock()
    sell = Transaction(
        id="tx-sell-1",
        user_id="u1",
        symbol=Symbol(
            id="sym-1",
            ticker="TST",
            name="TEST",
            display_name="Test",
            currency="USD",
            source="manual",
        ),
        quantity=4,
        price=10,
        commission=0,
        currency="USD",
        transaction_type=TransactionType.SELL,
        date="2024-01-01",
    )

    with (
        patch(
            "models.transactions.get_transactions_by_user_and_symbol_and_account",
            return_value=[
                Transaction(
                    user_id="u1",
                    symbol=Symbol(
                        id="sym-1",
                        ticker="TST",
                        name="TEST",
                        display_name="Test",
                        currency="USD",
                        source="manual",
                    ),
                    quantity=1,
                    price=10,
                    commission=0,
                    currency="USD",
                    transaction_type=TransactionType.BUY,
                    date="2024-01-01",
                ),
                sell,
                Transaction(
                    user_id="u1",
                    symbol=Symbol(
                        id="sym-1",
                        ticker="TST",
                        name="TEST",
                        display_name="Test",
                        currency="USD",
                        source="manual",
                    ),
                    quantity=5,
                    price=10,
                    commission=0,
                    currency="USD",
                    transaction_type=TransactionType.BUY,
                    date="2024-01-01",
                ),
            ],
        ),
        patch("models.transactions.get_transaction_by_id", return_value=sell),
    ):
        sell.symbol_id = getattr(sell.symbol, "id", "sym-1")
        sell.quantity = 3  # valid update, total sold = 4, total bought before the sell = 5
        await update_transaction(db, session, sell)

        sell.quantity = 6  # invalid update, total sold = 6, total bought before the sell = 5
        with pytest.raises(HTTPException):
            await update_transaction(db, session, sell)
