import * as sidebar from './Sidebar.js';
import * as storage from './Storage.js';
import * as usecase from './LoadUsecase.js'


const CIRCLE_RADIUS = 500;              // radius of circle on map (meter)
const PROXIMITY_RADIUS = 20 / 1000;     // first number: how near (meter) user must be to trigger found poi

export function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        alert("GPS-Daten können in diesem Browser nicht gelesen werden.");
    }
}

export function initializeCentralMap() {
    const mapContainer = document.getElementById('centralMap');
    usecase.map = L.map(mapContainer).setView([49.233, 7.0], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
            'contributors &amp; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18
    }).addTo(usecase.map);
}

export function loadPois() {
    fetch(usecase.SERVER_URL + `/usecases/${usecase.usecase_id}/pois`)
        .then(response => response.json())
        .then(data => {
            data.forEach(poi => {
                poi.active = false;
                poi.found = false;
                usecase.pois.push(poi);
                addPOIToList(poi, usecase.orderDefined);

                //const audioElement = new Audio(`/src/main/${poi.soundfile_id}.mp3`);
                const audioElement = new Audio(`${SERVER_URL}/soundfiles/${poi.soundfile_id}`);
                usecase.audioElements[poi.order] = audioElement;

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const pannerNode = audioContext.createPanner();
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'linear';
                pannerNode.maxDistance = CIRCLE_RADIUS;
                pannerNode.refDistance = 1;
                pannerNode.rolloffFactor = 3;

                const source = audioContext.createMediaElementSource(audioElement);
                source.connect(pannerNode).connect(audioContext.destination);

                usecase.audioContexts[poi.order] = audioContext;
                usecase.pannerNodes[poi.order] = pannerNode;
            });

            updateProgressBar();

            if (usecase.orderDefined) {
                activateNextUnfoundPoi();
            }

        })
        .catch(error => {
            console.error('Error fetching UseCase:', error);
        });
}

function updateProgressBar() {
    const totalPois = usecase.pois.length;
    const visitedPois = usecase.pois.filter(poi => poi.found).length;
    const progress = (visitedPois / totalPois) * 100;

    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
}

function activateNextUnfoundPoi() {
    for (let poi of usecase.pois) {
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

function addPOIToList(poi, orderDefined) {
    storage.loadProgress(poi);

    const poiList = document.getElementById('poiList');
    const li = document.createElement('li');

    const label = document.createElement('label');
    if (!orderDefined) {
        label.innerHTML = `${poi.name}`;
        label.addEventListener('click', function () {
            if (poi.found && !poi.active) {
                const proceed = confirm
                (`${poi.name} wurde bereits gefunden. Möchten Sie ihn trotzdem auswählen?`);
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
        if (usecase.poiCircles[poi.order]) {
            usecase.map.addLayer(usecase.poiCircles[poi.order]);
        } else {
            usecase.poiCircles[poi.order] = drawCircle(poi.order,
                [Number(`${poi.x_coordinate}`),
                    Number(`${poi.y_coordinate}`)], CIRCLE_RADIUS, poi.name);
        }
    } else {
        usecase.audioElements[poi.order].pause();
        if (usecase.poiCircles[poi.order]) {
            usecase.map.removeLayer(usecase.poiCircles[poi.order]);
        }
    }
    adjustViewToIncludeAllCircles();
}

function playAudio(poi) {
    usecase.audioContexts[poi.order].resume();
    let isPlaying = false;

    function playAndPause() {
        if (usecase.userPosition && poi.active) {
            const distanceToPoi = getDistance(usecase.userPosition,
                [Number(`${poi.x_coordinate}`),
                    Number(`${poi.y_coordinate}`)]) * 1000; // convert to meters
            const distanceToCircleCenter = getDistance(usecase.userPosition, usecase.randomCircleCenter[poi.order]) * 1000;

            if (distanceToCircleCenter <= CIRCLE_RADIUS) {
                if (!isPlaying) {
                    usecase.audioElements[poi.order].play();
                    isPlaying = true;
                    usecase.audioElements[poi.order].addEventListener('ended', () => {
                        setTimeout(() => {
                            usecase.audioElements[poi.order].pause();
                            isPlaying = false;
                        }, sidebar.loopInterval * 1000);
                    });
                }

                updatePannerPosition(poi.order,
                    [Number(`${poi.x_coordinate}`), Number(`${poi.y_coordinate}`)]);

                const maxVolume = 1.0;
                const minVolume = 0.1;
                const volume = 1.0 - (distanceToPoi / CIRCLE_RADIUS);
                usecase.audioElements[poi.order].volume = Math.max(minVolume, volume * maxVolume);
            } else {
                usecase.audioElements[poi.order].pause();
                isPlaying = false;
            }
        } else {
            usecase.audioElements[poi.order].pause();
            isPlaying = false;
        }
    }

    clearInterval(usecase.audioIntervals[poi.order]);
    usecase.audioIntervals[poi.order] = setInterval(playAndPause, 50);
}

function updatePannerPosition(order, poiPosition) {
    if (usecase.userPosition && usecase.pannerNodes[order]) {
        const x = poiPosition[1] - usecase.userPosition[1]; // longitude difference
        const z = usecase.userPosition[0] - poiPosition[0]; // latitude difference
        usecase.pannerNodes[order].setPosition(x, 0, z);
    }
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
    }).addTo(usecase.map);
    circle.bindPopup(poi_name);
    usecase.randomCircleCenter[poi_order] = randomizedCoordinates;
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
    usecase.userPosition = [position.coords.latitude, position.coords.longitude];
    if (usecase.userMarker) {
        usecase.userMarker.setLatLng(usecase.userPosition);
    } else {
        usecase.userMarker = L.marker(usecase.userPosition).addTo(usecase.map).bindPopup('Ihre Position');
    }

    adjustViewToIncludeAllCircles();
}

function adjustViewToIncludeAllCircles() {
    const activeCircles = Object.values(usecase.poiCircles).filter(circle => usecase.map.hasLayer(circle));
    if (activeCircles.length > 0 && sidebar.autoAlignMap) {
        const bounds = L.latLngBounds(activeCircles.map(circle => circle.getLatLng()));
        activeCircles.forEach(circle => {
            bounds.extend(circle.getBounds());
        });
        if (usecase.userMarker) {
            bounds.extend(usecase.userMarker.getLatLng());
        }
        usecase.map.fitBounds(bounds, {padding: [50, 50]});
    } else if (usecase.userMarker && sidebar.autoAlignMap) {
        usecase.map.setView(usecase.userMarker.getLatLng(), 13);
    }
}

function checkUserInProximity(poi, label) {
    setInterval(() => {
        if (usecase.userPosition && poi.active) {
            const distance = getDistance(usecase.userPosition,
                [Number(`${poi.x_coordinate}`), Number(`${poi.y_coordinate}`)]);
            if (distance <= PROXIMITY_RADIUS) {
                poi.found = true;
                poi.active = false;
                updatePOIColor(poi, label);
                usecase.map.removeLayer(usecase.poiCircles[poi.order]);
                usecase.audioElements[poi.order].pause();
                storage.saveProgress(poi);
                updateProgressBar();
                alert(`Sie haben ${poi.name} gefunden`);
                if (usecase.orderDefined) {
                    activateNextUnfoundPoi();
                }
            }
        }
    }, 2000); // check every 2 seconds
}

function getDistance(coord1, coord2) {
    const lat1 = coord1[0];
    const lon1 = coord1[1];
    const lat2 = coord2[0];
    const lon2 = coord2[1];

    const R = 6371; // radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
