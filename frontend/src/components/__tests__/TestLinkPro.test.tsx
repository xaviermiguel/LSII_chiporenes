import { fireEvent, render, screen } from '@testing-library/react';
import TestLinkPro from '../TestLinkPro';

describe('Testlinkpro', () => {
  it('supports hover without a callback and restores its normal state', () => {
    render(<TestLinkPro page="/videos">Videos</TestLinkPro>);
    const link = screen.getByRole('link', { name: 'Videos' });
    expect(link).toHaveAttribute('href', '/videos');
    fireEvent.mouseEnter(link);
    expect(link).toHaveClass('hovered');
    fireEvent.mouseLeave(link);
    expect(link).toHaveClass('normal');
  });

  it('should call the mock', () => {
    const callMeMock = jest.fn();

    render(
      <TestLinkPro page="" onHover={() => callMeMock('Maybe')}>
        Hello
      </TestLinkPro>
    );
    fireEvent.mouseEnter(screen.getByText('Hello'));

    expect(callMeMock).toHaveBeenCalled();
  });

  it('should not call the mock', () => {
    const callMeMock = jest.fn();

    render(
      <TestLinkPro page="" onHover={() => callMeMock('Maybe')}>
        Hello
      </TestLinkPro>
    );

    expect(callMeMock).toHaveBeenCalledTimes(0);
  });
});
