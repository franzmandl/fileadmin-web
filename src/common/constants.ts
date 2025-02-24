import {createFormData, formatDate, getHashParams, getParentPath, parseDatePeriod, separator} from './Util';

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
    now = 'now',
    pageSize = 'pageSize',
    path = 'path',
    rememberMe = 'rememberMe',
    showDateFrom = 'showDateFrom',
    showDateTo = 'showDateTo',
    showHidden = 'showHidden',
    showLastModified = 'showLastModified',
    showMimeType = 'showMimeType',
    showNotRepeating = 'showNotRepeating',
    showSize = 'showSize',
    showThumbnail = 'showThumbnail',
    showWaiting = 'showWaiting',
    sortAscending = 'sortAscending',
    sortAttribute = 'sortAttribute',
    sortFoldersFirst = 'sortFoldersFirst',
    sortPriority = 'sortPriority',
    sortSpecialFirst = 'sortSpecialFirst',
    sortTime = 'sortTime',
    sortTrim = 'sortTrim',
    spellCheck = 'spellCheck',
    username = 'username',
}

export enum LocalStorageKey {
    clipboard = 'clipboard',
}

export enum HistoryState {
    galleryWasOpened = 'galleryWasOpened',
}

const url = new URL(window.location.href);
url.hash = '';
url.pathname = getParentPath(getParentPath(url.pathname));
url.search = '';
const serverUrl = process.env.REACT_APP_SERVER_URL ?? url.toString();

interface KnownTaskAction {
    readonly keys: ReadonlyArray<string>;
    readonly friendlyName: string;
    readonly className: string;
}
const mutableKnownTaskActions = new Map<string, KnownTaskAction>();
(JSON.parse(process.env.REACT_APP_KNOWN_TASK_ACTIONS ?? '[]') as ReadonlyArray<KnownTaskAction>).forEach((knownTaskAction) => {
    knownTaskAction.keys.forEach((key) => {
        mutableKnownTaskActions.set(key, knownTaskAction);
    });
});
const knownTaskActions: ReadonlyMap<string, KnownTaskAction> = mutableKnownTaskActions;

const hashParams = getHashParams();
const loadPageDate = new Date();
loadPageDate.setHours(0, 0, 0, 0);
const now = parseDatePeriod(hashParams.get(ParamName.now) ?? '', loadPageDate).date ?? loadPageDate;

const pageSize = 500;

export const constant = Object.freeze({
    hashParams,
    header: Object.freeze({
        // I recommend using small letters.
        lastModifiedMilliseconds: 'x-last-modified-milliseconds',
    }),
    imageOfPdfDimension: 1000,
    indent: '  ',
    indentRegex: /^(\t| {2})/,
    knownTaskActions,
    loadPageDate,
    markdownImageDimension: 360,
    maxShowContentSize: 500000,
    now,
    nowString: formatDate(now),
    pageSize,
    pageSizeString: pageSize.toString(),
    priorityOfItem: Object.freeze({
        compareMultiplier: -1,
        default: 0,
    }),
    priorityOfTask: Object.freeze({
        compareMultiplier: 1,
        default: Infinity,
    }),
    saveTimeoutMs: 5000,
    shareDays: 2,
    thumbnailDimension: 100,
    title: url.hostname,
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
        command: () => `${serverPath.authenticated()}/command?now=${constant.nowString}`,
        directory: (path: string) => `${serverPath.authenticated()}/directory?now=${constant.nowString}&path=${path}`,
        file: (path: string) => `${serverPath.authenticated()}/file?now=${constant.nowString}&path=${path}`,
        fileConvertImageToImage: (path: string, maxDimension: number) =>
            `${serverPath.authenticated()}/file/convert/image/to/image?now=${constant.nowString}&maxDimension=${maxDimension}&path=${path}`,
        fileConvertPdfToImage: (path: string, maxDimension: number) =>
            `${serverPath.authenticated()}/file/convert/pdf/to/image?now=${constant.nowString}&maxDimension=${maxDimension}&path=${path}`,
        fileStream: (path: string) => `${serverPath.authenticated()}/file/stream?now=${constant.nowString}&path=${path}`,
        inode: (path: string) => `${serverPath.authenticated()}/inode?now=${constant.nowString}&path=${path}`,
        logout: () => `${serverPath.authenticated()}/logout`,
        scanItems: (path: string) => `${serverPath.authenticated()}/scanItems?now=${constant.nowString}&path=${path}`,
        suggestion: (path: string, word: string) =>
            `${serverPath.authenticated()}/suggestion?now=${constant.nowString}&word=${word}&path=${path}`,
    }),
});

export const serverFormData = Object.freeze({
    authenticatedPath: Object.freeze({
        file: (content: File) => createFormData({content}),
    }),
});

export const filterOperatorEvaluate = ',evaluate';
/*
 * see https://www.regular-expressions.info/unicode.html
 * see https://javascript.info/regexp-unicode
 */
const tagEndingRegex = /[\p{L}\d_]*/u;
const tagNameRegex = new RegExp('(?:\\p{L}+|\\d+[\\p{L}_])' + tagEndingRegex.source, 'u');
const tagNamePrefix = '#';
export const tagRegexGrouped = new RegExp('((' + tagNamePrefix + ')(' + tagNameRegex.source + '))', 'u');
/*
 * URL regex adapted from https://www.ietf.org/rfc/rfc3986.txt https://urlregex.com/
 * Replaced group indicators "(" with non-capturing group indicator "(?:" see https://stackoverflow.com/questions/21419530/use-of-capture-groups-in-string-split
 * Added quotation mark '"', parentheses "(" ")", space " " to character ranges.
 * Made it string compatible.
 */
//                                    http         ://domain.test  /path          ?name=value    #hash
export const urlRegex = new RegExp('([^:/?#"()\\s]+://[^/?#"()\\s]+[^?#"\\s]*(?:\\?[^#"\\s]*)?(?:#[^"\\s]*)?|mailto:[^@]+@[^/?#"()\\s]+)');
export const wholeUrlRegex = new RegExp('^' + urlRegex.source + '$');

export interface WordRegex {
    readonly startRegex: RegExp;
    readonly endRegex: RegExp;
}

export const hashWordRegex: WordRegex = {
    startRegex: new RegExp(tagNamePrefix + tagNameRegex.source + '$', 'u'),
    endRegex: new RegExp('^' + tagEndingRegex.source, 'u'),
};

export const separatorWordRegex: WordRegex = {
    startRegex: new RegExp(separator + tagNameRegex.source + '$', 'u'),
    endRegex: hashWordRegex.endRegex,
};
