var express = require('express');
var app = express();
//var port = 3000;
//var host = '0.0.0.0';
var spotifyToken = 'AQAVbLY6vNHFiYHbkLOvUEgnYf2xDr2SyfmPlEUY5wx4QxfSyaUAI_I11QXBM1yP_i8eDP9ygoL1rDiN9JS4EZv4MtwFULCv-RA27hx2YMh3hLRwjD39MG3MbeLDHA4_L2_Di5YiE_5IaPUP3nBl3-CZUk9mYdcQxD4UJNVRBQbVVN7etCbqoPh9VJRQmn5hNXgbH9af-xoYOKPOE58iEt0aGQbtC5-PTAMCy9bhDJ0atY5TG06xqNRiQAzEZkBeEkhPVAiiY17oYxvdT9_FARmAHbmRKFzEyN36QWuynGF-vvyCQ43lud61mpDedQa24Sw0&state=2Z4bCXNjdZdPbcRJ'

var bodyParser = require('body-parser');
const axios = require('axios')
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var votes = [0, 0, 0, 0, 0];
var votableSongIndexes = [0, 0, 0, 0, 0];
var currentWinner;
var durationOfNextSong;
var mostVotedCurrently;

app.post('/sendvote', function (req, res) {
  var song_id = req.body.songid;
  console.log("Incoming POST: Vote for song ID:" + song_id);
  votes[song_id - 1]++;
  console.log(votes);
  res.end();
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



//Spotify requests
var Spotify = require('node-spotify-api');

var spotify = new Spotify({
  id: 'bddfdc9233b5493899809dcc42ca5cc3',
  secret: 'd97a1e581b5f4b4b9da348d6a0529e02'
});

var playlistItems; //request sonucu spotifydan gelecek playlist objesi

//get playlist call
function GetPlaylist() {
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
setTimeout(function(){GetPlaylist()}, 1000);
setTimeout(function(){PlayWinner()}, 90000);
setTimeout(function(){RefreshVotableSongs()}, 5000);

setInterval(function () { DetermineMostVotedCurrently(); }, 1000);
setInterval(function () { GetCurrentlyPlaying(); }, 3000);
setInterval(function () { GetPlaylist(); }, 10000);
//setInterval(function () { RefreshVotableSongs(); },20000);

function DetermineMostVotedCurrently() {
  //votes arrayi bos degilse (oy geldiyse) currentWinner'i degistir, kazanani birinci siraya koy
  if(votes[0] + votes[1] + votes[2] + votes[3] + votes[4] > 0)
  {
    mostVotedCurrently = votes.indexOf(Math.max(...votes));
    currentWinner = votableSongIndexes[mostVotedCurrently];
  }
  else
  {
    //console.log("DetermineMostVotedCurrently(): Votes array is empty, winner hasn't been changed");
  }
  //return votes.indexOf(Math.max(...votes));
}

function PlayWinner() {
	if(votes[0] + votes[1] + votes[2] + votes[3] + votes[4] > 0){
		PutWinningSongToFirst();
  setTimeout(function(){PlayTheFirstSongOnPlaylist()}, 2000);

  durationOfNextSong = playlistItems[currentWinner].track.duration_ms;
  currentWinner = 0; //kazanan basa gelecegi icin

  console.log(durationOfNextSong);
  RefreshVotableSongs();

  setTimeout(function(){PlayWinner()}, durationOfNextSong);

	}
  

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
      "position":0
    },
    "position_ms":0
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

function RefreshVotableSongs()
{
  var playlistLength = Object.keys(playlistItems).length;
  console.log("playlistLength: "+playlistLength);

  for(var i=0;i<votableSongIndexes.length;i++)
  {
  	var randomInt = getRandomInt(0,playlistLength-1);
  	if(votableSongIndexes.includes(randomInt)) {
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

function GetDurationOfSong(indexInPlaylist){
  durationOfNextSong = playlistItems[indexInPlaylist].track.duration_ms;
  console.log(durationOfNextSong);

}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



// start the server
//app.listen(port, host);
app.listen(process.env.PORT || 3000);
//console.log('Server started! At port ' + port);
