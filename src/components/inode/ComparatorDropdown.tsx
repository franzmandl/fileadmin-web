import {Comparator} from 'common/Comparator';
import {focusNothing} from 'common/ReactUtil';
import {Dispatch, useCallback} from 'react';
import {DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown} from 'reactstrap';
import {DropdownItemCheckbox} from 'components/dropdown/DropdownItemCheckbox';
import {SetSortAlphabeticalAndAscending} from 'pages/useDirectoryPageParameter';

export function ComparatorDropdown({
    className,
    comparator: {sortAlphabetical, sortAscending, sortFoldersFirst, sortPriority, sortSpecialFirst},
    hidden,
    setSortAlphabeticalAndAscending,
    setSortFoldersFirst,
    setSortPriority,
    setSortSpecialFirst,
}: {
    readonly className?: string;
    readonly comparator: Comparator;
    readonly setSortAlphabeticalAndAscending: SetSortAlphabeticalAndAscending;
    readonly setSortFoldersFirst: Dispatch<boolean>;
    readonly setSortPriority: Dispatch<boolean>;
    readonly setSortSpecialFirst: Dispatch<boolean>;
    readonly hidden?: boolean;
}): JSX.Element {
    const isActive = useCallback(
        (alphabetical: boolean, ascending: boolean) => alphabetical === sortAlphabetical && ascending === sortAscending,
        [sortAlphabetical, sortAscending]
    );

    return (
        <UncontrolledDropdown direction='start' className={className} hidden={hidden}>
            <DropdownToggle className={createSortClassName(sortAlphabetical, sortAscending)} onClick={focusNothing} />
            <DropdownMenu container='body' dark>
                <DropdownItem
                    active={isActive(true, true)}
                    onClick={useCallback(() => setSortAlphabeticalAndAscending(true, true), [setSortAlphabeticalAndAscending])}
                >
                    <span className={createSortClassName(true, true)} /> By Title
                </DropdownItem>
                <DropdownItem
                    active={isActive(true, false)}
                    onClick={useCallback(() => setSortAlphabeticalAndAscending(true, false), [setSortAlphabeticalAndAscending])}
                >
                    <span className={createSortClassName(true, false)} /> By Title
                </DropdownItem>
                <DropdownItem
                    active={isActive(false, true)}
                    onClick={useCallback(() => setSortAlphabeticalAndAscending(false, true), [setSortAlphabeticalAndAscending])}
                >
                    <span className={createSortClassName(false, true)} /> By Date
                </DropdownItem>
                <DropdownItem
                    active={isActive(false, false)}
                    onClick={useCallback(() => setSortAlphabeticalAndAscending(false, false), [setSortAlphabeticalAndAscending])}
                >
                    <span className={createSortClassName(false, false)} /> By Date
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItemCheckbox checked={sortFoldersFirst} setChecked={setSortFoldersFirst}>
                    Folders First
                </DropdownItemCheckbox>
                <DropdownItemCheckbox checked={sortPriority} setChecked={setSortPriority}>
                    Priority
                </DropdownItemCheckbox>
                <DropdownItemCheckbox checked={sortSpecialFirst} setChecked={setSortSpecialFirst}>
                    Special First
                </DropdownItemCheckbox>
            </DropdownMenu>
        </UncontrolledDropdown>
    );
}

function createSortClassName(alphabetical: boolean, ascending: boolean): string {
    return `mdi mdi-sort-${alphabetical ? 'alphabetical' : 'numeric'}-${ascending ? 'ascending' : 'descending'}`;
}
