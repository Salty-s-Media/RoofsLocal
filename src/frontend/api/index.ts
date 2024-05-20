import * as productApi from './productApi';
import * as userApi from './userApi';
import * as orderApi from './orderApi';
import * as downloadApi from './downloadApi';

const api = {
  ...productApi,
  ...userApi,
  ...orderApi,
  ...downloadApi,
};

export default api;
