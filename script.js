'use strict';

//parent class for running and cycling
class Workout {
  //cutting edge JS
  date = new Date();
  id = (Date.now() + '').slice(-10); //last 10 numbers of date
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace(); //immediatelly calc pace
    this._setDescription();
  }

  calcPace() {
    //minutes/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    //this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  //private instance properties
  #map;
  #mapZoomLevel = 17;
  #mapEvent;
  #workouts = [];
  //constructor is called immediatelly when new object is created from this class
  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event handlers
    //with bind - this keyword will point to the app object
    form.addEventListener('submit', this._newWorkout.bind(this)); //this is event handler function -> this keyword points to the DOM element on which it is attached - form element (it will point to the form not to the app object)
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      //input - 2 callback functions - first when browser succesfully get coordinates, second one when error happen during getting coordinates
      //getPosition will call loadMap function once it get current position of user
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), //we manually set this keyword to be that object with bind
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    //L - namespace
    //id in index.html is map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    //on method - coming from leaflet library
    //whenever we click on the map this callback function will be executed
    //here we will get coords
    this.#map.on('click', this._showForm.bind(this)); //this keyword points to the map because this is where we attach event on

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    //always one of them is visible and of them is hidden
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    //loop over the array and check if number is finite or not
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); //if only one value is finite -> every will return false

    const allPositive = (...inputs) => inputs.every(inp => inp > 0); //it will return true only if all the inputs are positive numbers

    e.preventDefault();

    //Get data from form
    const type = inputType.value; //select element with inputType and then it's value
    const distance = +inputDistance.value; // + convert to a number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid - guard class - > check for the opposite of what we are interested in and if that opposite is true return function immediatelly
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers'); //if distance is not a number

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid
      //Check if data is valid - guard class - > check for the opposite of what we are interested in and if that opposite is true return function immediatelly
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers'); //if distance is not a number

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);
    //console.log(workout);

    //Render workout on map as marker

    // console.log(this.#mapEvent);
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>
      `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
            `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
        `;

    form.insertAdjacentHTML('afterend', html); //sibling to the form element
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout'); //select entire element - there I have id so I can find exactly that workout that is clicked

    if (!workoutEl) return; //guard class - if there is no workout element then return

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    //setView method from lieflet
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //console.log(workout);

    //using public interface
    //workout.click();
  }

  _setLocalStorage() {
    //JSON.stringify - convert object to a string
    //set all workouts to the local storage - only for small amounts of data
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  //executing at the beginning - when the page is loaded - map is not defined at this point
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //console.log(data);

    if (!data) return;

    //restoring data
    this.#workouts = data;

    //render restored workouts
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); //to reload the page
  }
}

const app = new App();

//LOCAL STORAGE - place in the browser where the data will be saved even after we close the page
//console.log(firstName); //Vanja - because other.js is defined before script.js
