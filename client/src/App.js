import React, { Component } from 'react';
import { Map, GoogleApiWrapper, InfoWindow, Marker } from 'google-maps-react';
import './App.css'

import Creds from './creds'

const housingTypes = ['All', 'Condos', 'Houses', 'Townhomes']

const mapStyles = {
  width: '100%',
  height: '100%'
};

export class MapContainer extends Component {
  state = {
    showingInfoWindow: false,  // Hides or shows the InfoWindow
    activeMarker: {},          // Shows the active marker upon click
    selectedPlace: {},          // Shows the InfoWindow to the selected place upon a marker
    data: [],
    filters: {
      housingTypes: ['All'],
      price: {
        min: 0,
        max: 99999999
      },
      sqft: {
        min: 0,
        max: 10000
      },
      beds: {
        min: 0
      },
      baths: {
        min: 0
      }
    }
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

  onHousingTypeChange = (name) => {
    var newHousingTypeState = JSON.parse(JSON.stringify(this.state.filters.housingTypes))
    if (name === 'All') {
      if (this.state.filters.housingTypes.indexOf('All') > -1) {
        newHousingTypeState = this.state.filters.housingTypes.filter(e => e !== 'All')
      } else {
        newHousingTypeState = ['All']
      }
    } else {
      if (this.state.filters.housingTypes.indexOf(name) > -1) {
        newHousingTypeState = this.state.filters.housingTypes.filter(e => e !== name)

      } else {
        newHousingTypeState = this.state.filters.housingTypes.filter(e => e !== 'All')
        newHousingTypeState.push(name)
      }
    }

    this.setState(prevState => ({...prevState, filters: {
      ...prevState.filters,
      housingTypes: newHousingTypeState
    }}))
  };

  onMinPriceChange = (e) => {
    this.setState(prevState => ({ ...prevState, filters: {
      ...prevState.filters,
      price: {
        ...prevState.filters.price,
        min: e.target.value
      }
    }}));
  }

  onMaxPriceChange = (e) => {
    this.setState(prevState => ({ ...prevState, filters: {
      ...prevState.filters,
      price: {
        ...prevState.filters.price,
        max: e.target.value
      }
    }}));
  }

  onMinSqftChange = (e) => {
    this.setState(prevState => ({ ...prevState, filters: {
      ...prevState.filters,
      sqft: {
        ...prevState.filters.sqft,
        min: e.target.value
      }
    }}));
  }

  onMaxSqftChange = (e) => {
    this.setState(prevState => ({ ...prevState, filters: {
      ...prevState.filters,
      sqft: {
        ...prevState.filters.sqft,
        max: e.target.value
      }
    }}));
  }

  onMinBedsChange = (e) => {
    this.setState(prevState => ({ ...prevState, filters: {
      ...prevState.filters,
      beds: {
        ...prevState.filters.beds,
        min: e.target.value
      }
    }}));
  }

  onMinBathsChange = (e) => {
    this.setState(prevState => ({ ...prevState, filters: {
      ...prevState.filters,
      baths: {
        ...prevState.filters.baths,
        min: e.target.value
      }
    }}));
  }

  satisfiesAllFilters = (loc) => {
    let housingTypeFilter = this.state.filters.housingTypes
    let type = loc.type
    if (!(housingTypeFilter.includes('All')
      || (housingTypeFilter.includes('Condos') && type.includes('CONDO'))
      || (housingTypeFilter.includes('Townhomes') && type.includes('TWNHS'))
      || (housingTypeFilter.includes('Houses') && type.includes('SFR')))) {
      return false
    }

    let priceFilter = this.state.filters.price;
    let priceAsVal = Number(loc.price.slice(1).replace(/,/,''))
    if (!(priceAsVal >= priceFilter.min && priceAsVal <= priceFilter.max)) {
      return false
    }

    let sqftFilter = this.state.filters.sqft;
    let sqftAsVal = Number(loc.sqft.split('/')[0])
    if (!(sqftAsVal >= sqftFilter.min && sqftAsVal <= sqftFilter.max)) {
      return false
    }

    let bedBathSegments = loc.bed_baths.split('/')

    let bedFilter = this.state.filters.beds;
    let numBeds = Number(bedBathSegments[0])
    if (!(numBeds >= bedFilter.min)) {
      return false
    }

    let bathFilter = this.state.filters.baths;
    let numBaths = Number(bedBathSegments[1].split(',')[0])
    if (!(numBaths >= bathFilter.min)) {
      return false
    }  

    return true
  };

  getMarker = (loc) => {
    if (loc.type === 'SFR') {
      return "http://maps.google.com/mapfiles/ms/icons/red.png"
    } else if (loc.type.includes('TWNHS')) {
      return "http://maps.google.com/mapfiles/ms/icons/blue.png"
    } else {
      return "http://maps.google.com/mapfiles/ms/icons/green.png"
    }
  }

  render() {
    return (
      <>
        <div className="Filter">
          <div>
            {housingTypes.map((name , index) => {
              return (
                <div className='Option'>
                  <input
                    type="checkbox"
                    id={`custom-checkbox-${index}`}
                    name={name}
                    value={name}
                    checked={this.state.filters.housingTypes.indexOf(name) > -1 }
                    onChange={() => this.onHousingTypeChange(name)}
                  />
                  <label htmlFor={`custom-checkbox-${index}`}>{name}</label>
                </div>
              );
            })}
            </div>
            <br/>
            <div>
              <div className='Range'>
                <label htmlFor={`minPrice`}>Min $: </label>
                <input
                  type="text"
                  id={`minPrice`}
                  className={'RangeInput'}
                  name='minPrice'
                  value={this.state.filters.price.min}
                  onChange={this.onMinPriceChange}
                />
              </div>
              <div className='Range'>
                <label htmlFor={`maxPrice`}>Max $: </label>
                <input
                  type="text"
                  id={`maxPrice`}
                  className={'RangeInput'}
                  name='maxPrice'
                  value={this.state.filters.price.max}
                  onChange={this.onMaxPriceChange}
                />
              </div>
            </div>
            <br/>
            <div>
              <div className='Range'>
                <label htmlFor={`minSqft`}>Min Sqft: </label>
                <input
                  type="text"
                  id={`minSqft`}
                  className={'RangeInput'}
                  name='minSqft'
                  value={this.state.filters.sqft.min}
                  onChange={this.onMinSqftChange}
                />
              </div>
              <div className='Range'>
                <label htmlFor={`maxSqft`}>Max Sqft: </label>
                <input
                  type="text"
                  id={`maxSqft`}
                  className={'RangeInput'}
                  name='maxSqft'
                  value={this.state.filters.sqft.max}
                  onChange={this.onMaxSqftChange}
                />
              </div>
            </div>
            <br/>
            <div>
              <div className='Range'>
                <label htmlFor={`minBeds`}>Min Beds: </label>
                <input
                  type="text"
                  id={`minBeds`}
                  className={'RangeInput'}
                  name='minBeds'
                  value={this.state.filters.beds.min}
                  onChange={this.onMinBedsChange}
                />
              </div>
              <div className='Range'>
                <label htmlFor={`minBaths`}>Min Baths: </label>
                <input
                  type="text"
                  id={`minBaths`}
                  className={'RangeInput'}
                  name='minBaths'
                  value={this.state.filters.baths.min}
                  onChange={this.onMinBathsChange}
                />
              </div>
            </div>
        </div>
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
            {this.state.data
              .filter(loc => this.satisfiesAllFilters(loc))
              .map(
                loc =>
                  <Marker
                    key={loc["mls_id"]}
                    onClick={this.onMarkerClick}
                    position={loc["coordinates"]}
                    icon={this.getMarker(loc)}
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
      </>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: Creds["key"]
})(MapContainer);

