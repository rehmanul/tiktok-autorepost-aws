import { SocialPlatform } from '@/lib/api/connections';

const platformConfig: Record<SocialPlatform, { name: string; color: string; bgColor: string }> = {
  TIKTOK: {
    name: 'TikTok',
    color: '#000000',
    bgColor: '#FE2C55',
  },
  INSTAGRAM: {
    name: 'Instagram',
    color: '#E4405F',
    bgColor: '#FCE8EC',
  },
  YOUTUBE: {
    name: 'YouTube',
    color: '#FF0000',
    bgColor: '#FFEBEE',
  },
  TWITTER: {
    name: 'Twitter',
    color: '#1DA1F2',
    bgColor: '#E3F2FD',
  },
};

export function PlatformIcon({ platform, size = 24 }: { platform: SocialPlatform; size?: number }) {
  const config = platformConfig[platform];

  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: config.bgColor,
      }}
    >
      <span className="font-bold text-xs" style={{ color: config.color }}>
        {platform.charAt(0)}
      </span>
    </div>
  );
}

export function getPlatformConfig(platform: SocialPlatform) {
  return platformConfig[platform];
}
