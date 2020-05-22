/*This file is part of RangeFindr.

RangeFindr is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

RangeFindr is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with RangeFindr.  If not, see <http://www.gnu.org/licenses/>.
*/

// Flickr API Application key
var flickrKey = 'e76f3d43d561013be997ed83c6554190';

var flickr = 'https://flickr.com/';
var flickrApi = 'https://api.flickr.com/services/rest/';
var jsonFormat = '&format=json&jsoncallback=?';
var showcall = ''; // Show Flickr API call

var map;
var lat;
var lng;
var zoom = 13;
var markers = [];

var spin; // Busy spinner

var loadFancybox = function () { // Fancybox
	$('a[rel=slideshow]').fancybox({
		'transitionIn'		: 'none',
		'transitionOut'		: 'none',
		'titlePosition' 	: 'over',
		'titleFormat'		: function(title, currentArray, currentIndex, currentOpts) {
			return '<span id="fancybox-title-over">Image ' + (currentIndex + 1) + ' / ' + currentArray.length + (title.length ? ' &nbsp; ' + title : '') + '</span>';
		}
	});
};

$(document).ready(function() {
	spin = $('#fields').busy();
	// Adjust map according to screen resolution 
	$('#map').css({'width':0.625*screen.width, 'height':0.625*screen.height});
});

function initMap() {
	$('#search').submit(function() {
		spin = $('#search').busy();
		showSearchedImages();
		return false;
	});
	map = new google.maps.Map($('#map').get(0), {
		mapTypeId: google.maps.MapTypeId.HYBRID
	});

	lat = 37.871592; // berkeley
	lng = -122.272747;
	setupMap(lat, lng);
	showImages('');

	$('input#radius').change(function() { // Show radius selected on slider
		$('#radius-selected').text('(' + $('#radius').val() + ' km)');
	});
	$('#nofancy').click(function() {
		if(!$(this).is(':checked')) {
			$('a[rel=slideshow]').unbind('click');
			$('a[rel=slideshow]').click(function(e) {
				e.preventDefault();
			});
		}
		else {
			loadFancybox(); // Load slideshow
		}
	});
	hidden = $('<div></div>').css('display', 'none').appendTo('#search'); // Hidden span to hold text
	$('<span id="calltext"></span>').appendTo(hidden); 
	$('a#showcall').attr({'href': '#calltext', 'title': 'Flickr API call'});
	$('a#showcall').fancybox(); // Load a Fancybox
}

function setupMap(lat, lng) {
	var $control = $('#pac-input').get(0);
	map.setCenter({lat: lat, lng: lng});
	map.setZoom(zoom);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push($control);

	var autocomplete = new google.maps.places.Autocomplete($control);
  autocomplete.bindTo('bounds', map);
 	google.maps.event.addListener(autocomplete, 'place_changed', function() {
 		var place = autocomplete.getPlace();
    if (!place.geometry) {
      return;
    }
 		// If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);  // Why 17? Because it looks good.
    }
    $('#nearby').attr('checked', false);
    showSearchedImages();	
 	});
}

function showSearchedImages() {
	var text = $('#text').val();
	var tags = $('#tags').val();
	var tagmode = $('#tagmode').val();
	var license = $('#license').val();
	var sort = $('#sort').val();
	var accuracy = $('#accuracy').val();
	var radius = $('#radius').val();
	var nearby = $('#nearby').is(':checked');

	// Build search params
	var searchParams = '';
	if(text != '') {searchParams += '&text=' + text;}
	if(tags != '') {searchParams += '&tags=' + tags;} else {
		date = new Date();
		min_date =  (date.getFullYear()-1) + "-" + (date.getMonth()+1) + "-" + date.getDate();
		searchParams += '&min_taken_date=' + min_date;
	}
	if(tagmode != 'any') {searchParams += '&tag_mode=' + tagmode;}
	if(license != '0') {searchParams += '&license=' + license;}
	if(accuracy != '') {searchParams += '&accuracy=' + accuracy;}
	if(radius != '' && radius != '5') {
		searchParams += '&radius=' + radius;
		r = parseFloat(radius);
		zoom = Math.round(0.02317*r*r - 0.88862*r + 16.86545); // Calculate zoom level
	}
	else {
		zoom = 13;
	}
	if(sort != 'radial') {searchParams += '&sort=' + sort;} else {zoom = 16;} // Radially sorted images are crowded around center	
	if (nearby) {
		navigator.geolocation.getCurrentPosition(function(position) {
			lat = position.coords.latitude;
			lng = position.coords.longitude;
			showImages(searchParams);
		});
	}
	else {
		lat = map.getCenter().lat();
		lng = map.getCenter().lng();
		showImages(searchParams);
	}
	
}

