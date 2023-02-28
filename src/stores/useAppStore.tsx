import {alwaysThrow, arrayRemoveInPlace, getHashParams, identity, noop} from 'common/Util';
import {ModalContent} from 'components/util/ModalComponent';
import {Dispatch, ReactNode, SetStateAction, useCallback, useMemo, useRef, useState} from 'react';
import {Button} from 'reactstrap';
import toast from 'react-hot-toast';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {KeyboardControl, SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {ImmutableRefObject, useDepsEffect} from 'common/ReactUtil';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {AppParameter, useAppParameter} from './useAppParameter';

export interface AppStore {
    readonly appParameter: AppParameter;
    readonly confirm: (body: ReactNode, header?: ReactNode) => Promise<boolean>;
    readonly currentParams: URLSearchParams;
    readonly setCurrentParams: Dispatch<SetStateAction<URLSearchParams>>;
    readonly enterPreventClose: () => void;
    readonly exitPreventClose: () => void;
    readonly indicateLoading: <T>(promise: Promise<T>) => Promise<T>;
    readonly setKeyboardControl: SetKeyboardControl;
    readonly keyDownListeners: {
        readonly add: (listener: (ev: KeyboardEvent) => boolean) => void;
        readonly remove: (listener: (ev: KeyboardEvent) => boolean) => void;
    };
    readonly modalContainerRef: ImmutableRefObject<HTMLDivElement | null>;
    readonly preventClose: <T>(promise: Promise<T>) => Promise<T>;
    readonly spellCheckDropdownItem: ReactNode;
    readonly toast: (message: string | JSX.Element) => void;
}

const defaultHashParams = getHashParams();
const emptyParams = new URLSearchParams();

export function useAppStore(): {
    readonly appStore: AppStore;
    readonly isLoading: boolean;
    readonly keyboardControl: KeyboardControl | undefined;
    readonly modalContent: ModalContent | undefined;
} {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [keyboardControl, setKeyboardControl] = useState<KeyboardControl>();
    const modalContainerRef = useRef<HTMLDivElement>(null);
    const [modalContent, setModalContent] = useState<ModalContent>();
    const preventCloseCounterRef = useRef(0);
    const [currentParams, setCurrentParams] = useState(defaultHashParams);
    useDepsEffect(() => {
        const listener = () => setCurrentParams(getHashParams());
        window.addEventListener('hashchange', listener);
        return () => window.removeEventListener('hashchange', listener);
    }, []);
    const appParameter = useAppParameter(emptyParams, currentParams, setCurrentParams);

    const enterPreventClose = useCallback(() => (preventCloseCounterRef.current += 1), []);
    const exitPreventClose = useCallback(() => (preventCloseCounterRef.current -= 1), []);
    const indicateLoading: <T>(promise: Promise<T>) => Promise<T> = useAsyncCallback<unknown, [Promise<unknown>], any>(
        (promise) => {
            setIsLoading(true);
            return promise;
        },
        identity,
        alwaysThrow,
        () => setIsLoading(false)
    );
    const preventClose: <T>(promise: Promise<T>) => Promise<T> = useAsyncCallback<unknown, [Promise<unknown>], any>(
        (promise) => {
            enterPreventClose();
            return promise;
        },
        identity,
        alwaysThrow,
        exitPreventClose
    );

    useDepsEffect(() => {
        window.addEventListener('beforeunload', (ev: BeforeUnloadEvent) => {
            // To make the confirmation appear you have to interact with the page at least once.
            // see https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
            // see https://dev.to/eons/detect-page-refresh-tab-close-and-route-change-with-react-router-v5-3pd
            // see https://github.com/jacobbuck/react-beforeunload/blob/main/src/useBeforeunload.js
            if (preventCloseCounterRef.current > 0) {
                ev.preventDefault();
                return (ev.returnValue = '');
            }
        });
    }, []);

    const keyDownListeners = useRef<((ev: KeyboardEvent) => boolean)[]>([]);
    useDepsEffect(() => {
        const listener = (ev: KeyboardEvent) => {
            const listeners = keyDownListeners.current;
            for (let index = listeners.length - 1; index >= 0; index--) {
                if (listeners[index](ev)) {
                    break;
                }
            }
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    return {
        appStore: useMemo<AppStore>(
            () => ({
                appParameter,
                confirm: (body, header) =>
                    new Promise((resolve) =>
                        setModalContent({
                            header: header ?? 'Are you sure?',
                            body,
                            renderFooter: function renderOkButton(closeModal) {
                                return <OkButton closeModal={closeModal} resolve={resolve} />;
                            },
                            onClosed: () => resolve(false),
                        })
                    ),
                currentParams,
                setCurrentParams,
                enterPreventClose,
                exitPreventClose,
                indicateLoading,
                setKeyboardControl,
                keyDownListeners: {
                    add: (listener: (ev: KeyboardEvent) => boolean) => noop(keyDownListeners.current.push(listener)),
                    remove: (listener: (ev: KeyboardEvent) => boolean) => noop(arrayRemoveInPlace(keyDownListeners.current, listener)),
                },
                modalContainerRef,
                preventClose,
                spellCheckDropdownItem: (
                    <DropdownItemCheckbox checked={appParameter.values.spellCheck} setChecked={appParameter.setSpellCheck}>
                        Spell check
                    </DropdownItemCheckbox>
                ),
                toast,
            }),
            [appParameter, currentParams, enterPreventClose, exitPreventClose, indicateLoading, preventClose]
        ),
        isLoading,
        keyboardControl,
        modalContent,
    };
}

function OkButton({closeModal, resolve}: {readonly closeModal: () => void; readonly resolve: (value: boolean) => void}): JSX.Element {
    return (
        <Button
            onClick={useCallback(() => {
                resolve(true);
                closeModal();
            }, [closeModal, resolve])}
        >
            Ok
        </Button>
    );
}
