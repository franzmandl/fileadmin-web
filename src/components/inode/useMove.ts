import {useAsyncCallback} from 'common/useAsyncCallback';
import {AppContext} from 'stores/AppContext';
import {Inode} from 'dto/Inode';
import {resolvePath} from 'common/Util';

export function useMove({
    context: {appStore, inodeStore, consoleStore},
    newParentPath,
    oldPath,
    onMove,
}: {
    readonly context: AppContext;
    readonly newParentPath: string;
    readonly oldPath: string;
    readonly onMove: (newInode: Inode) => void;
}): (newPath: string, onSuccess?: () => void) => Promise<void> {
    return useAsyncCallback(
        (newPath: string) => appStore.indicateLoading(appStore.preventClose(inodeStore.move(oldPath, resolvePath(newParentPath, newPath)))),
        (newInode, _, onSuccess?: () => void) => {
            onMove(newInode);
            onSuccess?.();
        },
        consoleStore.handleError,
    );
}
