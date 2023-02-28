export interface Operation {
    readonly canDirectoryAdd: boolean;
    readonly canDirectoryGet: boolean;
    readonly canFileGet: boolean;
    readonly canFileSet: boolean;
    readonly canFileStream: boolean;
    readonly canInodeCopy: boolean;
    readonly canInodeDelete: boolean;
    readonly canInodeMove: boolean;
    readonly canInodeRename: boolean;
    readonly canInodeShare: boolean;
}
