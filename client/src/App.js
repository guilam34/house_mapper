import React, { Component } from 'react';
import { Map, GoogleApiWrapper, InfoWindow, Marker } from 'google-maps-react';

import Creds from './creds'

const mapStyles = {
  width: '100%',
  height: '100%'
};

export class MapContainer extends Component {
  state = {
    showingInfoWindow: false,  // Hides or shows the InfoWindow
    activeMarker: {},          // Shows the active marker upon click
    selectedPlace: {},          // Shows the InfoWindow to the selected place upon a marker
    data: []
  };

  componentDidMount() {
    fetch("/api")
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        this.setState(prevState => ({ ...prevState, data: data}))});
  }

  onMarkerClick = (props, marker, e) =>
    this.setState({
      selectedPlace: props,
      activeMarker: marker,
      showingInfoWindow: true
    });

  onClose = props => {
    if (this.state.showingInfoWindow) {
      this.setState({
        showingInfoWindow: false,
        activeMarker: null
      });
    }
  };

  render() {
    return (
      <Map
        google={this.props.google}
        zoom={11}
        onClick={this.onClose}
        style={mapStyles}
        initialCenter={
          {
            lat: 33.98888185556107, 
            lng: -118.27449034138209
          }
        }
        >
          {this.state.data.map(
            loc =>
              <Marker
                key={loc["mls_id"]}
                onClick={this.onMarkerClick}
                position={loc["coordinates"]}
                icon={loc.type === 'SFR' 
                  ? "http://maps.google.com/mapfiles/ms/icons/red.png"
                  : "http://maps.google.com/mapfiles/ms/icons/blue.png"}
                {...loc}
              />)}
              <InfoWindow
                marker={this.state.activeMarker}
                visible={this.state.showingInfoWindow}
                onClose={this.onClose}
              >
                <div>
                  <h4>{this.state.selectedPlace.addr}</h4>
                  <p><b>Price</b>: {this.state.selectedPlace.price}</p>
                  <p><b>Type</b>: {this.state.selectedPlace.type}</p>
                  <p><b>Beds/Baths</b>: {this.state.selectedPlace.bed_baths}</p>
                  <p><b>Sq Ft.</b>: {this.state.selectedPlace.sqft}</p>
                  <p><b>Year</b>: {this.state.selectedPlace.year_built}</p>
                  <p><b>MLS ID</b>: 
                    <a href={this.state.selectedPlace.link}  target='_blank'>
                      {this.state.selectedPlace.mls_id}</a>
                  </p>
                </div>
              </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: Creds["key"]
})(MapContainer);

