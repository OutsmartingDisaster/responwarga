'use client';

// Mock data for development
const mockTweets = [
  {
    id: '1',
    text: 'Banjir di daerah Kemang sudah mulai surut. Warga mulai bisa kembali ke rumah masing-masing.',
    author: 'BNPB Indonesia',
    profile_image: 'https://placehold.co/100x100',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    text: 'Peringatan dini cuaca DKI Jakarta: Berpotensi hujan lebat disertai kilat/petir dan angin kencang pada sore-malam hari.',
    author: 'BMKG',
    profile_image: 'https://placehold.co/100x100',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    text: 'Tim SAR berhasil mengevakuasi 15 warga yang terjebak banjir di kawasan Sunter. Semua dalam kondisi selamat.',
    author: 'Basarnas',
    profile_image: 'https://placehold.co/100x100',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

interface UpdatesPanelProps {
  formatDate: (dateString: string) => string;
}

export default function UpdatesPanel({ formatDate }: UpdatesPanelProps) {
  return (
    <div className="space-y-3">
      {mockTweets.map((tweet) => (
        <div key={tweet.id} className="bg-zinc-700/50 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <img
              src={tweet.profile_image}
              alt={tweet.author}
              className="w-8 h-8 rounded-full"
            />
            <div className="ml-2">
              <div className="font-medium text-white">{tweet.author}</div>
              <div className="text-xs text-zinc-400">
                {formatDate(tweet.created_at)}
              </div>
            </div>
          </div>
          <p className="text-zinc-300 text-sm">{tweet.text}</p>
        </div>
      ))}
    </div>
  );
}