import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useNavigate } from "react-router-dom";
import getUserInfo from "../../utilities/decodeJwt";

const PrivateUserProfile = () => {
  const [user, setUser] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ line: "", station: "" });
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getUserInfo());
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get("http://localhost:8081/favorite/getAll");
      setFavorites(response.data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const handleEdit = (favorite) => {
    setEditingId(favorite._id);
    setEditFormData({ line: favorite.line, station: favorite.station });
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditSave = async (id) => {
    try {
      await axios.put(`http://localhost:8081/favorite/editFavorite/${id}`, editFormData);
      const newFavorites = favorites.map((fav) => (fav._id === id ? { ...fav, ...editFormData } : fav));
      setFavorites(newFavorites);
      setEditingId(null); // Exit editing mode
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8081/favorite/deleteFavorite/${id}`);
      // Update state to reflect the deletion
      setFavorites(favorites.filter(fav => fav._id !== id));
    } catch (error) {
      console.error("Error deleting favorite:", error);
      // Handle error (e.g., display an error message)
    }
  };

  const handleLogout = async () => {
    localStorage.clear();
    navigate("/");
  };

  if (!user) return <div><h4>Log in to view this page.</h4></div>;

  const allowedLines = ["Blue", "Red", "Green", "Orange"];

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Welcome back {user && user.username}</h1>
        <h2>Favorites</h2>
        <ul>
          {favorites.map((favorite) => (
            <li key={favorite._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              {editingId === favorite._id ? (
                <>
                  <Form
                    name="line"
                    value={editFormData.line}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  >
                    <option value="">Select Line</option>
                    {allowedLines.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </Form>
                  <Form.Control
                    type="text"
                    name="station"
                    value={editFormData.station}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  />
                  <Button variant="success" onClick={() => handleEditSave(favorite._id)} style={{ marginRight: '10px' }}>Save</Button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{favorite.line} Line - {favorite.station}</span>
                  <Button onClick={() => handleEdit(favorite)} style={{ marginRight: '10px' }}>Edit</Button>
                  <Button variant="danger" onClick={() => handleDelete(favorite._id)}>Delete</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <Button onClick={handleLogout}>Log Out</Button>
      </div>
    </div>
  );
};

export default PrivateUserProfile;