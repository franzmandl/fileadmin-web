import {Dispatch} from 'react';
import {Input} from 'reactstrap';

export function CheckboxInput({
    disabled,
    checked,
    onClick,
    parentIndex,
    parentValues,
    setParentValue,
}: {
    readonly disabled: boolean;
    readonly checked: boolean;
    readonly onClick: (ev: React.MouseEvent) => void;
    readonly parentIndex: number;
    readonly parentValues: ReadonlyArray<string>;
    readonly setParentValue: Dispatch<string>;
}): JSX.Element {
    return (
        <Input
            type='checkbox'
            className='align-baseline m-0'
            disabled={disabled}
            onClick={onClick}
            checked={checked}
            onChange={(ev): void =>
                setParentValue(
                    [
                        ...parentValues.slice(0, parentIndex),
                        '[',
                        ev.target.checked ? 'x' : ' ',
                        ']',
                        ...parentValues.slice(parentIndex + 1),
                    ].join('')
                )
            }
        />
    );
}
