import {useDepsEffect, useLatest} from './ReactUtil';

export function useListener<A extends ReadonlyArray<unknown>, R>(
    callback: (...args: A) => R,
    addListener: (callback: (...args: A) => R) => void,
    removeListener: (callback: (...args: A) => R) => void,
    deps: ReadonlyArray<unknown> = [],
): void {
    const callbackRef = useLatest(callback);
    useDepsEffect(() => {
        const listener = (...args: A): R => callbackRef.current(...args);
        addListener(listener);
        return () => removeListener(listener);
    }, deps);
}
