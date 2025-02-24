import {ReactNode, useState} from 'react';
import {Pagination, PaginationItem, PaginationLink, PaginationProps} from 'reactstrap';
import './usePagination.scss';

export function usePagination(
    itemSize: number,
    pageSize: number,
    paginationProps: PaginationProps,
): {
    readonly fromIndex: number;
    readonly pagination: ReactNode;
    readonly toIndex: number;
} {
    const lastIndex = itemSize - 1;
    const lastPage = Math.max(0, Math.floor(lastIndex / Math.max(1, pageSize)));
    const [currentPage, setCurrentPage] = useState(0);
    const previousPage = currentPage - 1;
    const isFirstPage = currentPage === 0;
    const nextPage = currentPage + 1;
    const isLastPage = currentPage === lastPage;
    const pageNodes: ReactNode[] = [];
    while (pageNodes.length <= lastPage) {
        const page = pageNodes.length;
        pageNodes.push(
            <PaginationItem key={page} active={currentPage === page}>
                <PaginationLink onClick={(): void => setCurrentPage(page)}>{page + 1}</PaginationLink>
            </PaginationItem>,
        );
    }
    return {
        fromIndex: currentPage * pageSize,
        pagination: lastPage !== 0 && (
            <Pagination className='use-pagination' {...paginationProps}>
                <PaginationItem disabled={isFirstPage}>
                    <PaginationLink first onClick={(): void => setCurrentPage(0)} />
                </PaginationItem>
                <PaginationItem disabled={isFirstPage}>
                    <PaginationLink previous onClick={(): void => setCurrentPage(previousPage)} />
                </PaginationItem>
                {pageNodes}
                <PaginationItem disabled={isLastPage}>
                    <PaginationLink next onClick={(): void => setCurrentPage(nextPage)} />
                </PaginationItem>
                <PaginationItem disabled={isLastPage}>
                    <PaginationLink last onClick={(): void => setCurrentPage(lastPage)} />
                </PaginationItem>
            </Pagination>
        ),
        toIndex: currentPage * pageSize + pageSize,
    };
}
