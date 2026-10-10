import { useCallback } from 'react';

interface Banner {
  image: string;
  link: string;
  title: string;
}

interface BannerMarqueeProps {
  banners: Banner[];
}

export default function BannerMarquee({ banners }: BannerMarqueeProps) {
  const handleClick = useCallback((link: string) => {
    if (link) window.open(link, '_blank');
  }, []);

  if (banners.length === 0) return null;

  const doubled = [...banners, ...banners];

  return (
    <div className="w-full overflow-hidden -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 mb-8">
      <div
        className="flex gap-4 animate-marquee"
        style={{
          width: 'max-content',
        }}
      >
        {doubled.map((banner, index) => (
          <button
            key={`${banner.title}-${index}`}
            onClick={() => handleClick(banner.link)}
            className="group relative w-[200px] h-[120px] shrink-0 rounded-[26px] overflow-hidden cursor-pointer border border-black/5 bg-white shadow-[0_20px_48px_#14364017] transition-shadow duration-300"
            title={banner.title}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090d]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              <span className="text-white text-xs font-medium truncate">
                {banner.title}
              </span>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
