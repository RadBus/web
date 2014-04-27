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
    authorizeButton.hide();

    var message =
      "token_type: " + authResult.token_type + "\n" +
      "access_token: " + authResult.access_token;

    window.alert(message);

  } else {
    var authorizeButton = $('<a class="btn btn-primary btn-lg" role="button">Authorize!</a>');

    $('#header')
      .prepend($('<p></p>')
        .prepend(authorizeButton));

    authorizeButton.click(function() {
      invokeOAuthAuthorization('online');

      return false;
    });
  }
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
