import {useCallback, useRef} from 'react';
import {useLatest} from './ReactUtil';

export function useDelayed(
    onStart: () => void,
    fn: () => void,
    timeoutMs: number
): {readonly doDelayed: () => void; readonly doNow: () => void} {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>();
    const fnRef = useLatest(() => {
        timeoutRef.current = undefined;
        fn();
    });

    const doNow = useCallback(() => {
        if (timeoutRef.current !== undefined) {
            clearTimeout(timeoutRef.current);
        } else {
            onStart();
        }
        fnRef.current();
    }, [fnRef, onStart]);

    const doDelayed = useCallback((): void => {
        if (timeoutRef.current !== undefined) {
            clearTimeout(timeoutRef.current);
        } else {
            onStart();
        }
        timeoutRef.current = setTimeout(() => fnRef.current(), timeoutMs);
    }, [timeoutMs, onStart, fnRef]);

    return {doDelayed, doNow};
}
