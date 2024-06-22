const CIRCLE_RADIUS = 500;
const PROXIMITY_RADIUS = 0.005;  // Approx. 500 meters in degrees

let pois = [];
let audios = [];
let map;
let userPosition = null;
let userMarker = null;
let poiCircles = {};
let orderDefined = false;
let randomCircleCenter = []

document.addEventListener('DOMContentLoaded', (event) => {
    getAnwendungszweck();
    getLocation();
    initializeCentralMap();

    pois = getPois();
    pois.forEach(poi => {
        addPOIToList(poi, orderDefined);
        audios[poi.number] = new Audio(`/src/main/${poi.sound}`)
        audios[poi.number].loop = true;
    });

    updateProgressBar();

    if (orderDefined) {
        activateFirstUnfoundPoi();
    }
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
        {number: 1, name: "Saarbrücker Rathaus", active: false, found: true, coordinates: [49.233, 7.0], sound:"test.mp3"},
        {number: 2, name: "Saarbrücker Hauptbahnhof", active: false, found: true, coordinates: [49.240, 6.99], sound:"test2.mp3"},
        {number: 3, name: "Landwehrplatz", active: false, found: false, coordinates: [49.236590, 6.990146], sound:"test.mp3"},
        {number: 4, name: "Saarbrücker Schloss", active: false, found: false, coordinates: [49.2315, 7.015], sound:"test2.mp3"},
        {number: 5, name: "Zoo", active: false, found: false, coordinates: [49.21, 7.07], sound:"test.mp3"},
        {number: 6, name: "Johanneskirche", active: false, found: false, coordinates: [49.235, 7.03], sound:"test2.mp3"},
        {number: 7, name: "Staatstheater", active: false, found: false, coordinates: [49.31, 6.92], sound:"test.mp3"}
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
                const proceed = confirm(`${poi.name} wurde bereits gefunden. Möchten Sie ihn trotzdem auswählen?` );
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
    checkUserInProximity(poi, label);
    li.appendChild(label);
    poiList.appendChild(li);
}

function activateFirstUnfoundPoi() {
    for (let poi of pois) {
        if (!poi.found) {
            const poiList = document.getElementById('poiList');
            const labels = poiList.getElementsByTagName('label');
            for (let label of labels) {
                if (label.innerHTML.includes(poi.name)) {
                    activatePoi(poi, label);
                    return;
                }
            }
        }
    }
}

function activatePoi(poi, label) {
    poi.active = !poi.active;
    updatePOIColor(poi, label);
    if (poi.active) {
        playAudio(poi);
        if (poiCircles[poi.number]) {
            map.addLayer(poiCircles[poi.number]);
        } else {
            poiCircles[poi.number] = drawCircle(poi.number, poi.coordinates, CIRCLE_RADIUS, poi.name);  // Pass the POI's name here
        }
    } else {
        audios[poi.number].pause();
        if (poiCircles[poi.number]) {
            map.removeLayer(poiCircles[poi.number]);
        }
    }
    adjustViewToIncludeAllCircles();
}

function playAudio(poi) {
    setInterval(() => {
        if (userPosition && poi.active) {
            const distance = getDistance(userPosition, randomCircleCenter[poi.number]) * 1000; // Convert to meters
            if (distance <= CIRCLE_RADIUS) {
                audios[poi.number].play();
            } else {
                audios[poi.number].pause();
            }
        }
    }, 500); // Check every 0.5 seconds
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

function drawCircle(poi_number, center, radius, poi_name) {
    const randomizedCoordinates = getRandomizedCoordinates(center, radius);
    const circle = L.circle(randomizedCoordinates, {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(map);
    circle.bindPopup(poi_name);  // Add this line to bind the name to the circle
    randomCircleCenter[poi_number] = randomizedCoordinates;
    return circle;
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
        map.fitBounds(bounds, {padding: [50, 50]});
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

function checkUserInProximity(poi, label) {
    setInterval(() => {
        if (userPosition && poi.active) {
            const distance = getDistance(userPosition, poi.coordinates);
            if (distance <= PROXIMITY_RADIUS) {
                poi.found = true;
                poi.active = false;
                updatePOIColor(poi, label);
                map.removeLayer(poiCircles[poi.number]);
                audios[poi.number].pause();
                updateProgressBar();
                alert(`Sie haben ${poi.name} gefunden`);
            }
        }
    }, 2000); // Check every 2 seconds
}

function getDistance(coord1, coord2) {
    const lat1 = coord1[0];
    const lon1 = coord1[1];
    const lat2 = coord2[0];
    const lon2 = coord2[1];

    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
