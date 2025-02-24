import {serverPath, constant, hashWordRegex} from 'common/constants';
import {focusNothing, useDepsEffect} from 'common/ReactUtil';
import {useDelayed} from 'common/useDelayed';
import {encodePath, getName} from 'common/Util';
import {MenuDropdown} from 'components/dropdown/MenuDropdown';
import React, {useState} from 'react';
import {Button} from 'reactstrap';
import {RichTextarea} from 'components/textarea/RichTextarea';
import {FileContent} from 'dto/FileContent';
import {AppContext} from 'stores/AppContext';
import {KeyboardControlComponent} from 'components/keyboard-control/KeyboardControlComponent';
import {KeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {SaveState} from 'components/file/SaveState';
import {createSaveIcon} from 'components/file/SaveIcon';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Inode} from 'dto/Inode';

interface State {
    readonly saved: SaveState;
    readonly content: FileContent;
}

export function FilePage({
    context,
    keyboardControl,
}: {
    readonly context: AppContext;
    readonly keyboardControl: KeyboardControl | undefined;
}): React.JSX.Element {
    const {appStore, authenticationStore, consoleStore, inodeStore, suggestionStore} = context;
    const {path} = appStore.appParameter.values;
    const [state, setState] = useState<State>({saved: SaveState.saved, content: {lastModifiedMilliseconds: 0, value: ''}});

    useDepsEffect(() => {
        document.title = `Edit ${getName(path)}`;
    }, [path]);

    const load = useAsyncCallback(
        () => appStore.indicateLoading(inodeStore.getFile(path)),
        (content) => setState({saved: SaveState.saved, content}),
        authenticationStore.handleAuthenticationError,
    );

    useDepsEffect(() => void load(), []);

    const {doDelayed: saveDelayed, doNow: saveNow} = useDelayed(
        appStore.enterPreventClose,
        useAsyncCallback(
            () => {
                setState(({content}) => ({content, saved: SaveState.saved}));
                return appStore.preventClose(inodeStore.putFile(path, state.content, undefined));
            },
            ({lastModifiedMilliseconds}: Inode) =>
                setState(({content, saved}) => ({content: {lastModifiedMilliseconds, value: content.value}, saved})),
            (error: unknown) => {
                setState(({content}) => ({content, saved: SaveState.failed}));
                consoleStore.handleError(error);
            },
            appStore.exitPreventClose,
        ),
        constant.saveTimeoutMs,
    );

    const saveNowIfUnsaved = (): void => {
        if (state.saved !== SaveState.saved) {
            saveNow();
        }
    };

    useDepsEffect(() => {
        if (state.saved === SaveState.waiting) {
            saveDelayed();
        }
    }, [state]);

    const suggestionControl = suggestionStore.createSuggestionControl(path, hashWordRegex);

    return (
        <div className='page page-auto'>
            <div className='page-main overflow-hidden'>
                <div className='sticky-top'>{createSaveIcon(state.saved)}</div>
                <RichTextarea
                    autoFocus
                    className='h-100'
                    onCtrlSKeyDown={(ev): void => {
                        ev.preventDefault();
                        saveNowIfUnsaved();
                    }}
                    setKeyboardControl={appStore.setKeyboardControl}
                    spellCheck={appStore.appParameter.values.spellCheck}
                    suggestionControl={suggestionControl}
                    textareaClassName='h-100 w-100 font-monospace ps-2'
                    value={state.content.value}
                    setValue={(value): void =>
                        setState((prev) => ({
                            saved: SaveState.waiting,
                            content: {lastModifiedMilliseconds: prev.content.lastModifiedMilliseconds, value},
                        }))
                    }
                />
            </div>
            <div className='page-sidebar'>
                <div>
                    <Button
                        className='page-sidebar-icon'
                        color='success'
                        onClick={(): void => {
                            focusNothing();
                            saveNowIfUnsaved();
                        }}
                    >
                        <span className='mdi mdi-content-save-outline' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        onClick={(): void => {
                            focusNothing();
                            load();
                        }}
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
                        {appStore.nowDropdownItem}
                        {appStore.spellCheckDropdownItem}
                        {consoleStore.showConsoleDropdownItem}
                        {authenticationStore.logoutDropdownItem}
                    </MenuDropdown>
                </div>
            </div>
        </div>
    );
}
