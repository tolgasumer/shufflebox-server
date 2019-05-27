var express = require('express');
var app = express();
var request = require('request');
//var port = 3000;
//var host = '0.0.0.0';
var spotifyToken = ''
var client_id = 'bddfdc9233b5493899809dcc42ca5cc3'; // Your client id
var client_secret = 'd97a1e581b5f4b4b9da348d6a0529e02'; // Your secret

var bodyParser = require('body-parser');
const axios = require('axios')
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var votes = [0, 0, 0, 0, 0];
var votableSongIndexes = [0, 0, 0, 0, 0];
var currentWinner;
var durationOfNextSong;
var mostVotedCurrently;
var playlistCollection = []; //for playlist comparison-similarity check

app.post('/sendvote', function (req, res) {
  var song_id = req.body.songid;
  console.log("Incoming POST: Vote for song ID:" + song_id);
  if (song_id > 0 && song_id < 6) {
    votes[song_id - 1]++;
  }
  console.log(votes);
  res.end();
});

// Loader.io test
app.get('/loaderio-c74a0910b6c7711002911d1c57cf189f', function (req, res) {
  res.send('loaderio-c74a0910b6c7711002911d1c57cf189f');
});

app.get('/getinfo', function (req, res) {
  //console.log("Incoming GET");
  res.json({
    votesForSong1: votes[0],
    votesForSong2: votes[1],
    votesForSong3: votes[2],
    votesForSong4: votes[3],
    votesForSong5: votes[4],
    lastWinner: currentWinner,
    currentlyPlayingName: nowPlayingName,
    currentlyPlayingUrl: nowPlayingImageUrl
  });
});

app.get('/getplaylist', function (req, res) {
  //console.log("Incoming GET playlist");
  res.json(playlistItems);
  //res.end(playlistItems);
});

app.get('/getvotables', function (req, res) {
  res.json(votableSongIndexes);
});

app.post('/getsimilarity', function (req, res) {
  console.log("/getsimilarity request:")
  console.log("user_playlistid", req.body.user_playlistid);
  console.log("target_playlistid", req.body.target_playlistid);

  var targetPlaylist = new Playlist(req.body.target_playlistid, 'host');

  var userPlaylist = new Playlist(req.body.user_playlistid, 'user');
  userPlaylist.playlistFeaturesMean
    .then(function () {
      return CalculateSimilarityToPlaylist(userPlaylist, targetPlaylist)
    })
    .then(function (similarityPercentage) {
      res.json(similarityPercentage)
      //res.end(similarityPercentage);
      console.log("sending json:", similarityPercentage);
    })
});

app.post('/getaudiofeatures', function (req, res) {
  console.log("/getaudiofeatures request:")
  console.log("playlistid", req.body.playlistid);

  var playlist = new Playlist(req.body.playlistid, 'user');
  playlist.playlistFeaturesMean
    .then(function (playlistFeaturesMean) {
      res.json(playlistFeaturesMean)
      console.log("sending json:", playlistFeaturesMean);
    })
});

