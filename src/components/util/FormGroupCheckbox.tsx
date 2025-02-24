import React, {Dispatch, ReactNode} from 'react';
import {FormGroup, Input} from 'reactstrap';

export function FormGroupCheckbox({
    checked,
    children,
    disabled,
    setChecked,
}: {
    readonly checked: boolean;
    readonly children: ReactNode;
    readonly disabled?: boolean;
    readonly setChecked: Dispatch<boolean>;
}): React.JSX.Element {
    return (
        <label>
            <FormGroup check>
                <Input checked={checked} disabled={disabled} onChange={(ev): void => setChecked(ev.target.checked)} type='checkbox' />
                {children}
            </FormGroup>
        </label>
    );
}
