import {Dispatch, ReactNode, useCallback} from 'react';
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
                <Input
                    checked={checked}
                    disabled={disabled}
                    onChange={useCallback((ev: React.ChangeEvent<HTMLInputElement>) => setChecked(ev.target.checked), [setChecked])}
                    type='checkbox'
                />
                {children}
            </FormGroup>
        </DropdownItem>
    );
}
