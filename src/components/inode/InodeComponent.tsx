import React, {Dispatch, Fragment, ReactNode, useRef, useState} from 'react';
import {Badge, Button} from 'reactstrap';
import {Inode, formatSize, isReadmeFile, getDownloadPath, createClipboardId, createClipboardItem} from 'dto/Inode';
import {
    noop,
    breakSpecialCharacters,
    formatTimestamp,
    isAnyType,
    newLine,
    TimestampPrecision,
    Type,
    zeroWidthSpace,
    separator,
    paramsToHash,
} from 'common/Util';
import {FileComponent} from 'components/file/FileComponent';
import {DirectoryComponent} from 'components/inode/DirectoryComponent';
import {Action} from 'components/Action';
import {focusNothing, stopPropagationAndFocusNothing, useDepsEffect, useDepsLayoutEffect} from 'common/ReactUtil';
import {constant, hashWordRegex, tagRegexGrouped} from 'common/constants';
import {MoveInodeComponent} from './MoveInodeComponent';
import {CheckboxInput} from 'components/file/CheckboxInput';
import {TriggerableAction} from 'common/TriggerableAction';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {useAsyncCallback} from 'common/useAsyncCallback';
import './InodeComponent.scss';
import classNames from 'classnames';
import {useMove} from './useMove';
import {OnTagClick} from 'components/file/LineComponent';
import {Thumbnail} from './Thumbnail';
import {InodeDropdown} from './InodeDropdown';

export interface InodeMeta {
    readonly showContent: boolean;
}

