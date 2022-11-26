import React, {Dispatch, ReactNode, useCallback} from 'react';
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
}): JSX.Element {
    return (
        <label>
            <FormGroup check>
                <Input
                    checked={checked}
                    disabled={disabled}
                    onChange={useCallback((ev: React.ChangeEvent<HTMLInputElement>) => setChecked(ev.target.checked), [setChecked])}
                    type='checkbox'
                />
                {children}
            </FormGroup>
        </label>
    );
}
