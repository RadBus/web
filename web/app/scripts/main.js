(function () {

  'use strict';

  var oAuth2Info;
  var googleOAuth2Result;

  var onGoogleClientConfig;

  window.onClientLoad = function () {
    console.log("Getting OAuth2 info...");

    $.ajax({
      url: apiBaseUrl + '/oauth2',
      type: 'GET',
      dataType: 'json',
      beforeSend: setAuthHeaders
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
    if (jqXHR.status == 401 &&
        jqXHR.responseJSON &&
        jqXHR.responseJSON.message &&
        jqXHR.responseJSON.message.match(/authorization token/i)) {
      // token expired - authorize again
      authorize();
    } else {
      var message = jqXHR.status > 0 ?
        (jqXHR.status + ": " + jqXHR.statusText + ": " + jqXHR.responseText) :
        "Check the JavaScript Console for details.";

      alert("ERROR: " + message);
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
    hide($('#welcome'));

    var authorizeButton = $('#authorize-button');

    if (authResult && !authResult.error) {
      console.log("User has already granted access.");

      googleOAuth2Result = authResult;
      hide(authorizeButton);

      checkSchedule()
        .fail(onFirstCheckScheduleFail);

      // refresh depatures
      $('#refreshButton').click(function () {
        hide($('#no-bus-schedule'));
        hide($('#departures'));
        hide($('#no-departures'));
        $('#departures-list').empty();

        checkSchedule()
          .fail(onFirstCheckScheduleFail);
      });

      // edit scheduels
      $('#toggle-schedule-button').click(function () {
        $('#edit-schedule').toggleClass('hidden').toggleClass('show');
      });

      // upsert schedule route
      var upsertScheduleRouteButton = $('#upsert-schedule-route-button');
      var upsertScheduleRouteError = $('#upsert-schedule-route-error');

      upsertScheduleRouteButton.click(function () {
        upsertScheduleRouteButton.text('Working...');
        upsertScheduleRouteButton.prop('disabled', true);
        hide(upsertScheduleRouteError);

        var requestJson = $('#upsert-schedule-route-input').val();

        upsertScheduleRoute(requestJson)
          .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 400) {
              // show error
              upsertScheduleRouteError.text(jqXHR.responseJSON.message);
              show(upsertScheduleRouteError);
            } else {
              onAjaxError(jqXHR, textStatus, errorThrown);
            }
          })
          .always(function() {
            upsertScheduleRouteButton.text('Create/Update');
            upsertScheduleRouteButton.prop('disabled', false);
          });
      });

      // delete schedule route
      var deleteScheduleRouteButton = $('#delete-schedule-route-button');
      var deleteScheduleRouteError = $('#delete-schedule-route-error');

      deleteScheduleRouteButton.click(function () {
        deleteScheduleRouteButton.text('Working...');
        deleteScheduleRouteButton.prop('disabled', true);
        hide(deleteScheduleRouteError);

        var routeId = $('#delete-schedule-route-input').val();

        deleteScheduleRoute(routeId)
          .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 400) {
              // show error
              deleteScheduleRouteError.text(jqXHR.responseJSON.message);
              show(deleteScheduleRouteError);
            } else {
              onAjaxError(jqXHR, textStatus, errorThrown);
            }
          })
          .always(function() {
            deleteScheduleRouteButton.text('Delete');
            deleteScheduleRouteButton.prop('disabled', false);
          });
      });
    } else {
      console.log("User needs to grant access.");

      show($('#authorize'));
      $('#authorize-button').click(function() {
        invokeOAuthAuthorization('online');

        return false;
      });
    }
  }

  function setAuthHeaders (jqXHR) {
    // client auth header
    jqXHR.setRequestHeader('API-Key1', apiKey);

    // user auth header
    if (googleOAuth2Result) {
      jqXHR.setRequestHeader('Authorization', googleOAuth2Result.token_type + ' ' + googleOAuth2Result.access_token);
    }
  }

  function getSchedule() {
    var existingSchedule = $('#existing-schedule');
    existingSchedule.text("Fetching...");

    return $.ajax({
      url: apiBaseUrl + '/schedule',
      type: 'GET',
      dataType: 'json',
      beforeSend: setAuthHeaders,
    }).done(function (data, textStatus, jqXHR) {
      var json = JSON.stringify(data, undefined, 2);
      existingSchedule.text(json);
      existingSchedule.highlight();
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
    show($('#authenticated'));

    if ($.isEmptyObject(data.routes)) {
      console.log("User has an empty schedule.  Prompt them to edit their schedule.");

      show($('#no-bus-schedule'));
      show($('#schedule'));
    } else {
      console.log("User has items in their schedule.");

      getDepartures();
    }
  }

  function createEmptySchedule () {
    console.log("Creating a new empty schedule for the user...");

    return $.ajax({
      url: apiBaseUrl + '/schedule',
      type: 'POST',
      beforeSend: setAuthHeaders,
    }).fail(onAjaxError);
  }

  function getDepartures () {
    console.log("Getting the user's departures...");

    show($('#getting-departures'));

    return $.ajax({
      url: apiBaseUrl + '/departures',
      type: 'GET',
      dataType: 'json',
      beforeSend: setAuthHeaders,
    })
    .fail(onAjaxError)
    .done(onGetDeparturesDone)
    .always(function() {
      hide($('#getting-departures'));
    });
  }

  function onGetDeparturesDone (data, textStatus, jqXHR) {
    if (data.length === 0) {
      console.log("User has no upcoming departures.");

      show($('#no-departures'));
      show($('#schedule'));
    } else {
      console.log("User has departures!");

      $.each(data, function (index, departure) {
        var route = departure.route.id;
        if (departure.route.terminal) {
          route += ('-' + departure.route.terminal);
        }

        var time = moment(departure.time);

        var wait = time.diff(moment(), 'minutes');

        var message = time.format('LT') + " (" + wait + " minutes): " + route + " @ " + departure.stop.description;
        var item = $('<li>' + message + '</li>');

        $('#departures-list').append(item);
      });

      show($('#departures'));
      show($('#schedule'));
    }
  }

  function upsertScheduleRoute (requestJson) {
    console.log("Creating/updating user's schedule route...");

    return $.ajax({
      url: apiBaseUrl + '/schedule/routes',
      type: 'POST',
      data: requestJson,
      contentType: 'application/json',
      beforeSend: setAuthHeaders,
    })
    .done(onScheduleChanged);
  }

  function deleteScheduleRoute (routeId) {
    console.log("Deleting user's schedule route '" + routeId + "'...");

    return $.ajax({
      url: apiBaseUrl + '/schedule/routes/' + routeId,
      type: 'DELETE',
      beforeSend: setAuthHeaders,
    })
    .done(onScheduleChanged);
  }

  function onScheduleChanged () {
    console.log("Schedule has been successfully changed.  Fetching latest schedule...");

    getSchedule()
      .fail(onAjaxError);
  }

  function show(element) {
    element.addClass('show').removeClass('hidden');
  }

  function hide(element) {
    element.addClass('hidden').removeClass('show');
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
})();
