// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKVbrMrTCgLmYwKIWWdgcz3r4qxdvSbpY",
  authDomain: "pilgrim-itinerary-odisha.firebaseapp.com",
  projectId: "pilgrim-itinerary-odisha",
  storageBucket: "pilgrim-itinerary-odisha.firebasestorage.app",
  messagingSenderId: "846051489683",
  appId: "1:846051489683:web:579dfd8e8c7ddb68611a66",
  measurementId: "G-M68RHHJMBT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);