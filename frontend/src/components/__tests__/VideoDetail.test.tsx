import { act, fireEvent, render, screen, within } from '@testing-library/react';
import axios from 'axios';
import { VideoDetail } from '../VideoDetail';
import { videoDetailsFixture } from '../../fixtures/videos';
import { SessionProvider } from '../../SessionContext';
import { authenticate, authenticatedRequest, AuthError, currentUser } from '../../auth';

jest.mock('axios');
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
    expect(anaReplies.querySelector('img')).toBeNull();
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
    render(
      <SessionProvider>
        <VideoDetail videoId={detail.id} userId={account.id} onBack={jest.fn()} />
      </SessionProvider>
    );
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
      finish(new Response(JSON.stringify({ id: 9, user: 'Pau', text: ' Gracias ', createdAt, parentId: 2 })));
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
