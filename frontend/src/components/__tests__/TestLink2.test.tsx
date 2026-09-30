import { fireEvent, render, screen } from '@testing-library/react';
import TestLink from '../TestLink';

describe('Testlink 2', () => {
  it('shoudl render the component', () => {
    render(<TestLink page="test">Hello</TestLink>);

    fireEvent.mouseEnter(screen.getByText('Hello'));
    fireEvent.mouseLeave(screen.getByText('Hello'));

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should have proper class', () => {
    render(<TestLink page="test">Hello</TestLink>);

    fireEvent.mouseEnter(screen.getByText('Hello'));

    expect(screen.getByText('Hello')).toHaveClass('hovered');
  });

  it('should have proper class 2', () => {
    render(<TestLink page="test">Hello</TestLink>);

    fireEvent.mouseEnter(screen.getByText('Hello'));

    expect(screen.queryByText('Hello')).toHaveClass('hovered');
  });

  it('should have proper class 3', async () => {
    render(<TestLink page="test">Hello</TestLink>);

    fireEvent.mouseEnter(screen.getByText('Hello'));

    const elem = await screen.findByText('Hello');

    expect(elem).toHaveClass('hovered');
  });
});
