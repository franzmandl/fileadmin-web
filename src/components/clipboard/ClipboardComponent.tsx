import {ClipboardControl, ClipboardItem} from './ClipboardControl';
import './ClipboardComponent.scss';
import {Button} from 'reactstrap';
import {AppContext} from 'stores/AppContext';
import {useMove} from 'components/inode/useMove';
import {Thumbnail} from 'components/inode/Thumbnail';

export function ClipboardComponent({
    clipboardControl,
    context,
    isLoggedIn,
}: {
    readonly clipboardControl: ClipboardControl;
    readonly context: AppContext;
    readonly isLoggedIn: boolean;
}): React.JSX.Element {
    const {clipboardStore} = context;
    if (clipboardControl.items.size === 0) {
        return <></>;
    }
    return (
        <div className='clipboard-component' hidden={!isLoggedIn}>
            <Button className='m-1 mdi mdi-close' onClick={clipboardStore.clear} />
            {Array.from(clipboardControl.items.entries(), ([id, item]) => (
                <ClipboardItemComponent key={id} id={id} context={context} item={item} />
            )).reverse()}
        </div>
    );
}

function ClipboardItemComponent({
    context,
    id,
    item,
}: {
    readonly context: AppContext;
    readonly id: string;
    readonly item: ClipboardItem;
}): React.JSX.Element {
    const {appStore, clipboardStore, inodeEventBus} = context;
    const {
        appParameter: {
            values: {path},
        },
    } = appStore;
    const move = useMove({
        context,
        newParentPath: path,
        oldPath: id,
        onMove: (newInode) => {
            clipboardStore.remove(id);
            inodeEventBus.fireMove(newInode, id, item.parentPath);
            appStore.toast('Success');
        },
    });
    return (
        <div className='overflow-ellipsis'>
            <Button className='m-1 mdi mdi-content-paste' onClick={(): void => void move(item.name)} />
            <Button className='m-1 mdi mdi-close' onClick={(): void => clipboardStore.remove(id)} />
            {item.thumbnailUrl !== undefined && <Thumbnail thumbnailUrl={item.thumbnailUrl} />}
            {item.name} <small className='text-muted'>{id}</small>
        </div>
    );
}
