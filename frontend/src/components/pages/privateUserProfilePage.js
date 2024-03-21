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
      
      const response = await axios.put(`http://localhost:8081/favorite/editFavorite/${id}`, { 
        line: editFormData.line, 
        station: editFormData.station 
      });
      
      setFavorites(favorites.map(fav => fav._id === id ? response.data.favorite : fav));
      setEditingId(null);
      
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  };


  const handleLogout = async () => {
    localStorage.clear();
    navigate("/");
  };

  if (!user) return <div><h4>Log in to view this page.</h4></div>;

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Welcome back {user && user.username}</h1>
        <h2>Favorites</h2>
        <ul>
          {favorites.map((favorite) => (
            <li key={favorite._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              {editingId === favorite._id ? (
                <div style={{ flex: 1 }}>
                  <Form.Control
                    type="text"
                    name="line"
                    value={editFormData.line}
                    onChange={handleEditChange}
                    style={{ width: "auto", display: "inline-block", marginRight: '10px' }}
                  />
                  <Form.Control
                    type="text"
                    name="station"
                    value={editFormData.station}
                    onChange={handleEditChange}
                    style={{ width: "auto", display: "inline-block", marginRight: '10px' }}
                  />
                  <Button onClick={() => handleEditSave(favorite._id)}>Save</Button>
                </div>
              ) : (
                <>
                  <span>{favorite.line} Line - {favorite.station}</span>
                  <Button onClick={() => handleEdit(favorite)}>Edit</Button>
                </>
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
