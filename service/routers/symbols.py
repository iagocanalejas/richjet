from db import get_db
from fastapi import APIRouter, Body, Depends
from models.symbol import Symbol, create_symbol, remove_symbol_by_id
from models.user import User
from models.watchlist import create_watchlist_item

from routers.auth import get_session

router = APIRouter()


@router.post("/")
async def api_create_symbol(
    symbol_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    user_id = session.user.id if isinstance(session.user, User) else session.user
    symbol = Symbol.from_dict(**symbol_data, created_by=user_id)
    with db:
        with db.cursor() as cursor:
            cursor.execute(f"SAVEPOINT symbol_create_{user_id.replace('-', '_')};")
            try:
                symbol = create_symbol(db, session, symbol, no_commit=True)
                symbol = create_watchlist_item(db, session, symbol)
            except Exception as e:
                cursor.execute(f"ROLLBACK TO SAVEPOINT symbol_create_{user_id.replace('-', '_')};")
                raise e
    return symbol.to_dict()


@router.delete("/{symbol_id}")
async def api_remove_symbol(
    symbol_id: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    remove_symbol_by_id(db, session, symbol_id)
