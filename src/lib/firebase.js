// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "accessguard-hnzrd",
  "appId": "1:241317652095:web:60cf3637ae2b50db85414a",
  "storageBucket": "accessguard-hnzrd.firebasestorage.app",
  "apiKey": "AIzaSyCrTk09il9LyR0iIyQ_PMbQ62xC8tqJ0Xs",
  "authDomain": "accessguard-hnzrd.firebaseapp.com",
  "messagingSenderId": "241317652095"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');


export { app, auth, googleProvider };
