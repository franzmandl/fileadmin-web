import React, {Dispatch, ForwardedRef, forwardRef, Fragment, useImperativeHandle, useRef, useState} from 'react';
import {createClipboardId, createClipboardItem, Inode} from 'dto/Inode';
import {alwaysThrow, arrayRemoveInPlace, arrayReplaceInPlace, assertUnreachable, getName, identity, isAnyType, Type} from 'common/Util';
import {InodeComponent, InodeMeta} from './InodeComponent';
import {AddInodeComponent} from './AddInodeComponent';
import {Action} from 'components/Action';
import {Ided} from 'common/Ided';
import {DirectoryBreadcrumb} from './DirectoryBreadcrumb';
import {NewInode} from 'dto/NewInode';
import {TriggerableAction} from 'common/TriggerableAction';
import {arrayAdd, stopPropagation, useConditionalEffect, useDepsEffect, useLatest} from 'common/ReactUtil';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Directory} from 'dto/Directory';
import {SuggestionControl} from 'components/textarea/RichTextarea';
import {MoveInodeComponent} from './MoveInodeComponent';
import {useMove} from './useMove';
import {usePagination} from 'components/util/usePagination';
import {constant} from 'common/constants';
import {InodeEvent} from 'stores/InodeEventBus';
import {useListener} from 'common/useListener';
import {compare} from 'common/CompareInode';

