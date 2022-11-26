export const newLine = '\n';
export const separator = '/';

// Illegal characters taken from https://stackoverflow.com/questions/11721147/invalid-characters-in-a-filename-on-windows
export const basenameAllowSlashRegExp = /**/ /[<>:"\\|?*\n\t]/g;
export const windowsBasenameRegExp = /*   */ /[<>:"\\|?*\n\t/]/g;

const zeroWidthSpace = '\u200B';

export function breakSpecialCharacters(string: string): string {
    return string.replace(/[#$(*+\-<=?@[^_{|~]/g, (x) => zeroWidthSpace + x).replace(/[!%).\\:;>/\]}]/g, (x) => x + zeroWidthSpace);
}

export function decodePath(path: string): string {
    return (path || separator)
        .split(separator)
        .map((pathPart) => decodeURIComponent(pathPart))
        .join(separator);
}

export function getCurrentPath(): string {
    return decodePath(window.location.hash.substring(1));
}

export function getBasename(path: string): string {
    return path.substring(path.lastIndexOf(separator) + 1);
}

export function getParentPath(path: string): string {
    return path.substring(0, path.lastIndexOf(separator)) || separator;
}

export function appendSeparatorIfNecessary(path: string): string {
    return path !== '' ? path + separator : '';
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

const mimeTypeToType = Object.freeze<Record<string, ReadonlyArray<Type> | undefined>>({
    'application/ecmascript': [Type.text],
    'application/javascript': [Type.text],
    'application/json': [Type.text],
    'application/pdf': [Type.pdf],
    'application/x-bsh': [Type.text],
    'application/x-csh': [Type.text],
    'application/x-javascript': [Type.text],
    'application/x-sh': [Type.text],
    'application/x-shar': [Type.text],
    'application/x-ksh': [Type.text],
    'application/x-latex': [Type.text],
    'application/xml': [Type.text],
    'audio/x-mpegurl': [Type.text],
    'image/x-icon': [Type.media, Type.image, Type.icon],
    'image/svg+xml': [Type.media, Type.image, Type.svg],
    'image/vnd.microsoft.icon': [Type.media, Type.image, Type.icon],
    'message/rfc822': [Type.text],
    'text/x-web-markdown': [Type.text, Type.markdown],
    'text/markdown': [Type.text, Type.markdown],
});

export function getType(mimeType: string): ReadonlyArray<Type> {
    const lookup = mimeTypeToType[mimeType];
    if (lookup !== undefined) {
        return lookup;
    } else if (mimeType.startsWith('text/')) {
        return [Type.text];
    } else if (mimeType.startsWith('image/')) {
        return [Type.media, Type.image];
    } else if (mimeType.startsWith('audio/')) {
        return [Type.media, Type.audio];
    } else if (mimeType.startsWith('video/')) {
        return [Type.media, Type.video];
    } else {
        return [];
    }
}

export function isAnyType(type: ReadonlyArray<Type>, ...testTypes: ReadonlyArray<Type>): boolean {
    for (const testType of testTypes) {
        if (type.indexOf(testType) !== -1) {
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

export function formatTimestamp(timestamp: Date | number, precision: TimestampPrecision): string {
    const date = new Date(timestamp);
    const stringBuilder = [String(date.getFullYear())];

    function pushTwoDigits(prefix: string, value: number) {
        stringBuilder.push(prefix);
        if (value < 10) {
            stringBuilder.push('0');
        }
        stringBuilder.push(String(value));
    }

    if (TimestampPrecision.month <= precision) {
        pushTwoDigits('-', date.getMonth() + 1);
    }
    if (TimestampPrecision.day <= precision) {
        pushTwoDigits('-', date.getDate());
    }
    if (TimestampPrecision.hour <= precision) {
        pushTwoDigits(' ', date.getHours());
    }
    if (TimestampPrecision.minute <= precision) {
        pushTwoDigits(':', date.getMinutes());
    }
    if (TimestampPrecision.second <= precision) {
        pushTwoDigits(':', date.getSeconds());
    }
    return stringBuilder.join('');
}

export function humanFileSize(size: number): string {
    const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return String(Number((size / Math.pow(1024, i)).toFixed(2))) + ' ' + ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'][i];
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

export function getOriginalIndent(indentedValue: string): string {
    // Any character except ^-]\ add that character to the possible matches for the character class.
    // https://stackoverflow.com/questions/3210701/special-characters-in-regex-brackets
    return indentedValue.match(/^([ \t]*(((- )?\[[x ]\]|(- )?\([!/?iox ]\)|[+\-=>~]) )?)/)?.[1] ?? '';
}

export function getIndent(indentedValue: string): string {
    return getOriginalIndent(indentedValue).replaceAll('[x]', '[ ]');
}

export function getIndentOfLastLine(content: string): string {
    return getIndent(content.substring(content.lastIndexOf(newLine) + 1));
}

export function removeMatches(value: string, regExp: RegExp): string {
    return value.replaceAll(regExp, '');
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

// Taken from https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
export function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

export const noop: (..._: ReadonlyArray<unknown>) => void = () => undefined;

export function identity<T>(value: T): T {
    return value;
}

export function alwaysThrow(error: unknown): never {
    throw error;
}

export function createFormData(record: Readonly<Record<string, string | Blob>>): FormData {
    const formData = new FormData();
    Object.entries(record).forEach(([name, value]) => formData.append(name, value));
    return formData;
}
