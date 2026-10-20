import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import App from '../../App';
import { videoListFixture, videoDetailsFixture } from '../../fixtures/videos';
import type { VideoListResponse } from '../../types/Video';

jest.mock('axios');
jest.mock('../../utils/Env', () => ({
  getEnv: () => ({ API_BASE_URL: 'other', MEDIA_BASE_URL: 'http://media.example/media' }),
}));
const get = jest.mocked(axios.get);

function pendingPage() {
  let resolve!: (response: { data: VideoListResponse }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ data: VideoListResponse }>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('Public video catalog', () => {
  beforeEach(() => jest.resetAllMocks());

  it('shows initial loading and requests the first page without authentication', () => {
    get.mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando vídeos...');
    expect(screen.queryByText('No hay vídeos disponibles.')).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('other/videos', {
      params: { page: 0, size: 12 },
      signal: expect.any(AbortSignal),
    });
  });

  it('displays API titles, thumbnails and the end of results', async () => {
    get.mockResolvedValue({ data: videoListFixture });
    render(<App />);
    const first = await screen.findByRole('button', { name: 'First video' });
    const second = screen.getByRole('button', { name: 'Second video' });
    expect(within(first).getByAltText('')).toHaveAttribute('src', 'http://media.example/media/0.webp');
    expect(within(second).getByAltText('')).toHaveAttribute('src', 'http://media.example/media/1.webp');
    expect(screen.getByRole('status')).toHaveTextContent('No hay más vídeos.');
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('treats an empty items response as an empty catalog, not an error', async () => {
    get.mockResolvedValue({ data: { ...videoListFixture, items: [] } });
    render(<App />);
    expect(await screen.findByText('No hay vídeos disponibles.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('shows a request error and retries the first page', async () => {
    get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: videoListFixture });
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cargar los vídeos');
    expect(screen.queryByText('No hay vídeos disponibles.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'First video' })).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith('other/videos', expect.objectContaining({ params: { page: 0, size: 12 } }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('appends the next page once, preserves previous videos, deduplicates by ID and stops', async () => {
    const pending = pendingPage();
    get.mockResolvedValueOnce({ data: { ...videoListFixture, hasNext: true } }).mockReturnValueOnce(pending.promise);
    render(<App />);
    const loadMore = await screen.findByRole('button', { name: 'Cargar más' });
    fireEvent.click(loadMore);
    fireEvent.click(loadMore);
    expect(screen.getByRole('button', { name: 'Cargando más vídeos...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'First video' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith('other/videos', expect.objectContaining({ params: { page: 1, size: 12 } }));

    await act(async () => {
      pending.resolve({
        data: {
          ...videoListFixture,
          page: 1,
          items: [videoListFixture.items[1], { ...videoListFixture.items[0], id: 90, title: 'Third video' }],
        },
      });
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'First video' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Second video' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Third video' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No hay más vídeos.');
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('retains results after a later failure and retries the same page', async () => {
    get
      .mockResolvedValueOnce({ data: { ...videoListFixture, hasNext: true } })
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ data: { ...videoListFixture, page: 1, items: [] } });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cargar los vídeos');
    expect(screen.getByRole('button', { name: 'First video' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No hay más vídeos.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenLastCalledWith('other/videos', expect.objectContaining({ params: { page: 1, size: 12 } }));
  });

  it('opens the existing detail page using the persisted ID and returns to the catalog', async () => {
    get
      .mockResolvedValueOnce({ data: videoListFixture })
      .mockResolvedValueOnce({ data: videoDetailsFixture[0] })
      .mockResolvedValueOnce({ data: videoListFixture });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'First video' }));
    expect(await screen.findByRole('heading', { name: 'First video' })).toBeInTheDocument();
    expect(get).toHaveBeenNthCalledWith(2, 'other/videos/15', { signal: expect.any(AbortSignal) });
    expect(screen.queryByText('Vídeos disponibles:')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al catálogo' }));
    expect(await screen.findByRole('button', { name: 'Second video' })).toBeInTheDocument();
  });

  it('ignores an abandoned request in StrictMode and shows only the active response', async () => {
    const abandoned = pendingPage();
    get.mockReturnValueOnce(abandoned.promise).mockResolvedValueOnce({ data: videoListFixture });
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    expect(await screen.findByRole('button', { name: 'First video' })).toBeInTheDocument();
    await act(async () => abandoned.resolve({ data: { ...videoListFixture, items: [] } }));
    expect(screen.getByRole('button', { name: 'First video' })).toBeInTheDocument();
    expect(screen.queryByText('No hay vídeos disponibles.')).not.toBeInTheDocument();
  });

  it('cancels a pending additional page when leaving the catalog', async () => {
    const pending = pendingPage();
    get
      .mockResolvedValueOnce({ data: { ...videoListFixture, hasNext: true } })
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ data: videoDetailsFixture[0] });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
    fireEvent.click(screen.getByRole('button', { name: 'First video' }));
    expect(await screen.findByRole('heading', { name: 'First video' })).toBeInTheDocument();
    await act(async () => pending.reject(new Error('Cancelled')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an Axios request error without an empty state', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    get.mockRejectedValue(new Error('Network unavailable'));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable'));
  });
});
