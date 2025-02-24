export enum Action {
    view = 'view',
    edit = 'edit',
    add = 'add',
    cut = 'cut',
    paste = 'paste',
    reload = 'reload',
    delete = 'delete',
}

const actions: ReadonlyArray<string> = Object.values(Action);

export function parseAction(value: string | null): Action | null {
    return value !== null && actions.indexOf(value) !== -1 ? (value as Action) : null;
}

export const keyToAction = Object.freeze<Record<string, Action | undefined>>({
    v: Action.view,
    e: Action.edit,
    a: Action.add,
    c: Action.cut,
    p: Action.paste,
    r: Action.reload,
    d: Action.delete,
    Delete: Action.delete,
    Escape: Action.view,
    F2: Action.edit,
});
