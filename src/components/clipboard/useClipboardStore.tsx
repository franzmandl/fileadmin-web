import {useMemo} from 'react';
import {ClipboardControl, ClipboardItem} from './ClipboardControl';
import {useLocalStorage} from 'common/useLocalStorage';
import {AppStore} from 'stores/useAppStore';
import {ConsoleStore} from 'components/console/useConsoleStore';
import {InodeStore} from 'stores/InodeStore';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {separator} from 'common/Util';
import {useLatest} from 'common/ReactUtil';
import {InodeEventBus} from 'stores/InodeEventBus';
import {LocalStorageKey} from 'common/constants';

export interface ClipboardStore {
    readonly clear: () => void;
    readonly cut: (id: string, item: ClipboardItem) => void;
    readonly has: (id: string) => boolean;
    readonly paste: (path: string) => void;
    readonly remove: (id: string) => void;
}

export function useClipboardStore(
    appStore: AppStore,
    consoleStore: ConsoleStore,
    inodeEventBus: InodeEventBus,
    inodeStore: InodeStore,
): {
    readonly clipboardControl: ClipboardControl;
    readonly clipboardStore: ClipboardStore;
} {
    const [clipboardControl, setClipboardControl] = useLocalStorage(LocalStorageKey.clipboard, decode, encode);
    const setClipboardControlRef = useLatest(setClipboardControl);
    const move = useAsyncCallback(
        (newParentPath: string, oldPath: string, item: ClipboardItem) => inodeStore.move(oldPath, newParentPath + separator + item.name),
        (newInode, _, oldPath, item) => {
            setClipboardControl((prev) => remove(prev, oldPath));
            inodeEventBus.fireMove(newInode, oldPath, item.parentPath);
        },
        consoleStore.handleError,
    );
    const bulkMoveRef = useLatest(
        useAsyncCallback(
            (newParentPath: string, items: IterableIterator<[string, ClipboardItem]>) =>
                appStore.indicateLoading(
                    appStore.preventClose(Promise.allSettled(Array.from(items, ([id, item]) => move(newParentPath, id, item)))),
                ),
            (promiseResults) => appStore.toast(getToastMessage(promiseResults)),
            consoleStore.handleError,
        ),
    );
    return {
        clipboardControl,
        clipboardStore: useMemo(
            () => ({
                clear: (): void => setClipboardControlRef.current(() => empty),
                cut: (id, item): void => setClipboardControlRef.current((prev) => cut(prev, id, item)),
                has: (id): boolean => clipboardControl.items.has(id),
                paste: (path): void => void bulkMoveRef.current(path, clipboardControl.items.entries()),
                remove: (id): void => setClipboardControlRef.current((prev) => remove(prev, id)),
            }),
            [bulkMoveRef, clipboardControl, setClipboardControlRef],
        ),
    };
}

function getToastMessage(promiseResults: ReadonlyArray<PromiseSettledResult<unknown>>): string {
    let fulfilledCount = 0;
    let rejectedCount = 0;
    promiseResults.forEach((promiseResult) => {
        switch (promiseResult.status) {
            case 'fulfilled':
                fulfilledCount++;
                break;
            case 'rejected':
                rejectedCount++;
                break;
        }
    });
    return `${fulfilledCount} successful` + (rejectedCount > 0 ? `. ${rejectedCount} failed` : '');
}

function cut(prev: ClipboardControl, id: string, item: ClipboardItem): ClipboardControl {
    const items = new Map(prev.items);
    items.set(id, item);
    return {items};
}

function remove(prev: ClipboardControl, id: string): ClipboardControl {
    const items = new Map(prev.items);
    return items.delete(id) ? {items} : prev;
}

const empty: ClipboardControl = {items: new Map()};

function decode(raw: string | null): ClipboardControl {
    return raw !== null ? {items: new Map(JSON.parse(raw))} : empty;
}

function encode(clipboardControl: ClipboardControl): string | null {
    return JSON.stringify([...clipboardControl.items]);
}
