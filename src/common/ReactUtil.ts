import {
    BaseSyntheticEvent,
    DependencyList,
    Dispatch,
    EffectCallback,
    MutableRefObject,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from 'react';
import {arrayAddInPlace, arrayRemoveInPlace, arrayReplaceInPlace, removeMatches} from './Util';

export function stopPropagation(ev: BaseSyntheticEvent): void {
    ev.stopPropagation();
}

export function focusNothing(): void {
    // If nothing else is focused, then document.activeElement === document.body. document.body.blur() does change that.
    (document.activeElement as HTMLOrSVGElement | null)?.blur?.();
}

export function stopPropagationAndFocusNothing(ev: BaseSyntheticEvent): void {
    ev.stopPropagation();
    focusNothing();
}

export function arrayAdd<T>(array: ReadonlyArray<T>, index: number, value: T): T[] {
    return arrayAddInPlace([...array], index, value);
}

export function arrayRemove<T>(array: ReadonlyArray<T>, index: number): T[] {
    return arrayRemoveInPlace([...array], index);
}

export function arrayReplace<T>(array: ReadonlyArray<T>, index: number, value: T): T[] {
    return arrayReplaceInPlace([...array], index, value);
}

export type ImmutableRefObject<T> = Readonly<MutableRefObject<T>>;

export const useDepsLayoutEffect: (effect: EffectCallback, deps: DependencyList) => void = useLayoutEffect;
export const useDepsEffect: (effect: EffectCallback, deps: DependencyList) => void = useEffect;
export const useDepsMemo = useMemo;

export function useConditionalEffect(condition: boolean, effect: EffectCallback): void {
    useDepsEffect(() => {
        if (condition) {
            effect();
        }
    }, [condition]);
}

export function useLatest<T>(value: T): ImmutableRefObject<T> {
    const valueRef = useRef(value);
    valueRef.current = value;
    return valueRef;
}

export function useSanitizedValue([value, setValue]: [string, Dispatch<string>], regex: RegExp): [string, Dispatch<string>] {
    return [removeMatches(value, regex), (nextValue): void => setValue(removeMatches(nextValue, regex))];
}
