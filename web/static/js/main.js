var googleOAuth2Result;

function onClientLoad() {
  gapi.client.setApiKey(googleClientSecret);

  setTimeout(function() {
    gapi.auth.authorize({
      client_id: googleClientId,
      scope: googleAuthScopes,
      immediate: true
    }, onAuthResult);
  }, 1);

  $('#appTokenButton').click(function () {
    invokeOAuthAuthorization('offline');
  });
}

function onAuthResult(authResult) {
  var authorizeButton = $('#authorize-button');

  if (authResult && !authResult.error) {
    googleOAuth2Result = authResult;
    authorizeButton.hide();

    checkSchedule()
      .fail(onFirstCheckScheduleFail);

    $('#refreshButton').click(function () {
      $('#no-bus-schedule').hide();
      $('#departures').hide();
      $('#departures-list').empty();

      checkSchedule();
    });

  } else {
    $('#authorize').show();
    $('#authorize-button').click(function() {
      invokeOAuthAuthorization('online');

      return false;
    });
  }
}

function onAjaxError(jqXHR, textStatus, errorThrown) {
  alert("ERROR: " + jqXHR.status + ": " + textStatus + ": " + errorThrown);
}

function setAuthorizationHeader(jqXHR) {
  jqXHR.setRequestHeader('Authorization', googleOAuth2Result.token_type + ' ' + googleOAuth2Result.access_token);
}

function checkSchedule() {
  return $.ajax({
    url: apiBaseUrl + '/schedule',
    type: 'GET',
    dataType: 'json',
    beforeSend: setAuthorizationHeader,
  }).done(onCheckScheduleDone);
}

function onFirstCheckScheduleFail(jqXHR, textStatus, errorThrown) {
  if (jqXHR.status === 404) {
    // user hasn't created their schedule yet
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

function onCheckScheduleDone(data, textStatus, jqXHR) {
  $('#authenticated').show();
  $('#editScheduleButton').click(function () {
    window.open(data.editUrl, '_blank');
  });

  if ($.isEmptyObject(data.routes)) {
    // nothing defined in the schedule - prompt user to edit their schedule
    $('#no-bus-schedule').show();
  } else {
    // a schedule exists - get departures
    getDepartures();
  }
}

function createEmptySchedule() {
  return $.ajax({
    url: apiBaseUrl + '/schedule',
    type: 'POST',
    beforeSend: setAuthorizationHeader,
  }).fail(onAjaxError);
}

function getDepartures() {
  return $.ajax({
    url: apiBaseUrl + '/departures',
    type: 'GET',
    dataType: 'json',
    beforeSend: setAuthorizationHeader,
  })
  .fail(onAjaxError)
  .done(onGetDeparturesDone);
}

function onGetDeparturesDone(data, textStatus, jqXHR) {
  $.each(data, function (index, departure) {
    var route = departure.route.number;
    if (departure.route.terminal) {
      route += ('-' + departure.route.terminal);
    }

    var time = moment(departure.time);

    var wait = time.diff(moment(), 'minutes');

    var message = time.format('LT') + " (" + wait + " minutes): " + route + " @ " + departure.stop.name;
    var item = $('<li>' + message + '</li>');

    $('#departures-list').append(item);
  });

  $('#departures').show();
}

function invokeOAuthAuthorization(accessType) {
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
}
