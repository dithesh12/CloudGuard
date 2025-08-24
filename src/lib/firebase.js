// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// IMPORTANT: Please replace this with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
// A try-catch block is used to prevent the app from crashing if the config is invalid.
let app;
let auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.error("Invalid Firebase configuration. Please update src/lib/firebase.js with your project's credentials.", error);
  // Provide dummy objects to prevent crashes in other parts of the app
  app = {};
  auth = {};
}

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');


export { app, auth, googleProvider };