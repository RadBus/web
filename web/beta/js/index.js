(function() {
  var $background = $('.js-background');
  var $bus = $('.js-bus');
  var $loginPrompt = $('.js-login-prompt');
  var $header = $('.js-header');
  var $busStopSign = $('.js-bus-stop-sign');
  var $headerBus = $('.js-header-bus');
  var $placeholderDeparture = $('.js-placeholder-departure');
  var $messageNoRoutes = $('.js-message-no-routes');
  var $messageNoDepartures = $('.js-message-no-departures');
  var $departuresList = $('.js-departures-list');
  var $departures = $('.js-departures');
  var $placeholderRoute = $('.js-placeholder-route');
  var $routesList = $('.js-routes-list');
  var $addRouteButton = $('.js-add-route-button');
  var $routes = $('.js-routes');
  var $manageRoutesButton = $('.js-manage-routes-button');
  var $refreshButton = $('.js-refresh-button');
  var $about = $('.js-about');
  var $aboutRADBusButton = $('.js-about-r-a-d-bus-button');
  var $selectFromList = $('.js-select-from-list');
  var $selectFromListAddButton = $('.js-select-from-list-add-button');
  var $selectFromListCancelButton = $('.js-select-from-list-cancel-button');
  var $selectFromListModal = $('.js-select-from-list-modal');
  var $screens = $('.js-screens');


  //
  //
  // RADBus Web Client for radbus.io
  //
  //

  var apiBaseUrl = 'https://api.radbus.io/v1';

  (function () {

    'use strict';


    // ----------------
    //
    // Authorization via Google Id
    //

    var oAuth2Info;
    var googleOAuth2Result;
    var onGoogleClientConfig;

    window.onClientLoad = function () {
      console.log("Getting OAuth2 info...");

      $.ajax({
        url: apiBaseUrl + '/oauth2',
        type: 'GET',
        dataType: 'json'
      })
      .fail(onAjaxError)
      .done(onGetOAuth2Info);
    };

    window.authorize = function () {
      console.log("Checking to see if the user has already granted access to RadBus...");

      setTimeout(function() {
        gapi.auth.authorize({
          client_id: oAuth2Info.client_id,
          scope: oAuth2Info.scopes,
          immediate: true
        }, onAuthResult);
      }, 1);
    };

    window.invokeOAuthAuthorization = function (accessType) {
      console.log("Calling the Googles to get authorization...");

      var redirectUri = window.location.protocol + '//' + window.location.host + '/oauth2callback';

      var oauthUrl = 'https://accounts.google.com/o/oauth2/auth' +
        '?client_id=' + encodeURIComponent(oAuth2Info.client_id) +
        '&scope=' + encodeURIComponent(oAuth2Info.scopes) +
        '&immediate=false' +
        '&response_type=code' +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&access_type=' + accessType +
        '&state=' + accessType +
        '&approval_prompt=force';

      window.location = oauthUrl;
    };

    function onAjaxError (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status == 401) {
        // token expired - authorize again
        authorize();
      } else {
        console.log("ERROR: " + jqXHR.status + ": " + textStatus + ": " + errorThrown);
        showNoDepartures();
      }
    }

    function onGetOAuth2Info (data, textStatus, jqXHR) {
      console.log("Configuring the Google API client...");

      oAuth2Info = data;

      gapi.client.setApiKey(oAuth2Info.client_secret);

      // needs to implemented by the host page
      window.onGoogleClientConfig();
    }

    function onAuthResult (authResult) {
      // hide($('#welcome'));

      $('#loginPrompt').hide();

      var authorizeButton = $('#authorize-button');

      if (authResult && !authResult.error) {
        console.log("User has already granted access.");

        googleOAuth2Result = authResult;

        checkSchedule()
          .fail(onFirstCheckScheduleFail);

      } else {
        console.log("User needs to grant access.");

        $('#loginPrompt').show();

        $('#authorize-button').click(function() {
          invokeOAuthAuthorization('online');

          return false;
        });
      }
    }

    function setAuthorizationHeader (jqXHR) {
      jqXHR.setRequestHeader('Authorization', googleOAuth2Result.token_type + ' ' + googleOAuth2Result.access_token);
    }


    // ----------------
    //
    // Schedule
    //

    var existingSchedule = null;

    function getSchedule() {

      showAuthenticatedUI();

      showGettingDepartures();

      return $.ajax({
        url: apiBaseUrl + '/schedule',
        type: 'GET',
        dataType: 'json',
        beforeSend: setAuthorizationHeader,
      }).done(function (data, textStatus, jqXHR) {
        var existingSchedule = data;
      });
    }

    function checkSchedule() {
      console.log("Getting the user's schedule to make sure they've set one up...");

      return getSchedule()
        .done(onCheckScheduleDone);
    }

    function onFirstCheckScheduleFail (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status === 404) {
        console.log("User hasn't created their schedule yet.");

        createEmptySchedule()
          .done(function () {
            // attempt to get schedule again
            checkSchedule()
              .fail(onAjaxError);
          });
      } else {
        onAjaxError(jqXHR, textStatus, errorThrown);
      }
    }

    function onCheckScheduleDone (data, textStatus, jqXHR) {

      showAuthenticatedUI();
      hideMessages();

      if ($.isEmptyObject(data.routes)) {
        console.log("User has an empty schedule.  Prompt them to edit their schedule.");
        showDepartures();
        showNoBusSchedule();
      } else {
        console.log("User has items in their schedule.");
        showDepartures();
        getDepartures();
      }
    }

    function createEmptySchedule () {
      console.log("Creating a new empty schedule for the user...");

      return $.ajax({
        url: apiBaseUrl + '/schedule',
        type: 'POST',
        beforeSend: setAuthorizationHeader,
      }).fail(onAjaxError);
    }

    function onScheduleChanged () {
      console.log("Schedule has been successfully changed.  Fetching latest schedule...");

      getSchedule()
        .fail(onAjaxError);
    }

    function upsertScheduleRoute (requestJson) {
      console.log("Creating/updating user's schedule route...");

      return $.ajax({
        url: apiBaseUrl + '/schedule/routes',
        type: 'POST',
        data: requestJson,
        contentType: 'application/json',
        beforeSend: setAuthorizationHeader,
      })
      .done(onScheduleChanged);
    }

    function deleteScheduleRoute (routeId) {
      console.log("Deleting user's schedule route '" + routeId + "'...");

      return $.ajax({
        url: apiBaseUrl + '/schedule/routes/' + routeId,
        type: 'DELETE',
        beforeSend: setAuthorizationHeader,
      })
      .done(onScheduleChanged);
    }


    // ----------------
    //
    // Departures
    //

    function getDepartures () {
      console.log("Getting the user's departures...");

      showGettingDepartures();

      return $.ajax({
        url: apiBaseUrl + '/departures',
        type: 'GET',
        dataType: 'json',
        beforeSend: setAuthorizationHeader,
      })
      .fail(onAjaxError)
      .done(onGetDeparturesDone)
      .always(function() {
      });
    }

    function onGetDeparturesDone (data, textStatus, jqXHR) {
      hideMessages();
      $('#departures-list').empty();

      if (data.length === 0) {
        console.log("User has no upcoming departures.");
        showNoDepartures();
      } else {
        console.log("User has departures!");

        var source   = $("#departure-template").html();
        var template = Handlebars.compile(source);

        $.each(data, function (index, departure) {

          console.log(data);

          var route = departure.route.id;
          var time = moment(departure.time);
          var wait = time.diff(moment(), 'minutes');

          var context = {
            "time": time.format('LT'),
            "wait": wait,
            "stop": departure.route.terminal,
            "bus": route,
            "stopDetail": departure.stop.description,
          };
          console.log(context);
          var item = template(context );

          $('#departures-list').append(item);
        });

        $(".departure-directions").click(function(e){
          console.log(e);
          var stop = $(e.target).attr("data-stop");
          var location = $(e.target).attr("data-location");
          var cityzip = $(e.target).attr("data-cityzip");
          document.location.href =  "https://www.google.com/maps/dir/Current+Location/" + encodeURIComponent(stop) + "+" + encodeURIComponent(location) + "+" + encodeURIComponent(cityzip);
        });

      }
    }

    // ----------------
    //
    // UI State
    //

    function showAuthenticatedUI(){
      $("#authenticated").css("visibility", "visible")
      $("#menu").css("visibility", "visible")
    }

    jQuery.fn.highlight = function() {
      $(this).each(function () {
        var el = $(this);
        $("<div/>")
        .width(el.outerWidth())
        .height(el.outerHeight())
        .css({
          "position": "absolute",
          "left": el.offset().left,
          "top": el.offset().top,
          "background-color": "#ffff99",
          "opacity": ".7",
          "z-index": "9999999"
        }).appendTo('body').fadeOut(1500).queue(function () { $(this).remove(); });
      });
    };


    //
    // initial render/state of the UI
    //
    var selectFromListCallback = null;
    $screens.hide();
    $placeholderDeparture.remove();
    $placeholderRoute.remove();
    hideMessages();


    //
    // UI events
    //

    $('#headerBus').click(refreshSchedule);
    $('#refreshButton').click(refreshSchedule);
    $('#aboutRADBusButton').click(showAbout);
    $('#manageRoutesButton').click(showRoutes);

    $('#selectFromListCancelButton').click(function(){$('#selectFromListModal').hide()});
    $('#selectFromListAddButton').click(function(){
      var result = {
        name: $('#selectFromList option:selected').text(),
        value: $('#selectFromList').val()
      };

      $('#selectFromListModal').hide();

      if(selectFromListCallback)
        selectFromListCallback(result);
    });

    // add route

    $('#addRouteButton').click(function(){

      $('#selectFromListModal').show();

      selectFromListCallback = function(result){

        // get data about this route
        $.ajax({
          url: apiBaseUrl + '/routes/' + result.value,
          type: 'GET',
          dataType: 'json',
          beforeSend: setAuthorizationHeader,
        }).done(function (route, textStatus, jqXHR) {

          // render new route
          var source   = $('#route-template').html();
          var template = Handlebars.compile(source);

          var context = {
            "routeId": route.id,
            "route": route.description,
            "am": {
              stops: [],
              direction:{
                id:route.directions[0].id,
                description:route.directions[0].description
              }
            },
            "pm": {
              stops: [],
              direction:{
                id:route.directions[1].id,
                description:route.directions[1].description
              }
            }
          };

          console.log(context);

          var item = template(context);
          $('#routes-list').append(item);

          // add events to the new DOM items

          // route
          $('.routename').click(routeNameClick);
          $('.doneroute').click(doneRouteClick);
          $('.removeroute').click(removeRouteClick);

          // stops
          $('.addstop').click(addStopClick);
          $('.removestop').click(removeStopClick);
          $('.stopname').click(stopNameClick);

        }); // complete ajax call


      };

      // fetch routes
      $.ajax({
        url: apiBaseUrl + '/routes',
        type: 'GET',
        dataType: 'json',
        beforeSend: setAuthorizationHeader,
      }).done(function (data, textStatus, jqXHR) {

        $('#selectFromList').empty();

        // render routes
        var source   = '<option value="{{id}}">{{description}}</option>';
        var template = Handlebars.compile(source);

        $.each(data, function (index, route) {

          var item = template(route);
          $('#selectFromList').append(item);

        });

      });

    }); // add route click

    // remove stop
    function removeStopClick(event){

      var routeId = $(event.target).attr("data-route-id");
      var directionId = $(event.target).attr("data-direction-id");
      var am = String($(event.target).attr("data-am")).toLowerCase() === "true";

      var listClassName = ".pmstops-removed";

      console.log("am?", am);

      if(am == true)
        listClassName = ".amstops-removed";

      // send to the removed list...
      $(event.target).parent().parent().parent().find(listClassName).append($($(event.target).parent()));

    }

    // stop clicked
    function stopNameClick(event){
      showEditMode($(event.target).parent().parent().parent());
      $(event.target).parent().find(".removestop").show();
    }

    // add stop
    function addStopClick(event){

      showEditMode(event.target);

      var routeId = $(event.target).attr("data-route-id");
      var directionId = $(event.target).attr("data-direction-id");
      var am = String($(event.target).attr("data-am")).toLowerCase() === "true";

      $('#selectFromListModal').show();

      //
      selectFromListCallback = function(result){

        // render new stop
        var source   = $('#stop-template').html();
        var template = Handlebars.compile(source);

        var context = {
          routeId: routeId,
          directionId: directionId,
          am: am,
          id: result.value,
          description: result.name
        };

        var item = template(context);
        var listClassName = ".pmstops";

        console.log("am?", am);

        if(am == true)
          listClassName = ".amstops";

        // add new stop to DOM
        $(event.target).parent().parent().find(listClassName).append(item);

        // stop's events
        $('.removestop').click(removeStopClick);
        $('.stopname').click(stopNameClick);

      };

      // fetch stops for given route
      $.ajax({
        url: apiBaseUrl + '/routes/' + routeId,
        type: 'GET',
        dataType: 'json',
        beforeSend: setAuthorizationHeader,
      }).done(function (data, textStatus, jqXHR) {

        $('#selectFromList').empty();

        // determine the direction to list stops
        var directionIndex = 0;
        if(data.directions[0].id === directionId)
          directionIndex = 0;
        else
          directionIndex = 1;

        var stops = data.directions[directionIndex].stops;

        // render stops
        var source   = '<option value="{{id}}">{{description}}</option>';
        var template = Handlebars.compile(source);

        $.each(stops, function (index, stop) {

          var item = template(stop);
          $('#selectFromList').append(item);

        });

      });

    } // add stop click

    //
    // screen management
    //

    // show edit mode for a given route, makes it active for edit/delete
    var showEditMode = function(target){
      $(target).parent().find(".doneroute").show();
      $(target).parent().find(".removeroute").show();
    }

    function showRoutes(){
      $screens.show();

      $departures.hide();
      $about.hide();

      $routes.show();

      // fetch routes for current user
      $.ajax({
        url: apiBaseUrl + '/schedule',
        type: 'GET',
        dataType: 'json',
        beforeSend: setAuthorizationHeader,
      }).done(function (data, textStatus, jqXHR) {

        $('#routes-list').empty();

        existingSchedule = data;

        // render routes
        var source   = $("#route-template").html();
        var template = Handlebars.compile(source);

        $.each(data.routes, function (index, route) {

          var context = {
            "routeId": route.id,
            "route": route.description,
            "am": route.am,
            "pm": route.pm
          };

          console.log(context);

          var item = template(context);
          $('#routes-list').append(item);

        });

        // add events to the new DOM items

        // route
        $('.routename').click(routeNameClick);
        $('.doneroute').click(doneRouteClick);
        $('.removeroute').click(removeRouteClick);

        // stops
        $('.addstop').click(addStopClick);
        $('.removestop').click(removeStopClick);
        $('.stopname').click(stopNameClick);
      });
    }
    window.showRoutes = showRoutes;

    function routeNameClick(event){
      showEditMode(event.target);
    }

    function doneRouteClick(event){

      $(event.target).hide();
      $(event.target).parent().find(".removeroute").hide();
      $(".removestop").hide();

      var routeId = $(event.target).attr("data-route-id");

      var amStops = [];
      var amDirection = $(event.target).parent().find(".amdirection").attr("data-direction-id");
      var pmStops = [];
      var pmDirection = $(event.target).parent().find(".pmdirection").attr("data-direction-id");

      $(event.target).parent().find(".amstops").children().each(function(index, element){
        amStops.push($(element).find(".stopname").attr("data-stop-id"));
      });

      $(event.target).parent().find(".pmstops").children().each(function(index, element){
        pmStops.push($(element).find(".stopname").attr("data-stop-id"));
      });

      // form a json object with the latest data for this route
      var routeData = {
        "id": routeId,
        "am": {
          "direction": amDirection,
          "stops": amStops
        },
        "pm": {
          "direction": pmDirection,
          "stops": pmStops
        }
      };

      console.log(routeData);

      upsertScheduleRoute(JSON.stringify(routeData))
        .fail(function (jqXHR, textStatus, errorThrown) {
          if (jqXHR.status == 400) {
            // show error
            console.log("todo: show error for failed route update");
            console.log(jqXHR.responseJSON.message);
          } else {
            onAjaxError(jqXHR, textStatus, errorThrown);
          }
        })
        .always(function() {
          console.log("todo: after update/new route");
          // refresh routes
          showRoutes();
        });


    }

    function removeRouteClick(event){

      $(event.target).hide();
      $(event.target).parent().find(".doneroute").hide();
      $(".removestop").hide();

      var routeId = $(event.target).attr("data-route-id");
      if(confirm("delete route " + routeId + "?")){
        deleteScheduleRoute(routeId);
      }
    }

    function showDepartures(){
      $screens.show();

      $about.hide();
      $routes.hide();

      $departures.show();
    }
    window.showDepartures = showDepartures;

    function showAbout(){
      $screens.show();

      $departures.hide();
      $routes.hide();

      $about.show();

    }
    window.showAbout = showAbout;

    function showNoDepartures(){
      $('#no-departures').show();
      $('#no-departures').css("visibility", "visible");
    }

    function showGettingDepartures(){
      $('#getting-departures').show();
      $('#getting-departures').css("visibility", "visible");
    }

    function showNoBusSchedule(){
      $('#no-bus-schedule').show();
      $('#no-bus-schedule').css("visibility", "visible");
    }

    function hideMessages(){
      $('#no-departures').hide();
      $('#no-departures').css("visibility", "none");
      $('#no-bus-schedule').hide();
      $('#no-bus-schedule').css("visibility", "none");;
      $('#getting-departures').hide();
      $('#getting-departures').css("visibility", "none");;
    }

    function refreshSchedule(){
      $('#no-bus-schedule').hide();
      $('#departures').hide();
      $('#no-departures').hide();
      $('#departures-list').empty();

      showGettingDepartures();

      checkSchedule()
        .fail(onFirstCheckScheduleFail);
    }

  })();

})();