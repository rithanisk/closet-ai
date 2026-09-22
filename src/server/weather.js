import 'server-only';

export async function getWeather(city, coordinates) {
  try {
    let place;
    if (coordinates?.latitude != null && coordinates?.longitude != null) {
      place = { latitude: coordinates.latitude, longitude: coordinates.longitude, name: city?.trim() || 'Current location', country_code: '' };
    } else {
      if (!city?.trim()) return null;
      const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geoUrl.searchParams.set('name', city.trim());
      geoUrl.searchParams.set('count', '1');
      geoUrl.searchParams.set('language', 'en');
      geoUrl.searchParams.set('format', 'json');
      const geoResponse = await fetch(geoUrl, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
      if (!geoResponse.ok) return null;
      place = (await geoResponse.json()).results?.[0];
      if (!place) return null;
    }

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', String(place.latitude));
    forecastUrl.searchParams.set('longitude', String(place.longitude));
    forecastUrl.searchParams.set('current', 'temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m');
    forecastUrl.searchParams.set('timezone', 'auto');
    const forecastResponse = await fetch(forecastUrl, { signal: AbortSignal.timeout(5000), next: { revalidate: 900 } });
    if (!forecastResponse.ok) return null;
    const current = (await forecastResponse.json()).current;
    if (!current) return null;
    return {
      city: [place.name, place.country_code].filter(Boolean).join(', '),
      temperatureC: Math.round(current.temperature_2m),
      feelsLikeC: Math.round(current.apparent_temperature),
      rainMm: current.rain || current.precipitation || 0,
      windKph: Math.round(current.wind_speed_10m || 0),
      weatherCode: current.weather_code,
    };
  } catch {
    return null;
  }
}

export function weatherLabel(weather) {
  if (!weather) return 'Live weather unavailable; use seasonal judgment.';
  const rain = weather.rainMm > 0 ? `, ${weather.rainMm}mm rain` : ', no current rain';
  return `${weather.city}: ${weather.temperatureC}°C, feels like ${weather.feelsLikeC}°C${rain}, wind ${weather.windKph}km/h`;
}
