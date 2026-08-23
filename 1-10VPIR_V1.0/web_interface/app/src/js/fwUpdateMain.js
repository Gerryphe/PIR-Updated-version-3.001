var fwUpdMain = {

  FILE_EXT:                 "enpir",                    // fw file extension
  FILE_LOAD_CMD:            "/mainFirmwareFile.bin",    // API cmd for fw update

  PAGE_REDIRECT_TIMEOUT_MS: 10000,

  pageRedirectTimeoutId:    0,                          // page redirect timeout

  successCallback: function () {
    clearTimeout(fwUpdMain.pageRedirectTimeoutId);
    fwUpdMain.pageRedirectTimeoutId = setTimeout(function () {window.location.reload();}, fwUpdMain.PAGE_REDIRECT_TIMEOUT_MS);
    common.statusSetOk("Successfully. The new FW will startup after a few seconds...", false, 0, true);
  }
};