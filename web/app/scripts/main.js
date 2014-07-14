(function () {

  'use strict';

  var googleAuthScopes;
  var googleOAuth2Result;

  var onGoogleClientConfig;

  window.onClientLoad = function () {
    console.log("Getting OAuth2 scopes...");

    $.ajax({
      url: apiBaseUrl + '/oauth2-scopes',
      type: 'GET',
      dataType: 'json'
    })
    .fail(onAjaxError)
    .done(onGetOAuth2Scopes);
  };

  window.authorize = function () {
    console.log("Checking to see if the user has already granted access to RadBus...");

    setTimeout(function() {
      gapi.auth.authorize({
        client_id: googleClientId,
        scope: googleAuthScopes,
        immediate: true
      }, onAuthResult);
    }, 1);
  };

  window.invokeOAuthAuthorization = function (accessType) {
    console.log("Calling the Googles to get authorization...");

    var redirectUri = window.location.protocol + '//' + window.location.host + '/' + googleOAuth2CallbackUrl;

    var oauthUrl = 'https://accounts.google.com/o/oauth2/auth' +
      '?' +
      '&client_id=' + encodeURI(googleClientId) +
      '&scope=' + encodeURI(googleAuthScopes) +
      '&immediate=false' +
      '&response_type=code' +
      '&redirect_uri=' + encodeURI(redirectUri) +
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
      alert("ERROR: " + jqXHR.status + ": " + textStatus + ": " + errorThrown);
    }
  }

  function onGetOAuth2Scopes (data, textStatus, jqXHR) {
    console.log("Configuring the Google API client...");

    googleAuthScopes = data;

    gapi.client.setApiKey(googleClientSecret);

    // needs to implemented by the host page
    window.onGoogleClientConfig();
  }

  function onAuthResult (authResult) {
    var authorizeButton = $('#authorize-button');

    if (authResult && !authResult.error) {
      console.log("User has already granted access.");

      googleOAuth2Result = authResult;
      authorizeButton.hide();

      checkSchedule()
        .fail(onFirstCheckScheduleFail);

      $('#refreshButton').click(function () {
        $('#no-bus-schedule').hide();
        $('#departures').hide();
        $('#departures-list').empty();

        checkSchedule()
          .fail(onFirstCheckScheduleFail);
      });

    } else {
      console.log("User needs to grant access.");

      $('#authorize').show();
      $('#authorize-button').click(function() {
        invokeOAuthAuthorization('online');

        return false;
      });
    }
  }

  function setAuthorizationHeader (jqXHR) {
    jqXHR.setRequestHeader('Authorization', googleOAuth2Result.token_type + ' ' + googleOAuth2Result.access_token);
  }

  function checkSchedule() {
    console.log("Getting the user's schedule to make sure they've set one up...");

    return $.ajax({
      url: apiBaseUrl + '/schedule',
      type: 'GET',
      dataType: 'json',
      beforeSend: setAuthorizationHeader,
    }).done(onCheckScheduleDone);
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
    $('#authenticated').show();
    $('#editScheduleButton').click(function () {
      window.open(data.editUrl, '_blank');
    });

    if ($.isEmptyObject(data.routes)) {
      console.log("User has an empty schedule.  Prompt them to edit their schedule.");

      $('#no-bus-schedule').show();
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
      beforeSend: setAuthorizationHeader,
    }).fail(onAjaxError);
  }

  function getDepartures () {
    console.log("Getting the user's departures...");

    return $.ajax({
      url: apiBaseUrl + '/departures',
      type: 'GET',
      dataType: 'json',
      beforeSend: setAuthorizationHeader,
    })
    .fail(onAjaxError)
    .done(onGetDeparturesDone);
  }

  function onGetDeparturesDone (data, textStatus, jqXHR) {
    if (data.length === 0) {
      console.log("User has no upcoming departures.");

      $('#no-departures').show();
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

      $('#departures').show();
    }
  }

})();
