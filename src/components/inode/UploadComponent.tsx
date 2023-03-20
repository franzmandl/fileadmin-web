import classNames from 'classnames';
import {useDepsEffect} from 'common/ReactUtil';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Inode} from 'model/Inode';
import {Dispatch, useState} from 'react';
import {AppContext} from 'stores/AppContext';

export function UploadComponent({
    accept,
    className,
    context: {appStore, consoleStore, inodeStore},
    inode,
    setInode,
    setShowDropdown,
}: {
    readonly accept?: string;
    readonly className?: string;
    readonly context: AppContext;
    readonly inode: Inode;
    readonly setInode: Dispatch<Inode>;
    readonly setShowDropdown: Dispatch<boolean>;
}): JSX.Element {
    const [selectedFile, setSelectedFile] = useState<File>();
    const upload = useAsyncCallback(
        (file: File) => appStore.indicateLoading(appStore.preventClose(inodeStore.postFile(inode.path, inode.lastModified, file))),
        setInode,
        consoleStore.handleError,
        () => setShowDropdown(false)
    );
    useDepsEffect(() => {
        if (selectedFile != undefined) {
            upload(selectedFile);
        }
    }, [selectedFile]);
    return (
        <label className={classNames(className, !inode.operation.canFileSet ? 'disabled' : '')} style={{cursor: 'pointer'}}>
            <input accept={accept} hidden type='file' onChange={(ev): void => setSelectedFile(ev.target.files?.[0] ?? undefined)} />
        </label>
    );
}
