import {ImmutableRefObject} from 'common/ReactUtil';
import {paramsToHash, setParam} from 'common/Util';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Inode, getDownloadPath} from 'dto/Inode';
import {useState} from 'react';
import {DropdownItem, DropdownMenu} from 'reactstrap';
import {AppContext} from 'stores/AppContext';
import {TaskDropdownItems} from './TaskDropdownItems';
import {useCopyToClipboard} from 'components/util/useCopyToClipboard';
import {UploadComponent} from './UploadComponent';
import {AppLocation, ParamName} from 'common/constants';
import {InodeModal} from './InodeModal';
import {ShareModal} from './ShareModal';

export function InodeDropdownMenu({
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
    setShowDropdownFalse,
    setUploadedInode,
}: {
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
    readonly setShowDropdownFalse: () => void;
    readonly setUploadedInode?: (newInode: Inode) => void;
}): React.JSX.Element {
    const {appStore, consoleStore, inodeStore} = context;
    const [showInodeModal, setShowInodeModal] = useState<boolean>(false);
    const toggleShowInodeModal = (): void => setShowInodeModal((prev) => !prev);
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const toggleShowShareModal = (): void => setShowShareModal((prev) => !prev);

    const scanItems = useAsyncCallback(
        () => appStore.indicateLoading(inodeStore.scanItems(inode.path, inode)),
        (nextInode) => {
            if (nextInode !== undefined) {
                setInode?.(nextInode);
                appStore.toast('Scanned items');
            } else {
                appStore.toast('No items were scanned');
            }
        },
        consoleStore.handleError,
    );

    return (
        <DropdownMenu container={container} dark>
            <div className='inode-component-dropdown-buttons'>
                {rename !== undefined && (
                    <button
                        className='mdi mdi-cursor-text btn inode-component-dropdown-button'
                        hidden={!inode.operation.canInodeRename}
                        onClick={(): void => {
                            rename();
                            setShowDropdownFalse();
                        }}
                    />
                )}
                {cut !== undefined && (
                    <button
                        className='mdi mdi-content-cut btn inode-component-dropdown-button'
                        onClick={(): void => {
                            cut();
                            setShowDropdownFalse();
                        }}
                    />
                )}
                {reload !== undefined && (
                    <button
                        className='mdi mdi-refresh btn inode-component-dropdown-button'
                        onClick={(): void => {
                            reload();
                            setShowDropdownFalse();
                        }}
                    />
                )}
                {delete_ !== undefined && (
                    <button
                        className='mdi mdi-trash-can btn inode-component-dropdown-button'
                        hidden={!inode.operation.canInodeDelete}
                        onClick={(): void => {
                            delete_();
                            setShowDropdownFalse();
                        }}
                    />
                )}
                <button
                    className='mdi mdi-share-variant btn inode-component-dropdown-button'
                    hidden={!inode.operation.canInodeShare}
                    onClick={(): void => {
                        setShowShareModal(true);
                        setShowDropdownFalse();
                    }}
                />
                <a
                    className='mdi mdi-open-in-new btn inode-component-dropdown-button'
                    hidden={!inode.operation.canFileGet}
                    href={createHref(inode.path)}
                    target='_blank'
                    rel='noreferrer'
                    role='button'
                    title={inode.path}
                    onClick={setShowDropdownFalse}
                />
                {setInode !== undefined && inode.operation.canInodeToDirectory && (
                    <ToDirectoryButton context={context} inode={inode} setInode={setInode} setShowDropdownFalse={setShowDropdownFalse} />
                )}
                {setInode !== undefined && inode.operation.canInodeToFile && (
                    <ToFileButton context={context} inode={inode} setInode={setInode} setShowDropdownFalse={setShowDropdownFalse} />
                )}
                {inode.isFile && (
                    <>
                        <a
                            className='mdi mdi-square-edit-outline btn inode-component-dropdown-button'
                            hidden={!inode.operation.canFileSet}
                            href={paramsToHash(
                                setParam(appStore.appParameter.getEncodedLocation(AppLocation.edit), ParamName.path, inode.path),
                            )}
                            target='_blank'
                            rel='noreferrer'
                            role='button'
                            onClick={setShowDropdownFalse}
                        />
                        <a
                            className='mdi mdi-download btn inode-component-dropdown-button'
                            hidden={!inode.operation.canFileGet}
                            href={getDownloadPath(inode)}
                            target='_blank'
                            rel='noreferrer'
                            onClick={setShowDropdownFalse}
                        />
                        {setUploadedInode !== undefined && (
                            <UploadComponent
                                className='mdi mdi-upload btn inode-component-dropdown-button'
                                context={context}
                                inode={inode}
                                setInode={setUploadedInode}
                                setShowDropdownFalse={setShowDropdownFalse}
                            />
                        )}
                        {setUploadedInode !== undefined && (
                            <UploadComponent
                                accept='image/*;capture=camera'
                                className='mdi mdi-camera btn inode-component-dropdown-button'
                                context={context}
                                inode={inode}
                                setInode={setUploadedInode}
                                setShowDropdownFalse={setShowDropdownFalse}
                            />
                        )}
                    </>
                )}
                <button
                    className='mdi mdi-newspaper-variant-outline btn inode-component-dropdown-button'
                    onClick={(): void => {
                        setShowInodeModal(true);
                        setShowDropdownFalse();
                    }}
                />
                <button
                    className='mdi mdi-database-refresh-outline btn inode-component-dropdown-button'
                    onClick={(): void => {
                        scanItems();
                        setShowDropdownFalse();
                    }}
                />
            </div>
            <DropdownItem
                hidden={!(navigator.clipboard && inode.parentLocalPath)}
                onClick={useCopyToClipboard(appStore, consoleStore, inode.parentLocalPath ?? '')}
            >
                <span className='mdi mdi-content-copy' /> Directory
            </DropdownItem>
            <DropdownItem
                hidden={!(navigator.clipboard && inode.localPath)}
                onClick={useCopyToClipboard(appStore, consoleStore, inode.localPath ?? '')}
            >
                <span className='mdi mdi-content-copy' /> Path
            </DropdownItem>
            {inode.link !== undefined && (
                <DropdownItem href={createHref(inode.link.target)} target='_blank' rel='noreferrer' title={inode.link.target}>
                    <span className='mdi mdi-folder-outline' /> Show Target
                </DropdownItem>
            )}
            {move !== undefined && inode.task !== undefined && (
                <TaskDropdownItems context={context} inode={inode} move={move} task={inode.task} />
            )}
            <InodeModal context={context} inode={inode} isOpen={showInodeModal} toggle={toggleShowInodeModal} />
            <ShareModal context={context} inode={inode} isOpen={showShareModal} toggle={toggleShowShareModal} />
        </DropdownMenu>
    );
}

