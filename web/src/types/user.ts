export interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
}

// TODO: savings account where you can add interests
export const AccountTypes = ['BROKER', 'BANK'] as const;
export type AccountType = (typeof AccountTypes)[number];
export type Account = {
    id: string;
    name: string;
    user_id: string;
    account_type: AccountType;
    balance?: number;
};

export type Settings = {
    currency: string;
    accounts: Account[];
};
