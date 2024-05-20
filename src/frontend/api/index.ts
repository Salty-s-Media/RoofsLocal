import * as productApi from './products';
import * as userApi from './users';
import * as orderApi from './orders';
import * as downloadApi from './downloads';

const api = {
  ...productApi,
  ...userApi,
  ...orderApi,
  ...downloadApi,
};

export default api;
