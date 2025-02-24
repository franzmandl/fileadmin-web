/** Inclusive dot. */
const maxFileEndingLength = 5;
export const newLine = '\n';
export const separator = '/';

// Illegal characters taken from https://stackoverflow.com/questions/11721147/invalid-characters-in-a-filename-on-windows
export const nameAllowSlashRegex = /**/ /[<>:"\\|?*\n\t]/g;
export const windowsNameRegex = /*   */ /[<>:"\\|?*\n\t/]/g;

export const zeroWidthSpace = '\u200B';

export function breakSpecialCharacters(string: string): string {
    return string.replace(/[#$(*+\-<=?@[^_{|~]/g, (x) => zeroWidthSpace + x).replace(/[!%).\\:;>/\]}]/g, (x) => x + zeroWidthSpace);
}

export function getName(path: string): string {
    return path.substring(path.lastIndexOf(separator) + 1);
}

export function getParentPath(path: string): string {
    return path.substring(0, path.lastIndexOf(separator)) || separator;
}

export function resolvePath(parentPath: string, child: string): string {
    if (child.startsWith(separator)) {
        return child;
    } else if (child.startsWith('..' + separator)) {
        return resolvePath(
            parentPath === '' || parentPath === separator
                ? separator
                : parentPath.substring(0, Math.max(0, parentPath.lastIndexOf(separator))),
            child.substring(3),
        );
    } else if (parentPath === '' || parentPath === separator) {
        return separator + child;
    } else {
        return parentPath + takeStringIf(child.length !== 0, separator + child);
    }
}

export enum Type {
    audio,
    icon,
    image,
    markdown,
    media,
    pdf,
    svg,
    text,
    video,
}

const knownType = Object.freeze<Record<'audio' | 'empty' | 'image' | 'text' | 'video', ReadonlySet<Type>>>({
    audio: new Set([Type.media, Type.audio]),
    empty: new Set(),
    image: new Set([Type.media, Type.image]),
    text: new Set([Type.text]),
    video: new Set([Type.media, Type.video]),
});

const mimeTypeToType = Object.freeze<Record<string, ReadonlySet<Type> | undefined>>({
    'application/ecmascript': knownType.text,
    'application/javascript': knownType.text,
    'application/json': knownType.text,
    'application/pdf': new Set([Type.pdf]),
    'application/x-bsh': knownType.text,
    'application/x-csh': knownType.text,
    'application/x-javascript': knownType.text,
    'application/x-sh': knownType.text,
    'application/x-shar': knownType.text,
    'application/x-ksh': knownType.text,
    'application/x-latex': knownType.text,
    'application/xml': knownType.text,
    'audio/x-mpegurl': knownType.text,
    'message/rfc822': knownType.text,
    'image/svg+xml': new Set([Type.media, Type.image, Type.svg]),
    'image/tiff': knownType.empty,
    'image/vnd.microsoft.icon': new Set([Type.media, Type.image, Type.icon]),
    'image/x-icon': new Set([Type.media, Type.image, Type.icon]),
    'image/x-xcf': knownType.empty,
    'text/markdown': new Set([Type.text, Type.markdown]),
    'text/x-web-markdown': new Set([Type.text, Type.markdown]),
});

export function getType(mimeType: string): ReadonlySet<Type> {
    const lookup = mimeTypeToType[mimeType];
    if (lookup !== undefined) {
        return lookup;
    } else if (mimeType.startsWith('text/')) {
        return knownType.text;
    } else if (mimeType.startsWith('image/')) {
        return knownType.image;
    } else if (mimeType.startsWith('audio/')) {
        return knownType.audio;
    } else if (mimeType.startsWith('video/')) {
        return knownType.video;
    } else {
        return knownType.empty;
    }
}

export function isAnyType(type: ReadonlySet<Type>, ...testTypes: ReadonlyArray<Type>): boolean {
    for (const testType of testTypes) {
        if (type.has(testType)) {
            return true;
        }
    }
    return false;
}

export enum TimestampPrecision {
    year,
    month,
    day,
    hour,
    minute,
    second,
}

export const expressionToTimestampPrecision = Object.freeze<Record<string, TimestampPrecision | undefined>>({
    nowYear: TimestampPrecision.year,
    nowMonth: TimestampPrecision.month,
    nowDay: TimestampPrecision.day,
    nowHour: TimestampPrecision.hour,
    nowMinute: TimestampPrecision.minute,
    nowSecond: TimestampPrecision.second,
});

export function formatTimestamp(date: Date | undefined, precision: TimestampPrecision, minuteAndSecondSeparator: string): string {
    if (date === undefined) {
        return 'unknown';
    }
    const stringBuilder = [String(date.getFullYear())];
    if (TimestampPrecision.month <= precision) {
        pushTwoDigits(stringBuilder, '-', date.getMonth() + 1);
    }
    if (TimestampPrecision.day <= precision) {
        pushTwoDigits(stringBuilder, '-', date.getDate());
    }
    if (TimestampPrecision.hour <= precision) {
        pushTwoDigits(stringBuilder, ' ', date.getHours());
    }
    if (TimestampPrecision.minute <= precision) {
        pushTwoDigits(stringBuilder, minuteAndSecondSeparator, date.getMinutes());
    }
    if (TimestampPrecision.second <= precision) {
        pushTwoDigits(stringBuilder, minuteAndSecondSeparator, date.getSeconds());
    }
    return stringBuilder.join('');
}

function pushTwoDigits(stringBuilder: string[], prefix: string, value: number): void {
    stringBuilder.push(prefix);
    if (value < 10) {
        stringBuilder.push('0');
    }
    stringBuilder.push(String(value));
}

export function formatDate(date: Date): string {
    return formatTimestamp(date, TimestampPrecision.day, '');
}

export function equalsTimestamp(a: Date, b: Date, precision: TimestampPrecision): boolean {
    return (
        equalsTimestampHelper(TimestampPrecision.year <= precision, a.getFullYear(), b.getFullYear()) ??
        equalsTimestampHelper(TimestampPrecision.month <= precision, a.getMonth(), b.getMonth()) ??
        equalsTimestampHelper(TimestampPrecision.day <= precision, a.getDate(), b.getDate()) ??
        equalsTimestampHelper(TimestampPrecision.hour <= precision, a.getHours(), b.getHours()) ??
        equalsTimestampHelper(TimestampPrecision.minute <= precision, a.getMinutes(), b.getMinutes()) ??
        equalsTimestampHelper(TimestampPrecision.second <= precision, a.getSeconds(), b.getSeconds()) ??
        true
    );
}

function equalsTimestampHelper(shouldCheck: boolean, a: number, b: number): boolean | undefined {
    if (shouldCheck) {
        if (a !== b) {
            return false;
        }
    } else {
        return true;
    }
}

export function equalsDate(a: Date, b: Date): boolean {
    return equalsTimestamp(a, b, TimestampPrecision.day);
}

function parseDateHelper(yearString: string, monthString: string | undefined, dayString: string | undefined): Date {
    const year = Number(yearString);
    const month = monthString === undefined ? 0 : Math.min(Math.max(Number(monthString), 1), 12) - 1;
    const day = dayString === undefined ? 1 : Math.min(Math.max(Number(dayString), 1), 31);
    const date = new Date(year, month, day);
    return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year ? date : new Date(year, month + 1, 0);
}

const dateRegex = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

export function parseDate(string: string): Date | undefined {
    const groups = dateRegex.exec(string);
    return groups === null ? undefined : parseDateHelper(groups[1], groups[2], groups[3]);
}

function addPeriodInPlace(date: Date, period: string): boolean {
    const groups = /^([+-]?)(\d+)([dwmy])$/.exec(period);
    if (groups === null) {
        return false;
    }
    const amount = (groups[1] === '-' ? -1 : 1) * Number(groups[2]);
    switch (groups[3]) {
        case 'd':
            date.setDate(date.getDate() + amount);
            return true;
        case 'w':
            date.setDate(date.getDate() + amount * 7);
            return true;
        case 'm':
            date.setMonth(date.getMonth() + amount);
            return true;
        case 'y':
            date.setFullYear(Math.max(-10000, date.getFullYear() + amount));
            return true;
        default:
            return false;
    }
}

export function addPeriod(date: Date, period: string): Date | undefined {
    const result = new Date(date);
    return addPeriodInPlace(result, period) ? result : undefined;
}

export interface ParsedDate {
    readonly date?: Date;
    readonly string: string;
}

export function parseDatePeriod(string: string, now: Date): ParsedDate {
    return {
        date: parseDate(string) ?? addPeriod(now, string),
        string,
    };
}

export interface ParsedInteger {
    readonly value?: number;
    readonly string: string;
}

export function parseInteger(string: string): ParsedInteger {
    return {value: /^\d+$/.test(string) ? Number(string) : undefined, string};
}

const suffixes: ReadonlyArray<string> = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

export function humanFileSize(size: number): string {
    const exponent = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return String(Number((size / Math.pow(1024, exponent)).toFixed(2))) + ' ' + suffixes[exponent];
}

export function encodePath(path: string): string {
    return (path || separator)
        .split(separator)
        .map((pathPart) => encodeURIComponent(pathPart))
        .join(separator);
}

export function ifMinusOne(value: number, alternativeValue: number): number {
    return value === -1 ? alternativeValue : value;
}

export function takeStringIf(condition: boolean, string: string): string {
    return condition ? string : '';
}

export function getOriginalIndent(indentedValue: string): string {
    // Any character except ^-]\ add that character to the possible matches for the character class.
    // https://stackoverflow.com/questions/3210701/special-characters-in-regex-brackets
    return /^([ \t]*(((- )?\[[x ]\]|(- )?\([!/?iox ]\)|(- )?\+{2}|(- )?-{2}|(- )?\+-|[+\-=>~]) )?)/.exec(indentedValue)?.[1] ?? '';
}

export function getIndent(indentedValue: string): string {
    return getOriginalIndent(indentedValue).replaceAll('[x]', '[ ]');
}

export function getIndentOfLastLine(content: string): string {
    return getIndent(content.substring(content.lastIndexOf(newLine) + 1));
}

export function removeMatches(value: string, regex: RegExp): string {
    return value.replaceAll(regex, '');
}

/** @returns index inclusive dot. */
function getFileEndingIndex(name: string): number {
    const index = name.lastIndexOf('.');
    return index === -1 || index < name.length - maxFileEndingLength ? -1 : index;
}

export function removeFileEnding(name: string): string {
    const index = getFileEndingIndex(name);
    return index === -1 ? name : name.substring(0, index);
}

/** @returns inclusive dot. */
export function getFileEnding(name: string): string {
    const index = getFileEndingIndex(name);
    return index === -1 ? '' : name.substring(index);
}

export function arrayAddInPlace<T>(array: T[], index: number, value: T): T[] {
    array.splice(index, 0, value);
    return array;
}

export function arrayReplaceInPlace<T>(array: T[], index: number, value: T): T[] {
    array.splice(index, 1, value);
    return array;
}

/**
 * Shuffles array in place.
 * see https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 */
export function arrayShuffleInPlace<T>(array: T[]): T[] {
    let j, temp, i;
    for (i = array.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

export function arrayRemoveInPlace<T>(array: T[], index: number): T[] {
    array.splice(index, 1);
    return array;
}

export function arrayRemoveInPlaceByValue<T>(array: T[], value: T): T[] {
    const index = array.indexOf(value);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

// Taken from https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
export function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

export function alwaysThrow(error: unknown): never {
    throw error;
}

export function identity<T>(value: T): T {
    return value;
}

export const noop: (..._: ReadonlyArray<unknown>) => void = () => undefined;

/**
 * Inspired by https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
 */
export function assertUnreachable(...cause: ReadonlyArray<never>): never {
    throw new Error('Impossible state', {cause});
}

export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function createFormData(record: Readonly<Record<string, string | Blob>>): FormData {
    const formData = new FormData();
    Object.entries(record).forEach(([name, value]) => formData.append(name, value));
    return formData;
}

export function getHashParams(): URLSearchParams {
    return new URLSearchParams(window.location.hash.substring(1));
}

export function deleteParam(params: URLSearchParams, name: string): URLSearchParams {
    params.delete(name);
    return params;
}

export function setParam(params: URLSearchParams, name: string, value: string): URLSearchParams {
    params.set(name, value);
    return params;
}

export function setOrDeleteParam(params: URLSearchParams, condition: boolean, name: string, value: string): void {
    if (condition) {
        params.set(name, value);
    } else {
        params.delete(name);
    }
}

export function paramsToHash(params: URLSearchParams): string {
    return '#' + params.toString().replaceAll('%2F', separator);
}

export function pushHash(params: URLSearchParams): URLSearchParams {
    window.history.pushState(null, '', paramsToHash(params)); // Does not fire hashchange-event.
    return params;
}

export function replaceHash(params: URLSearchParams): URLSearchParams {
    window.history.replaceState(null, '', paramsToHash(params)); // Does not fire hashchange-event.
    return params;
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator#options
const compareNaturalOptions = Object.freeze<Intl.CollatorOptions>({
    numeric: true,
    sensitivity: 'base',
});

export function compareNatural(a: string, b: string): number {
    return a.localeCompare(b, undefined, compareNaturalOptions);
}
