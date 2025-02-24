import classNames from 'classnames';
import {constant} from 'common/constants';
import {separator} from 'common/Util';
import {Inode} from 'dto/Inode';
import {Task} from 'dto/Task';
import React from 'react';
import {DropdownItem} from 'reactstrap';
import {AppContext} from 'stores/AppContext';

export function TaskDropdownItems({
    context,
    inode,
    move,
    task,
}: {
    readonly context: AppContext;
    readonly inode: Inode;
    readonly move: (relativeDestination: string, onSuccess: () => void) => void;
    readonly task: Task;
}): React.JSX.Element {
    const actions = Object.keys(task.actions);
    if (actions.length === 0) {
        return <></>;
    }
    return (
        <>
            <DropdownItem header>Task</DropdownItem>
            {actions.sort().map((action) => (
                <TaskDropdownItem key={action} action={action} context={context} inode={inode} move={move} task={task} />
            ))}
        </>
    );
}

function TaskDropdownItem({
    action,
    context: {appStore},
    inode,
    move,
    task,
}: {
    readonly action: string;
    readonly context: AppContext;
    readonly inode: Inode;
    readonly move: (relativeDestination: string, onSuccess: () => void) => void;
    readonly task: Task;
}): React.JSX.Element {
    const {friendlyName, className} = constant.knownTaskActions.get(action) ?? {friendlyName: action, className: ''};
    const relativeDestination = task.actions[action];
    const isMoved = relativeDestination === inode.name;
    return (
        <DropdownItem
            className={isMoved ? undefined : className}
            disabled={isMoved}
            onClick={(): void =>
                move(relativeDestination, () =>
                    appStore.toast(
                        <>
                            {relativeDestination.indexOf(separator) !== -1 ? 'Moved to' : 'Set to'}&nbsp;
                            <span className={classNames('badge', className)}>{friendlyName}</span>
                        </>,
                    ),
                )
            }
            title={relativeDestination}
        >
            {friendlyName}
        </DropdownItem>
    );
}
