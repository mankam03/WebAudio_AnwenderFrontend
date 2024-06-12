let pois = [];
let mapInstances = {};
let userPosition = null;

document.addEventListener('DOMContentLoaded', (event) => {
    getAnwendungszweck();
    getLocation();

    pois = getPois();
    pois.forEach(poi => {
        addPOIToList(poi, false);
    });

    updateProgressBar();
});

function getAnwendungszweck() {
    const titelAnwendungszweckElement = document.getElementById("titelAnwendungszweck");
    titelAnwendungszweckElement.innerHTML = "Entdecke Saarbrücken";

    const beschreibungAnwendungszweckElement = document.getElementById("beschreibungAnwendungszweck");
    beschreibungAnwendungszweckElement.innerHTML = "Herzlich Willkommen in Saarbrücken! " +
        "Entdecken Sie mit dieser Liste die schönsten Flecken, die Saarbrücken zu bieten hat.<br>" +
        "Ihr Ansprechpartner: 0173-727328<br>" +
        "Ansonsten wünschen wir Ihnen viel Spaß!";
}

function getPois() {
    return [
        { number: 1, name: "Saarbrücker Rathaus", active: false, found: true, coordinates: [49.233, 7.0] },
        { number: 2, name: "Saarbrücker Hauptbahnhof", active: false, found: false, coordinates: [49.240, 6.99] },
        { number: 3, name: "Landwehrplatz", active: false, found: false, coordinates: [49.231, 7.01] }
    ];
}

function addPOIToList(poi, orderDefined) {
    const poiList = document.getElementById('poiList');
    const li = document.createElement('li');

    const label = document.createElement('label');
    if (!orderDefined) {
        label.innerHTML = `${poi.name}`;
        label.addEventListener('click', function () {
            if (poi.found && !poi.active) {
                const proceed = confirm("Dieser Point of Interest wurde bereits gefunden. Möchten Sie ihn trotzdem auswählen?");
                if (proceed) {
                    poi.active = !poi.active;
                    updatePOIColor(poi, label);
                }
            } else {
                poi.active = !poi.active;
                updatePOIColor(poi, label);
            }

            if (poi.active) {
                if (mapInstances[poi.number]) {
                    mapInstances[poi.number].container.style.display = 'block';
                    mapInstances[poi.number].map.invalidateSize();
                } else {
                    const mapContainer = document.createElement('div');
                    mapContainer.className = 'map-container';
                    mapContainer.style.display = 'block';
                    li.appendChild(mapContainer);

                    const map = initializeMap(mapContainer, poi.coordinates);

                    const randomizedCoordinates = getRandomizedCoordinates(poi.coordinates, 500);
                    drawCircle(map, randomizedCoordinates, 500);

                    mapInstances[poi.number] = {
                        container: mapContainer,
                        map: map,
                        circleCoordinates: randomizedCoordinates
                    };

                    if (userPosition) {
                        addUserMarker(map, userPosition);
                        adjustViewToIncludePoints(map, randomizedCoordinates, userPosition);
                    }
                }
            } else {
                if (mapInstances[poi.number]) {
                    mapInstances[poi.number].container.style.display = 'none';
                }
            }
        });
    } else {
        label.innerHTML = `${poi.number}&emsp;${poi.name}`;
    }

    updatePOIColor(poi, label);
    li.appendChild(label);
    poiList.appendChild(li);
}

function initializeMap(container, coordinates) {
    const map = L.map(container).setView(coordinates, 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &amp; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18
    }).addTo(map);

    return map;
}

function drawCircle(map, coordinates, radius) {
    L.circle(coordinates, {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(map);
}

function addUserMarker(map, coordinates) {
    L.marker(coordinates).addTo(map)
        .bindPopup('Ihre Position');
}

function getRandomizedCoordinates(center, maxDistance) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * maxDistance;

    const earthRadius = 6371000;
    const dLat = distance / earthRadius;
    const dLng = distance / (earthRadius * Math.cos(Math.PI * center[0] / 180));

    const newLat = center[0] + dLat * (180 / Math.PI) * Math.sin(angle);
    const newLng = center[1] + dLng * (180 / Math.PI) * Math.cos(angle);

    return [newLat, newLng];
}

function updatePOIColor(poi, label) {
    if (poi.active) {
        label.style.color = "blue";
    } else if (poi.found) {
        label.style.color = "green";
    } else {
        label.style.color = "red";
    }
}

const gpsElement = document.getElementById("gps");

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        gpsElement.innerHTML = "GPS-Daten können in diesem Browser nicht gelesen werden.";
    }
}

function showPosition(position) {
    gpsElement.innerHTML = "Latitude: " + position.coords.latitude +
        "<br>Longitude: " + position.coords.longitude;

    userPosition = [position.coords.latitude, position.coords.longitude];

    Object.keys(mapInstances).forEach(key => {
        const poi = pois.find(poi => poi.number == key);
        if (mapInstances[key].map && poi.active) {
            addUserMarker(mapInstances[key].map, userPosition);
            adjustViewToIncludePoints(mapInstances[key].map, mapInstances[key].circleCoordinates, userPosition);
        }
    });
}

function adjustViewToIncludePoints(map, point1, point2) {
    const bounds = L.latLngBounds([point1, point2]);
    map.fitBounds(bounds);
}

function updateProgressBar() {
    const totalPois = pois.length;
    const visitedPois = pois.filter(poi => poi.found).length;
    const progress = (visitedPois / totalPois) * 100;

    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
}