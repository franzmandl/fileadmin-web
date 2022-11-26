import {AxiosResponse} from 'axios';

export function getResponseData<T>({data}: AxiosResponse<T>): T {
    return data;
}
