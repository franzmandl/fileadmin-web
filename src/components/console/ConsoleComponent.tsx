import {Fragment, ReactNode, useState} from 'react';
import {DropdownItem} from 'reactstrap';
import './ConsoleComponent.scss';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {MenuDropdown} from 'components/dropdown/MenuDropdown';

export enum ConsoleEntryLevel {
    debug,
    info,
    warning,
    error,
}

export interface ConsoleEntry {
    readonly id: number;
    readonly level: ConsoleEntryLevel;
    readonly node: ReactNode;
}

export function ConsoleComponent({
    entries,
    hidden,
    hide,
}: {
    readonly entries: ReadonlyArray<ConsoleEntry>;
    readonly hidden: boolean;
    readonly hide: () => void;
}): JSX.Element {
    const [showLevels, setShowLevels] = useState<ReadonlyArray<ConsoleEntryLevel>>([
        ConsoleEntryLevel.info,
        ConsoleEntryLevel.warning,
        ConsoleEntryLevel.error,
    ]);
    const showLevel = (level: ConsoleEntryLevel): boolean => showLevels.indexOf(level) !== -1;
    const setShowLevel = (level: ConsoleEntryLevel, value: boolean): void => {
        setShowLevels((prev) => (value ? [...prev, level] : prev.filter((value) => value !== level)));
    };
    return (
        <div className='console-component page page-landscape' hidden={hidden}>
            <div className='page-main'>
                {entries.map(
                    ({id, level, node}, index) =>
                        showLevel(level) && (
                            <Fragment key={id}>
                                {index !== 0 && <hr className='m-0' />}
                                {node}
                            </Fragment>
                        )
                )}
            </div>
            <div className='page-sidebar'>
                <div>
                    <MenuDropdown className='page-sidebar-icon'>
                        <ToggleDropdownItem level={ConsoleEntryLevel.debug} showLevel={showLevel} setShowLevel={setShowLevel}>
                            Debug
                        </ToggleDropdownItem>
                        <ToggleDropdownItem level={ConsoleEntryLevel.info} showLevel={showLevel} setShowLevel={setShowLevel}>
                            Info
                        </ToggleDropdownItem>
                        <ToggleDropdownItem level={ConsoleEntryLevel.warning} showLevel={showLevel} setShowLevel={setShowLevel}>
                            Warning
                        </ToggleDropdownItem>
                        <ToggleDropdownItem level={ConsoleEntryLevel.error} showLevel={showLevel} setShowLevel={setShowLevel}>
                            Error
                        </ToggleDropdownItem>
                        <DropdownItem divider />
                        <DropdownItem onClick={hide}>Hide Console</DropdownItem>
                    </MenuDropdown>
                </div>
            </div>
        </div>
    );
}

function ToggleDropdownItem({
    children,
    level,
    showLevel,
    setShowLevel,
}: {
    readonly children: ReactNode;
    readonly level: ConsoleEntryLevel;
    readonly showLevel: (level: ConsoleEntryLevel) => boolean;
    readonly setShowLevel: (level: ConsoleEntryLevel, value: boolean) => void;
}): JSX.Element {
    return (
        <DropdownItemCheckbox checked={showLevel(level)} setChecked={(value): void => setShowLevel(level, value)}>
            {children}
        </DropdownItemCheckbox>
    );
}
