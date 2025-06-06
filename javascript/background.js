var storage = window.localStorage;
var _dayPrefix = 'p';
var _dailyCount = 0;
var _keepDays = 45;

function formatDate(prev, sep) {
    sep = sep ? sep : "";
    var now = new Date();
    var td = new Date(now.getFullYear(), now.getMonth(), now.getDate() - prev);
    var dateParts = [
        ('0000' + td.getFullYear()).slice(-4),     // year: YYYY
        ('00' + (td.getMonth() + 1)).slice(-2),    // month: MM
        ('00' + td.getDate()).slice(-2)            // day: DD
    ]
    return dateParts.join(sep);
}

function getDayKey(d) {
    return _dayPrefix + d;
}

function setDayCount(previous, obj) {
    storage.setItem(getDayKey(formatDate(previous)), obj);
}

function getDayCount(previous) {
    var c = storage.getItem(getDayKey(formatDate(previous)));
    return c == null ? 0 : parseInt(c);
}

function getAllKeys(prefix) {
    var keys = [];
    for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        if (key.startsWith(prefix)) {
            keys.push(key);
        }
    }
    return keys;
}

function getOldDayKeys(keep) {
    var newKeys = [];
    for (var i = keep - 1; i >= 0; i--) {
        newKeys.push(getDayKey(formatDate(i)));
    }
    return getAllKeys(_dayPrefix).filter(x => !newKeys.includes(x));
}

function purgeOldKeys(keep) {
    getOldDayKeys(keep).forEach(function (item, index) {
        storage.removeItem(item);
    });
}

// Load listeners
chrome.extension.onRequest.addListener(function (f, s, r) {
    _dailyCount = getDayCount(0) + 1;
    setDayCount(0, _dailyCount);
});

chrome.extension.onRequest.addListener(function (f, s, r) {
    if (getAllKeys(_dayPrefix).length > _keepDays) {
        purgeOldKeys(_keepDays);
    }
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getDayCount') {
        var count = getDayCount(request.previous);
        sendResponse({ count: count });
    }
});