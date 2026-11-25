import { act, fireEvent, render as renderWithProviders, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import axios from 'axios';
import { VideoDetail } from '../watch/VideoDetail.tsx';
import { videoDetailsFixture } from '../../fixtures/videos';
import { SessionProvider } from '../../SessionContext';
import { authenticate, authenticatedRequest, AuthError, currentUser } from '../../auth';

jest.mock('axios');
jest.mock('../watch/CommentLikes.tsx', () => ({ CommentLikes: () => null }));
jest.mock('../../auth', () => ({
  ...jest.requireActual('../../auth'),
  authenticate: jest.fn(),
  authenticatedRequest: jest.fn(),
  currentUser: jest.fn(),
}));
jest.mock('../../utils/Env', () => ({
  getEnv: () => ({ API_BASE_URL: 'other', MEDIA_BASE_URL: 'http://media.example/media' }),
}));
const get = jest.mocked(axios.get);
const detail = videoDetailsFixture[0];
const render = (element: ReactElement) => renderWithProviders(element, { wrapper: SessionProvider });

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(currentUser).mockResolvedValue(null);
});

describe('Video detail under the shared visual standard', () => {
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

  it('groups persisted replies under the correct author and renders their contents as text', async () => {
    const createdAt = '2026-11-17T10:00:00Z';
    const reply = '<img src=x onerror=alert(1)>';
    get.mockResolvedValue({
      data: {
        ...detail,
        comments: [
          { id: 3, user: 'Pau', text: reply, createdAt, parentId: 2 },
          { id: 1, user: 'Ona', text: 'Primer comentario', createdAt, parentId: null },
          { id: 2, user: 'Ana', text: 'Segundo comentario', createdAt, parentId: null },
          { id: 4, user: 'Jan', text: 'Otra respuesta', createdAt, parentId: 1 },
        ],
      },
    });
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    const anaReplies = await screen.findByRole('list', { name: 'Respuestas a Ana' });
    expect(anaReplies.closest('li')).toHaveTextContent('Segundo comentario');
    expect(within(anaReplies).getByText('Pau')).toBeInTheDocument();
    expect(within(anaReplies).getByText(reply)).toBeInTheDocument();
    expect(anaReplies.querySelector('p img')).toBeNull();
    expect(within(anaReplies).getByRole('link', { name: 'Pau' })).toHaveAttribute(
      'href',
      `#videos/${detail.id}/comments/3/author`
    );
    expect(within(anaReplies).queryByRole('button', { name: /Responder/ })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Respuestas a Ona' })).getByText('Otra respuesta')
    ).toBeInTheDocument();
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

describe('Replying from the video detail', () => {
  const account = { id: 5, displayName: 'Pau', email: 'pau@example.com' };
  const createdAt = '2026-11-17T10:00:00Z';
  const request = jest.mocked(authenticatedRequest);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(currentUser).mockResolvedValue(account);
    get.mockResolvedValue({
      data: {
        ...detail,
        comments: [
          { id: 1, user: 'Ona', text: 'Primer comentario', createdAt, parentId: null },
          { id: 2, user: 'Ana', text: 'Segundo comentario', createdAt, parentId: null },
        ],
      },
    });
  });

  async function openReply() {
    render(<VideoDetail videoId={detail.id} userId={account.id} onBack={jest.fn()} />);
    const trigger = await screen.findByRole('button', { name: 'Responder a Ana' });
    fireEvent.click(trigger);
    return trigger;
  }

  function send() {
    fireEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
  }

  it('validates text, sends once and inserts the saved reply under its parent', async () => {
    let finish!: (response: Response) => void;
    request.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const trigger = await openReply();
    const input = await screen.findByRole('textbox', { name: 'Responder a Ana' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '   ' } });
    send();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe una respuesta');
    fireEvent.change(input, { target: { value: 'x'.repeat(301) } });
    send();
    expect(screen.getByRole('alert')).toHaveTextContent('300 caracteres');
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' Gracias ' } });
    send();
    fireEvent.submit(input.closest('form')!);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(`/videos/${detail.id}/comments/2/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ' Gracias ' }),
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByRole('button', { name: 'Enviando respuesta…' })).toBeDisabled();
    await act(async () => {
      finish(
        new Response(JSON.stringify({ id: 9, user: 'Pau', text: ' Gracias ', createdAt, parentId: 2 }), { status: 201 })
      );
    });
    const thread = await screen.findByRole('list', { name: 'Respuestas a Ana' });
    expect(within(thread).getByText('Pau')).toBeInTheDocument();
    expect(within(thread).getByText('Gracias')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Respuestas a Ona' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('asks anonymous viewers to sign in before showing the editor', async () => {
    jest.mocked(currentUser).mockResolvedValue(null);
    await openReply();
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Responder a Ana' })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [new TypeError('offline'), 'Comprueba tu conexión'],
    [new AuthError('COMMENT_NOT_FOUND', 404), 'El comentario ya no está disponible'],
    [new AuthError('INVALID_COMMENT', 400, 'Texto rechazado'), 'Texto rechazado'],
  ])('retains the draft after a failed request', async (failure, message) => {
    request.mockRejectedValue(failure);
    await openReply();
    const input = await screen.findByRole('textbox', { name: 'Responder a Ana' });
    fireEvent.change(input, { target: { value: 'Borrador' } });
    send();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(input).toHaveValue('Borrador');
    expect(screen.getByRole('button', { name: 'Enviar respuesta' })).toBeEnabled();
  });

  it('restores the draft after signing in again on an expired session', async () => {
    jest.mocked(authenticate).mockResolvedValue(account);
    request.mockRejectedValueOnce(new AuthError('AUTHENTICATION_REQUIRED', 401));
    await openReply();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Responder a Ana' }), {
      target: { value: 'Borrador conservado' },
    });
    send();
    expect(await screen.findByText(/Tu sesión ha caducado/)).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: account.email } });
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Test-password1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('textbox', { name: 'Responder a Ana' })).toHaveValue('Borrador conservado');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
describe('Publicar un comentario de primer nivel', () => {
  const account = { id: 5, displayName: 'Pau', email: 'pau@example.com' };
  const saved = {
    id: 8,
    user: 'Pau del servidor',
    authorId: 5,
    createdAt: '2026-11-17T10:00:00.000001Z',
    parentId: null,
  };
  const request = jest.mocked(authenticatedRequest);
  const button = () => screen.getByRole('button', { name: 'Publicar comentario' });

  beforeEach(() => {
    jest.mocked(currentUser).mockResolvedValue(account);
    get.mockResolvedValue({ data: { ...detail, comments: [] } });
  });

  async function editor() {
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    return screen.findByRole('textbox', { name: 'Escribe un comentario' });
  }

  it('ofrece acceso al visitante incluso en un vídeo sin comentarios', async () => {
    jest.mocked(currentUser).mockResolvedValue(null);
    render(<VideoDetail videoId={detail.id} onBack={jest.fn()} />);
    expect(await screen.findByRole('link', { name: 'Inicia sesión para comentar' })).toHaveAttribute('href', '#login');
    expect(screen.getByText('Este vídeo todavía no tiene comentarios.')).toBeVisible();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it.each(['', '   ', '\t\u001c\u2003\u3000', '😀'.repeat(150) + ' '])('rechaza texto inválido (%#)', async (text) => {
    const input = await editor();
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(button());
    expect(screen.getByRole('alert')).toBeVisible();
    expect(input).toHaveFocus();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['\u00a0', '\u2007', '\u202f', '\ufeff', ' ' + '😀'.repeat(149) + ' '])(
    'envía el texto original permitido por Java (%#)',
    async (text) => {
      request.mockResolvedValue(new Response(JSON.stringify({ ...saved, text }), { status: 201 }));
      const input = await editor();
      fireEvent.change(input, { target: { value: text } });
      fireEvent.click(button());
      await screen.findByRole('heading', { name: 'Comentarios (1)' });
      expect(request).toHaveBeenCalledWith(
        `/videos/${detail.id}/comments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(input).toHaveValue('');
      expect(screen.queryByText('Este vídeo todavía no tiene comentarios.')).toBeNull();
    }
  );

  it('bloquea envíos simultáneos y coloca una sola copia de la confirmación en su orden', async () => {
    const existing = [
      { ...saved, id: 7, text: 'Antes' },
      { ...saved, id: 10, text: 'Después' },
      { ...saved, id: 1, text: 'Más tarde', createdAt: '2026-11-17T10:00:00.000002Z' },
    ];
    get.mockResolvedValue({ data: { ...detail, comments: existing } });
    let finish!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const text = '<b>hola</b>';
    const input = await editor();
    fireEvent.change(input, { target: { value: text } });
    const form = input.closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Publicando…' })).toBeDisabled();
    expect(input).toHaveValue(text);
    expect(screen.getByRole('heading', { name: 'Comentarios (3)' })).toBeVisible();
    const confirmation = () => new Response(JSON.stringify({ ...saved, text }), { status: 201 });
    await act(async () => finish(confirmation()));
    const list = within(screen.getByRole('region', { name: 'Comentarios' })).getByRole('list');
    expect(Array.from(list.querySelectorAll('li > p'), (p) => p.textContent)).toEqual([
      'Antes',
      text,
      'Después',
      'Más tarde',
    ]);
    expect(list.querySelector('b')).toBeNull();
    expect(within(screen.getByText(text).closest('li')!).getByRole('link', { name: saved.user })).toHaveAttribute(
      'href',
      '#users/5'
    );
    request.mockResolvedValueOnce(confirmation());
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(button());
    await waitFor(() => expect(input).toHaveValue(''));
    expect(screen.getAllByText(text)).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Comentarios (4)' })).toBeVisible();
  });

  it.each([
    [new AuthError('INVALID_COMMENT', 400, 'Comentario no válido'), 'Comentario no válido'],
    [new AuthError('INVALID_REQUEST', 400), 'Revisa los campos'],
    [new AuthError('INVALID_CSRF_TOKEN', 403), 'Vuelve a enviar'],
    [new AuthError('VIDEO_NOT_FOUND', 404), 'El vídeo ya no está disponible'],
    [new AuthError('UNKNOWN', 500), 'Inténtalo de nuevo'],
    [new TypeError('offline'), 'Comprueba tu conexión'],
  ])('conserva el borrador y la lista tras un error (%#)', async (failure, message) => {
    get.mockResolvedValue({ data: { ...detail, comments: [{ ...saved, text: 'Comentario anterior' }] } });
    request.mockRejectedValueOnce(failure);
    const input = await editor();
    fireEvent.change(input, { target: { value: 'Mi borrador' } });
    fireEvent.click(button());
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(input).toHaveValue('Mi borrador');
    expect(screen.getByText('Comentario anterior')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    expect(button()).toBeEnabled();
  });

  it('mantiene el borrador ante una sesión caducada y deja que el usuario reanude el envío', async () => {
    request.mockRejectedValueOnce(new AuthError('AUTHENTICATION_REQUIRED', 401));
    jest.mocked(authenticate).mockResolvedValue(account);
    const input = await editor();
    const text = 'Pendiente de publicar';
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(button());
    expect(await screen.findByText(/Tu sesión ha caducado/)).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: account.email } });
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Test-password1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const recovered = await screen.findByRole('textbox', { name: 'Escribe un comentario' });
    expect(recovered).toHaveValue(text);
    expect(recovered).toHaveFocus();
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValueOnce(new Response(JSON.stringify({ ...saved, text }), { status: 201 }));
    fireEvent.click(button());
    const list = within(screen.getByRole('region', { name: 'Comentarios' }));
    expect(within(await list.findByRole('list')).getByText(text)).toBeVisible();
    expect(recovered).toHaveValue('');
  });
});
