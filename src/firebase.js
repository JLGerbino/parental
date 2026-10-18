// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgbRYrZa6Wsf89ElbTZbO4QSlEI3f_r9c",
  authDomain: "app-gastos-e2598.firebaseapp.com",
  projectId: "app-gastos-e2598",
  storageBucket: "app-gastos-e2598.firebasestorage.app",
  messagingSenderId: "655404513154",
  appId: "1:655404513154:web:10d7ca0c7f41429cb4019b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);



