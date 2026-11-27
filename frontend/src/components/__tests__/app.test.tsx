import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import App from '../../App';
import { videoListFixture, videoDetailsFixture } from '../../fixtures/videos';
import type { VideoListResponse } from '../../types/Video';

import { mockListScroll } from './mockListScroll';

const reachEnd = mockListScroll();

jest.mock('axios');
jest.mock('../../auth', () => ({ ...jest.requireActual('../../auth'), currentUser: () => new Promise(() => {}) }));
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
    await reachEnd();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando más vídeos...');
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
    await reachEnd();
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cargar los vídeos');
    expect(screen.getByRole('button', { name: 'First video' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No hay más vídeos.'));
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
    await reachEnd();
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

it('opens the public profile of a local video author without signing in', async () => {
  const video = videoDetailsFixture[0];
  get
    .mockResolvedValueOnce({ data: videoListFixture })
    .mockResolvedValueOnce({ data: { ...video, authorId: 8 } })
    .mockResolvedValueOnce({
      data: { id: 8, displayName: video.user, description: '', avatarURL: '/assets/avatar-default.png' },
    })
    .mockResolvedValueOnce({ data: videoListFixture })
    .mockResolvedValueOnce({ data: { ...video, authorId: 8 } });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: video.title }));
  const author = await screen.findByRole('link', { name: video.user });
  expect(author).toHaveAttribute('href', '#users/8');
  fireEvent.click(author);
  expect(await screen.findByRole('heading', { name: video.user })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Editar mi perfil' })).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: video.title })).toBeInTheDocument();
  window.history.replaceState(null, '', '/');
});

it('shows the Mark Ronson channel and plays its imported video inside ProTube', async () => {
  const video = { ...videoDetailsFixture[0], user: 'Mark Ronson', authorId: null };
  const other = { ...video, id: 99, title: 'Vídeo de otra cuenta', authorId: 20 };
  get
    .mockResolvedValueOnce({ data: videoListFixture })
    .mockResolvedValueOnce({ data: video })
    .mockResolvedValueOnce({ data: { ...videoListFixture, items: [video, other], hasNext: false } })
    .mockResolvedValueOnce({ data: video })
    .mockResolvedValueOnce({ data: other })
    .mockResolvedValueOnce({ data: video });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: video.title }));
  fireEvent.click(await screen.findByRole('link', { name: 'Mark Ronson' }));
  try {
    expect(await screen.findByRole('heading', { name: 'Mark Ronson' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar de Mark Ronson' })).toBeInTheDocument();
    expect(screen.getByText(/DJ y productor musical/)).toBeInTheDocument();
    const channelVideo = await screen.findByRole('button', { name: video.title });
    expect(screen.queryByRole('button', { name: other.title })).not.toBeInTheDocument();
    fireEvent.click(channelVideo);
    expect(await screen.findByRole('heading', { name: video.title })).toBeInTheDocument();
  } finally {
    window.history.replaceState(null, '', '/');
  }
});

it.each([
  ['Ana', 'Miembro de la comunidad de ProTube.'],
  ['Autor importado', 'Participa en la conversación de este vídeo del catálogo de ProTube.'],
])('opens the public profile of commenter %s', async (name, description) => {
  const video = videoDetailsFixture[0];
  const comment = { id: 23, user: 'Ana', text: 'Un comentario', createdAt: '2026-10-25T10:00:00Z', parentId: null };
  get.mockImplementation(async (url) => {
    if (url.endsWith('/users/8')) {
      return { data: { id: 8, displayName: 'Ana', description: '', avatarURL: '/assets/avatar-default.png' } };
    }
    if (url.endsWith('/videos/' + video.id)) {
      return {
        data: {
          ...video,
          comments: [
            { ...comment, authorId: 8 },
            { ...comment, id: 24, user: 'Autor importado', authorId: null },
          ],
        },
      };
    }
    return { data: videoListFixture };
  });
  render(<App />);
  try {
    fireEvent.click(await screen.findByRole('button', { name: video.title }));
    const comments = await screen.findByRole('region', { name: 'Comentarios' });
    const author = within(comments).getByRole('link', { name: 'Ana' });
    expect(author).toHaveAttribute('href', '#users/8');
    expect(within(comments).getAllByAltText('')[0]).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/avatar-default.png')
    );
    const importedAuthor = within(comments).getByRole('link', { name: 'Autor importado' });
    expect(importedAuthor).toHaveAttribute('href', `#videos/${video.id}/comments/24/author`);

    fireEvent.click(within(comments).getByRole('link', { name }));
    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  } finally {
    window.history.replaceState(null, '', '/');
  }
});

