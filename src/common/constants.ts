import {parseAction} from 'components/Action';
import {createFormData, getParentPath} from './Util';

export enum AppLocation {
    edit = 'edit',
    inodes = 'inodes',
}

export enum UrlParamName {
    action = 'action',
    decent = 'decent',
    location = 'location',
    path = 'path',
    show = 'show',
    sort = 'sort',
    username = 'username',
}

export enum LocalStorageKey {
    rememberMe = 'remember-me',
}

const urlParams = new URLSearchParams(window.location.search);
const url = new URL(window.location.href);
url.hash = '';
const clientUrl = url.toString();
url.pathname = getParentPath(getParentPath(url.pathname));
url.search = '';
const serverUrl = process.env.REACT_APP_SERVER_URL ?? url.toString();
const decentList = (urlParams.get(UrlParamName.decent) ?? '').split(',');
const showList = (urlParams.get(UrlParamName.show) ?? '').split(',');
const sortList = (urlParams.get(UrlParamName.sort) ?? '').split(',');

type KnownTicketActions = Record<string, {readonly friendlyName: string; readonly className: string} | undefined>;
const knownTicketActions = Object.freeze<KnownTicketActions>({
    '20-backlog': {friendlyName: 'Backlog', className: 'bg-secondary text-light'},
    '40-to_do': {friendlyName: 'To Do', className: 'bg-warning text-dark'},
    '50-in_progress': {friendlyName: 'In Progress', className: 'bg-primary text-light'},
    '60-done': {friendlyName: 'Done', className: 'bg-success text-light'},
    '80-aborted': {friendlyName: 'Aborted', className: 'bg-danger text-light'},
    ...(JSON.parse(process.env.REACT_APP_KNOWN_TICKET_ACTIONS ?? '{}') as KnownTicketActions),
});

export const constant = Object.freeze({
    action: parseAction(urlParams.get(UrlParamName.action)),
    currentDate: new Date(),
    decentDirectory: decentList.indexOf('dir') !== -1,
    decentFile: decentList.indexOf('file') !== -1,
    decentReadmeFile: decentList.indexOf('!readme') === -1,
    header: Object.freeze({
        // I recommend using small letters.
        lastModified: 'x-last-modified',
    }),
    indent: '  ',
    indentRegExp: /^(\t| {2})/,
    knownTicketActions,
    location: urlParams.get(UrlParamName.location) ?? AppLocation.inodes,
    path: urlParams.get(UrlParamName.path),
    saveTimeoutMs: 2000,
    shareDays: 2,
    showAvailable: showList.indexOf('available') !== -1,
    showHidden: showList.indexOf('hidden') !== -1,
    showLastModified: false,
    showMimeType: false,
    showSize: true,
    showThumbnail: true,
    showWaiting: showList.indexOf('waiting') !== -1,
    sortAlphabetical: sortList.indexOf('date') === -1,
    sortAscending: sortList.indexOf('desc') === -1,
    sortFoldersFirst: sortList.indexOf('foldersFirst') !== -1,
    sortSpecialFirst: sortList.indexOf('!specialFirst') === -1,
    title: url.hostname,
    username: urlParams.get(UrlParamName.username) ?? process.env.REACT_APP_SERVER_USERNAME ?? '',
});

export const serverPath = Object.freeze({
    authenticated: () => `${serverUrl}/service`,
    bookmarks: () => `${serverUrl}/bookmarks`,
    bookmarksPrivate: () => `${serverPath.bookmarks()}/private`,
    error: () => `${serverUrl}/error`,
    login: () => `${serverUrl}/login`,
    web: () => `${serverUrl}/web`,
    authenticatedPath: Object.freeze({
        add: (path: string, basename: string, isFile: boolean) =>
            `${serverPath.authenticated()}/add?path=${path}&basename=${basename}&isFile=${String(isFile)}`,
        directory: (path: string) => `${serverPath.authenticated()}/directory?path=${path}`,
        file: (path: string) => `${serverPath.authenticated()}/file?path=${path}`,
        inode: (path: string) => `${serverPath.authenticated()}/inode?path=${path}`,
        logout: () => `${serverPath.authenticated()}/logout`,
        move: (path: string, newPath: string) => `${serverPath.authenticated()}/move?path=${path}&newPath=${newPath}`,
        remove: (path: string) => `${serverPath.authenticated()}/remove?path=${path}`,
        share: (path: string, days: number) => `${serverPath.authenticated()}/share?path=${path}&days=${days}`,
        thumbnail: (path: string, maxDimension: number) =>
            `${serverPath.authenticated()}/thumbnail?path=${path}&maxDimension=${maxDimension}`,
    }),
});

export const serverFormData = Object.freeze({
    authenticatedPath: Object.freeze({
        file: (content: File) => createFormData({content}),
    }),
});

export const clientPath = Object.freeze({
    edit: (path: string) => `?${UrlParamName.location}=${AppLocation.edit}&${UrlParamName.path}=${path}`,
    inodes: (path: string) => `${clientUrl}#${path}`,
});
