import {AxiosPromise, AxiosResponse, AxiosStatic} from 'axios';
import {getResponseData} from 'common/AxiosUtil';
import {serverFormData, serverPath, constant} from 'common/constants';
import {compareNatural, encodePath, identity} from 'common/Util';
import {Command} from 'dto/Command';
import {DirectoryDto, createDirectory, Directory} from 'dto/Directory';
import {FileContent} from 'dto/FileContent';
import {InodeDto, createInode, Inode} from 'dto/Inode';
import {NewInode} from 'dto/NewInode';
import {Share} from 'dto/Share';

export class InodeStore {
    constructor(private readonly axios: AxiosStatic) {}

    readonly getDirectory = (path: string, prev: Inode | undefined): Promise<Directory> =>
        this.axios
            .get<DirectoryDto>(serverPath.authenticatedPath.directory(encodePath(path)), {withCredentials: true})
            .then((response) => createDirectoryFromResponse(response, prev));

    readonly getInode = (path: string, prev: Inode | undefined): Promise<Inode> =>
        this.axios
            .get<InodeDto>(serverPath.authenticatedPath.inode(encodePath(path)), {withCredentials: true})
            .then((response) => createInodeFromResponse(response, prev));

    readonly getSuggestion = (path: string, word: string): Promise<ReadonlyArray<string>> =>
        this.axios
            .get<string[]>(serverPath.authenticatedPath.suggestion(encodePath(path), encodeURIComponent(word)), {
                withCredentials: true,
            })
            .then(getResponseData)
            .then((suggestions) => {
                const startsWithWordRegex = new RegExp('^' + word.replaceAll(/[^\p{L}\d_]/gu, ''), 'i');
                return suggestions.sort((a: string, b: string) => {
                    if (startsWithWordRegex.exec(a)) {
                        if (!startsWithWordRegex.exec(b)) {
                            return -1;
                        }
                    } else if (startsWithWordRegex.exec(b)) {
                        return 1;
                    }
                    return compareNatural(a, b);
                });
            });

    private readonly applyCommand = <T>(command: Command): AxiosPromise<T> =>
        this.axios.post<T>(serverPath.authenticatedPath.command(), command, {withCredentials: true});

    readonly add = (path: string, newInode: NewInode): Promise<Inode> =>
        this.applyCommand<InodeDto>({
            _type: 'Add',
            path,
            newInode,
        }).then((response) => createInodeFromResponse(response, undefined));

    readonly delete = (inode: Inode): Promise<void> =>
        this.applyCommand<void>({
            _type: 'Delete',
            path: inode.path,
        }).then(getResponseData);

    readonly move = (path: string, newPath: string): Promise<Inode> =>
        this.applyCommand<InodeDto>({
            _type: 'Move',
            path,
            newPath,
        }).then((response) => createInodeFromResponse(response, undefined));

    readonly share = (path: string, days: number): Promise<ReadonlyArray<Share>> =>
        this.applyCommand<ReadonlyArray<Share>>({
            _type: 'Share',
            path,
            days,
        }).then(getResponseData);

    readonly toDirectory = (path: string, prev: Inode | undefined): Promise<Inode> =>
        this.applyCommand<InodeDto>({
            _type: 'ToDirectory',
            path,
        }).then((response) => createInodeFromResponse(response, prev));

    readonly toFile = (path: string, prev: Inode | undefined): Promise<Inode> =>
        this.applyCommand<InodeDto>({
            _type: 'ToFile',
            path,
        }).then((response) => createInodeFromResponse(response, prev));

    readonly getFile = (path: string): Promise<FileContent> =>
        this.axios
            .get<string>(serverPath.authenticatedPath.file(encodePath(path)), {
                withCredentials: true,
                transformResponse: identity, // Prevent axios from parsing json.
            })
            .then(createFileContentFromResponse);

    readonly postFile = (path: string, lastModifiedMilliseconds: number | undefined, file: File, prev: Inode | undefined): Promise<Inode> =>
        this.axios
            .post<InodeDto>(serverPath.authenticatedPath.file(encodePath(path)), serverFormData.authenticatedPath.file(file), {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    [constant.header.lastModifiedMilliseconds]: lastModifiedMilliseconds,
                },
            })
            .then((response) => createInodeFromResponse(response, prev));

    readonly putFile = (path: string, {lastModifiedMilliseconds, value}: FileContent, prev: Inode | undefined): Promise<Inode> =>
        this.axios
            .put<InodeDto>(serverPath.authenticatedPath.file(encodePath(path)), value, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'text/plain',
                    [constant.header.lastModifiedMilliseconds]: lastModifiedMilliseconds,
                },
            })
            .then((response) => createInodeFromResponse(response, prev));

    readonly scanItems = (path: string, prev: Inode | undefined): Promise<Inode | undefined> =>
        this.axios
            .get<InodeDto | null | undefined>(serverPath.authenticatedPath.scanItems(encodePath(path)), {withCredentials: true})
            .then(({data}) => (data !== null && data !== undefined ? createInode(data, prev) : undefined));
}

function createDirectoryFromResponse({data}: AxiosResponse<DirectoryDto>, prev: Inode | undefined): Directory {
    return createDirectory(data, prev);
}

function createFileContentFromResponse({data, headers}: AxiosResponse<string>): FileContent {
    const lastModifiedMilliseconds = headers[constant.header.lastModifiedMilliseconds];
    return {lastModifiedMilliseconds: lastModifiedMilliseconds !== undefined ? Number(lastModifiedMilliseconds) : undefined, value: data};
}

function createInodeFromResponse({data}: AxiosResponse<InodeDto>, prev: Inode | undefined): Inode {
    return createInode(data, prev);
}
