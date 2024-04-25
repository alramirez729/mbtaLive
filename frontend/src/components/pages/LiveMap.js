import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import customMarkerIcon from '../images/Capture.JPG';
import blueLineMarkerIcon from '../images/blueLine.png';
import greenLineMarkerIcon from '../images/green_line.png';
import redLineMarkerIcon from '../images/redLine.png';
import orangeLineMarkerIcon from '../images/orangeLine.png';
import Modal from 'react-bootstrap/Modal';
import axios from 'axios';
import Alerts from './mbtaAlerts';
import Button from 'react-bootstrap/Button';
import getUserInfo from "../../utilities/decodeJwt";
import Form from 'react-bootstrap/Form';

function formatStatus(status) {
  return status.toLowerCase().replace(/_/g, ' ');
}

function LiveMap() {
  const url = process.env.REACT_APP_BACKEND_SERVER_URI;
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [stops, setStops] = useState({});
  const [description, setDescription] = useState({});
  const [map, setMap] = useState(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [notes, setNotes] = useState({});
  const [user, setUser] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({});
  const [newNote, setNewNote] = useState({ userId: "", stationId: {} });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  

  useEffect(() => {
    const userInfo = getUserInfo() || {username : "Guest"}
    console.log(userInfo.username)
    setUser(userInfo.username)
    console.log(user)
  }, []); 
  
  
  const openModal = (content) => {
    setModalContent(content);
    setIsEditMode(false); // Reset edit mode
    setShowModal(true);
  };
  
  const handleEdit = () => {
    setEditedNote(modalContent.existingNote); // Load the existing note into the edit field    
    setIsEditMode(true); // Switch to edit mode
  };

  const postNote = async (userId, stationId) => {
    try{
      await axios.post(`${url}/note`, {userId: userId, stationId: stationId})
    }
    catch (error) {
      console.error("Error posting note:", error);
    }
  };


  const handleFormSubmit = (e) => {
    e.preventDefault();
    const updatedNotes = {[modalContent.stationName]: newNote };    
    setNotes(user); // Update the local notes state
    postNote(user, updatedNotes)    
    fetchNotes(user)
    stationMarkerGenerator()
    setIsEditMode(false); // Exit edit mode
    setShowModal(false); // Close the modal
  };

  const fetchNotes = async (username) => {
    try {
      let response = await axios.get(`${url}/note/byId/?userId=${username}`);
      if (!response.data.stationId) {
        response.data.stationId = {}
      }
      setNotes(response.data.stationId);      
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };


  const fetchStations = async () => {
    try {

      const stationResult = await fetch("https://api-v3.mbta.com/stops?filter[route_type]=1");

      const stationData = await stationResult.json();
      setStations(stationData.data.map((station) => ({
        name: station.attributes.name,
        longitude: station.attributes.longitude,
        latitude: station.attributes.latitude,
        description: station.attributes.description
      })));

    } catch (error) {
      console.error('Error fetching data', error);
    }
  }

  const initializeNotes = async () => {      
    if (user) {
      await fetchNotes(user);
    } else {
      console.error("User information is not available.");
    }
  };

  
  const stationMarkerGenerator = () => {    
    stations.forEach((station) => {
      const { latitude, longitude, name, description } = station || {};
      if (latitude && longitude) {
        const stationName = name || 'Unknown Stop';
        const stationDescription = description || 'No Description';
        const existingNote = notes[stationName] || '';

        const stationMarker = L.marker([latitude, longitude], {
          icon: L.icon({ iconUrl: customMarkerIcon, iconSize: [35, 35] }),
        });

        const openPopupModal = () => {
          openModal({
            stationName,
            stationDescription,
            existingNote,
          });
        };
        
        var noteButton = ''
        //console.log(user)
        if (user == "Guest") {
          noteButton = ''          

        }
        else {
          noteButton ='<button id="openModal-${stationName}" class="open-modal">Add/Edit Note</button>'
        }
        //console.log(noteButton)
        
        
        stationMarker.addTo(map).bindPopup(`
          <strong>${stationName}</strong><br/>
          Description: ${stationDescription.replace(`${stationName} - `, '')}<br/>
          Note: ${existingNote || 'No Note'}<br/>
          ${noteButton}
        `);

        stationMarker.on('popupopen', () => {
          const openModalButton = document.getElementById(`openModal-${stationName}`);
          openModalButton?.addEventListener('click', openPopupModal);
        });

        stationMarker.on('popupclose', () => {
          const openModalButton = document.getElementById(`openModal-${stationName}`);
          openModalButton?.removeEventListener('click', openPopupModal);
        });
      }
    });
  } 

  useEffect(() => {
    initializeNotes();
    

    const leafletMap = L.map('map').setView([42.3601, -71.0589], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap);

    setMap(leafletMap);
    
    const fetchData = async () => {
      try {
        const vehicleResult = await axios.get('https://api-v3.mbta.com/vehicles?filter%5Broute_type%5D=1');
        setVehicles(vehicleResult.data.data);

        const stopResult = await axios.get('https://api-v3.mbta.com/stops?filter%5Broute_type%5D=1');
        const stopsData = await stopResult.data.data.reduce((acc, stop) => {
          acc[stop.id] = stop.attributes.name;
          return acc;
        }, {});
        setStops(stopsData);

        const descriptionResult = await axios.get('https://api-v3.mbta.com/stops?filter%5Broute_type%5D=1');
        const descriptionData = descriptionResult.data.data.reduce((acc, stop) => {
          acc[stop.id] = stop.attributes.name;
          return acc;
        }, {});
        setDescription(descriptionData);

        fetchStations()

      } catch (error) {
        console.error('Error fetching data', error);
      }
    };    

    fetchData();

    const refreshInterval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (map) {
      map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      stationMarkerGenerator()

      vehicles.forEach((vehicle) => {
        const { latitude, longitude, current_status } = vehicle.attributes || {};
        if (latitude && longitude && vehicle.relationships.stop && vehicle.relationships.stop.data) {
          const stopId = vehicle.relationships.stop.data.id;
          const stopName = stops[stopId] || 'Unknown Stop';

          let markerIcon = customMarkerIcon;
          let markerSize = [32, 32];
          const routeId = vehicle.relationships.route.data.id;
          switch (routeId) {
            case "Blue":
              markerIcon = blueLineMarkerIcon;
              break;
            case "Red":
              markerIcon = redLineMarkerIcon;
              break;
            case "Green":
              markerIcon = greenLineMarkerIcon;
              break;
            case "Orange":
              markerIcon = orangeLineMarkerIcon;
              break;
          }

          const formattedStatus = formatStatus(current_status);
          const customMarker = L.marker([latitude, longitude], {
            icon: L.icon({
              iconUrl: markerIcon,
              iconSize: markerSize
            })
          });

          customMarker.addTo(map).bindPopup(`${routeId} Line is<br/>Currently ${formattedStatus}<br/>${stopName}`);
        }
      });

    }

  }, [map, vehicles, stops, description, newNote]);
  const toggleAlerts = () => setShowAlerts(!showAlerts);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      <div id="map" style={{ height: '100%', width: '100%' }}></div>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000
      }}>
        <Button onClick={toggleAlerts} style={{ marginBottom: '10px' }}>Toggle Alerts</Button>
      </div>
      <div>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Station Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <strong>Station Name:</strong> {modalContent.stationName} <br/>
          <strong>Description:</strong> {modalContent.stationDescription} <br/>
          {isEditMode ? (
            <Form onSubmit={handleFormSubmit}>
              <Form.Group>
                <Form.Label>Edit Note</Form.Label>
                <Form.Control
                  type="text"
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  placeholder="Edit your note"
                />
              </Form.Group>
              <Button variant="primary" type="submit">Submit</Button>
            </Form>
          ) : (
            <>
              {modalContent.existingNote ? (
                <div>
                  <strong>Note:</strong> {modalContent.existingNote} <br/>
                  <Button onClick={handleEdit}>Edit Note</Button>
                </div>
              ) : (
                <Form onSubmit={handleFormSubmit}>
              <Form.Group>
                <Form.Label>New Note</Form.Label>
                <Form.Control
                  type="text"                  
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter a new note"
                />
              </Form.Group>
              <Button variant="primary" type="submit">Submit</Button>
            </Form>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          {isEditMode ? null : <Button variant="primary">OK</Button>}
        </Modal.Footer>
      </Modal>
      </div>
      {showAlerts && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          maxHeight: '90%',
          width: '400px',
          overflowY: 'auto',
          border: '5px solid grey',
          borderRadius: '10px',
          backgroundColor: 'white',
          zIndex: 1000
        }}>
          <Button onClick={toggleAlerts} style={{ width: '100%' }}>Toggle Alerts</Button>
          <Alerts />
        </div>      
      )}
    </div>
  );
}

export default LiveMap;
