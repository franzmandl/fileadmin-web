import React, {Dispatch, ForwardedRef, forwardRef, Fragment, useCallback, useImperativeHandle, useRef, useState} from 'react';
import {Inode} from '../model/Inode';
import {alwaysThrow, getBasename, identity, isAnyType, Type} from '../common/Util';
import {InodeComponent, InodeComponentProps, InodeMeta} from './InodeComponent';
import {AddInodeComponent} from './AddInodeComponent';
import {Action} from './Action';
import {Ided} from 'common/Ided';
import {DirectoryBreadcrumb} from './DirectoryBreadcrumb';
import {NewInode} from 'model/NewInode';
import {Settings} from 'model/Settings';
import {TriggerableAction} from 'common/TriggerableAction';
import {arrayAdd, arrayRemove, arrayReplace, useConditionalEffect, useDepsEffect} from 'common/ReactUtil';
import {GalleryEvent} from './GalleryControl';
import {useLatest} from 'common/ReactUtil';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Directory} from 'model/Directory';

export const DirectoryComponent = forwardRef(function DirectoryComponent(
    {
        context,
        decentDirectory,
        inode,
        isFirstLevel,
        setInode,
        setIsReady,
        path,
        spellCheck,
    }: {
        readonly context: DirectoryPageContext;
        readonly decentDirectory: boolean;
        readonly inode: Inode;
        readonly isFirstLevel: boolean;
        readonly setInode: Dispatch<Inode>;
        readonly setIsReady?: Dispatch<boolean>;
        readonly path: string;
        readonly spellCheck: boolean;
    },
    ref: ForwardedRef<TriggerableAction>
): JSX.Element {
    const {
        action,
        appContext: {appStore, authenticationStore, consoleStore, galleryStore, inodeStore},
        comparator,
    } = context;
    const [addInodeAfterIndex, setAddInodeAfterIndex] = useState<number>();
    const [idedInodes, setIdedInodes] = useState<ReadonlyArray<Ided<Inode, InodeMeta>>>([]);
    const inodeIdRef = useRef(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useDepsEffect(() => {
        if (action !== Action.edit && action !== Action.add) {
            setAddInodeAfterIndex(undefined);
        }
    }, [action]);
    const [settings, setSettings] = useState<Settings>();

    const onInodeChange = useCallback((data: Inode, meta: InodeMeta, id: string, index: number): void => {
        setIdedInodes((prev) => arrayReplace(prev, index, {id, data, meta}));
    }, []);

    const loadInode = useAsyncCallback(() => inodeStore.getInode(path), setInode, consoleStore.handleError);

    const onInodeMove = useCallback(
        (newInode: Inode, oldInode: Inode, meta: InodeMeta, id: string, index: number): void => {
            const nextIdedInodes = [...idedInodes];
            if (newInode.dirname === oldInode.dirname) {
                nextIdedInodes.splice(index, 1, {id, data: newInode, meta});
            } else {
                nextIdedInodes.splice(index, 1);
            }
            setIdedInodes(nextIdedInodes);
            loadInode();
        },
        [idedInodes, loadInode]
    );

    const onInodeRemove = useCallback(
        (oldInode: Inode, index: number): void => {
            setIdedInodes(arrayRemove(idedInodes, index));
            loadInode();
        },
        [idedInodes, loadInode]
    );

    const add = useAsyncCallback<Inode, [NewInode, number], void>(
        (newInode) => appStore.indicateLoading(appStore.preventClose(inodeStore.add(path, newInode))),
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
            // Must happen in next tick because of setInodes(emptyIdedInodes).
            setInode(data.inode);
            setSettings(data.settings);
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
        const {discriminator, oldInode} = ev;
        const index = idedInodes.findIndex(({data}) => data === oldInode);
        if (index === -1) {
            consoleStore.logError('Index of inode not found: ' + JSON.stringify(oldInode));
            return;
        }
        switch (discriminator) {
            case 'move': {
                const {newInode} = ev;
                const {id, meta} = idedInodes[index];
                onInodeMove(newInode, oldInode, meta, id, index);
                break;
            }
            case 'remove': {
                onInodeRemove(oldInode, index);
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
            if (inode.isDirectory && inode.canWrite) {
                setAddInodeAfterIndex((prev) => (prev === localAddInodeAtIndex ? undefined : localAddInodeAtIndex));
                handled();
            }
        },
        [inode.canWrite, inode.isDirectory]
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
            triggerAction: (localAction, handled) => handleAction(localAction, -1, handled),
        }),
        [handleAction]
    );

    const outerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={outerRef}>
            <DirectoryBreadcrumb
                disabled={action !== Action.view}
                onClick={useCallback((ev) => handleAction(action, -1, () => ev.stopPropagation()), [action, handleAction])}
                path={path}
            />
            <hr className='m-0' />
            <div hidden={!isLoading}>
                <i>Loading ...</i>
                <hr className='m-0' />
            </div>
            {settings !== undefined && addInodeAfterIndex === -1 && (
                <AddInodeComponent
                    addInodeAfterIndex={addInodeAfterIndex}
                    basenameCursorPosition={settings.basenameCursorPosition}
                    setKeyboardControl={appStore.setKeyboardControl}
                    newInodeTemplate={settings.newInodeTemplate}
                    onAdd={add}
                    spellCheck={spellCheck}
                />
            )}
            {settings !== undefined &&
                idedInodes.map(({id, data, meta}, index) => (
                    <Fragment key={id}>
                        <SequentialInodeComponent
                            basenameCursorPosition={settings.basenameCursorPosition}
                            context={context}
                            decentDirectory={decentDirectory}
                            handleAddAction={handleAddAction}
                            id={id}
                            index={index}
                            inode={data}
                            setInode={onInodeChange}
                            isFirstLevel={isFirstLevel}
                            meta={meta}
                            onInodeMove={onInodeMove}
                            onInodeRemove={onInodeRemove}
                            openGallery={openGallery}
                            parentDir={path}
                            settings={settings}
                            spellCheck={spellCheck}
                        />
                        {addInodeAfterIndex === index && (
                            <AddInodeComponent
                                addInodeAfterIndex={addInodeAfterIndex}
                                basenameCursorPosition={settings.basenameCursorPosition}
                                setKeyboardControl={appStore.setKeyboardControl}
                                newInodeTemplate={settings.newInodeTemplate}
                                onAdd={add}
                                spellCheck={spellCheck}
                            />
                        )}
                    </Fragment>
                ))}
            <div
                className='hoverable overflow-auto p-2 text-muted text-nowrap'
                onClick={useCallback(
                    (ev: React.MouseEvent) => handleAction(action, idedInodes.length - 1, () => ev.stopPropagation()),
                    [action, handleAction, idedInodes.length]
                )}
            >
                <span className='mdi mdi-folder-upload' /> {getBasename(path)}
            </div>
        </div>
    );
});

