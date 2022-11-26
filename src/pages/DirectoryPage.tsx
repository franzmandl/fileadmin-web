import {Comparator} from 'common/Comparator';
import {useLatest, useDepsEffect} from 'common/ReactUtil';
import {encodePath, formatTimestamp, getBasename, getCurrentPath, getParentPath, separator, TimestampPrecision} from 'common/Util';
import {Action, keyToAction} from 'components/Action';
import {DirectoryComponent} from 'components/DirectoryComponent';
import {ComparatorDropdown} from 'components/ComparatorDropdown';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Button, DropdownItem, Input} from 'reactstrap';
import useResizeObserver from '@react-hook/resize-observer';
import {focusNothing} from 'common/ReactUtil';
import {constant, clientPath} from 'common/constants';
import {MenuDropdown} from 'components/MenuDropdown';
import {AppContext} from 'stores/AppContext';
import {KeyboardControl} from 'components/KeyboardControl';
import {KeyboardControlComponent} from 'components/KeyboardControlComponent';
import {DirectoryPageContext} from './DirectoryPageContext';
import {DropdownItemCheckbox} from 'components/DropdownItemCheckbox';
import {emptyInode, Inode} from 'model/Inode';

export function DirectoryPage({
    context,
    keyboardControl,
    spellCheck,
}: {
    readonly context: AppContext;
    readonly keyboardControl: KeyboardControl | undefined;
    readonly spellCheck: boolean;
}): JSX.Element {
    const {appStore, authenticationStore, consoleStore} = context;
    const [action, setAction] = useState<Action>(constant.action);
    const [comparator, setComparator] = useState<Comparator>(
        () => new Comparator(constant.sortAlphabetical, constant.sortAscending, constant.sortFoldersFirst, constant.sortSpecialFirst)
    );
    const [decentDirectory, setDecentDirectory] = useState<boolean>(constant.decentDirectory);
    const [decentFile, setDecentFile] = useState<boolean>(constant.decentFile);
    const [decentReadmeFile, setDecentReadmeFile] = useState<boolean>(constant.decentReadmeFile);
    const [inode, setInode] = useState<Inode>(emptyInode);
    const [path, setPath] = useState<string>(getCurrentPath());
    const [previousPath, setPreviousPath] = useState<string>();
    const [showAvailable, setShowAvailable] = useState<boolean>(constant.showAvailable);
    const [showHidden, setShowHidden] = useState<boolean>(constant.showHidden);
    const [showLastModified, setShowLastModified] = useState<boolean>(constant.showLastModified);
    const [showMimeType, setShowMimeType] = useState<boolean>(constant.showMimeType);
    const [showSize, setShowSize] = useState<boolean>(constant.showSize);
    const [showThumbnail, setShowThumbnail] = useState<boolean>(constant.showThumbnail);
    const [showWaiting, setShowWaiting] = useState<boolean>(constant.showWaiting);
    const [today, setToday] = useState<string>(formatTimestamp(constant.currentDate, TimestampPrecision.day));

    useDepsEffect(() => {
        document.title = `Directory ${getBasename(path) || separator}`;
    }, [path]);

    const goBack = useCallback((): void => {
        const parentPath = getParentPath(path);
        if (previousPath === parentPath) {
            window.history.back();
        } else {
            window.location = clientPath.inodes(encodePath(parentPath)) as any; // TypeScript fix.
        }
    }, [path, previousPath]);

    const onHashChangeRef = useLatest((): void => {
        setPreviousPath(path);
        setPath(getCurrentPath());
    });

    useDepsEffect(() => {
        const listener = () => onHashChangeRef.current();
        window.addEventListener('hashchange', listener);
        return () => window.removeEventListener('hashchange', listener);
    }, []);

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

    const onKeyDownRef = useLatest((ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
            if (ev.target === document.body) {
                setAction(Action.view);
            } else {
                focusNothing();
            }
        } else if (ev.target === document.body) {
            const nextAction = keyToAction[ev.key];
            if (nextAction !== undefined) {
                setAction(nextAction);
            }
        }
    });

    useDepsEffect(() => {
        const listener = (ev: KeyboardEvent) => onKeyDownRef.current(ev);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    const pageContext = useMemo<DirectoryPageContext>(
        () => ({
            action,
            appContext: context,
            comparator,
            decentFile,
            decentReadmeFile,
            dropdownContainerRef: watchHeightRef,
            showAvailable,
            showHidden,
            showLastModified,
            showMimeType,
            showSize,
            showThumbnail,
            showWaiting,
            today,
        }),
        [
            action,
            comparator,
            context,
            decentFile,
            decentReadmeFile,
            showAvailable,
            showHidden,
            showLastModified,
            showMimeType,
            showSize,
            showThumbnail,
            showWaiting,
            today,
        ]
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
                            <div
                                onClick={useCallback(
                                    (ev: React.MouseEvent) => {
                                        ev.stopPropagation();
                                        goBack();
                                    },
                                    [goBack]
                                )}
                                className='hoverable p-2 text-center'
                            >
                                <span className='mdi mdi-subdirectory-arrow-right mdi-rotate-270' />
                            </div>
                            <hr className='m-0' />
                        </div>
                        <DirectoryComponent
                            context={pageContext}
                            decentDirectory={decentDirectory}
                            inode={inode}
                            isFirstLevel={true}
                            setInode={setInode}
                            setIsReady={setIsReady}
                            path={path}
                            spellCheck={spellCheck}
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
                        onClick={useCallback(() => {
                            focusNothing();
                            setAction(Action.view);
                        }, [])}
                    >
                        <span className='mdi mdi-eye' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='warning'
                        active={action === Action.edit}
                        onClick={useCallback(() => {
                            focusNothing();
                            setAction(Action.edit);
                        }, [])}
                    >
                        <span className='mdi mdi-pencil' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        active={action === Action.reload}
                        onClick={useCallback(() => {
                            focusNothing();
                            setAction(Action.reload);
                        }, [])}
                    >
                        <span className='mdi mdi-refresh' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='success'
                        active={action === Action.add}
                        onClick={useCallback(() => {
                            focusNothing();
                            setAction(Action.add);
                        }, [])}
                    >
                        <span className='mdi mdi-plus' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='danger'
                        active={action === Action.delete}
                        onClick={useCallback(() => {
                            focusNothing();
                            setAction(Action.delete);
                        }, [])}
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
                        setComparator={setComparator}
                        hidden={keyboardControl !== undefined}
                    />
                    <MenuDropdown className='page-sidebar-icon' hidden={keyboardControl !== undefined}>
                        <DropdownItemCheckbox checked={showAvailable} setChecked={setShowAvailable}>
                            Available
                        </DropdownItemCheckbox>
                        <DropdownItem hidden={!showAvailable} text toggle={false}>
                            <Input
                                bsSize='sm'
                                placeholder='Today'
                                style={{width: '7.7rem'}}
                                value={today}
                                onChange={useCallback((ev: React.ChangeEvent<HTMLInputElement>) => setToday(ev.target.value), [])}
                            />
                        </DropdownItem>
                        <DropdownItemCheckbox checked={showHidden} setChecked={setShowHidden}>
                            Hidden
                        </DropdownItemCheckbox>
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
                        <DropdownItemCheckbox checked={showWaiting} setChecked={setShowWaiting}>
                            Waiting
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
