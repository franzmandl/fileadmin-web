import {Dispatch, ReactNode} from 'react';
import {DropdownItem, FormGroup, Input} from 'reactstrap';
import './DropdownItemCheckbox.scss';

export function DropdownItemCheckbox({
    checked,
    children,
    disabled,
    setChecked,
    hidden,
}: {
    readonly checked: boolean;
    readonly children: ReactNode;
    readonly disabled?: boolean;
    readonly setChecked: Dispatch<boolean>;
    readonly hidden?: boolean;
}): JSX.Element {
    return (
        <DropdownItem className='dropdown-item-checkbox' hidden={hidden} tag='label' toggle={false}>
            <FormGroup check className='m-0'>
                <Input checked={checked} disabled={disabled} onChange={(ev): void => setChecked(ev.target.checked)} type='checkbox' />
                {children}
            </FormGroup>
        </DropdownItem>
    );
}
