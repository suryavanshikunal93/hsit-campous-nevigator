// HSIT Campus Navigator
// Free map stack: Leaflet + OpenStreetMap. No Google Maps API is used.
//
// IMPORTANT:
// The photos are real photos supplied for this project, but the marker coordinates
// below are approximate starter positions, not verified building coordinates.
// Please adjust each latitude/longitude after checking the location on campus.

const CAMPUS_CENTER = [16.2937, 74.5244];
const START_ZOOM = 17;

const places = [
  {
    id: "LIBRARY",
    name: "College Library",
    category: "Academic",
    image: "images/library.jpg",
    description: "Reading and study area for students.",
    keywords: "library study reading books study hall",
    coordinates: [16.2940, 74.5242]
  },
  {
    id: "PARKING",
    name: "College Parking",
    category: "Facilities",
    image: "images/parking.jpg",
    description: "Two-wheeler parking area.",
    keywords: "parking bike motorcycle vehicle two wheeler",
    coordinates: [16.2934, 74.5247]
  },
  {
    id: "SPORTS_COMPLEX",
    name: "Sports Complex",
    category: "Facilities",
    image: "images/sports-complex.jpg",
    description: "Sports complex building.",
    keywords: "sports gym games indoor outdoor activity",
    coordinates: [16.2942, 74.5247]
  },
  {
    id: "MAIN_GATE",
    name: "College Main Building",
    category: "Academic",
    image: "images/main-building.jpg",
    description: "Front view of Hirasugar Institute of Technology.",
    keywords: "main gate entrance college front building hsit campus",
    coordinates: [16.2937, 74.5244]
  },
  {
    id: "BOYS_HOSTEL",
    name: "Boys' Hostel",
    category: "Accommodation",
    image: "images/boys-hostel.jpg",
    description: "HIT boys' hostel entrance.",
    keywords: "hostel boys accommodation residence room",
    coordinates: [16.2947, 74.5250]
  },
  {
    id: "CANTEEN",
    name: "College Canteen",
    category: "Food",
    image: "images/canteen-interior.jpg",
    description: "Canteen seating and snack counter.",
    keywords: "canteen food snacks lunch tea coffee cafeteria",
    coordinates: [16.2933, 74.5241]
  },
  {
    id: "CANTEEN_FRONT",
    name: "Canteen Front",
    category: "Food",
    image: "images/canteen-front.jpg",
    description: "Exterior view of the canteen-side building.",
    keywords: "canteen front exterior cafe steamora",
    coordinates: [16.2929, 74.5239]
  },
  {
    id: "GRAMIN_BANK",
    name: "Karnataka Grameena Bank",
    category: "Nearby",
    image: "images/gramin-bank.jpg",
    description: "Nidasoshi Extension Branch, shown in your photo.",
    keywords: "bank grameena karnataka bank atm money nearby",
    coordinates: [16.2928, 74.5237]
  }
];

const elements = {
  search: document.getElementById("searchInput"),
  list: document.getElementById("placeList"),
  count: document.getElementById("placeCount"),
  filters: document.getElementById("categoryFilters"),
  locate: document.getElementById("locateBtn"),
  reset: document.getElementById("resetBtn"),
  showAll: document.getElementById("showAllBtn"),
  status: document.getElementById("mapStatus"),
  substatus: document.getElementById("mapSubstatus"),
  notice: document.getElementById("notice")
};

let selectedCategory = "All";
let selectedPlaceId = null;
let userMarker = null;
let userAccuracyCircle = null;
const markersById = new Map();

const map = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: true
}).setView(CAMPUS_CENTER, START_ZOOM);

// OpenStreetMap standard tiles. Please follow OSM tile usage policy.
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
}).addTo(map);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = false;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(function () {
    elements.notice.hidden = true;
  }, 3500);
}

function getDirectionsUrl(place) {
  const destination = place.coordinates[0] + "," + place.coordinates[1];
  // Opens OpenStreetMap directions in a new tab. It may offer driving routes;
  // walking route availability depends on the routing service and mapped paths.
  return "https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=" +
    encodeURIComponent(CAMPUS_CENTER.join(",")) + "%3B" + encodeURIComponent(destination);
}

function createPopup(place) {
  return `
    <div class="popup-card">
      <img src="${escapeHTML(place.image)}" alt="${escapeHTML(place.name)}"
           onerror="this.style.display='none'">
      <h3>${escapeHTML(place.name)}</h3>
      <p>${escapeHTML(place.description)}</p>
      <div class="popup-links">
        <a href="${getDirectionsUrl(place)}" target="_blank" rel="noopener">Get directions</a>
        <a class="secondary" href="${escapeHTML(place.image)}" target="_blank" rel="noopener">View photo</a>
      </div>
    </div>`;
}

function addMarkers() {
  places.forEach(function (place) {
    const marker = L.marker(place.coordinates).addTo(map);
    marker.bindPopup(createPopup(place));
    marker.bindTooltip(place.name, { direction: "top", offset: [0, -8] });
    marker.on("click", function () {
      selectPlace(place.id, false);
    });
    markersById.set(place.id, marker);
  });
}

