import {AxiosPromise, AxiosResponse, AxiosStatic} from 'axios';
import {getResponseData} from 'common/AxiosUtil';
import {compareNatural} from 'common/Comparator';
import {serverFormData, serverPath, constant} from 'common/constants';
import {encodePath, identity, resolvePath} from 'common/Util';
import {Command} from 'model/Command';
import {BaseDirectory, createDirectory, Directory} from 'model/Directory';
import {FileContent} from 'model/FileContent';
import {BaseInode, createInode, Inode} from 'model/Inode';
import {NewInode} from 'model/NewInode';
import {Share} from 'model/Share';

export class InodeStore {
    constructor(private readonly axios: AxiosStatic) {}

    readonly getDirectory = (path: string): Promise<Directory> =>
        this.axios
            .get<BaseDirectory>(serverPath.authenticatedPath.directory(encodePath(path)), {withCredentials: true})
            .then(createDirectoryFromResponse);

    readonly getInode = (path: string): Promise<Inode> =>
        this.axios
            .get<BaseInode>(serverPath.authenticatedPath.inode(encodePath(path)), {withCredentials: true})
            .then(createInodeFromResponse);

    readonly getSuggestion = (path: string, word: string): Promise<ReadonlyArray<string>> =>
        this.axios
            .get<string[]>(serverPath.authenticatedPath.suggestion(encodePath(path), encodeURIComponent(word)), {
                withCredentials: true,
            })
            .then(getResponseData)
            .then((suggestions) => {
                const startsWithWordRegex = new RegExp('^' + word.replaceAll(/[^\p{L}\d_]/gu, ''), 'i');
                return suggestions.sort((a: string, b: string) => {
                    if (a.match(startsWithWordRegex)) {
                        if (!b.match(startsWithWordRegex)) {
                            return -1;
                        }
                    } else if (b.match(startsWithWordRegex)) {
                        return 1;
                    }
                    return compareNatural(a, b);
                });
            });

    private readonly applyCommand = <T>(command: Command): AxiosPromise<T> =>
        this.axios.post<T>(serverPath.authenticatedPath.command(), command, {withCredentials: true});

    readonly add = (path: string, newInode: NewInode): Promise<Inode> =>
        this.applyCommand<BaseInode>({
            _type: 'Add',
            path,
            newInode,
        }).then(createInodeFromResponse);

    readonly delete = (inode: Inode): Promise<void> =>
        this.applyCommand<void>({
            _type: 'Delete',
            path: inode.path,
        }).then(getResponseData);

    readonly move = (inode: Inode, relativeDestination: string): Promise<Inode> =>
        this.applyCommand<BaseInode>({
            _type: 'Move',
            path: inode.path,
            newPath: resolvePath(inode.parentPath, relativeDestination),
        }).then(createInodeFromResponse);

    readonly share = (path: string, days: number): Promise<ReadonlyArray<Share>> =>
        this.applyCommand<ReadonlyArray<Share>>({
            _type: 'Share',
            path,
            days,
        }).then(getResponseData);

    readonly toDirectory = (path: string): Promise<Inode> =>
        this.applyCommand<BaseInode>({
            _type: 'ToDirectory',
            path,
        }).then(createInodeFromResponse);

    readonly toFile = (path: string): Promise<Inode> =>
        this.applyCommand<BaseInode>({
            _type: 'ToFile',
            path,
        }).then(createInodeFromResponse);

    readonly getFile = (path: string): Promise<FileContent> =>
        this.axios
            .get<string>(serverPath.authenticatedPath.file(encodePath(path)), {
                withCredentials: true,
                transformResponse: identity, // Prevent axios from parsing json.
            })
            .then(createFileContentFromResponse);

    readonly postFile = (path: string, lastModified: number | null, file: File): Promise<Inode> =>
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
    const lastModified = headers[constant.header.lastModified];
    return {lastModified: lastModified !== undefined ? Number(lastModified) : null, value: data};
}

function createInodeFromResponse({data}: AxiosResponse<BaseInode>): Inode {
    return createInode(data);
}
