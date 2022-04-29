export const getUser = async () => await (await fetch('/api/user')).json();
export const getBlacklist = async () => await (await fetch('/api/blacklist')).json();
export const getGraylist = async () => await (await fetch('/api/graylist')).json();
export const getWhitelist = async () => await (await fetch('/api/whitelist')).json();
export const move = async (url, from, to) => await fetch('/api/move', {
    method: "POST",
    body: JSON.stringify({
        url,
        from,
        to
    }),
    headers: {
        "Content-Type": "application/json"
    }
});
export const remove = async (url, from) => await fetch('/api/remove', {
    method: "POST",
    body: JSON.stringify({
        url, 
        from
    }),
    headers: {
        "Content-Type": "application/json"
    }
});
export const getWarnings = async () => await (await fetch('/api/activity/warnings')).json();
export const getKicks = async () => await (await fetch('/api/activity/kicks')).json();
export const getServers = async () => await (await fetch('/api/activity/servers')).json();