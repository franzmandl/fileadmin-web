import {constant} from 'common/constants';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {useCopyToClipboard} from 'components/util/useCopyToClipboard';
import {Inode} from 'dto/Inode';
import {Share} from 'dto/Share';
import React, {useState} from 'react';
import {Button, FormGroup, Input, Label, Modal, ModalBody, ModalHeader} from 'reactstrap';
import {AppContext} from 'stores/AppContext';

export function ShareModal({
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
    const {appStore, consoleStore, inodeStore} = context;
    const [days, setDays] = useState<number>(constant.shareDays);
    const [shares, setShares] = useState<ReadonlyArray<Share>>([]);
    const generate = useAsyncCallback(
        () => appStore.indicateLoading(inodeStore.share(inode.path, days)),
        setShares,
        consoleStore.handleError,
    );
    return (
        <Modal container={appStore.modalContainerRef} isOpen={isOpen} toggle={toggle}>
            <ModalHeader toggle={toggle}>Share</ModalHeader>
            <ModalBody>
                <FormGroup>
                    <Label>Days</Label>
                    <Input type='number' value={days} onChange={(ev): void => setDays(ev.target.valueAsNumber)} />
                </FormGroup>
                <Button onClick={generate} block>
                    Generate URLs
                </Button>
                <div
                    className='mt-2'
                    style={{display: 'grid', alignItems: 'center', gap: '0.25rem', gridTemplateColumns: 'auto 1fr auto auto'}}
                >
                    {shares.map((share, index) => (
                        <ShareComponent key={index} context={context} share={share} />
                    ))}
                </div>
            </ModalBody>
        </Modal>
    );
}

function ShareComponent({
    context: {appStore, consoleStore},
    share: {label, url},
}: {
    readonly context: AppContext;
    readonly share: Share;
}): React.JSX.Element {
    return (
        <>
            <div>{label}</div>
            <a className='d-block overflow-auto text-nowrap' href={url} target='_blank' rel='noreferrer'>
                {url}
            </a>
            <div>
                <Button
                    hidden={!navigator.share}
                    className='mdi mdi-share-variant'
                    color='primary'
                    onClick={(): Promise<void> => navigator.share({url})}
                />
            </div>
            <div>
                <Button
                    hidden={!navigator.clipboard}
                    className='mdi mdi-content-copy'
                    onClick={useCopyToClipboard(appStore, consoleStore, url)}
                />
            </div>
        </>
    );
}
