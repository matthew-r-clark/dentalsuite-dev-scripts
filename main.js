DEFAULT_PROFILE_PHOTO_URL = 'https://i.imgur.com/mCHMpLT.png';

let App = {
  user: null,

  userFirstName: function() {
    let displayName = this.user.displayName
    if (displayName) {
      return displayName.split(' ')[0];
    }
  },
  userEmailPrefix: function() {
    return this.user.email.split('@')[0];
  },

  signup: function(data) {
    firebase.auth().createUserWithEmailAndPassword(data.email, data.password)
      .then(redirectToProfile)
      .catch(this.logSignupError.bind(this));
  },
  signin: function(data) {
    firebase.auth().signInWithEmailAndPassword(data.email, data.password)
      .then(redirectToProfile)
      .catch(logError);
  },
  signinGoogle: function() {},
  signout: function() {
    firebase.auth().signOut();
    redirectToHome();
  },
  logSignupError: function(error) {
    this.$signupError.text(error.message);
  },

  updateProfile: function(data) {
    this.user.updateProfile(data)
      .catch(handleError);
  },

  putFileInStorage: function(file) {
    let storageRef = firebase.storage().ref();
    let path = `avatars/${this.user.uid}`;
    let avatarRef = storageRef.child(path);
    avatarRef.put(file).then(function(snapshot) {
      avatarRef.getDownloadURL().then(function(url) {
        // set profile picture or refresh page?
        this.updateProfile({photoURL: url});
      }.bind(this)).catch(handleError);
    }.bind(this)).catch(handleError);
  },
  getFileFromStorage: function(list) {},

  putDataInDatabase: function(data) {
    let dbRef = firebase.database().ref('users/' + this.user.uid);
    dbRef.set(data);
  },
  // getDataFromDatabase: function() {
  //   let dbRef = firebase.database().ref('users/' + this.user.uid);
  //   dbRef.once('value').then(snapshot => {
  //     this.userData = snapshot.val() || {};
  //   }).catch(handleError);
  // },

  setAuthStateListener: function() {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        this.user = user;
        if (user.photoURL) {
          this.toggleNavUserLoggedInWithPhoto();
        } else {
          this.toggleNavUserLoggedInWithoutPhoto();
        }
      } else {
        this.user = null;
        this.authGuardProfile();
        this.toggleNavUserLoggedOut();
      }
    }.bind(this));
  },
  authGuardProfile: function() {
    if (location.pathname.includes('profile') && !this.user) {
      redirect('/');
    }
  },
  toggleNavUserLoggedInWithPhoto: function() {
    this.$loginButton.toggle(false);
    let attribute = {style: `background-image: url(${this.user.photoURL})`};
    this.$profileAvatarButton.attr(attribute);
    this.$profileNameButton.text(this.userFirstName() || this.userEmailPrefix());
    this.$profileAvatarNameSection.toggle(true);
  },
  toggleNavUserLoggedInWithoutPhoto: function() {
    this.$loginButton.toggle(false);
    let attribute = {style: `background-image: url(${DEFAULT_PROFILE_PHOTO_URL})`};
    this.$profileAvatarButton.attr(attribute);
    this.$profileNameButton.text(this.userFirstName() || this.userEmailPrefix());
    this.$profileAvatarNameSection.toggle(true);
  },
  toggleNavUserLoggedOut: function() {
    let attribute = {style: `background-image: url(${DEFAULT_PROFILE_PHOTO_URL})`};
    this.$profileAvatarButton.attr(attribute);
    this.$profileNameButton.text('User Name');
    this.$profileAvatarNameSection.toggle(false);
    this.$loginButton.toggle(true);
  },

  bindElements: function() {
    // nav
    this.$loginButton = $('#login-button');
    this.$profileAvatarButton = $('#profile-avatar-button');
    this.$profileNameButton = $('#profile-name-button');
    this.$profileAvatarNameSection = $('#profile-avatar-and-name');

    // sign up
    this.$signupForm = $('#signupForm');
    this.$signupEmail = $('#signupEmail');
    this.$signupPassword = $('#signupPassword');
    this.$signupAgreeToTermsCheckbox = $('#sigupCheckbox');
    this.$signupError = $('#signupError');

    // sign in
    this.$signinForm = $('#signinForm');
    this.$signinGoogleButton = $('#signin-google-button');
    this.$signinEmail = $('#signinEmail');
    this.$signinPassword = $('#signinPassword');
    this.$signinRememberMeCheckbox = $('#signinCheckbox');
    this.$forgotPasswordLink = $('#forgotPasswordLink');

    // profile general
    this.$usernameWelcome = $('#username-welcome');
    this.$backgroundHeaderImage = $('#background-header-image');
    this.$userAvatar = $('#user-avatar');
    this.$usernameHeader = $('#username-header');

    // profile about
    this.$aboutPhone = $('#about-phone');
    this.$aboutBirthdate = $('#about-birthdate');
    this.$aboutContactEmail = $('#about-contact-email');
    this.$aboutLocation = $('#about-location');
    this.$aboutPosition = $('#about-position');
    this.$aboutBio = $('#about-bio');

    // profile edit
    this.$editProfileForm = $('#wf-form-profile');
    this.$editPhotoUpload = $('#edit-profile-photo');
    this.$editFirstName = $('#edit-first-name');
    this.$editLastName = $('#edit-last-name');
    this.$editBirthdateDay = $('#edit-birthdate-day');
    this.$editBirthdateMonth = $('#edit-birthdate-month');
    this.$editBirthdateYear = $('#edit-birthdate-year');
    this.$editLocation = $('#edit-location');
    this.$editContactEmail = $('#edit-contact-email');
    this.$editPhone = $('#edit-phone');
    this.$editFacebookUrl = $('#edit-facebook-url');
    this.$editInstagramUrl = $('#edit-instagram-url');
    this.$editTwitterUrl = $('#edit-twitter-url');
    this.$editBio = $('#edit-bio');
  },
  bindEventListeners: function() {
    this.$signupForm.submit(this.handleSignup.bind(this));
    this.$signinForm.submit(this.handleSignin.bind(this));
    this.$editProfileForm.submit(this.handleProfileEdit.bind(this));
  },

  handleSignup: function(event) {
    event.preventDefault();
    event.stopPropagation();
    let data = {
      email: $('#signupEmail').val(),
      password: $('#signupPassword').val(),
    };
    this.signup(data);
  },
  handleSignin: function(event) {
    event.preventDefault();
    event.stopPropagation();
    let data = {
      email: $('#signinEmail').val(),
      password: $('#signinPassword').val(),
    };
    this.signin(data);
  },
  handleProfileEdit: function(event) {
    event.preventDefault();
    event.stopPropagation();
    let form = event.currentTarget;
    let data = getFormData(form);
    this.extractAndProcessPhotoFromFormData(data);
    this.extractAndProcessUsernameFromFormData(data);
    this.putDataInDatabase(data);
  },
  extractAndProcessPhotoFromFormData: function(data) {
    if (data['photo-upload'].name) {
      let file = data['photo-upload'];
      this.putFileInStorage(file);
      delete data['photo-upload'];
    }
  },
  extractAndProcessUsernameFromFormData: function(data) {
    if (data['first-name'] || data['last-name']) {
      let first = data['first-name'].trim(),
          last = data['last-name'].trim();
      let username = first + ' ' + last;
      this.updateProfile({displayName: username});
      delete data['first-name'];
      delete data['last-name'];
    }
  },

  init: function() {
    this.bindElements();
    this.bindEventListeners();
    this.setAuthStateListener();
    return this;
  },
};

$(function() {
  window.app = App.init(); // just for development
  // App.init();  // production
});

function handleError(error) {
  console.error(error);
}

function redirect(path) {
  if (location.pathname !== path) {
    console.log('redirecting from ' + location.pathname + ' to ' + path);
    location.pathname = path;
  }
}

function redirectToHome() {
  redirect('/');
}

function redirectToProfile() {
  redirect('profile/user-profile');
}

function logError(error) {
  console.error('Error code: ' + error.code);
  console.error('Error message: ' + error.message);
}

function getFormData(form) {
  let formData = new FormData(form);
  let data = {};
  for (var pair of formData.entries()) {
    let key = pair[0],
        value = pair[1];
    data[key] = value;
  }
  return data;
}