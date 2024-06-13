let pois = [];
let map;
let userPosition = null;
let userMarker = null;
let poiCircles = {};

document.addEventListener('DOMContentLoaded', (event) => {
    getAnwendungszweck();
    getLocation();
    initializeCentralMap();

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

function initializeCentralMap() {
    const mapContainer = document.getElementById('centralMap');
    map = L.map(mapContainer).setView([49.233, 7.0], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &amp; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18
    }).addTo(map);
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
                    activatePoi(poi, label);
                }
            } else {
                activatePoi(poi, label);
            }
        });
    } else {
        label.innerHTML = `${poi.number}&emsp;${poi.name}`;
    }

    updatePOIColor(poi, label);
    li.appendChild(label);
    poiList.appendChild(li);
}

function activatePoi(poi, label) {
    poi.active = !poi.active;
    updatePOIColor(poi, label);
    if (poi.active) {
        if (poiCircles[poi.number]) {
            map.addLayer(poiCircles[poi.number]);
        } else {
            poiCircles[poi.number] = drawCircle(poi.coordinates, 500);
        }
    } else {
        if (poiCircles[poi.number]) {
            map.removeLayer(poiCircles[poi.number]);
        }
    }
    adjustViewToIncludeAllCircles();
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

function drawCircle(center, radius) {
    const randomizedCoordinates = getRandomizedCoordinates(center, radius);
    return L.circle(randomizedCoordinates, {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(map);
}

function getRandomizedCoordinates(center, radius) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;

    const earthRadius = 6371000;
    const dLat = distance / earthRadius;
    const dLng = distance / (earthRadius * Math.cos(Math.PI * center[0] / 180));

    const newLat = center[0] + dLat * (180 / Math.PI) * Math.sin(angle);
    const newLng = center[1] + dLng * (180 / Math.PI) * Math.cos(angle);

    return [newLat, newLng];
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        alert("GPS-Daten können in diesem Browser nicht gelesen werden.");
    }
}

function showPosition(position) {
    userPosition = [position.coords.latitude, position.coords.longitude];
    if (userMarker) {
        userMarker.setLatLng(userPosition);
    } else {
        userMarker = L.marker(userPosition).addTo(map).bindPopup('Ihre Position');
    }

    adjustViewToIncludeAllCircles();
}

function adjustViewToIncludeAllCircles() {
    const activeCircles = Object.values(poiCircles).filter(circle => map.hasLayer(circle));
    if (activeCircles.length > 0) {
        const bounds = L.latLngBounds(activeCircles.map(circle => circle.getLatLng()));
        activeCircles.forEach(circle => {
            bounds.extend(circle.getBounds());
        });
        if (userMarker) {
            bounds.extend(userMarker.getLatLng());
        }
        map.fitBounds(bounds, { padding: [50, 50] });
    } else if (userMarker) {
        map.setView(userMarker.getLatLng(), 13);
    }
}

function updateProgressBar() {
    const totalPois = pois.length;
    const visitedPois = pois.filter(poi => poi.found).length;
    const progress = (visitedPois / totalPois) * 100;

    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
}
