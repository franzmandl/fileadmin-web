import classNames from 'classnames';
import {focusNothing, stopPropagation, useDepsEffect} from 'common/ReactUtil';
import {separator, paramsToHash} from 'common/Util';
import React, {Fragment, useRef} from 'react';

const anchorClassName = 'd-inline-block text-decoration-none px-1 py-2';

export function DirectoryBreadcrumb({
    disabled,
    getEncodedPath,
    onClick,
    path,
}: {
    readonly disabled: boolean;
    readonly getEncodedPath: (path: string) => URLSearchParams;
    readonly onClick: (ev: React.MouseEvent) => void;
    readonly path: string;
}): React.JSX.Element {
    const wrapperRef = useRef<HTMLDivElement>(null);
    useDepsEffect(() => {
        wrapperRef.current?.scrollTo(20000, 0);
    }, [path]);

    let pathBuilder = '';
    return (
        <div
            className={classNames('overflow-auto text-nowrap', {hoverable: disabled})}
            onClick={disabled ? onClick : stopPropagation}
            ref={wrapperRef}
        >
            <a className={classNames(anchorClassName, {disabled})} href={paramsToHash(getEncodedPath(separator))} onClick={focusNothing}>
                /
            </a>
            {path.length > 1 &&
                path
                    .substring(1)
                    .split(separator)
                    .map((part) => {
                        pathBuilder += separator + part;
                        return (
                            <Fragment key={pathBuilder}>
                                <span className='d-inline-block py-2 mdi mdi-chevron-right' />
                                <a
                                    className={classNames(anchorClassName, {disabled})}
                                    href={paramsToHash(getEncodedPath(pathBuilder))}
                                    onClick={focusNothing}
                                >
                                    {part}
                                </a>
                            </Fragment>
                        );
                    })}
        </div>
    );
}
