// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrTk09il9LyR0iIyQ_PMbQ62xC8tqJ0Xs",
  authDomain: "accessguard-hnzrd.firebaseapp.com",
  projectId: "accessguard-hnzrd",
  storageBucket: "accessguard-hnzrd.firebasestorage.app",
  messagingSenderId: "241317652095",
  appId: "1:241317652095:web:60cf3637ae2b50db85414a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
