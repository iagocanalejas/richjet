// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

export function formatCurrency(value: number, currency: string, convertionRate?: number): string {
	const userLocale = mapWeirdLocales(navigator.language || "en-US");
	const formatter = new Intl.NumberFormat(userLocale, {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return formatter.format(value * (convertionRate ?? 1));
}

function mapWeirdLocales(locale: string) {
	switch (locale) {
		case "gl":
			return "es-ES";
		default:
			return locale;
	}
}

export function colorClass(value: number, manual: boolean = false) {
	return {
		'text-green-400': value > 0,
		'text-red-400': value < 0,
		'text-white': value === 0,
		'text-yellow-400': manual,
	}
}