app.get('/getplaces', function (req, res) {
  console.log("/getplaces request");
  places = [
    {
      "name": "Gaspar Brasserie",
      "playlistname": "Slow Rock",
      "address": "185 Sutter St, San Francisco, CA 94109",
      "image": { "url": "https://pl.scdn.co/images/pl/default/dc52fac57803a58256eec3379700c01d9697ccbe" },
      "id": "296W1tgCGPvAjyCSSdiUsG",
    },
    {
      "name": "Chillin",
      "playlistname": "Dance Pop",
      "address": "527 Broome St, New York, NY 10013",
      "image": { "url": "https://pl.scdn.co/images/pl/default/dfb50eee7fc1f60c432d4b00a94d84e98e480860" },
      "id": "37i9dQZF1DXcZDD7cfEKhW",
    },
    {
      "name": "Coffee Break",
      "playlistname": "Jazz Classics",
      "address": "1900 Warner Ave. Unit A Santa Ana, CA",
      "image": { "url": "https://pl.scdn.co/images/pl/default/4629f9b09c54f1cc645097b0a3004b77c2e73a6e" },
      "id": "37i9dQZF1DXbITWG1ZJKYt",
    },
    {
      "name": "Sushibo",
      "playlistname": "90s Metal",
      "address": "35 Sipes Key, New York, NY 10012",
      "image": { "url": "https://pl.scdn.co/images/pl/default/b017cc600110985d2f42f0d6aa9be67ee514dabb" },
      "id": "37i9dQZF1DX08jcQJXDnEQ",
    },
    {
      "name": "Mastergrill",
      "playlistname": "Classical Essentials",
      "address": "550 Upton Rue, San Francisco, CA 94109",
      "image": { "url": "https://pl.scdn.co/images/pl/default/3f48aae3f3e2b8aaf6c424747b795b9171b05988" },
      "id": "37i9dQZF1DWWEJlAGA9gs0",
    }
  ];
  res.json(places);
});

function GetSpotifyAccessToken() {
  // requesting access token from refresh token
  var refresh_token = 'AQCbR9xoXdt1F-ERUqPrubHUAfvhdCFnLIKT5XZWEcLdpQhV3YvuI_nBB1wqIbJJAqQjrUuBT1HHKNBLT2KUxul6eCpvPb5mY6PhYW7mXH4KEEi80x1pH2kJXzcE9DdqGIvAHg';
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      console.log(access_token);
      spotifyToken = access_token;
      spotifyApi.setAccessToken(spotifyToken);
    }
  });
}


//Spotify requests
var Spotify = require('node-spotify-api');

var spotify = new Spotify({
  id: 'bddfdc9233b5493899809dcc42ca5cc3',
  secret: 'd97a1e581b5f4b4b9da348d6a0529e02'
});

var playlistItems; //request sonucu spotifydan gelecek playlist objesi

//get playlist call
function GetPlaylistItems() {
  spotify
    .request('https://api.spotify.com/v1/playlists/3uZ0DcmMUUzola8ZC2HxRn/tracks')
    .then(function (data) {
      // data'da items diye bi array geliyor onun track objeleri var
      //console.log(data);
      //console.log(data.items[0].track.album.images[0].url);
      playlistItems = data.items;
      //console.log(playlistItems);
    })
    .catch(function (err) {
      console.error('Error occurred: ' + err);
    });
}

// interval
setTimeout(function () { GetSpotifyAccessToken() }, 1000);
setTimeout(function () { GetPlaylistItems() }, 1000);
setTimeout(function () { PlayWinner() }, 9000);
setTimeout(function () { RefreshVotableSongs() }, 5000);

setInterval(function () { GetSpotifyAccessToken(); }, 600000);
setInterval(function () { DetermineMostVotedCurrently(); }, 1000);
setInterval(function () { GetCurrentlyPlaying(); }, 3000);
setInterval(function () { GetPlaylistItems(); }, 10000);
//setInterval(function () { RefreshVotableSongs(); },20000);

function DetermineMostVotedCurrently() {
  //votes arrayi bos degilse (oy geldiyse) currentWinner'i degistir, kazanani birinci siraya koy
  if (votes[0] + votes[1] + votes[2] + votes[3] + votes[4] > 0) {
    mostVotedCurrently = votes.indexOf(Math.max(...votes));
    currentWinner = votableSongIndexes[mostVotedCurrently];
  }
  //return votes.indexOf(Math.max(...votes));
}

