import * as usecase from './Usecase.js'


/**
 * load the progress of a specific poi by searching for it in browser local storage
 * @param poi which poi to search for
 */
export function loadProgress(poi) {
    const foundPois = JSON.parse(localStorage.getItem(`usecase_${usecase.usecase_id}_foundPois`)) || [];
    if (foundPois.includes(poi.id)) {
        poi.found = true;
    }
}

/**
 * save the progress of a specific poi by writing it in browser local storage
 * @param poi which poi to save
 */
export function saveProgress(poi) {
    let foundPois = JSON.parse(localStorage.getItem(`usecase_${usecase.usecase_id}_foundPois`)) || [];
    if (poi.found) {
        if (!foundPois.includes(poi.id)) {
            foundPois.push(poi.id);
        }
    } else {
        foundPois = foundPois.filter(id => id !== poi.id);
    }
    localStorage.setItem(`usecase_${usecase.usecase_id}_foundPois`, JSON.stringify(foundPois));
}

/**
 * lists the recently used usecases when asking for an usecase id
 */
export function showRecentUsecases() {
    const recentUseCases = JSON.parse(localStorage.getItem('recent_usecases')) || [];
    const recentUseCasesList = document.getElementById('recentUseCasesList');

    recentUseCasesList.innerHTML = '';

    if (recentUseCases.length === 0) {
        recentUseCasesList.innerHTML = '<li>Keine vorhanden</li>';
    } else {
        recentUseCases.forEach(id => {
            const li = document.createElement('li');
            li.textContent = id;
            li.addEventListener('click', () => {
                document.getElementById('useCaseIdInput').value = id;
            });
            recentUseCasesList.appendChild(li);
        });
    }
}

/**
 * update the recently used usecases list to include the currently used usecase
 * @param usecase_id which usecaseid to add to the list
 */
export function updateRecentUsecases(usecase_id) {
    let recentUseCases = JSON.parse(localStorage.getItem('recent_usecases')) || [];
    recentUseCases = recentUseCases.filter(id => id !== usecase_id);
    recentUseCases.unshift(usecase_id);
    if (recentUseCases.length > 5) {
        recentUseCases.pop();
    }
    localStorage.setItem('recent_usecases', JSON.stringify(recentUseCases));
}
