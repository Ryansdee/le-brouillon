// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"


const firebaseConfig = {
  apiKey: "AIzaSyCFukRzAYcXpGXYI0kx1XOF3b5yuCrXQU8",
  authDomain: "le-brouillon.firebaseapp.com",
  projectId: "le-brouillon",
  storageBucket: "le-brouillon.firebasestorage.app",
  messagingSenderId: "113707264820",
  appId: "1:113707264820:web:423bda517e2c3f347fd361",
  measurementId: "G-SW3PHC5QMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