function PlayWinner() {
  if (votes[0] + votes[1] + votes[2] + votes[3] + votes[4] == 0) // no votes
  {
    currentWinner = votableSongIndexes[getRandomInt(0, 4)];
    console.log("votes array is empty, playing random song with ID:" + currentWinner + " from votables");
  }
  PutWinningSongToFirst();
  setTimeout(function () { PlayTheFirstSongOnPlaylist() }, 2000);

  durationOfNextSong = playlistItems[currentWinner].track.duration_ms;
  currentWinner = 0; //kazanan basa gelecegi icin

  console.log("durationOfNextSong:" + durationOfNextSong);
  RefreshVotableSongs();

  setTimeout(function () { PlayWinner() }, durationOfNextSong);
}


var nowPlayingName;
var nowPlayingImageUrl;
function GetCurrentlyPlaying() {
  axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + spotifyToken
    }
  })
    .then((response) => {
      //console.log(response)
      //console.log(response.data.item.name);
      nowPlayingName = response.data.item.name;
      //console.log(response.data.item.album.images[0].url);
      nowPlayingImageUrl = response.data.item.album.images[0].url;
    })
    .catch((error) => {
      console.log(error);
    })
}

function PutWinningSongToFirst() {
  axios.put('https://api.spotify.com/v1/playlists/3uZ0DcmMUUzola8ZC2HxRn/tracks',
    {
      range_start: currentWinner,
      insert_before: 0
    },
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + spotifyToken
      }
    })
    .then((response) => {
      //console.log(response)
      //console.log(response.data);
    })
    .catch((error) => {
      console.log(error);
    })
}

function PlayTheFirstSongOnPlaylist() {
  axios.put('https://api.spotify.com/v1/me/player/play',
    {
      "context_uri": "spotify:user:11100316938:playlist:3uZ0DcmMUUzola8ZC2HxRn",
      "offset": {
        "position": 0
      },
      "position_ms": 0
    },
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + spotifyToken
      }
    })
    .then((response) => {
      //console.log(response)
      console.log("Now playing the first song on the playlist");
    })
    .catch((error) => {
      console.log(error);
    })
}

function RefreshVotableSongs() {
  var playlistLength = Object.keys(playlistItems).length;
  console.log("playlistLength: " + playlistLength);

  for (var i = 0; i < votableSongIndexes.length; i++) {
    var randomInt = getRandomInt(0, playlistLength - 1);
    if (votableSongIndexes.includes(randomInt)) {
      i--;
    }
    else {
      votableSongIndexes[i] = randomInt;
    }
    //votableSongIndexes[i] = getRandomInt(0,playlistLength-1);
  }
  votes = [0, 0, 0, 0, 0];
  console.log(votableSongIndexes);

  //console.log(Object.keys(playlistItems).length);
  //console.log(playlistItems);
}

function GetDurationOfSong(indexInPlaylist) {
  durationOfNextSong = playlistItems[indexInPlaylist].track.duration_ms;
  console.log(durationOfNextSong);

}
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//----------------------------------------------
//playlist comparison functions (/getsimilarity)
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId: 'bddfdc9233b5493899809dcc42ca5cc3',
  clientSecret: 'd97a1e581b5f4b4b9da348d6a0529e02',
  redirectUri: 'http://localhost:5000'
});
//spotifyApi.setAccessToken(spotifyToken);

//playlist object containing features
function Playlist(playlistid, type) {
  this.name = GetPlaylist(playlistid)
    .then(function (playlist) {
      return playlist.name;
    });

  this.playlistFeaturesMean = GetPlaylist(playlistid)
    .then(function (playlist) {
      return GetPlaylistFeatures(playlist.tracks.items);
    })
    .then(function (playlistFeatures) {
      return CalculatePlaylistFeaturesMean(playlistFeatures);
    });

  if (type == 'host') {
    AddToPlaylistCollection(this);
  }
}


//get playlist call
function GetPlaylist(playlistid) {
  return new Promise(function (resolve, reject) {
    spotify
      .request('https://api.spotify.com/v1/playlists/' + playlistid)
      .then(function (data) {
        // data'da items diye bi array geliyor onun track objeleri var
        //console.log(data.items[0].track.album.images[0].url);
        resolve(data);
      })
      .catch(function (err) {
        console.error('Error occurred: ' + err);
        reject(err);
      });
  })
}


