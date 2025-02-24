import {Inode} from 'dto/Inode';
import {Modal, ModalBody, ModalHeader} from 'reactstrap';
import {AppContext} from 'stores/AppContext';

export function InodeModal({
    context,
    inode,
    isOpen,
    toggle,
}: {
    readonly context: AppContext;
    readonly inode: Inode;
    readonly isOpen: boolean;
    readonly toggle: () => void;
}): React.JSX.Element {
    const {appStore} = context;
    return (
        <Modal container={appStore.modalContainerRef} isOpen={isOpen} toggle={toggle}>
            <ModalHeader toggle={toggle}>{inode.name}</ModalHeader>
            <ModalBody>
                <pre>{JSON.stringify(inode, null, 2)}</pre>
            </ModalBody>
        </Modal>
    );
}
