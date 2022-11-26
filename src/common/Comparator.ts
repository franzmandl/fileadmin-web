import {Inode, isSpecial} from 'model/Inode';
import natsort from 'natsort';
import {Ided} from './Ided';

const compareName = natsort({insensitive: true});

export class Comparator {
    readonly compareFn: (a: Ided<Inode, unknown>, b: Ided<Inode, unknown>) => number;

    constructor(
        readonly sortAlphabetical: boolean,
        readonly sortAscending: boolean,
        readonly sortFoldersFirst: boolean,
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
            let rv;
            if (sortAlphabetical) {
                rv = compareName(a.friendlyName ?? a.basename, b.friendlyName ?? b.basename);
            } else {
                rv = a.lastModified < b.lastModified ? -1 : 1;
            }
            return rv * (sortAscending ? 1 : -1);
        };
    }
}
