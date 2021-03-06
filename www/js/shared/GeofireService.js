// Geofire service contains the functionality
// necessary for the app to find which snapcaches
// a user is in the vicinity of
angular.module('snapcache.services.geofire', [])

.factory('Geofire', function(FIREBASE_REF, userSession, Caches) {
  var geofire = new GeoFire(new Firebase(FIREBASE_REF + 'geofire/'));
  var cachesRef = new Firebase(FIREBASE_REF + 'caches/');

  // userSession object contains user's "uid" for the current session

  var setListener = function(cacheID) {
    console.log('in setListener');
    cachesRef.child(cacheID).once('value', function(snapshot) {
      console.log('Creating geoquery');
      var cacheObj = snapshot.val();
      var geoQuery = geofire.query({
        center: [cacheObj.coordinates.latitude, cacheObj.coordinates.longitude],
        radius: 1.62
      });
      geoQuery.on('key_entered', function(key, location, distance) {
        if (key !== userSession.uid) return;
        console.log('user key:', key);

        cachesRef.child(cacheID).child('discovered').once('value', function(freshSnapshot) {
          var isDiscovered = freshSnapshot.val();

          var now = Date.now();
          var droptime = cacheObj.droptime;
          var lifespan = cacheObj.lifespan;
          // check if cache is available to be discovered
          if ((now > droptime) &&
             (now < (droptime + lifespan)) &&
             (!isDiscovered)) {
            // set cache state to discovered
            Caches.discoverCache(cacheID);
            console.log('new cache discovered!');
          }
        });
      });
      // remove geoquery listener when cache removed
      console.log('Setting removal listener');
      cachesRef.on('child_removed', function(childSnapshot) {
        if (childSnapshot.key() === cacheID) {
          console.log('Cache removed, cancelling geoquery');
          geoQuery.cancel();
        }
      });
    });
  };

  return {
    setListener: setListener,
    geofire: geofire
  };

});
