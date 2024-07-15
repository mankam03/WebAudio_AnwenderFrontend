import * as storage from './Storage.js';
import * as usecase from './Usecase.js'

export const SERVER_URL = "../api";
// export const SERVER_URL = "http://mankam.ddns.net:4000"

export let usecase_id;
export let pois = [];
export let audioElements = [];
export let audioContexts = [];
export let pannerNodes = [];
export let map;
export let userPosition = null;
export let userMarker = null;
export let poiCircles = {};
export let orderDefined;
export let randomCircleCenter = [];
export let audioIntervals = [];


document.addEventListener('DOMContentLoaded', () => {
    showPopup();
});

function showPopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('useCaseIdPopup');
    overlay.style.display = 'block';
    popup.style.display = 'block';

    const storedUseCaseId = localStorage.getItem('current_usecase_id');
    if (storedUseCaseId) {
        const useCaseIdInput = document.getElementById('useCaseIdInput');
        useCaseIdInput.value = storedUseCaseId;
    }

    storage.showRecentUsecases();

    const progressContainer = document.getElementById('progressContainer');
    progressContainer.style.display = 'none';
}

function submitUseCaseId() {
    const progressContainer = document.getElementById('progressContainer');
    progressContainer.style.display = 'none';

    usecase_id = document.getElementById('useCaseIdInput').value;

    if (usecase_id === '') {
        alert("Keine Anwendungszwecknummer angegeben");
        showPopup();
        return;
    }

    fetch(`${SERVER_URL}/usecases/${usecase_id}`)
        .then(response => response.json())
        .then(usecases => {
            if (usecases.length === 0) {
                alert("Ungültige Anwendungszwecknummer");
                showPopup();
                return;
            }

            usecases.forEach(usecase => {
                const titelAnwendungszweckElement =
                    document.getElementById("titelAnwendungszweck");
                titelAnwendungszweckElement.innerHTML = `${usecase.titel} (#${usecase.id})`;

                const beschreibungAnwendungszweckElement =
                    document.getElementById("beschreibungAnwendungszweck");
                beschreibungAnwendungszweckElement.innerHTML = usecase.beschreibung;

                orderDefined = usecase.fixed_order === 1;
            });

            localStorage.setItem('current_usecase_id', usecase_id);
            storage.updateRecentUsecases(usecase_id);
            usecase.getLocation();
            usecase.initializeCentralMap();
            usecase.loadPois();

            const progressContainer = document.getElementById('progressContainer');
            progressContainer.style.display = 'block';

            const sidebarButton = document.getElementById('openSidebarButton');
            sidebarButton.style.display = 'block';

        })
        .catch(error => {
            console.error('Error fetching UseCase:', error);
        });

    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('useCaseIdPopup');
    overlay.style.display = 'none';
    popup.style.display = 'none';
}

// Global verfügbar machen
window.submitUseCaseId = submitUseCaseId;

// Hilfsmethoden, damit Module funktionieren
export function setMap(map) {
    this.map = map;
}