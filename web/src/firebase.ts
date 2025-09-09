import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8",
  authDomain: "smartclassroom-af237.firebaseapp.com",
  projectId: "smartclassroom-af237",
  storageBucket: "smartclassroom-af237.firebasestorage.app",
  messagingSenderId: "172327783054",
  appId: "1:172327783054:web:b9bdddfb213ea0dd48d7df",
  measurementId: "G-EHFTC93M2F"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Connect to emulator in development
if (import.meta.env.DEV) {
  try {
    connectDatabaseEmulator(database, "localhost", 9000);
    console.log("🔥 Connected to Firebase Emulator");
  } catch (error) {
    console.warn("Firebase emulator connection failed:", error);
  }
}