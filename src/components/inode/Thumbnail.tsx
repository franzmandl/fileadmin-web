import {useRef} from 'react';
import './Thumbnail.scss';
import {RenderIfVisible} from 'components/util/RenderIfVisible';
import classNames from 'classnames';

export function Thumbnail({className, thumbnailUrl}: {readonly className?: string; readonly thumbnailUrl: string}): React.JSX.Element {
    const thumbnailIntersectionRef = useRef<HTMLDivElement>(null);
    return (
        <div className={classNames('thumbnail', className)} ref={thumbnailIntersectionRef}>
            <RenderIfVisible intersectionRef={thumbnailIntersectionRef}>
                <img src={thumbnailUrl} alt='thumbnail' />
            </RenderIfVisible>
        </div>
    );
}
