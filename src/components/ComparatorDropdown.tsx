import {Comparator} from 'common/Comparator';
import {focusNothing, useDepsEffect} from 'common/ReactUtil';
import {Dispatch, useCallback, useState} from 'react';
import {DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown} from 'reactstrap';
import {DropdownItemCheckbox} from './DropdownItemCheckbox';

export function ComparatorDropdown({
    className,
    comparator,
    setComparator,
    hidden,
}: {
    readonly className?: string;
    readonly comparator: Comparator;
    readonly setComparator: Dispatch<Comparator>;
    readonly hidden?: boolean;
}): JSX.Element {
    const [sortAlphabetical, setSortAlphabetical] = useState<boolean>(comparator.sortAlphabetical);
    const [sortAscending, setSortAscending] = useState<boolean>(comparator.sortAscending);
    const [sortFoldersFirst, setSortFoldersFirst] = useState<boolean>(comparator.sortFoldersFirst);
    const [sortSpecialFirst, setSortSpecialFirst] = useState<boolean>(comparator.sortSpecialFirst);

    const isActive = useCallback(
        (alphabetical: boolean, ascending: boolean) => alphabetical === sortAlphabetical && ascending === sortAscending,
        [sortAlphabetical, sortAscending]
    );

    const updateSort = useCallback((alphabetical: boolean, ascending: boolean): void => {
        setSortAlphabetical(alphabetical);
        setSortAscending(ascending);
    }, []);

    useDepsEffect(
        () => setComparator(new Comparator(sortAlphabetical, sortAscending, sortFoldersFirst, sortSpecialFirst)),
        [sortAlphabetical, sortAscending, sortFoldersFirst, sortSpecialFirst]
    );

    return (
        <UncontrolledDropdown direction='start' className={className} hidden={hidden}>
            <DropdownToggle className={createSortClassName(sortAlphabetical, sortAscending)} onClick={focusNothing} />
            <DropdownMenu container='body' dark>
                <DropdownItem active={isActive(true, true)} onClick={useCallback(() => updateSort(true, true), [updateSort])}>
                    <span className={createSortClassName(true, true)} /> By Title
                </DropdownItem>
                <DropdownItem active={isActive(true, false)} onClick={useCallback(() => updateSort(true, false), [updateSort])}>
                    <span className={createSortClassName(true, false)} /> By Title
                </DropdownItem>
                <DropdownItem active={isActive(false, true)} onClick={useCallback(() => updateSort(false, true), [updateSort])}>
                    <span className={createSortClassName(false, true)} /> By Date
                </DropdownItem>
                <DropdownItem active={isActive(false, false)} onClick={useCallback(() => updateSort(false, false), [updateSort])}>
                    <span className={createSortClassName(false, false)} /> By Date
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItemCheckbox checked={sortFoldersFirst} setChecked={setSortFoldersFirst}>
                    Folders First
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
