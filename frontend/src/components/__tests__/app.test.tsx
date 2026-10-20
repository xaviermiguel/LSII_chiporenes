import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from '../../App';

jest.mock('axios');
const get = jest.mocked(axios.get);

describe('App and video API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading while the request is pending', () => {
    get.mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays the videos returned by the API', async () => {
    get.mockResolvedValue({ status: 200, data: ['First video', 'Second video'] });
    render(<App />);
    expect(await screen.findByText('First video')).toBeInTheDocument();
    expect(screen.getByText('Second video')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('other/videos');
  });

  it('displays an empty list for an empty response', async () => {
    get.mockResolvedValue({ status: 200, data: [] });
    render(<App />);
    await screen.findByText('Videos availables:');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('does not use the body of a non-200 response', async () => {
    get.mockResolvedValue({ status: 204, data: ['Ignored'] });
    render(<App />);
    await screen.findByText('Videos availables:');
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
  });

  it('shows the request error', async () => {
    get.mockRejectedValue(new Error('Network unavailable'));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Error fetching videos: Network unavailable')).toBeInTheDocument());
  });
});
