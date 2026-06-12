import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Config pubblica della web app (sicura da committare per web client).
const firebaseConfig = {
  apiKey: 'AIzaSyAdqJjsdThWbjMpagEBiyXM7tgWqLMHhbg',
  authDomain: 'cantera-noi3-43340.firebaseapp.com',
  databaseURL: 'https://cantera-noi3-43340-default-rtdb.firebaseio.com',
  projectId: 'cantera-noi3-43340',
  storageBucket: 'cantera-noi3-43340.firebasestorage.app',
  messagingSenderId: '253269237641',
  appId: '1:253269237641:web:d49098931ca92154504b58',
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
