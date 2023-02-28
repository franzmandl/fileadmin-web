import {useLatest, useDepsEffect, stopPropagationAndFocusNothing, focusNothing} from 'common/ReactUtil';
import {encodePath, getName, getParentPath, separator, noop, paramsToHash} from 'common/Util';
import {Action, keyToAction} from 'components/Action';
import {DirectoryComponent} from 'components/inode/DirectoryComponent';
import {ComparatorDropdown} from 'components/inode/ComparatorDropdown';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Button, DropdownItem, Input} from 'reactstrap';
import useResizeObserver from '@react-hook/resize-observer';
import {MenuDropdown} from 'components/dropdown/MenuDropdown';
import {AppContext} from 'stores/AppContext';
import {KeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {KeyboardControlComponent} from 'components/keyboard-control/KeyboardControlComponent';
import {DirectoryPageContext} from './DirectoryPageContext';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {emptyInode, Inode} from 'model/Inode';
import {SearchComponent} from 'components/inode/SearchComponent';
import {useDirectoryPageParameter} from './useDirectoryPageParameter';
import {Comparator} from 'common/Comparator';

let linkElement: HTMLLinkElement | null = null;
const umlauts = Object.freeze<Record<string, string>>({
    ä: 'a',
    ö: 'o',
    ü: 'u',
});

export function DirectoryPage({
    context,
    keyboardControl,
}: {
    readonly context: AppContext;
    readonly keyboardControl: KeyboardControl | undefined;
}): JSX.Element {
    const {appStore, authenticationStore, consoleStore, suggestionStore} = context;
    const directoryPageParameter = useDirectoryPageParameter(
        appStore.appParameter.encoded,
        appStore.currentParams,
        appStore.setCurrentParams
    );
    const {
        previousPath,
        values: {
            action,
            decentDirectory,
            decentFile,
            decentReadmeFile,
            decentRunLastFile,
            path,
            showHidden,
            showLastModified,
            showMimeType,
            showNotRepeating,
            showSize,
            showThumbnail,
            showUnavailable,
            showWaiting,
            sortAlphabetical,
            sortAscending,
            sortFoldersFirst,
            sortPriority,
            sortSpecialFirst,
            today,
        },
        setAction,
        setDecentDirectory,
        setDecentFile,
        setDecentReadmeFile,
        setDecentRunLastFile,
        setShowHidden,
        setShowLastModified,
        setShowMimeType,
        setShowNotRepeating,
        setShowSize,
        setShowThumbnail,
        setShowUnavailable,
        setShowWaiting,
        setSortAlphabeticalAndAscending,
        setSortFoldersFirst,
        setSortPriority,
        setSortSpecialFirst,
        setToday,
    } = directoryPageParameter;
    const comparator = useMemo(
        () => new Comparator(sortAlphabetical, sortAscending, sortFoldersFirst, sortPriority, sortSpecialFirst),
        [sortAlphabetical, sortAscending, sortFoldersFirst, sortPriority, sortSpecialFirst]
    );
    const [canSearch, setCanSearch] = useState<boolean>(false);
    const [inode, setInode] = useState<Inode>(emptyInode);
    const actionChangeListeners = useRef<Set<(nextAction: Action, prevAction: Action) => void>>(new Set());

    useDepsEffect(() => {
        linkElement = linkElement ?? document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (linkElement !== null) {
            const parts = path.split(separator);
            let icon = '/favicon';
            let index = parts.length - 1;
            while (index >= 0) {
                const first = parts[index].charAt(0).toLowerCase();
                if (/[a-z]/.test(first)) {
                    icon = '/icons/alpha-' + first;
                    break;
                }
                const found = umlauts[first];
                if (found !== undefined) {
                    icon = '/icons/alpha-' + found;
                    break;
                }
                index--;
            }
            linkElement.href = process.env.PUBLIC_URL + icon + '.ico';
        }
        document.title = `Directory ${getName(path) || separator}`;
    }, [path]);

    const handleAction = useCallback(
        (ev: React.MouseEvent) => {
            if (action !== Action.view) {
                consoleStore.logError('Cannot handle action: ' + action);
            }
            ev.stopPropagation();
        },
        [action, consoleStore]
    );

    const setIsReadyRef = useRef(false);
    const [minHeight, setMinHeight] = useState<number>(0);
    const watchHeightRef = useRef<HTMLDivElement>(null);
    useDepsEffect(() => {
        watchHeightRef.current?.scrollIntoView();
        setMinHeight(0);
    }, [path]);
    useResizeObserver(watchHeightRef, (entry) => {
        if (setIsReadyRef.current) {
            setMinHeight((prev) => Math.max(prev, entry.contentRect.height));
        }
    });
    const onScroll = useCallback((ev: React.UIEvent<HTMLDivElement>) => {
        if (setIsReadyRef.current && watchHeightRef.current !== null) {
            const bounding = watchHeightRef.current.getBoundingClientRect();
            setMinHeight(Math.max(ev.currentTarget.offsetHeight - bounding.top, watchHeightRef.current.offsetHeight));
        }
    }, []);
    const setIsReady = useCallback(
        (value: boolean) => {
            setIsReadyRef.current = value;
            if (value && previousPath !== undefined) {
                const previousElement = document.querySelector(`[data-path="${encodePath(previousPath)}"]`);
                if (previousElement !== null) {
                    previousElement.scrollIntoView({block: 'center'});
                    previousElement.classList.add('visited');
                }
            }
        },
        [previousPath]
    );
    const onActionChange = useCallback(
        (nextAction: Action) => {
            focusNothing();
            setAction(nextAction);
            actionChangeListeners.current.forEach((listener) => listener(nextAction, action));
        },
        [action, setAction]
    );

    const onKeyDownRef = useLatest((ev: KeyboardEvent): boolean => {
        if (ev.target === document.body) {
            const nextAction = keyToAction[ev.key];
            if (nextAction !== undefined) {
                onActionChange(nextAction);
                return true;
            }
        } else if (ev.key === 'Escape') {
            focusNothing();
            return true;
        }
        return false;
    });

    useDepsEffect(() => {
        const listener = (ev: KeyboardEvent) => onKeyDownRef.current(ev);
        appStore.keyDownListeners.add(listener);
        return () => appStore.keyDownListeners.remove(listener);
    }, [appStore.keyDownListeners]);

    const suggestionControl = useMemo(() => suggestionStore.createSuggestionControl(path), [path, suggestionStore]);

    const pageContext = useMemo<DirectoryPageContext>(
        () => ({
            actionChangeListeners: {
                add: (listener: (nextAction: Action, prevAction: Action) => void) => noop(actionChangeListeners.current.add(listener)),
                remove: (listener: (nextAction: Action, prevAction: Action) => void) =>
                    noop(actionChangeListeners.current.delete(listener)),
            },
            appContext: context,
            comparator,
            directoryPageParameter,
            dropdownContainerRef: watchHeightRef,
        }),
        [comparator, context, directoryPageParameter]
    );

    return (
        <div className={`page page-auto action-${action}`}>
            <div className='page-main' onClick={handleAction} onScroll={onScroll}>
                <div style={{minHeight: `${minHeight}px`}}>
                    <div
                        ref={watchHeightRef}
                        // position-relative for dropdown container
                        className='position-relative'
                    >
                        <div hidden={!(path.length > 1)}>
                            <a
                                href={paramsToHash(directoryPageParameter.getEncodedPath(getParentPath(path)))}
                                className='d-block hoverable p-2 reboot text-center'
                                onClick={stopPropagationAndFocusNothing}
                            >
                                <span className='mdi mdi-subdirectory-arrow-right mdi-rotate-270' />
                            </a>
                            <hr className='m-0' />
                        </div>
                        {canSearch && (
                            <SearchComponent
                                setPath={directoryPageParameter.setPath}
                                setKeyboardControl={appStore.setKeyboardControl}
                                path={path}
                                spellCheck={appStore.appParameter.values.spellCheck}
                                suggestionControl={suggestionControl}
                            />
                        )}
                        <DirectoryComponent
                            setCanSearch={setCanSearch}
                            context={pageContext}
                            decentDirectory={decentDirectory}
                            inode={inode}
                            isFirstLevel={true}
                            setInode={setInode}
                            setIsReady={setIsReady}
                            path={path}
                            suggestionControl={suggestionControl}
                        />
                        <hr className='m-0' />
                        <div style={{height: '30vh'}} />
                    </div>
                </div>
            </div>
            <div className='page-sidebar'>
                <div>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='primary'
                        active={action === Action.view}
                        onClick={useCallback(() => onActionChange(Action.view), [onActionChange])}
                    >
                        <span className='mdi mdi-eye' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='warning'
                        active={action === Action.edit}
                        onClick={useCallback(() => onActionChange(Action.edit), [onActionChange])}
                    >
                        <span className='mdi mdi-pencil' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        active={action === Action.reload}
                        onClick={useCallback(() => onActionChange(Action.reload), [onActionChange])}
                    >
                        <span className='mdi mdi-refresh' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='success'
                        active={action === Action.add}
                        onClick={useCallback(() => onActionChange(Action.add), [onActionChange])}
                    >
                        <span className='mdi mdi-plus' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='danger'
                        active={action === Action.delete}
                        onClick={useCallback(() => onActionChange(Action.delete), [onActionChange])}
                    >
                        <span className='mdi mdi-trash-can' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        color='dark'
                        onPointerDown={useCallback((ev: React.SyntheticEvent) => {
                            ev.preventDefault();
                            const scrollElement = scrollToAboveScrollable(watchHeightRef.current ?? undefined);
                            if (scrollElement !== document.activeElement) {
                                // Most likely the active element is not a textarea and we want to blur any focused textareas.
                                focusNothing();
                            }
                        }, [])}
                    >
                        <span className='mdi mdi-arrow-collapse-up' />
                    </Button>
                    <KeyboardControlComponent hidden={keyboardControl === undefined} keyboardControl={keyboardControl} />
                    <ComparatorDropdown
                        className='page-sidebar-icon'
                        comparator={comparator}
                        hidden={keyboardControl !== undefined}
                        setSortAlphabeticalAndAscending={setSortAlphabeticalAndAscending}
                        setSortFoldersFirst={setSortFoldersFirst}
                        setSortPriority={setSortPriority}
                        setSortSpecialFirst={setSortSpecialFirst}
                    />
                    <MenuDropdown className='page-sidebar-icon' hidden={keyboardControl !== undefined}>
                        <DropdownItemCheckbox checked={showUnavailable} setChecked={setShowUnavailable}>
                            Unavailable
                        </DropdownItemCheckbox>
                        <DropdownItem hidden={showUnavailable} text toggle={false}>
                            <Input
                                bsSize='sm'
                                placeholder='Today'
                                style={{width: '7.7rem'}}
                                value={today}
                                onChange={useCallback((ev: React.ChangeEvent<HTMLInputElement>) => setToday(ev.target.value), [setToday])}
                            />
                        </DropdownItem>
                        <DropdownItemCheckbox checked={showHidden} setChecked={setShowHidden}>
                            Hidden
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={showNotRepeating} setChecked={setShowNotRepeating}>
                            Not Repeating
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox hidden={showUnavailable} checked={showWaiting} setChecked={setShowWaiting}>
                            Waiting
                        </DropdownItemCheckbox>
                        <DropdownItem divider />
                        <DropdownItemCheckbox checked={showLastModified} setChecked={setShowLastModified}>
                            Last Modified
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={showMimeType} setChecked={setShowMimeType}>
                            Mime Type
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={showSize} setChecked={setShowSize}>
                            Size
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={showThumbnail} setChecked={setShowThumbnail}>
                            Thumbnails
                        </DropdownItemCheckbox>
                        <DropdownItem divider />
                        <DropdownItemCheckbox checked={decentDirectory} setChecked={setDecentDirectory}>
                            Decent <span className='mdi mdi-folder-outline' />
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={decentFile} setChecked={setDecentFile}>
                            Decent <span className='mdi mdi-file-outline' />
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={decentReadmeFile} setChecked={setDecentReadmeFile}>
                            Readme
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={decentRunLastFile} setChecked={setDecentRunLastFile}>
                            Run Last
                        </DropdownItemCheckbox>
                        <DropdownItem divider />
                        {appStore.spellCheckDropdownItem}
                        {consoleStore.showConsoleDropdownItem}
                        {authenticationStore.logoutDropdownItem}
                    </MenuDropdown>
                </div>
            </div>
        </div>
    );
}

function scrollToAboveScrollable(topElement: Element | undefined): Element | undefined {
    const scrollables = document.querySelectorAll('[data-scrollable=true], [data-scrollable=focus]:focus');
    let scrollElement = topElement;
    for (const scrollable of scrollables) {
        const bounding = scrollable.getBoundingClientRect();
        // see https://awik.io/check-if-element-is-inside-viewport-with-javascript/
        // -5 because 0 causes problems on mobile devices.
        if (bounding.top >= -5) {
            break;
        } else {
            scrollElement = scrollable;
        }
    }
    scrollElement?.scrollIntoView();
    return scrollElement;
}
