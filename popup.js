// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const binance = require('node-binance-api');
binance.options({
	APIKEY: '<key>',
	APISECRET: '<secret>',
	useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
	test: true // If you want to use sandbox mode where orders are simulated
});

const TFEE = 0.001;
const MFEE = 0.001;

/**
 * Calculate data based on buy price
 */
function compareBuy(buyPrice) {
  let takeEven = ((1+TFEE)*buyPrice)/.9975;
  let makeEven = ((1+MFEE)*buyPrice)/.9985;
  console.log('make/take breakeven: ', takeEven, makeEven);
  document.querySelector('#takeeven').innerHTML = takeEven;
  document.querySelector('#makeeven').innerHTML = makeEven;
}

/**
 * Calculate profit based on buy & sell prices
 */
function calcProfit(buyPrice, sellPrice) {
  let takeProfit = (sellPrice - (sellPrice * TFEE)) - (buyPrice- (buyPrice * TFEE));
  let makeProfit = (sellPrice - (sellPrice * MFEE)) - (buyPrice- (buyPrice * MFEE));
  // let makeProfit = (sellPrice - buyPrice) - (sellPrice * MFEE) - (buyPrice * MFEE);
  document.querySelector('#takeprofit').innerHTML = takeProfit;
  document.querySelector('#makeprofit').innerHTML = makeProfit;
}

/**
 * Calculate total profit based on initial & current balances
 */
function calcTotals(currentBalance) {
  let initialBalance = 0.00291686;
  let totalProfit = currentBalance - initialBalance;
  let percentProfit = (currentBalance - initialBalance) / initialBalance *100;
  // let makeProfit = (sellPrice - buyPrice) - (sellPrice * MFEE) - (buyPrice * MFEE);
  document.querySelector('#totalprofit').innerHTML = totalProfit;
  document.querySelector('#percentprofit').innerHTML = percentProfit;
}

/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, (tabs) => {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * Change the background color of the current page.
 *
 * @param {string} color The new background color.
 */
function changeBackgroundColor(color) {
  var script = 'document.body.style.backgroundColor="' + color + '";';
  // See https://developer.chrome.com/extensions/tabs#method-executeScript.
  // chrome.tabs.executeScript allows us to programmatically inject JavaScript
  // into a page. Since we omit the optional first argument "tabId", the script
  // is inserted into the active tab of the current window, which serves as the
  // default.
  chrome.tabs.executeScript({
    code: script
  });
}

/**
 * Gets the saved background color for url.
 *
 * @param {string} url URL whose background color is to be retrieved.
 * @param {function(string)} callback called with the saved background color for
 *     the given url on success, or a falsy value if no color is retrieved.
 */
function getSavedBackgroundColor(url, callback) {
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
  // for chrome.runtime.lastError to ensure correctness even when the API call
  // fails.
  chrome.storage.sync.get(url, (items) => {
    callback(chrome.runtime.lastError ? null : items[url]);
  });
}

/**
 * Sets the given background color for url.
 *
 * @param {string} url URL for which background color is to be saved.
 * @param {string} color The background color to be saved.
 */
function saveBackgroundColor(url, color) {
  var items = {};
  items[url] = color;
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
  // optional callback since we don't need to perform any action once the
  // background color is saved.
  chrome.storage.sync.set(items);
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
document.addEventListener('DOMContentLoaded', () => {
  getCurrentTabUrl((url) => {
    var buyInput = document.getElementById('buyInput');
    var sellInput = document.getElementById('sellInput');
    var balanceInput = document.getElementById('currentBalance');

    // Load the saved background color for this page and modify the dropdown
    // value, if needed.
    getSavedBackgroundColor(url, (savedColor) => {
      if (savedColor) {
        changeBackgroundColor(savedColor);
        dropdown.value = savedColor;
      }
    });

    // Call compareBuy when the buy input changes
    buyInput.addEventListener('change', () => {
      compareBuy(buyInput.value);
      // changeBackgroundColor(dropdown.value);
      // saveBackgroundColor(url, dropdown.value);
    });
    buyInput.addEventListener('keyup', () => {
      compareBuy(buyInput.value);
    });

    // Call calcProfit when the sell input changes
    sellInput.addEventListener('change', () => {
      calcProfit(buyInput.value, sellInput.value);
    });
    sellInput.addEventListener('keyup', () => {
      calcProfit(buyInput.value, sellInput.value);
    });

    // Call calcTotals when the current balance input changes
    balanceInput.addEventListener('change', () => {
      calcTotals(balanceInput.value);
    });
    balanceInput.addEventListener('keyup', () => {
      calcTotals(balanceInput.value);
    });
  });
});
