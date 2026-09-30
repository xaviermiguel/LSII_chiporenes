import { fireEvent, render, screen } from '@testing-library/react';
import TestLinkPro from '../TestLinkPro';

describe('Testlinkpro', () => {
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
