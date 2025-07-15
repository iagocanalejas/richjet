from db import get_db
from fastapi import APIRouter, Depends
from models._limits import UserLimits
from models.settings import UserSettings, get_user_settings, update_user_settings
from models.subscriptions import get_active_subscription

from routers.auth import get_session

router = APIRouter()


@router.get("/settings")
async def api_get_settings(
    db=Depends(get_db),
    session=Depends(get_session),
):
    settings = get_user_settings(db, session.user.id)
    settings.subscription = get_active_subscription(session.user.stripe_id)
    settings.limits = UserLimits.get_user_limits(session.user)
    return settings.to_dict()


@router.put("/settings")
async def api_update_settings(
    settings_dict: dict,
    db=Depends(get_db),
    session=Depends(get_session),
):
    settings_dict["user_id"] = session.user.id
    settings = UserSettings.from_dict(**settings_dict)
    update_user_settings(db, settings)
    return settings.to_dict()
