import React from 'react';
import logo from './logo.svg';
import Main from './Main.js'
import useVH from "react-viewport-height";
import './App.css';

function App() {
  useVH();
  return (
    <Main/>
  );
}

export default App;
