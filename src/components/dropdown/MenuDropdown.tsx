import {focusNothing} from 'common/ReactUtil';
import React, {ReactNode} from 'react';
import {DropdownMenu, DropdownToggle, UncontrolledDropdown} from 'reactstrap';

export function MenuDropdown({
    children,
    className,
    hidden,
    menuClassName,
}: {
    readonly children: ReactNode;
    readonly className?: string;
    readonly hidden?: boolean;
    readonly menuClassName?: string;
}): React.JSX.Element {
    return (
        <UncontrolledDropdown className={className} direction='start' hidden={hidden}>
            <DropdownToggle className='mdi mdi-menu' onClick={focusNothing} />
            <DropdownMenu className={menuClassName} container='body' dark>
                {children}
            </DropdownMenu>
        </UncontrolledDropdown>
    );
}
