import {Dispatch, ForwardedRef, forwardRef, Fragment, useImperativeHandle, useRef, useState} from 'react';
import {Inode} from 'model/Inode';
import {alwaysThrow, assertUnreachable, getName, identity, isAnyType, Type} from 'common/Util';
import {InodeComponent, InodeMeta} from './InodeComponent';
import {AddInodeComponent} from './AddInodeComponent';
import {Action} from 'components/Action';
import {Ided} from 'common/Ided';
import {DirectoryBreadcrumb} from './DirectoryBreadcrumb';
import {NewInode} from 'model/NewInode';
import {TriggerableAction} from 'common/TriggerableAction';
import {arrayAdd, arrayRemove, arrayReplace, useConditionalEffect, useDepsEffect} from 'common/ReactUtil';
import {GalleryEvent} from 'components/gallery/GalleryControl';
import {useLatest} from 'common/ReactUtil';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Directory} from 'model/Directory';
import {SuggestionControl} from 'components/textarea/RichTextarea';
import {MoveInodeComponent} from './MoveInodeComponent';
import {useMove} from './useMove';

export const DirectoryComponent = forwardRef(function DirectoryComponent(
    {
        setCanSearch,
        className,
        context,
        decentDirectory,
        filterHighlightTags,
        inode,
        isFirstLevel,
        setInode,
        setIsReady,
        onMove,
        path,
        suggestionControl,
    }: {
        readonly setCanSearch?: Dispatch<boolean>;
        readonly className?: string;
        readonly context: DirectoryPageContext;
        readonly decentDirectory: boolean;
        readonly filterHighlightTags: ReadonlySet<string> | null;
        readonly inode: Inode;
        readonly isFirstLevel: boolean;
        readonly setInode: Dispatch<Inode>;
        readonly setIsReady?: Dispatch<boolean>;
        readonly onMove: (newInode: Inode) => void;
        readonly path: string;
        readonly suggestionControl: SuggestionControl;
    },
    ref: ForwardedRef<TriggerableAction>
): JSX.Element {
    const {comparator, appContext, directoryPageParameter} = context;
    const {appStore, authenticationStore, consoleStore, galleryStore, inodeStore} = appContext;
    const {action} = directoryPageParameter.values;
    const [addInodeAfterIndex, setAddInodeAfterIndex] = useState<number>();
    const [addInodeParent, setAddInodeParent] = useState<string>(path);
    const [idedInodes, setIdedInodes] = useState<ReadonlyArray<Ided<Inode, InodeMeta>>>([]);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const inodeIdRef = useRef(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useDepsEffect(() => {
        if (action !== Action.edit && action !== Action.add) {
            setAddInodeAfterIndex(undefined);
        }
    }, [action]);
    const [directory, setDirectory] = useState<Directory>();

    const onInodeChange = (data: Inode, meta: InodeMeta, id: string, index: number): void => {
        setIdedInodes((prev) => arrayReplace(prev, index, {id, data, meta}));
    };

    const loadInode = useAsyncCallback(() => inodeStore.getInode(path), setInode, consoleStore.handleError);

    const onInodeDelete = (oldInode: Inode, index: number): void => {
        setIdedInodes(arrayRemove(idedInodes, index));
        loadInode();
    };

    const onInodeMove = (newInode: Inode, oldInode: Inode, meta: InodeMeta, id: string, index: number): void => {
        const nextIdedInodes = [...idedInodes];
        if (newInode.parentPath === oldInode.parentPath) {
            nextIdedInodes.splice(index, 1, {id, data: newInode, meta});
        } else {
            nextIdedInodes.splice(index, 1);
        }
        setIdedInodes(nextIdedInodes);
        loadInode();
    };

    const add = useAsyncCallback<Inode, [NewInode, number], void>(
        (newInode) => appStore.indicateLoading(appStore.preventClose(inodeStore.add(addInodeParent, newInode))),
        (data, _, localAddInodeAfterIndex) => {
            const addedIdedInode: Ided<Inode, InodeMeta> = {
                id: `${inodeIdRef.current++}`,
                data,
                meta: {showContent: true},
            };
            setIdedInodes(arrayAdd(idedInodes, localAddInodeAfterIndex + 1, addedIdedInode));
            loadInode();
        },
        consoleStore.handleError
    );

    const indicateLoading = useAsyncCallback(
        (promise: Promise<Directory>) => {
            setIsLoading(true);
            return promise;
        },
        identity,
        alwaysThrow,
        () => setIsLoading(false)
    );
    const load = useAsyncCallback(
        () => {
            setIdedInodes(emptyIdedInodes);
            setIsReady?.(false);
            const promise = inodeStore.getDirectory(path);
            return inodeIdRef.current === 0 ? indicateLoading(promise) : appStore.indicateLoading(promise);
        },
        (data) => {
            setCanSearch?.(data.canSearch);
            setDirectory(data);
            data.errors.forEach((error) => {
                consoleStore.logWarning(error);
            });
            // Must happen in next tick because of setInodes(emptyIdedInodes).
            setInode(data.inode);
            setIdedInodes(
                [...data.inodes.map((data) => ({id: `${inodeIdRef.current++}`, data, meta: {showContent: false}}))].sort(
                    comparator.compareFn
                )
            );
        },
        authenticationStore.handleAuthenticationError
    );

    useDepsEffect(() => setIdedInodes((prev) => [...prev].sort(comparator.compareFn)), [comparator.compareFn]);
    useDepsEffect(() => void load(), [path]);
    useConditionalEffect(idedInodes !== emptyIdedInodes, () => setIsReady?.(true));

    const onGalleryEventRef = useLatest((ev: GalleryEvent): void => {
        const {_type, oldInode} = ev;
        const index = idedInodes.findIndex(({data}) => data === oldInode);
        if (index === -1) {
            consoleStore.logError('Index of inode not found: ' + JSON.stringify(oldInode));
            return;
        }
        switch (_type) {
            case 'delete': {
                onInodeDelete(oldInode, index);
                return;
            }
            case 'move': {
                const {newInode} = ev;
                const {id, meta} = idedInodes[index];
                onInodeMove(newInode, oldInode, meta, id, index);
                return;
            }
        }
        return assertUnreachable(_type);
    });

    const openGallery = (inodeIndex: number): void => {
        let imageIndex = 0;
        const images: Inode[] = [];
        idedInodes.forEach((idedInode, index) => {
            if (isAnyType(idedInode.data.type, Type.image)) {
                if (index === inodeIndex) {
                    imageIndex = images.length;
                }
                images.push(idedInode.data);
            }
        });
        galleryStore.setGalleryControl({
            index: imageIndex,
            inodes: images,
            onEvent: (ev) => onGalleryEventRef.current(ev),
        });
    };

    const handleAddAction = (localAddInodeAtIndex: number, handled: () => void): void => {
        const sibling = idedInodes[localAddInodeAtIndex]?.data;
        let nextAddInodeParent: string | undefined;
        if (sibling?.parentOperation?.canDirectoryAdd) {
            nextAddInodeParent = sibling.parentPath;
        } else if (inode.operation.canDirectoryAdd) {
            nextAddInodeParent = path;
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
        } else if (localAction === Action.reload) {
            load();
            handled();
        } else if (localAction === Action.add) {
            handleAddAction(localAddInodeAtIndex, handled);
        }
    });

    useImperativeHandle(
        ref,
        () => ({
            triggerAction: (localAction, handled) => handleActionRef.current(localAction, beforeFirstInode, handled),
        }),
        [handleActionRef]
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

    const move = useMove({context: appContext, inode, onMove});

    const moveToNewName = (): void => {
        if (newName !== inode.name) {
            move(newName);
        }
        setIsEdit(false);
    };

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
                getEncodedPath={directoryPageParameter.getEncodedPath}
                onClick={(ev): void => handleActionRef.current(action, beforeFirstInode, () => ev.stopPropagation())}
                path={path}
            />
            <hr className='m-0' />
            <div hidden={!isLoading}>
                <i className='ps-2'>Loading ...</i>
                <hr className='m-0' />
            </div>
            {addInodeAfterIndex === beforeFirstInode && addInodeComponent}
            {directory !== undefined &&
                idedInodes.map(({id, data, meta}, index) => (
                    <Fragment key={id}>
                        <InodeComponent
                            context={context}
                            decentDirectory={decentDirectory}
                            filterHighlightTags={inode.filterHighlightTagSet ?? filterHighlightTags}
                            handleAddAction={(handled): void => handleAddAction(index, handled)}
                            inode={data}
                            setInode={(newInode: Inode): void => onInodeChange(newInode, meta, id, index)}
                            isFirstLevel={isFirstLevel}
                            meta={meta}
                            nameCursorPosition={directory.nameCursorPosition ?? data.name.length}
                            onDelete={(): void => onInodeDelete(data, index)}
                            onMove={(newInode: Inode): void => onInodeMove(newInode, data, meta, id, index)}
                            openGallery={(): void => openGallery(index)}
                            parentPath={path}
                        />
                        {addInodeAfterIndex === index && addInodeComponent}
                    </Fragment>
                ))}
            {addInodeAfterIndex === afterLastInode && addInodeComponent}
            <div
                className='hoverable overflow-auto p-2 text-muted text-nowrap'
                onClick={(ev): void => handleActionRef.current(action, afterLastInode, () => ev.stopPropagation())}
            >
                <span className='mdi mdi-folder-upload' /> {getName(path)}
            </div>
        </div>
    );
});

const afterLastInode = Infinity;
const beforeFirstInode = -Infinity;
const emptyIdedInodes: ReadonlyArray<Ided<Inode, InodeMeta>> = [];
