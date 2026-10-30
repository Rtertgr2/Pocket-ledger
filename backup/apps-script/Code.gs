/**
 * Pocket Ledger — Google Sheets backup endpoint.
 *
 * Deploy this file as a Web App (Execute as: me, Who has access: anyone) and paste the /exec URL
 * plus SECRET_KEY into the app's Settings screen. Every backup replaces the sheet contents,
 * so the spreadsheet is always a mirror of the phone, never an append-only log that drifts.
 *
 * Setup steps live in README.md next to this file.
 */

/** Change this before deploying. The app sends the same value as `secret_key`. */
var SECRET_KEY = 'change-me-to-a-long-random-string';

var ACCOUNT_COLUMNS = [
  'id',
  'name',
  'initial_balance_satang',
  'color_hex',
  'icon_name',
  'is_active',
  'created_at',
  'updated_at',
];

var TRANSACTION_COLUMNS = [
  'id',
  'account_id',
  'destination_account_id',
  'type',
  'amount_satang',
  'note',
  'category',
  'is_excluded_from_average',
  'transaction_date',
  'created_at',
];

/** A cheap health check: open the /exec URL in a browser and you should see this. */
function doGet() {
  return json({ status: 'ok', service: 'pocket-ledger-backup' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ status: 'error', message: 'missing body' });
    }

    var payload = JSON.parse(e.postData.contents);

    if (payload.secret_key !== SECRET_KEY) {
      // Apps Script always answers 200, so the app reads `status` from the body instead.
      return json({ status: 'error', message: 'unauthorized' });
    }

    var accounts = payload.accounts || [];
    var transactions = payload.transactions || [];
    if (!isList(accounts) || !isList(transactions)) {
      return json({ status: 'error', message: 'accounts/transactions must be arrays' });
    }

    writeSheet('Accounts', ACCOUNT_COLUMNS, accounts);
    writeSheet('Transactions', TRANSACTION_COLUMNS, transactions);

    return json({
      status: 'success',
      count: transactions.length,
      accounts: accounts.length,
      timestamp: payload.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    return json({ status: 'error', message: String(error) });
  }
}

/** Replaces the sheet body with `rows`, one column per name in `columns`. */
function writeSheet(name, columns, rows) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);

  var matrix = [columns];
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i] || {};
    matrix.push(
      columns.map(function (column) {
        var value = row[column];
        return value === null || value === undefined ? '' : value;
      })
    );
  }

  sheet.clearContents();
  sheet.getRange(1, 1, matrix.length, columns.length).setValues(matrix);
  sheet.getRange(1, 1, 1, columns.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function isList(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}
