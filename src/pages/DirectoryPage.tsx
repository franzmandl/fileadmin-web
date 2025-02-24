import {useLatest, useDepsEffect, stopPropagationAndFocusNothing, focusNothing} from 'common/ReactUtil';
import {encodePath, getName, getParentPath, separator, paramsToHash} from 'common/Util';
import {Action, keyToAction} from 'components/Action';
import {DirectoryComponent} from 'components/inode/DirectoryComponent';
import {CompareParameterDropdown} from 'components/inode/CompareParameterDropdown';
import React, {memo, useRef, useState} from 'react';
import {Badge, Button, DropdownItem, Input, InputGroup} from 'reactstrap';
import useResizeObserver from '@react-hook/resize-observer';
import {MenuDropdown} from 'components/dropdown/MenuDropdown';
import {AppContext} from 'stores/AppContext';
import {KeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {KeyboardControlComponent} from 'components/keyboard-control/KeyboardControlComponent';
import {DirectoryPageContext} from './DirectoryPageContext';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {emptyInode, Inode} from 'dto/Inode';
import {SearchComponent} from 'components/inode/SearchComponent';
import {useDirectoryPageParameter} from './useDirectoryPageParameter';
import {TagModal, TagModalControl} from 'components/filter/TagModal';
import {hashWordRegex} from 'common/constants';
import {ActionDropdown} from 'components/inode/ActionDropdown';
import {InodeDropdown} from 'components/inode/InodeDropdown';
import './DirectoryPage.scss';

let linkElement: HTMLLinkElement | null = null;
const umlauts = Object.freeze<Record<string, string | undefined>>({
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
}): React.JSX.Element {
    const {appStore, authenticationStore, consoleStore, suggestionStore} = context;
    const {
        previousPath,
        values: {path, spellCheck},
    } = appStore.appParameter;
    const directoryPageParameter = useDirectoryPageParameter(appStore);
    const {
        values: {
            action,
            compareParameter,
            decentDirectory,
            decentFile,
            decentReadmeFile,
            decentRunLastFile,
            pageSize,
            showDateFrom,
            showDateTo,
            showHidden,
            showLastModified,
            showMimeType,
            showNotRepeating,
            showSize,
            showThumbnail,
            showWaiting,
        },
        setAction,
        setDecentDirectory,
        setDecentFile,
        setDecentReadmeFile,
        setDecentRunLastFile,
        setPageSize,
        setShowDateFrom,
        setShowDateTo,
        setShowHidden,
        setShowLastModified,
        setShowMimeType,
        setShowNotRepeating,
        setShowSize,
        setShowThumbnail,
        setShowWaiting,
        setSortAttributeAndAscending,
        setSortFoldersFirst,
        setSortPriority,
        setSortSpecialFirst,
        setSortTime,
        setSortTrim,
    } = directoryPageParameter;
    const [canSearch, setCanSearch] = useState<boolean>(false);
    const [inode, setInode] = useState<Inode>(emptyInode);
    const [size, setSize] = useState<number>();
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

    const handleAction = (ev: React.MouseEvent): void => {
        if (action !== Action.view) {
            consoleStore.logError('Cannot handle action: ' + action);
        }
        ev.stopPropagation();
    };

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
    const onScroll = (ev: React.UIEvent<HTMLDivElement>): void => {
        if (setIsReadyRef.current && watchHeightRef.current !== null) {
            const bounding = watchHeightRef.current.getBoundingClientRect();
            setMinHeight(Math.max(ev.currentTarget.offsetHeight - bounding.top, watchHeightRef.current.offsetHeight));
        }
    };
    const setIsReady = (value: boolean): void => {
        setIsReadyRef.current = value;
        if (value && previousPath !== undefined) {
            const previousElement = document.querySelector(`[data-path="${encodePath(previousPath)}"]`);
            if (previousElement !== null) {
                previousElement.scrollIntoView({block: 'center'});
                previousElement.classList.add('visited');
            }
        }
    };
    const onActionChange = (nextAction: Action): void => {
        focusNothing();
        setAction(nextAction);
        actionChangeListeners.current.forEach((listener) => listener(nextAction, action));
    };

    const onKeyDownRef = useLatest((ev: KeyboardEvent): boolean => {
        if (ev.target === document.body && !ev.ctrlKey) {
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
        const listener = (ev: KeyboardEvent): boolean => onKeyDownRef.current(ev);
        appStore.keyDownListeners.add(listener);
        return () => appStore.keyDownListeners.remove(listener);
    }, [appStore.keyDownListeners]);

    const suggestionControl = suggestionStore.createSuggestionControl(path, hashWordRegex);

    const [tagModalControl, setTagModalControl] = useState<TagModalControl>();

    const dropdownContainerRef = watchHeightRef;
    const pageContext: DirectoryPageContext = {
        actionChangeListeners: {
            add: (listener: (nextAction: Action, prevAction: Action) => void): void => void actionChangeListeners.current.add(listener),
            remove: (listener: (nextAction: Action, prevAction: Action) => void): void =>
                void actionChangeListeners.current.delete(listener),
        },
        appContext: context,
        directoryPageParameter,
        dropdownContainerRef,
        setTagModalControl,
    };

    return (
        <div className={`page page-auto action-${action}`}>
            <div className='page-main' onClick={handleAction} onScroll={onScroll}>
                <div style={{minHeight: `${minHeight}px`}}>
                    <div
                        ref={watchHeightRef}
                        // position-relative for dropdown container
                        className='position-relative'
                    >
                        <div className='directory-page-parent'>
                            <a
                                hidden={!(path.length > 1)}
                                href={paramsToHash(appStore.appParameter.getEncodedPath(getParentPath(path)))}
                                className='directory-page-parent-anchor d-block hoverable p-2 reboot text-center'
                                onClick={stopPropagationAndFocusNothing}
                            >
                                <span className='mdi mdi-subdirectory-arrow-right mdi-rotate-270' />
                            </a>
                            <div className='directory-page-parent-size'>
                                <Badge hidden={!(showSize && size !== undefined)} className='m-1' pill>
                                    {size}
                                </Badge>
                            </div>
                            <InodeDropdown
                                className='directory-page-parent-dropdown m-1'
                                container={dropdownContainerRef}
                                context={context}
                                createHref={(path: string): string => paramsToHash(appStore.appParameter.getEncodedPath(path))}
                                inode={inode}
                            />
                        </div>
                        <hr className='m-0' />
                        {canSearch && (
                            <SearchComponent
                                setPath={appStore.appParameter.pushPath}
                                setKeyboardControl={appStore.setKeyboardControl}
                                path={path}
                                spellCheck={spellCheck}
                                suggestionStore={suggestionStore}
                            />
                        )}
                        <DirectoryComponent
                            setCanSearch={setCanSearch}
                            context={pageContext}
                            decentDirectory={decentDirectory}
                            filterHighlightTags={inode.item?.result?.highlightTagSet}
                            inode={inode}
                            setInode={setInode}
                            isFirstLevel={true}
                            setIsReady={setIsReady}
                            onDirectoryChange={(directory): void => setSize(directory?.children.length)}
                            onMove={(inode): void => appStore.appParameter.replacePath(inode.path)}
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
                        onClick={(): void => onActionChange(Action.view)}
                    >
                        <span className='mdi mdi-eye' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='warning'
                        active={action === Action.edit}
                        onClick={(): void => onActionChange(Action.edit)}
                    >
                        <span className='mdi mdi-pencil' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='success'
                        active={action === Action.add}
                        onClick={(): void => onActionChange(Action.add)}
                    >
                        <span className='mdi mdi-plus' />
                    </Button>
                    <ActionDropdown action={action} className='page-sidebar-icon' onActionChange={onActionChange} />
                    <Button
                        className='page-sidebar-icon'
                        outline
                        color='danger'
                        active={action === Action.delete}
                        onClick={(): void => onActionChange(Action.delete)}
                    >
                        <span className='mdi mdi-trash-can' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        color='dark'
                        onPointerDown={(ev): void => {
                            ev.preventDefault();
                            const scrollElement = scrollToAboveScrollable(watchHeightRef.current ?? undefined);
                            if (scrollElement !== document.activeElement) {
                                // Most likely the active element is not a textarea and we want to blur any focused textareas.
                                focusNothing();
                            }
                        }}
                    >
                        <span className='mdi mdi-arrow-collapse-up' />
                    </Button>
                    <KeyboardControlComponent hidden={keyboardControl === undefined} keyboardControl={keyboardControl} />
                    <CompareParameterDropdown
                        className='page-sidebar-icon'
                        compareParameter={compareParameter}
                        hidden={keyboardControl !== undefined}
                        setAttributeAndAscending={setSortAttributeAndAscending}
                        setFoldersFirst={setSortFoldersFirst}
                        setPriority={setSortPriority}
                        setSpecialFirst={setSortSpecialFirst}
                        setTime={setSortTime}
                        setTrim={setSortTrim}
                    >
                        <DropdownItem text toggle={false}>
                            <InputGroup size='sm'>
                                <Input
                                    invalid={pageSize.string !== '' && pageSize.value === null}
                                    placeholder='Page Size'
                                    style={{width: '7rem'}}
                                    value={pageSize.string}
                                    onChange={(ev): void => setPageSize(ev.target.value)}
                                />
                            </InputGroup>
                        </DropdownItem>
                    </CompareParameterDropdown>
                    <MenuDropdown className='page-sidebar-icon' hidden={keyboardControl !== undefined}>
                        {appStore.nowDropdownItem}
                        <DropdownItem text toggle={false}>
                            <InputGroup size='sm'>
                                <Input
                                    bsSize='sm'
                                    invalid={showDateFrom.string !== '' && showDateFrom.date === null}
                                    placeholder='From'
                                    style={{width: '7rem'}}
                                    value={showDateFrom.string}
                                    onChange={(ev): void => setShowDateFrom(ev.target.value)}
                                />
                                <Button
                                    className='mdi mdi-close'
                                    disabled={showDateFrom.string === ''}
                                    onClick={(): void => setShowDateFrom('')}
                                />
                            </InputGroup>
                        </DropdownItem>
                        <DropdownItem text toggle={false}>
                            <InputGroup size='sm'>
                                <Input
                                    invalid={showDateTo.string !== '' && showDateTo.date === null}
                                    placeholder='To'
                                    style={{width: '7rem'}}
                                    value={showDateTo.string}
                                    onChange={(ev): void => setShowDateTo(ev.target.value)}
                                />
                                <Button
                                    className={'mdi ' + (showDateTo.string === '' ? 'mdi-calendar-today' : 'mdi-close')}
                                    onClick={(): void => setShowDateTo(showDateTo.string === '' ? '0d' : '')}
                                />
                            </InputGroup>
                        </DropdownItem>
                        <DropdownItemCheckbox checked={showHidden} setChecked={setShowHidden}>
                            Hidden
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={showNotRepeating} setChecked={setShowNotRepeating}>
                            Not Repeating
                        </DropdownItemCheckbox>
                        <DropdownItemCheckbox checked={showWaiting} setChecked={setShowWaiting}>
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
            <TagModal context={pageContext} control={tagModalControl} toggle={(): void => setTagModalControl(undefined)} />
        </div>
    );
}

export const DirectoryPageMemorized = memo(DirectoryPage);

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
