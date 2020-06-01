import axios, { AxiosResponse } from 'axios';
import { IActivity, IActivitiesEnvelope } from '../models/activity';
import { history } from '../..';
import { toast } from 'react-toastify';
import { IUser, IUserFormValues } from '../models/user';
import { IProfile, IPhoto } from '../models/profile';

axios.defaults.baseURL = process.env.REACT_APP_API_URL;

axios.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem('jwt');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(undefined, (error) => {
  const originalRequest = error.config;

  if (error.message === 'Network Error' && !error.response) {
    toast.error('Network error');
  }

  const { status, data, config } = error.response;

  if (status === 404) {
    history.push('/notfound');
  }

  if (status === 401 && originalRequest.url.endsWith('refresh')) {
    window.localStorage.removeItem('jwt');
    window.localStorage.removeItem('refreshToken');
    history.push('/');
    toast.info('Your session has expired, please login again');
    return Promise.reject(error);
  }

  if (status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    return axios
      .post('/user/refresh', {
        token: window.localStorage.getItem('jwt'),
        refreshToken: window.localStorage.getItem('refreshToken'),
      })
      .then((res) => {
        window.localStorage.setItem('jwt', res.data.token);
        window.localStorage.setItem('refreshToken', res.data.refreshToken);
        axios.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${res.data.token}`;
        return axios(originalRequest);
      });
  }

  if (
    status === 400 &&
    config.method === 'get' &&
    data.errors.hasOwnProperty('id')
  ) {
    history.push('/notfound');
  }

  if (status === 500) {
    toast.error('Server error');
  }

  throw error.response;
});

const responseBody = (response: AxiosResponse) => response.data;

// const sleep = (ms: number) => (response: AxiosResponse) => {
//     new Promise<AxiosResponse>(resolve => setTimeout(() => resolve(response), ms));
// }

// const sleep = (ms: number) => (response: AxiosResponse) =>
//     new Promise<AxiosResponse>(resolve => setTimeout(() => resolve(response), ms));

const request = {
  get: (url: string) => axios.get(url).then(responseBody),
  post: (url: string, body: {}) => axios.post(url, body).then(responseBody),
  put: (url: string, body: {}) => axios.put(url, body).then(responseBody),
  del: (url: string) => axios.delete(url).then(responseBody),
  postForm: (url: string, file: Blob) => {
    let formData = new FormData();
    formData.append('File', file);
    return axios
      .post(url, formData, {
        headers: { 'content-type': 'multipart/form-data' },
      })
      .then(responseBody);
  },
};

const Activities = {
  list: (params: URLSearchParams): Promise<IActivitiesEnvelope> =>
    axios.get('/activities', { params: params }).then(responseBody),
  details: (id: string) => request.get(`/activities/${id}`),
  create: (activity: IActivity) => request.post('/activities', activity),
  edit: (activity: IActivity) =>
    request.put(`/activities/${activity.id}`, activity),
  delete: (id: string) => request.del(`/activities/${id}`),
  attend: (id: string) => request.post(`/activities/${id}/attend`, {}),
  unattend: (id: string) => request.del(`/activities/${id}/attend`),
};

const User = {
  current: (): Promise<IUser> => request.get('/user'),
  login: (user: IUserFormValues): Promise<IUser> =>
    request.post('/user/login', user),
  register: (user: IUserFormValues): Promise<IUser> =>
    request.post('/user/register', user),
  fbLogin: (accessToken: string) =>
    request.post('/user/facebook', { accessToken }),
  refreshToken: (token: string, refeshToken: string) => {
    return axios.post(`/user/refresh`, { token, refeshToken }).then((res) => {
      window.localStorage.setItem('jwt', res.data.token);
      window.localStorage.setItem('refreshToken', res.data.refeshToken);
      axios.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${res.data.token}`;
      return res.data.token;
    });
  },
};

const Profiles = {
  get: (username: string): Promise<IProfile> =>
    request.get(`/profiles/${username}`),
  uploadPhoto: (photo: Blob): Promise<IPhoto> =>
    request.postForm(`/photos`, photo),
  setMainPhoto: (id: string) => request.post(`/photos/${id}/setMain`, {}),
  deletePhoto: (id: string) => request.del(`/photos/${id}`),
  updateProfile: (profile: Partial<IProfile>) =>
    request.put('/profiles', profile),
  follow: (username: string) =>
    request.post(`/profiles/${username}/follow`, {}),
  unfollow: (username: string) => request.del(`/profiles/${username}/follow`),
  listFollowings: (username: string, predicate: string) =>
    request.get(`/profiles/${username}/follow?predicate=${predicate}`),
  listActivities: (username: string, predicate: string) =>
    request.get(`/profiles/${username}/activities?predicate=${predicate}`),
};

export default {
  Activities,
  User,
  Profiles,
};
