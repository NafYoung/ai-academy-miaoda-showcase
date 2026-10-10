import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] pt-28 flex flex-col items-center justify-center text-center px-6">
      <h1
        className="leading-none mb-6"
        style={{
          fontSize: 'clamp(80px, 14vw, 160px)',
          fontWeight: 950,
          letterSpacing: '-0.06em',
          background: 'linear-gradient(90deg, #5ff2f2, #c6ffb3 52%, #fff9b3)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        404
      </h1>
      <p className="text-lg font-semibold text-[#08090d] mb-2">页面未找到</p>
      <p className="text-sm text-[#14141480] mb-8 max-w-md leading-relaxed">
        你访问的页面可能已被移除或暂时不可用
      </p>
      <Link to="/" className="academy-gradient-button">
        返回首页
      </Link>
    </div>
  );
};

export default NotFound;
