import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Navigation } from "lucide-react";
import "./NearbyServices.css";

const SERVICE_TYPES = ["beauty_salon", "hair_salon", "barber_shop", "spa"];
const SEARCH_RADIUS_METERS = 5000;
let mapLibrariesPromise;

const loadMapLibraries = (apiKey) => {
  if (!mapLibrariesPromise) {
    setOptions({ key: apiKey, v: "weekly" });
    mapLibrariesPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("places"),
      importLibrary("marker"),
    ]);
  }
  return mapLibrariesPromise;
};

const getCoordinate = (value, owner) =>
  typeof value === "function" ? value.call(owner) : value;

const calculateDistanceKm = (origin, destination) => {
  const coordinates = [origin?.lat, origin?.lng, destination?.lat, destination?.lng].map(Number);
  const [originLat, originLng, destinationLat, destinationLng] = coordinates;

  if (
    !coordinates.every(Number.isFinite) ||
    Math.abs(originLat) > 90 ||
    Math.abs(destinationLat) > 90 ||
    Math.abs(originLng) > 180 ||
    Math.abs(destinationLng) > 180
  ) {
    return null;
  }

  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(destinationLat - originLat);
  const longitudeDifference = radians(destinationLng - originLng);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(originLat)) *
      Math.cos(radians(destinationLat)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const matchesCategory = (place, category) => {
  const types = new Set([place.primaryType, ...(place.types || [])].filter(Boolean));
  if (category === "salons") return types.has("beauty_salon") || types.has("hair_salon");
  if (category === "barbers") return types.has("barber_shop");
  if (category === "spas") return types.has("spa");
  return SERVICE_TYPES.some((type) => types.has(type));
};

const formatDistance = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return null;
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m away`
    : `${distanceKm.toFixed(1)} km away`;
};

const getDirectionsUrl = (place) => {
  const params = new URLSearchParams({
    api: "1",
    destination: `${place.location.lat},${place.location.lng}`,
    destination_place_id: place.id,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

function NearbyServices() {
  const supportsGeolocation =
    typeof navigator !== "undefined" && Boolean(navigator.geolocation);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(
    supportsGeolocation ? "requesting" : "error"
  );
  const [locationMessage, setLocationMessage] = useState(
    supportsGeolocation
      ? ""
      : "This browser does not support location access. Try a current browser or device."
  );
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [places, setPlaces] = useState([]);
  const [category, setCategory] = useState("all");
  const [mapStatus, setMapStatus] = useState("idle");
  const [mapMessage, setMapMessage] = useState("");
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const librariesRef = useRef(null);
  const userMarkerRef = useRef(null);
  const resultMarkersRef = useRef([]);
  const markerByIdRef = useRef(new Map());
  const selectedMarkerRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

  const retryLocation = () => {
    if (!supportsGeolocation) return;
    setLocation(null);
    setPlaces([]);
    setLocationMessage("");
    setLocationStatus("requesting");
    setLocationAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    let cancelled = false;

    if (!supportsGeolocation) return undefined;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (
          !Number.isFinite(nextLocation.lat) ||
          !Number.isFinite(nextLocation.lng) ||
          Math.abs(nextLocation.lat) > 90 ||
          Math.abs(nextLocation.lng) > 180
        ) {
          setLocationStatus("error");
          setLocationMessage("Your device returned an invalid location. Please retry.");
          return;
        }
        setLocation(nextLocation);
        setLocationStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission is needed to find services near you. Allow location access in your browser settings, then try again."
            : "We could not determine your location. Check your device location settings and try again."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );

    return () => { cancelled = true; };
  }, [locationAttempt, supportsGeolocation]);

  useEffect(() => {
    if (!location) return undefined;
    let cancelled = false;

    const searchNearby = async () => {
      if (!apiKey) {
        setMapStatus("error");
        setMapMessage("Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env and restart the development server.");
        return;
      }

      setMapStatus("loading");
      setMapMessage("");
      let libraryLoadFailed = false;
      try {
        let mapLibraries;
        try {
          mapLibraries = await loadMapLibraries(apiKey);
        } catch {
          libraryLoadFailed = true;
          throw new Error("Google Maps libraries failed to load");
        }
        const [mapsLibrary, placesLibrary, markerLibrary] = mapLibraries;
        if (cancelled || !mapContainerRef.current) return;
        setMapLoadFailed(false);

        librariesRef.current = {
          InfoWindow: mapsLibrary.InfoWindow,
          Place: placesLibrary.Place,
          AdvancedMarkerElement: markerLibrary.AdvancedMarkerElement,
          PinElement: markerLibrary.PinElement,
        };

        if (!mapRef.current) {
          mapRef.current = new mapsLibrary.Map(mapContainerRef.current, {
            center: location,
            zoom: 14,
            mapId: "DEMO_MAP_ID",
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          infoWindowRef.current = new mapsLibrary.InfoWindow();
        } else {
          mapRef.current.setCenter(location);
        }

        if (userMarkerRef.current) {
          userMarkerRef.current.position = location;
        } else {
          const userPin = new markerLibrary.PinElement({
            background: "#176b57",
            borderColor: "#ffffff",
            glyphColor: "#ffffff",
            scale: 1.15,
          });
          userMarkerRef.current = new markerLibrary.AdvancedMarkerElement({
            map: mapRef.current,
            position: location,
            title: "Your location",
            content: userPin,
          });
        }

        const { places: nearbyPlaces = [] } = await placesLibrary.Place.searchNearby({
          fields: [
            "id", "displayName", "formattedAddress", "location", "rating",
            "userRatingCount", "currentOpeningHours", "primaryType", "types",
            "googleMapsURI",
          ],
          locationRestriction: { center: location, radius: SEARCH_RADIUS_METERS },
          includedPrimaryTypes: SERVICE_TYPES,
          maxResultCount: 20,
          rankPreference: "DISTANCE",
        });
        if (cancelled) return;

        setPlaces(
          nearbyPlaces.filter((place) => place.location).map((place, index) => {
            const coordinates = {
              lat: getCoordinate(place.location.lat, place.location),
              lng: getCoordinate(place.location.lng, place.location),
            };
            const rawName = place.displayName;
            const name = typeof rawName === "string"
              ? rawName
              : rawName?.text || "Unnamed service business";

            return {
              id: place.id || `${name}-${index}`,
              name,
              address: place.formattedAddress || "Address unavailable",
              location: coordinates,
              rating: place.rating,
              ratingCount: place.userRatingCount,
              openNow: place.currentOpeningHours?.openNow,
              primaryType: place.primaryType,
              types: place.types || [],
              googleMapsURI: place.googleMapsURI,
              distanceKm: calculateDistanceKm(location, coordinates),
            };
          })
        );
        setMapStatus("ready");
      } catch {
        if (!cancelled) {
          setMapLoadFailed(libraryLoadFailed);
          setMapStatus("error");
          setMapMessage(libraryLoadFailed
            ? "Google Maps failed to load. Check the API key, billing, enabled APIs, and website restrictions, then reload this page."
            : "Nearby services could not be loaded. Check that Places API (New) is enabled and the key is allowed for this site.");
        }
      }
    };

    searchNearby();
    return () => { cancelled = true; };
  }, [apiKey, location, searchAttempt]);

  const visiblePlaces = places.filter((place) => matchesCategory(place, category));

  const showPlaceInfo = (place, marker) => {
    if (!mapRef.current || !infoWindowRef.current) return;
    if (selectedMarkerRef.current && selectedMarkerRef.current !== marker) {
      selectedMarkerRef.current.zIndex = undefined;
    }
    marker.zIndex = 1000;
    selectedMarkerRef.current = marker;
    const content = document.createElement("div");
    const address = document.createElement("div");
    address.textContent = place.address;
    content.appendChild(address);
    if (place.googleMapsURI) {
      const link = document.createElement("a");
      link.href = getDirectionsUrl(place);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Get directions";
      content.appendChild(link);
    }
    infoWindowRef.current.setContent(content);
    infoWindowRef.current.setHeaderContent(place.name);
    infoWindowRef.current.open({ map: mapRef.current, anchor: marker, shouldFocus: false });
    setSelectedPlaceId(place.id);
  };

  useEffect(() => {
    if (!mapRef.current || !librariesRef.current) return;
    resultMarkersRef.current.forEach((marker) => { marker.map = null; });
    resultMarkersRef.current = [];
    markerByIdRef.current.clear();
    selectedMarkerRef.current = null;

    places.filter((place) => matchesCategory(place, category)).forEach((place) => {
      const pin = new librariesRef.current.PinElement({
        background: "#f4f1eb",
        borderColor: "#176b57",
        glyphColor: "#176b57",
      });
      const marker = new librariesRef.current.AdvancedMarkerElement({
        map: mapRef.current,
        position: place.location,
        title: place.name,
        content: pin,
        gmpClickable: true,
      });
      marker.addEventListener("gmp-click", () => showPlaceInfo(place, marker));
      resultMarkersRef.current.push(marker);
      markerByIdRef.current.set(place.id, marker);
    });
  }, [places, category]);

  const viewPlaceOnMap = (place) => {
    const marker = markerByIdRef.current.get(place.id);
    if (!mapRef.current) return;
    mapRef.current.panTo(place.location);
    mapRef.current.setZoom(16);
    if (marker) showPlaceInfo(place, marker);
  };

  return (
    <section className="nearby-page" aria-labelledby="nearby-title">
      <div className="nearby-heading">
        <div>
          <p className="eyebrow">FIND YOUR NEXT APPOINTMENT</p>
          <h1 id="nearby-title">Nearby services</h1>
          <p className="nearby-intro">Explore salons, barbers and spas around your current location.</p>
        </div>
        {locationStatus === "ready" && (
          <button className="secondary-button nearby-retry" onClick={retryLocation}>
            Refresh location
          </button>
        )}
      </div>

      {locationStatus !== "ready" ? (
        <div className="nearby-state" role="status" aria-live="polite">
          <span className="nearby-state-icon" aria-hidden="true">{locationStatus === "requesting" ? "⌖" : "!"}</span>
          <h2>
            {locationStatus === "requesting" ? "Finding your location" : locationStatus === "denied" ? "Location access is off" : "Location unavailable"}
          </h2>
          <p>{locationMessage || "Allow location access to search for real businesses nearby."}</p>
          {locationStatus !== "requesting" && supportsGeolocation && (
            <button className="primary-button nearby-action" onClick={retryLocation}>
              Try location again
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="nearby-toolbar">
            <div className="nearby-tabs" role="group" aria-label="Filter services">
              {[["all", "All"], ["salons", "Salons"], ["barbers", "Barbers"], ["spas", "Spas"]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`nearby-tab ${category === value ? "selected" : ""}`}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                >{label}</button>
              ))}
            </div>
            <span className="nearby-radius">Within 5 km</span>
          </div>

          <div className="nearby-layout">
            <div className="nearby-map-panel">
              <div ref={mapContainerRef} className="nearby-map" aria-label="Map showing your location and nearby services" />
              {mapStatus === "loading" && <div className="map-overlay" role="status">Finding nearby services...</div>}
              {mapStatus === "error" && (
                <div className="map-overlay map-overlay-error" role="alert">
                  <p>{mapMessage}</p>
                  {apiKey && <button className="secondary-button" onClick={mapLoadFailed ? () => window.location.reload() : () => setSearchAttempt((attempt) => attempt + 1)}>{mapLoadFailed ? "Reload map" : "Retry search"}</button>}
                </div>
              )}
            </div>

            <section className="nearby-results" aria-label="Nearby businesses">
              <div className="nearby-results-heading">
                <div>
                  <h2>Places near you</h2>
                  <p>{mapStatus === "ready" ? `${visiblePlaces.length} ${visiblePlaces.length === 1 ? "place" : "places"}` : "Live Google Maps results"}</p>
                </div>
              </div>
              {mapStatus === "ready" && visiblePlaces.length === 0 ? (
                <div className="nearby-empty"><strong>No matching services found</strong><p>Try another category or refresh your location.</p></div>
              ) : (
                <div className="nearby-card-list">
                  {visiblePlaces.map((place) => (
                    <article
                      className={`nearby-card ${selectedPlaceId === place.id ? "is-selected" : ""}`}
                      key={place.id}
                      tabIndex={0}
                      aria-label={`Focus ${place.name} on map`}
                      onClick={() => viewPlaceOnMap(place)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          viewPlaceOnMap(place);
                        }
                      }}
                    >
                      <div className="nearby-card-topline">
                        <span className="nearby-card-type">{place.primaryType?.replaceAll("_", " ") || "Service business"}</span>
                        {place.openNow !== undefined && <span className={`nearby-open-status ${place.openNow ? "is-open" : "is-closed"}`}>{place.openNow ? "Open now" : "Closed"}</span>}
                      </div>
                      <h3>{place.name}</h3>
                      <p className="nearby-address">{place.address}</p>
                      <div className="nearby-meta">
                        {Number.isFinite(place.rating) && (
                          <span className="nearby-rating"><span aria-hidden="true">★</span> {place.rating.toFixed(1)}{Number.isFinite(place.ratingCount) && <span className="nearby-rating-count">({place.ratingCount})</span>}</span>
                        )}
                        {formatDistance(place.distanceKm) && <span>{formatDistance(place.distanceKm)}</span>}
                      </div>
                      <div className="nearby-card-actions">
                        <button className="nearby-map-link" type="button" onClick={(event) => {
                          event.stopPropagation();
                          viewPlaceOnMap(place);
                        }}>
                          View on map <span aria-hidden="true">↗</span>
                        </button>
                        <a className="nearby-map-link nearby-directions-link" href={getDirectionsUrl(place)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                          Directions <Navigation size={14} aria-hidden="true" />
                        </a>
                      </div>
                    </article>
                  ))}
                  {mapStatus === "loading" && places.length === 0 && <div className="nearby-list-loading">Loading nearby places...</div>}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

export default NearbyServices;