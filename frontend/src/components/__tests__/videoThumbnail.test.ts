import { createThumbnail, VideoPreviewError } from '../../videoPublication';

let video: HTMLVideoElement;
let canvas: HTMLCanvasElement;
const draw = jest.fn();
beforeEach(() => {
  const create = document.createElement.bind(document);
  video = create('video');
  canvas = create('canvas');
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1280 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 720 });
  jest.spyOn(video, 'load').mockImplementation(() => {});
  jest.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
  jest.spyOn(canvas, 'toBlob').mockImplementation((callback) => callback(new Blob(['webp'], { type: 'image/webp' })));
  jest
    .spyOn(document, 'createElement')
    .mockImplementation(((tag: string) =>
      tag === 'video' ? video : tag === 'canvas' ? canvas : create(tag)) as typeof document.createElement);
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  draw.mockReset();
});

test('generates a scaled WebP and releases the local video URL', async () => {
  const pending = createThumbnail(new File(['video'], 'clip.mp4'));
  video.dispatchEvent(new Event('loadeddata'));
  expect((await pending).type).toBe('image/webp');
  expect(canvas.width).toBe(640);
  expect(canvas.height).toBe(360);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  expect(video).not.toHaveAttribute('src');
});

test.each(['decode', 'dimensions', 'context', 'encode', 'draw'] as const)(
  'reports thumbnail %s failure and releases URL',
  async (failure) => {
    if (failure === 'dimensions') Object.defineProperty(video, 'videoWidth', { value: 0 });
    if (failure === 'context') jest.mocked(canvas.getContext).mockReturnValue(null);
    if (failure === 'encode') jest.mocked(canvas.toBlob).mockImplementation((callback) => callback(null));
    if (failure === 'draw')
      draw.mockImplementation(() => {
        throw new Error('cannot draw');
      });
    const pending = createThumbnail(new File(['video'], 'clip.mp4'));
    const rejected = expect(pending).rejects.toBeInstanceOf(VideoPreviewError);
    video.dispatchEvent(new Event(failure === 'decode' ? 'error' : 'loadeddata'));
    await rejected;
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  }
);

test('stalled video preparation times out and releases URL', async () => {
  jest.useFakeTimers();
  const pending = createThumbnail(new File(['video'], 'clip.mp4'));
  const rejected = expect(pending).rejects.toThrow('miniatura');
  jest.advanceTimersByTime(15000);
  await rejected;
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
});