function GetPlaylistFeatures(inputPlaylistItems) {
  return new Promise(function (resolve, reject) {
    var playlistLength = Object.keys(inputPlaylistItems).length;
    var songUris = [];
    for (let i = 0; i < playlistLength; i++) {
      songUris.push(inputPlaylistItems[i].track.id);
    }
    spotifyApi.getAudioFeaturesForTracks(songUris)
      .then(function (data) {
        resolve(data.body.audio_features);
      })
      .catch(function (err) {
        console.error('Error occurred: ' + err);
        reject(err);
      })
  });
}

function CalculatePlaylistFeaturesMean(playlistFeatures) {
  var playlistLength = Object.keys(playlistFeatures).length;
  //console.log(playlistFeatures);
  //declare default dictionary
  var playlistFeaturesMean = { 'danceability': 0, 'energy': 0, 'speechiness': 0, 'acousticness': 0, 'instrumentalness': 0, 'liveness': 0, 'valence': 0 };
  var keys = Object.keys(playlistFeaturesMean);
  //console.log(playlistFeatures);
  //getting the average of each feature of the playlist and saving them to playlist1FeaturesMean dict
  for (let i = 0; i < playlistLength; i++) {
    //add up each songs features to our dict
    try {
      playlistFeaturesMean['danceability'] += playlistFeatures[i].danceability;
      playlistFeaturesMean['energy'] += playlistFeatures[i].energy;
      playlistFeaturesMean['speechiness'] += playlistFeatures[i].speechiness;
      playlistFeaturesMean['acousticness'] += playlistFeatures[i].acousticness;
      playlistFeaturesMean['instrumentalness'] += playlistFeatures[i].instrumentalness;
      playlistFeaturesMean['liveness'] += playlistFeatures[i].liveness;
      playlistFeaturesMean['valence'] += playlistFeatures[i].valence;

    }
    catch (error) {
      console.log(error);
    }
  }
  for (let i = 0; i < keys.length; i++) {
    //divide each value to playlistLength to get the average
    playlistFeaturesMean[keys[i]] /= playlistLength;
  }
  //console.log(playlistFeaturesMean);
  return playlistFeaturesMean;

}

function AddToPlaylistCollection(playlist) {
  playlistCollection.push(playlist);
  playlist.name.then(a => console.log(" +'" + a + "' added to playlist collection"));
}

function CalculateSimilarityToPlaylist(userPlaylist, hostPlaylist) {
  return new Promise(function (resolve, reject) {
    var similarityPercentage;
    var playlistDifference = { 'danceability': 0, 'energy': 0, 'speechiness': 0, 'acousticness': 0, 'instrumentalness': 0, 'liveness': 0, 'valence': 0 };
    var sumOfDifferences = 0;
    var keys = Object.keys(playlistDifference);
    for (let i = 0; i < keys.length; i++) {
      var hostValue = hostPlaylist.playlistFeaturesMean.then(function (means) { return means[keys[i]]; });
      var userValue = userPlaylist.playlistFeaturesMean.then(function (means) { return means[keys[i]]; });
      Promise.all([hostValue, userValue]).then(function (values) {
        playlistDifference[keys[i]] = Math.abs(values[0] - values[1]);
        sumOfDifferences += playlistDifference[keys[i]];
        //console.log("sumOfDifferences=", sumOfDifferences, "playlistDifference[keys[i]]", playlistDifference[keys[i]], "i=", i);
      }).then(function () {
        similarityPercentage = ((7 - sumOfDifferences) * 100) / 7;
        //console.log("similarityPercentages=", similarityPercentage);
        resolve(similarityPercentage);
      }
      )
    }

  })
}


// start the server
app.listen(process.env.PORT || 3000);
//console.log('Server started! At port ' + port);