function getFilteredPlaces() {
  const searchTerm = elements.search.value.trim().toLowerCase();

  return places.filter(function (place) {
    const matchesCategory =
      selectedCategory === "All" || place.category === selectedCategory;

    const searchableText = (
      place.name + " " + place.id + " " + place.category + " " +
      place.description + " " + place.keywords
    ).toLowerCase();

    return matchesCategory && searchableText.includes(searchTerm);
  });
}

function renderPlaces() {
  const filteredPlaces = getFilteredPlaces();
  elements.list.innerHTML = "";
  elements.count.textContent = filteredPlaces.length +
    (filteredPlaces.length === 1 ? " place" : " places");

  if (filteredPlaces.length === 0) {
    elements.list.innerHTML =
      '<div class="empty-state">No places found. Try another search.</div>';
    return;
  }

  filteredPlaces.forEach(function (place) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-card" +
      (place.id === selectedPlaceId ? " selected" : "");
    button.setAttribute("aria-label", "Show " + place.name + " on map");

    const image = document.createElement("img");
    image.src = place.image;
    image.alt = place.name;
    image.loading = "lazy";
    image.onerror = function () {
      image.alt = "Photo unavailable";
      image.src = "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100">' +
        '<rect width="100%" height="100%" fill="#e9eef1"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#687987" font-size="12">Photo unavailable</text></svg>'
      );
    };

    const copy = document.createElement("div");
    copy.className = "place-card-copy";

    const name = document.createElement("strong");
    name.textContent = place.name;

    const description = document.createElement("small");
    description.textContent = place.description;

    const category = document.createElement("span");
    category.className = "category";
    category.textContent = place.category;

    copy.appendChild(name);
    copy.appendChild(description);
    copy.appendChild(category);
    button.appendChild(image);
    button.appendChild(copy);

    button.addEventListener("click", function () {
      selectPlace(place.id, true);
    });

    elements.list.appendChild(button);
  });
}

function selectPlace(placeId, openPopup) {
  const place = places.find(function (item) {
    return item.id === placeId;
  });

  if (!place) return;

  selectedPlaceId = place.id;
  const marker = markersById.get(place.id);

  map.flyTo(place.coordinates, 18, { duration: 0.7 });
  if (openPopup && marker) marker.openPopup();

  elements.status.textContent = "Selected: " + place.name;
  elements.substatus.textContent = "Photo and directions available in the place popup.";
  renderPlaces();
}

function setCategory(category) {
  selectedCategory = category;
  const buttons = elements.filters.querySelectorAll("[data-category]");

  buttons.forEach(function (button) {
    button.classList.toggle("active", button.dataset.category === category);
  });

  renderPlaces();
}

function showAllPlaces() {
  const points = places.map(function (place) {
    return place.coordinates;
  });
  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds.pad(0.22), { maxZoom: 17 });
  selectedPlaceId = null;
  elements.status.textContent = "Showing all saved places.";
  elements.substatus.textContent = "Choose a photo card or map marker.";
  renderPlaces();
}

function resetMap() {
  elements.search.value = "";
  setCategory("All");
  selectedPlaceId = null;
  map.setView(CAMPUS_CENTER, START_ZOOM);
  elements.status.textContent = "Choose a place to see it on the map.";
  elements.substatus.textContent = "Select a place for details";
  renderPlaces();
}

function locateUser() {
  if (!navigator.geolocation) {
    showNotice("This browser does not support location detection.");
    return;
  }

  elements.locate.disabled = true;
  elements.locate.textContent = "Finding...";

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const userPosition = [
        position.coords.latitude,
        position.coords.longitude
      ];

      if (userMarker) map.removeLayer(userMarker);
      if (userAccuracyCircle) map.removeLayer(userAccuracyCircle);

      userMarker = L.circleMarker(userPosition, {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1478e8",
        fillOpacity: 1
      }).addTo(map).bindPopup("Your current location");

      userAccuracyCircle = L.circle(userPosition, {
        radius: position.coords.accuracy,
        color: "#1478e8",
        weight: 1,
        fillColor: "#1478e8",
        fillOpacity: 0.08
      }).addTo(map);

      map.flyTo(userPosition, 18, { duration: 0.8 });
      userMarker.openPopup();
      elements.status.textContent = "Your current location is shown.";
      elements.substatus.textContent = "Blue dot = your device location";
      showNotice("Location found. GPS accuracy can vary.");
      elements.locate.disabled = false;
      elements.locate.textContent = "◎ Find me";
    },
    function (error) {
      let message = "Could not get your location.";
      if (error.code === 1) {
        message = "Location permission was denied. Allow location access in your browser.";
      } else if (error.code === 2) {
        message = "Your device could not determine the location. Try again outdoors.";
      } else if (error.code === 3) {
        message = "Location request timed out. Please try again.";
      }
      showNotice(message);
      elements.locate.disabled = false;
      elements.locate.textContent = "◎ Find me";
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
  );
}

elements.search.addEventListener("input", renderPlaces);

elements.filters.addEventListener("click", function (event) {
  const button = event.target.closest("[data-category]");
  if (button) setCategory(button.dataset.category);
});

elements.locate.addEventListener("click", locateUser);
elements.reset.addEventListener("click", resetMap);
elements.showAll.addEventListener("click", showAllPlaces);

addMarkers();
renderPlaces();

// Leaflet sometimes needs a size refresh after the page layout settles.
window.addEventListener("load", function () {
  setTimeout(function () {
    map.invalidateSize();
  }, 150);
});
