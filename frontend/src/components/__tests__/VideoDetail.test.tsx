import { fireEvent, render, screen } from '@testing-library/react';
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
