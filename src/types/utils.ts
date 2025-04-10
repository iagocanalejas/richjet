export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export function formatCurrency(value: number, currency: string): string {
    const userLocale = mapWeirdLocales(navigator.language || "en-US");
    const formatter = new Intl.NumberFormat(userLocale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(value);
}

function mapWeirdLocales(locale: string) {
    switch (locale) {
        case "gl":
            return "es-ES";
        default:
            return locale;
    }
}
