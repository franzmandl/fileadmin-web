export interface ClipboardItem {
    readonly name: string;
    readonly parentPath: string;
    readonly thumbnailUrl?: string;
}

export interface ClipboardControl {
    readonly items: ReadonlyMap<string, ClipboardItem>;
}
