export interface Ticket {
    readonly actions: {readonly [action: string]: string};
    readonly date: string;
    readonly isWaiting: boolean;
    readonly usesExpression: boolean;
    readonly fileEnding: string;
}
