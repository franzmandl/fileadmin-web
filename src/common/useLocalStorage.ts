import {useState} from 'react';
import {useListener} from './useListener';

export function useLocalStorage<T>(
    key: string,
    decode: (item: string | null) => T,
    encode: (value: T) => string | null,
): [T, (transform: (prev: T) => T) => void] {
    const [value, setValue] = useState((): T => decode(localStorage.getItem(key)));
    useListener(
        (ev: StorageEvent): void => {
            if (ev.key === key) {
                setValue(decode(ev.newValue));
            }
        },
        (listener): void => window.addEventListener('storage', listener),
        (listener): void => window.removeEventListener('storage', listener),
    );
    return [
        value,
        (transform): void =>
            setValue((prev) => {
                const nextValue = transform(prev);
                const item = encode(nextValue);
                if (item !== null) {
                    localStorage.setItem(key, item);
                } else {
                    localStorage.removeItem(key);
                }
                return nextValue;
            }),
    ];
}
