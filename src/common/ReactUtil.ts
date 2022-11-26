import {
    BaseSyntheticEvent,
    DependencyList,
    Dispatch,
    EffectCallback,
    MutableRefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
} from 'react';
import {removeMatches} from './Util';

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
    const result = [...array];
    result.splice(index, 0, value);
    return result;
}

export function arrayRemove<T>(array: ReadonlyArray<T>, index: number): T[] {
    const result = [...array];
    result.splice(index, 1);
    return result;
}

export function arrayReplace<T>(array: ReadonlyArray<T>, index: number, value: T): T[] {
    const result = [...array];
    result.splice(index, 1, value);
    return result;
}

export type ImmutableRefObject<T> = Readonly<MutableRefObject<T>>;

export const useDepsLayoutEffect: (effect: EffectCallback, deps: DependencyList) => void = useLayoutEffect;
export const useDepsEffect: (effect: EffectCallback, deps: DependencyList) => void = useEffect;

export function useConditionalEffect(condition: boolean, effect: EffectCallback): void {
    useDepsEffect(() => {
        if (condition) {
            effect();
        }
    }, [condition]);
}

export function useLatest<T>(value: T): Readonly<ImmutableRefObject<T>> {
    const valueRef = useRef(value);
    valueRef.current = value;
    return valueRef;
}

export function useSanitizedValue([value, setValue]: [string, Dispatch<string>], regExp: RegExp): [string, Dispatch<string>] {
    return [removeMatches(value, regExp), useCallback((nextValue) => setValue(removeMatches(nextValue, regExp)), [regExp, setValue])];
}
