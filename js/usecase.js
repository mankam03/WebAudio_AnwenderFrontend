import * as sidebar from './sidebar.js';
import * as storage from './storage.js';
import * as messages from './messages.js';

export const SERVER_URL = "../api";       // url of rest api calls
const CIRCLE_RADIUS = 500;              // radius of circle on map in meters
const PROXIMITY_RADIUS = 20 / 1000;     // first number: how near in meters user must be to trigger found poi

export let usecase_id;                          // id of the usecase
export let orderDefined;                        // if pois should be visited in order
export let map;                                 // openstreetmaps
export let userPosition;                        // latitude and longitude of the user
export let userMarker;                          // marker at the current user position
export let pois = [];                     // stores all pois of the usecase
export let poiCircles = [];               // stores all circles of all pois of the usecase
export let audioElements = [];            // stores all audio elements of all pois of the usecase
export let audioContexts = [];            // stores all audio contexts of all pois of the usecase
export let audioIntervals = [];           // stores all audio elements of all pois of the usecase
export let pannerNodes = [];              // stores all panner nodes of all pois of the usecase
export let randomCircleCenter = [];       // stores all randomly calculated coordinates of the circles
window.submitUseCaseId = submitUseCaseId;       // export function to global scope to use in index.html


/**
 * call functions to initialize usecase
 */
document.addEventListener('DOMContentLoaded', () => {
    showPopup();
    loadSidebar();
});

/**
 * get all sidebar elements and make them clickable with the appropriate function call
 */
function loadSidebar() {
    const openSidebarButton = document.getElementById('openSidebarButton');
    const autoALignButton = document.getElementById('autoAlignButton');
    const setIntervalButton = document.getElementById('setIntervalButton');
    const deleterecentUsecases = document.getElementById('deleteRecentUsecases');
    const resetProgress = document.getElementById('resetProgress');
    const leaveUsecase = document.getElementById('leaveUsecase');
    openSidebarButton.addEventListener('click', sidebar.toggleSidebar);
    autoALignButton.addEventListener('click', sidebar.toggleAutoAlignMap);
    setIntervalButton.addEventListener('click', sidebar.setLoopInterval);
    deleterecentUsecases.addEventListener('click', sidebar.deleteRecentUsecases);
    resetProgress.addEventListener('click', sidebar.resetProgress)
    leaveUsecase.addEventListener('click', sidebar.leaveUsecase);
}

/**
 * show initial popup, which lets the use enter the usecase id
 */
function showPopup() {

    // show overlay and hide elements behind popup
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('useCaseIdPopup');
    const progressContainer = document.getElementById('progressContainer');
    const hint = document.getElementById('hint')
    overlay.style.display = 'block';
    popup.style.display = 'block';
    progressContainer.style.display = 'none';
    hint.style.display = 'none';

    // if available in local storage, auto fill last recently used usecase id in text field
    const storedUseCaseId = localStorage.getItem('current_usecase_id');
    if (storedUseCaseId) {
        const useCaseIdInput = document.getElementById('useCaseIdInput');
        useCaseIdInput.value = storedUseCaseId;
    }
    storage.showRecentUsecases();
}

/**
 * when submitting the entered usecase id, check if usecase is available and fetch it from database
 */
function submitUseCaseId() {

    // check if usecase id is given. if not, show popup again
    usecase_id = document.getElementById('useCaseIdInput').value;
    if (usecase_id === '') {
        alert(messages.ALERT_NO_USECASE_ID);
        showPopup();
        return;
    }

    // check if usecaseid is available and then gather all usecase information
    fetch(`${SERVER_URL}/usecases/${usecase_id}`)
        .then(response => response.json())
        .then(usecases => {
            if (usecases.length === 0) {
                alert(messages.ALERT_WRONG_USECASE_ID);
                showPopup();
                return;
            }

            // if here, usecase is available, so call appropriate functions to start application
            loadUsecase(usecases);
            localStorage.setItem('current_usecase_id', usecase_id);
            storage.updateRecentUsecases(usecase_id);
            getLocation();
            initializeCentralMap();
            loadPois();

            // show previosly hidden elements again
            const progressContainer = document.getElementById('progressContainer');
            const sidebarButton = document.getElementById('openSidebarButton');
            const hint = document.getElementById('hint');
            progressContainer.style.display = 'block';
            sidebarButton.style.display = 'block';
            hint.style.display = 'block';

        })
        .catch(() => {
            alert(messages.ALERT_CANT_LOAD_USECASE);
            location.reload();
        });

    // close popup
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('useCaseIdPopup');
    overlay.style.display = 'none';
    popup.style.display = 'none';
}

