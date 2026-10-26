export function requestCurrentLocation(
  geolocation: Pick<Geolocation, "getCurrentPosition"> | null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }

    geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords.latitude.toFixed(4) + ", " + position.coords.longitude.toFixed(4));
      },
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}
