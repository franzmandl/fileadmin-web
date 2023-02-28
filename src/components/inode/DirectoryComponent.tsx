import React, {Dispatch, ForwardedRef, forwardRef, Fragment, useCallback, useImperativeHandle, useRef, useState} from 'react';
import {Inode} from 'model/Inode';
import {alwaysThrow, getName, identity, isAnyType, Type} from 'common/Util';
import {InodeComponent, InodeComponentProps, InodeMeta} from './InodeComponent';
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

export const DirectoryComponent = forwardRef(function DirectoryComponent(
    {
        setCanSearch,
        className,
        context,
        decentDirectory,
        inode,
        isFirstLevel,
        setInode,
        setIsReady,
        path,
        suggestionControl,
    }: {
        readonly setCanSearch?: Dispatch<boolean>;
        readonly className?: string;
        readonly context: DirectoryPageContext;
        readonly decentDirectory: boolean;
        readonly inode: Inode;
        readonly isFirstLevel: boolean;
        readonly setInode: Dispatch<Inode>;
        readonly setIsReady?: Dispatch<boolean>;
        readonly path: string;
        readonly suggestionControl: SuggestionControl;
    },
    ref: ForwardedRef<TriggerableAction>
): JSX.Element {
    const {
        comparator,
        appContext: {appStore, authenticationStore, consoleStore, galleryStore, inodeStore},
        directoryPageParameter,
    } = context;
    const {action} = directoryPageParameter.values;
    const [addInodeAfterIndex, setAddInodeAfterIndex] = useState<number>();
    const [addInodeParent, setAddInodeParent] = useState<string>(path);
    const [idedInodes, setIdedInodes] = useState<ReadonlyArray<Ided<Inode, InodeMeta>>>([]);
    const inodeIdRef = useRef(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useDepsEffect(() => {
        if (action !== Action.edit && action !== Action.add) {
            setAddInodeAfterIndex(undefined);
        }
    }, [action]);
    const [directory, setDirectory] = useState<Directory>();

    const onInodeChange = useCallback((data: Inode, meta: InodeMeta, id: string, index: number): void => {
        setIdedInodes((prev) => arrayReplace(prev, index, {id, data, meta}));
    }, []);

    const loadInode = useAsyncCallback(() => inodeStore.getInode(path), setInode, consoleStore.handleError);

    const onInodeDelete = useCallback(
        (oldInode: Inode, index: number): void => {
            setIdedInodes(arrayRemove(idedInodes, index));
            loadInode();
        },
        [idedInodes, loadInode]
    );

    const onInodeMove = useCallback(
        (newInode: Inode, oldInode: Inode, meta: InodeMeta, id: string, index: number): void => {
            const nextIdedInodes = [...idedInodes];
            if (newInode.parentPath === oldInode.parentPath) {
                nextIdedInodes.splice(index, 1, {id, data: newInode, meta});
            } else {
                nextIdedInodes.splice(index, 1);
            }
            setIdedInodes(nextIdedInodes);
            loadInode();
        },
        [idedInodes, loadInode]
    );

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

    const onGalleryEventRef = useLatest((ev: GalleryEvent) => {
        const {_type, oldInode} = ev;
        const index = idedInodes.findIndex(({data}) => data === oldInode);
        if (index === -1) {
            consoleStore.logError('Index of inode not found: ' + JSON.stringify(oldInode));
            return;
        }
        switch (_type) {
            case 'delete': {
                onInodeDelete(oldInode, index);
                break;
            }
            case 'move': {
                const {newInode} = ev;
                const {id, meta} = idedInodes[index];
                onInodeMove(newInode, oldInode, meta, id, index);
                break;
            }
        }
    });

    const openGallery = useCallback(
        (inodeIndex: number) => {
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
        },
        [idedInodes, galleryStore, onGalleryEventRef]
    );

    const handleAddAction = useCallback(
        (localAddInodeAtIndex: number, handled: () => void) => {
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
        },
        [idedInodes, inode.operation.canDirectoryAdd, path]
    );

    const handleAction = useCallback(
        (localAction: Action, localAddInodeAtIndex: number, handled: () => void) => {
            if (localAction === Action.view) {
                outerRef.current?.scrollIntoView();
                handled();
            } else if (localAction === Action.reload) {
                load();
                handled();
            } else if (localAction === Action.add) {
                handleAddAction(localAddInodeAtIndex, handled);
            }
        },
        [handleAddAction, load]
    );

    useImperativeHandle(
        ref,
        () => ({
            triggerAction: (localAction, handled) => handleAction(localAction, beforeFirstInode, handled),
        }),
        [handleAction]
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

    return (
        <div ref={outerRef} className={className}>
            <DirectoryBreadcrumb
                disabled={action !== Action.view}
                getEncodedPath={directoryPageParameter.getEncodedPath}
                onClick={useCallback((ev) => handleAction(action, beforeFirstInode, () => ev.stopPropagation()), [action, handleAction])}
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
                        <SequentialInodeComponent
                            context={context}
                            decentDirectory={decentDirectory}
                            handleAddAction={handleAddAction}
                            id={id}
                            index={index}
                            inode={data}
                            setInode={onInodeChange}
                            isFirstLevel={isFirstLevel}
                            meta={meta}
                            nameCursorPosition={directory.nameCursorPosition ?? data.name.length}
                            onInodeDelete={onInodeDelete}
                            onInodeMove={onInodeMove}
                            openGallery={openGallery}
                            parentPath={path}
                        />
                        {addInodeAfterIndex === index && addInodeComponent}
                    </Fragment>
                ))}
            {addInodeAfterIndex === afterLastInode && addInodeComponent}
            <div
                className='hoverable overflow-auto p-2 text-muted text-nowrap'
                onClick={useCallback(
                    (ev: React.MouseEvent) => handleAction(action, afterLastInode, () => ev.stopPropagation()),
                    [action, handleAction]
                )}
            >
                <span className='mdi mdi-folder-upload' /> {getName(path)}
            </div>
        </div>
    );
});

const afterLastInode = Infinity;
const beforeFirstInode = -Infinity;
const emptyIdedInodes: ReadonlyArray<Ided<Inode, InodeMeta>> = [];

function SequentialInodeComponent({
    handleAddAction,
    id,
    index,
    setInode,
    onInodeDelete,
    onInodeMove,
    openGallery,
    ...props
}: {
    readonly handleAddAction: (index: number, handled: () => void) => void;
    readonly id: string;
    readonly index: number;
    readonly setInode: (newInode: Inode, meta: InodeMeta, id: string, index: number) => void;
    readonly onInodeDelete: (oldInode: Inode, index: number) => void;
    readonly onInodeMove: (newInode: Inode, oldInode: Inode, meta: InodeMeta, id: string, index: number) => void;
    readonly openGallery: (index: number) => void;
} & InodeComponentProps): JSX.Element {
    const {inode, meta} = props;
    return (
        <InodeComponent
            handleAddAction={useCallback((handled) => handleAddAction(index, handled), [handleAddAction, index])}
            setInode={useCallback((newInode: Inode) => setInode(newInode, meta, id, index), [setInode, meta, id, index])}
            onDelete={useCallback(() => onInodeDelete(inode, index), [index, inode, onInodeDelete])}
            onMove={useCallback((newInode: Inode) => onInodeMove(newInode, inode, meta, id, index), [onInodeMove, inode, meta, id, index])}
            openGallery={useCallback(() => openGallery(index), [openGallery, index])}
            {...props}
        />
    );
}