/**
 * load attributes of an usecase
 * @param usecases set of usecases, but since usecaseid is unique, set consists of only one usecase
 */
function loadUsecase(usecases) {
    usecases.forEach(usecase => {
        const titelAnwendungszweckElement =
            document.getElementById("titelAnwendungszweck");
        titelAnwendungszweckElement.innerHTML = `${usecase.titel} (#${usecase.id})`;

        const beschreibungAnwendungszweckElement =
            document.getElementById("beschreibungAnwendungszweck");
        beschreibungAnwendungszweckElement.innerHTML = usecase.beschreibung;

        orderDefined = usecase.fixed_order === 1;
    });
}

/**
 * subscribe to gps position if available
 */
export function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        alert(messages.ALERT_CANT_LOAD_GPS);
        location.reload();
    }
}

/**
 * initialize map which enables the map to show on screen with appropriate layout
 */
export function initializeCentralMap() {
    const mapContainer = document.getElementById('centralMap');
    map = L.map(mapContainer).setView([49.233, 7.0], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
            'contributors &amp; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18
    }).addTo(map);
}

/**
 * fetch all pois which belong to usecase and further initialize application, e.g. by initializing web audio
 */
export function loadPois() {
    fetch(SERVER_URL + `/usecases/${usecase_id}/pois`)
        .then(response => response.json())
        .then(data => {
            data.forEach(poi => {
                poi.active = false;
                poi.found = false;
                pois[poi.order] = poi;
                addPOIToList(poi, orderDefined);
                initializeWebAudio(poi);
            });
            updateProgressBar();
            if (orderDefined) {
                activateNextUnfoundPoi();
            }
        })
        .catch(() => {
            alert(messages.ALERT_CANT_LOAD_POIS)
            location.reload();
        });
}

/**
 * initalize web audio for every poi, i.e. create audio context, audio element, nodes, ... for every poi
 * @param poi which poi to initialize
 */
function initializeWebAudio(poi) {

    // check if soundfile is available from rest api call and if so, get soundfile and create audio element
    const audioUrl = `${SERVER_URL}/soundfiles/${poi.soundfile_id}`;
    fetch(audioUrl)
        .then(soundfile => {
            if (!soundfile.ok) {
                alert(messages.ALERT_CANT_LOAD_SOUNDFILES);
                location.reload();
            }
        });
    const audioElement = new Audio(audioUrl);
    audioElements[poi.order] = audioElement;

    // get audio context and define panner node settings
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const pannerNode = audioContext.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'linear';
    pannerNode.maxDistance = CIRCLE_RADIUS;
    pannerNode.refDistance = 1;
    pannerNode.rolloffFactor = 3;

    // connect all nodes
    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(pannerNode).connect(audioContext.destination);

    // map created audio context and panner node to poi
    audioContexts[poi.order] = audioContext;
    pannerNodes[poi.order] = pannerNode;
}

/**
 * update the progress bar to always show in % how many percent of pois are found
 */
function updateProgressBar() {
    const totalPois = pois.length;
    const visitedPois = pois.filter(poi => poi.found).length;
    const progress = (visitedPois / totalPois) * 100;
    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
}

/**
 * if order is given, auto selects the next poi if previous poi is found
 */
function activateNextUnfoundPoi() {
    for (let poi of pois) {
        if (!poi.found) {
            const poiList = document.getElementById('poiList');
            const labels = poiList.getElementsByTagName('label');
            for (let label of labels) {
                if (label.innerHTML.includes(poi.name)) {
                    togglePoi(poi, label);
                    return;
                }
            }
        }
    }
}

/**
 * add all fetched pois to list with different functionality, depending whether order is defined or not
 * @param poi which poi to add next to the list
 * @param orderDefined if usecases defines order in which user must find pois
 */
function addPOIToList(poi, orderDefined) {

    // before adding pois to list, load which pois has previously been found
    storage.loadProgress(poi);

    const poiList = document.getElementById('poiList');
    const li = document.createElement('li');
    const label = document.createElement('label');

    // if no order is defined, make pois clickable and do not show order number left to poi name
    if (!orderDefined) {
        label.innerHTML = `${poi.name}`;
        label.addEventListener('click', function () {
            if (poi.found && !poi.active) {
                const proceed = confirm
                (`${poi.name} wurde bereits gefunden. Trotzdem auswählen?`);
                if (proceed) {
                    togglePoi(poi, label);
                }
            } else {
                togglePoi(poi, label);
            }
        });
        // else, if order is defined, do not make pois clickable and show order number left to poi name
    } else {
        label.innerHTML = `${poi.order}&emsp;${poi.name}`;
    }

    // add labels to list
    li.appendChild(label);
    poiList.appendChild(li);

    // further initialize application with appropriate function calls
    updatePOIColor(poi, label);
    checkUserInProximity(poi, label);
}

