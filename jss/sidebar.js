import * as usecase from './usecase.js'
import * as messages from './messages.js'

// default values, always read when opening any usecase
export let autoAlignMap = true;     // if map should adjust view
export let loopInterval = 3;        // how many seconds till audio restarts


/**
 * open or close the sidebar
 */
export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.style.width === '250px') {
        sidebar.style.width = '0';
    } else {
        sidebar.style.width = '250px';
    }
}

/**
 * change loop interval, i.e. change how many seconds to wait till audio restarts
 */
export function setLoopInterval() {
    const audioInterval = document.getElementById('loopIntervalInput');
    if (audioInterval.value === '') {
        alert(messages.ALERT_NO_NUMBER);
    } else if (parseInt(audioInterval.value, 10) <= 0) {
        alert(messages.ALERT_INTERVAL_NOT_POSITIVE);
    } else {
        loopInterval = parseInt(audioInterval.value, 10);
    }
}

/**
 * toggle if map should adjust view to always fit in user marker and all circles
 */
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

/**
 * reset the progress of the user to a specific usecase and reload
 */
export function resetProgress() {
    if (confirm(messages.CONFIRM_RESET_PROGRESS)) {
        localStorage.removeItem(`usecase_${usecase.usecase_id}_foundPois`);
        location.reload();
    }
}

/**
 * delete listed recent usecases that show up when starting the application and reload
 */
export function deleteRecentUsecases() {
    if (confirm(messages.CONFIRM_DELETE_RECENT_USECASES)) {
        localStorage.removeItem('recent_usecases');
        location.reload();
    }
}

/**
 * leave usecase, i.e. show popup to choose usecase again
 */
export function leaveUsecase() {
    location.reload()
}
