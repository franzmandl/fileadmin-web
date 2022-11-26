import {AxiosResponse, AxiosStatic} from 'axios';
import {getResponseData} from 'common/AxiosUtil';
import {serverFormData, serverPath, constant} from 'common/constants';
import {appendSeparatorIfNecessary, encodePath, identity, separator} from 'common/Util';
import {BaseDirectory, createDirectory, Directory} from 'model/Directory';
import {FileContent} from 'model/FileContent';
import {BaseInode, createInode, Inode} from 'model/Inode';
import {NewInode} from 'model/NewInode';
import {Share} from 'model/Share';

export class InodeStore {
    constructor(private readonly axios: AxiosStatic) {}

    readonly getDirectory = (path: string): Promise<Directory> =>
        this.axios
            .get<BaseDirectory>(serverPath.authenticatedPath.directory(encodePath(path)), {
                withCredentials: true,
            })
            .then(createDirectoryFromResponse);

    readonly getInode = (path: string): Promise<Inode> =>
        this.axios
            .get<BaseInode>(serverPath.authenticatedPath.inode(encodePath(path)), {
                withCredentials: true,
            })
            .then(createInodeFromResponse);

    readonly add = (path: string, newInode: NewInode): Promise<Inode> =>
        this.axios
            .post<BaseInode>(
                serverPath.authenticatedPath.add(encodePath(path), encodePath(newInode.basename), newInode.isFile),
                undefined,
                {
                    withCredentials: true,
                }
            )
            .then(createInodeFromResponse);

    readonly move = (inode: Inode, relativeDestination: string): Promise<Inode> =>
        this.axios
            .post<BaseInode>(
                serverPath.authenticatedPath.move(
                    encodePath(inode.path),
                    encodePath(separator + appendSeparatorIfNecessary(inode.dirname) + relativeDestination)
                ),
                undefined,
                {
                    withCredentials: true,
                }
            )
            .then(createInodeFromResponse);

    readonly remove = (inode: Inode): Promise<void> =>
        this.axios.get(serverPath.authenticatedPath.remove(encodePath(inode.path)), {
            withCredentials: true,
        });

    readonly share = (path: string, days: number): Promise<ReadonlyArray<Share>> =>
        this.axios
            .get<ReadonlyArray<Share>>(serverPath.authenticatedPath.share(encodePath(path), days), {
                withCredentials: true,
            })
            .then(getResponseData);

    readonly getFile = (path: string): Promise<FileContent> =>
        this.axios
            .get<string>(serverPath.authenticatedPath.file(encodePath(path)), {
                withCredentials: true,
                transformResponse: identity, // Prevent axios from parsing json.
            })
            .then(createFileContentFromResponse);

    readonly postFile = (path: string, lastModified: number, file: File): Promise<Inode> =>
        this.axios
            .post<BaseInode>(serverPath.authenticatedPath.file(encodePath(path)), serverFormData.authenticatedPath.file(file), {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    [constant.header.lastModified]: lastModified,
                },
            })
            .then(createInodeFromResponse);

    readonly putFile = (path: string, {lastModified, value}: FileContent): Promise<Inode> =>
        this.axios
            .put<BaseInode>(serverPath.authenticatedPath.file(encodePath(path)), value, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'text/plain',
                    [constant.header.lastModified]: lastModified,
                },
            })
            .then(createInodeFromResponse);
}

function createDirectoryFromResponse({data}: AxiosResponse<BaseDirectory>): Directory {
    return createDirectory(data);
}

function createFileContentFromResponse({data, headers}: AxiosResponse<string>): FileContent {
    return {lastModified: Number(headers[constant.header.lastModified]), value: data};
}

function createInodeFromResponse({data}: AxiosResponse<BaseInode>): Inode {
    return createInode(data);
}