function ToDirectoryButton({
    context,
    inode,
    setInode,
    setShowDropdownFalse,
}: {
    readonly context: AppContext;
    readonly inode: Inode;
    readonly setInode: (newInode: Inode) => void;
    readonly setShowDropdownFalse: () => void;
}): React.JSX.Element {
    const {appStore, consoleStore, inodeStore} = context;
    const toDirectory = useAsyncCallback<boolean, [], void>(
        () =>
            appStore.confirm(
                <>
                    Convert inode to directory: <pre className='overflow-auto'>{inode.name}</pre>
                </>,
            ),
        (value) => (value ? toDirectoryImmediately() : undefined),
        consoleStore.handleError,
    );
    const toDirectoryImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.toDirectory(inode.path, inode))),
        setInode,
        consoleStore.handleError,
    );
    return (
        <button
            className='mdi mdi-folder btn inode-component-dropdown-button'
            onClick={(): void => {
                toDirectory();
                setShowDropdownFalse();
            }}
        />
    );
}

function ToFileButton({
    context,
    inode,
    setInode,
    setShowDropdownFalse,
}: {
    readonly context: AppContext;
    readonly inode: Inode;
    readonly setInode: (newInode: Inode) => void;
    readonly setShowDropdownFalse: () => void;
}): React.JSX.Element {
    const {appStore, consoleStore, inodeStore} = context;
    const toFile = useAsyncCallback<boolean, [], void>(
        () =>
            appStore.confirm(
                <>
                    Convert inode to file: <pre className='overflow-auto'>{inode.name}</pre>
                </>,
            ),
        (value) => (value ? toFileImmediately() : undefined),
        consoleStore.handleError,
    );
    const toFileImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.toFile(inode.path, inode))),
        setInode,
        consoleStore.handleError,
    );
    return (
        <button
            className='mdi mdi-file btn inode-component-dropdown-button'
            onClick={(): void => {
                toFile();
                setShowDropdownFalse();
            }}
        />
    );
}
