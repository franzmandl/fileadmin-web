import {focusNothing} from 'common/ReactUtil';
import {Action} from 'components/Action';
import {Dispatch} from 'react';
import {DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown} from 'reactstrap';
import './ActionDropdown.scss';

export function ActionDropdown({
    action: currentAction,
    className,
    hidden,
    onActionChange,
}: {
    readonly action: Action;
    readonly className?: string;
    readonly hidden?: boolean;
    readonly onActionChange: Dispatch<Action>;
}): React.JSX.Element {
    const currentActionDetail = actionDetailMap.get(currentAction);
    const toggleIcon = currentActionDetail?.icon ?? 'mdi-menu-left';
    return (
        <UncontrolledDropdown className={className} direction='start' hidden={hidden}>
            <DropdownToggle
                className={'action-dropdown-toggle mdi ' + toggleIcon}
                outline={currentActionDetail === undefined}
                onClick={focusNothing}
            />
            <DropdownMenu className='action-dropdown-menu' container='body' dark>
                {actionDetailList.map(([action, actionDetail]) => (
                    <DropdownItem key={action} onClick={(): void => onActionChange(action)}>
                        <span className={'mdi ' + actionDetail.icon} />
                    </DropdownItem>
                ))}
            </DropdownMenu>
        </UncontrolledDropdown>
    );
}

interface ActionDetail {
    readonly icon: string;
}

const actionDetailList: ReadonlyArray<[Action, ActionDetail]> = [
    [
        Action.cut,
        {
            icon: 'mdi-content-cut',
        },
    ],
    [
        Action.paste,
        {
            icon: 'mdi-content-paste',
        },
    ],
    [
        Action.reload,
        {
            icon: 'mdi-refresh',
        },
    ],
];
const actionDetailMap = new Map(actionDetailList);
