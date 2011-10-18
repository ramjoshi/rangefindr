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

var flickr = 'http://flickr.com/';
var flickrApi = 'http://api.flickr.com/services/rest/';
var jsonFormat = '&format=json&jsoncallback=?';
var showcall = ''; // Show Flickr API call

var map;
var lat;
var lon;
var zoom = 13;

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
	init();
});

function init() {
	$('#search').submit(function() {
		spin = $('#search').busy();
		showSearchedImages();
		return false;
	});
	map = new GMap2($('#map').get(0));
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {	
			lat = position.coords.latitude;
			lon = position.coords.longitude;
			setupMap(lat, lon);
			showImages('');
		});
	}
	else {
		lat = 37.871592; // berkeley
		lon = -122.272747;
		setupMap(lat, lon);
		showImages('');
	}
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

function setupMap(lat, lon) {
	map.setCenter(new GLatLng(lat, lon), zoom);
	map.setMapType(G_HYBRID_MAP);
	map.enableRotation();
	map.addControl(new GLargeMapControl());
	map.addControl(new GMapTypeControl());
	map.enableGoogleBar();
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
			lon = position.coords.longitude;
			map.setCenter(new GLatLng(lat, lon), zoom);
			showImages(searchParams);
		});
	}
	else {
		lat = map.getCenter().y;
		lon = map.getCenter().x;
		map.setZoom(zoom);
		showImages(searchParams);
	}
}

function showImages(searchParams) {
	date = new Date();
	min_date =  (date.getFullYear()-1) + "-" + (date.getMonth()+1) + "-" + date.getDate();

	if(searchParams != '') {
		call = flickrApi + '?method=flickr.photos.search&lat=' + lat + '&lon=' + lon + searchParams + '&extras=geo' + jsonFormat;
	}
	else {
		call = flickrApi + '?method=flickr.photos.search&lat=' + lat + '&lon=' + lon + '&sort=interestingness-desc&accuracy=11&extras=geo&min_taken_date=' + min_date + jsonFormat;
	}
	$('#calltext').text(call + '&api_key=[Your API Key Here]'); // Update text in #calltext
	call = call + '&api_key=' + flickrKey;
	$.getJSON(call, function(data) {
		map.clearOverlays();
		$('#photos').contents().remove();
		$.each(data.photos.photo, function(i,item) {
			var imgTitle = item.title;
			var imgURL_pre = 'http://farm' + item.farm + '.static.flickr.com/' + item.server + '/' + item.id + '_' + item.secret;
			var imgURL_s = imgURL_pre + '_s.jpg';
			var imgLat = item.latitude;
			var imgLon = item.longitude;

			var point = new GLatLng(imgLat, imgLon);
			var marker = new GMarker(point);
			var html = '<img class="markerimg" src="' + imgURL_s + '" /><div class="markerinfo"><span>' + imgTitle + '</span><br/><a target="_blank" href="' + flickr + item.owner + '/' + item.id + '">View image on Flickr</a><br/><a target="_blank" href="' + flickr + 'map?fLat=' + imgLat + '&fLon=' + imgLon + '&zl=1">See location on Flickr</a><br/><a target="_blank" href="http://maps.google.com/?q=' + imgLat + ',' + imgLon + '&t=h">See location on Google Maps</a></div>';
			GEvent.addListener(marker, 'click', function() {
				map.panTo(point);
				marker.openInfoWindowHtml(html);
			});
			map.addOverlay(marker);

			// Add image to results
			var imglist = $('<li class="imglist"></li>').appendTo('#photos');
			var link = $('<a></a>').attr('rel', 'slideshow').attr('href', imgURL_pre+'.jpg').attr('title', imgTitle);
			link.appendTo(imglist);
			$('<img class="photo"></img>').attr('src', imgURL_s).click(function() {
				if(!$('#nofancy').is(':checked')) {
					$('html, body').animate({scrollTop:0}, 'fast');
				}
				GEvent.trigger(marker, 'click');
				}).appendTo(link);
			});

			loadFancybox(); // Load slideshow
			$('#nofancy').attr('checked', 'checked');
			spin.busy("hide"); // Disable spinner
		});	
	}