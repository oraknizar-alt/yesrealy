import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcuvYlUh-DSDS_7Ljmxmf26GdVu3pNB7c",
  authDomain: "fir-958e1.firebaseapp.com",
  projectId: "fir-958e1",
  storageBucket: "fir-958e1.firebasestorage.app",
  messagingSenderId: "295314921043",
  appId: "1:295314921043:web:89279865c1a72708d5d8a6",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
