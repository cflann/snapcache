// Inbox module
angular.module('snapcache.inbox', [])

// Inbox controller
.controller('InboxCtrl', function (FIREBASE_REF, Caches, userSession, $scope, $ionicModal, Geofire) {
  var self = this;
  self.caches = [];
  self.colors = ["purple-snap", "green-snap", "yellow-snap", "blue-snap"];

  self.getColorClass = function() {
    var color = self.colors.shift();
    self.colors.push(color);
    return color;
  };

  // listen for new received caches
  var receivedRef = new Firebase(FIREBASE_REF).child('users').child(userSession.uid).child('receivedCaches');
  self.displayCaches = function() {
    console.log('Displaying caches');
    self.caches = [];
    receivedRef.on('child_added', function(childSnapshot) {
      var cacheID = childSnapshot.key();
      console.log('Setting new geofire listener');
      console.log('key is', cacheID);
      Geofire.setListener(cacheID);

      // Display all the caches that have been discovered by user.
      Caches.getCacheDetailsForDiscovered(cacheID).then(function(cache) {
          addToCaches(cache, cacheID);
        });

      // Setup event listener for when the user discovers a cache,
      // push it to the inbox.
      Caches.onCacheDiscovered(cacheID).then(function(cache) {
        addToCaches(cache, cacheID);
      });
    });
  };

  // `addToCachces()` checks to see if that cache is not already present
  // in caches, before adding it. It also sets a timer for that cache
  // to be removed from the inbox.
  var addToCaches = function(cacheToAdd, cacheID) {
    cacheToAdd._id = cacheID;
    var found = false;
    self.caches.forEach(function(cache){
      if (cache._id === cacheToAdd._id) {
        found = true;
      }
    });
    if (!found) {
      self.caches.push(cacheToAdd);
      self.setTimerForExpiredRemoval(cacheToAdd);
    }
  };

  // Displays detail view once the cache information has been stored.
  self.displayDetails = function (cache) {
    if (!cache.hasOwnProperty('read_inbox')) {
      // set caches to 'read' when first opened in detail view
      cache.read_inbox = true;
      new Firebase(FIREBASE_REF).child('caches').child(cache._id)
        .child('read_inbox').set(true);
    }
    userSession.currentCache = cache;
    self.showDetail();
  };

  // Shows the cache detail modal view
  self.showDetail = function() {
    // Creates the detail modal based on the specified template
    $ionicModal.fromTemplateUrl('js/detail/inboxDetail.html', {
      scope: $scope
    }).then(function(modal) {
      self.detailModal = modal;

      // Display the created modal
      self.detailModal.show();
    });
  };

  //Cleanup the modal if we close the app on it!
  $scope.$on('$destroy', function() {
    self.detailModal.remove();
  });

  // Closes the cache detail modal view, and removes it to prevent memory leaks.
  self.closeDetail = function() {
    self.detailModal.remove();
  };

  // Schedules the given cache to be removed from the db at time of expiry
  self.setTimerForExpiredRemoval = function (cache) {
    // calculate offset from now
    var now = new Date().getTime();
    var timeUntilExpiry = cache.expiresAt - now;
    console.log('timeUntilExpiry', timeUntilExpiry);

    // // call removal fn at that offset time
    setTimeout(function () {
      console.log('REDISPLAY Caches');
      self.displayCaches();
    }, timeUntilExpiry);
  };

  self.create = function() {
    // Tell menuctrl to open the create modal
    // Must do this in order for create modal to behave correctly
    $scope.$emit('openCreate');
  };

  self.displayCaches();
});
