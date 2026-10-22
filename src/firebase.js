// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAmGtIEVyD7-8ieM5oBkGJG5XOzFmfX4j8",
  authDomain: "parental-dev-a0272.firebaseapp.com",
  projectId: "parental-dev-a0272",
  storageBucket: "parental-dev-a0272.firebasestorage.app",
  messagingSenderId: "924556816940",
  appId: "1:924556816940:web:9d5036aba94b52ae351789"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


