/**
 * @module client
 */

"use strict";

var rp = require("request-promise");
var error = require("./error");
var utils = require("./utils");
var settings = require("../package").settings;
var version = require("../package").version;

var authentication = require("./api/authentication");
var account = require("./api/accounts");
var balances = require("./api/balances");
var beneficiaries = require("./api/beneficiaries");
var contacts = require("./api/contacts");
var conversions = require("./api/conversions");
var funding = require("./api/funding");
var ibans = require("./api/ibans");
var payers = require("./api/payers");

var payments = require("./api/payments");
var rates = require("./api/rates");
var reference = require("./api/reference");
var transactions = require("./api/transactions");
var transfers = require("./api/transfers");
var reports = require("./api/reports");
var retry = require("./backoff");
var vans = require("./api/vans");
var withdrawalAccounts = require("./api/withdrawal-accounts");

module.exports = class CurrencycloudClient {
  constructor(config) {
    this.config = config;
  }

  get _config() {
    return this.config;
  }

  set _config(value) {
    this.config = value;
  }

  get _token() {
    return this.token;
  }
  set _token(value) {
    this.token = value;
  }
  get _onbehalfof() {
    return this.onbehalfof;
  }
  set _onbehalfof(value) {
    this.onbehalfof = value;
  }

  requestToken() {
    const client = this;
    var promise = rp
      .post({
        uri: this._config.baseUrl + this._config.authUrl,
        form: {
          login_id: this._config.loginId,
          api_key: this._config.apiKey,
        },
        headers: {
          "User-Agent": "CurrencyCloudSDK/2.0 NodeJS/" + version,
        },
      })
      .then(function (res) {
        client._token = JSON.parse(res).auth_token;

        return client._token;
      });

    return promise;
  }

  authenticate(params) {
    var baseUrl = settings.environment[this._config.environment];
    if (!baseUrl) {
      throw new Error("invalid environment");
    }

    this._config = {
      baseUrl: baseUrl,
      loginId: this._config.loginId,
      apiKey: this._config.apiKey,
      authUrl: params.authUrl,
    };

    var promise = this.requestToken().catch(function (res) {
      throw new error(res);
    });

    return promise;
  }

  request(params) {
    const client = this;
    var reauthenticate = function (attempts) {
      var promise = requestToken().catch(function (res) {
        if (attempts > 1) {
          return reauthenticate(attempts - 1);
        } else {
          throw res;
        }
      });

      return promise;
    };

    var request = function (params) {
      if (client._onbehalfof) {
        params.qs = params.qs || {};
        params.qs.onBehalfOf = client._onbehalfof;
      }

      var promise = rp({
        headers: {
          "X-Auth-Token": client._token,
          "User-Agent": "CurrencyCloudSDK/2.0 NodeJS/" + version,
        },
        uri: client._config.baseUrl + params.url,
        method: params.method,
        qsStringifyOptions: {
          arrayFormat: "brackets",
        },
        form: params.method === "GET" ? null : utils.snakeize(params.qs),
        qs: params.method === "GET" ? utils.snakeize(params.qs) : null,
      }).then(function (res) {
        return utils.camelize(JSON.parse(res));
      });

      return promise;
    };

    var promise = request(params).catch(function (res) {
      if (res.statusCode === 401 && client._token) {
        return reauthenticate(3)
          .then(function () {
            return request(params);
          })
          .catch(function (res) {
            throw new error(res);
          });
      } else {
        throw new error(res);
      }
    });

    return promise;
  }

  close(params) {
    const client = this;
    var promise = rp
      .post({
        headers: {
          "X-Auth-Token": client._token,
          "User-Agent": "CurrencyCloudSDK/2.0 NodeJS/" + version,
        },
        uri: client._config.baseUrl + params.url,
      })
      .then(function () {
        client._config = null;
        client._token = null;
      })
      .catch(function (res) {
        throw new error(res);
      });

    return promise;
  }

  authentication = {
    login: authentication.login.bind(this),
    logout: authentication.logout.bind(this),
  };

  account = {
    create: account.create.bind(this),
    get: account.get.bind(this),
    update: account.update.bind(this),
    find: account.find.bind(this),
    getCurrent: account.getCurrent.bind(this),
    getPaymentChargesSettings: account.getPaymentChargesSettings.bind(this),
    updatePaymentChargesSettings:
      account.updatePaymentChargesSettings.bind(this),
  };

  balances = {
    find: balances.find.bind(this),
    get: balances.get.bind(this),
    topUpMargin: balances.topUpMargin.bind(this),
  };

  beneficiaries = {
    create: beneficiaries.create.bind(this),
    delete: beneficiaries.delete.bind(this),
    find: beneficiaries.find.bind(this),
    get: beneficiaries.get.bind(this),
    update: beneficiaries.update.bind(this),
    validate: beneficiaries.validate.bind(this),
  };

  contacts = {
    create: contacts.create.bind(this),
    find: contacts.find.bind(this),
    get: contacts.get.bind(this),
    getCurrent: contacts.getCurrent.bind(this),
    update: contacts.update.bind(this),
  };

  conversions = {
    cancel: conversions.cancel.bind(this),
    cancellationQuote: conversions.cancellationQuote.bind(this),
    create: conversions.create.bind(this),
    dateChange: conversions.dateChange.bind(this),
    dateChangeQuote: conversions.dateChangeQuote.bind(this),
    find: conversions.find.bind(this),
    get: conversions.get.bind(this),
    profitAndLoss: conversions.profitAndLoss.bind(this),
    split: conversions.split.bind(this),
    splitHistory: conversions.splitHistory.bind(this),
    splitPreview: conversions.splitPreview.bind(this),
  };

  funding = {
    findFundingAccounts: funding.findFundingAccounts.bind(this),
  };

  ibans = {
    find: ibans.find.bind(this),
  };

  payers = {
    get: payers.get.bind(this),
  };

  payments = {
    authorise: payments.authorise.bind(this),
    create: payments.create.bind(this),
    delete: payments.delete.bind(this),
    find: payments.find.bind(this),
    get: payments.get.bind(this),
    getConfirmation: payments.getConfirmation.bind(this),
    getPaymentDeliveryDate: payments.getPaymentDeliveryDate.bind(this),
    getPaymentTrackingInfo: payments.getPaymentTrackingInfo.bind(this),
    getQuotePaymentFee: payments.getQuotePaymentFee.bind(this),
    retrieveSubmission: payments.retrieveSubmission.bind(this),
    update: payments.update.bind(this),
    validate: payments.validate.bind(this),
  };

  rates = {
    find: rates.find.bind(this),
    get: rates.get.bind(this),
  };

  reference = {
    getAvailableCurrencies: reference.getAvailableCurrencies.bind(this),
    getBankDetails: reference.getBankDetails.bind(this),
    getBeneficiaryRequiredDetails:
      reference.getBeneficiaryRequiredDetails.bind(this),
    getConversionDates: reference.getConversionDates.bind(this),
    getPayerRequiredDetails: reference.getPayerRequiredDetails.bind(this),
    getPaymentDates: reference.getPaymentDates.bind(this),
    getPaymentFeeRules: reference.getPaymentFeeRules.bind(this),
    getPaymentPurposeCodes: reference.getPaymentPurposeCodes.bind(this),
    getSettlementAccounts: reference.getSettlementAccounts.bind(this),
  };

  transactions = {
    find: transactions.find.bind(this),
    get: transactions.get.bind(this),
    getSender: transactions.getSender.bind(this),
  };

  transfers = {
    find: transfers.find.bind(this),
    get: transfers.get.bind(this),
    create: transfers.create.bind(this),
    cancel: transfers.cancel.bind(this),
  };

  reports = {
    createConversionReport: reports.createConversionReport.bind(this),
    createPaymentReport: reports.createPaymentReport.bind(this),
    findReportRequest: reports.findReportRequest.bind(this),
    findReportViaId: reports.findReportViaId.bind(this),
  };

  retry = retry;

  vans = {
    find: vans.find.bind(this),
  };

  withdrawalAccounts = {
    find: withdrawalAccounts.find.bind(this),
    pullFunds: withdrawalAccounts.pullFunds.bind(this),
  };

  APIerror = error.APIerror;
  AuthenticationError = error.AuthenticationError;
  BadRequestError = error.BadRequestError;
  ForbiddenError = error.ForbiddenError;
  NotFoundError = error.NotFoundError;
  TooManyRequestsError = error.TooManyRequestsError;
  InternalApplicationError = error.InternalApplicationError;
  UndefinedError = error.UndefinedError;
}
