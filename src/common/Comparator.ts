import {Inode, isSpecial} from 'model/Inode';
import {Ided} from './Ided';

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator#options
const options: Readonly<Intl.CollatorOptions> = {
    numeric: true,
    sensitivity: 'base',
};

export function compareNatural(a: string, b: string): number {
    return a.localeCompare(b, undefined, options);
}

export class Comparator {
    readonly compareFn: (a: Ided<Inode, unknown>, b: Ided<Inode, unknown>) => number;

    constructor(
        readonly sortAlphabetical: boolean,
        readonly sortAscending: boolean,
        readonly sortFoldersFirst: boolean,
        readonly sortPriority: boolean,
        readonly sortSpecialFirst: boolean
    ) {
        this.compareFn = ({data: a}, {data: b}) => {
            if (sortSpecialFirst) {
                if (isSpecial(a)) {
                    if (!isSpecial(b)) {
                        return -1;
                    }
                } else if (isSpecial(b)) {
                    return 1;
                }
            }
            if (sortFoldersFirst) {
                if (a.isDirectory) {
                    if (!b.isDirectory) {
                        return -1;
                    }
                } else if (b.isDirectory) {
                    return 1;
                }
            }
            if (sortPriority) {
                if (a.task !== null) {
                    if (b.task === null || a.task.priority > b.task.priority) {
                        return -1;
                    } else if (a.task.priority < b.task.priority) {
                        return 1;
                    }
                } else if (b.task !== null) {
                    return -1;
                }
            }
            let rv;
            if (sortAlphabetical) {
                rv = compareNatural(a.orderName, b.orderName);
            } else if (a.lastModified === b.lastModified) {
                rv = 0;
            } else if (a.lastModified === null) {
                rv = 1;
            } else if (b.lastModified === null || a.lastModified < b.lastModified) {
                rv = -1;
            } else {
                rv = 1;
            }
            return rv * (sortAscending ? 1 : -1);
        };
    }
}
