const firebaseConfig = {
    apiKey: "AIzaSyA_wG604ZP9Wo_bOicAUp2FfAtE9oI6PoQ",
    authDomain: "dnd-character-tracker-9e583.firebaseapp.com",
    projectId: "dnd-character-tracker-9e583",
    storageBucket: "dnd-character-tracker-9e583.firebasestorage.app",
    messagingSenderId: "762949480554",
    appId: "1:762949480554:web:4c633f9646995e734c9a13"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();