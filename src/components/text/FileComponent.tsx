import {serverPath, constant} from 'common/constants';
import {Ided} from 'common/Ided';
import {useDelayed} from 'common/useDelayed';
import {useLatest, useDepsEffect} from 'common/ReactUtil';
import {alwaysThrow, appendSeparatorIfNecessary, encodePath, getIndentOfLastLine, identity, newLine, separator} from 'common/Util';
import {Action} from 'components/Action';
import {createSaveIcon} from 'components/SaveIcon';
import {Inode} from 'model/Inode';
import {Dispatch, ForwardedRef, forwardRef, useCallback, useImperativeHandle, useRef, useState} from 'react';
import {LineMeta, LineComponent} from './LineComponent';
import {FileContent} from 'model/FileContent';
import {AppContext} from 'stores/AppContext';
import {TriggerableAction} from 'common/TriggerableAction';
import {arrayAdd, arrayRemove, arrayReplace} from 'common/ReactUtil';
import {SaveState} from 'components/SaveState';
import {useAsyncCallback} from 'common/useAsyncCallback';

interface Lines {
    readonly lastModified: number;
    readonly saved: SaveState;
    readonly values: ReadonlyArray<Ided<string, LineMeta>>;
}

export const FileComponent = forwardRef(function FileComponent(
    {
        action,
        context: {appStore, consoleStore, inodeStore},
        inode,
        setInode,
        spellCheck,
    }: {
        readonly action: Action;
        readonly context: AppContext;
        readonly inode: Inode;
        readonly setInode: Dispatch<Inode>;
        readonly spellCheck: boolean;
    },
    ref: ForwardedRef<TriggerableAction>
): JSX.Element {
    const lineIdRef = useRef(0);
    const [lines, setLines] = useState<Lines>({lastModified: 0, saved: SaveState.saved, values: []});
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const indicateLoading = useAsyncCallback(
        (promise: Promise<FileContent>) => {
            setIsLoading(true);
            return promise;
        },
        identity,
        alwaysThrow,
        () => setIsLoading(false)
    );
    const loadInode = useAsyncCallback(() => inodeStore.getInode(inode.path), setInode, consoleStore.handleError);
    const loadPromiseRef = useRef<Promise<FileContent>>();
    const load = useAsyncCallback(
        () => {
            loadInode();
            const promise = inodeStore.getFile(inode.path);
            loadPromiseRef.current = lineIdRef.current === 0 ? indicateLoading(promise) : appStore.indicateLoading(promise);
            return loadPromiseRef.current;
        },
        (content) => {
            setLines({
                lastModified: content.lastModified,
                saved: SaveState.saved,
                values: content.value.split(newLine).map((data) => ({id: `${lineIdRef.current++}`, data, meta: {isEdit: false}})),
            });
            loadPromiseRef.current = undefined;
        },
        consoleStore.handleError
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
                setLines(({lastModified, values}) => ({lastModified, saved: SaveState.saved, values})); // Must use prev.
                return appStore.preventClose(inodeStore.putFile(inode.path, {lastModified: lines.lastModified, value}));
            },
            (newInode) => {
                setInode(newInode);
                setLines(({saved, values}) => ({lastModified: newInode.lastModified, saved, values})); // Must use prev.
            },
            (error) => {
                setLines(({lastModified, values}) => ({lastModified, saved: SaveState.failed, values})); // Must use prev.
                consoleStore.handleError(error);
            },
            appStore.exitPreventClose
        ),
        constant.saveTimeoutMs
    );

    const saveNowIfUnsaved = useCallback(() => {
        if (lines.saved !== SaveState.saved) {
            saveNow();
        }
    }, [lines.saved, saveNow]);
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

    const getAbsoluteUrl = useCallback(
        (relativePath: string, isThumbnail: boolean) => {
            const encodedPath = encodePath(separator + appendSeparatorIfNecessary(inode.realDirname) + relativePath);
            return isThumbnail ? serverPath.authenticatedPath.thumbnail(encodedPath, 360) : serverPath.authenticatedPath.file(encodedPath);
        },
        [inode.realDirname]
    );

    useDepsEffect(
        () =>
            setLines(({lastModified, saved, values}) => ({
                // Must use prev.
                lastModified,
                saved,
                values: values.map(({id, data, meta: {isEdit, ...meta}}) => ({
                    id,
                    data,
                    meta: {...meta, isEdit: action === Action.edit && isEdit},
                })),
            })),
        [action]
    );

    const addLine = useAsyncCallback<unknown, [number], void>(
        () => loadPromiseRef.current,
        (_, index) =>
            setLines(({lastModified, values}) => {
                // Must use prev.
                const indent = getIndentOfLastLine(values[index]?.data ?? '');
                const cursorPosition = indent.length;
                return {
                    lastModified,
                    saved: SaveState.waiting,
                    values: mergeIsEditLines(
                        arrayAdd(values, index + 1, {
                            id: `${lineIdRef.current++}`,
                            data: indent,
                            meta: {/* cursorPosition gets set by mergeIsEditLines. */ isEdit: true},
                        }),
                        index + 1,
                        cursorPosition
                    ),
                };
            }),
        consoleStore.handleError
    );

    const setIsEditTrue = useCallback((index: number, cursorPosition: number) => {
        setLines(({lastModified, saved, values}) => ({
            // Must use prev.
            lastModified,
            saved,
            values: mergeIsEditLines(values, index, cursorPosition),
        }));
    }, []);

    const setLineValue = useAsyncCallback<unknown, [string, number], void>(
        () => loadPromiseRef.current,
        (_, data, index) =>
            setLines(({lastModified, values}) => ({
                // Must use prev.
                lastModified,
                saved: SaveState.waiting,
                values: arrayReplace(values, index, {...values[index], data}),
            })),
        consoleStore.handleError
    );

    const removeLine = useAsyncCallback<boolean, [string, number], void>(
        (line) =>
            appStore.confirm(
                <>
                    Removing line: <pre className='overflow-auto'>{line}</pre>
                </>
            ),
        (value, _, index) => (value ? removeLineImmediately(index) : undefined),
        consoleStore.handleError
    );
    const removeLineImmediately = useAsyncCallback<unknown, [number], void>(
        () => loadPromiseRef.current,
        (_, index) =>
            setLines(({lastModified, values}) => {
                // Must use prev.
                // There should always be at least one value in values.
                const nextValues = arrayRemove(values, index);
                if (nextValues.length === 0) {
                    nextValues.push({id: `${lineIdRef.current++}`, data: '', meta: {isEdit: false}});
                }
                return {
                    lastModified,
                    saved: SaveState.waiting,
                    values: nextValues,
                };
            }),
        consoleStore.handleError
    );

    const handleParentAction = useCallback(
        (localAction: Action, index: number, handled: () => void) => {
            if (localAction === Action.reload) {
                load();
                handled();
            } else if (localAction === Action.add) {
                addLine(index);
                handled();
            }
        },
        [addLine, load]
    );

    useImperativeHandle(
        ref,
        () => ({
            triggerAction: (localAction, handled) => handleParentAction(localAction, -1, handled),
        }),
        [handleParentAction]
    );

    const handleAction = useCallback(
        (localAction: Action, line: string, index: number, cursorPosition: number, handled: () => void) => {
            if (localAction === Action.edit) {
                setIsEditTrue(index, cursorPosition);
                handled();
            } else if (localAction === Action.delete) {
                removeLine(line, index);
                handled();
            } else {
                handleParentAction(localAction, index, handled);
            }
        },
        [handleParentAction, removeLine, setIsEditTrue]
    );

    return (
        <>
            <i hidden={!isLoading}>Loading ...</i>
            <div className='sticky-top'>{createSaveIcon(lines.saved)}</div>
            {lines.values.map(({id, data, meta}, index) => (
                <LineComponent
                    key={id}
                    action={action}
                    getAbsoluteUrl={getAbsoluteUrl}
                    handleAction={handleAction}
                    setKeyboardControl={appStore.setKeyboardControl}
                    line={data}
                    meta={meta}
                    parentIndex={index}
                    save={saveNowIfUnsaved}
                    spellCheck={spellCheck}
                    setParentValue={setLineValue}
                />
            ))}
        </>
    );
});

function mergeIsEditLines(
    values: ReadonlyArray<Ided<string, LineMeta>>,
    editIndex: number,
    editCursorPosition: number
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

    function isLineEdit(index: number) {
        return values[index]?.meta.isEdit || editIndex === index;
    }
}
