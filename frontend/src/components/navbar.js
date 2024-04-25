import React, { useState, useEffect } from "react";
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import ReactNavbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useNavigate } from 'react-router-dom';
import getUserInfo from "../utilities/decodeJwt"; // Adjust the path based on the actual location within src/
export default function Navbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  useEffect(() => {
    const userInfo = getUserInfo();  // Decode user info from JWT stored in local storage or cookies
    setUser(userInfo);
  }, []);

  const handleLogout = () => {
    localStorage.clear();  // Clear user session storage or cookies
    setUser(null);  // Update local state to reflect logout
    navigate("/");
  };

  const customStyle = `
  .navbar-custom {
    background-color: orange !important;
    z-index: 1050; // Bootstrap's default z-index for navbar is 1000, set higher to ensure visibility
  }
`;

  return (
    <>
      <style>{customStyle}</style>
      <ReactNavbar className="navbar-custom" variant="light">
        <Container>
          <Nav className="me-auto">
            <Nav.Link href="/LiveMap">Home</Nav.Link>
            <Nav.Link href="/notesPage">Notes</Nav.Link>
          </Nav>
          {user ? (
            <Nav className="ml-auto">
              <NavDropdown title="Profile" id="profile-nav-dropdown">
                <NavDropdown.Item href="/privateUserProfile">My Profile</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : (
            <Nav className="ml-auto">
              <Nav.Link href="/registerPage">Register</Nav.Link>
              <Nav.Link href="/loginPage">Login</Nav.Link>
            </Nav>
          )}
        </Container>
      </ReactNavbar>
    </>
  );
}
