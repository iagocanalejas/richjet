import logging
import os

import stripe
from fastapi import APIRouter, Depends, HTTPException
from models.subscriptions import get_subscription_plans, update_subscription_cancellation

from routers.auth import get_session

logger = logging.getLogger("richjet")

router = APIRouter()

IS_PROD = os.getenv("DEBUG", False) != "True"
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173/")

stripe.api_key = os.getenv("STRIPE_API_KEY")


@router.get("/plans/{currency}")
async def get_plans(currency: str, _=Depends(get_session)):
    return get_subscription_plans(currency)


@router.get("/{plan_id}")
async def checkout(
    plan_id: str,
    session=Depends(get_session),
):
    """
    Creates a checkout session for the given plan ID.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")

    try:
        stripe_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": plan_id, "quantity": 1}],
            metadata={"user_id": session.user.id},
            success_url=f"{FRONTEND_BASE_URL}/checkout-success",
            cancel_url=f"{FRONTEND_BASE_URL}/checkout-cancel",
        )
        return {"session_id": stripe_session.id, "url": stripe_session.url}
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.put("/{subscription_id}/enable")
async def api_enable_subscription(subscription_id: str, _=Depends(get_session)):
    """
    Enables a subscription by its ID.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    return update_subscription_cancellation(subscription_id, cancel=False)


@router.put("/{subscription_id}/cancel")
async def api_cancel_subscription(subscription_id: str, _=Depends(get_session)):
    """
    Cancels a subscription by its ID.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    return update_subscription_cancellation(subscription_id, cancel=True)
