import React, {Dispatch, Fragment, ReactNode, useCallback, useMemo, useRef, useState} from 'react';
import {Badge, Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from 'reactstrap';
import {Inode, formatSize, isReadmeFile} from '../model/Inode';
import {
    noop,
    breakSpecialCharacters,
    encodePath,
    formatTimestamp,
    isAnyType,
    newLine,
    separator,
    TimestampPrecision,
    Type,
} from '../common/Util';
import {FileComponent} from './text/FileComponent';
import {DirectoryComponent} from './DirectoryComponent';
import {Action} from './Action';
import {focusNothing, stopPropagation, stopPropagationAndFocusNothing, useDepsEffect, useDepsLayoutEffect} from 'common/ReactUtil';
import {TicketDropdownItems} from './TicketDropdownItems';
import {serverPath, clientPath} from 'common/constants';
import {MoveInodeComponent} from './MoveInodeComponent';
import {CheckboxInput} from './text/CheckboxInput';
import {Settings} from 'model/Settings';
import {TriggerableAction} from 'common/TriggerableAction';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {ShareModal} from './ShareModal';
import {UploadDropdownItem} from './UploadDropdownItem';
import {useAsyncCallback} from 'common/useAsyncCallback';
import './InodeComponent.scss';
import classNames from 'classnames';

export interface InodeMeta {
    readonly showContent: boolean;
}

export interface InodeComponentProps {
    readonly basenameCursorPosition: number;
    readonly context: DirectoryPageContext;
    readonly decentDirectory: boolean;
    readonly inode: Inode;
    readonly isFirstLevel: boolean;
    readonly meta: InodeMeta;
    readonly parentDir: string;
    readonly settings: Settings;
    readonly spellCheck: boolean;
}

export function InodeComponent({
    basenameCursorPosition,
    context,
    decentDirectory,
    handleAddAction,
    inode,
    setInode,
    isFirstLevel,
    meta,
    onMove,
    onRemove,
    openGallery,
    parentDir,
    settings,
    spellCheck,
}: {
    readonly handleAddAction: (handled: () => void) => void;
    readonly setInode: (newInode: Inode) => void;
    readonly onMove: (newInode: Inode) => void;
    readonly onRemove: () => void;
    readonly openGallery: () => void;
} & InodeComponentProps): JSX.Element {
    const {
        action,
        appContext: {appStore, audioPlayerStore, consoleStore, inodeStore},
        decentFile,
        decentReadmeFile,
        dropdownContainerRef,
        showAvailable,
        showHidden,
        showLastModified,
        showMimeType,
        showSize,
        showThumbnail,
        showWaiting,
        today,
    } = context;
    const encodedPath = encodePath(inode.path);

    const isVisible = useMemo((): boolean => {
        let result = true;
        if (result && !showHidden) {
            result = !inode.basename.startsWith('.');
        }
        if (result && showAvailable && inode.ticket) {
            result = inode.ticket.date.localeCompare(today) <= 0 || (inode.ticket.isWaiting && showWaiting);
        }
        return result;
    }, [inode.basename, inode.ticket, showAvailable, showHidden, showWaiting, today]);

    const smallInfo = useMemo((): string => {
        const firstWildcardIndex = parentDir.indexOf('*');
        const afterWildcardLength = parentDir.length - parentDir.lastIndexOf('*') - 1;
        return inode.path.substring(firstWildcardIndex, inode.dirname.length - afterWildcardLength + 1);
    }, [inode.dirname.length, inode.path, parentDir]);

    const move = useAsyncCallback(
        (relativeDestination: string) => appStore.indicateLoading(appStore.preventClose(inodeStore.move(inode, relativeDestination))),
        (newInode, _, onSuccess?: () => void) => {
            onMove(newInode);
            onSuccess?.();
        },
        consoleStore.handleError
    );

    const remove = useAsyncCallback<boolean, [], void>(
        () =>
            appStore.confirm(
                <>
                    Removing inode: <pre className='overflow-auto'>{inode.basename}</pre>
                </>
            ),
        (value) => (value ? removeImmediately() : undefined),
        consoleStore.handleError
    );
    const removeImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.remove(inode))),
        onRemove,
        consoleStore.handleError
    );

    const checkShowContent = useAsyncCallback(
        () => (checkShowContentSize(inode) ? true : appStore.confirm(<>Inode is very big. Do you want to continue?</>)),
        (value) =>
            value
                ? checkShowContentType(inode)
                    ? true
                    : appStore.confirm(<>Inode is neither a directory nor a text file. Do you want to continue?</>)
                : false,
        (error) => {
            consoleStore.handleError(error);
            return false;
        }
    );

    const [showContent, setShowContentDangerous] = useState<boolean>(false);
    useDepsEffect(
        () =>
            setShowContentDangerous(
                meta.showContent ||
                    (inode.canWrite &&
                        ((decentDirectory && inode.isDirectory) ||
                            (decentFile && inode.isFile) ||
                            (decentReadmeFile && !isFirstLevel && isReadmeFile(inode))) &&
                        checkShowContentSize(inode) &&
                        checkShowContentType(inode))
            ),
        [decentDirectory, decentFile, decentReadmeFile]
    );

    const setShowContentFalse = useCallback(() => setShowContentDangerous(false), []);
    const asyncSetShowContentTrue = useAsyncCallback(
        () => (showContent ? false : checkShowContent()),
        (value) => (value ? setShowContentDangerous(true) : undefined),
        consoleStore.handleError
    );

    const asyncToggleShowContent = useCallback(
        (): Promise<void> => (showContent ? Promise.resolve(setShowContentFalse()) : asyncSetShowContentTrue()),
        [asyncSetShowContentTrue, setShowContentFalse, showContent]
    );

    const [isEdit, setIsEdit] = useState<boolean>(false);
    useDepsEffect(() => setIsEdit((prev) => action === Action.edit && prev), [action]);

    const loadInode = useAsyncCallback(() => appStore.indicateLoading(inodeStore.getInode(inode.path)), setInode, consoleStore.handleError);
    const handleAction = useCallback(
        (ev: React.MouseEvent) => {
            if (action === Action.view) {
                if (!inode.canRead) {
                    consoleStore.logError('Insufficient permissions.');
                } else if (inode.isFile) {
                    if (isAnyType(inode.type, Type.audio)) {
                        audioPlayerStore.enqueue(inode);
                    } else if (isAnyType(inode.type, Type.image)) {
                        openGallery();
                    } else if (isAnyType(inode.type, Type.media, Type.pdf)) {
                        window.open(serverPath.authenticatedPath.file(encodedPath), '_blank');
                    } else {
                        asyncToggleShowContent();
                    }
                } else {
                    asyncToggleShowContent();
                }
                ev.stopPropagation();
            } else if (action === Action.edit) {
                if (isEdit) {
                    setIsEdit(false);
                } else {
                    setIsEdit(true);
                    setNewBasenameCursorPosition(basenameCursorPosition);
                }
                ev.stopPropagation();
            } else if (action === Action.reload) {
                if (showContent) {
                    contentRef.current?.triggerAction(Action.reload, () => ev.stopPropagation());
                } else {
                    loadInode();
                    ev.stopPropagation();
                }
            } else if (action === Action.add && inode.canWrite) {
                if (showContent) {
                    contentRef.current?.triggerAction(Action.add, () => ev.stopPropagation());
                } else {
                    handleAddAction(() => ev.stopPropagation());
                }
            } else if (action === Action.delete) {
                remove();
                ev.stopPropagation();
            }
        },
        [
            action,
            inode,
            consoleStore,
            audioPlayerStore,
            openGallery,
            encodedPath,
            asyncToggleShowContent,
            isEdit,
            basenameCursorPosition,
            showContent,
            loadInode,
            handleAddAction,
            remove,
        ]
    );

    const [newBasename, setNewBasename] = useState<string>(inode.basename);
    useDepsEffect(() => setNewBasename(inode.basename), [inode.basename]);
    const [newBasenameCursorPosition, setNewBasenameCursorPosition] = useState<number | undefined>(basenameCursorPosition);
    // See AddInodeComponent why a layout effect is required.
    useDepsLayoutEffect(() => setNewBasenameCursorPosition(basenameCursorPosition), [basenameCursorPosition]);

    const moveToNewBasename = useCallback(() => {
        if (newBasename !== inode.basename) {
            move(newBasename);
        }
        setIsEdit(false);
    }, [inode.basename, move, newBasename]);

    const doneRunLast = useAsyncCallback(
        () =>
            appStore.indicateLoading(
                appStore.preventClose(
                    inodeStore.putFile(inode.path, {
                        lastModified: inode.lastModified,
                        value: formatTimestamp(new Date(), TimestampPrecision.minute) + newLine,
                    })
                )
            ),
        (newInode) => {
            setInode(newInode);
            contentRef.current?.triggerAction(Action.reload, noop);
        },
        consoleStore.handleError
    );

    const contentRef = useRef<TriggerableAction>(null);
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const toggleShowShareModal = useCallback(() => setShowShareModal((prev) => !prev), []);

    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const toggleShowDropdown = useCallback(() => setShowDropdown((prev) => !prev), []);

    const setInodeAndCloseContent = useCallback(
        (newInode: Inode) => {
            setInode(newInode);
            setShowContentFalse();
        },
        [setInode, setShowContentFalse]
    );

    const basenameClassName = !inode.canRead ? 'text-muted' : '';
    return (
        <div className='inode-component' data-scrollable={isVisible} hidden={!isVisible}>
            <div className='hoverable clearfix overflow-ellipsis' data-path={encodedPath} onClick={handleAction}>
                {isEdit && (
                    <MoveInodeComponent
                        setKeyboardControl={appStore.setKeyboardControl}
                        newBasename={newBasename}
                        setNewBasename={setNewBasename}
                        newBasenameCursorPosition={newBasenameCursorPosition}
                        setNewBasenameCursorPosition={setNewBasenameCursorPosition}
                        moveToNewBasename={moveToNewBasename}
                        oldBasename={inode.basename}
                        spellCheck={spellCheck}
                    />
                )}
                {showThumbnail && isAnyType(inode.type, Type.image) ? (
                    <div className='thumbnail float-start me-1'>
                        <img src={serverPath.authenticatedPath.thumbnail(encodedPath, 100)} alt='thumbnail' />
                    </div>
                ) : (
                    <a
                        className={classNames('m-1 btn btn-secondary mdi', getIconClassName(inode, showContent), {
                            disabled: inode.isFile || !inode.canRead,
                        })}
                        href={clientPath.inodes(encodedPath)}
                        role='button'
                        onClick={stopPropagationAndFocusNothing}
                    />
                )}
                {inode.friendlyName !== null ? (
                    <i className={basenameClassName}>{breakSpecialCharacters(inode.friendlyName)}</i>
                ) : (
                    <span className={basenameClassName}>{parseCheckbox(inode.basename, move, action !== Action.view)}</span>
                )}
                <small className='text-muted m-1'>{smallInfo}</small>
                <small className='text-danger m-1'>{inode.error}</small>
                <Dropdown
                    className='float-end m-1'
                    direction='start'
                    isOpen={showDropdown}
                    onClick={stopPropagation}
                    toggle={toggleShowDropdown}
                >
                    <DropdownToggle className='mdi mdi-dots-vertical' onClick={focusNothing} />
                    <DropdownMenu container={dropdownContainerRef} dark>
                        <DropdownItem
                            disabled={!inode.canWrite}
                            hidden={!inode.isFile}
                            href={clientPath.edit(encodedPath)}
                            target='_blank'
                            rel='noreferrer'
                        >
                            <span className='mdi mdi-pencil' /> Edit
                        </DropdownItem>
                        <DropdownItem disabled={!inode.canRead} href={clientPath.inodes(encodedPath)}>
                            <span className='mdi mdi-arrow-expand-all' /> Go to
                        </DropdownItem>
                        <DropdownItem
                            disabled={!inode.canRead}
                            hidden={!inode.isFile}
                            href={serverPath.authenticatedPath.file(encodedPath)}
                            target='_blank'
                            rel='noreferrer'
                        >
                            <span className='mdi mdi-download' /> Download
                        </DropdownItem>
                        <UploadDropdownItem
                            context={context.appContext}
                            inode={inode}
                            setInode={setInodeAndCloseContent}
                            setShowDropdown={setShowDropdown}
                        >
                            <span className='mdi mdi-upload' /> Upload
                        </UploadDropdownItem>
                        <UploadDropdownItem
                            accept='image/*;capture=camera'
                            context={context.appContext}
                            inode={inode}
                            setInode={setInodeAndCloseContent}
                            setShowDropdown={setShowDropdown}
                        >
                            <span className='mdi mdi-camera' /> Photo
                        </UploadDropdownItem>
                        <DropdownItem
                            disabled={!inode.canRead}
                            hidden={!inode.isFile}
                            onClick={useCallback(() => setShowShareModal(true), [])}
                        >
                            <span className='mdi mdi-share-variant' /> Share
                        </DropdownItem>
                        <DropdownItem onClick={remove}>
                            <span className='mdi mdi-trash-can' /> Remove
                        </DropdownItem>
                        <DropdownItem hidden={inode.target === null} href={clientPath.inodes(encodePath(separator + inode.realDirname))}>
                            <span className='mdi mdi-folder-outline' /> Show Target
                        </DropdownItem>
                        {inode.ticket !== null && (
                            <TicketDropdownItems context={context.appContext} inode={inode} move={move} ticket={inode.ticket} />
                        )}
                    </DropdownMenu>
                </Dropdown>
                <Button
                    disabled={!inode.canWrite}
                    hidden={!(settings.isRunLast && inode.isFile)}
                    className='float-end m-1'
                    color='success'
                    onClick={useCallback(
                        (ev: React.MouseEvent) => {
                            ev.stopPropagation();
                            focusNothing();
                            doneRunLast();
                        },
                        [doneRunLast]
                    )}
                >
                    Done
                </Button>
                {inode.lastModified && (
                    <small hidden={!showLastModified} className='float-end m-1'>
                        {formatTimestamp(inode.lastModified, TimestampPrecision.minute)}
                    </small>
                )}
                <Badge hidden={!showSize} className='float-end m-1' pill>
                    {formatSize(inode)}
                </Badge>
                {inode.target !== null && (
                    <Badge className='float-end m-1' pill>
                        <span className='mdi mdi-link' />
                    </Badge>
                )}
                {inode.isFile && inode.mimeType && (
                    <Badge hidden={!showMimeType} className='float-end m-1' pill>
                        {breakSpecialCharacters(inode.mimeType)}
                    </Badge>
                )}
            </div>
            {showContent && (
                <>
                    <hr className='m-0' />
                    {inode.isFile ? (
                        <FileComponent
                            ref={contentRef}
                            action={action}
                            context={context.appContext}
                            inode={inode}
                            setInode={setInode}
                            spellCheck={spellCheck}
                        />
                    ) : (
                        <DirectoryComponent
                            ref={contentRef}
                            context={context}
                            decentDirectory={false} // Stops endless descending.
                            inode={inode}
                            setInode={setInode}
                            isFirstLevel={false}
                            path={inode.path}
                            spellCheck={spellCheck}
                        />
                    )}
                </>
            )}
            <hr className='m-0' />
            <ShareModal context={context.appContext} inode={inode} isOpen={showShareModal} toggle={toggleShowShareModal} />
        </div>
    );
}

