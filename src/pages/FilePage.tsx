import {serverPath, constant} from 'common/constants';
import {useDepsEffect} from 'common/ReactUtil';
import {useDelayed} from 'common/useDelayed';
import {encodePath, getBasename} from 'common/Util';
import {MenuDropdown} from 'components/MenuDropdown';
import React, {useCallback, useState} from 'react';
import {Button} from 'reactstrap';
import {EnhancedTextarea} from 'components/EnhancedTextarea';
import {FileContent} from 'model/FileContent';
import {focusNothing} from 'common/ReactUtil';
import {AppContext} from 'stores/AppContext';
import {KeyboardControlComponent} from 'components/KeyboardControlComponent';
import {KeyboardControl} from 'components/KeyboardControl';
import {SaveState} from 'components/SaveState';
import {createSaveIcon} from 'components/SaveIcon';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Inode} from 'model/Inode';

interface State {
    readonly saved: SaveState;
    readonly content: FileContent;
}

export function FilePage({
    context,
    keyboardControl,
    path,
    spellCheck,
}: {
    readonly context: AppContext;
    readonly keyboardControl: KeyboardControl | undefined;
    readonly path: string;
    readonly spellCheck: boolean;
}): JSX.Element {
    const {appStore, authenticationStore, consoleStore, inodeStore} = context;
    const [state, setState] = useState<State>({saved: SaveState.saved, content: {lastModified: 0, value: ''}});

    useDepsEffect(() => {
        document.title = `Edit ${getBasename(path)}`;
    }, [path]);

    const load = useAsyncCallback(
        () => appStore.indicateLoading(inodeStore.getFile(path)),
        (content) => setState({saved: SaveState.saved, content}),
        authenticationStore.handleAuthenticationError
    );

    useDepsEffect(() => void load(), []);

    const {doDelayed: saveDelayed, doNow: saveNow} = useDelayed(
        appStore.enterPreventClose,
        useAsyncCallback(
            () => {
                setState(({content}) => ({content, saved: SaveState.saved}));
                return appStore.preventClose(inodeStore.putFile(path, state.content));
            },
            ({lastModified}: Inode) => setState(({content, saved}) => ({content: {lastModified, value: content.value}, saved})),
            (error: unknown) => {
                setState(({content}) => ({content, saved: SaveState.failed}));
                consoleStore.handleError(error);
            },
            appStore.exitPreventClose
        ),
        constant.saveTimeoutMs
    );

    const saveNowIfUnsaved = useCallback(() => {
        if (state.saved !== SaveState.saved) {
            saveNow();
        }
    }, [state.saved, saveNow]);

    useDepsEffect(() => {
        if (state.saved === SaveState.waiting) {
            saveDelayed();
        }
    }, [state]);

    return (
        <div className='page page-auto'>
            <div className='page-main overflow-hidden'>
                <div className='sticky-top'>{createSaveIcon(state.saved)}</div>
                <EnhancedTextarea
                    autoFocus
                    className='h-100 w-100 font-monospace ps-2'
                    onCtrlSKeyDown={useCallback(
                        (ev: React.SyntheticEvent) => {
                            ev.preventDefault();
                            saveNowIfUnsaved();
                        },
                        [saveNowIfUnsaved]
                    )}
                    setKeyboardControl={appStore.setKeyboardControl}
                    spellCheck={spellCheck}
                    value={state.content.value}
                    setValue={useCallback(
                        (value) =>
                            setState((prev) => ({saved: SaveState.waiting, content: {lastModified: prev.content.lastModified, value}})),
                        []
                    )}
                />
            </div>
            <div className='page-sidebar'>
                <div>
                    <Button
                        className='page-sidebar-icon'
                        color='success'
                        onClick={useCallback(() => {
                            focusNothing();
                            saveNowIfUnsaved();
                        }, [saveNowIfUnsaved])}
                    >
                        <span className='mdi mdi-content-save-outline' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        onClick={useCallback(() => {
                            focusNothing();
                            load();
                        }, [load])}
                    >
                        <span className='mdi mdi-refresh' />
                    </Button>
                    <a
                        className='page-sidebar-icon btn btn-secondary'
                        href={serverPath.authenticatedPath.file(encodePath(path))}
                        role='button'
                        target='_blank'
                        rel='noreferrer'
                        onClick={focusNothing}
                    >
                        <span className='mdi mdi-download' />
                    </a>
                    <KeyboardControlComponent keyboardControl={keyboardControl} />
                    <MenuDropdown className='page-sidebar-icon'>
                        {appStore.spellCheckDropdownItem}
                        {consoleStore.showConsoleDropdownItem}
                        {authenticationStore.logoutDropdownItem}
                    </MenuDropdown>
                </div>
            </div>
        </div>
    );
}
