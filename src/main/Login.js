// Event-Listener, der initial über Popup fragt, ob man sich anmelden will
document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('loginPopup').style.display = 'block';
});

// Event-Listener für den Anmeldeprozess
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    // TODO HIER DATENBANKABFRAGE, OB KORREKT
    console.log('Login:', {username, password});
    // TODO WENN JA, ALLE POPUPS SCHLIEßEN
    closeAllPopUps();
});

// Event-Listener für den Registrierprozess
document.getElementById('registerForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert("Passwörter stimmen nicht überein.");
    } else {
        // TODO HIER DATENBANKABFRAGE, OB NAME NICHT SCHON VERGEBEN UND PASSWORT "OKAY"
        console.log('Register:', {username, password, confirmPassword});
        // TODO WENN JA, ALLE POPUPS SCHLIEßEN
        closeAllPopUps();
    }
});

/**
 * Schliesst alle Popups, sodass man das Hauptfenster
 * aufrufen kann, ohne sich angemeldet zu haben.
 */
function continueAsGuest() {
    closeAllPopUps(false);
}

/**
 * Zeigt das Login-Popup.
 */
function showLoginForm() {
    closeAllPopUps(true);
    document.getElementById('authPopup').style.display = 'block';
}

/**
 * Zeigt das Register-Popup.
 */
function showRegisterForm() {
    closeAllPopUps(true);
    document.getElementById('registerPopup').style.display = 'block';
}

/**
 * Zeigt das Initial-Popup.
 */
function showInitialPopup() {
    closeAllPopUps(true);
    document.getElementById('loginPopup').style.display = 'block';
}

/**
 * Schliesst alle Popups, die am Anfang aufploppen
 * @param dimmBackground Ob der Hintergrund weiterhin leicht abgedunkelt sein soll
 */
function closeAllPopUps(dimmBackground) {
    if (!dimmBackground) {
        document.getElementById('overlay').style.display = 'none';
    }
    document.getElementById('loginPopup').style.display = 'none';
    document.getElementById('registerPopup').style.display = 'none';
    document.getElementById('authPopup').style.display = 'none';
}
