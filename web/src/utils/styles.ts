import type { TransactionType } from '@/types/portfolio';

export function textColorByRentability(value: number, manual: boolean = false) {
    return {
        'text-green-400': value > 0,
        'text-red-400': value < 0,
        'text-white': value === 0,
        'text-yellow-400': manual,
    };
}

export function borderByTransactionType(type: TransactionType) {
    switch (type) {
        case 'BUY':
            return 'border-green-600 bg-gray-800';
        case 'SELL':
            return 'border-red-600 bg-gray-800';
        case 'DIVIDEND':
        case 'DIVIDEND-CASH':
            return 'border-blue-600 bg-gray-800';
        default:
            return '';
    }
}
