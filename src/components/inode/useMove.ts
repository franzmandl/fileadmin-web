import {useAsyncCallback} from 'common/useAsyncCallback';
import {AppContext} from 'stores/AppContext';
import {Inode} from 'model/Inode';

export function useMove({
    context: {appStore, inodeStore, consoleStore},
    inode,
    onMove,
}: {
    readonly context: AppContext;
    readonly inode: Inode;
    readonly onMove: (newInode: Inode) => void;
}): (relativeDestination: string, onSuccess?: () => void) => Promise<void> {
    return useAsyncCallback(
        (relativeDestination: string) => appStore.indicateLoading(appStore.preventClose(inodeStore.move(inode, relativeDestination))),
        (newInode, _, onSuccess?: () => void) => {
            onMove(newInode);
            onSuccess?.();
        },
        consoleStore.handleError
    );
}
