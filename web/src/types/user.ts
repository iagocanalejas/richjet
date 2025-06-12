export interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export type Account = {
    id: string;
    name: string;
    user_id: string;
    account_type: 'BROKER' | 'BANK';
};

export type Settings = {
    currency: string;
    accounts: Account[];
};
