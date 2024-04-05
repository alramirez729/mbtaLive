import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter } from "react-router-dom";

const container = document.getElementById("root");
const root = createRoot(container); // Create a root.

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
