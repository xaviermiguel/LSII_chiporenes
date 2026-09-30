import '@testing-library/jest-dom';

import fetchMock from 'jest-fetch-mock';

jest.mock('./src/utils/Env', () => ({
  getEnv: () => ({
    API_BASE_URL: 'other',
    MEDIA_BASE_URL: 'development',
  }),
}));

fetchMock.enableMocks();
