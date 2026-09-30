import { ReactNode, useState } from 'react';

// Sample component, just to showcase a bit of
// React and typescript

const STATUS = {
  HOVERED: 'hovered',
  NORMAL: 'normal',
};

interface Props {
  page: string;
  children: ReactNode;
  onHover?: () => void;
}

const TestLinkPro = ({ page, children, onHover }: Props) => {
  const [status, setStatus] = useState(STATUS.NORMAL);

  const onMouseEnter = () => {
    onHover?.();
    setStatus(STATUS.HOVERED);
  };

  const onMouseLeave = () => {
    setStatus(STATUS.NORMAL);
  };

  return (
    <a className={status} href={page || '#'} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {' '}
      {children}
    </a>
  );
};

export default TestLinkPro;
