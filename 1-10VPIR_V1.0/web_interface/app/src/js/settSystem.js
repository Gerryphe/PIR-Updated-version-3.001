var settSystem = {

  settReadTimeoutId: 0,

  PAGE_REDIRECT_TIMEOUT_MS: 5000,
  pageRedirectTimeoutId: 0,

  httpPortPrev: 0,
  httpPortCurr: 0,

  webAuthPrev: 0,
  webAuthCurr: 0,

  init: function () {
    // read system settings
    settSystem.read();
  },

  settToPage: function (data) {
    // general
    if ('sysName' in data) common.setVal('sysName', data.sysName);
    if ('sysLoc' in data) common.setVal('sysLoc', data.sysLoc);
    if ('sysContact' in data) common.setVal('sysContact', data.sysContact);

    // web
    if ('webAuth' in data) {
      common.setVal('webAuth', data.webAuth);
      settSystem.webAuthPrev = data.webAuth;
    }
    if ('httpPort' in data) {
      common.setVal('httpPort', data.httpPort);
      settSystem.httpPortPrev = data.httpPort;
    }


    // display

    if ('displSt' in data) common.setVal('displSt', data.displSt);

    if ('displBl' in data) common.setVal('displBl', data.displBl);

    settSystem.brightModeChanged();


    // delay

    if ('delaySt' in data) common.setVal('delaySt', data.delaySt);

    if ('delayV' in data) common.setVal('delayV', data.delayV);

    settSystem.delayModeChanged();


    // sensitivity

    if ('sensitivitySt' in data) common.setVal('sensitivitySt', data.sensitivitySt);

    if ('sensitivityV' in data) common.setVal('sensitivityV', data.sensitivityV);

    settSystem.sensitivityModeChanged();

  },

  settFromPage: function () {
    var obj = {
      'sysName': '',
      'sysLoc': '',
      'sysContact': '',

      'webAuth': 0,
      'httpPort': 0,

      'displSt': 0,
      'displBl': 0,

      'delaySt': 0,
      'delayV': 0,

      'sensitivitySt': 0,
      'sensitivityV': 0,

    };

    // general
    obj.sysName = common.getVal('sysName');
    obj.sysLoc = common.getVal('sysLoc');
    obj.sysContact = common.getVal('sysContact');

    // web
    obj.webAuth = common.getVal('webAuth');
    obj.webAuth *= 1;
    settSystem.webAuthCurr = obj.webAuth;

    obj.httpPort = common.getVal('httpPort');
    if ((obj.httpPort.length == 0) || (obj.httpPort * 1 == 0) || (obj.httpPort * 1 > 0xffff)) {
      common.statusSetError("'HTTP port' is not correct!", common.STATUS_MESSAGE_TIMEOUT_MS);
      obj = null;
      return null;
    }
    obj.httpPort *= 1;
    settSystem.httpPortCurr = obj.httpPort;


    // display
    obj.displSt = common.getVal('displSt');

    obj.displBl = common.getVal('displBl');
    if ((obj.displBl.length == 0) || (obj.displBl * 1 == 0) || (obj.displBl * 1 > 100)) {
      common.statusSetError("'Backlight' is not correct!", common.STATUS_MESSAGE_TIMEOUT_MS);
      obj = null;
      return null;
    }
    obj.displBl *= 1;

    // time
    obj.delaySt = common.getVal('delaySt');

    obj.delayV = common.getVal('delayV');
    if ((obj.delayV.length == 0) || (obj.delayV * 1 == 0) || (obj.delayV * 1 > 100)) {
      common.statusSetError("'delay' is not correct!", common.STATUS_MESSAGE_TIMEOUT_MS);
      obj = null;
      return null;
    }
    obj.delayV *= 1;

    // time
    obj.sensitivitySt = common.getVal('sensitivitySt');

    obj.sensitivityV = common.getVal('sensitivityV');
    if ((obj.sensitivityV.length == 0) || (obj.sensitivityV * 1 == 0) || (obj.sensitivityV * 1 > 100)) {
      common.statusSetError("'sensitivity' is not correct!", common.STATUS_MESSAGE_TIMEOUT_MS);
      obj = null;
      return null;
    }
    obj.sensitivityV *= 1;


    return obj;
  },

  // READING ---
  read: function () {
    // create cmd
    var cmd = new command.Cmd("GET",
      (common.ROOT_CMD_GROUP + "/settingsRead.json"),
      null,
      common.COMMAND_TIMEOUT_MS,
      settSystem.readSuccess,
      settSystem.readError);
    // send command
    command.putCmd(cmd, command.P0);
    cmd = null;
  },

  readSuccess: function (data) {
    settSystem.settToPage(data);
    data = null;
  },

  readError: function () {
    clearTimeout(settSystem.settReadTimeoutId);
    settSystem.settReadTimeoutId = setTimeout(function () {
      settSystem.read();
    }, common.READ_ERR_TIMEOUT_MS);
  },

  brightModeChanged: function () {
    var displStMode = common.getVal('displSt');
    displStMode *= 1;
    if (!displStMode) {
      common.nodeDispalyNone("displBlRegion");
    } else {
      common.nodeDispalyBlock("displBlRegion");
    }
  },

  delayModeChanged: function () {
    var delayStMode = common.getVal('delaySt');
    delayStMode *= 1;
    if (!delayStMode) {
      common.nodeDispalyNone("delayRegion");
    } else {
      common.nodeDispalyBlock("delayRegion");
    }
  },

  sensitivityModeChanged: function () {
    var sensitivityStMode = common.getVal('sensitivitySt');
    sensitivityStMode *= 1;
    if (!sensitivityStMode) {
      common.nodeDispalyNone("sensitivityRegion");
    } else {
      common.nodeDispalyBlock("sensitivityRegion");
    }
  },

  // SAVING ---
  save: function () {
    // get settings from page
    var obj = settSystem.settFromPage();
    if (obj == null) {
      return;
    }

    // create cmd
    var cmd = new command.Cmd("GET",
      (common.ROOT_CMD_GROUP + "/settingsSave.json" + common.JSON_PARAMS_NAME + JSON.stringify(obj)),
      null,
      common.COMMAND_TIMEOUT_MS,
      settSystem.saveSuccess,
      settSystem.saveError);
    // send command
    command.putCmd(cmd, command.P0);
    windowProcessing("block");
    common.statusNone();
    obj = null;
    cmd = null;
  },

  saveSuccess: function (data) {
    if ('state' in data) {
      if (data.state) {
        settSystem.pageRedirect();
      } else {
        settSystem.saveError();
      }
    } else {
      settSystem.saveError();
    }
    data = null;
  },

  saveError: function () {
    common.statusSetError(common.SETTINGS_SAVED_ERROR_MESSAGE, common.STATUS_MESSAGE_TIMEOUT_MS);
  },

  pageRedirect: function () {
    if ((settSystem.httpPortCurr != settSystem.httpPortPrev) ||
      (settSystem.webAuthCurr != settSystem.webAuthPrev)) {
      // http port/Auth is changed - need redirect to new page
      // set redirect timeout
      clearTimeout(settSystem.pageRedirectTimeoutId);
      settSystem.pageRedirectTimeoutId = setTimeout(function () {
        var str = window.location.protocol + "//" + window.location.hostname;
        if (settSystem.httpPortCurr != 80) {
          str += ":" + settSystem.httpPortCurr;
        }
        str += window.location.pathname;
        window.location.href = str;
      }, settSystem.PAGE_REDIRECT_TIMEOUT_MS);

      // show status message
      var newUri = window.location.protocol + "//" + window.location.hostname;
      if (settSystem.httpPortCurr != 80) {
        newUri += ":" + settSystem.httpPortCurr;
      }
      newUri += window.location.pathname;
      common.statusSetOk("Settings was successfully saved! Redirect to " + newUri + " in few seconds...", false, common.STATUS_MESSAGE_TIMEOUT_MS, true);
    } else {
      // http port same
      common.statusSetOk(common.SETTINGS_SAVED_SUCCESSFULLY_MESSAGE, false, common.STATUS_MESSAGE_TIMEOUT_MS, true);
    }
  }
};

window.onload = function () {
  command.init();
  common.commonDataRead();
  settSystem.init();
};