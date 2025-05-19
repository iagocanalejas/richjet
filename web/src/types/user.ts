export interface User {
    id: number;
    email: string;
    name: string;
    picture: string;
}

export type Account = {
    id: number;
    name: string;
    user_id: number;
    account_type: 'BROKER' | 'BANK';
};

export type Settings = {
    currency: string;
    accounts: Account[];
};