/**
 * toggles a poi, i.e. show/hide circle on map and play/pause audio if user is within/out of the circle
 * @param poi which poi to toggle
 * @param label label of the poi
 */
function togglePoi(poi, label) {

    // toggle status between activate und deactivate
    poi.active = !poi.active;
    updatePOIColor(poi, label);

    // if status is now active, show circle on map and play audio if user is within the circle
    if (poi.active) {
        playAudio(poi);
        if (poiCircles[poi.order]) {
            map.addLayer(poiCircles[poi.order]);
        } else {
            poiCircles[poi.order] = drawCircle(poi.order,
                [Number(`${poi.x_coordinate}`),
                    Number(`${poi.y_coordinate}`)], poi.name);
        }
        // else, if status is now inactive, remove circle on map and stop playing audio
    } else {
        audioElements[poi.order].pause();
        if (poiCircles[poi.order]) {
            map.removeLayer(poiCircles[poi.order]);
        }
    }

    // adjusts the map so user marker and all circles are always seen (can be turned off in sidebar)
    adjustViewToIncludeAllCircles();
}

/**
 * plays the web audio for a specific poi
 * @param poi which poi to play the audio for
 */
function playAudio(poi) {

    // wake up audio context, audio not playing at this point
    audioContexts[poi.order].resume();
    let isPlaying = false;

    /**
     * periodically call this function to check if audio should be played right now or paused.
     * this is necessary since we have many conditions when audio should play:
     * is poi (still) active? is user (still) within circle? is audio
     */
    function playAndPause() {

        // if gps is available and poi is active...
        if (userPosition && poi.active) {

            // calculate distance from user to poi and circle center
            const distanceToPoi = getDistance(userPosition,
                [Number(`${poi.x_coordinate}`),
                    Number(`${poi.y_coordinate}`)]) * 1000; // convert to meters
            const distanceToCircleCenter = getDistance(userPosition,
                randomCircleCenter[poi.order]) * 1000;

            // if user is within the circle, play audio
            if (distanceToCircleCenter <= CIRCLE_RADIUS) {
                if (!isPlaying) {
                    audioElements[poi.order].play();
                    isPlaying = true;

                    // when audio ends, wait for given seconds and restart
                    audioElements[poi.order].addEventListener('ended', () => {
                        setTimeout(() => {
                            audioElements[poi.order].pause();
                            isPlaying = false;
                        }, sidebar.loopInterval * 1000);
                    });
                }

                // always update positions and volume
                updatePannerPosition(poi.order,
                    [Number(`${poi.x_coordinate}`), Number(`${poi.y_coordinate}`)]);
                const maxVolume = 1.0;
                const minVolume = 0.1;
                const volume = 1.0 - (distanceToPoi / CIRCLE_RADIUS);
                audioElements[poi.order].volume = Math.max(minVolume, volume * maxVolume);

                // else, if user leaves circle, stop playing audio
            } else {
                audioElements[poi.order].pause();
                isPlaying = false;
            }

            // else, if gps is not available or poi is not active anymore, stop playing audio
        } else {
            audioElements[poi.order].pause();
            isPlaying = false;
        }
    }

    // always clear current audio interval to avoid duplicates, always create new one
    clearInterval(audioIntervals[poi.order]);
    audioIntervals[poi.order] = setInterval(playAndPause, 50);
}


/**
 * updates the position of the panner according to longitude and latitude
 * @param order order number of the poi whose panner node should be updated
 * @param poiPosition position of the poi
 */
function updatePannerPosition(order, poiPosition) {
    if (userPosition && pannerNodes[order]) {
        const longitudeDifference = poiPosition[1] - userPosition[1];
        const latitudeDifference = userPosition[0] - poiPosition[0];
        pannerNodes[order].setPosition(longitudeDifference, 0, latitudeDifference);
    }
}

/**
 * update the label color of a poi in the poi list, e.g. green if poi has been found
 * @param poi which poi to update
 * @param label label of the poi to update
 */
function updatePOIColor(poi, label) {
    if (poi.active) {
        label.style.color = "blue";
    } else if (poi.found) {
        label.style.color = "green";
    } else {
        label.style.color = "red";
    }
}

