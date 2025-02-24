import {serverPath, constant} from 'common/constants';
import {Ided} from 'common/Ided';
import {useDelayed} from 'common/useDelayed';
import {arrayAdd, arrayRemove, arrayReplace, useLatest, useDepsEffect} from 'common/ReactUtil';
import {alwaysThrow, encodePath, getIndentOfLastLine, identity, newLine, resolvePath} from 'common/Util';
import {Action} from 'components/Action';
import {createSaveIcon} from './SaveIcon';
import {Inode} from 'dto/Inode';
import React, {Dispatch, ForwardedRef, forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {LineMeta, LineComponent, OnTagClick} from './LineComponent';
import {FileContent} from 'dto/FileContent';
import {TriggerableAction} from 'common/TriggerableAction';
import {SaveState} from './SaveState';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {SuggestionControl} from 'components/textarea/RichTextarea';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import {useListener} from 'common/useListener';

interface Lines {
    readonly lastModifiedMilliseconds?: number;
    readonly saved: SaveState;
    readonly values: ReadonlyArray<Ided<string, LineMeta>>;
}

export const FileComponent = forwardRef(function FileComponent(
    {
        action,
        context: {
            actionChangeListeners,
            appContext: {appStore, consoleStore, inodeStore},
        },
        filterHighlightTags,
        inode,
        setInode,
        onTagClick,
        suggestionControl,
    }: {
        readonly action: Action;
        readonly context: DirectoryPageContext;
        readonly filterHighlightTags: ReadonlySet<string>;
        readonly inode: Inode;
        readonly setInode: Dispatch<Inode>;
        readonly onTagClick: OnTagClick;
        readonly suggestionControl: SuggestionControl;
    },
    forwardedRef: ForwardedRef<TriggerableAction>,
): React.JSX.Element {
    const lineIdRef = useRef(0);
    const [lines, setLines] = useState<Lines>({saved: SaveState.saved, values: []});
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const indicateLoading = useAsyncCallback(
        (promise: Promise<FileContent>) => {
            setIsLoading(true);
            return promise;
        },
        identity,
        alwaysThrow,
        () => setIsLoading(false),
    );
    const loadInode = useAsyncCallback(() => inodeStore.getInode(inode.path, inode), setInode, consoleStore.handleError);
    const loadPromiseRef = useRef<Promise<FileContent>>();
    const load = useAsyncCallback(
        () => {
            loadInode();
            const promise = inodeStore.getFile(inode.path);
            loadPromiseRef.current = lineIdRef.current === 0 ? indicateLoading(promise) : appStore.indicateLoading(promise);
            return loadPromiseRef.current;
        },
        ({lastModifiedMilliseconds, value}) => {
            setLines({
                lastModifiedMilliseconds,
                saved: SaveState.saved,
                values: value.split(newLine).map((data) => ({id: `${lineIdRef.current++}`, data, meta: {isEdit: false}})),
            });
            loadPromiseRef.current = undefined;
        },
        consoleStore.handleError,
    );

    useDepsEffect(() => {
        load();
        return () => saveNowIfUnsavedRef.current();
    }, []);

    const {doDelayed: saveDelayed, doNow: saveNow} = useDelayed(
        appStore.enterPreventClose,
        useAsyncCallback(
            () => {
                const value = lines.values.map(({data}) => data).join(newLine);
                setLines(({lastModifiedMilliseconds, values}) => ({
                    lastModifiedMilliseconds,
                    saved: SaveState.saved,
                    values,
                })); // Must use prev.
                return appStore.preventClose(
                    inodeStore.putFile(inode.path, {lastModifiedMilliseconds: lines.lastModifiedMilliseconds, value}, inode),
                );
            },
            (newInode) => {
                setInode(newInode);
                setLines(({saved, values}) => ({lastModifiedMilliseconds: newInode.lastModifiedMilliseconds, saved, values})); // Must use prev.
            },
            (error) => {
                setLines(({lastModifiedMilliseconds, values}) => ({
                    lastModifiedMilliseconds,
                    saved: SaveState.failed,
                    values,
                })); // Must use prev.
                consoleStore.handleError(error);
            },
            appStore.exitPreventClose,
        ),
        constant.saveTimeoutMs,
    );

    const saveNowIfUnsaved = (): void => {
        if (lines.saved !== SaveState.saved) {
            saveNow();
        }
    };
    const saveNowIfUnsavedRef = useLatest(saveNowIfUnsaved);

    useDepsEffect(() => {
        if (lines.saved === SaveState.waiting) {
            saveDelayed();
        }
    }, [lines]);

    useDepsEffect(() => {
        if (action === Action.view || action === Action.reload) {
            saveNowIfUnsaved();
        }
    }, [action]);

    const getServerUrl = (relativePath: string, isThumbnail: boolean): string => {
        const encodedPath = encodePath(resolvePath(inode.realParentPath, relativePath));
        return isThumbnail
            ? serverPath.authenticatedPath.fileConvertImageToImage(encodedPath, constant.markdownImageDimension)
            : serverPath.authenticatedPath.file(encodedPath);
    };

    useListener(
        (nextAction: Action, prevAction: Action): void => {
            setLines(({lastModifiedMilliseconds, saved, values}) => ({
                // Must use prev.
                lastModifiedMilliseconds,
                saved,
                values: values.map(({id, data, meta: {isEdit, ...meta}}) => ({
                    id,
                    data,
                    meta: {...meta, isEdit: isEdit && nextAction === Action.edit && nextAction !== prevAction},
                })),
            }));
        },
        (listener): void => actionChangeListeners.add(listener),
        (listener): void => actionChangeListeners.remove(listener),
        [actionChangeListeners],
    );

    const addLine = useAsyncCallback<unknown, [number], void>(
        () => loadPromiseRef.current,
        (_, index) =>
            setLines(({lastModifiedMilliseconds, values}) => {
                // Must use prev.
                const indent = getIndentOfLastLine(values[index]?.data ?? '');
                const cursorPosition = indent.length;
                return {
                    lastModifiedMilliseconds,
                    saved: SaveState.waiting,
                    values: mergeIsEditLines(
                        arrayAdd(values, index + 1, {
                            id: `${lineIdRef.current++}`,
                            data: indent,
                            meta: {/* cursorPosition gets set by mergeIsEditLines. */ isEdit: true},
                        }),
                        index + 1,
                        cursorPosition,
                    ),
                };
            }),
        consoleStore.handleError,
    );

    const setIsEditTrue = (index: number, cursorPosition: number): void => {
        setLines(({lastModifiedMilliseconds, saved, values}) => ({
            // Must use prev.
            lastModifiedMilliseconds,
            saved,
            values: mergeIsEditLines(values, index, cursorPosition),
        }));
    };

    const setLineValue = useAsyncCallback<unknown, [string, number], void>(
        () => loadPromiseRef.current,
        (_, data, index) =>
            setLines(({lastModifiedMilliseconds, values}) => ({
                // Must use prev.
                lastModifiedMilliseconds,
                saved: SaveState.waiting,
                values: arrayReplace(values, index, {...values[index], data}),
            })),
        consoleStore.handleError,
    );

    const deleteLine = useAsyncCallback<boolean, [string, number], void>(
        (line) =>
            appStore.confirm(
                <>
                    Deleting line: <pre className='overflow-auto'>{line}</pre>
                </>,
            ),
        (value, _, index) => (value ? deleteLineImmediately(index) : undefined),
        consoleStore.handleError,
    );
    const deleteLineImmediately = useAsyncCallback<unknown, [number], void>(
        () => loadPromiseRef.current,
        (_, index) =>
            setLines(({lastModifiedMilliseconds, values}) => {
                // Must use prev.
                // There should always be at least one value in values.
                const nextValues = arrayRemove(values, index);
                if (nextValues.length === 0) {
                    nextValues.push({id: `${lineIdRef.current++}`, data: '', meta: {isEdit: false}});
                }
                return {
                    lastModifiedMilliseconds,
                    saved: SaveState.waiting,
                    values: nextValues,
                };
            }),
        consoleStore.handleError,
    );

    const handleParentActionRef = useLatest((localAction: Action, index: number, handled: () => void) => {
        if (localAction === Action.reload) {
            load();
            handled();
        } else if (localAction === Action.add && inode.operation.canFileSet) {
            addLine(index);
            handled();
        }
    });

    useImperativeHandle(
        forwardedRef,
        () => ({
            triggerAction: (localAction, handled) => handleParentActionRef.current(localAction, -1, handled),
        }),
        [handleParentActionRef],
    );

    const handleAction = (localAction: Action, line: string, index: number, cursorPosition: number, handled: () => void): void => {
        if (localAction === Action.edit && inode.operation.canFileSet) {
            setIsEditTrue(index, cursorPosition);
            handled();
        } else if (localAction === Action.delete && inode.operation.canFileSet) {
            deleteLine(line, index);
            handled();
        } else {
            handleParentActionRef.current(localAction, index, handled);
        }
    };

    return (
        <>
            <i className='ps-2' hidden={!isLoading}>
                Loading ...
            </i>
            <div className='sticky-top'>{createSaveIcon(lines.saved)}</div>
            {lines.values.map(({id, data, meta}, index) => (
                <LineComponent
                    key={id}
                    action={action}
                    filterHighlightTags={filterHighlightTags}
                    getServerUrl={getServerUrl}
                    handleAction={handleAction}
                    setKeyboardControl={appStore.setKeyboardControl}
                    line={data}
                    meta={meta}
                    onTagClick={onTagClick}
                    parentIndex={index}
                    save={saveNowIfUnsaved}
                    spellCheck={appStore.appParameter.values.spellCheck}
                    setParentValue={setLineValue}
                    suggestionControl={suggestionControl}
                />
            ))}
        </>
    );
});

function mergeIsEditLines(
    values: ReadonlyArray<Ided<string, LineMeta>>,
    editIndex: number,
    editCursorPosition: number,
): ReadonlyArray<Ided<string, LineMeta>> {
    const result: Ided<string, LineMeta>[] = [];
    let cursorPosition: number | undefined;
    let editId: string | undefined;
    const valueBuilder: string[] = [];
    values.forEach((current, index) => {
        if (isLineEdit(index)) {
            if (editIndex === index) {
                cursorPosition = editCursorPosition;
                for (const value of valueBuilder) {
                    cursorPosition += value.length + newLine.length;
                }
                editId = current.id;
            }
            valueBuilder.push(current.data);
            if (!isLineEdit(index + 1)) {
                result.push({id: editId ?? current.id, data: valueBuilder.join(newLine), meta: {cursorPosition, isEdit: true}});
                cursorPosition = undefined;
                editId = undefined;
                valueBuilder.length = 0;
            }
        } else {
            result.push(current);
        }
    });
    return result;

    function isLineEdit(index: number): boolean {
        return values[index]?.meta.isEdit || editIndex === index;
    }
}
