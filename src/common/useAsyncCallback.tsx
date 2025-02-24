import {useLatest} from './ReactUtil';

/**
 * Should be used in React code instead of async/await and then/catch/finally.
 * In contrast to normal promises, this method runs onFulfilled, onRejected and onFinally synchronously if possible.
 * see https://stackoverflow.com/questions/32059531/what-happens-if-a-promise-completes-before-then-is-called
 */
export function useAsyncCallback<T, A extends ReadonlyArray<unknown>, R>(
    callback: (...args: A) => Promise<T> | T,
    onFulfilled: (value: T, ...args: A) => R,
    onRejected: (error: unknown, ...args: A) => R,
    onFinally?: (...args: A) => void,
): (...args: A) => Promise<R> {
    const callbackRef = useLatest(callback);
    const onFulfilledRef = useLatest(onFulfilled);
    const onRejectedRef = useLatest(onRejected);
    const onFinallyRef = useLatest(onFinally);
    return (...args: A) => {
        const promise = callbackRef.current(...args);
        if (promise instanceof Promise) {
            return promise
                .then(
                    (value) => onFulfilledRef.current(value, ...args),
                    (error) => onRejectedRef.current(error, ...args),
                )
                .finally(() => onFinallyRef.current?.(...args));
        } else {
            try {
                return Promise.resolve(onFulfilledRef.current(promise, ...args));
            } catch (error) {
                return Promise.resolve(onRejectedRef.current(error, ...args));
            } finally {
                onFinallyRef.current?.(...args);
            }
        }
    };
}
