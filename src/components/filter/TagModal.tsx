import {useDepsEffect} from 'common/ReactUtil';
import {paramsToHash, resolvePath, separator, takeStringIf} from 'common/Util';
import {filterOperatorEvaluate} from 'common/constants';
import {FormGroupCheckbox} from 'components/util/FormGroupCheckbox';
import {DirectoryPageContext} from 'pages/DirectoryPageContext';
import React, {useState} from 'react';
import {Col, Modal, ModalBody, ModalHeader, Row} from 'reactstrap';

export interface TagModalControl {
    readonly clickedTag: string;
    readonly filterOutputPath: string;
    readonly filterTags: ReadonlyArray<string>;
}

export function TagModal({
    context: {
        appContext: {appStore},
    },
    control,
    toggle,
}: {
    readonly context: DirectoryPageContext;
    readonly control: TagModalControl | undefined;
    readonly toggle: () => void;
}): React.JSX.Element {
    const [selected, setSelected] = useState<ReadonlyArray<string>>([]);
    useDepsEffect(() => {
        if (control !== undefined) {
            setSelected([control.clickedTag]);
        }
    }, [control]);
    const filterOutputPath = control?.filterOutputPath ?? '';
    const filterTags = control?.filterTags ?? [];
    const [evaluate, setEvaluate] = useState(false);
    const href = paramsToHash(
        appStore.appParameter.getEncodedPath(
            resolvePath(resolvePath(filterOutputPath, selected.join(separator)), takeStringIf(evaluate, filterOperatorEvaluate)),
        ),
    );
    return (
        <Modal container={appStore.modalContainerRef} isOpen={control !== undefined} size='lg' toggle={toggle}>
            <ModalHeader toggle={toggle}>Tag</ModalHeader>
            <ModalBody>
                <Row>
                    <Col lg={{size: 6}}>
                        <FormGroupCheckbox checked={evaluate} setChecked={setEvaluate}>
                            {filterOperatorEvaluate}
                        </FormGroupCheckbox>
                    </Col>
                    {filterTags.map((tag) => (
                        <Col key={tag} lg={{size: 6}}>
                            <FormGroupCheckbox
                                checked={selected.indexOf(tag) !== -1}
                                setChecked={(checked): void =>
                                    setSelected(checked ? [...selected, tag] : selected.filter((selectedTag) => selectedTag !== tag))
                                }
                            >
                                {tag}
                            </FormGroupCheckbox>
                        </Col>
                    ))}
                </Row>
                <a
                    href={href}
                    target='_blank'
                    rel='noreferrer'
                    className='btn btn-secondary d-block w-100'
                    onClick={(): void => void setTimeout(() => toggle(), 200)}
                >
                    Go
                </a>
            </ModalBody>
        </Modal>
    );
}