function getIconClassName(inode: Inode, showContent: boolean): string {
    if (inode.isFile) {
        return inode.canRead ? 'mdi-file-outline' : 'mdi-file-lock-outline';
    } else if (inode.isDirectory) {
        if (!inode.canRead) {
            return 'mdi-folder-lock';
        } else {
            return showContent ? 'mdi-folder-open' : 'mdi-folder';
        }
    } else {
        return 'mdi-file-question-outline';
    }
}

function parseCheckbox(value: string, setValue: Dispatch<string>, disabled: boolean): ReactNode {
    const keySuffix = 'c';
    return value
        .split(/(\[[x ]\])/)
        .map((part, index, parts) =>
            index % 2 === 0 ? (
                <Fragment key={`${index}${keySuffix}`}>{breakSpecialCharacters(part)}</Fragment>
            ) : (
                <CheckboxInput
                    key={`${index}${keySuffix}`}
                    disabled={disabled}
                    onClick={stopPropagationAndFocusNothing}
                    checked={part[1] === 'x'}
                    parentIndex={index}
                    parentValues={parts}
                    setParentValue={setValue}
                />
            )
        );
}

function checkShowContentSize(inode: Inode): boolean {
    return (inode.size ?? 0) < 100000;
}

function checkShowContentType(inode: Inode): boolean {
    return inode.isDirectory || isAnyType(inode.type, Type.text);
}
