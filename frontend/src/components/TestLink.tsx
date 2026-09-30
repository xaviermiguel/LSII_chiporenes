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
}

const TestLink = ({ page, children }: Props) => {
  const [status, setStatus] = useState(STATUS.NORMAL);

  const onMouseEnter = () => {
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

export default TestLink;
