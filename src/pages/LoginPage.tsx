import {AxiosStatic} from 'axios';
import {serverPath, constant} from 'common/constants';
import {FormGroupCheckbox} from 'components/util/FormGroupCheckbox';
import React, {useState} from 'react';
import {Button, Card, CardBody, CardHeader, Col, Form, FormGroup, Input, Label} from 'reactstrap';
import './LoginPage.scss';
import {focusNothing} from 'common/ReactUtil';
import {AppContext} from 'stores/AppContext';
import {useAsyncCallback} from 'common/useAsyncCallback';

export function LoginPage({
    axios,
    context: {appStore, authenticationStore, consoleStore},
}: {
    readonly axios: AxiosStatic;
    readonly context: AppContext;
}): React.JSX.Element {
    const [username, setUsername] = useState<string>(appStore.appParameter.values.username);
    const [password, setPassword] = useState<string>('');
    const [rememberMe, setRememberMe] = useState<boolean>(appStore.appParameter.values.rememberMe);

    const login = useAsyncCallback(
        () => {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);
            if (rememberMe) {
                params.append('remember-me', '1');
            }
            return appStore.indicateLoading(
                appStore.preventClose(
                    axios.post(serverPath.login(), params, {
                        withCredentials: true,
                    }),
                ),
            );
        },
        () => authenticationStore.setIsLoggedIn(true),
        consoleStore.handleError,
    );

    return (
        <Form
            onSubmit={(ev): void => {
                ev.preventDefault();
                login();
            }}
            className='login-page'
        >
            <div>
                <div className='container'>
                    <Card color='dark' inverse>
                        <CardHeader tag='h2'>{constant.title}</CardHeader>
                        <CardBody>
                            <FormGroup row>
                                <Label lg='2'>Username</Label>
                                <Col lg='10'>
                                    <Input autoFocus={!username} value={username} onChange={(ev): void => setUsername(ev.target.value)} />
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Label lg='2'>Password</Label>
                                <Col lg='10'>
                                    <Input
                                        autoFocus={!!username}
                                        type='password'
                                        value={password}
                                        onChange={(ev): void => setPassword(ev.target.value)}
                                    />
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Col
                                    lg={{
                                        offset: 2,
                                        size: 10,
                                    }}
                                >
                                    <FormGroupCheckbox checked={rememberMe} setChecked={setRememberMe}>
                                        Remember me
                                    </FormGroupCheckbox>
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Col
                                    lg={{
                                        offset: 2,
                                        size: 10,
                                    }}
                                >
                                    <Button type='submit' onClick={focusNothing}>
                                        Login
                                    </Button>
                                </Col>
                            </FormGroup>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </Form>
    );
}
