import * as usecase from './Usecase.js'

export let autoAlignMap = true;
export let loopInterval = 3;       // in seconds, default value


export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.style.width === '250px') {
        sidebar.style.width = '0';
    } else {
        sidebar.style.width = '250px';
    }
}

export function setLoopInterval() {
    const audioInterval = document.getElementById('loopIntervalInput');
    if (audioInterval.value === '') {
        alert("Es wurde keine Zahl eingegeben.")
    } else if (parseInt(audioInterval.value, 10) <= 0) {
        alert("Das Intervall muss positiv sein.")
    } else {
        loopInterval = parseInt(audioInterval.value, 10);
    }
}

export function toggleAutoAlignMap() {
    autoAlignMap = !autoAlignMap;
    const button = document.querySelector('#sidebar a:nth-child(2)');

    if (autoAlignMap) {
        button.style.color = 'lightgreen';
        button.textContent = 'Karte automatisch bewegen';
    } else {
        button.style.color = 'lightcoral';
        button.textContent = 'Karte automatisch bewegen';
    }
}

export function resetProgress() {
    if (confirm("Der Fortschritt für diesen Anwendungszweck geht für immer verloren. Trotzdem zurücksetzen?")) {
        localStorage.removeItem(`usecase_${usecase.usecase_id}_foundPois`);
        location.reload();
    }
}

export function deleteRecentUsecases() {
    if (confirm("Die zuletzt aufgerufen Anwendungszwecke werden aus der Liste endgültig entfernt. " +
        "Trotzdem löschen?")) {
        localStorage.removeItem('recent_usecases');
        location.reload();
    }
}

export function leaveUsecase() {
    location.reload()
}
