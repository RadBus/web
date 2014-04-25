function onClientLoad() {
  gapi.client.setApiKey(googleClientSecret);

  setTimeout(function() {
    gapi.auth.authorize({
      client_id: googleClientId,
      scope: googleAuthScopes,
      immediate: true
    }, onAuthResult);
  }, 1);
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
    authorizeButton.show();
    authorizeButton.click(function () {
      gapi.auth.authorize({
        client_id: googleClientId,
        scope: googleAuthScopes,
        immediate: false
      }, onAuthResult);

      return false;
    });
  }
}
