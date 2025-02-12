// copied from: https://github.com/sthnaqvi/follow-redirect-url/blob/master/follow-redirect-url.js
const fetch = require("node-fetch");
const https = require("https");
const http = require("http");
const UserAgents = require('user-agents');

const prefixWithHttp = (url) => {
    let pattern = new RegExp("^http");
    return pattern.test(url) ? url : "http://" + url;
};

const isRedirect = (status) =>
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308;

const extractMetaRefreshUrl = (html) => {
    const metaRefreshPattern =
        "(CONTENT|content)=[\"']0;[ ]*(URL|url)=(.*?)([\"']s*>)";
    let match = html.match(metaRefreshPattern);
    return match && match.length == 5 ? match[3] : null;
};

const visit = async (url, fetchOptions) => {
    url = prefixWithHttp(url);
    const response = await fetch(url, fetchOptions);
    
    if (isRedirect(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
            throw `${url} responded with status ${response.status} but no location header`;
        }
        return {
            url: url,
            redirect: true,
            status: response.status,
            redirectUrl: response.headers.get("location"),
        };
    } else if (response.status == 200) {
        const text = await response.text();
        const redirectUrl = extractMetaRefreshUrl(text);
        return redirectUrl ? {
            url: url,
            redirect: true,
            status: "200 + META REFRESH",
            redirectUrl: redirectUrl,
        } : { url: url, redirect: false, status: response.status };
    } else {
        return { url: url, redirect: false, status: response.status };
    }
};

const _startFollowingRecursively = async (
  url,
  options = {},
  count = 1,
  visits = []
) => {
    const {
        max_redirect_length = 20,
        request_timeout = 10000,
        ignoreSslErrors = false,
    } = options;
    const userAgent = new UserAgents(/Windows/);
    const fetchOptions = {
        redirect: "manual",
        follow: 0,
        timeout: request_timeout,
        headers: {
            "User-Agent": userAgent.toString(),
            Accept: "text/html",
        },
        // https://stackoverflow.com/questions/52478069/node-fetch-disable-ssl-verification
        agent: (parsedUrl) => {
            if (parsedUrl.protocol == "https:") {
                return new https.Agent({
                    rejectUnauthorized: !ignoreSslErrors,
                });
            } else {
                return new http.Agent();
            }
        }
    };

    if (count > max_redirect_length) {
        throw `Exceeded max redirect depth of ${max_redirect_length}`;
    }

    try {
        const response = await visit(url, fetchOptions);
        
        count++;
        visits.push(response);
        url = response.redirectUrl;
        return response.redirect
            ? _startFollowingRecursively(url, options, count, visits)
            : visits;
    } catch (error) {
        visits.push({ url: url, redirect: false, error: error.code, status: `Error: ${error}` });
        return visits;
    }
    
};

/**
 *
 * @param {String} url - pass url like http://google.com
 * @param {Object} options - optional configuration eg:{ max_redirect_length:20, request_timeout:10000 }
 * @param {Number} options.max_redirect_length - set max redirect limit Default 20
 * @param {Number} options.request_timeout - request timeout in milliseconds Default 10000 ms
 */
module.exports.startFollowing = _startFollowingRecursively;