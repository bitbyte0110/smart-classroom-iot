import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8",
  authDomain: "smartclassroom-af237.firebaseapp.com",
  databaseURL: "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartclassroom-af237",
  storageBucket: "smartclassroom-af237.firebasestorage.app",
  messagingSenderId: "172327783054",
  appId: "1:172327783054:web:b9bdddfb213ea0dd48d7df",
  measurementId: "G-EHFTC93M2F"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Connect to real Firebase (for production with real hardware)
console.log("🔥 Connected to Real Firebase Database");
console.log("🎯 Ready for live ESP32 + AI data!");