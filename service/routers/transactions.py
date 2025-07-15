from db import get_db
from fastapi import APIRouter, Body, Depends
from models._limits import LimitAction, enforce_limit
from models.transactions import (
    Transaction,
    create_transaction,
    get_transactions_by_user_id,
    remove_transaction_by_id,
    update_stock_account,
)

from routers.auth import get_session

router = APIRouter()


@router.get("/")
async def api_get_transactions(
    db=Depends(get_db),
    session=Depends(get_session),
):
    transactions = get_transactions_by_user_id(db, session.user.id)
    return [t.to_dict() for t in transactions]


@router.post("/")
async def api_create_transaction(
    transaction_data: dict = Body(...),
    _=enforce_limit(LimitAction.CREATE_TRANSACTION),
    db=Depends(get_db),
    session=Depends(get_session),
):
    transaction_data["user_id"] = session.user.id
    transaction = Transaction.from_dict(**transaction_data)
    transaction = create_transaction(db, session.user.id, transaction)
    return transaction.to_dict()


@router.put("/{ticker}")
async def api_update_transaction(
    ticker: str,
    transaction_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    from_account = transaction_data.get("from_account", None)
    to_account = transaction_data.get("to_account", None)
    return update_stock_account(db, session.user.id, ticker, from_account, to_account)


@router.delete("/{transaction_id}")
async def api_remove_transaction(
    transaction_id: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    remove_transaction_by_id(db, session.user.id, transaction_id)
