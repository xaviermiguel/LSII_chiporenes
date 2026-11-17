import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { VideoDetail } from '../VideoDetail';
import { videoDetailsFixture } from '../../fixtures/videos';

jest.mock('axios');
jest.mock('../../utils/Env', () => ({
  getEnv: () => ({ API_BASE_URL: 'other', MEDIA_BASE_URL: 'http://media.example/media' }),
}));
const get = jest.mocked(axios.get);
const detail = videoDetailsFixture[0];

describe('Video detail under the shared visual standard', () => {
  beforeEach(() => jest.resetAllMocks());

  it.each([1, 2, undefined])('only owner sees editing link (viewer %s)', async (userId) => {
    get.mockResolvedValue({ data: { ...detail, ownerId: 1 } });
    render(<VideoDetail videoId={detail.id} userId={userId} onBack={jest.fn()} />);
    await screen.findByRole('heading', { name: detail.title });
    if (userId === 1)
      expect(screen.getByRole('link', { name: 'Editar vídeo' })).toHaveAttribute('href', `#videos/${detail.id}/edit`);
    else expect(screen.queryByRole('link', { name: 'Editar vídeo' })).not.toBeInTheDocument();
  });

  it('announces loading and keeps the back control available', () => {
    get.mockReturnValue(new Promise(() => {}));
    const back = jest.fn();
    render(<VideoDetail videoId={detail.id} onBack={back} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando vídeo...');
    fireEvent.click(screen.getByRole('button', { name: 'Volver al catálogo' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('keeps the player, description, tags and comments in the detail', async () => {
    get.mockResolvedValue({
      data: {
        ...detail,
        tags: ['Música'],
        comments: [{ id: 2, user: 'Ana', text: 'Buen vídeo', createdAt: '2026-10-25T10:00:00Z', parentId: null }],
      },
    });
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    await screen.findByRole('heading', { name: detail.title });
    expect(screen.getByText(detail.description)).toBeInTheDocument();
    expect(screen.getByText('Música')).toBeInTheDocument();
    expect(screen.getByText('Buen vídeo')).toBeInTheDocument();
    const player = screen.getByLabelText(`Reproductor: ${detail.title}`);
    expect(player).toHaveAttribute('controls');
    expect(player).toHaveAttribute('preload', 'metadata');
    fireEvent.error(player);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo reproducir el archivo de vídeo.');
  });

  it('shows the empty description, tags and comments states', async () => {
    get.mockResolvedValue({ data: { ...detail, description: '' } });
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    expect(await screen.findByText('Sin descripción')).toBeInTheDocument();
    expect(screen.getByText('Sin etiquetas.')).toBeInTheDocument();
    expect(screen.getByText('Este vídeo todavía no tiene comentarios.')).toBeInTheDocument();
  });

  it('shows a controlled not-found state with a back action', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    get.mockRejectedValue({ response: { status: 404 } });
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Vídeo no encontrado.');
    expect(screen.getByRole('button', { name: 'Volver al catálogo' })).toBeInTheDocument();
  });

  it('shows a controlled request failure', async () => {
    get.mockRejectedValue(new Error('Offline'));
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el vídeo.');
  });
});

it('links the external author to its imported channel', async () => {
  get.mockResolvedValue({ data: { ...detail, user: 'Canal externo', ownerId: 3, authorId: null } });
  render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
  expect(await screen.findByText('Canal externo')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Canal externo' })).toHaveAttribute('href', '#channels/name/Canal%20externo');
});

it('links Mark Ronson to his ProTube channel', async () => {
  get.mockResolvedValue({ data: { ...detail, user: 'Mark Ronson', ownerId: 3, authorId: null } });
  render(<VideoDetail videoId={detail.id} userId={4} onBack={jest.fn()} />);
  const channel = await screen.findByRole('link', { name: 'Mark Ronson' });
  expect(channel).toHaveAttribute('href', '#channels/mark-ronson');
  expect(channel).not.toHaveAttribute('target');
});

it('shows imported counts including zero and displays a different source channel', async () => {
  get.mockResolvedValue({
    data: { ...detail, channel: 'Canal original', viewCount: 5_914_109_773, likeCount: 0 },
  });
  render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
  expect(await screen.findByText('5.914.109.773 visualizaciones importadas')).toBeInTheDocument();
  expect(screen.getByText('0 Me gusta')).toBeInTheDocument();
  expect(screen.getByAltText('')).toHaveAttribute('src', '/video-views.png');
  expect(screen.getByText('Canal de origen: Canal original')).toBeInTheDocument();
});

it('adds and removes a personal like from the imported count and remembers it on return', async () => {
  localStorage.clear();
  get.mockResolvedValue({ data: { ...detail, likeCount: 23_585_179 } });
  const props = { videoId: detail.id, userId: 4, onBack: jest.fn() };
  const { unmount } = render(<VideoDetail {...props} />);
  const like = await screen.findByRole('button', { name: 'Me gusta', exact: true });
  expect(like).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(like);
  expect(like).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('23.585.180 Me gusta')).toBeInTheDocument();
  unmount();

  render(<VideoDetail {...props} />);
  const restored = await screen.findByRole('button', { name: 'Me gusta', exact: true });
  expect(restored).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(restored);
  expect(restored).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('23.585.179 Me gusta')).toBeInTheDocument();
});

it('uses the current avatar once per registered commenter and falls back for imported comments', async () => {
  get.mockReset();
  const comment = { id: 1, user: 'Ana', authorId: 4, text: 'Hola', createdAt: '2026-10-25T10:00:00Z', parentId: null };
  get
    .mockResolvedValueOnce({
      data: {
        ...detail,
        comments: [
          comment,
          { ...comment, id: 2 },
          { ...comment, id: 3, user: 'Importado', authorId: null },
          { ...comment, id: 4, user: 'Sin avatar disponible', authorId: 7 },
        ],
      },
    })
    .mockResolvedValueOnce({ data: { avatarURL: '/media/avatars/current.png' } })
    .mockRejectedValueOnce(new Error('Profile unavailable'));
  render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);

  const comments = await screen.findByRole('region', { name: 'Comentarios' });
  const avatars = within(comments).getAllByAltText('');
  await waitFor(() => {
    expect(avatars[0]).toHaveAttribute('src', 'http://media.example/media/avatars/current.png');
    expect(avatars[1]).toHaveAttribute('src', 'http://media.example/media/avatars/current.png');
  });
  expect(avatars[2]).toHaveAttribute('src', expect.stringContaining('/assets/avatar-default.png'));
  expect(avatars[3]).toHaveAttribute('src', expect.stringContaining('/assets/avatar-default.png'));
  expect(get.mock.calls.filter(([url]) => url === 'other/users/4')).toHaveLength(1);
  expect(get).toHaveBeenCalledTimes(3);
});
