import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import ReactNavbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.clear();
    navigate("/");
  };

  const customStyle = `
    .navbar-custom {
      background-color: orange !important;
    }
  `;

  return (
    <>
      <style>{customStyle}</style>
      <ReactNavbar className="navbar-custom" variant="light">
        <Container>
          <Nav className="me-auto">
            <Nav.Link href="/LiveMap">Home</Nav.Link>
            <NavDropdown title="Profile" id="profile-nav-dropdown">
              <NavDropdown.Item href="/privateUserProfile">My Profile</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item href="/loginPage">Login</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
            </NavDropdown>
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
