from db import get_db
from fastapi import APIRouter, Body, Depends
from models.transactions import (
    Transaction,
    create_transaction,
    get_transactions_by_user_id,
    remove_transaction_by_id,
    update_transaction_account,
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
    db=Depends(get_db),
    session=Depends(get_session),
):
    transaction_data["user_id"] = session.user.id
    transaction = Transaction.from_dict(**transaction_data)
    transaction = create_transaction(db, session.user.id, transaction)
    return transaction.to_dict()


@router.put("/{transaction_id}")
async def api_update_transaction(
    transaction_id: str,
    transaction_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    account_id = transaction_data.get("account_id", None)
    updated_transaction = update_transaction_account(db, session.user.id, transaction_id, account_id)
    return updated_transaction.to_dict()


@router.delete("/{transaction_id}")
async def api_remove_transaction(
    transaction_id: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    remove_transaction_by_id(db, session.user.id, transaction_id)
