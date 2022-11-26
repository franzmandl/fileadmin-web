import {useDepsEffect} from 'common/ReactUtil';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Inode} from 'model/Inode';
import React, {Dispatch, ReactNode, useCallback, useState} from 'react';
import {DropdownItem} from 'reactstrap';
import {AppContext} from 'stores/AppContext';

export function UploadDropdownItem({
    accept,
    children,
    context: {appStore, consoleStore, inodeStore},
    inode,
    setInode,
    setShowDropdown,
}: {
    readonly accept?: string;
    readonly children: ReactNode;
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
        <DropdownItem disabled={!inode.canWrite} hidden={!inode.isFile} style={{cursor: 'pointer'}} tag='label' toggle={false}>
            {children}
            <input
                accept={accept}
                hidden
                type='file'
                onChange={useCallback((ev: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(ev.target.files?.[0] ?? undefined), [])}
            />
        </DropdownItem>
    );
}
