import logging

import stripe
from fastapi import HTTPException

logger = logging.getLogger("richjet")


def get_subscription_plans(currency: str = "USD") -> list[stripe.Price]:
    """
    Retrieves all available subscription plans for the specified currency.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")

    try:
        data = stripe.Price.list(active=True, expand=["data.product"]).data
        return [p for p in data if p.currency.lower() == currency.lower()]
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve subscription plans")


def get_active_subscription(customer_id: str | None) -> stripe.Subscription | None:
    """
    Retrieves the active subscription for a user by their customer ID.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")

    if not customer_id:
        return None

    try:
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            status="active",
            expand=["data.plan.product"],
        ).data
        if subscriptions:
            return subscriptions[0]
        return None
    except Exception as e:
        logger.error(f"Error retrieving active subscription for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve active subscription")


def update_subscription_cancellation(subscription_id: str, cancel: bool) -> stripe.Subscription:
    """
    Cancels a subscription by its ID.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")

    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        if subscription.status == "canceled":
            return subscription

        canceled_subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=cancel,
        )
        return canceled_subscription
    except Exception as e:
        logger.error(f"Error canceling subscription {subscription_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")
