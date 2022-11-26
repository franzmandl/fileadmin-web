import {focusNothing} from 'common/ReactUtil';
import {ReactNode} from 'react';
import {DropdownMenu, DropdownToggle, UncontrolledDropdown} from 'reactstrap';

export function MenuDropdown({
    children,
    className,
    hidden,
}: {
    readonly children: ReactNode;
    readonly className?: string;
    readonly hidden?: boolean;
}): JSX.Element {
    return (
        <UncontrolledDropdown direction='start' className={className} hidden={hidden}>
            <DropdownToggle className='mdi mdi-menu' onClick={focusNothing} />
            <DropdownMenu container='body' dark>
                {children}
            </DropdownMenu>
        </UncontrolledDropdown>
    );
}
