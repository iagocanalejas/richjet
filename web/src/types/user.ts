export type PlanType = 'FREE' | 'LITE' | 'PRO' | 'MAX' | 'ADMIN';
export interface User {
    id: string;
    plan: PlanType;
    email: string;
    name: string;
    picture: string;
}

// TODO: savings account where you can add interests
export const AccountTypes = ['BROKER', 'BANK'] as const;
export type AccountType = (typeof AccountTypes)[number];

export type AccountBalance = {
    id: string;
    account_id: string;
    balance: number;
    updated_at: string;
};

export type Account = {
    id: string;
    name: string;
    user_id: string;
    account_type: AccountType;
    currency: string;
    balance: number;
    balance_history: AccountBalance[];
};

export type SubscriptionPlan = {
    id: string;
    currency: string;
    unit_amount: number;
    active: boolean;
    recurring: { interval: string };
    product: {
        id: string;
        name: string;
        description?: string;
        active: boolean;
    };
};

export type Subscription = {
    id: string;
    plan: SubscriptionPlan;
    cancel_at_period_end?: boolean;
    canceled_at?: number;
    currency: string;
    items: {
        data: {
            current_period_end: number;
            current_period_start: number;
        }[];
    };
};

export const DEFAULT_LIMITS = Object.freeze<Limits>({
    max_accounts: 1,
    max_shares: 10,
    max_transactions: 100,
});

export type Limits = {
    max_accounts: number;
    max_shares: number;
    max_transactions: number;
};

export const DEFAULT_SETTINGS = Object.freeze<Settings>({
    currency: 'USD',
    accounts: [],
    limits: DEFAULT_LIMITS,
});

export type Settings = {
    currency: string;
    accounts: Account[];
    subscription?: Subscription;
    limits: Limits;
};