/**
 * draws a random circle on the map. the poi is guaranteed to always be within the circle.
 * @param poi_order to which order number random corrdinates of circle should be mapped to
 * @param center coordinates of the poi, is the intiial center
 * @param poi_name poi name (shows when you click on circle when using map)
 * @returns the created circle with randomized center
 */
function drawCircle(poi_order, center, poi_name) {
    const randomizedCoordinates = getRandomizedCoordinates(center);
    const circle = L.circle(randomizedCoordinates, {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: CIRCLE_RADIUS
    }).addTo(map);
    circle.bindPopup(poi_name);
    randomCircleCenter[poi_order] = randomizedCoordinates;
    return circle;
}

/**
 * calculate random coordinates within a circle
 * @param center center of the circle, latitude and longitude
 * @returns random coordinates within the given circle, latitude and longitude
 */
function getRandomizedCoordinates(center) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * CIRCLE_RADIUS;

    const earthRadius = 6371000;    // radius of earth in meters
    const dLat = distance / earthRadius;
    const dLng = distance / (earthRadius * Math.cos(Math.PI * center[0] / 180));

    const newLat = center[0] + dLat * (180 / Math.PI) * Math.sin(angle);
    const newLng = center[1] + dLng * (180 / Math.PI) * Math.cos(angle);

    return [newLat, newLng];
}

/**
 * show the position of the user on the map by adding an user marker or if already created updating it
 * @param position where to draw the user marker, latitude and longitude
 */
function showPosition(position) {
    userPosition = [position.coords.latitude, position.coords.longitude];

    // if user marker already exists, only update position
    if (userMarker) {
        userMarker.setLatLng(userPosition);
        // else, draw user marker on map at current gps user position
    } else {
        userMarker = L.marker(userPosition).addTo(map).bindPopup('Aktueller Standort');
    }

    // adjusts the map so user marker and all circles are always seen (can be turned off in sidebar)
    adjustViewToIncludeAllCircles();
}

/**
 * adjusts the map so user marker and all circles are always seen (can be turned off in sidebar)
 */
function adjustViewToIncludeAllCircles() {

    // get all active circles
    const activeCircles = Object.values(poiCircles).filter(circle => map.hasLayer(circle));

    // if there are any active circles and setting to auto align map is turned on, adjust map
    if (activeCircles.length > 0 && sidebar.autoAlignMap) {

        // for every circle, extend bounds, i.e. furthest circle can be seen
        const bounds = L.latLngBounds(activeCircles.map(circle => circle.getLatLng()));
        activeCircles.forEach(circle => {
            bounds.extend(circle.getBounds());
        });

        // for user, extend bounds, i.e. user can be seen
        if (userMarker) {
            bounds.extend(userMarker.getLatLng());
        }

        // fit map to given bounds with little margin/padding
        map.fitBounds(bounds, {padding: [50, 50]});

        // else, if no circles are active or auto adjust setting is turned off, center to user
    } else if (userMarker && sidebar.autoAlignMap) {
        map.setView(userMarker.getLatLng(), 13);
    }
}

/**
 * periodcally check if user is very close to poi in order to trigger poi to be found
 * @param poi which poi to check
 * @param label label of the poi
 */
function checkUserInProximity(poi, label) {
    setInterval(() => {

        // if gps is available and poi is active, check if user is very close to poi
        if (userPosition && poi.active) {

            // calculate distance between user and poi
            const distance = getDistance(userPosition,
                [Number(`${poi.x_coordinate}`), Number(`${poi.y_coordinate}`)]);

            // if user is very close, trigger poi to be found and act accordingly, e.g. remove circle and stop audio
            if (distance <= PROXIMITY_RADIUS) {
                poi.found = true;
                poi.active = false;
                updatePOIColor(poi, label);
                map.removeLayer(poiCircles[poi.order]);
                audioElements[poi.order].pause();
                storage.saveProgress(poi);
                updateProgressBar();
                alert(`${poi.name} gefunden!`);
                if (orderDefined) {
                    activateNextUnfoundPoi();
                }
            }
        }
    }, 2000); // check every 2 seconds
}

/**
 * calculate distance between two given coordinates, latitude and longitude
 * @param coord1 first coordinate
 * @param coord2 second coordinate
 * @returns how many meters both coordinates are apart (direct line)
 */
function getDistance(coord1, coord2) {
    const lat1 = coord1[0];
    const lon1 = coord1[1];
    const lat2 = coord2[0];
    const lon2 = coord2[1];

    const R = 6371; // radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
