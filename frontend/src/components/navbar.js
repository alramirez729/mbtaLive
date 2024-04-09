import React, { useEffect, useState } from "react";
import getUserInfo from '../utilities/decodeJwt';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import ReactNavbar from 'react-bootstrap/Navbar';

export default function Navbar() {
  const [user, setUser] = useState({})

  useEffect(() => {
    setUser(getUserInfo())
  }, [])

  const customStyle = `
    .navbar-custom {
      background-color: orange !important;
    }
  `;

  return (
    <>
      <style>
        {customStyle}
      </style>
      <ReactNavbar className="navbar-custom" variant="light">
        <Container>
          <Nav className="me-auto">
            <Nav.Link href="/LiveMap">Home</Nav.Link>
            <Nav.Link href="/privateUserProfile">Profile</Nav.Link>
            <Nav.Link href="/Stop">Stop</Nav.Link>
            <Nav.Link href="/notesPage">Notes</Nav.Link>
            <Nav.Link href="/highlights">Highlights</Nav.Link>
          </Nav>
          <Nav className="ml-auto">
            <Nav.Link href="/registerPage">Register</Nav.Link>
            <Nav.Link href="/loginPage">Login</Nav.Link>
          </Nav>
        </Container>
      </ReactNavbar>
    </>
  );
}
