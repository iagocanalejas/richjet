// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export function formatCurrency(value: number, currency: string, convertionRate?: number): string {
    const userLocale = mapWeirdLocales(navigator.language || 'en-US');
    const formatter = new Intl.NumberFormat(userLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(value * (convertionRate ?? 1));
}

export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    if (typeof date === 'number') date = new Date(date * 1000);
    if (typeof date === 'string') date = new Date(date);
    const userLocale = mapWeirdLocales(navigator.language || 'en-US');
    return new Intl.DateTimeFormat(userLocale, options).format(new Date(date));
}

function mapWeirdLocales(locale: string) {
    switch (locale) {
        case 'gl':
            return 'es-ES';
        default:
            return locale;
    }
}

export function normalizePriceInput(value: string): number {
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
}
