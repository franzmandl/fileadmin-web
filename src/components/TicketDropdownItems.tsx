import classNames from 'classnames';
import {constant} from 'common/constants';
import {separator} from 'common/Util';
import {Inode} from 'model/Inode';
import {Ticket} from 'model/Ticket';
import {useCallback} from 'react';
import {DropdownItem} from 'reactstrap';
import {AppContext} from 'stores/AppContext';

export function TicketDropdownItems({
    context,
    inode,
    move,
    ticket,
}: {
    readonly context: AppContext;
    readonly inode: Inode;
    readonly move: (relativeDestination: string, onSuccess: () => void) => void;
    readonly ticket: Ticket;
}): JSX.Element {
    const actions = Object.keys(ticket.actions);
    if (actions.length === 0) {
        return <></>;
    }
    return (
        <>
            <DropdownItem header>Ticket</DropdownItem>
            {actions.sort().map((action) => (
                <TicketDropdownItem key={action} action={action} context={context} inode={inode} move={move} ticket={ticket} />
            ))}
        </>
    );
}

function TicketDropdownItem({
    action,
    context: {appStore},
    inode,
    move,
    ticket,
}: {
    readonly action: string;
    readonly context: AppContext;
    readonly inode: Inode;
    readonly move: (relativeDestination: string, onSuccess: () => void) => void;
    readonly ticket: Ticket;
}): JSX.Element {
    const {friendlyName, className} = constant.knownTicketActions[action] ?? {friendlyName: action, className: ''};
    const relativeDestination = ticket.actions[action];
    const isMoved = relativeDestination === inode.basename;
    return (
        <DropdownItem
            className={isMoved ? undefined : className}
            disabled={isMoved}
            onClick={useCallback(
                () =>
                    move(relativeDestination, () =>
                        appStore.toast(
                            <>
                                {relativeDestination.indexOf(separator) !== -1 ? 'Moved to' : 'Set to'}&nbsp;
                                <span className={classNames('badge', className)}>{friendlyName}</span>
                            </>
                        )
                    ),
                [move, relativeDestination, appStore, className, friendlyName]
            )}
            title={relativeDestination}
        >
            {friendlyName}
        </DropdownItem>
    );
}
