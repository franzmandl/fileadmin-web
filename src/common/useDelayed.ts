import {useRef} from 'react';
import {useLatest} from './ReactUtil';

export function useDelayed(
    onStart: () => void,
    fn: () => unknown,
    timeoutMs: number,
): {readonly doDelayed: () => void; readonly doNow: () => void} {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>();
    const fnRef = useLatest(() => {
        timeoutRef.current = undefined;
        fn();
    });

    const doNow = (): void => {
        if (timeoutRef.current !== undefined) {
            clearTimeout(timeoutRef.current);
        } else {
            onStart();
        }
        fnRef.current();
    };

    const doDelayed = (): void => {
        if (timeoutRef.current !== undefined) {
            clearTimeout(timeoutRef.current);
        } else {
            onStart();
        }
        timeoutRef.current = setTimeout(() => fnRef.current(), timeoutMs);
    };

    return {doDelayed, doNow};
}
