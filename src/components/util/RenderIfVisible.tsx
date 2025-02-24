import {ImmutableRefObject, useDepsEffect} from 'common/ReactUtil';
import React, {useState, ReactNode, useRef} from 'react';

/**
 * See https://github.com/NightCafeStudio/react-render-if-visible/blob/main/src/render-if-visible.tsx
 */
export function RenderIfVisible({
    intersectionRef,
    initialVisible = false,
    stayRendered = true,
    root = null,
    placeholder,
    children,
}: {
    readonly intersectionRef: ImmutableRefObject<HTMLElement | null>;
    readonly initialVisible?: boolean;
    readonly stayRendered?: boolean;
    readonly root?: HTMLElement | null;
    readonly placeholder?: ReactNode;
    readonly children: ReactNode;
}): React.JSX.Element {
    const [isVisible, setIsVisible] = useState<boolean>(initialVisible);
    const [wasVisible, setWasVisible] = useState<boolean>(initialVisible);
    const setIsVisibleAndWasVisible = useRef((nextIsVisible: boolean) => {
        setIsVisible(nextIsVisible);
        if (nextIsVisible) {
            setWasVisible(true);
        }
    });
    useDepsEffect(() => {
        const element = intersectionRef.current;
        if (element) {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (typeof window !== undefined && window.requestIdleCallback) {
                        window.requestIdleCallback(() => setIsVisibleAndWasVisible.current(entries[0].isIntersecting), {
                            timeout: 600,
                        });
                    } else {
                        setIsVisibleAndWasVisible.current(entries[0].isIntersecting);
                    }
                },
                {root},
            );
            observer.observe(element);
            return (): void => {
                observer.unobserve(element);
            };
        } else {
            throw Error('intersectionRef.current is null');
        }
    }, []);
    return <>{isVisible || (stayRendered && wasVisible) ? children : placeholder}</>;
}
