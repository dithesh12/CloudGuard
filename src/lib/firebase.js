// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCrTk09il9LyR0iIyQ_PMbQ62xC8tqJ0Xs",
  authDomain: "accessguard-hnzrd.firebaseapp.com",
  projectId: "accessguard-hnzrd",
  storageBucket: "accessguard-hnzrd.firebasestorage.app",
  messagingSenderId: "241317652095",
  appId: "1:241317652095:web:60cf3637ae2b50db85414a"
};

// This is your OAuth 2.0 Client ID for the web application
export const OAUTH_CLIENT_ID = "241317652095-uus7cbiu45jfi2ll64ilb39vqsqjhg73.apps.googleusercontent.com";
export const API_KEY = firebaseConfig.apiKey;


// Initialize Firebase
// A try-catch block is used to prevent the app from crashing if the config is invalid.
let app;
let auth;
let db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Invalid Firebase configuration. Please update src/lib/firebase.js with your project's credentials.", error);
  // Provide dummy objects to prevent crashes in other parts of the app
  app = {};
  auth = {};
  db = {};
}

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');


export { app, auth, db, googleProvider };
