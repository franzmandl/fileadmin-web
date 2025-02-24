import {Dropdown, DropdownToggle} from 'reactstrap';
import {InodeDropdownMenu} from './InodeDropdownMenu';
import {ImmutableRefObject, focusNothing, stopPropagation} from 'common/ReactUtil';
import {useState} from 'react';
import {AppContext} from 'stores/AppContext';
import {Inode} from 'dto/Inode';

export function InodeDropdown({
    className,
    context,
    container,
    createHref,
    cut,
    delete_,
    inode,
    setInode,
    move,
    reload,
    rename,
    setUploadedInode,
}: {
    readonly className?: string;
    readonly context: AppContext;
    readonly container: ImmutableRefObject<HTMLDivElement | null> | string;
    readonly createHref: (path: string) => string;
    readonly cut?: () => void;
    readonly delete_?: () => void;
    readonly inode: Inode;
    readonly setInode?: (newInode: Inode) => void;
    readonly move?: (relativeDestination: string, onSuccess: () => void) => Promise<void>;
    readonly reload?: () => void;
    readonly rename?: () => void;
    readonly setUploadedInode?: (newInode: Inode) => void;
}): React.JSX.Element {
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const toggleShowDropdown = (): void => setShowDropdown((prev) => !prev);

    return (
        <Dropdown className={className} direction='start' isOpen={showDropdown} onClick={stopPropagation} toggle={toggleShowDropdown}>
            <DropdownToggle className='mdi mdi-dots-vertical' onClick={focusNothing} />
            <InodeDropdownMenu
                context={context}
                container={container}
                createHref={createHref}
                cut={cut}
                delete_={delete_}
                inode={inode}
                setInode={setInode}
                move={move}
                reload={reload}
                rename={rename}
                setShowDropdownFalse={(): void => setShowDropdown(false)}
                setUploadedInode={setUploadedInode}
            />
        </Dropdown>
    );
}
