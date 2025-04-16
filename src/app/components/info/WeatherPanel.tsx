'use client';

// Mock data for development
const mockWeather = {
  temperature: 28,
  condition: 'Cerah Berawan',
  icon: '04d',
  humidity: 75,
  wind_speed: 3.5,
};

export default function WeatherPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-zinc-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={`https://openweathermap.org/img/wn/${mockWeather.icon}@2x.png`}
              alt={mockWeather.condition}
              className="w-16 h-16"
            />
            <div className="ml-2">
              <div className="text-3xl font-bold text-white">{mockWeather.temperature}°C</div>
              <div className="text-zinc-300 capitalize">{mockWeather.condition}</div>
            </div>
          </div>
          <div className="text-right text-sm text-zinc-300">
            <div>Kelembaban: {mockWeather.humidity}%</div>
            <div>Angin: {mockWeather.wind_speed} m/s</div>
          </div>
        </div>
      </div>

      <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
        <h3 className="text-red-400 font-medium mb-1">Peringatan Cuaca</h3>
        <p className="text-sm text-zinc-300">
          Berpotensi hujan lebat disertai kilat/petir dan angin kencang di wilayah Jakarta Selatan dan Jakarta Timur.
        </p>
      </div>
    </div>
  );
}