export function InodeComponent({
    context,
    decentDirectory,
    filterHighlightTags,
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
    readonly context: DirectoryPageContext;
    readonly decentDirectory: boolean;
    readonly filterHighlightTags?: ReadonlySet<string>;
    readonly handleAddAction: (handled: () => void) => void;
    readonly inode: Inode;
    readonly setInode: (newInode: Inode) => void;
    readonly isFirstLevel: boolean;
    readonly meta: InodeMeta;
    readonly nameCursorPosition: number;
    readonly onDelete: () => void;
    readonly onMove: (newInode: Inode) => void;
    readonly openGallery: () => void;
    readonly parentPath: string;
}): React.JSX.Element {
    const {appContext, dropdownContainerRef, directoryPageParameter} = context;
    const {appStore, audioPlayerStore, clipboardStore, consoleStore, inodeStore, suggestionStore} = appContext;
    const {
        action,
        decentFile,
        decentReadmeFile,
        decentRunLastFile,
        showDateFrom,
        showDateTo,
        showHidden,
        showLastModified,
        showMimeType,
        showNotRepeating,
        showSize,
        showThumbnail,
        showWaiting,
    } = directoryPageParameter.values;

    const isVisible = ((): boolean => {
        if (!showHidden && inode.name.startsWith('.')) {
            return false;
        }
        if (inode.task !== undefined) {
            if (showWaiting && inode.task.isWaiting) {
                // Show regardless of further conditions on task.
            } else {
                if (!showNotRepeating && !inode.task.isRepeating) {
                    return false;
                }
                if (showDateFrom.date !== undefined && inode.task.date.getTime() < showDateFrom.date.getTime()) {
                    return false;
                }
                if (showDateTo.date !== undefined && inode.task.date.getTime() > showDateTo.date.getTime()) {
                    return false;
                }
            }
        }
        return true;
    })();

    const smallInfo = ((): string => {
        const partsInode = inode.parentPath.split(separator);
        const parts = parentPath.split(separator);
        let index = 0;
        while (index < partsInode.length && index < parts.length && partsInode[index] === parts[index]) {
            index++;
        }
        partsInode.splice(0, index);
        const priorityString = inode.priorityOfItem !== constant.priorityOfItem.default ? `(${inode.priorityOfItem}) ` : '';
        return breakSpecialCharacters(priorityString + partsInode.join(separator));
    })();

    const delete_ = useAsyncCallback<boolean, [], void>(
        () =>
            appStore.confirm(
                <>
                    Deleting inode: <pre className='overflow-auto'>{inode.name}</pre>
                </>,
            ),
        (value) => (value ? deleteImmediately() : undefined),
        consoleStore.handleError,
    );
    const deleteImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.delete(inode))),
        onDelete,
        consoleStore.handleError,
    );

    const move = useMove({context: appContext, newParentPath: inode.parentPath, oldPath: inode.path, onMove});

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
        },
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
                        checkShowContentType(inode)),
            ),
        [], // Will only affect the future. Reload page to open all accordingly.
    );

    const setShowContentFalse = (): void => setShowContentDangerous(false);
    const asyncSetShowContentTrue = useAsyncCallback(
        () => (showContent ? false : checkShowContent()),
        (value) => (value ? setShowContentDangerous(true) : undefined),
        consoleStore.handleError,
    );

    const asyncToggleShowContent = (): Promise<void> => (showContent ? Promise.resolve(setShowContentFalse()) : asyncSetShowContentTrue());

    const [isEdit, setIsEdit] = useState<boolean>(false);
    useDepsEffect(() => setIsEdit((prev) => action === Action.edit && prev), [action]);

    const loadInode = useAsyncCallback(
        () => appStore.indicateLoading(inodeStore.getInode(inode.path, inode)),
        setInode,
        consoleStore.handleError,
    );
    const reload = (handled: () => void): void => {
        if (showContent) {
            contentRef.current?.triggerAction(Action.reload, handled);
        } else {
            loadInode();
            handled();
        }
    };
    const handleAction = (ev: React.MouseEvent): void => {
        if (action === Action.view && inode.canAnyGet) {
            if (inode.isFile) {
                if (isAnyType(inode.type, Type.audio)) {
                    audioPlayerStore.enqueue(inode);
                } else if (isAnyType(inode.type, Type.image, Type.pdf)) {
                    openGallery();
                } else if (isAnyType(inode.type, Type.media)) {
                    window.open(getDownloadPath(inode), '_blank');
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
        } else if (action === Action.add && inode.canAnyAdd) {
            if (showContent) {
                contentRef.current?.triggerAction(Action.add, () => ev.stopPropagation());
            } else {
                handleAddAction(() => ev.stopPropagation());
            }
        } else if (action === Action.cut && inode.operation.canInodeMove) {
            clipboardStore.cut(createClipboardId(inode), createClipboardItem(inode));
            ev.stopPropagation();
        } else if (action === Action.paste && inode.operation.canDirectoryAdd) {
            clipboardStore.paste(inode.path);
            ev.stopPropagation();
        } else if (action === Action.reload) {
            reload(() => ev.stopPropagation());
        } else if (action === Action.delete && inode.operation.canInodeDelete) {
            delete_();
            ev.stopPropagation();
        }
    };

    const [newName, setNewName] = useState<string>(inode.name);
    useDepsEffect(() => setNewName(inode.name), [inode.name]);
    const [newNameCursorPosition, setNewNameCursorPosition] = useState<number | undefined>(nameCursorPosition);
    // See AddInodeComponent why a layout effect is required.
    useDepsLayoutEffect(() => setNewNameCursorPosition(nameCursorPosition), [nameCursorPosition]);

    const moveToNewName = (): void => {
        if (newName !== inode.name) {
            move(newName);
        }
        setIsEdit(false);
    };

    const doneRunLast = useAsyncCallback(
        () =>
            appStore.indicateLoading(
                appStore.preventClose(
                    inodeStore.putFile(
                        inode.path,
                        {
                            lastModifiedMilliseconds: inode.lastModifiedMilliseconds,
                            value: formatTimestamp(new Date(), TimestampPrecision.minute, ':') + newLine,
                        },
                        inode,
                    ),
                ),
            ),
        (newInode) => {
            setInode(newInode);
            contentRef.current?.triggerAction(Action.reload, noop);
        },
        consoleStore.handleError,
    );

    const contentRef = useRef<TriggerableAction>(null);

    const createHref = (path: string): string => paramsToHash(appStore.appParameter.getEncodedPath(path));
    const suggestionControl = suggestionStore.createSuggestionControl(inode.path, hashWordRegex);
    const filterOutputPath = inode.item?.outputPath;
    const filterTags = inode.item?.tags;
    const onTagClick =
        filterOutputPath !== undefined && filterTags !== undefined
            ? (clickedTag: string): void =>
                  context.setTagModalControl({
                      clickedTag,
                      filterOutputPath,
                      filterTags,
                  })
            : undefined;
    const lineContext: LineContext = {
        disabled: action !== Action.view,
        filterHighlightTags: inode.item?.result?.highlightTagSet ?? filterHighlightTags ?? new Set(),
        onTagClick,
    };

    const setInodeAndCloseContent = (newInode: Inode): void => {
        setInode(newInode);
        setShowContentFalse();
    };

    const nameClassName = !inode.canAnyGet ? 'text-muted' : '';
    return (
        <div className='inode-component' data-scrollable={isVisible && showContent} hidden={!isVisible}>
            <div
                className={classNames('hoverable clearfix overflow-ellipsis', inode.isVirtual && 'virtual')}
                data-path={inode.encodedPath}
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
                {showThumbnail && inode.thumbnailUrl !== undefined ? (
                    <Thumbnail className='float-start me-1' thumbnailUrl={inode.thumbnailUrl} />
                ) : (
                    <a
                        className={classNames('m-1 btn btn-secondary mdi', getIconClassName(inode, showContent), {
                            disabled: !inode.operation.canDirectoryGet,
                        })}
                        href={createHref(inode.path)}
                        role='button'
                        onClick={stopPropagationAndFocusNothing}
                    />
                )}
                {inode.friendlyName !== undefined ? (
                    <i className={nameClassName}>{parseTags(inode.friendlyName, lineContext)}</i>
                ) : (
                    <span className={nameClassName}>{parseCheckbox(inode.name, move, lineContext)}</span>
                )}
                {zeroWidthSpace}
                <small className='text-muted m-1'>{smallInfo}</small>
                {zeroWidthSpace}
                <small className='text-danger m-1'>{inode.errors.join(' ')}</small>
                <InodeDropdown
                    className='float-end m-1'
                    context={appContext}
                    container={dropdownContainerRef}
                    createHref={createHref}
                    delete_={delete_}
                    inode={inode}
                    setInode={setInode}
                    move={move}
                    reload={(): void => reload(noop)}
                    rename={(): void => setIsEdit(true)}
                    setUploadedInode={setInodeAndCloseContent}
                />
                <Button
                    disabled={!inode.operation.canFileSet}
                    hidden={!(inode.isRunLast && inode.isFile)}
                    className='float-end m-1'
                    color='success'
                    onClick={(ev): void => {
                        ev.stopPropagation();
                        focusNothing();
                        doneRunLast();
                    }}
                >
                    Done
                </Button>
                {
                    <small hidden={!showLastModified} className='float-end m-1'>
                        {formatTimestamp(inode.lastModifiedDate, TimestampPrecision.second, ':')}
                    </small>
                }
                <Badge hidden={!showSize} className='float-end m-1' pill>
                    {formatSize(inode)}
                </Badge>
                {inode.link !== undefined && (
                    <Badge className='float-end m-1' pill>
                        <span className='mdi mdi-link' />
                    </Badge>
                )}
                {inode.isFile && (
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
                            filterHighlightTags={inode.item?.result?.highlightTagSet ?? filterHighlightTags ?? new Set()}
                            inode={inode}
                            setInode={setInode}
                            onTagClick={onTagClick}
                            suggestionControl={suggestionControl}
                        />
                    ) : (
                        <DirectoryComponent
                            ref={contentRef}
                            className='inode-component-indent'
                            context={context}
                            decentDirectory={false} // Stops endless descending.
                            filterHighlightTags={inode.item?.result?.highlightTagSet ?? filterHighlightTags}
                            inode={inode}
                            setInode={setInode}
                            isFirstLevel={false}
                            onMove={setInode}
                            path={inode.path}
                            suggestionControl={suggestionControl}
                        />
                    )}
                </>
            )}
            <hr className='m-0' />
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

interface LineContext {
    readonly disabled: boolean;
    readonly filterHighlightTags: ReadonlySet<string>;
    readonly onTagClick: OnTagClick;
}

function parseCheckbox(value: string, setValue: Dispatch<string>, context: LineContext): ReactNode {
    const keySuffix = 'c';
    return value
        .split(/(\[[x ]\])/)
        .map((part, index, parts) =>
            index % 2 === 0 ? (
                <Fragment key={`${index}${keySuffix}`}>{parseTags(part, context)}</Fragment>
            ) : (
                <CheckboxInput
                    key={`${index}${keySuffix}`}
                    disabled={context.disabled}
                    onClick={stopPropagationAndFocusNothing}
                    checked={part[1] === 'x'}
                    parentIndex={index}
                    parentValues={parts}
                    setParentValue={setValue}
                />
            ),
        );
}

function parseTags(value: string, context: LineContext): ReactNode {
    const {onTagClick} = context;
    if (onTagClick === undefined) {
        return breakSpecialCharacters(value);
    } else {
        const keySuffix = 't';
        return value.split(tagRegexGrouped).map((part, index, parts) =>
            index % 4 === 0 ? (
                <Fragment key={`${index}${keySuffix}`}>{breakSpecialCharacters(part)}</Fragment>
            ) : (
                index % 4 === 3 && (
                    <Fragment key={`${index}${keySuffix}`}>
                        {zeroWidthSpace + parts[index - 1]}
                        <span
                            className={classNames(context.filterHighlightTags.has(part) ? 'link-tag-match' : 'link-tag', {
                                disabled: context.disabled,
                            })}
                            onClick={(ev): void => {
                                ev.stopPropagation();
                                onTagClick(part);
                            }}
                        >
                            {part}
                        </span>
                    </Fragment>
                )
            ),
        );
    }
}

function checkShowContentSize(inode: Inode): boolean {
    return (inode.size ?? 0) < constant.maxShowContentSize;
}

function checkShowContentType(inode: Inode): boolean {
    return inode.isDirectory || inode.size === 0 || isAnyType(inode.type, Type.text);
}
