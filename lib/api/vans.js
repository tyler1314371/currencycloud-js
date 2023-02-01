/**
 * @module vans
 */

"use strict";

module.exports = {
  /**
   * Returns details of the VANs for the specified accounts
   * @param {Object} params Object, which contains the VAN's parameters
   * @return {Promise} Promise; if fulfilled returns object, which contains an array of transfers, as well as pagination information; if rejected returns APIerror.
   */
  find: function (params) {
    const client = this;
    const params = params || {};
    var url = "/v2/virtual_accounts/find";

    var promise = client.request({
      url: url,
      method: "GET",
      qs: params,
    });

    return promise;
  },
};
