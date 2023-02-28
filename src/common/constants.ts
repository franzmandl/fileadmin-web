import {createFormData, formatTimestamp, getParentPath, TimestampPrecision} from './Util';

export enum AppLocation {
    edit = 'edit',
    inodes = 'inodes',
}

export enum ParamName {
    action = 'action',
    decentDirectory = 'decentDirectory',
    decentFile = 'decentFile',
    decentReadmeFile = 'decentReadmeFile',
    decentRunLastFile = 'decentRunLastFile',
    gallery = 'gallery',
    location = 'location',
    path = 'path',
    showHidden = 'showHidden',
    showLastModified = 'showLastModified',
    showMimeType = 'showMimeType',
    showNotRepeating = 'showNotRepeating',
    showSize = 'showSize',
    showThumbnail = 'showThumbnail',
    showUnavailable = 'showUnavailable',
    showWaiting = 'showWaiting',
    sortAlphabetical = 'sortAlphabetical',
    sortAscending = 'sortAscending',
    sortFoldersFirst = 'sortFoldersFirst',
    sortPriority = 'sortPriority',
    sortSpecialFirst = 'sortSpecialFirst',
    spellCheck = 'spellCheck',
    today = 'today',
    username = 'username',
}

export enum LocalStorageKey {
    rememberMe = 'remember-me',
}

export enum HistoryState {
    galleryWasOpened = 'galleryWasOpened',
}

const url = new URL(window.location.href);
url.hash = '';
url.pathname = getParentPath(getParentPath(url.pathname));
url.search = '';
const serverUrl = process.env.REACT_APP_SERVER_URL ?? url.toString();

type KnownTaskActions = Record<string, {readonly friendlyName: string; readonly className: string} | undefined>;
const knownTaskActions = Object.freeze<KnownTaskActions>({
    '20-backlog': {friendlyName: 'Backlog', className: 'bg-secondary text-light'},
    '40-to_do': {friendlyName: 'To Do', className: 'bg-warning text-dark'},
    '50-in_progress': {friendlyName: 'In Progress', className: 'bg-primary text-light'},
    '60-done': {friendlyName: 'Done', className: 'bg-success text-light'},
    '80-aborted': {friendlyName: 'Aborted', className: 'bg-danger text-light'},
    ...(JSON.parse(process.env.REACT_APP_KNOWN_TASK_ACTIONS ?? '{}') as KnownTaskActions),
});

export const constant = Object.freeze({
    header: Object.freeze({
        // I recommend using small letters.
        lastModified: 'x-last-modified',
    }),
    indent: '  ',
    indentRegex: /^(\t| {2})/,
    knownTaskActions,
    saveTimeoutMs: 2000,
    shareDays: 2,
    title: url.hostname,
    today: formatTimestamp(new Date(), TimestampPrecision.day, '.'),
    username: process.env.REACT_APP_SERVER_USERNAME ?? '',
});

export const serverPath = Object.freeze({
    authenticated: () => `${serverUrl}/service`,
    bookmarks: () => `${serverUrl}/bookmarks`,
    bookmarksPrivate: () => `${serverPath.bookmarks()}/private`,
    error: () => `${serverUrl}/error`,
    login: () => `${serverUrl}/login`,
    web: () => `${serverUrl}/web`,
    authenticatedPath: Object.freeze({
        command: () => `${serverPath.authenticated()}/command`,
        directory: (path: string) => `${serverPath.authenticated()}/directory?path=${path}`,
        file: (path: string) => `${serverPath.authenticated()}/file?path=${path}`,
        fileStream: (path: string) => `${serverPath.authenticated()}/file/stream?path=${path}`,
        inode: (path: string) => `${serverPath.authenticated()}/inode?path=${path}`,
        logout: () => `${serverPath.authenticated()}/logout`,
        suggestion: (path: string, word: string) => `${serverPath.authenticated()}/suggestion?path=${path}&word=${word}`,
        thumbnail: (path: string, maxDimension: number) =>
            `${serverPath.authenticated()}/thumbnail?path=${path}&maxDimension=${maxDimension}`,
    }),
});

export const serverFormData = Object.freeze({
    authenticatedPath: Object.freeze({
        file: (content: File) => createFormData({content}),
    }),
});

/*
 * see https://www.regular-expressions.info/unicode.html
 * see https://javascript.info/regexp-unicode
 */
export const tagEndingRegex = /[\p{L}\d_]*/u;
export const tagNameRegex = new RegExp('(?:\\p{L}+|\\d+[\\p{L}_])' + tagEndingRegex.source, 'u');
export const tagRegex = new RegExp('#@?' + tagNameRegex.source, 'u');
export const tagRegexGrouped = new RegExp('(' + tagRegex.source + ')', 'u');
/*
 * URL regex adapted from https://www.ietf.org/rfc/rfc3986.txt https://urlregex.com/
 * Replaced group indicators "(" with non-capturing group indicator "(?:" see https://stackoverflow.com/questions/21419530/use-of-capture-groups-in-string-split
 * Added quotation mark '"', parentheses "(" ")", space " " to character ranges.
 * Made it string compatible.
 */
//                                    http         ://domain.test  /path          ?name=value    #hash
export const urlRegex = new RegExp('([^:/?#"()\\s]+://[^/?#"()\\s]+[^?#"\\s]*(?:\\?[^#"\\s]*)?(?:#[^"\\s]*)?|mailto:[^@]+@[^/?#"()\\s]+)');
export const wholeUrlRegex = new RegExp('^' + urlRegex.source + '$');
