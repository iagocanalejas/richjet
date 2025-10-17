from db import get_db
from fastapi import APIRouter, Body, Depends
from models._limits import LimitAction, enforce_limit
from models.transactions import (
    Transaction,
    create_transaction,
    get_transactions_by_user,
    remove_transaction_by_id,
    update_stock_account,
    update_transaction,
)

from routers.auth import get_session

router = APIRouter()


@router.get("/")
async def api_get_transactions(
    db=Depends(get_db),
    session=Depends(get_session),
):
    transactions = await get_transactions_by_user(db, session)
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
    transaction = await create_transaction(db, session, transaction)
    return transaction.to_dict()


@router.put("/{transaction_id}")
async def api_update_transaction(
    transaction_id: str,
    transaction_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    transaction_data["id"] = transaction_id
    transaction_data["user_id"] = session.user.id
    transaction = Transaction.from_dict(**transaction_data)
    transaction = await update_transaction(db, session, transaction)
    return transaction.to_dict()


@router.put("/{ticker}/account")
async def api_update_transaction_account(
    ticker: str,
    transaction_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    from_account = transaction_data.get("from_account", None)
    to_account = transaction_data.get("to_account", None)
    return await update_stock_account(db, session, ticker, from_account, to_account)


@router.delete("/{transaction_id}")
async def api_remove_transaction(
    transaction_id: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    remove_transaction_by_id(db, session, transaction_id)
