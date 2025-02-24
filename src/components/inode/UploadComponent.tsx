import classNames from 'classnames';
import {useDepsEffect} from 'common/ReactUtil';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Inode} from 'dto/Inode';
import React, {Dispatch, useState} from 'react';
import {AppContext} from 'stores/AppContext';

export function UploadComponent({
    accept,
    className,
    context: {appStore, consoleStore, inodeStore},
    inode,
    setInode,
    setShowDropdownFalse,
}: {
    readonly accept?: string;
    readonly className?: string;
    readonly context: AppContext;
    readonly inode: Inode;
    readonly setInode: Dispatch<Inode>;
    readonly setShowDropdownFalse: () => void;
}): React.JSX.Element {
    const [selectedFile, setSelectedFile] = useState<File>();
    const upload = useAsyncCallback(
        (file: File) =>
            appStore.indicateLoading(appStore.preventClose(inodeStore.postFile(inode.path, inode.lastModifiedMilliseconds, file, inode))),
        setInode,
        consoleStore.handleError,
        setShowDropdownFalse,
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