function showImages(searchParams) {
	var bounds = new google.maps.LatLngBounds();
	var call;
	var date = new Date();
	var min_date =  (date.getFullYear()-1) + "-" + (date.getMonth()+1) + "-" + date.getDate();

	if(searchParams != '') {
		call = flickrApi + '?method=flickr.photos.search&lat=' + lat + '&lon=' + lng + searchParams + '&extras=geo' + jsonFormat;
	}
	else {
		call = flickrApi + '?method=flickr.photos.search&lat=' + lat + '&lon=' + lng + '&sort=interestingness-desc&accuracy=11&extras=geo&min_taken_date=' + min_date + jsonFormat;
	}
	$('#calltext').text(call + '&api_key=[Your API Key Here]'); // Update text in #calltext
	call = call + '&api_key=' + flickrKey;
	$.getJSON(call, function(data) {
		
		for (var i = 0, marker; marker = markers[i]; i++) {
      marker.setMap(null);
    }
    markers = [];
		$('#photos').contents().remove();
		$.each(data.photos.photo, function(i,item) {
			var imgTitle = item.title;
			var imgURL_pre = 'https://farm' + item.farm + '.static.flickr.com/' + item.server + '/' + item.id + '_' + item.secret;
			var imgURL_s = imgURL_pre + '_s.jpg';
			var imgLat = item.latitude;
			var imgLon = item.longitude;
			var position = new google.maps.LatLng(imgLat, imgLon);
			bounds.extend(position);

			var marker = new google.maps.Marker({
				map: map,
				position: position
			});
			markers.push(marker);

			var html = '<img class="markerimg" src="' + imgURL_s + '" /><div class="markerinfo"><span>' + imgTitle + '</span><br/><a target="_blank" href="' + flickr + item.owner + '/' + item.id + '">View image on Flickr</a><br/><a target="_blank" href="' + flickr + 'map?fLat=' + imgLat + '&fLon=' + imgLon + '&zl=1">See location on Flickr</a><br/><a target="_blank" href="https://maps.google.com/?q=' + imgLat + ',' + imgLon + '&t=h">See location on Google Maps</a></div>';
			var infoWindow = new google.maps.InfoWindow({
      	content: html
      });

			google.maps.event.addListener(marker, 'click', function() {
				map.panTo(position);
				infoWindow.open(map, marker);
			});

			// Add image to results
			var imglist = $('<li class="imglist"></li>').appendTo('#photos');
			var link = $('<a></a>').attr('rel', 'slideshow').attr('href', imgURL_pre+'.jpg').attr('title', imgTitle);
			link.appendTo(imglist);
			$('<img class="photo"></img>').attr('src', imgURL_s).click(function() {
				if(!$('#nofancy').is(':checked')) {
					$('html, body').animate({scrollTop:0}, 'fast');
				}
				google.maps.event.trigger(marker, 'click')
			}).appendTo(link);
		});

		!bounds.isEmpty() && map.fitBounds(bounds);

		loadFancybox(); // Load slideshow
		$('#nofancy').attr('checked', 'checked');
		spin.busy("hide"); // Disable spinner
	});
}
