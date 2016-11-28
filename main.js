var CityService = function (username) {
    this.username = username;
    this.url = 'https://' + this.username + '.carto.com/api/v2/sql?q=';
    this.queryPoints = 'select *, TO_CHAR(adherence_date,\'DD-MM-YYYY\') as adherence_date_format, TO_CHAR(adherence_date,\'DD-MM-YYYY\') as denied_date_format, ST_X(the_geom) as lng, ST_Y(the_geom) as lat from cities';
    this.querySpainCities = "SELECT distinct(nameunit) as name, cartodb_id, 'city' as type FROM ign_spanish_adm3_municipalities_displaced_canary where country = 'ES'";
    this.querySpainProvinces = "SELECT concat(nameunit, ' (Provincia)') as name, cartodb_id, 'province' as type FROM ign_spanish_adm2_provinces_displaced_canary where country = 'ES'";
    this.querySpainCCAA = "SELECT nameunit as name, cartodb_id, 'ccaa' as type FROM ign_spanish_adm1_ccaa_displaced_canary where country = 'ES'";

    this.queryGeoJSONCityWithCity = "SELECT st_asgeojson(the_geom) as geojson FROM ign_spanish_adm3_municipalities_displaced_canary ";
    this.queryGeoJSONCityWithCCAA = "SELECT st_asgeojson(the_geom) as geojson FROM ign_spanish_adm1_ccaa_displaced_canary ";
    this.queryGeoJSONCityWithProvince = "SELECT st_asgeojson(the_geom) as geojson FROM ign_spanish_adm2_provinces_displaced_canary ";
}

CityService.prototype.getPoints = function () {
    return $.get(this.url + this.queryPoints);
};

CityService.prototype.getCities = function () {
    return [$.get(this.url + this.querySpainCities), $.get(this.url + this.querySpainProvinces), $.get(this.url + this.querySpainCCAA)];
};

CityService.prototype.getGeoJSONOfCity = function (type, cartodb_id) {
    switch(type) {
        case "city":
            return $.get(this.url + this.queryGeoJSONCityWithCity + ' where cartodb_id='+ cartodb_id);
        case "province":
            return $.get(this.url + this.queryGeoJSONCityWithProvince + ' where cartodb_id='+ cartodb_id);
        case "ccaa":
            return $.get(this.url + this.queryGeoJSONCityWithCCAA + ' where cartodb_id='+ cartodb_id);
    }
};


function drawCities(map, cities) {
    for (var i = 0, length = cities.length; i < length; i++) {
        var marker = new L.Marker({
            lat: data[i].latitude,
            lng: data[i].longitude
        }, {
            icon: markerIcon
        });

        marker.bindPopup(popUpTemplate(data[i]));
        marker.on('mouseover', function (e) {
            this.openPopup();
        });
        markerBounds.push(marker.getLatLng());
        markers.addLayer(marker);
    }
}
var map = null;
var cityService = new CityService('ruthecor');
var filters = {
    status: ['D', 'A', 'P']
};
var markers = null;
var featureGroup = new L.FeatureGroup();

function initMap() {

    var southWest = L.latLng(85, -180),
        northEast = L.latLng(-85, 180),
        bounds = L.latLngBounds(southWest, northEast);

    map = L.map('map', {
        center: [40.390008, -3.8826887],
        scrollWheelZoom: false,
        zoom: 6,
        minZoom: 2,
        maxBounds: bounds,
        zoomControl: true,
        attributionControl: false
    });

    map.fitBounds([[35.96022296929667, -9.4921875], [43.8503744993026, 3.4716796874999996]]);
    var tile = null;
    // tile = L.tileLayer('https://api.mapbox.com/styles/v1/rareq/ciuv9rp8s012q2hpb1zmj8qih/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmFyZXEiLCJhIjoiY2l1djVqeDQzMDRpcTJ5bm9xNGVpNHh6ZCJ9.wHMmcES0UChKBPwMpCnOLw', {
    //     attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    // });
    // tile = L.tileLayer('http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
    //     attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    // })
    tile =  L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    });
    // var tile = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.{ext}', {
    //     attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    //     subdomains: 'abcd',
    //     minZoom: 0,
    //     maxZoom: 18,
    //     ext: 'png'
    // });

    tile.addTo(map);
    new L.control.attribution({
        position: 'bottomright'
    }).addTo(map);    
}

function checkFilters(city) {
    //check status
    if (filters.status.indexOf(city.status) < 0) {
        return false;
    }
    return true;
}


