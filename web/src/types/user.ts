export interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export const AccountTypes = ['BROKER', 'BANK'] as const;
export type AccountType = (typeof AccountTypes)[number];
export type Account = {
    id: string;
    name: string;
    user_id: string;
    account_type: AccountType;
};

export type Settings = {
    currency: string;
    accounts: Account[];
};