describe('Public video search', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    window.history.replaceState(null, '', '/');
    get.mockReturnValueOnce(pendingPage().promise);
  });

  afterEach(() => window.history.replaceState(null, '', '/'));

  function search(query: string) {
    fireEvent.change(screen.getByRole('searchbox', { name: 'Título o descripción' }), { target: { value: query } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  }

  it('searches from the header and restores the catalog when the query is cleared', async () => {
    get.mockResolvedValue({ data: videoListFixture });
    render(<App />);
    expect(within(screen.getByRole('banner')).getByRole('searchbox')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^(Buscar|Explorar)$/ })).not.toBeInTheDocument();
    search('  video & café  ');
    await screen.findByRole('heading', { name: 'Resultados para «video & café»' });
    expect(get).toHaveBeenCalledWith('other/videos/search', {
      params: { q: 'video & café', page: 0, size: 12 },
      signal: expect.any(AbortSignal),
    });
    await screen.findByRole('button', { name: 'First video' });
    search('');
    await screen.findByRole('heading', { name: 'Vídeos disponibles:' });
    expect(get).toHaveBeenLastCalledWith('other/videos', expect.objectContaining({ params: { page: 0, size: 12 } }));
  });

  it('shows loading, no matches, and errors with a retry', async () => {
    const pending = pendingPage();
    get.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ data: { ...videoListFixture, items: [] } });
    render(<App />);
    search('ausente');
    expect(await screen.findByText('Buscando vídeos...')).toBeInTheDocument();
    await act(async () => pending.reject(new Error('Offline')));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo realizar la búsqueda');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('No se encontraron vídeos para «ausente».')).toBeInTheDocument();
    expect(get.mock.calls.slice(1).map(([, config]) => config?.params)).toEqual([
      { q: 'ausente', page: 0, size: 12 },
      { q: 'ausente', page: 0, size: 12 },
    ]);
  });

  it('ignores an old additional page after submitting a different query', async () => {
    const oldPage = pendingPage();
    get
      .mockResolvedValueOnce({ data: { ...videoListFixture, items: [videoListFixture.items[0]], hasNext: true } })
      .mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({ data: { ...videoListFixture, items: [videoListFixture.items[1]] } });
    render(<App />);
    search('primera');
    await reachEnd();
    search('segunda');
    expect(await screen.findByRole('button', { name: 'Second video' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'First video' })).not.toBeInTheDocument();
    expect(get.mock.calls[2][1]?.signal?.aborted).toBe(true);
    await act(async () => oldPage.resolve({ data: { ...videoListFixture, page: 1 } }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(get.mock.calls.slice(1).map(([, config]) => config?.params)).toEqual([
      { q: 'primera', page: 0, size: 12 },
      { q: 'primera', page: 1, size: 12 },
      { q: 'segunda', page: 0, size: 12 },
    ]);
  });

  it('appends results in API order and retains the first page when a later request fails', async () => {
    get
      .mockResolvedValueOnce({ data: { ...videoListFixture, items: [videoListFixture.items[1]], hasNext: true } })
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ data: { ...videoListFixture, items: [videoListFixture.items[0]], page: 1 } });
    render(<App />);
    search('video');
    await reachEnd();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second video' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('button', { name: 'First video' });
    const results = within(screen.getByRole('list', { name: 'Resultados para «video»' }));
    expect(results.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Second video',
      'First video',
    ]);
    expect(within(results.getByRole('button', { name: 'Second video' })).getByAltText('')).toHaveAttribute(
      'src',
      'http://media.example/media/1.webp'
    );
    expect(get).toHaveBeenLastCalledWith(
      'other/videos/search',
      expect.objectContaining({ params: { q: 'video', page: 1, size: 12 } })
    );
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
  });
});
