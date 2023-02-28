import {useDepsEffect} from 'common/ReactUtil';
import React, {ReactNode, useCallback, useRef} from 'react';
import {Button} from 'reactstrap';
import {KeyboardControl} from './KeyboardControl';

export function KeyboardControlComponent({
    hidden,
    keyboardControl,
}: {
    readonly hidden?: boolean;
    readonly keyboardControl: KeyboardControl | undefined;
}): JSX.Element {
    return (
        <>
            <CursorButton
                disabled={keyboardControl === undefined}
                hidden={hidden}
                moveCursor={useCallback(() => keyboardControl?.moveCursor(-1), [keyboardControl])}
            >
                <span className='mdi mdi-arrow-left' />
            </CursorButton>
            <CursorButton
                disabled={keyboardControl === undefined}
                hidden={hidden}
                moveCursor={useCallback(() => keyboardControl?.moveCursor(1), [keyboardControl])}
            >
                <span className='mdi mdi-arrow-right' />
            </CursorButton>
        </>
    );
}

function CursorButton({
    children,
    disabled,
    hidden,
    moveCursor,
}: {
    readonly children: ReactNode;
    readonly disabled?: boolean;
    readonly hidden?: boolean;
    readonly moveCursor: () => void;
}): JSX.Element {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>();
    useDepsEffect(
        () => () => {
            // For safety in case something goes wrong.
            if (timeoutRef.current !== undefined) {
                clearTimeout(timeoutRef.current);
            }
        },
        []
    );
    const intervalCallback = useCallback(() => {
        moveCursor();
        timeoutRef.current = setTimeout(() => intervalCallbackRef.current(), 100);
    }, [moveCursor]);
    // BEGIN useLatest
    const intervalCallbackRef = useRef(intervalCallback);
    intervalCallbackRef.current = intervalCallback;
    // END useLatest
    const clear = useCallback((ev: React.SyntheticEvent) => {
        ev.preventDefault();
        if (timeoutRef.current !== undefined) {
            clearTimeout(timeoutRef.current);
        }
    }, []);
    return (
        <Button
            className='page-sidebar-icon'
            color='dark'
            disabled={disabled}
            hidden={hidden}
            onPointerDown={useCallback(
                (ev: React.SyntheticEvent) => {
                    ev.preventDefault();
                    moveCursor();
                    if (timeoutRef.current !== undefined) {
                        clearTimeout(timeoutRef.current);
                    }
                    timeoutRef.current = setTimeout(() => intervalCallbackRef.current(), 300);
                },
                [moveCursor]
            )}
            onPointerUp={clear}
            onPointerCancel={clear} // Happen after long presses on mobile devices instead of pointerUp.
        >
            {children}
        </Button>
    );
}
