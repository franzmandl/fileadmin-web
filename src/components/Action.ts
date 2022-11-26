export enum Action {
    view = 'view',
    edit = 'edit',
    reload = 'reload',
    delete = 'delete',
    add = 'add',
}

const actions: ReadonlyArray<string | null> = Object.values(Action);

export function parseAction(action: string | null): Action {
    return actions.indexOf(action) !== -1 ? (action as Action) : Action.view;
}

export const keyToAction = Object.freeze<Record<string, Action | undefined>>({
    v: Action.view,
    e: Action.edit,
    r: Action.reload,
    a: Action.add,
    d: Action.delete,
});
