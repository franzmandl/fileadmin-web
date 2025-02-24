import {alwaysThrow, arrayRemoveInPlaceByValue, getHashParams, identity} from 'common/Util';
import {ModalContent} from 'components/util/ModalComponent';
import React, {Dispatch, ReactNode, SetStateAction, useMemo, useRef, useState} from 'react';
import {Button, DropdownItem, Input, InputGroup} from 'reactstrap';
import toast from 'react-hot-toast';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {KeyboardControl, SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {ImmutableRefObject, useDepsEffect, useLatest} from 'common/ReactUtil';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {AppParameter, useAppParameter} from './useAppParameter';
import {constant} from 'common/constants';
import {useListener} from 'common/useListener';

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
    readonly nowDropdownItem: ReactNode;
    readonly preventClose: <T>(promise: Promise<T>) => Promise<T>;
    readonly spellCheckDropdownItem: ReactNode;
    readonly toast: (message: string | React.JSX.Element) => void;
}

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
    const [currentParams, setCurrentParams] = useState(constant.hashParams);
    useListener(
        (): void => setCurrentParams(getHashParams()),
        (listener): void => window.addEventListener('hashchange', listener),
        (listener): void => window.removeEventListener('hashchange', listener),
    );
    const appParameter = useAppParameter(emptyParams, currentParams, setCurrentParams);

    const enterPreventClose = (): void => void (preventCloseCounterRef.current += 1);
    const exitPreventClose = (): void => void (preventCloseCounterRef.current -= 1);
    const indicateLoadingRef: ImmutableRefObject<<T>(promise: Promise<T>) => Promise<T>> = useLatest(
        useAsyncCallback<unknown, [Promise<unknown>], any>(
            (promise) => {
                setIsLoading(true);
                return promise;
            },
            identity,
            alwaysThrow,
            () => setIsLoading(false),
        ),
    );
    const preventCloseRef: ImmutableRefObject<<T>(promise: Promise<T>) => Promise<T>> = useLatest(
        useAsyncCallback<unknown, [Promise<unknown>], any>(
            (promise) => {
                enterPreventClose();
                return promise;
            },
            identity,
            alwaysThrow,
            exitPreventClose,
        ),
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
    useListener(
        (ev: KeyboardEvent): void => {
            const listeners = keyDownListeners.current;
            for (let index = listeners.length - 1; index >= 0; index--) {
                if (listeners[index](ev)) {
                    break;
                }
            }
        },
        (listener): void => window.addEventListener('keydown', listener),
        (listener): void => window.removeEventListener('keydown', listener),
    );

    return {
        appStore: useMemo(
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
                        }),
                    ),
                currentParams,
                setCurrentParams,
                enterPreventClose,
                exitPreventClose,
                indicateLoading: (...args) => indicateLoadingRef.current(...args),
                setKeyboardControl,
                keyDownListeners: {
                    add: (listener: (ev: KeyboardEvent) => boolean): void => void keyDownListeners.current.push(listener),
                    remove: (listener: (ev: KeyboardEvent) => boolean): void =>
                        void arrayRemoveInPlaceByValue(keyDownListeners.current, listener),
                },
                modalContainerRef,
                nowDropdownItem: (
                    <DropdownItem text toggle={false}>
                        <InputGroup size='sm'>
                            <Input
                                bsSize='sm'
                                invalid={appParameter.values.now.string !== '' && appParameter.values.now.date === null}
                                placeholder='Now'
                                style={{width: '7rem'}}
                                value={appParameter.values.now.string}
                                onChange={(ev): void => appParameter.setNow(ev.target.value)}
                            />
                            <Button
                                className={'mdi ' + (appParameter.values.now.string === '' ? 'mdi-calendar-today' : 'mdi-close')}
                                onClick={(): void => appParameter.setNow(appParameter.values.now.string === '' ? constant.nowString : '')}
                            />
                        </InputGroup>
                    </DropdownItem>
                ),
                preventClose: (...args) => preventCloseRef.current(...args),
                spellCheckDropdownItem: (
                    <DropdownItemCheckbox checked={appParameter.values.spellCheck} setChecked={appParameter.setSpellCheck}>
                        Spell check
                    </DropdownItemCheckbox>
                ),
                toast,
            }),
            [appParameter, currentParams, indicateLoadingRef, preventCloseRef],
        ),
        isLoading,
        keyboardControl,
        modalContent,
    };
}

function OkButton({closeModal, resolve}: {readonly closeModal: () => void; readonly resolve: (value: boolean) => void}): React.JSX.Element {
    return (
        <Button
            onClick={(): void => {
                resolve(true);
                closeModal();
            }}
        >
            Ok
        </Button>
    );
}
