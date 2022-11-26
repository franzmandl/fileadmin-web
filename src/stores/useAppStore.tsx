import {alwaysThrow, identity} from 'common/Util';
import {ModalContent} from 'components/ModalComponent';
import {ReactNode, useCallback, useMemo, useRef, useState} from 'react';
import {Button} from 'reactstrap';
import toast from 'react-hot-toast';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {KeyboardControl, SetKeyboardControl} from 'components/KeyboardControl';
import {ImmutableRefObject, useDepsEffect} from 'common/ReactUtil';
import {DropdownItemCheckbox} from 'components/DropdownItemCheckbox';

export interface AppStore {
    readonly confirm: (body: ReactNode, header?: ReactNode) => Promise<boolean>;
    readonly enterPreventClose: () => void;
    readonly exitPreventClose: () => void;
    readonly indicateLoading: <T>(promise: Promise<T>) => Promise<T>;
    readonly setKeyboardControl: SetKeyboardControl;
    readonly modalContainerRef: ImmutableRefObject<HTMLDivElement | null>;
    readonly preventClose: <T>(promise: Promise<T>) => Promise<T>;
    readonly spellCheckDropdownItem: ReactNode;
    readonly toast: (message: string | JSX.Element) => void;
}

export function useAppStore(): {
    readonly appStore: AppStore;
    readonly isLoading: boolean;
    readonly keyboardControl: KeyboardControl | undefined;
    readonly modalContent: ModalContent | undefined;
    readonly spellCheck: boolean;
} {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [keyboardControl, setKeyboardControl] = useState<KeyboardControl>();
    const modalContainerRef = useRef<HTMLDivElement>(null);
    const [modalContent, setModalContent] = useState<ModalContent>();
    const preventCloseCounterRef = useRef(0);
    const [spellCheck, setSpellCheck] = useState<boolean>(true);

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

    return {
        appStore: useMemo<AppStore>(
            () => ({
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
                enterPreventClose,
                exitPreventClose,
                indicateLoading,
                setKeyboardControl,
                modalContainerRef,
                preventClose,
                spellCheckDropdownItem: (
                    <DropdownItemCheckbox checked={spellCheck} setChecked={setSpellCheck}>
                        Spell check
                    </DropdownItemCheckbox>
                ),
                toast,
            }),
            [enterPreventClose, exitPreventClose, indicateLoading, preventClose, spellCheck]
        ),
        isLoading,
        keyboardControl,
        modalContent,
        spellCheck,
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
