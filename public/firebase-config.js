const firebaseConfig = {
    apiKey: "***REMOVED***",
    authDomain: "it-asset-system-2091b.firebaseapp.com",
    projectId: "it-asset-system-2091b",
    storageBucket: "it-asset-system-2091b.firebasestorage.app",
    messagingSenderId: "788162777362",
    appId: "1:788162777362:web:29481f4c345dae382063cb",
    measurementId: "G-VNHV6QEDWP"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
window.db = firebase.firestore();
