from db import get_db
from fastapi import APIRouter, Body, Depends
from models._limits import LimitAction, enforce_limit
from models.account import Account, create_account, get_accounts_by_user_id, remove_account_by_id, update_account

from routers.auth import get_session

router = APIRouter()


@router.get("/")
async def api_get_accounts(
    db=Depends(get_db),
    session=Depends(get_session),
):
    accounts = get_accounts_by_user_id(db, session.user.id)
    return [a.to_dict() for a in accounts]


@router.post("/")
async def api_create_account(
    account_data: dict = Body(...),
    _=enforce_limit(LimitAction.CREATE_ACCOUNT),
    db=Depends(get_db),
    session=Depends(get_session),
):
    account_data["user_id"] = session.user.id
    account = Account.from_dict(**account_data)
    account = create_account(db, session.user.id, account)
    return account.to_dict()


@router.put("/{account_id}")
async def api_update_account(
    account_id: str,
    account_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    account_data["user_id"] = session.user.id
    account = Account.from_dict(**account_data)
    updated_account = update_account(db, session.user.id, account, account_id)
    return updated_account.to_dict()


@router.delete("/{account_id}")
async def api_remove_acctoun(
    account_id: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    remove_account_by_id(db, session.user.id, account_id)
