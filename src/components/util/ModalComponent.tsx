import {useDepsEffect} from 'common/ReactUtil';
import {ReactNode, useCallback, useState} from 'react';
import {Button, Modal, ModalBody, ModalFooter, ModalHeader} from 'reactstrap';
import {AppContext} from 'stores/AppContext';

export interface ModalContent {
    readonly header: ReactNode;
    readonly body: ReactNode;
    readonly renderFooter?: (closeModal: () => void) => ReactNode;
    readonly onClosed?: () => void;
}

export function ModalComponent({
    content,
    context: {appStore},
}: {
    readonly content?: ModalContent;
    readonly context: AppContext;
}): JSX.Element {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    useDepsEffect(() => {
        setIsOpen(content !== undefined);
    }, [content]);
    const closeModal = useCallback(() => setIsOpen(false), []);
    const footer = content?.renderFooter?.(closeModal);
    return (
        <Modal container={appStore.modalContainerRef} isOpen={isOpen} onClosed={content?.onClosed} fade={false}>
            <ModalHeader toggle={closeModal}>{content?.header}</ModalHeader>
            <ModalBody>{content?.body}</ModalBody>
            <ModalFooter>
                {footer}
                <Button onClick={closeModal}>{footer ? 'Cancel' : 'Ok'}</Button>
            </ModalFooter>
        </Modal>
    );
}
