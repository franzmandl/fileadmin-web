import {Inode} from 'dto/Inode';

export interface InodeAddEvent {
    readonly inode: Inode;
}

export interface InodeDeleteEvent {
    readonly path: string;
}

export interface InodeRenameEvent {
    readonly newInode: Inode;
    readonly oldPath: string;
}

export type InodeEvent =
    | ({readonly _type: 'add'} & InodeAddEvent)
    | ({readonly _type: 'delete'} & InodeDeleteEvent)
    | ({readonly _type: 'rename'} & InodeRenameEvent);

export type InodeEventListener = (ev: InodeEvent) => void;

export class InodeEventBus {
    private readonly listenerSets = new Map<string, Set<InodeEventListener>>();

    readonly addListener = (path: string, listener: InodeEventListener): void => {
        this.getOrCreateListenerSet(path).add(listener);
    };

    readonly removeListener = (path: string, listener: InodeEventListener): void => {
        const listenerSet = this.getOrCreateListenerSet(path);
        listenerSet.delete(listener);
        if (listenerSet.size === 0) {
            this.listenerSets.delete(path);
        }
    };

    readonly fire = (path: string, ev: InodeEvent): void => {
        const listenerSet = this.listenerSets.get(path);
        if (listenerSet !== undefined) {
            listenerSet.forEach((listener) => listener(ev));
        }
    };

    readonly fireMove = (newInode: Inode, oldPath: string, oldParentPath: string): void => {
        if (newInode.parentPath === oldParentPath) {
            this.fire(oldParentPath, {_type: 'rename', newInode, oldPath});
        } else {
            this.fire(oldParentPath, {_type: 'delete', path: oldPath});
            this.fire(newInode.parentPath, {_type: 'add', inode: newInode});
        }
    };

    private readonly getOrCreateListenerSet = (path: string): Set<InodeEventListener> => {
        return this.listenerSets.get(path) ?? this.createListenerSet(path);
    };

    private readonly createListenerSet = (path: string): Set<InodeEventListener> => {
        const listenerSet = new Set<InodeEventListener>();
        this.listenerSets.set(path, listenerSet);
        return listenerSet;
    };
}