function initMarkers(markers){

    if (featureGroup) {
        map.removeLayer(featureGroup);
        featureGroup.clearLayers();
    }

    function showDetailCity(e){
        if (e) {
            e.preventDefault();
        }
        map.closePopup();
        var city = this;      
        city.index = 1;  
        city.getNextIndex = function(data){
            return ("0" + data.index++).slice(-2);
        };
        var detailEl = $.tmpl('detailTmpl', city);
        detailEl.find('.close').click(function(e){
            e.preventDefault();
            detailEl.remove();
        });
        detailEl.appendTo('#containerMap');
    }

    var popUpTemplate = function (city) {
        
        var tmpl= '<div class="map-tooltip">' +
            '<h3><a href="#">' + city.name + '</a></h3>' +
            '<span><i class="fa fa-user" aria-hidden="true"></i>' + city.num_hab + ' hab.</span>' +
            '</div>';
        var el = $(tmpl);
        if (city.status === 'D') { // Denied 
            el.append(`<span class="denied">Moción Rechazada el ${city.denied_date_format}</span>`);
        } else if (city.status === 'P') { // Pending 
            el.append(`<span class="pending">Moción en trámite</span>`);
        } else if (city.status === 'A') { // Approved 
            el.append(`<span class="approved">Moción aprobada el ${city.adherence_date_format}</span>`);
        }
        el.click('a', showDetailCity.bind(city));
        return el[0];
    };

    $('#detailTmpl').template('detailTmpl');
    
    var cities = markers;
    for (var i = 0, length = cities.length; i < length; i++) {
        if (checkFilters(cities[i])) {
            var classes = [];
            if (cities[i].num_hab < 50000) {
                classes.push('small');
            } else if(cities[i].num_hab >= 50000 && cities[i].num_hab < 500000) {
                classes.push('medium');
            } else {
                classes.push('large');
            }
            if(cities[i].status === 'D') {
                classes.push('red');
            } else if (cities[i].status === 'A') {
                classes.push('green');
            } else {
                classes.push('yellow');
            }
            var markerIcon = L.divIcon({
                className: 'marker',
                html: '<span class="'+ classes.join(' ') +'"></span>'
            });

            var marker = new L.Marker({
                lat: cities[i].lat,
                lng: cities[i].lng
            }, {
                icon: markerIcon
            });

            marker.bindPopup(popUpTemplate(cities[i]));
            marker.on('mouseover', function (e) {
                this.openPopup();
            });
            marker.on('click', showDetailCity.bind(cities[i]));
            featureGroup.addLayer(marker);
        }
    }
    map.addLayer(featureGroup);
}
var isFullScreen = false;
function fullScreen(el) {
    isFullScreen = true;
    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
    }
}

function exitFullScreen() {
    isFullScreen = false;
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}
function initFullScreen() {
    var FShandler = function(){
        setTimeout(function(){
            if(isFullScreen){
                $('#exitFullScreen').show();
                $('#fullScreen').hide();
            } else {
                $('#exitFullScreen').hide();
                $('#fullScreen').show();
            }
        }, 1000);
    }
    document.addEventListener("fullscreenchange", FShandler);
    document.addEventListener("webkitfullscreenchange", FShandler);
    document.addEventListener("mozfullscreenchange", FShandler);
    document.addEventListener("MSFullscreenChange", FShandler);

    $('#fullScreen').click(function () {
        $('#containerMap').addClass('fullScreen');
        fullScreen($('#containerMap')[0]);       
    });
    $('#exitFullScreen').click(function () {
        $('#containerMap').removeClass('fullScreen');
        exitFullScreen();       
    });
}


function initAutocomplete(data){
    data = data.map(function(el){
        return {
            value: el.name,
            data: el
        };
    });
    $('#removeAutocomplete').click(function(){
        if(multipolygon) {
            map.removeLayer(multipolygon);
            multipolygon = null;
            map.panTo(new L.LatLng(40.390008, -3.8826887)).setZoom(6);
            $('.autocomplete-suggestions').val('');
        }
    });

    var multipolygon = null;
    $('.autocomplete-suggestions').autocomplete({
        lookup: data,
        appendTo: '.autocomplete',
        onSelect: function(suggestion){   
            if (multipolygon) {
                map.removeLayer(multipolygon);
                multipolygon = null;
            }
            cityService.getGeoJSONOfCity(suggestion.data.type, suggestion.data.cartodb_id).then(function(data){
                multipolygon = L.geoJSON(JSON.parse(data.rows[0].geojson), {"color": "#ff7800",
                    "weight": 5,
                    "opacity": 0.65});
                multipolygon.addTo(map);
                map.fitBounds(multipolygon.getBounds());
            });
            
        }
    });
}

function initFilters() {
    $('.filter.status input').change(function(e){
        if (e.target.checked) {
            filters.status.push(e.target.value);
            $(e.target).parent().find('img').addClass('selected');
        } else {
            filters.status.splice(filters.status.indexOf(e.target.value), 1);
            $(e.target).parent().find('img').removeClass('selected');
        }
        initMarkers(markers);
    });
}


function init() {
    if(document.getElementById('containerMap')){
        var promises = [];
        initMap();
        initFullScreen();    
        cityService.getPoints().done(function(data){
            markers = data.rows;
            initMarkers(markers);
        });
        $.when.apply($, cityService.getCities()).then(function(cities, provinces, ccaas){
            let result = cities[0].rows.concat(provinces[0].rows).concat(ccaas[0].rows);
            initAutocomplete(result);
        });
        initFilters();
    }
}
$(document).ready(init);