export const DirectoryComponent = forwardRef(function DirectoryComponent(
    {
        setCanSearch,
        className,
        context,
        decentDirectory,
        filterHighlightTags,
        inode,
        setInode,
        isFirstLevel,
        onDirectoryChange,
        setIsReady,
        onMove,
        path,
        suggestionControl,
    }: {
        readonly setCanSearch?: Dispatch<boolean>;
        readonly className?: string;
        readonly context: DirectoryPageContext;
        readonly decentDirectory: boolean;
        readonly filterHighlightTags?: ReadonlySet<string>;
        readonly inode: Inode;
        readonly setInode: Dispatch<Inode>;
        readonly isFirstLevel: boolean;
        readonly setIsReady?: Dispatch<boolean>;
        readonly onDirectoryChange?: Dispatch<Directory | undefined>;
        readonly onMove: (newInode: Inode) => void;
        readonly path: string;
        readonly suggestionControl: SuggestionControl;
    },
    forwardedRef: ForwardedRef<TriggerableAction>,
): React.JSX.Element {
    const {appContext, directoryPageParameter} = context;
    const {appStore, authenticationStore, clipboardStore, consoleStore, galleryStore, inodeEventBus, inodeStore} = appContext;
    const {action, compareParameter, pageSize} = directoryPageParameter.values;
    const [addInodeAfterIndex, setAddInodeAfterIndex] = useState<number>();
    const [addInodeParent, setAddInodeParent] = useState<string>(inode.realPath);
    const [idedInodes, setIdedInodes] = useState<IdedInodes>([]);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const inodeIdRef = useRef(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useDepsEffect(() => {
        if (action !== Action.edit && action !== Action.add) {
            setAddInodeAfterIndex(undefined);
        }
    }, [action]);
    const [directory, setDirectory] = useState<Directory>();

    const idedInodesErrorsRef = useRef<React.ReactNode[]>([]);
    useDepsEffect(() => {
        idedInodesErrorsRef.current.forEach(consoleStore.logError);
        idedInodesErrorsRef.current = [];
    }, [idedInodes]);

    const onInodeChange = (inode: Inode, findInodeIndex: FindInodeIndex): void => {
        setIdedInodes((prev) => {
            const next = [...prev];
            const index = findInodeIndex.find(next);
            if (index === undefined) {
                idedInodesErrorsRef.current.push('onInodeChange: Unable to find inode. Details: ' + findInodeIndex.details);
                return next;
            }
            return arrayReplaceInPlace(next, index, {...next[index], data: inode});
        });
    };

    const loadInode = useAsyncCallback(() => inodeStore.getInode(path, inode), setInode, consoleStore.handleError);

    const onInodeAdd = (inode: Inode, index: number, showContent: boolean): void => {
        setIdedInodes((prev) => arrayAdd(prev, index, {id: `${inodeIdRef.current++}`, data: inode, meta: {showContent}}));
        loadInode();
    };

    const onInodeDelete = (findInodeIndex: FindInodeIndex): void => {
        setIdedInodes((prev) => {
            const next = [...prev];
            const index = findInodeIndex.find(next);
            if (index === undefined) {
                idedInodesErrorsRef.current.push('onInodeDelete: Unable to find inode. Details: ' + findInodeIndex.details);
                return next;
            }
            return arrayRemoveInPlace(next, index);
        });
        loadInode();
    };

    const onInodeMove = (newInode: Inode, oldInode: Inode, findInodeIndex: FindInodeIndex): void => {
        setIdedInodes((prev) => {
            const next = [...prev];
            const index = findInodeIndex.find(next);
            if (index === undefined) {
                idedInodesErrorsRef.current.push('onInodeMove: Unable to find inode. Details: ' + findInodeIndex.details);
                return next;
            }
            if (newInode.parentPath === oldInode.parentPath) {
                arrayReplaceInPlace(next, index, {...next[index], data: newInode});
            } else {
                arrayRemoveInPlace(next, index);
            }
            return next;
        });
        loadInode();
    };

    const add = useAsyncCallback<Inode, [NewInode, number], void>(
        (newInode) => appStore.indicateLoading(appStore.preventClose(inodeStore.add(addInodeParent, newInode))),
        (data, _, localAddInodeAfterIndex) => onInodeAdd(data, localAddInodeAfterIndex + 1, true),
        consoleStore.handleError,
    );

    const indicateLoading = useAsyncCallback(
        (promise: Promise<Directory>) => {
            setIsLoading(true);
            return promise;
        },
        identity,
        alwaysThrow,
        () => setIsLoading(false),
    );
    const load = useAsyncCallback(
        () => {
            setIdedInodes(emptyIdedInodes);
            setIsReady?.(false);
            onDirectoryChange?.(undefined);
            const promise = inodeStore.getDirectory(path, inode);
            return inodeIdRef.current === 0 ? indicateLoading(promise) : appStore.indicateLoading(promise);
        },
        (data) => {
            setCanSearch?.(data.canSearch);
            setDirectory(data);
            onDirectoryChange?.(data);
            data.errors.forEach((error) => {
                consoleStore.logWarning(error);
            });
            // Must happen in next tick because of setInodes(emptyIdedInodes).
            setInode(data.inode);
            setIdedInodes(
                [...data.children.map((data) => ({id: `${inodeIdRef.current++}`, data, meta: {showContent: false}}))].sort((a, b) =>
                    compare(compareParameter, inode, a, b),
                ),
            );
        },
        authenticationStore.handleAuthenticationError,
    );

    useDepsEffect(() => setIdedInodes((prev) => [...prev].sort((a, b) => compare(compareParameter, inode, a, b))), [compareParameter]);
    useDepsEffect(() => void load(), [path]);
    useConditionalEffect(idedInodes !== emptyIdedInodes, () => setIsReady?.(true));

    useListener(
        (ev: InodeEvent): void => {
            const {_type} = ev;
            switch (_type) {
                case 'add': {
                    onInodeAdd(ev.inode, 0, false);
                    return;
                }
                case 'delete': {
                    onInodeDelete(createFindInodeIndexByPath(ev.path));
                    return;
                }
                case 'rename': {
                    onInodeChange(ev.newInode, createFindInodeIndexByPath(ev.oldPath));
                    loadInode();
                    return;
                }
            }
            assertUnreachable(_type);
        },
        (listener): void => inodeEventBus.addListener(path, listener),
        (listener): void => inodeEventBus.removeListener(path, listener),
        [inodeEventBus],
    );

    const openGallery = (id: string): void => {
        let imageIndex = 0;
        const images: Inode[] = [];
        idedInodes.forEach((idedInode) => {
            if (isAnyType(idedInode.data.type, Type.image, Type.pdf)) {
                if (id === idedInode.id) {
                    imageIndex = images.length;
                }
                images.push(idedInode.data);
            }
        });
        galleryStore.setGalleryControl({
            index: imageIndex,
            inodes: images,
        });
    };

    const handleAddAction = (localAddInodeAtIndex: number, handled: () => void): void => {
        const sibling = idedInodes[localAddInodeAtIndex]?.data;
        let nextAddInodeParent: string | undefined;
        if (sibling?.parentOperation?.canDirectoryAdd) {
            nextAddInodeParent = sibling.parentPath;
        } else if (inode.operation.canDirectoryAdd) {
            nextAddInodeParent = inode.realPath;
        }
        if (nextAddInodeParent !== undefined) {
            setAddInodeAfterIndex((prev) => (prev === localAddInodeAtIndex ? undefined : localAddInodeAtIndex));
            setAddInodeParent(nextAddInodeParent);
            handled();
        }
    };

    const handleActionRef = useLatest((localAction: Action, localAddInodeAtIndex: number, handled: () => void) => {
        if (localAction === Action.view) {
            outerRef.current?.scrollIntoView();
            handled();
        } else if (localAction === Action.edit && inode.operation.canInodeRename) {
            setIsEdit((prev) => !prev);
            handled();
        } else if (localAction === Action.add) {
            handleAddAction(localAddInodeAtIndex, handled);
        } else if (action === Action.cut && inode.operation.canInodeMove) {
            clipboardStore.cut(createClipboardId(inode), createClipboardItem(inode));
            handled();
        } else if (action === Action.paste && inode.operation.canDirectoryAdd) {
            clipboardStore.paste(inode.path);
            handled();
        } else if (localAction === Action.reload) {
            load();
            handled();
        }
    });

    useImperativeHandle(
        forwardedRef,
        () => ({
            triggerAction: (localAction, handled) => handleActionRef.current(localAction, beforeFirstInode, handled),
        }),
        [handleActionRef],
    );

    const outerRef = useRef<HTMLDivElement>(null);

    const addInodeComponent = directory !== undefined && addInodeAfterIndex !== undefined && (
        <AddInodeComponent
            addInodeAfterIndex={addInodeAfterIndex}
            nameCursorPosition={directory.nameCursorPosition}
            setKeyboardControl={appStore.setKeyboardControl}
            newInodeTemplate={directory.newInodeTemplate}
            onAdd={add}
            spellCheck={appStore.appParameter.values.spellCheck}
            suggestionControl={suggestionControl}
        />
    );

    const [newName, setNewName] = useState<string>(inode.name);
    useDepsEffect(() => setNewName(inode.name), [inode.name]);

    const move = useMove({context: appContext, newParentPath: inode.parentPath, oldPath: inode.path, onMove});

    const moveToNewName = (): void => {
        if (newName !== inode.name) {
            move(newName);
        }
        setIsEdit(false);
    };

    const {fromIndex, pagination, toIndex} = usePagination(idedInodes.length, pageSize.value ?? constant.pageSize, {
        onClick: stopPropagation,
    });

    return (
        <div ref={outerRef} className={className}>
            {isEdit && (
                <MoveInodeComponent
                    setKeyboardControl={appStore.setKeyboardControl}
                    newName={newName}
                    setNewName={setNewName}
                    newNameCursorPosition={inode.name.length}
                    moveToNewName={moveToNewName}
                    oldName={inode.name}
                    spellCheck={appStore.appParameter.values.spellCheck}
                    suggestionControl={suggestionControl}
                />
            )}
            <DirectoryBreadcrumb
                disabled={action !== Action.view}
                getEncodedPath={appStore.appParameter.getEncodedPath}
                onClick={(ev): void => handleActionRef.current(action, beforeFirstInode, () => ev.stopPropagation())}
                path={path}
            />
            <hr className='m-0' />
            <div hidden={!isLoading}>
                <i className='ps-2'>Loading ...</i>
                <hr className='m-0' />
            </div>
            {pagination}
            {addInodeAfterIndex === beforeFirstInode && addInodeComponent}
            {directory !== undefined &&
                idedInodes.map(
                    ({id, data, meta}, index) =>
                        fromIndex <= index &&
                        index < toIndex && (
                            <Fragment key={id}>
                                <InodeComponent
                                    context={context}
                                    decentDirectory={decentDirectory}
                                    filterHighlightTags={inode.item?.result?.highlightTagSet ?? filterHighlightTags}
                                    handleAddAction={(handled): void => handleAddAction(index, handled)}
                                    inode={data}
                                    setInode={(newInode: Inode): void => onInodeChange(newInode, createFindInodeIndexById(id, data.path))}
                                    isFirstLevel={isFirstLevel}
                                    meta={meta}
                                    nameCursorPosition={directory.nameCursorPosition ?? data.name.length}
                                    onDelete={(): void => onInodeDelete(createFindInodeIndexById(id, data.path))}
                                    onMove={(newInode: Inode): void => onInodeMove(newInode, data, createFindInodeIndexById(id, data.path))}
                                    openGallery={(): void => openGallery(id)}
                                    parentPath={inode.realPath}
                                />
                                {addInodeAfterIndex === index && addInodeComponent}
                            </Fragment>
                        ),
                )}
            {addInodeAfterIndex === afterLastInode && addInodeComponent}
            {pagination}
            <div
                className='hoverable overflow-auto p-2 text-muted text-nowrap'
                onClick={(ev): void => handleActionRef.current(action, afterLastInode, () => ev.stopPropagation())}
            >
                <span className='mdi mdi-folder-upload' /> {getName(path)}
            </div>
        </div>
    );
});

type IdedInode = Ided<Inode, InodeMeta>;
type IdedInodes = ReadonlyArray<IdedInode>;

const afterLastInode = Infinity;
const beforeFirstInode = -Infinity;
const emptyIdedInodes: IdedInodes = [];

interface FindInodeIndex {
    readonly find: (idedInodes: IdedInodes) => number | undefined;
    readonly details: string;
}

function createFindInodeIndexByPath(pathToFind: string): FindInodeIndex {
    return {
        find: (idedInodes): number | undefined => idedInodes.findIndex(({data: {path}}) => path === pathToFind),
        details: `pathToFind=${pathToFind}`,
    };
}

function createFindInodeIndexById(idToFind: string, path: string): FindInodeIndex {
    return {
        find: (idedInodes): number | undefined => idedInodes.findIndex(({id}) => id === idToFind),
        details: `idToFind=${idToFind}, path=${path}`,
    };
}
