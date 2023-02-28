import React, {Dispatch, Fragment, ReactNode, useCallback, useMemo, useRef, useState} from 'react';
import {Badge, Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from 'reactstrap';
import {Inode, formatSize, isReadmeFile, getDownloadPath} from 'model/Inode';
import {
    noop,
    breakSpecialCharacters,
    encodePath,
    formatTimestamp,
    isAnyType,
    newLine,
    TimestampPrecision,
    Type,
    zeroWidthSpace,
    separator,
    paramsToHash,
    appendParam,
} from 'common/Util';
import {FileComponent} from 'components/file/FileComponent';
import {DirectoryComponent} from 'components/inode/DirectoryComponent';
import {Action} from 'components/Action';
import {focusNothing, stopPropagation, stopPropagationAndFocusNothing, useDepsEffect, useDepsLayoutEffect} from 'common/ReactUtil';
import {TaskDropdownItems} from './TaskDropdownItems';
import {serverPath, AppLocation, ParamName, tagRegexGrouped} from 'common/constants';
import {MoveInodeComponent} from './MoveInodeComponent';
import {CheckboxInput} from 'components/file/CheckboxInput';
import {TriggerableAction} from 'common/TriggerableAction';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {ShareModal} from './ShareModal';
import {UploadDropdownItem} from './UploadDropdownItem';
import {useAsyncCallback} from 'common/useAsyncCallback';
import './InodeComponent.scss';
import classNames from 'classnames';
import {useCopyToClipboard} from 'components/util/useCopyToClipboard';
import {RenderIfVisible} from 'components/util/RenderIfVisible';

export interface InodeMeta {
    readonly showContent: boolean;
}

export interface InodeComponentProps {
    readonly context: DirectoryPageContext;
    readonly decentDirectory: boolean;
    readonly inode: Inode;
    readonly isFirstLevel: boolean;
    readonly meta: InodeMeta;
    readonly nameCursorPosition: number;
    readonly parentPath: string;
}

export function InodeComponent({
    context,
    decentDirectory,
    handleAddAction,
    inode,
    setInode,
    isFirstLevel,
    meta,
    nameCursorPosition,
    onDelete,
    onMove,
    openGallery,
    parentPath,
}: {
    readonly handleAddAction: (handled: () => void) => void;
    readonly setInode: (newInode: Inode) => void;
    readonly onDelete: () => void;
    readonly onMove: (newInode: Inode) => void;
    readonly openGallery: () => void;
} & InodeComponentProps): JSX.Element {
    const {
        appContext: {appStore, audioPlayerStore, consoleStore, inodeStore, suggestionStore},
        dropdownContainerRef,
        directoryPageParameter,
    } = context;
    const {
        action,
        decentFile,
        decentReadmeFile,
        decentRunLastFile,
        showHidden,
        showLastModified,
        showMimeType,
        showNotRepeating,
        showSize,
        showThumbnail,
        showUnavailable,
        showWaiting,
        today,
    } = directoryPageParameter.values;
    const encodedPath = encodePath(inode.path);

    const isVisible = useMemo((): boolean => {
        let result = true;
        if (result && !showHidden) {
            result = !inode.name.startsWith('.');
        }
        if (inode.task) {
            if (result && !showNotRepeating) {
                result = inode.task.isRepeating;
            }
            if (result && !showUnavailable) {
                result = inode.task.date.localeCompare(today) <= 0 || (inode.task.isWaiting && showWaiting);
            }
        }
        return result;
    }, [inode.name, inode.task, showNotRepeating, showHidden, showUnavailable, showWaiting, today]);

    const smallInfo = useMemo((): string => {
        const partsInode = inode.parentPath.split(separator);
        const parts = parentPath.split(separator);
        let index = 0;
        while (index < partsInode.length && index < parts.length && partsInode[index] === parts[index]) {
            index++;
        }
        partsInode.splice(0, index);
        return breakSpecialCharacters(trimAfterWildcard(partsInode.join(separator), parentPath));
    }, [inode.parentPath, parentPath]);

    const delete_ = useAsyncCallback<boolean, [], void>(
        () =>
            appStore.confirm(
                <>
                    Deleting inode: <pre className='overflow-auto'>{inode.name}</pre>
                </>
            ),
        (value) => (value ? deleteImmediately() : undefined),
        consoleStore.handleError
    );
    const deleteImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.delete(inode))),
        onDelete,
        consoleStore.handleError
    );

    const move = useAsyncCallback(
        (relativeDestination: string) => appStore.indicateLoading(appStore.preventClose(inodeStore.move(inode, relativeDestination))),
        (newInode, _, onSuccess?: () => void) => {
            onMove(newInode);
            onSuccess?.();
        },
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
                    (inode.canAnyGet &&
                        ((decentDirectory && inode.isDirectory) ||
                            (decentFile && inode.isFile) ||
                            (decentReadmeFile && !isFirstLevel && isReadmeFile(inode)) ||
                            (decentRunLastFile && inode.isRunLast && inode.isFile)) &&
                        checkShowContentSize(inode) &&
                        checkShowContentType(inode))
            ),
        [decentDirectory, decentFile, decentRunLastFile, decentReadmeFile]
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
            if (action === Action.view && inode.canAnyGet) {
                if (inode.isFile) {
                    if (isAnyType(inode.type, Type.audio)) {
                        audioPlayerStore.enqueue(inode);
                    } else if (isAnyType(inode.type, Type.image)) {
                        openGallery();
                    } else if (isAnyType(inode.type, Type.media, Type.pdf)) {
                        window.open(getDownloadPath(inode, encodedPath), '_blank');
                    } else {
                        asyncToggleShowContent();
                    }
                } else {
                    asyncToggleShowContent();
                }
                ev.stopPropagation();
            } else if (action === Action.edit && inode.operation.canInodeRename) {
                if (isEdit) {
                    setIsEdit(false);
                } else {
                    setIsEdit(true);
                    setNewNameCursorPosition(nameCursorPosition);
                }
                ev.stopPropagation();
            } else if (action === Action.reload) {
                if (showContent) {
                    contentRef.current?.triggerAction(Action.reload, () => ev.stopPropagation());
                } else {
                    loadInode();
                    ev.stopPropagation();
                }
            } else if (action === Action.add && inode.canAnyAdd) {
                if (showContent) {
                    contentRef.current?.triggerAction(Action.add, () => ev.stopPropagation());
                } else {
                    handleAddAction(() => ev.stopPropagation());
                }
            } else if (action === Action.delete && inode.operation.canInodeDelete) {
                delete_();
                ev.stopPropagation();
            }
        },
        [
            action,
            inode,
            audioPlayerStore,
            openGallery,
            encodedPath,
            asyncToggleShowContent,
            isEdit,
            nameCursorPosition,
            showContent,
            loadInode,
            handleAddAction,
            delete_,
        ]
    );

    const [newName, setNewName] = useState<string>(inode.name);
    useDepsEffect(() => setNewName(inode.name), [inode.name]);
    const [newNameCursorPosition, setNewNameCursorPosition] = useState<number | undefined>(nameCursorPosition);
    // See AddInodeComponent why a layout effect is required.
    useDepsLayoutEffect(() => setNewNameCursorPosition(nameCursorPosition), [nameCursorPosition]);

    const moveToNewName = useCallback(() => {
        if (newName !== inode.name) {
            move(newName);
        }
        setIsEdit(false);
    }, [inode.name, move, newName]);

    const doneRunLast = useAsyncCallback(
        () =>
            appStore.indicateLoading(
                appStore.preventClose(
                    inodeStore.putFile(inode.path, {
                        lastModified: inode.lastModified,
                        value: formatTimestamp(new Date(), TimestampPrecision.minute, ':') + newLine,
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

    const href = paramsToHash(directoryPageParameter.getEncodedPath(inode.path));
    const suggestionControl = useMemo(() => suggestionStore.createSuggestionControl(inode.path), [inode.path, suggestionStore]);
    const thumbnailIntersectionRef = useRef<HTMLDivElement>(null);

    const nameClassName = !inode.canAnyGet ? 'text-muted' : '';
    return (
        <div className='inode-component' data-scrollable={isVisible && showContent} hidden={!isVisible}>
            <div
                className={classNames('hoverable clearfix overflow-ellipsis', inode.isVirtual && 'virtual')}
                data-path={encodedPath}
                onClick={handleAction}
            >
                {isEdit && (
                    <MoveInodeComponent
                        setKeyboardControl={appStore.setKeyboardControl}
                        newName={newName}
                        setNewName={setNewName}
                        newNameCursorPosition={newNameCursorPosition}
                        setNewNameCursorPosition={setNewNameCursorPosition}
                        moveToNewName={moveToNewName}
                        oldName={inode.name}
                        spellCheck={appStore.appParameter.values.spellCheck}
                        suggestionControl={suggestionControl}
                    />
                )}
                {showThumbnail && isAnyType(inode.type, Type.image) ? (
                    <div className='thumbnail float-start me-1' ref={thumbnailIntersectionRef}>
                        <RenderIfVisible intersectionRef={thumbnailIntersectionRef}>
                            <img src={serverPath.authenticatedPath.thumbnail(encodedPath, 100)} alt='thumbnail' />
                        </RenderIfVisible>
                    </div>
                ) : (
                    <a
                        className={classNames('m-1 btn btn-secondary mdi', getIconClassName(inode, showContent), {
                            disabled: !inode.operation.canDirectoryGet,
                        })}
                        href={href}
                        role='button'
                        onClick={stopPropagationAndFocusNothing}
                    />
                )}
                {inode.friendlyName !== null ? (
                    <i className={nameClassName}>{parseTags(inode.friendlyName)}</i>
                ) : (
                    <span className={nameClassName}>{parseCheckbox(inode.name, move, action !== Action.view)}</span>
                )}
                {zeroWidthSpace}
                <small className='text-muted m-1'>{smallInfo}</small>
                {zeroWidthSpace}
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
                            disabled={!inode.operation.canFileSet}
                            hidden={!inode.isFile}
                            href={paramsToHash(
                                appendParam(appStore.appParameter.getEncodedLocation(AppLocation.edit), ParamName.path, inode.path)
                            )}
                            target='_blank'
                            rel='noreferrer'
                        >
                            <span className='mdi mdi-pencil' /> Edit
                        </DropdownItem>
                        <DropdownItem disabled={!inode.operation.canFileGet} href={href} title={inode.path}>
                            <span className='mdi mdi-arrow-expand-all' /> Go to
                        </DropdownItem>
                        <DropdownItem
                            disabled={!inode.operation.canFileGet}
                            hidden={!inode.isFile}
                            href={getDownloadPath(inode, encodedPath)}
                            target='_blank'
                            rel='noreferrer'
                        >
                            <span className='mdi mdi-download' /> Download
                        </DropdownItem>
                        <DropdownItem
                            hidden={!(navigator.clipboard && inode.parentLocalPath)}
                            onClick={useCopyToClipboard(appStore, consoleStore, inode.parentLocalPath ?? '')}
                        >
                            <span className='mdi mdi-content-copy' /> Copy local path
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
                        <DropdownItem disabled={!inode.operation.canInodeShare} onClick={useCallback(() => setShowShareModal(true), [])}>
                            <span className='mdi mdi-share-variant' /> Share
                        </DropdownItem>
                        <DropdownItem disabled={!inode.operation.canInodeDelete} onClick={delete_}>
                            <span className='mdi mdi-trash-can' /> Delete
                        </DropdownItem>
                        {inode.link !== null && (
                            <DropdownItem
                                href={paramsToHash(directoryPageParameter.getEncodedPath(inode.link.target))}
                                title={inode.link.target}
                            >
                                <span className='mdi mdi-folder-outline' /> Show Target
                            </DropdownItem>
                        )}
                        {inode.task !== null && (
                            <TaskDropdownItems context={context.appContext} inode={inode} move={move} task={inode.task} />
                        )}
                    </DropdownMenu>
                </Dropdown>
                <Button
                    disabled={!inode.operation.canFileSet}
                    hidden={!(inode.isRunLast && inode.isFile)}
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
                {
                    <small hidden={!showLastModified} className='float-end m-1'>
                        {formatTimestamp(inode.lastModified, TimestampPrecision.minute, ':')}
                    </small>
                }
                <Badge hidden={!showSize} className='float-end m-1' pill>
                    {formatSize(inode)}
                </Badge>
                {inode.link !== null && (
                    <Badge className='float-end m-1' pill>
                        <span className='mdi mdi-link' />
                    </Badge>
                )}
                {inode.isFile && inode.mimeType !== null && (
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
                            context={context}
                            inode={inode}
                            setInode={setInode}
                            suggestionControl={suggestionControl}
                        />
                    ) : (
                        <DirectoryComponent
                            ref={contentRef}
                            className='inode-component-indent'
                            context={context}
                            decentDirectory={false} // Stops endless descending.
                            inode={inode}
                            setInode={setInode}
                            isFirstLevel={false}
                            path={inode.path}
                            suggestionControl={suggestionControl}
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
        return inode.operation.canFileGet ? 'mdi-file-outline' : 'mdi-file-lock-outline';
    } else if (inode.isDirectory) {
        if (!inode.operation.canDirectoryGet) {
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
                <Fragment key={`${index}${keySuffix}`}>{parseTags(part)}</Fragment>
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

function parseTags(value: string): ReactNode {
    const keySuffix = 't';
    return value.split(tagRegexGrouped).map((part, index) =>
        index % 2 === 0 ? (
            <Fragment key={`${index}${keySuffix}`}>{breakSpecialCharacters(part)}</Fragment>
        ) : (
            <span key={`${index}${keySuffix}`} className='text-tag'>
                {part}
            </span>
        )
    );
}

function checkShowContentSize(inode: Inode): boolean {
    return (inode.size ?? 0) < 100000;
}

function checkShowContentType(inode: Inode): boolean {
    return inode.isDirectory || inode.size === 0 || isAnyType(inode.type, Type.text);
}

function trimAfterWildcard(path: string, parentPath: string): string {
    const lastWildcardIndex = parentPath.lastIndexOf('*');
    return lastWildcardIndex !== -1 ? path.substring(0, path.length - parentPath.length + lastWildcardIndex + 1) : path;
}
