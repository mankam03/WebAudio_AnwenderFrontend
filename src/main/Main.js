const CIRCLE_RADIUS = 500;
const PROXIMITY_RADIUS = 0.005;  // Approx. 500 meters in degrees

const SERVER_URL = "http://localhost:4000"
let usecase_id;

let pois = []
let audios = [];
let map;
let userPosition = null;
let userMarker = null;
let poiCircles = {};
let orderDefined;
let randomCircleCenter = []


function submitUseCaseId() {
    usecase_id = document.getElementById('useCaseIdInput').value;

    fetch(`${SERVER_URL}/usecases/${usecase_id}`)
        .then(response => response.json())
        .then(usecases => {

            // Abfangen, dass Usecase nicht existiert
            if(usecases.length === 0){
                alert("Ungültige Anwendungszwecknummer")
                showPopup()
                return;
            }

            // Usecase laden
            usecases.forEach(usecase => {
                const titelAnwendungszweckElement = document.getElementById("titelAnwendungszweck");
                titelAnwendungszweckElement.innerHTML = usecase.titel;

                const beschreibungAnwendungszweckElement = document.getElementById("beschreibungAnwendungszweck");
                beschreibungAnwendungszweckElement.innerHTML = usecase.beschreibung;

                orderDefined = usecase.fixed_order === 1;
            });

            getLocation();
            initializeCentralMap();
            loadPois();

            // Progress-Bar nach dem Laden der Daten wieder anzeigen
            const progressContainer = document.getElementById('progressContainer');
            progressContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching UseCase:', error);
        });

    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('useCaseIdPopup');
    overlay.style.display = 'none';
    popup.style.display = 'none';
}


// Initial aufgerufene Methoden
document.addEventListener('DOMContentLoaded', (event) => {
    showPopup();
});


// Hilfsmethoden der initial aufgerufenen Methoden
function showPopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('useCaseIdPopup');
    overlay.style.display = 'block';
    popup.style.display = 'block';

    // Progress-Bar ausblenden
    const progressContainer = document.getElementById('progressContainer');
    progressContainer.style.display = 'none';
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        alert("GPS-Daten können in diesem Browser nicht gelesen werden.");
    }
}

function initializeCentralMap() {
    const mapContainer = document.getElementById('centralMap');
    map = L.map(mapContainer).setView([49.233, 7.0], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &amp; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18
    }).addTo(map);
}

function loadPois() {
    fetch(SERVER_URL + `/usecases/${usecase_id}/pois`)
        .then(response => response.json())
        .then(data => {
            data.forEach(poi => {
                poi.active = false;
                poi.found = false;
                pois.push(poi); // Verwenden von push, um Lücken zu vermeiden
                addPOIToList(poi, orderDefined);
                audios[poi.order] = new Audio(`/src/main/${poi.soundfile_id}.mp3`)
                audios[poi.order].loop = true;
            });

            if (orderDefined) {
                activateFirstUnfoundPoi();
            }

        })
        .catch(error => {
            console.error('Error fetching UseCase:', error);
        });
}

function updateProgressBar() {
    const totalPois = pois.length;
    const visitedPois = pois.filter(poi => poi.found).length;
    const progress = (visitedPois / (totalPois)) * 100;

    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
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


// Hilsfmethoden der Hilfsmethoden der initialen Methoden
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
        label.innerHTML = `${poi.order}&emsp;${poi.name}`;
    }

    updatePOIColor(poi, label);
    checkUserInProximity(poi, label);
    li.appendChild(label);
    poiList.appendChild(li);
}

function activatePoi(poi, label) {
    poi.active = !poi.active;
    updatePOIColor(poi, label);
    if (poi.active) {
        playAudio(poi);
        if (poiCircles[poi.order]) {
            map.addLayer(poiCircles[poi.order]);
        } else {
            poiCircles[poi.order] = drawCircle(poi.order, [Number(`${poi.x_coordinate}`), Number(`${poi.y_coordinate}`)], CIRCLE_RADIUS, poi.name);
        }
    } else {
        audios[poi.order].pause();
        if (poiCircles[poi.order]) {
            map.removeLayer(poiCircles[poi.order]);
        }
    }
    adjustViewToIncludeAllCircles();
}

function playAudio(poi) {
    setInterval(() => {
        if (userPosition && poi.active) {
            const distance = getDistance(userPosition, randomCircleCenter[poi.order]) * 1000; // Convert to meters
            if (distance <= CIRCLE_RADIUS) {
                audios[poi.order].play();
            } else {
                audios[poi.order].pause();
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

function drawCircle(poi_order, center, radius, poi_name) {
    const randomizedCoordinates = getRandomizedCoordinates(center, radius);
    const circle = L.circle(randomizedCoordinates, {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(map);
    circle.bindPopup(poi_name);
    randomCircleCenter[poi_order] = randomizedCoordinates;
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

function checkUserInProximity(poi, label) {
    setInterval(() => {
        if (userPosition && poi.active) {
            const distance = getDistance(userPosition, [Number(`${poi.x_coordinate}`), Number(`${poi.y_coordinate}`)]);
            if (distance <= PROXIMITY_RADIUS) {
                poi.found = true;
                poi.active = false;
                updatePOIColor(poi, label);
                map.removeLayer(poiCircles[poi.order]);
                audios[poi.order].pause();
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
