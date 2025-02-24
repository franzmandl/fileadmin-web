import {focusNothing} from 'common/ReactUtil';
import React, {Dispatch, Fragment, ReactNode} from 'react';
import {DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown} from 'reactstrap';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {SetSortAttributeAndAscending} from 'pages/useDirectoryPageParameter';
import {assertUnreachable} from 'common/Util';
import {AttributeKey, CompareParameter} from 'common/CompareInode';

export function CompareParameterDropdown({
    children,
    className,
    compareParameter: {ascending, attributeKey, foldersFirst, priority, specialFirst, time, trim},
    hidden,
    setAttributeAndAscending,
    setFoldersFirst,
    setPriority,
    setSpecialFirst,
    setTime,
    setTrim,
}: {
    readonly children?: ReactNode;
    readonly className?: string;
    readonly compareParameter: CompareParameter;
    readonly setAttributeAndAscending: SetSortAttributeAndAscending;
    readonly setFoldersFirst: Dispatch<boolean>;
    readonly setPriority: Dispatch<boolean>;
    readonly setSpecialFirst: Dispatch<boolean>;
    readonly setTime: Dispatch<boolean>;
    readonly setTrim: Dispatch<boolean>;
    readonly hidden?: boolean;
}): React.JSX.Element {
    const isActive = (localAttributeKey: AttributeKey, localAscending: boolean): boolean =>
        localAttributeKey === attributeKey && localAscending === ascending;
    return (
        <UncontrolledDropdown direction='start' className={className} hidden={hidden}>
            <DropdownToggle className={getSortClassName(attributeKey, ascending)} onClick={focusNothing} />
            <DropdownMenu container='body' dark>
                {attributes.map(({friendlyName, key}) => (
                    <Fragment key={key}>
                        <DropdownItem active={isActive(key, true)} onClick={(): void => setAttributeAndAscending(key, true)}>
                            <span className={getSortClassName(key, true)} /> By {friendlyName}
                        </DropdownItem>
                        <DropdownItem active={isActive(key, false)} onClick={(): void => setAttributeAndAscending(key, false)}>
                            <span className={getSortClassName(key, false)} /> By {friendlyName}
                        </DropdownItem>
                    </Fragment>
                ))}
                <DropdownItem divider />
                {children}
                <DropdownItemCheckbox checked={foldersFirst} setChecked={setFoldersFirst}>
                    Folders First
                </DropdownItemCheckbox>
                <DropdownItemCheckbox checked={priority} setChecked={setPriority}>
                    Priority
                </DropdownItemCheckbox>
                <DropdownItemCheckbox checked={specialFirst} setChecked={setSpecialFirst}>
                    Special First
                </DropdownItemCheckbox>
                <DropdownItemCheckbox checked={time} setChecked={setTime}>
                    Time
                </DropdownItemCheckbox>
                <DropdownItemCheckbox checked={trim} setChecked={setTrim}>
                    Trim
                </DropdownItemCheckbox>
            </DropdownMenu>
        </UncontrolledDropdown>
    );
}

const attributes: ReadonlyArray<{readonly friendlyName: string; readonly key: AttributeKey}> = [
    {friendlyName: 'Name', key: AttributeKey.name},
    {friendlyName: 'Size', key: AttributeKey.size},
    {friendlyName: 'Modified', key: AttributeKey.modified},
];

function getSortClassName(key: AttributeKey, ascending: boolean): string {
    return `mdi mdi-sort-${getAttributeIcon(key)}-${ascending ? 'ascending' : 'descending'}`;
}

function getAttributeIcon(key: AttributeKey): string {
    switch (key) {
        case AttributeKey.modified:
            return 'calendar';
        case AttributeKey.name:
            return 'alphabetical';
        case AttributeKey.size:
            return 'numeric';
    }
    assertUnreachable(key);
}
