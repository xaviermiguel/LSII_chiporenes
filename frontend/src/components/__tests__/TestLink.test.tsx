import { fireEvent, render, screen } from '@testing-library/react';
import TestLink from '../TestLink';

describe('Testlink', () => {
  beforeAll(() => {
    console.log('hola');
  });

  it('should render the component', () => {
    render(<TestLink page="">Hello</TestLink>);
  });

  describe('inner suite', () => {
    beforeAll(() => {
      console.log('Hola 2');
    });

    it('should sum', () => {
      console.log('hola 3');
      const a = 2 + 2;
      expect(a).toBe(4);
    });
  });

  it('should render the component', () => {
    render(<TestLink page="test">Hello</TestLink>);

    fireEvent.mouseEnter(screen.getByText('Hello'));
    fireEvent.mouseLeave(screen.getByText('Hello'));

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