const emptyIdedInodes: ReadonlyArray<Ided<Inode, InodeMeta>> = [];

function SequentialInodeComponent({
    handleAddAction,
    id,
    index,
    setInode,
    onInodeMove,
    onInodeRemove,
    openGallery,
    ...props
}: {
    readonly handleAddAction: (index: number, handled: () => void) => void;
    readonly id: string;
    readonly index: number;
    readonly setInode: (newInode: Inode, meta: InodeMeta, id: string, index: number) => void;
    readonly onInodeMove: (newInode: Inode, oldInode: Inode, meta: InodeMeta, id: string, index: number) => void;
    readonly onInodeRemove: (oldInode: Inode, index: number) => void;
    readonly openGallery: (index: number) => void;
} & InodeComponentProps): JSX.Element {
    const {inode, meta} = props;
    return (
        <InodeComponent
            handleAddAction={useCallback((handled) => handleAddAction(index, handled), [handleAddAction, index])}
            setInode={useCallback((newInode: Inode) => setInode(newInode, meta, id, index), [setInode, meta, id, index])}
            onMove={useCallback((newInode: Inode) => onInodeMove(newInode, inode, meta, id, index), [onInodeMove, inode, meta, id, index])}
            onRemove={useCallback(() => onInodeRemove(inode, index), [index, inode, onInodeRemove])}
            openGallery={useCallback(() => openGallery(index), [openGallery, index])}
            {...props}
        />
    );
}