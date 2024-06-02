// TODO HIER SPÄTER JEWEILS DATENABFRAGE
document.addEventListener('DOMContentLoaded', (event) => {

    getAnwendungszweck();
    getLocation();
    watchOrientation()

    pois = getPois();
    pois.forEach(poi => {
        addPOIToList(poi, true);
    })

    updateProgressBar()
});

function getAnwendungszweck() {
    const titelAnwendungszweckElement = document.getElementById("titelAnwendungszweck");
    titelAnwendungszweckElement.innerHTML = "Entdecke Saarbrücken";

    const beschreibungAnwendungszweckElement = document.getElementById("beschreibungAnwendungszweck");
    beschreibungAnwendungszweckElement.innerHTML = "Herzlich Willkommen in Saarbrücken! " +
        "Entdecken Sie mit dieser Liste die schönsten Flecken, die Saarbrücken zu bieten hat.<br>" +
        "Ihr Anpsrechpartner: 0173-727328<br>" +
        "Ansonsten wünschen wir Ihnen viel Spaß!"
}

// ACTIVE NICHT IN DATENBANK, ABER ZUSÄTZLICH IWIE ADDEN?
function getPois() {
    return [{number: 1, name: "Saarbrücker Rathaus", active: false, found: true},
        {number: 2, name: "Saarbrücker Hauptbahnhof", active: false, found: false},
        {number: 3, name: "Landwehrplatz", active: false, found:false}
    ]
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
        });
    } else {
        label.innerHTML = `${poi.number}&emsp;${poi.name}`;
    }

    updatePOIColor(poi, label);
    li.appendChild(label);
    poiList.appendChild(li);
}


function updatePOIColor(poi, label) {
    if (poi.active) {
        label.style.color = "blue"
    } else if (poi.found) {
        label.style.color = "green"
    } else {
        label.style.color = "red"
    }
}

const gpsElement = document.getElementById("gps")

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        gpsElement.innerHTML = "GPS-Daten können in diesem Browser nicht gelesen werden.";
    }
}

function showPosition(position) {
    gpsElement.innerHTML="Latitude: " + position.coords.latitude +
        "<br>Longitude: " + position.coords.longitude;
}

function watchOrientation() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
    } else {
        const orientationElement = document.getElementById('orientation');
        orientationElement.innerHTML = "DeviceOrientation API wird von diesem Gerät nicht unterstützt.";
    }
}

function handleOrientation(event) {
    const orientationElement = document.getElementById('orientation');
    const alpha = event.alpha; // Rotation um die Z-Achse (0 bis 360 Grad)
    const beta = event.beta; // Neigung um die X-Achse (-180 bis 180 Grad)
    const gamma = event.gamma; // Neigung um die Y-Achse (-90 bis 90 Grad)

    orientationElement.innerHTML = "Alpha: " + alpha +
        "<br>Beta: " + beta +
        "<br>Gamma: " + gamma;
}

function updateProgressBar() {
    const totalPois = pois.length;
    const visitedPois = pois.filter(poi => poi.found).length;
    const progress = (visitedPois / totalPois) * 100;

    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
}
