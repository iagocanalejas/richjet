import { useErrorsStore, type CustomError } from '../errors';

const addError = (e: CustomError) => useErrorsStore().addError(e);

export async function safeFetch<T>(f: Promise<Response>, errorMessage: string): Promise<T | undefined>;

export async function safeFetch<T>(f: Promise<Response>, errorMessage: string, defaultValue: T): Promise<T>;

export async function safeFetch<T>(
    f: Promise<Response>,
    errorMessage: string,
    defaultValue?: T
): Promise<T | undefined> {
    const isBool = typeof defaultValue === 'boolean';
    try {
        const res = await f;
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? errorMessage,
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return defaultValue;
        }
        return !isBool ? ((await res.json()) as T) : (true as T);
    } catch (err) {
        addError({
            readable_message: errorMessage,
            trace: {
                status: err instanceof Error ? err.message : String(err),
            },
        });
        return defaultValue;
    }
}
