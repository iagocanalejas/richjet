from db import get_db
from fastapi import APIRouter, Body, Depends
from models.account import Account, create_account, get_accounts_by_user_id

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
    db=Depends(get_db),
    session=Depends(get_session),
):
    account = Account.from_dict(**account_data, user_id=session.user.id)
    account = create_account(db, session.user.id, account)
    return account.to_dict()
